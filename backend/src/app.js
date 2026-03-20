const express = require("express");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const env = require("./config/env");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const healthRouter = require("./routes/healthRoutes");
const matchRouter = require("./routes/matchRoutes");
const tournamentRouter = require("./routes/tournamentRoutes");

const app = express();
const apiLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

app.set("trust proxy", 1);

app.use(helmet());
app.use(compression());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.clientOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin not allowed"));
    },
  })
);
app.use(express.json({ limit: env.jsonLimit }));
app.use("/api", apiLimiter);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Live cricket scorecard backend is running.",
    environment: env.nodeEnv,
  });
});

app.use("/api/health", healthRouter);
app.use("/api/matches", matchRouter);
app.use("/api/tournaments", tournamentRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
