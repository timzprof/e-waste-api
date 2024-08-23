import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import { config } from "dotenv";

// Documentation
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUI from "swagger-ui-express";
import options from "./docs/swagger-config.js";

import { logger, prettyStringify } from "./util/logger.js";

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

// Hello
app.get("/", (_req, res) => {
  res.send("Hellooooo Welcome to the E-waste Web API");
});

// Docs Route
app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// Routers
// Log distance
app.post("/distance", (req, res) => {
  const { distance } = req.body;
  console.log(`New Distance: ${distance} cm`);
  res.send("GET request to the homepage");
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
