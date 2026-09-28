const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const { v4: uuidv4 } = require("uuid");
const passport = require("./config/passport");
const cookieParser = require("cookie-parser");
const logger = require("./utils/logger");
const routes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const config = require("./config");

const app = express();

app.set("trust proxy", Number(config.TRUST_PROXY || 1));
app.use(helmet());
app.use(
  cors({
    origin: function originChecker(origin, callback) {
      const allowedOrigins = [config.CLIENT_URL, "http://localhost:3000"];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader("X-Request-ID", req.id);
  next();
});

morgan.token("request-id", (req) => req.id || "unknown");
app.use(
  morgan(":method :url :status :response-time ms - request-id=:request-id", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }),
);

app.get("/api/v1/health", async (req, res) => {
  const mongoState = require("mongoose").connection.readyState;
  const health = {
    success: true,
    message: "Server healthy",
    data: {
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      mongo: mongoState === 1 ? "connected" : "disconnected",
      redis: "not-integrated",
    },
    project: config.PROJECT_NAME,
    timestamp: new Date().toISOString(),
    requestId: req.id,
  };

  res.status(200).json(health);
});

app.use("/api/v1", routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
