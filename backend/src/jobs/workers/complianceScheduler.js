const { acquireComplianceLock, releaseComplianceLock, failComplianceLock } = require('./workerLockManager');
const { runMorning10AmCheck } = require('./morningComplianceChecker');
const ComplianceJobState = require('../../database/models/ComplianceJobState');

/**
 * Recovers missed morning sweeps if server booted or restarted after 10:00 AM IST
 */
async function recoverMissedMorningSweepOnBoot() {
  try {
    const now = new Date();
    const istTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
    const todayDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // If server starts after 10:00:00 AM IST
    if (istTimeStr >= '10:00:00') {
      const state = await ComplianceJobState.findOne({ 
        jobName: 'MORNING_10AM_COMPLIANCE', 
        date: todayDateStr,
        status: 'completed'
      });

      if (!state) {
        console.log(`[Compliance Recovery] Server booted after 10:00 AM IST. Running missed morning sweep for ${todayDateStr}...`);
        const lock = await acquireComplianceLock('MORNING_10AM_COMPLIANCE', todayDateStr);
        if (lock.acquired) {
          try {
            const summary = await runMorning10AmCheck(todayDateStr, lock.lockToken);
            await releaseComplianceLock('MORNING_10AM_COMPLIANCE', todayDateStr, lock.lockToken, summary);
            console.log(`[Compliance Recovery] Completed morning sweep. Total: ${summary.total}, Compliant: ${summary.compliant}, Tickets: ${summary.tickets}`);
          } catch (sweepErr) {
            await failComplianceLock('MORNING_10AM_COMPLIANCE', todayDateStr, lock.lockToken, sweepErr.message);
            console.error('[Compliance Recovery Error]', sweepErr);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Compliance Boot Recovery Error]', err.message);
  }
}

/**
 * Starts the precision compliance scheduler
 */
function startComplianceScheduler() {
  // 1. Check for boot recovery immediately
  recoverMissedMorningSweepOnBoot();

  // 2. Evaluates every 60 seconds
  setInterval(async () => {
    try {
      const now = new Date();
      const istTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
      const todayDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      // Checkpoint 1: 10:00 AM IST Universal Sweep window (10:00:00 to 10:14:59)
      if (istTimeStr >= '10:00:00' && istTimeStr < '10:15:00') {
        const lock = await acquireComplianceLock('MORNING_10AM_COMPLIANCE', todayDateStr);
        if (lock.acquired) {
          try {
            console.log(`[Compliance Scheduler] Starting 10:00 AM IST sweep for ${todayDateStr} with worker ${lock.lockToken}`);
            const summary = await runMorning10AmCheck(todayDateStr, lock.lockToken);
            await releaseComplianceLock('MORNING_10AM_COMPLIANCE', todayDateStr, lock.lockToken, summary);
            console.log(`[Compliance Scheduler] Completed 10:00 AM sweep:`, summary);
          } catch (sweepErr) {
            await failComplianceLock('MORNING_10AM_COMPLIANCE', todayDateStr, lock.lockToken, sweepErr.message);
            console.error('[Compliance Sweep Error]', sweepErr);
          }
        }
      }
    } catch (schedErr) {
      console.error('[Compliance Scheduler Error]', schedErr.message);
    }
  }, 60 * 1000);
}

module.exports = {
  startComplianceScheduler,
  recoverMissedMorningSweepOnBoot
};

