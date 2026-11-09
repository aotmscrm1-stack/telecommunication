const http = require('node:http');
const app = require('./app');
const { initProviders, stopBackgroundServices } = require('./providers');
const { runsHttpApi, describeRole } = require('../config/runtime');
const logger = require('../core/logger/logger');
const env = require('../config/env');

const PORT = env.PORT || 5000;
const server = http.createServer(app);

// The API can be scaled to several replicas behind nginx/a load balancer only
// because background schedulers are gated by PROCESS_ROLE (see config/runtime).
logger.info(`[Runtime] Booting API process (role: ${describeRole()}) on port ${PORT}`);

// Handle port conflicts gracefully during nodemon hot-restarts
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    logger.warn(`Port ${PORT} is temporarily in use, retrying in 1.5s...`);
    setTimeout(() => {
      try {
        server.close();
        server.listen(PORT);
      } catch (retryErr) {
        logger.error('Server retry listen failed:', retryErr);
      }
    }, 1500);
  } else {
    logger.error('HTTP Server error:', err);
  }
});

// Initialize DB, Sockets, and Background Workers
initProviders(server).then(() => {
  server.listen(PORT, () => {
    logger.info(`🚀 Enterprise AOTMS Backend running on port ${PORT}`);
  });
}).catch((err) => {
  logger.error('Failed to initialize server providers:', err);
});

// Self Keep-Alive Ping (Render Spin-down prevention).
// Only meaningful for a public single instance that idles out; on a VPS it is
// pure self-inflicted load, and in `worker` role there is no listener to ping.
if (env.PUBLIC_BASE_URL && runsHttpApi) {
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
let shuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  // Stop schedulers first and release the lease, so a peer can pick the work up
  // immediately instead of waiting for the lease to expire. Without this an
  // in-flight sweep could be cut in half by the container stopping.
  try {
    await stopBackgroundServices();
  } catch (err) {
    logger.warn(`Background shutdown warning: ${err.message}`);
  }

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
