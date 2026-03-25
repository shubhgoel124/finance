function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let status = err.status || 500;
  let message = err.message || "Internal server error";

  if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path || "parameter"}: ${err.value}`;
  }

  if (err.name === "ValidationError") {
    status = 400;
    message =
      Object.values(err.errors || {})
        .map((e) => e.message)
        .join(", ") || err.message;
  }

  if (err.name === "MulterError") {
    status = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "CSV file is too large.";
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Only CSV uploads are supported.";
    }
  }

  if (message === "Not allowed by CORS") {
    status = 403;
  }

  return res.status(status).json({
    message,
    details: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
}

module.exports = errorHandler;
