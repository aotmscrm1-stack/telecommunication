import { toast } from 'sonner';

const STORAGE_KEY = 'aotms_note_reminders_pending';
export const REMINDER_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes in milliseconds (300,000 ms)

/**
 * Checks if the lead status requires a counsellor note
 * Matches: "office visit's", "office visits", "office visit", "Demo attended", "demo attended", etc.
 */
export function isStatusRequiringNote(status) {
  if (!status || typeof status !== 'string') return false;
  const s = status.toLowerCase().trim();
  return (
    s.includes('office visit') ||
    s.includes('demo attended')
  );
}

/**
 * Checks if the lead already has any genuinely recorded counsellor note
 * (strictly excludes automated "Status changed from..." logs)
 */
export function leadHasNote(lead) {
  if (!lead) return false;

  const isStatusText = (str) => {
    if (!str || typeof str !== 'string') return true;
    const s = str.trim().toLowerCase();
    return s.startsWith('status changed') || s.startsWith('status updated');
  };

  // 1. Check activities for genuine counsellor note
  if (Array.isArray(lead.activities)) {
    const hasActivityNote = lead.activities.some(a => {
      if (a.type !== 'note') return false;
      const text = a.description || a.note || '';
      return Boolean(text && !isStatusText(text));
    });
    if (hasActivityNote) return true;
  }

  // 2. Check callNotes (MetaLead schema) excluding status_change
  if (Array.isArray(lead.callNotes) && lead.callNotes.length > 0) {
    const hasCallNote = lead.callNotes.some(cn => {
      if (cn.outcome === 'status_change') return false;
      const text = cn.note || '';
      return Boolean(text && text.trim() && !isStatusText(text));
    });
    if (hasCallNote) return true;
  }

  // 3. Check notes array or direct note field
  if (Array.isArray(lead.notes) && lead.notes.length > 0) {
    const hasItem = lead.notes.some(n => {
      const text = typeof n === 'string' ? n : (n?.note || n?.text || '');
      return Boolean(text && text.trim() && !isStatusText(text));
    });
    if (hasItem) return true;
  }

  if (typeof lead.note === 'string' && lead.note.trim().length > 0 && !isStatusText(lead.note)) {
    return true;
  }

  return false;
}


/**
 * Helper to safely get stored pending reminders from localStorage
 */
function getStoredReminders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('Failed to parse note reminders from storage:', e);
    return {};
  }
}

/**
 * Helper to safely save pending reminders to localStorage
 */
function saveStoredReminders(reminders) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  } catch (e) {
    console.warn('Failed to save note reminders to storage:', e);
  }
}

const CALLBACK_STORAGE_KEY = 'aotms_callback_reminders_pending';

