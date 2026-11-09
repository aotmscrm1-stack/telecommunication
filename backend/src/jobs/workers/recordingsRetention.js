const fs = require('fs');
const path = require('path');
const CallRecording = require('../../database/models/CallRecording');
const logger = require('../../core/logger/logger');
const {
  getRecordingsDir,
  getTempRecordingsDir,
  getDirectoryUsage,
} = require('../../core/utils/recordingsStorage');

/**
 * Local audio is a cache, not a store.
 *
 * Every recording is uploaded to Cloudinary before the API reports success, so
 * the copy on the VPS disk exists only to serve the first few plays and to feed
 * transcription. Without this sweeper that cache grows forever on the same
 * volume as the OS, Docker images and logs — which is the most likely way a
 * single-node deployment runs out of disk.
 *
 * Two passes per tick:
 *   A. Cloud-backed recordings older than the retention window -> delete the
 *      local file. Cloudinary stays the source of truth; /stream redirects.
 *   B. Leftover scratch files -> delete once old enough. These are re-downloaded
 *      copies created for transcription and any upload that died mid-flight.
 *
 * A recording whose Cloudinary upload failed is never deleted, so fileAvailable
 * stays truthful and nothing is lost.
 */

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
const DEFAULT_RETENTION_MINUTES = 120; // 2 hours of local cache
const CLOUD_BACKED_BATCH = 500;        // cap per tick so one run stays cheap
const ORPHAN_BATCH = 200;

function retentionMs() {
  const minutes = Number(process.env.RECORDINGS_LOCAL_RETENTION_MINUTES);
  const effective = Number.isFinite(minutes) && minutes >= 0 ? minutes : DEFAULT_RETENTION_MINUTES;
  return effective * 60 * 1000;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function unlinkQuietly(filePath) {
  try {
    const stat = await fs.promises.stat(filePath);
    await fs.promises.unlink(filePath);
    return stat.size;
  } catch (_) {
    return 0;
  }
}

/**
 * Pass A: drop the local copy of recordings that are already safe in Cloudinary.
 */
async function purgeCloudBackedLocalFiles(cutoff, recordingsDir) {
  let freed = 0;
  let deleted = 0;

  const candidates = await CallRecording.find({
    cloudinaryUrl: { $nin: [null, ''] },
    recordedAt: { $lt: cutoff },
  })
    .select('storedName')
    .limit(CLOUD_BACKED_BATCH)
    .lean();

  for (const rec of candidates) {
    if (!rec.storedName) continue;
    // basename() guards against a stored name that ever contains separators.
    const filePath = path.join(recordingsDir, path.basename(rec.storedName));
    const size = await unlinkQuietly(filePath);
    if (size > 0) {
      freed += size;
      deleted += 1;
    }
  }

  return { freed, deleted };
}

/**
 * Pass B: remove scratch/orphan files that no recording claims and that are
 * older than the retention window.
 */
async function purgeOrphanFiles(cutoff, dir) {
  let freed = 0;
  let deleted = 0;
  let checked = 0;

  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (_) {
    return { freed, deleted };
  }

  for (const entry of entries) {
    if (checked >= ORPHAN_BATCH) break;
    if (!entry.isFile()) continue;

    const filePath = path.join(dir, entry.name);
    let stat;
    try {
      stat = await fs.promises.stat(filePath);
    } catch (_) {
      continue;
    }
    if (stat.mtimeMs >= cutoff.getTime()) continue;

    checked += 1;

    // Never delete a file that a DB row still points at — that is real audio.
    const owner = await CallRecording.exists({ storedName: entry.name });
    if (owner) continue;

    const size = await unlinkQuietly(filePath);
    if (size > 0) {
      freed += size;
      deleted += 1;
    }
  }

  return { freed, deleted };
}

async function sweepOnce({ dryRun = false } = {}) {
  const cutoff = new Date(Date.now() - retentionMs());
  const recordingsDir = getRecordingsDir();
  const tempDir = getTempRecordingsDir();

  if (dryRun) {
    const usage = await getDirectoryUsage(recordingsDir);
    logger.info(
      `[Storage Sweeper] dry run: ${recordingsDir} holds ${usage.files} file(s), ${formatBytes(usage.bytes)}; nothing deleted.`
    );
    return { freed: 0, deleted: 0 };
  }

  // Reports and temp copies are always disposable, so they are swept first.
  const tempResult = await purgeOrphanFiles(cutoff, tempDir);
  const orphanResult = await purgeOrphanFiles(cutoff, recordingsDir);
  const cloudResult = await purgeCloudBackedLocalFiles(cutoff, recordingsDir);

  const freed = tempResult.freed + orphanResult.freed + cloudResult.freed;
  const deleted = tempResult.deleted + orphanResult.deleted + cloudResult.deleted;

  if (deleted > 0) {
    const usage = await getDirectoryUsage(recordingsDir);
    logger.info(
      `[Storage Sweeper] deleted ${deleted} local file(s) (${formatBytes(freed)} freed); ` +
        `${recordingsDir} now holds ${usage.files} file(s), ${formatBytes(usage.bytes)}.`
    );
  }

  return { freed, deleted };
}

let sweepInterval = null;

function startRecordingsRetentionSweeper(intervalMs = DEFAULT_INTERVAL_MS) {
  if (sweepInterval) clearInterval(sweepInterval);

  const tick = () => {
    sweepOnce().catch((err) => logger.error(`[Storage Sweeper] sweep failed: ${err.message}`));
  };

  // Give the DB connection and any in-flight uploads a moment before the first
  // pass, rather than sweeping during boot.
  setTimeout(tick, 60 * 1000).unref();
  sweepInterval = setInterval(tick, intervalMs);
  if (sweepInterval.unref) sweepInterval.unref();

  logger.info(
    `[Storage Sweeper] Local audio retention active: files are deleted ${Math.round(retentionMs() / 60000)} min after ` +
      `their recording is safely in Cloudinary (interval ${Math.round(intervalMs / 60000)} min).`
  );
  return sweepInterval;
}

function stopRecordingsRetentionSweeper() {
  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
    logger.info('[Storage Sweeper] Stopped.');
  }
}

module.exports = {
  startRecordingsRetentionSweeper,
  stopRecordingsRetentionSweeper,
  sweepOnce,
};
