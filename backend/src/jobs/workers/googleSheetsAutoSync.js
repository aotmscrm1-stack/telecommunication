const { syncAllMetaSheets } = require('../../modules/marketing/meta-leads/googleSheetsSyncService');
const MetaSyncState = require('../../database/models/MetaSyncState');
const logger = require('../../core/logger/logger');

let autoSyncInterval = null;

/**
 * Background auto-sync worker that pulls leads from Google Sheets directly into CRM.
 * Bypasses Google Apps Script UrlFetchApp quota completely!
 */
function startGoogleSheetsAutoSync(intervalMs = 3 * 60 * 1000) { // Default: Every 3 minutes
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
  }

  const runSync = async () => {
    try {
      const syncState = await MetaSyncState.findOne({ key: 'meta_leads_sync' });
      if (syncState && syncState.isSyncing) {
        const isStale = syncState.startedAt && (Date.now() - new Date(syncState.startedAt).getTime() > 10 * 60 * 1000);
        if (!isStale) {
          logger.debug('[GoogleSheets AutoSync] Sync currently in progress, skipping tick.');
          return;
        }
      }

      logger.info('[GoogleSheets AutoSync] Running scheduled background sync...');
      await syncAllMetaSheets();
    } catch (err) {
      logger.error('[GoogleSheets AutoSync Error]: ' + err.message);
    }
  };

  // Run initial sync 20 seconds after server boot
  setTimeout(runSync, 20000);

  // Then recurring every intervalMs
  autoSyncInterval = setInterval(runSync, intervalMs);
  logger.info(`[GoogleSheets AutoSync] Background auto-sync worker initialized (runs every ${Math.round(intervalMs / 1000 / 60)} mins)`);
  return autoSyncInterval;
}

function stopGoogleSheetsAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
    logger.info('[GoogleSheets AutoSync] Background worker stopped');
  }
}

module.exports = {
  startGoogleSheetsAutoSync,
  stopGoogleSheetsAutoSync
};
