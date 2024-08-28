import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import mongoose from "mongoose";
import axios from "axios";
import { config } from "dotenv";

// Documentation
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUI from "swagger-ui-express";
import options from "./docs/swagger-config.js";

// Models
import UserModel from "./models/user.js";
import BinModel from "./models/bin.js";

// Utility
import {
  logger,
  prettyStringify,
  APIError,
  setToken,
  getAccessToken,
} from "./util/index.js";

//Config Variables
config();

// Swagger Specification
const swaggerSpec = swaggerJsDoc(options);

const app = express();

// Server
const httpServer = createServer(app);
const io = new Server(httpServer);

// Setup Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: "*",
    optionsSuccessStatus: 200,
  })
);

// Logger Middleware
app.use((req, _res, next) => {
  const requiredHeaders = {
    authorization: req.headers.authorization,
    host: req.headers.host,
    connection: req.headers.connection,
    "access-control-request-method":
      req.headers["access-control-request-method"],
    origin: req.headers.origin,
    "user-agent": req.headers["user-agent"],
    "access-control-request-headers":
      req.headers["access-control-request-headers"],
    referer: req.headers.referer,
  };
  console.log(`Request url: ${prettyStringify(req.url)}`);
  console.log(`Request body: ${prettyStringify(req.body)}`);
  console.log(`Request params: ${prettyStringify(req.params)}`);
  console.log(`Request query: ${prettyStringify(req.query)}`);
  console.log(`Request headers: ${prettyStringify(requiredHeaders)}`);
  next();
});

// DB connection
mongoose.connect(process.env.MONGODB_URI).catch((error) => {
  logger.error(`Error connecting to database: ${error.message}`);
});

// Db Connection Event Listerners
mongoose.connection.on("error", (error) => {
  logger.error(`Database connection Errored with message: ${error.message}`);
});

// Routers
app.get("/home", (_req, res) => {
  res.send("Hellooooo Welcome to the E-waste Web API");
});

// Docs Route
app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// Update bin fill level
app.patch("/update-fill-level", async (req, res, next) => {
  try {
    const { percentage, sensorId } = req.body;
    const bin = await BinModel.findOne({ sensorId });

    if (!bin) {
      return res.status(404).send({
        status: "error",
        message: "Bin not found",
      });
    }

    // Update fill level
    await BinModel.updateOne({ sensorId }, { fillPercentage: percentage });

    console.log(`New Fill Level: ${percentage}%`);
    res.status(200).send({
      message: "Fill level Updated",
    });
  } catch (error) {
    return next(error);
  }
});

// Register User
app.post("/register-user", async (req, res, next) => {
  try {
    const { sensorId, name, email, password } = req.body;

    // Check if user already exists
    let user = await UserModel.findOne({ email });
    if (user) {
      throw new APIError(`${email} is already registered`, 400);
    }

    // Check if sensorId is attached to any bin
    let bin = await BinModel.findOne({ sensorId });
    if (!bin) {
      throw new APIError(`Invalid sensor ID of ${sensorId}`, 400);
    }

    // Create new user
    user = new UserModel({
      name,
      email,
      sensorId,
      password,
    });

    await user.save();

    // Update bin user field
    bin.user = user._id;
    await bin.save();

    return res.status(201).send({
      message: "User Registered successfully",
    });
  } catch (error) {
    return next(error);
  }
});

// User Login
app.post("/login", async (req, res, next) => {
  try {
    const { email, password, messagingToken } = req.body;

    // Check if user already exists
    let user = await UserModel.findOne({ email });
    if (!user) {
      throw new APIError("User not found", 404);
    }

    const passwordCheck = user.verifyPassword(password);
    if (!passwordCheck) {
      throw new APIError("Email / Password is incorrect", 400);
    }

    // Sign and Set Token
    const publicUser = user.getPublicFields();
    const token = setToken(publicUser);

    // Update user device messaging token
    await UserModel.updateOne({ email }, { token: messagingToken });

    return res.status(200).send({
      message: "User Login successful",
      data: { user: publicUser, token },
    });
  } catch (error) {
    return next(error);
  }
});

// Fetch Bin with specific snesor ID
app.get("/bin", async (req, res, next) => {
  const { sensorId } = req.query;

  const bin = await BinModel.findOne({ sensorId }).populate("user");

  if (!bin) {
    return res.status(404).send({
      status: "error",
      message: `Bin with sensor ID ${sensorId} not found`,
    });
  }

  return res.status(200).json({
    message: "Bin Fetched successful",
    data: { bin: bin.getPublicFields() },
  });
});

// Fill Level Socket
const binEventEmitter = BinModel.watch();

io.on("connection", (socket) => {
  console.log("User Connected");

  // Get all bins and emit their fill percentage via sockets
  BinModel.find({}).then((bins) => {
    // Emit each bins fill percentage via the sensorID
    bins.forEach((bin) => {
      console.log(`Emitting ${bin.sensorId}: ${bin.fillPercentage}`);
      socket.emit(bin.sensorId, bin.fillPercentage);
    });
  });

  // Watch for changes in BinModel
  binEventEmitter.on("change", (_) => {
    // Get all bins and emit their fill percentage via sockets
    BinModel.find({}).then((bins) => {
      // Emit each bins fill percentage via the sensorID
      bins.forEach((bin) => {
        console.log(`Emitting ${bin.sensorId}: ${bin.fillPercentage}`);
        socket.emit(bin.sensorId, bin.fillPercentage);
      });
    });
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected");
  });
});

// Periodic Waste Level Notification
app.post("/notify-user", async (req, res, next) => {
  try {
    const { sensorId, fillPercentage } = req.body;
    console.log(`Bin Fill Percentage: ${fillPercentage}%`);

    const bin = await BinModel.findOne({ sensorId }).populate("user");

    if (!bin) {
      return res.status(404).send({
        status: "error",
        message: "Bin not found",
      });
    }

    if (bin.user == null) {
      return res.status(400).send({
        status: "error",
        message: "Bin has not been assigned to a user yet",
      });
    }

    // Fetch FCM Access Token
    const accessToken = await getAccessToken();

    // Send Firebase Notification
    await axios.post(
      "https://fcm.googleapis.com/v1/projects/ewaste-89269/messages:send",
      {
        message: {
          token: bin.user.token,
          notification: {
            title: "Waste Bin Level Alert",
            body: `Your waste bin is ${fillPercentage}% full`,
          },
          data: {
            sensorId: sensorId,
          },
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return res.status(200).send({
      message: "Push Notification Sent",
    });
  } catch (error) {
    return next(error);
  }
});

// Error Middleware
app.use((error, _req, res, _next) => {
  const responseObj = {
    status: "error",
    message: "Something went wrong",
    errorMessage: error.message,
  };

  console.log(
    `Error: ${prettyStringify({ ...responseObj, stack: error.stack })}`
  );

  const errorCode = error instanceof APIError ? error.code : 500;

  return res.status(errorCode || 500).json(responseObj);
});

// catch 404
app.use((_req, res) => {
  return res.status(404).json({
    error: ["Path does not exist"],
    message: "This route doesn't exist for you!",
  });
});

const PORT = process.env.PORT || 7100;

export default httpServer.listen(PORT, () => {
  logger.info(`E_Waste API listening on PORT: ${PORT}`);
});
