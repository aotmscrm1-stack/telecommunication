import React from 'react';
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
  trackLead({ id, name, status, createdBy, hasExistingNote = false }) {
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
      createdBy: createdBy || existing?.createdBy || 'Caller / Staff',
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
   * Displays the styled custom Sonner toast notification with 5-second countdown timeline progress bar and creator name.
   */
  showToast(entry) {
    if (!entry || !entry.id) return;
    const currentUser = getCurrentUser();
    const currentUserName = currentUser?.name || currentUser?.fullName || currentUser?.email;
    const creator = (entry.createdBy && entry.createdBy !== 'Staff' && entry.createdBy !== 'Caller / Staff')
      ? entry.createdBy
      : (currentUserName || entry.createdBy || 'Staff');

    toast.custom(
      (t) =>
        React.createElement(
          'div',
          {
            className:
              'relative overflow-hidden w-full max-w-sm sm:max-w-md bg-white border border-amber-200/90 rounded-2xl shadow-2xl p-4 text-slate-800 flex flex-col gap-2.5 transition-all select-none',
            style: {
              minWidth: '320px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            },
          },
          // Top Row: Icon + Title + Creator Badge + Close Button
          React.createElement(
            'div',
            { className: 'flex items-start justify-between gap-2.5' },
            React.createElement(
              'div',
              { className: 'flex items-start gap-2.5' },
              React.createElement(
                'div',
                {
                  className:
                    'w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 text-base shadow-xs border border-amber-200/60',
                },
                '📝'
              ),
              React.createElement(
                'div',
                null,
                React.createElement(
                  'h4',
                  { className: 'text-xs font-bold text-slate-900 leading-tight' },
                  `Note Required: ${entry.name}`
                ),
                React.createElement(
                  'div',
                  {
                    className:
                      'inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-amber-50 text-amber-800 border border-amber-200/70',
                  },
                  React.createElement('span', { className: 'text-amber-600' }, '👤 Created by:'),
                  React.createElement('span', { className: 'font-semibold text-slate-900' }, creator)
                )
              )
            ),
            React.createElement(
              'button',
              {
                onClick: () => toast.dismiss(t),
                className:
                  'w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors text-xs cursor-pointer',
                title: 'Close',
              },
              '✕'
            )
          ),
          // Middle Row: Description & Status
          React.createElement(
            'p',
            { className: 'text-xs text-slate-600 leading-relaxed pl-10' },
            'Status is ',
            React.createElement(
              'span',
              {
                className:
                  'font-semibold text-amber-800 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200/60',
              },
              `"${entry.status}"`
            ),
            '. Please add a counsellor note for this student.'
          ),
          // Action Row: "Add Note" Button
          React.createElement(
            'div',
            { className: 'flex items-center justify-end gap-2 pt-1 pl-10' },
            React.createElement(
              'button',
              {
                onClick: () => {
                  toast.dismiss(t);
                  window.dispatchEvent(
                    new CustomEvent('open-lead-note-modal', {
                      detail: { leadId: entry.id, leadName: entry.name, status: entry.status },
                    })
                  );
                },
                className:
                  'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-black active:scale-95 transition-all shadow-xs cursor-pointer',
              },
              'Add Note'
            )
          ),
          // Bottom 5-second Progress Bar Timeline
          React.createElement(
            'div',
            {
              className: 'absolute bottom-0 left-0 right-0 h-1 bg-amber-100/70 overflow-hidden',
            },
            React.createElement('div', {
              className: 'h-full bg-amber-500 rounded-full animate-toast-progress-5s',
              style: {
                width: '100%',
                animation: 'toastProgress5s 5000ms linear forwards',
              },
            })
          )
        ),
      {
        id: `note-reminder-${entry.id}`,
        duration: 5000, // 5 seconds display with auto close
      }
    );
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
