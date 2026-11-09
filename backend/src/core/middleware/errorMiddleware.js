const logger = require('../logger/logger');

const errorMiddleware = (err, req, res, next) => {
  logger.error(err.stack || err.message);

  const statusCode = err.statusCode || 500;
  // Internal details (Mongo/ODM messages, file paths, driver errors) are only
  // echoed in development. In production a 5xx returns a generic message.
  const isServerError = statusCode >= 500;
  const message = isServerError && process.env.NODE_ENV !== 'development'
    ? 'Server Error'
    : err.message || 'Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorMiddleware;
