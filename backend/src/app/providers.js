const connectDB = require('../config/database');
const { startOverdueTaskChecker } = require('../jobs/workers/taskOverdueChecker');
const { startTaskReminderChecker } = require('../jobs/workers/taskReminderChecker');
const { initWebSocketServer } = require('../app/websocket');
const { initTrackingSocketServer } = require('../modules/management/live-tracking/trackingSocket');
const logger = require('../core/logger/logger');

const initProviders = async (server) => {
  // 1. Connect to Database
  await connectDB();

  // 2. Initialize Sockets
  if (server) {
    initWebSocketServer(server);
    initTrackingSocketServer(server);
    logger.info('WebSocket and Tracking Socket servers initialized');
  }

  // 3. Start Background Workers / Cron Checkers
  startOverdueTaskChecker(5 * 60 * 1000);
  startTaskReminderChecker(5 * 60 * 1000);
  logger.info('Task background checkers started');

  // 4. Async DB migrations
  setTimeout(() => {
    try {
      require('../../scripts/migrate_campaigns').run().catch(() => {});
    } catch (e) {
      logger.warn('Migrate campaigns task failed:', e.message);
    }
  }, 3000);
};

module.exports = { initProviders };
