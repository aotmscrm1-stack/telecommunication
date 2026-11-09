/**
 * Process role resolution.
 *
 * The same image runs in one of three roles, chosen by PROCESS_ROLE:
 *
 *   api     – HTTP API + WebSockets only. Never starts background schedulers,
 *             so it is safe to run N replicas behind a load balancer.
 *   worker  – background schedulers only (no HTTP listener). Should run as a
 *             single instance; a Mongo lease enforces that even if it is
 *             accidentally scaled.
 *   all     – both, in one process. Default, so local `npm start` and any
 *             environment without the variable set behaves exactly as before.
 *
 * Why this exists: the interval-based schedulers live in-process. If two API
 * replicas both start them, reminders/compliance tickets/Sheets syncs fire
 * twice. Splitting the role is the prerequisite for ever running more than one
 * API container.
 */

const VALID_ROLES = ['api', 'worker', 'all'];

function parseRole(raw) {
  const role = String(raw || '').trim().toLowerCase();
  return VALID_ROLES.includes(role) ? role : 'all';
}

// Falls back to the documented default rather than throwing: a typo in an env
// var must never take production down at boot.
const PROCESS_ROLE = parseRole(process.env.PROCESS_ROLE);

// A one-off script (migrations, backfills) sets PROCESS_ROLE=none-ish values by
// leaving the var unset, so keep `all` permissive: scripts that require
// recordings.js must not silently kick off schedulers. They don't import
// providers.js, so `all` never schedules anything for them.
const runsHttpApi = PROCESS_ROLE === 'api' || PROCESS_ROLE === 'all';
const runsBackgroundJobs = PROCESS_ROLE === 'worker' || PROCESS_ROLE === 'all';

/**
 * Human-readable role banner for boot logs. Makes it obvious from `docker logs`
 * whether a container is serving traffic or running schedulers.
 */
function describeRole() {
  if (PROCESS_ROLE === 'api') return 'api (HTTP + WebSockets, no schedulers)';
  if (PROCESS_ROLE === 'worker') return 'worker (schedulers only, no HTTP listener)';
  return 'all (HTTP + WebSockets + schedulers in one process)';
}

module.exports = {
  PROCESS_ROLE,
  runsHttpApi,
  runsBackgroundJobs,
  describeRole,
};
