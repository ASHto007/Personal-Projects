const express = require("express");

const env = require("../config/env");

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    service: "backend",
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
