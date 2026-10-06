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

module.exports = server;
