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
import { logger, prettyStringify, APIError, setToken } from "./util/index.js";

//Config Variables
config();
export const URL_PREFIX = "/api/v1";

// Swagger Specification
const swaggerSpec = swaggerJsDoc(options);

const app = express();

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
    await user.updateOne({ token: messagingToken });

    return res.status(200).send({
      message: "User Login successful",
      data: { user: publicUser, token },
    });
  } catch (error) {
    return next(error);
  }
});

// Fill Level Socket

// Periodic Waste Level Notification
app.post("/notify-user", async (req, res, next) => {
  try {
    const { sensorId, fillPercentage } = req.body;
    console.log(`Bin Fill Percentage: ${fillPercentage}%`);

    const bin = await BinModel.findOne({ sensorId: sensorId }).populate("user");

    if (!bin) {
      return res.status(404).send({
        status: "error",
        message: "Bin not found",
      });
    }

    // Send Firebase Notification
    await axios.post(
      "https://fcm.googleapis.com/fcm/send",
      {
        to: bin.user.token,
        notification: {
          body: `Your waste bin is ${fillPercentage}% full`,
          title: "Waste Bin Level Alert",
        },
        priority: "high",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${process.env.FCM_AUTH_TOKEN}`,
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

export default app.listen(PORT, () => {
  logger.info(`E_Waste API listening on PORT: ${PORT}`);
});
