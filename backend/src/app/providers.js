const connectDB = require('../config/database');
const { startAllWorkers, stopAllWorkers } = require('../jobs/workers');
const { startLeaderElection } = require('../jobs/workers/schedulerLease');
const { initWebSocketServer } = require('../app/websocket');
const { initTrackingSocketServer } = require('../modules/management/live-tracking/trackingSocket');
const { runsHttpApi, runsBackgroundJobs, describeRole } = require('../config/runtime');
const logger = require('../core/logger/logger');

/**
 * Boot sequence, split by process role.
 *
 * Before this split, every process that imported the server also started the
 * interval schedulers, which meant running a second API replica would double
 * every reminder, compliance ticket and Google Sheets sync. Now:
 *
 *   api     -> sockets + HTTP only
 *   worker  -> schedulers only, and only while holding the scheduler lease
 *   all     -> both (default, unchanged behaviour for single-container installs)
 *
 * The lease is used in both `worker` and `all` modes, so an accidental second
 * replica cannot double-run the schedulers even when roles are misconfigured.
 */

let leaderElection = null;
let isShuttingDown = false;

/**
 * Begin leader election and, once this process wins it, start every background
 * loop. Returns immediately — leadership is not awaited, so HTTP availability
 * never depends on the lease. Safe to call more than once; later calls are no-ops.
 */
async function startBackgroundServices() {
  if (!runsBackgroundJobs) {
    logger.info(`[Runtime] Background schedulers disabled in this process (role: ${describeRole()}).`);
    return null;
  }
  if (leaderElection) return leaderElection;
  leaderElection = startLeaderElection({
    leaseKey: process.env.SCHEDULER_LEASE_KEY || 'background-worker',
    // Fire on every transition, not just the first: after a demotion the lease
    // can be re-acquired, and the schedulers must then restart. startAllWorkers()
    // and stopAllWorkers() are both idempotent.
    onBecomeLeader: () => {
      if (isShuttingDown) return;
      startAllWorkers();
    },
    onLoseLeadership: () => stopAllWorkers(),
  });

  // Leadership is never awaited on the boot path: an API container must keep
  // serving traffic even while another replica holds the lease.
  leaderElection.waitForLeadership().catch((err) =>
    logger.error(`[Runtime] Scheduler leadership failed: ${err && err.message ? err.message : err}`)
  );

  return leaderElection;
}

/**
 * Stop background loops and hand the lease back before the process exits, so a
 * peer can take over immediately instead of waiting for the lease to expire.
 */
async function stopBackgroundServices() {
  isShuttingDown = true;
  stopAllWorkers();
  if (leaderElection) {
    await leaderElection.stop();
    leaderElection = null;
  }
}

/** True once shutdown has begun; background callbacks check this before acting. */
const isStopping = () => isShuttingDown;

const initProviders = async (server) => {
  // 1. Database. Required by both roles; the worker has no HTTP listener but
  // needs Mongo for the lease, the schedulers and the model queries.
  await connectDB();

  // 2. WebSockets belong to the process that also serves HTTP requests.
  if (runsHttpApi && server) {
    initWebSocketServer(server);
    initTrackingSocketServer(server);
    logger.info('WebSocket and Tracking Socket servers initialized');
  }

  // 3. Background schedulers (worker role, or `all`).
  await startBackgroundServices();

  logger.info(`[Runtime] Process role: ${describeRole()}`);
};

module.exports = {
  initProviders,
  startBackgroundServices,
  stopBackgroundServices,
};
