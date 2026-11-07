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
 * Determines whether the current user is allowed to view the counsellor note reminder popup:
 * 1. Admin and Manager can see ALL notification popups.
 * 2. The Counsellor who added this summary / who needs to add the note can see it.
 * 3. Remaining employees (other counsellors, developers, trainers, executives) MUST NOT see it.
 */
export function canUserSeeNoteReminder(entry, currentUser = null) {
  if (!entry) return false;
  const user = currentUser || getCurrentStoredUser();
  if (!user) return false;

  // 1. Admin and Manager can see ALL positive summary pop ups (with lead, campaign, and counsellor details)
  if (isAdminOrManager(user)) return true;

  // 2. Specific Counsellor whose account recorded this summary, OR who is assigned to this lead
  const uid = String(user._id || user.id || '').trim();
  const uname = String(user.name || user.displayName || user.fullName || '').trim().toLowerCase();
  const uemail = String(user.email || '').trim().toLowerCase();

  const cId = String(entry.counsellorId || entry.createdById || entry.userId || '').trim();
  const cName = String(entry.counsellorName || entry.createdBy || '').trim().toLowerCase();
  const cEmail = String(entry.counsellorEmail || '').trim().toLowerCase();

  const aId = String(entry.assignedToId || '').trim();
  const aName = String(entry.assignedToName || '').trim().toLowerCase();

  // Match by counsellor ID or assigned counsellor ID
  if (uid && cId && uid === cId) return true;
  if (uid && aId && uid === aId) return true;
  // Match by email
  if (uemail && cEmail && uemail === cEmail) return true;
  // Match by counsellor name or assigned counsellor name
  if (uname && cName && (uname === cName || cName.includes(uname) || uname.includes(cName))) return true;
  if (uname && aName && (uname === aName || aName.includes(uname) || uname.includes(aName))) return true;

  // 3. Other employees who did not record and are not assigned do NOT see it
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
   * Triggers a "Call Back Later" Toast Message (Visible ONLY to Admin, Manager & Assigned Employees)
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

    const isCurrentAdmin = isAdminOrManager(currentUser);
    const finalCounsellorName =
      counsellorName ||
      assignedToName ||
      (!isCurrentAdmin ? (currentUser?.name || currentUser?.displayName || currentUser?.fullName) : null) ||
      existing?.counsellorName ||
      existing?.assignedToName ||
      'Counselor';

    const finalCounsellorId =
      counsellorId ||
      assignedToId ||
      (!isCurrentAdmin ? (currentUser?._id || currentUser?.id) : null) ||
      existing?.counsellorId ||
      existing?.assignedToId;

    const finalCounsellorEmail =
      counsellorEmail ||
      (!isCurrentAdmin ? currentUser?.email : null) ||
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
   * Displays the styled custom Sonner toast notification.
   * Displays for 30 SECONDS so user has plenty of time to read and act.
   * Strictly ONE notification at a time with NO card stacking behind it.
   */
  showToast(entry) {
    if (!entry || !entry.id) return;
    if (!canUserSeeNoteReminder(entry)) return;

    // Clear any active toasts first to guarantee NO double box or stacked cards behind
    toast.dismiss();

    this.activeToastId = entry.id;

    const leadName = entry.name || 'Student';
    let counsellorName = entry.counsellorName || entry.createdBy;
    if (!counsellorName || counsellorName === 'Staff' || counsellorName === 'Caller / Staff' || counsellorName === 'Agent') {
      const curUser = getCurrentStoredUser();
      counsellorName = curUser?.name || curUser?.displayName || curUser?.fullName || 'Counselor';
    }
    const summaryStatus = entry.status || 'Positive';
    const campaignName = entry.campaign || entry.campaignName || '';

    const handleClose = () => {
      toast.dismiss(`note-reminder-${entry.id}`);
      this.onToastClosed(entry.id);
    };

    // Auto-advance to next queued notification after 30 seconds
    if (this.activeToastTimer) clearTimeout(this.activeToastTimer);
    this.activeToastTimer = setTimeout(() => {
      this.onToastClosed(entry.id);
    }, TOAST_DURATION_MS + 200);

    toast.custom(
      (t) =>
        React.createElement(
          'div',
          {
            'data-custom-note-card': 'true',
            className:
              'note-reminder-card relative overflow-hidden w-[370px] max-w-[94vw] bg-white border border-amber-200/90 rounded-2xl shadow-2xl p-4 text-slate-800 flex flex-col gap-2.5 transition-all select-none',
            style: {
              boxShadow: '0 20px 35px -8px rgba(0, 0, 0, 0.18), 0 8px 12px -4px rgba(0, 0, 0, 0.08)',
            },
          },
          // Header: Icon + Title + Close Button
          React.createElement(
            'div',
            { className: 'flex items-start justify-between gap-2.5 pb-2 border-b border-amber-100/70' },
            React.createElement(
              'div',
              { className: 'flex items-center gap-2.5' },
              React.createElement(
                'div',
                {
                  className:
                    'w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 text-base shadow-xs border border-amber-200/60',
                },
                '📝'
              ),
              React.createElement(
                'div',
                null,
                React.createElement(
                  'h4',
                  { className: 'text-xs font-black uppercase tracking-wider text-amber-800 leading-tight' },
                  'Counsellor Note Required'
                ),
                React.createElement(
                  'p',
                  { className: 'text-[10px] text-slate-400 font-medium' },
                  'Positive Call Summary Follow-up'
                )
              )
            ),
            React.createElement(
              'button',
              {
                onClick: handleClose,
                className:
                  'w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors text-xs cursor-pointer',
                title: 'Close',
              },
              '✕'
            )
          ),
          // Body Rows: Lead Name + Counsellor Name + Summary Status
          React.createElement(
            'div',
            { className: 'flex flex-col gap-2 pt-1' },
            // Lead Name Row
            React.createElement(
              'div',
              { className: 'flex items-center justify-between text-xs' },
              React.createElement(
                'span',
                { className: 'text-slate-500 font-medium flex items-center gap-1.5' },
                React.createElement('span', null, '👤'),
                React.createElement('span', null, 'Lead Name:')
              ),
              React.createElement(
                'span',
                {
                  className:
                    'font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200 max-w-[210px] truncate',
                  title: leadName,
                },
                leadName
              )
            ),
            // Counsellor Name Row
            React.createElement(
              'div',
              { className: 'flex items-center justify-between text-xs' },
              React.createElement(
                'span',
                { className: 'text-slate-500 font-medium flex items-center gap-1.5' },
                React.createElement('span', null, '✍️'),
                React.createElement('span', null, 'Counsellor:')
              ),
              React.createElement(
                'span',
                {
                  className:
                    'font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/70 max-w-[210px] truncate',
                  title: counsellorName,
                },
                counsellorName
              )
            ),
            // Campaign Name Row
            campaignName
              ? React.createElement(
                  'div',
                  { className: 'flex items-center justify-between text-xs' },
                  React.createElement(
                    'span',
                    { className: 'text-slate-500 font-medium flex items-center gap-1.5' },
                    React.createElement('span', null, '📢'),
                    React.createElement('span', null, 'Campaign:')
                  ),
                  React.createElement(
                    'span',
                    {
                      className:
                        'font-bold text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200/70 max-w-[210px] truncate',
                      title: campaignName,
                    },
                    campaignName
                  )
                )
              : null,
            // Call Summary Status Row
            React.createElement(
              'div',
              { className: 'flex items-center justify-between text-xs' },
              React.createElement(
                'span',
                { className: 'text-slate-500 font-medium flex items-center gap-1.5' },
                React.createElement('span', null, '📞'),
                React.createElement('span', null, 'Call Summary:')
              ),
              React.createElement(
                'span',
                {
                  className:
                    'font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 max-w-[210px] truncate',
                  title: summaryStatus,
                },
                summaryStatus
              )
            ),
            React.createElement(
              'p',
              { className: 'text-[11px] text-slate-500 italic mt-0.5' },
              `Call summary is "${summaryStatus}". Please record the counsellor note for this student.`
            )
          ),
          // Action Row: "Add Note" Button
          React.createElement(
            'div',
            { className: 'flex items-center justify-end gap-2 pt-1' },
            React.createElement(
              'button',
              {
                onClick: () => {
                  handleClose();
                  // Open Global Add Note Modal directly on screen with full facility to add note
                  window.dispatchEvent(
                    new CustomEvent('open-global-lead-note-modal', {
                      detail: {
                        leadId: entry.id,
                        leadName: leadName,
                        counsellorName: counsellorName,
                        status: summaryStatus,
                        campaign: entry.campaign,
                        isMeta: entry.isMeta,
                      },
                    })
                  );
                  window.dispatchEvent(
                    new CustomEvent('open-lead-note-modal', {
                      detail: { leadId: entry.id, leadName: leadName, status: summaryStatus, openNote: true },
                    })
                  );
                },
                className:
                  'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-black active:scale-95 transition-all shadow-md cursor-pointer',
              },
              '✏️ Add Note'
            )
          ),
          // Bottom 60-second Progress Bar Timeline
          React.createElement(
            'div',
            {
              className: 'absolute bottom-0 left-0 right-0 h-1 bg-amber-100/70 overflow-hidden',
            },
            React.createElement('div', {
              className: 'h-full bg-amber-500 rounded-full animate-toast-progress-60s',
              style: {
                width: '100%',
                animation: 'toastProgress60s 60000ms linear forwards',
              },
            })
          )
        ),
      {
        id: `note-reminder-${entry.id}`,
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
