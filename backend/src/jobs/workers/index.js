const logger = require('../../core/logger/logger');
const { startOverdueTaskChecker } = require('./taskOverdueChecker');
const { startTaskReminderChecker } = require('./taskReminderChecker');
const { startComplianceScheduler, stopComplianceScheduler } = require('./complianceScheduler');
const { startGoogleSheetsAutoSync, stopGoogleSheetsAutoSync } = require('./googleSheetsAutoSync');
const {
  startRecordingsRetentionSweeper,
  stopRecordingsRetentionSweeper,
} = require('./recordingsRetention');

/**
 * Single entry point for every background loop.
 *
 * Kept as one place so that "which process runs the schedulers" is answered by
 * one call site (see providers.js and jobs/worker.js), and so leadership loss can
 * shut all of them down together rather than leaving a stray interval running.
 */

const DEFAULT_INTERVALS = {
  overdueMs: 5 * 60 * 1000,
  reminderMs: 5 * 60 * 1000,
  sheetsSyncMs: 3 * 60 * 1000,
  retentionMs: 15 * 60 * 1000,
};

let running = false;
const intervals = {};

function startAllWorkers(overrides = {}) {
  if (running) {
    logger.warn('[Workers] startAllWorkers() called twice; ignoring the second call.');
    return intervals;
  }

  const cfg = { ...DEFAULT_INTERVALS, ...overrides };

  intervals.overdue = startOverdueTaskChecker(cfg.overdueMs);
  intervals.reminder = startTaskReminderChecker(cfg.reminderMs);
  intervals.compliance = startComplianceScheduler();
  intervals.sheetsSync = startGoogleSheetsAutoSync(cfg.sheetsSyncMs);
  intervals.retention = startRecordingsRetentionSweeper(cfg.retentionMs);

  running = true;
  logger.info(
    '[Workers] Background schedulers started: task-overdue, task-reminder, compliance, sheets auto-sync, storage retention.'
  );

  // One-time legacy audio backfill, moved here from module load so only the
  // process that holds the lease performs it. Delayed so it never competes with
  // boot-time work; the function itself tolerates a missing DB connection.
  setTimeout(() => {
    try {
      const { syncLegacyRecordings } = require('../../modules/management/live-tracking/recordings');
      if (typeof syncLegacyRecordings === 'function') {
        syncLegacyRecordings().catch((err) =>
          logger.warn(`[Workers] Legacy audio backfill warning: ${err.message}`)
        );
      }
    } catch (err) {
      logger.warn(`[Workers] Legacy audio backfill unavailable: ${err.message}`);
    }
  }, 30 * 1000).unref();

  return intervals;
}

function stopAllWorkers() {
  if (!running) return;

  // clearInterval handles the plain checkers; the two with internal state need
  // their own stop so the module-level handle is nulled as well.
  for (const key of ['overdue', 'reminder']) {
    if (intervals[key]) clearInterval(intervals[key]);
    intervals[key] = null;
  }

  stopComplianceScheduler();
  stopGoogleSheetsAutoSync();
  stopRecordingsRetentionSweeper();

  running = false;
  logger.info('[Workers] All background schedulers stopped.');
}

const isRunning = () => running;

module.exports = {
  startAllWorkers,
  stopAllWorkers,
  isRunning,
  // Re-exported for targeted tests / one-off scripts.
  startOverdueTaskChecker,
  startTaskReminderChecker,
  startComplianceScheduler,
  startGoogleSheetsAutoSync,
  stopGoogleSheetsAutoSync,
  startRecordingsRetentionSweeper,
  stopRecordingsRetentionSweeper,
};
