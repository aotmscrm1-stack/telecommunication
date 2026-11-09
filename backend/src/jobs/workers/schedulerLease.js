const os = require('os');
const crypto = require('crypto');
const mongoose = require('mongoose');
const SchedulerLease = require('../../database/models/SchedulerLease');
const logger = require('../../core/logger/logger');

/**
 * Leader election for the background schedulers.
 *
 * Guarantees that exactly one process runs the interval jobs, even if the worker
 * service is scaled to 3 replicas or someone sets PROCESS_ROLE=all on several
 * containers. Correctness comes from `expiresAt`, not from Mongo's TTL monitor,
 * so a crashed holder is replaced within one heartbeat window.
 *
 * Semantics:
 *   - `waitForLeadership()` resolves once this process owns the lease.
 *   - If the lease cannot be renewed (network blip, Mongo failover), leadership
 *     is released proactively by the new holder and `onLoseLeadership` fires so
 *     the caller can stop its schedulers instead of double-running them.
 */

const DEFAULT_LEASE_KEY = 'background-worker';
const DEFAULT_TTL_MS = 60 * 1000;      // lease survives 60s without a heartbeat
const DEFAULT_RENEW_MS = 20 * 1000;    // renew every 20s => 3 chances before expiry

// Identifies this process. Hostname matters: on Docker the container id is in
// HOSTNAME, which is what makes `docker ps` output and lease rows line up.
const HOLDER_ID = [
  process.env.WORKER_ID || process.env.HOSTNAME || os.hostname(),
  process.pid,
  crypto.randomBytes(4).toString('hex'),
].join(':');

/**
 * Attempt to take the lease if it is free or expired.
 * Mirrors workerLockManager's two-phase approach: a conditional atomic update
 * first, then an insert that tolerates the duplicate-key race.
 */
async function tryAcquire(key, ttlMs) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  const updated = await SchedulerLease.findOneAndUpdate(
    {
      key,
      $or: [{ holder: HOLDER_ID }, { expiresAt: { $lt: now } }],
    },
    {
      $set: { holder: HOLDER_ID, expiresAt, heartbeatAt: now },
      $setOnInsert: { acquiredAt: now },
    },
    { new: true }
  );
  if (updated) return updated;

  try {
    return await SchedulerLease.create({
      key,
      holder: HOLDER_ID,
      expiresAt,
      heartbeatAt: now,
      acquiredAt: now,
    });
  } catch (err) {
    // Another process inserted between our update and our insert.
    if (err && err.code === 11000) return null;
    throw err;
  }
}

/**
 * Renew only while we still own the lease. Returns false the moment ownership
 * has moved on, which is the signal to stand down.
 */
async function tryRenew(key, ttlMs) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const renewed = await SchedulerLease.findOneAndUpdate(
    { key, holder: HOLDER_ID },
    { $set: { expiresAt, heartbeatAt: now } },
    { new: true }
  );
  return !!renewed;
}

/**
 * Hand the lease back so a peer can take over immediately instead of waiting for
 * the TTL. Only deletes the row if we still own it, so a losing worker can never
 * steal leadership from the current holder on shutdown.
 */
async function release(key) {
  try {
    await SchedulerLease.deleteOne({ key, holder: HOLDER_ID });
  } catch (err) {
    logger.warn(`[Scheduler Lease] Release failed (lease will expire on its own): ${err.message}`);
  }
}

/**
 * Start the election loop.
 *
 * @param {object}   options
 * @param {string}   [options.leaseKey]        Logical worker pool name.
 * @param {number}   [options.ttlMs]           Lease lifetime without a heartbeat.
 * @param {number}   [options.renewMs]         Heartbeat interval.
 * @param {Function} [options.onBecomeLeader]  Called on every promotion, including
 *                                             re-promotion after a demotion.
 * @param {Function} [options.onLoseLeadership] Called on every demotion.
 * @returns {{ waitForLeadership: Promise<void>, isLeader: () => boolean, stop: Function }}
 */
function startLeaderElection({
  leaseKey = DEFAULT_LEASE_KEY,
  ttlMs = DEFAULT_TTL_MS,
  renewMs = DEFAULT_RENEW_MS,
  onBecomeLeader,
  onLoseLeadership,
} = {}) {
  let leader = false;
  let hasBeenLeader = false;
  let stopped = false;
  let timer = null;
  let resolveLeadership;
  let rejectLeadership;

  const waitForLeadership = new Promise((resolve, reject) => {
    resolveLeadership = resolve;
    rejectLeadership = reject;
  });

  const promote = () => {
    leader = true;
    if (!hasBeenLeader) {
      hasBeenLeader = true;
      logger.info(
        `[Scheduler Lease] Acquired "${leaseKey}" as ${HOLDER_ID}. This process now runs the background schedulers.`
      );
      resolveLeadership();
    }
    Promise.resolve()
      .then(() => onBecomeLeader && onBecomeLeader())
      .catch((err) => logger.error(`[Scheduler Lease] onBecomeLeader handler failed: ${err.message}`));
  };

  const demote = (reason) => {
    if (!leader) return;
    leader = false;
    logger.warn(`[Scheduler Lease] Lost leadership (${reason}). Schedulers halted.`);
    Promise.resolve()
      .then(() => onLoseLeadership && onLoseLeadership(reason))
      .catch((err) => logger.error(`[Scheduler Lease] onLoseLeadership handler failed: ${err.message}`));
  };

  const tick = async () => {
    if (stopped) return;

    // Mongoose buffers commands until the connection is ready, so an early tick
    // would just hang. Skip cleanly and retry on the next beat.
    if (!mongoose.connection || mongoose.connection.readyState !== 1) return;

    try {
      if (!leader) {
        const acquired = await tryAcquire(leaseKey, ttlMs);
        if (acquired) promote();
        return;
      }

      const renewed = await tryRenew(leaseKey, ttlMs);
      if (!renewed) demote('lease renewal rejected');
    } catch (err) {
      if (err && err.code === 11000 && !leader) return; // lost the insert race, harmless
      logger.error(`[Scheduler Lease] Election error: ${err.message}`);
      // A transient DB error must not silently stop the scheduler for good:
      // demote so the next successful tick re-acquires explicitly.
      demote('election error');
    }
  };

  // First attempt immediately, then on a fixed beat.
  tick();
  timer = setInterval(tick, renewMs);

  return {
    waitForLeadership,
    isLeader: () => leader,
    async stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = null;
      if (leader) await release(leaseKey);
      leader = false;
    },
    // Exposed for diagnostics/logging only.
    holderId: HOLDER_ID,
    // Kept so callers can surface a rejected promise instead of an unhandled one.
    fail(reason) {
      if (!leader) rejectLeadership(reason);
    },
  };
}

module.exports = {
  startLeaderElection,
  HOLDER_ID,
  DEFAULT_LEASE_KEY,
};
