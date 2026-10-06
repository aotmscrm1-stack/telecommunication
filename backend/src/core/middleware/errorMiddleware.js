const logger = require('../logger/logger');

const errorMiddleware = (err, req, res, next) => {
  logger.error(err.stack || err.message);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorMiddleware;
