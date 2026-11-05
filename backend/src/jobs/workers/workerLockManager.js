const crypto = require('crypto');
const ComplianceJobState = require('../../database/models/ComplianceJobState');

const LEASE_DURATION_MS = 5 * 60 * 1000; // 5 minutes TTL

/**
 * Robust atomic distributed lease lock acquisition for Compliance jobs (Mongoose 8.x compatible)
 */
async function acquireComplianceLock(jobName, dateStr) {
  const now = new Date();
  const lockToken = `${process.pid}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const lockExpiresAt = new Date(now.getTime() + LEASE_DURATION_MS);

  // Phase 1: Try atomic update on existing pending, failed, or expired lock
  let job = await ComplianceJobState.findOneAndUpdate(
    {
      jobName,
      date: dateStr,
      $or: [
        { status: 'pending' },
        { status: 'failed' },
        { status: 'running', lockExpiresAt: { $lt: now } } // Safe takeover of crashed/expired lock
      ]
    },
    {
      $set: {
        status: 'running',
        workerId: lockToken,
        lockedAt: now,
        heartbeatAt: now,
        lockExpiresAt,
        lastRunStartedAt: now
      },
      $inc: { attempts: 1 }
    },
    { new: true }
  );

  if (job) {
    return { acquired: true, lockToken, job };
  }

  // Phase 2: Check if already completed or currently held by active worker
  const existing = await ComplianceJobState.findOne({ jobName, date: dateStr });
  if (existing) {
    if (existing.status === 'completed') {
      return { acquired: false, reason: 'ALREADY_COMPLETED', job: existing };
    }
    if (existing.status === 'running' && existing.lockExpiresAt && existing.lockExpiresAt >= now) {
      return { acquired: false, reason: 'LOCKED_BY_ACTIVE_WORKER', job: existing };
    }
  }

  // Phase 3: Insert new document handling concurrent insert race (E11000)
  try {
    job = await ComplianceJobState.create({
      jobName,
      date: dateStr,
      status: 'running',
      workerId: lockToken,
      lockedAt: now,
      heartbeatAt: now,
      lockExpiresAt,
      lastRunStartedAt: now,
      attempts: 1
    });
    return { acquired: true, lockToken, job };
  } catch (err) {
    if (err.code === 11000) {
      // Race lost to another worker; retry Phase 1 once
      const retryJob = await ComplianceJobState.findOneAndUpdate(
        {
          jobName,
          date: dateStr,
          $or: [
            { status: 'pending' },
            { status: 'failed' },
            { status: 'running', lockExpiresAt: { $lt: now } }
          ]
        },
        {
          $set: {
            status: 'running',
            workerId: lockToken,
            lockedAt: now,
            heartbeatAt: now,
            lockExpiresAt,
            lastRunStartedAt: now
          },
          $inc: { attempts: 1 }
        },
        { new: true }
      );
      if (retryJob) return { acquired: true, lockToken, job: retryJob };
      return { acquired: false, reason: 'RACE_LOST_TO_ANOTHER_WORKER' };
    }
    throw err;
  }
}

/**
 * Renew heartbeat of an active lock
 */
async function renewComplianceLock(jobName, dateStr, lockToken) {
  const now = new Date();
  const newExpires = new Date(now.getTime() + LEASE_DURATION_MS);
  const updated = await ComplianceJobState.findOneAndUpdate(
    { jobName, date: dateStr, workerId: lockToken, status: 'running' },
    { $set: { heartbeatAt: now, lockExpiresAt: newExpires } },
    { new: true }
  );
  return !!updated;
}

/**
 * Safely complete and release lock with ownership verification
 */
async function releaseComplianceLock(jobName, dateStr, lockToken, summary = {}) {
  const now = new Date();
  const completed = await ComplianceJobState.findOneAndUpdate(
    { jobName, date: dateStr, workerId: lockToken, status: 'running' },
    {
      $set: {
        status: 'completed',
        lastRunCompletedAt: now,
        lockExpiresAt: null,
        totalEmployeesEvaluated: summary.total || 0,
        compliantCount: summary.compliant || 0,
        ticketsGeneratedCount: summary.tickets || 0,
        metadata: summary.metadata || {}
      }
    },
    { new: true }
  );

  if (!completed) {
    console.warn(`[Lock Manager] Failed to mark ${jobName} as completed. Worker ${lockToken} lost lock or lease expired.`);
  }
  return completed;
}

/**
 * Fail lock with error log
 */
async function failComplianceLock(jobName, dateStr, lockToken, errorMessage = '') {
  const now = new Date();
  return ComplianceJobState.findOneAndUpdate(
    { jobName, date: dateStr, workerId: lockToken },
    {
      $set: { status: 'failed', lastRunCompletedAt: now, lockExpiresAt: null },
      $push: { jobErrors: { message: errorMessage, timestamp: now } }
    },
    { new: true }
  );
}

module.exports = {
  acquireComplianceLock,
  renewComplianceLock,
  releaseComplianceLock,
  failComplianceLock
};
