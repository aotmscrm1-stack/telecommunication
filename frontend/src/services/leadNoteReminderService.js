import React from 'react';
import { toast } from 'sonner';
import { getWebSocketUrl } from './api';

const STORAGE_KEY = 'aotms_note_reminders_pending';
const RESOLVED_LEADS_KEY = 'aotms_resolved_note_leads';
export const REMINDER_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes in milliseconds (600,000 ms) as requested
export const TOAST_DURATION_MS = 60000; // 60 seconds as requested

export function getResolvedLeadsSet() {
  try {
    const raw = localStorage.getItem(RESOLVED_LEADS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch (e) {
    return new Set();
  }
}

export function saveResolvedLeadsSet(set) {
  try {
    const arr = Array.from(set);
    localStorage.setItem(RESOLVED_LEADS_KEY, JSON.stringify(arr));
  } catch (e) {}
}

export function isLeadNoteResolved(id) {
  if (!id) return false;
  return getResolvedLeadsSet().has(String(id));
}

export const POSITIVE_SUB_STATUSES = [
  "Agreed to Office visit's but no luck",
  "Interested/Need time(After few months) waiting for parents approval",
  "office visit's",
  "Demo attended",
  "Demo not attended-Call Back",
  "time issues/Fee issues",
  "Call back/We will Call",
  "Not answering-call back/whats app text"
];

/**
 * Checks if the lead status requires a counsellor note.
 * Matches: "office visit's", "office visits", "office visit", "Demo attended", "demo attended",
 * "Positive", and all positive call outcomes / sub-statuses.
 */
export function isStatusRequiringNote(status) {
  if (!status || typeof status !== 'string') return false;
  const s = status.toLowerCase().trim();
  if (s === 'positive' || s.includes('office visit') || s.includes('demo attended')) return true;
  return POSITIVE_SUB_STATUSES.some(sub => sub.toLowerCase().trim() === s);
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
    const raw = localStorage.getItem('aotms_user') || localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function getCurrentUser() {
  return getCurrentStoredUser();
}

export function isAdminOrManager(user) {
  if (!user) return false;
  const role = String(user.role || '').trim().toLowerCase();
  const d = String(user.designation || '').trim().toUpperCase();
  const dn = String(user.displayName || user.name || '').trim().toUpperCase();

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

/**
 * Strictly only the account that created/triggered the note reminder can see the popup
 * (Even for Admin: only visible if Admin created it)
 */
export function canUserSeeNoteReminder(entry, currentUser = null) {
  if (!entry) return false;
  const user = currentUser || getCurrentStoredUser();
  if (!user) return false;

  const uid = String(user._id || user.id || '').trim();
  const uname = String(user.name || user.displayName || user.fullName || '').trim().toLowerCase();
  const uemail = String(user.email || '').trim().toLowerCase();

  const cId = String(entry.createdById || entry.counsellorId || entry.userId || '').trim();
  const cName = String(entry.createdBy || entry.counsellorName || '').trim().toLowerCase();
  const cEmail = String(entry.counsellorEmail || '').trim().toLowerCase();

  if (uid && cId) return uid === cId;
  if (uemail && cEmail) return uemail === cEmail;
  if (uname && cName && !cId) return uname === cName;

  return false;
}

/**
 * Strictly only the account that requested/created the Call Back Later can see the popup
 * (Even for Admin: only visible if Admin created it)
 */
export function canUserSeeCallbackToast(payload, currentUser = null) {
  if (!payload) return false;
  const user = currentUser || getCurrentStoredUser();
  if (!user) return false;

  const uid = String(user._id || user.id || '').trim();
  if (!uid) return false;

  const creatorId = String(payload.filledById || payload.createdById || '').trim();
  if (creatorId) {
    return creatorId === uid;
  }
  return false;
}

class LeadNoteReminderService {
  constructor() {
    this.intervalId = null;
    this.initialized = false;
    this.ws = null;
    this.recentToastIds = new Set();
    this.activeToastId = null;
    this.toastQueue = []; // Sequential queue so notifications appear one after one
    this.activeToastTimer = null;
  }

  /**
   * Initialize background timer & WebSocket listener for Call Back Later and Note Reminders
   */
  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Sanitize any existing reminders in localStorage from previous versions
    try {
      const stored = getStoredReminders();
      const resolvedSet = getResolvedLeadsSet();
      const curUser = getCurrentStoredUser();
      const currentUserName = curUser?.name || curUser?.displayName || curUser?.fullName;
      let hasChanges = false;
      for (const k of Object.keys(stored)) {
        if (resolvedSet.has(String(k))) {
          delete stored[k];
          hasChanges = true;
          continue;
        }
        if (!stored[k].counsellorName || stored[k].counsellorName === 'Staff' || stored[k].createdBy === 'Staff') {
          stored[k].counsellorName = currentUserName || 'Counselor';
          stored[k].createdBy = stored[k].counsellorName;
          hasChanges = true;
        }
      }
      if (hasChanges) saveStoredReminders(stored);
    } catch (_) {}

    this.connectWebSocket();

    // Check every 10 seconds
    this.intervalId = setInterval(() => {
      this.checkAndTriggerPendingReminders();
      this.checkAndTriggerDueCallbacks();
    }, 10000);
  }

  connectWebSocket() {
    try {
      if (this.wsReconnectTimer) {
        clearTimeout(this.wsReconnectTimer);
        this.wsReconnectTimer = null;
      }
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return;
      }

      const wsUrl = getWebSocketUrl();

      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'callback:scheduled' && msg.payload) {
            this.triggerCallbackToast(msg.payload, { isImmediate: true });
          }
          if (msg.event === 'lead_note:reminder_needed' && msg.payload) {
            if (canUserSeeNoteReminder(msg.payload)) {
              this.trackLead({
                ...msg.payload,
                isRemoteBroadcast: true,
              });
            }
          }
          if (msg.event === 'lead_note:reminder_resolved' && msg.payload) {
            this.resolveLead(msg.payload.id || msg.payload.leadId, msg.payload.name || msg.payload.leadName);
          }
        } catch (_) {}
      };

      ws.onerror = () => {
        try { ws.close(); } catch (_) {}
      };

      ws.onclose = () => {
        this.ws = null;
        if (this.initialized) {
          this.wsReconnectTimer = setTimeout(() => this.connectWebSocket(), 30000);
        }
      };
    } catch (_) {}
  }

  broadcastWebSocketMessage(event, payload) {
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ event, payload }));
      }
    } catch (_) {}
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ws) {
      const socket = this.ws;
      this.ws = null;
      if (socket.readyState === WebSocket.OPEN) {
        try { socket.close(); } catch (_) {}
      } else if (socket.readyState === WebSocket.CONNECTING) {
        socket.onopen = () => { try { socket.close(); } catch (_) {} };
        socket.onerror = () => {};
        socket.onclose = () => {};
      }
    }
    if (this.activeToastTimer) {
      clearTimeout(this.activeToastTimer);
      this.activeToastTimer = null;
    }
    this.toastQueue = [];
    this.activeToastId = null;
    this.initialized = false;
  }

  /**
   * Triggers a "Call Back Later" Small Down-Corner Toast Message
   * Visible ONLY to the exact account that created/requested the Call Back Later (even for Admin)
   */
  triggerCallbackToast(payload, { isImmediate = true, isDueAlert = false } = {}) {
    if (!payload) return;
    if (!canUserSeeCallbackToast(payload)) return;

    const dedupeKey = `${payload.followupId || payload.leadId}-${isDueAlert ? 'due' : 'sched'}`;
    if (this.recentToastIds.has(dedupeKey)) return;
    this.recentToastIds.add(dedupeKey);
    setTimeout(() => this.recentToastIds.delete(dedupeKey), 6000);

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
    const schedStr = payload.scheduledAt
      ? new Date(payload.scheduledAt).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    const toastId = `callback-toast-${dedupeKey}`;
    const handleClose = () => toast.dismiss(toastId);

    toast.custom(
      () =>
        React.createElement(
          'div',
          {
            className:
              'w-[265px] max-w-[88vw] bg-white border border-sky-200 rounded-xl shadow-lg p-3 text-slate-800 flex flex-col gap-2 select-none',
          },
          React.createElement(
            'div',
            { className: 'flex items-center justify-between gap-2' },
            React.createElement(
              'span',
              { className: 'text-[11px] font-bold text-sky-700 flex items-center gap-1' },
              React.createElement('span', null, '⏰'),
              React.createElement('span', null, isDueAlert ? 'Call Back Due Now' : 'Call Back Later')
            ),
            React.createElement(
              'button',
              {
                onClick: handleClose,
                className: 'text-slate-400 hover:text-slate-700 text-xs cursor-pointer leading-none',
                title: 'Close',
              },
              '✕'
            )
          ),
          React.createElement(
            'div',
            { className: 'flex items-center justify-between gap-2' },
            React.createElement(
              'div',
              { className: 'min-w-0 flex-1' },
              React.createElement(
                'div',
                { className: 'text-xs font-bold text-slate-900 truncate', title: personName },
                `👤 ${personName}`
              ),
              schedStr
                ? React.createElement(
                    'div',
                    { className: 'text-[10.5px] text-slate-500 truncate mt-0.5' },
                    `🕒 ${schedStr}`
                  )
                : null
            ),
            React.createElement(
              'button',
              {
                onClick: () => {
                  handleClose();
                  const targetLeadId = payload.metaLeadId || payload.leadId;
                  window.dispatchEvent(
                    new CustomEvent('redirect-to-lead-note', {
                      detail: {
                        leadId: targetLeadId,
                        campaign: payload.campaign || '',
                        isMeta: Boolean(payload.metaLeadId || payload.campaign),
                      },
                    })
                  );
                },
                className:
                  'px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors cursor-pointer shrink-0',
              },
              '✏️ Add Note'
            )
          )
        ),
      {
        id: toastId,
        position: 'bottom-right',
        duration: 15000,
        unstyled: true,
        className: '!p-0 !bg-transparent !border-0 !shadow-none !m-0 !w-auto',
      }
    );
  }

  checkAndTriggerDueCallbacks() {
    const callbacks = getStoredCallbacks();
    const keys = Object.keys(callbacks);
    if (keys.length === 0) return;

    const now = Date.now();
    let changed = false;

    for (const key of keys) {
      const item = callbacks[key];
      if (!item || item.dueNotified || !canUserSeeCallbackToast(item)) {
        delete callbacks[key];
        changed = true;
        continue;
      }
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
   * Enqueues a lead reminder so popups appear ONE AFTER ONE (never stacked or running behind another)
   */
  enqueueToast(entry) {
    if (!entry || !entry.id) return;
    if (!canUserSeeNoteReminder(entry)) return;

    // Avoid duplicate queued items
    if (this.activeToastId === entry.id) return;
    if (this.toastQueue.some(item => item.id === entry.id)) return;

    this.toastQueue.push(entry);
    this.processQueue();
  }

  processQueue() {
    // If a notification is currently showing on screen, wait until it closes (one after one)
    if (this.activeToastId !== null) return;
    if (this.toastQueue.length === 0) return;

    const nextEntry = this.toastQueue.shift();
    this.showToast(nextEntry);
  }

  onToastClosed(id) {
    if (this.activeToastId === id) {
      if (this.activeToastTimer) {
        clearTimeout(this.activeToastTimer);
        this.activeToastTimer = null;
      }
      this.activeToastId = null;

      // Small pause of 600ms before presenting next queued notification
      setTimeout(() => {
        this.processQueue();
      }, 600);
    }
  }

  /**
   * Tracks a lead when their status is set to a positive call summary (office visit's, Demo attended, Positive, etc.).
   * If they don't have a note, shows the notification popup to authorized users (Admin, Manager, and the Counsellor).
   */
  trackLead({
    id,
    name,
    status,
    createdBy,
    createdById,
    counsellorName,
    counsellorId,
    counsellorEmail,
    assignedToId,
    assignedToName,
    campaign,
    isMeta = false,
    hasExistingNote = false,
    isRemoteBroadcast = false,
  }) {
    if (!id) return;
    const strId = String(id);

    // If note is already added or marked resolved, DO NOT track and DO NOT popup again
    const resolvedSet = getResolvedLeadsSet();
    if (resolvedSet.has(strId)) {
      return;
    }

    if (!isStatusRequiringNote(status)) {
      this.resolveLead(id, name);
      return;
    }

    if (hasExistingNote) {
      this.resolveLead(id, name);
      return;
    }

    const reminders = getStoredReminders();
    const existing = reminders[strId];
    const now = Date.now();
    const currentUser = getCurrentStoredUser();

    const finalCounsellorName =
      counsellorName ||
      createdBy ||
      (!isRemoteBroadcast ? (currentUser?.name || currentUser?.displayName || currentUser?.fullName) : null) ||
      existing?.counsellorName ||
      'Counselor';

    const finalCounsellorId =
      createdById ||
      counsellorId ||
      (!isRemoteBroadcast ? (currentUser?._id || currentUser?.id) : null) ||
      existing?.counsellorId;

    const finalCounsellorEmail =
      counsellorEmail ||
      (!isRemoteBroadcast ? currentUser?.email : null) ||
      existing?.counsellorEmail;

    reminders[strId] = {
      id: strId,
      name: name || existing?.name || 'Student',
      status: status || existing?.status || 'Positive',
      counsellorName: finalCounsellorName,
      counsellorId: finalCounsellorId,
      counsellorEmail: finalCounsellorEmail,
      createdBy: finalCounsellorName,
      createdById: finalCounsellorId,
      assignedToId: assignedToId || existing?.assignedToId,
      assignedToName: assignedToName || existing?.assignedToName,
      campaign: campaign || existing?.campaign,
      isMeta: Boolean(isMeta || existing?.isMeta),
      registeredAt: existing?.registeredAt || now,
      lastRemindedAt: now,
    };
    saveStoredReminders(reminders);

    // Queue reminder so it displays one after one
    if (canUserSeeNoteReminder(reminders[strId])) {
      this.enqueueToast(reminders[strId]);
    }

    // Broadcast across WebSocket to keep Admin & Manager notified in real-time
    if (!isRemoteBroadcast) {
      this.broadcastWebSocketMessage('lead_note:reminder_needed', reminders[id]);
    }
  }

  /**
   * Called when a note is added for the lead.
   * Cancels the reminders and dismisses the alert.
   */
  resolveLead(id, name) {
    if (!id) return;
    const strId = String(id);

    // Persistently mark lead as resolved so popup NEVER appears again
    const resolvedSet = getResolvedLeadsSet();
    resolvedSet.add(strId);
    saveResolvedLeadsSet(resolvedSet);

    const reminders = getStoredReminders();
    const reminderItem = reminders[strId];
    if (reminderItem) {
      const leadName = name || reminderItem.name || 'Lead';
      delete reminders[strId];
      saveStoredReminders(reminders);

      // Remove from queue if pending
      this.toastQueue = this.toastQueue.filter(item => String(item.id) !== strId);

      // Dismiss active reminder toast
      toast.dismiss(`note-reminder-${strId}`);
      this.onToastClosed(strId);

      // Show confirmation toast only to users authorized to see this reminder
      if (canUserSeeNoteReminder(reminderItem)) {
        toast.success(`Note added for ${leadName}`, {
          description: 'Counsellor note reminders have been stopped.',
          duration: 4000,
        });
      }

      this.broadcastWebSocketMessage('lead_note:reminder_resolved', { id: strId, name: leadName });
    } else {
      this.toastQueue = this.toastQueue.filter(item => String(item.id) !== strId);
      toast.dismiss(`note-reminder-${strId}`);
      this.onToastClosed(strId);
      this.broadcastWebSocketMessage('lead_note:reminder_resolved', { id: strId, name: name || 'Lead' });
    }
  }

  /**
   * Displays a small, simple bottom-right toast container.
   * Clicking "Add Note" redirects directly to the Lead.
   */
  showToast(entry) {
    if (!entry || !entry.id) return;
    if (!canUserSeeNoteReminder(entry)) return;

    toast.dismiss();
    this.activeToastId = entry.id;

    const leadName = entry.name || 'Student';
    const summaryStatus = entry.status || 'Call Back Later';

    const handleClose = () => {
      toast.dismiss(`note-reminder-${entry.id}`);
      this.onToastClosed(entry.id);
    };

    if (this.activeToastTimer) clearTimeout(this.activeToastTimer);
    this.activeToastTimer = setTimeout(() => {
      this.onToastClosed(entry.id);
    }, TOAST_DURATION_MS + 200);

    toast.custom(
      () =>
        React.createElement(
          'div',
          {
            'data-custom-note-card': 'true',
            className:
              'note-reminder-card relative overflow-hidden w-[265px] max-w-[88vw] bg-white border border-amber-200 rounded-xl shadow-lg p-3 text-slate-800 flex flex-col gap-2 transition-all select-none',
          },
          React.createElement(
            'div',
            { className: 'flex items-center justify-between gap-2' },
            React.createElement(
              'span',
              { className: 'text-[11px] font-bold text-amber-700 flex items-center gap-1' },
              React.createElement('span', null, '📝'),
              React.createElement('span', null, 'Call Back / Note Reminder')
            ),
            React.createElement(
              'button',
              {
                onClick: handleClose,
                className: 'text-slate-400 hover:text-slate-700 text-xs cursor-pointer leading-none',
                title: 'Close',
              },
              '✕'
            )
          ),
          React.createElement(
            'div',
            { className: 'flex items-center justify-between gap-2' },
            React.createElement(
              'div',
              { className: 'min-w-0 flex-1' },
              React.createElement(
                'div',
                { className: 'text-xs font-bold text-slate-900 truncate', title: leadName },
                `👤 ${leadName}`
              ),
              React.createElement(
                'div',
                { className: 'text-[10.5px] text-slate-500 truncate mt-0.5', title: summaryStatus },
                `📞 ${summaryStatus}`
              )
            ),
            React.createElement(
              'button',
              {
                onClick: () => {
                  handleClose();
                  window.dispatchEvent(
                    new CustomEvent('redirect-to-lead-note', {
                      detail: {
                        leadId: entry.id,
                        leadName: leadName,
                        status: summaryStatus,
                        campaign: entry.campaign,
                        isMeta: entry.isMeta,
                      },
                    })
                  );
                },
                className:
                  'px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors cursor-pointer shrink-0',
              },
              '✏️ Add Note'
            )
          )
        ),
      {
        id: `note-reminder-${entry.id}`,
        position: 'bottom-right',
        duration: TOAST_DURATION_MS,
        unstyled: true,
        className: '!p-0 !bg-transparent !border-0 !shadow-none !m-0 !w-auto note-reminder-sonner-toast',
        onDismiss: () => this.onToastClosed(entry.id),
        onAutoClose: () => this.onToastClosed(entry.id),
      }
    );
  }

  /**
   * Periodic check: queues reminders every 5 minutes if note is still pending.
   * Reminders show one after one without overlap.
   */
  checkAndTriggerPendingReminders() {
    const reminders = getStoredReminders();
    const keys = Object.keys(reminders);
    if (keys.length === 0) return;

    const resolvedSet = getResolvedLeadsSet();
    const now = Date.now();
    let hasChanges = false;

    for (const id of keys) {
      if (resolvedSet.has(String(id))) {
        delete reminders[id];
        hasChanges = true;
        continue;
      }
      const item = reminders[id];
      if (!item) continue;
      // Do not trigger reminders for users who lack permission
      if (!canUserSeeNoteReminder(item)) continue;

      const elapsed = now - (item.lastRemindedAt || item.registeredAt || 0);

      if (elapsed >= REMINDER_INTERVAL_MS) {
        this.enqueueToast(item);
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
