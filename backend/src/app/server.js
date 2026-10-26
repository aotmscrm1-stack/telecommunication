const http = require('node:http');
const app = require('./app');
const { initProviders } = require('./providers');
const logger = require('../core/logger/logger');
const env = require('../config/env');

const PORT = env.PORT || 5000;
const server = http.createServer(app);

// Initialize DB, Sockets, and Background Workers
initProviders(server).then(() => {
  server.listen(PORT, () => {
    logger.info(`🚀 Enterprise AOTMS Backend running on port ${PORT}`);
  });
}).catch((err) => {
  logger.error('Failed to initialize server providers:', err);
});

// Self Keep-Alive Ping (Render Spin-down prevention)
if (env.PUBLIC_BASE_URL) {
  setInterval(() => {
    http.get(`${env.PUBLIC_BASE_URL.replace('https', 'http')}/api/health`, (res) => {
      logger.debug('[keep-alive] ping:', res.statusCode);
    }).on('error', () => {
      const https = require('https');
      https.get(`${env.PUBLIC_BASE_URL}/api/health`, () => {}).on('error', () => {});
    });
  }, 10 * 60 * 1000);
}

// Graceful shutdown handling for Docker and orchestrators
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);
  server.close(() => {
    logger.info('HTTP & Socket server closed.');
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 0) {
      mongoose.connection.close(false).then(() => {
        logger.info('MongoDB connection closed cleanly.');
        process.exit(0);
      }).catch(() => process.exit(0));
    } else {
      process.exit(0);
    }
  });

  setTimeout(() => {
    logger.error('Forced shutdown timeout reached. Exiting immediately.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;
