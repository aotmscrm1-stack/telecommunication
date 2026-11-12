const path = require('path');
const fs = require('fs');

/**
 * Canonical on-disk locations for audio.
 *
 * This exists because the paths were previously recomputed inline in several
 * modules with subtly different `../..` depths, and because the production
 * default used to resolve to `/var/data/recordings` — a directory that is not
 * mounted into the container. The API then fell back to `/app/src/uploads`,
 * which lives on the container's writable overlay rather than the Docker volume
 * shared with nginx. The result was recordings that vanished on every rebuild
 * and a disk that grew inside the image layer.
 *
 * Deployments should therefore set RECORDINGS_DIR explicitly (compose does:
 * `/app/uploads/recordings`, which is the `backend-uploads` volume).
 */

// backend/  (this file lives at backend/src/core/utils/)
const BACKEND_ROOT = path.join(__dirname, '..', '..', '..');

function ensureWritable(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return dir;
  } catch (_) {
    return null;
  }
}

/**
 * Where incoming call recordings are written before being pushed to Cloudinary.
 * A short-lived cache, not permanent storage — see the retention sweeper.
 */
function getRecordingsDir() {
  const legacyDefault = path.join(BACKEND_ROOT, 'src', 'uploads', 'recordings');

  const candidates = [
    process.env.RECORDINGS_DIR,
    // Kept for parity with the previous behaviour on bare-metal installs.
    process.env.NODE_ENV === 'production' ? '/var/data/recordings' : null,
    legacyDefault,
    path.join('/tmp', 'recordings'),
  ].filter(Boolean);

  for (const dir of candidates) {
    const ok = ensureWritable(dir);
    if (ok) return ok;
  }
  return legacyDefault;
}

/**
 * Scratch space used when a recording has to be re-downloaded in order to be
 * transcribed. Files here are always disposable copies.
 */
function getTempRecordingsDir() {
  const candidates = [
    process.env.TEMP_RECORDINGS_DIR,
    path.join(BACKEND_ROOT, 'src', 'temp_recordings'),
    path.join('/tmp', 'temp_recordings'),
  ].filter(Boolean);

  for (const dir of candidates) {
    const ok = ensureWritable(dir);
    if (ok) return ok;
  }
  return candidates[candidates.length - 1];
}

/**
 * Total bytes and file count for a directory (non-recursive, best effort).
 * Used by the retention sweeper to make disk usage visible in the logs.
 */
async function getDirectoryUsage(dir) {
  let bytes = 0;
  let files = 0;
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      try {
        const stat = await fs.promises.stat(path.join(dir, entry.name));
        bytes += stat.size;
        files += 1;
      } catch (_) {
        // File disappeared between readdir and stat; ignore.
      }
    }
  } catch (_) {
    return { bytes: 0, files: 0 };
  }
  return { bytes, files };
}

module.exports = {
  BACKEND_ROOT,
  getRecordingsDir,
  getTempRecordingsDir,
  getDirectoryUsage,
};
