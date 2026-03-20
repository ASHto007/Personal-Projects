function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message =
    statusCode >= 500 ? "Internal server error" : err.message || "Request failed";

  if (!res.headersSent) {
    res.status(statusCode).json({
      success: false,
      message,
    });
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
