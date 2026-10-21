/**
 * CRM Shared Data Synchronization Bus
 * 
 * Lightweight publish/subscribe event hub using standard browser CustomEvents.
 * Allows decoupled views (e.g. AddLead, LeadDetails, Attendance, DailyActivity, Dashboard)
 * to immediately notify sibling components of mutations (create, update, delete)
 * without full-page reloads, major framework rewrites, or redundant polling.
 */

export const CRM_EVENTS = {
  LEADS_CHANGED: 'crm:leads:changed',
  KPIS_CHANGED: 'crm:kpis:changed',
  ATTENDANCE_CHANGED: 'crm:attendance:changed',
  DAILY_ACTIVITY_CHANGED: 'crm:daily_activity:changed',
  DIGITAL_CALENDAR_CHANGED: 'crm:digital_calendar:changed',
  SESSION_RESET: 'crm:session:reset',
};

/**
 * Emit a synchronization event across the frontend.
 * @param {string} eventName - One of CRM_EVENTS
 * @param {any} [payload] - Optional details about the mutation
 */
export function emitCrmSync(eventName, payload = {}) {
  if (typeof window === 'undefined') return;
  try {
    const event = new CustomEvent(eventName, {
      detail: {
        timestamp: Date.now(),
        ...payload,
      }
    });
    window.dispatchEvent(event);
  } catch (err) {
    console.warn('[CRM Sync Bus] Failed to dispatch event:', eventName, err);
  }
}

/**
 * React hook / helper to subscribe to CRM sync events with automatic cleanup.
 * @param {string|string[]} events - Event name or array of event names
 * @param {Function} callback - Handler function to run on event
 */
export function onCrmSync(events, callback) {
  if (typeof window === 'undefined' || typeof callback !== 'function') return () => {};
  
  const eventList = Array.isArray(events) ? events : [events];
  const handler = (e) => {
    try {
      callback(e.detail);
    } catch (err) {
      console.error('[CRM Sync Handler Error]', err);
    }
  };

  eventList.forEach(evt => window.addEventListener(evt, handler));
  return () => {
    eventList.forEach(evt => window.removeEventListener(evt, handler));
  };
}

export default {
  CRM_EVENTS,
  emitCrmSync,
  onCrmSync,
};