function getStoredCallbacks() {
  try {
    const raw = localStorage.getItem(CALLBACK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveStoredCallbacks(callbacks) {
  try {
    localStorage.setItem(CALLBACK_STORAGE_KEY, JSON.stringify(callbacks));
  } catch (e) {}
}

function getCurrentStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function isAdminOrManager(user) {
  if (!user) return false;
  const role = String(user.role || '').trim().toLowerCase();
  const d = String(user.designation || '').trim().toUpperCase();
  const dn = String(user.displayName || '').trim().toUpperCase();

  if (role === 'admin' || role === 'superadmin' || role === 'manager') return true;
  if (
    d === 'ADMIN' ||
    d === 'ADMINISTRATOR' ||
    d === 'MANAGER' ||
    d.includes('MANAGER') ||
    d === 'MD' ||
    d.includes('MANAGING DIRECTOR') ||
    dn === 'ADMIN' ||
    dn === 'MANAGER' ||
    dn.includes('MANAGER') ||
    dn.includes('MANAGING DIRECTOR')
  ) {
    return true;
  }
  return false;
}

export function canUserSeeCallbackToast(payload, currentUser = null) {
  const user = currentUser || getCurrentStoredUser();
  if (!user) return false;
  if (isAdminOrManager(user)) return true;

  const uid = String(user._id || user.id || '');
  if (!uid) return false;

  if (payload?.filledById && String(payload.filledById) === uid) return true;
  if (payload?.assignedToId && String(payload.assignedToId) === uid) return true;
  if (Array.isArray(payload?.campaignAssignedUserIds)) {
    if (payload.campaignAssignedUserIds.map(String).includes(uid)) return true;
  }
  return false;
}

class LeadNoteReminderService {
  constructor() {
    this.intervalId = null;
    this.initialized = false;
    this.ws = null;
    this.recentToastIds = new Set();
  }

  /**
   * Initialize background timer & WebSocket listener for Call Back Later toasts
   */
  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.connectWebSocket();

    // Check every 10 seconds
    this.intervalId = setInterval(() => {
      this.checkAndTriggerPendingReminders();
      this.checkAndTriggerDueCallbacks();
    }, 10000);
  }

  connectWebSocket() {
    try {
      const apiBase = import.meta.env.VITE_API_URL || window.location.origin;
      const wsBase = apiBase.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
      const wsUrl = `${wsBase}/ws`;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'callback:scheduled' && msg.payload) {
            this.triggerCallbackToast(msg.payload, { isImmediate: true });
          }
        } catch (_) {}
      };

      ws.onclose = () => {
        if (this.initialized) {
          setTimeout(() => this.connectWebSocket(), 5000);
        }
      };
    } catch (_) {}
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
    this.initialized = false;
  }

  /**
   * Triggers a "Call Back Later" Toast Message (Visible ONLY to Admin, Manager & Assigned Employees)
   * Displays Form Fill Name (who filled the form), Person Name (lead name), and a "GO" redirect button.
   */
  triggerCallbackToast(payload, { isImmediate = true, isDueAlert = false } = {}) {
    if (!payload) return;
    if (!canUserSeeCallbackToast(payload)) return;

    const dedupeKey = `${payload.followupId || payload.leadId}-${isDueAlert ? 'due' : 'sched'}`;
    if (this.recentToastIds.has(dedupeKey)) return;
    this.recentToastIds.add(dedupeKey);
    setTimeout(() => this.recentToastIds.delete(dedupeKey), 6000);

    // Save for due-time reminder check if scheduled in the future
    if (isImmediate && payload.scheduledAt) {
      const schedTime = new Date(payload.scheduledAt).getTime();
      if (!isNaN(schedTime) && schedTime > Date.now()) {
        const stored = getStoredCallbacks();
        stored[payload.followupId || payload.leadId] = {
          ...payload,
          dueNotified: false,
        };
        saveStoredCallbacks(stored);
      }
    }

    const personName = payload.leadName || 'Lead';
    const filledByName = payload.filledByName || 'Agent';
    const schedStr = payload.scheduledAt
      ? new Date(payload.scheduledAt).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    const title = isDueAlert
      ? `⏰ Call Back Later Due Now — ${personName}`
      : `⏰ Call Back Later Scheduled — ${personName}`;

    const description = `👤 Person Name: ${personName}${payload.leadPhone && payload.leadPhone !== '—' ? ` (${payload.leadPhone})` : ''}  •  ✍️ Form Fill By: ${filledByName}${schedStr ? `  •  🕒 ${schedStr}` : ''}`;

    toast.info(title, {
      id: `callback-toast-${dedupeKey}`,
      description,
      duration: 18000,
      action: {
        label: 'GO',
        onClick: () => {
          window.dispatchEvent(
            new CustomEvent('redirect-to-callback-lead', {
              detail: payload,
            })
          );
        },
      },
    });
  }

  checkAndTriggerDueCallbacks() {
    const callbacks = getStoredCallbacks();
    const keys = Object.keys(callbacks);
    if (keys.length === 0) return;

    const now = Date.now();
    let changed = false;

    for (const key of keys) {
      const item = callbacks[key];
      if (!item || item.dueNotified) continue;
      const schedTime = new Date(item.scheduledAt).getTime();
      if (isNaN(schedTime)) {
        delete callbacks[key];
        changed = true;
        continue;
      }
      if (now >= schedTime) {
        this.triggerCallbackToast(item, { isImmediate: false, isDueAlert: true });
        delete callbacks[key];
        changed = true;
      }
    }

    if (changed) {
      saveStoredCallbacks(callbacks);
    }
  }

  /**
   * Tracks a lead when their status is set to "office visit's" or "Demo attended".
   * If they don't have a note, shows an immediate toast and sets up recurring 5-minute reminders.
   */
  trackLead({ id, name, status, hasExistingNote = false }) {
    if (!id || !isStatusRequiringNote(status)) {
      if (id && status && !isStatusRequiringNote(status)) {
        // If status changed away from office visit/demo attended, stop reminders
        this.resolveLead(id);
      }
      return;
    }

    if (hasExistingNote) {
      this.resolveLead(id);
      return;
    }

    const reminders = getStoredReminders();
    const existing = reminders[id];
    const now = Date.now();

    reminders[id] = {
      id,
      name: name || 'Student',
      status,
      registeredAt: existing?.registeredAt || now,
      lastRemindedAt: now,
    };
    saveStoredReminders(reminders);

    // Show toast immediately in the right corner
    this.showToast(reminders[id]);
  }

  /**
   * Called when a note is added for the lead.
   * Cancels the 5-minute reminders and dismisses the alert.
   */
  resolveLead(id, name) {
    if (!id) return;
    const reminders = getStoredReminders();
    if (reminders[id]) {
      const leadName = name || reminders[id].name || 'Lead';
      delete reminders[id];
      saveStoredReminders(reminders);

      // Dismiss active reminder toast
      toast.dismiss(`note-reminder-${id}`);

      // Show confirmation toast
      toast.success(`Note added for ${leadName}`, {
        description: '5-minute note reminders have been stopped.',
        duration: 4000,
      });
    }
  }

  /**
   * Displays the Sonner toast notification in the right corner with an "Add Note" button.
   */
  showToast(entry) {
    if (!entry || !entry.id) return;

    toast.warning(`📝 Note Required: ${entry.name}`, {
      id: `note-reminder-${entry.id}`,
      description: `Status is "${entry.status}". Please add a counsellor note for this student.`,
      duration: 15000, // 15 seconds display
      action: {
        label: 'Add Note',
        onClick: () => {
          // Dispatch custom event to open the note modal
          window.dispatchEvent(
            new CustomEvent('open-lead-note-modal', {
              detail: { leadId: entry.id, leadName: entry.name, status: entry.status },
            })
          );
        },
      },
    });
  }

  /**
   * Periodic check: triggers reminder if 10 minutes have elapsed since lastRemindedAt
   */
  checkAndTriggerPendingReminders() {
    const reminders = getStoredReminders();
    const keys = Object.keys(reminders);
    if (keys.length === 0) return;

    const now = Date.now();
    let hasChanges = false;

    for (const id of keys) {
      const item = reminders[id];
      const elapsed = now - (item.lastRemindedAt || item.registeredAt || 0);

      if (elapsed >= REMINDER_INTERVAL_MS) {
        this.showToast(item);
        item.lastRemindedAt = now;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      saveStoredReminders(reminders);
    }
  }
}

export const leadNoteReminderService = new LeadNoteReminderService();
export default leadNoteReminderService;
