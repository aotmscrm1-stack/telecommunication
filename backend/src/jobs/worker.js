/**
 * Dedicated background worker process.
 *
 * Runs the interval schedulers (task reminders, overdue checks, the 10:00 IST
 * compliance sweep, Google Sheets auto-sync, local-audio retention) with no HTTP
 * listener at all. This is what makes the API stateless enough to replicate:
 * before the split, a second API container would have run every scheduler twice.
 *
 * Started by compose as the `worker` service, and by `npm run worker` locally.
 * Only one instance actually executes work — leadership is held through a Mongo
 * lease, so `--scale worker=3` is safe (the extras sit on standby).
 */

require('dotenv').config();

// Must be set before config/runtime is imported, so that a plain
// `node src/jobs/worker.js` never accidentally behaves like `all`.
if (!process.env.PROCESS_ROLE) process.env.PROCESS_ROLE = 'worker';

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const logger = require('../core/logger/logger');
const { runsBackgroundJobs, describeRole } = require('../config/runtime');
const { startBackgroundServices, stopBackgroundServices } = require('../app/providers');

// Registering the recordings router also queues the one-time legacy audio
// backfill (it is gated on runsBackgroundJobs), which used to run from whichever
// process happened to serve HTTP.
require('../modules/management/live-tracking/recordings');

if (!runsBackgroundJobs) {
  logger.error(`[Worker] Refusing to start: PROCESS_ROLE=${process.env.PROCESS_ROLE} does not run background jobs.`);
  process.exit(1);
}

let shuttingDown = false;

async function main() {
  logger.info(`[Worker] Starting background worker (role: ${describeRole()})`);

  await connectDB();
  await startBackgroundServices();

  logger.info('[Worker] Ready. Waiting for scheduler leadership if another worker holds the lease.');
}

main().catch((err) => {
  logger.error(`[Worker] Fatal startup error: ${err && err.stack ? err.stack : err}`);
  process.exit(1);
});

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`[Worker] Received ${signal}. Stopping schedulers and releasing the lease...`);

  try {
    await stopBackgroundServices();
  } catch (err) {
    logger.warn(`[Worker] Shutdown warning: ${err.message}`);
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
    }
  } catch (_) {
    // Nothing useful to do while exiting.
  }

  logger.info('[Worker] Shutdown complete.');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// A rejected promise in a scheduler must be visible, not silently swallowed.
process.on('unhandledRejection', (reason) => {
  logger.error(`[Worker] Unhandled rejection: ${reason && reason.message ? reason.message : reason}`);
});
