import React from 'react';
import { toast } from 'sonner';
import api, { getWebSocketUrl } from './api';

const STORAGE_KEY = 'aotms_note_reminders_pending';
const RESOLVED_LEADS_KEY = 'aotms_resolved_note_leads';
export const REMINDER_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes in milliseconds (600,000 ms) as requested
export const TOAST_DURATION_MS = 60000; // 60 seconds as requested

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;
const STATUS_LOG_RE = /^status\s+(changed|updated)/i;
// `displayName` and legacy note/call records frequently store a role label
// ("Managing Director", "Telecaller Councellor", "Counsellor") instead of the
// person's real name, so such a value must never be shown as the counsellor name.
const ROLE_WORDS = new Set([
  'md', 'admin', 'administrator', 'ceo', 'cto', 'coo', 'manager', 'managers',
  'managing', 'director', 'counsellor', 'councellor', 'counselor',
  'counsellors', 'councellors', 'counselors',
  'telecaller', 'telecallers', 'tele', 'caller', 'callers',
  'staff', 'member', 'agent', 'agents', 'employee', 'executive',
  'hr', 'sr', 'jr', 'senior', 'junior', 'team', 'support',
]);

/**
 * A value made only out of role words is a designation, not a person.
 */
export function isRoleLabel(value) {
  const words = String(value || '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
  if (!words.length) return true;
  return words.every(word => ROLE_WORDS.has(word));
}

/**
 * Returns a real person's name and suppresses role labels / empty values.
 * Accepts an object ({ name, displayName }), a plain string or nothing.
 */
export function personDisplayName(person) {
  if (!person) return '';
  if (typeof person === 'string') {
    const str = person.trim();
    return !str || OBJECT_ID_RE.test(str) || isRoleLabel(str) ? '' : str;
  }
  const name = String(person.name || person.fullName || '').trim();
  if (name && !OBJECT_ID_RE.test(name) && !isRoleLabel(name)) return name;
  const dn = String(person.displayName || '').trim();
  if (dn && !OBJECT_ID_RE.test(dn) && !isRoleLabel(dn)) return dn;
  return '';
}

/**
 * Campaigns arrive as a populated { name } object, a plain name, or a raw Mongo
 * ObjectId when the API response was not populated. Only a readable campaign
 * name is ever returned - never an ObjectId, "undefined" or "null".
 */
export function normalizeCampaignName(value) {
  if (!value) return '';
  if (typeof value === 'object') {
    return normalizeCampaignName(value.name || value.campaignName || value.title || value.label);
  }
  const str = String(value).trim();
  if (!str || OBJECT_ID_RE.test(str) || /^(undefined|null|nan)$/i.test(str)) return '';
  return str;
}

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
  "Call back/We will Call"
];

// The call never connected. It is NOT a positive call summary any more, but it is
// still listed here on purpose so the 10-minute follow-up reminder keeps firing.
export const CALL_NOT_ANSWERING_SUB_STATUSES = [
  "Not answering-call back/whats app text"
];

/**
 * Checks if the lead status requires a counsellor note.
 * Matches: "office visit's", "office visits", "office visit", "Demo attended", "demo attended",
 * "Positive", all positive call outcomes / sub-statuses, and the call-not-answering outcome.
 */
export function isStatusRequiringNote(status) {
  if (!status || typeof status !== 'string') return false;
  const s = status.toLowerCase().trim();
  if (s === 'positive' || s === 'call not answering' || s.includes('office visit') || s.includes('demo attended')) return true;
  return POSITIVE_SUB_STATUSES.some(sub => sub.toLowerCase().trim() === s)
    || CALL_NOT_ANSWERING_SUB_STATUSES.some(sub => sub.toLowerCase().trim() === s);
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
 * Admins / Directors / CXOs only watch the pipeline - they never make the calls,
 * so their own name must never be stamped on a call-summary reminder.
 * Managers are NOT excluded here: several managers also work leads as counsellors.
 */
export function isExecutiveOnly(user) {
  if (!user) return false;
  const role = String(user.role || '').trim().toLowerCase();
  const d = String(user.designation || '').trim().toUpperCase();

  if (role === 'admin' || role === 'superadmin') return true;
  return (
    d === 'ADMIN' ||
    d === 'ADMINISTRATOR' ||
    d === 'MD' ||
    d.includes('MANAGING DIRECTOR') ||
    d === 'CEO' ||
    d === 'CTO'
  );
}

/**
 * Resolves the counsellor who actually kept the call summary / note for a lead,
 * plus the lead's real campaign name. Used by every place that tracks a reminder
 * so the popup always shows (and notifies) the correct counsellor.
 *
 * Priority for the counsellor:
 *   1. the viewer, when preferViewer is set and the viewer is a counsellor
 *   2. the person who made the latest call-summary change on the lead
 *      (status change, call log or note - newest first)
 *   3. the lead's assigned counsellor
 *   4. the viewer (only when allowed and not an Admin/Executive)
 */
export function resolveLeadReminderContext(lead, {
  currentUser = null,
  campaignFallback = '',
  preferViewer = false,
  allowViewerFallback = true,
} = {}) {
  const viewer = currentUser || getCurrentStoredUser();
  const viewerIsCounsellor = Boolean(viewer) && !isExecutiveOnly(viewer);
  const viewerId = String(viewer?._id || viewer?.id || '').trim();
  const viewerIdentity = viewerIsCounsellor
    ? {
        id: viewerId,
        name: personDisplayName(viewer),
        email: String(viewer.email || '').trim(),
      }
    : null;

  const campaignName =
    normalizeCampaignName(lead?.campaign) ||
    normalizeCampaignName(lead?.campaignName) ||
    normalizeCampaignName(campaignFallback);

  // Everyone who touched the call summary, newest first. `status_change` counts:
  // picking a Positive sub-status IS the call summary update the reminder is for,
  // and it is the only trace that exists before the demo note is written.
  const authors = [];
  if (Array.isArray(lead?.callNotes)) {
    lead.callNotes.forEach(cn => {
      if (!cn) return;
      const isStatusLog = String(cn.outcome || '').toLowerCase() === 'status_change';
      const text = String(cn.note || '').trim();
      // Status-change entries never show as notes, but they do tell us who made the
      // call-summary change.
      if (!isStatusLog && (!text || STATUS_LOG_RE.test(text))) return;
      authors.push({
        id: String(cn.user?._id || cn.user || '').trim(),
        name: personDisplayName(cn.user) || personDisplayName(cn.userName),
        email: String(cn.user?.email || cn.userEmail || '').trim(),
        at: new Date(cn.date || 0).getTime(),
      });
    });
  }
  if (Array.isArray(lead?.activities)) {
    lead.activities.forEach(a => {
      if (!a) return;
      const type = String(a.type || '').toLowerCase();
      if (type !== 'note' && type !== 'call' && type !== 'status_change') return;
      const text = String(a.description || a.note || '').trim();
      if (type !== 'status_change' && (!text || STATUS_LOG_RE.test(text))) return;
      const performer = a.performedBy && typeof a.performedBy === 'object' ? a.performedBy : null;
      authors.push({
        id: String(performer?._id || a.performedBy || '').trim(),
        name: personDisplayName(performer) || personDisplayName(a.performedByName) || personDisplayName(a.userName),
        email: String(performer?.email || '').trim(),
        at: new Date(a.createdAt || 0).getTime(),
      });
    });
  }
  authors.sort((a, b) => b.at - a.at);
  // An admin/executive's own change is never the counsellor of the reminder.
  const author = authors.find(a => {
    if (!a.id && !a.name) return false;
    if (!viewerIsCounsellor && viewerId && a.id && a.id === viewerId) return false;
    return true;
  }) || null;

  const assigned = lead?.assignedTo && typeof lead.assignedTo === 'object' ? lead.assignedTo : null;
  const assignedToId = String(assigned?._id || (typeof lead?.assignedTo === 'string' ? lead.assignedTo : '') || '').trim();
  const assignedToName = personDisplayName(assigned) || personDisplayName(lead?.assignedToName);

  let chosen = null;
  if (preferViewer && viewerIdentity) chosen = viewerIdentity;
  if (!chosen && author) chosen = author;
  if (!chosen && (assignedToId || assignedToName)) {
    chosen = { id: assignedToId, name: assignedToName, email: String(assigned?.email || '').trim() };
  }
  if (!chosen && allowViewerFallback) chosen = viewerIdentity;

  return {
    counsellorId: chosen?.id || '',
    counsellorName: chosen?.name || assignedToName || '',
    counsellorEmail: chosen?.email || '',
    assignedToId,
    assignedToName,
    campaignName,
  };
}

/**
 * Visible to Admin and the respective counsellor
 */
export function canUserSeeNoteReminder(entry, currentUser = null) {
  if (!entry) return false;
  const user = currentUser || getCurrentStoredUser();
  if (!user) return false;

  // 1. Admin always has full visibility
  if (isAdminOrManager(user)) return true;

  const uid = String(user._id || user.id || '').trim();
  const uname = String(user.name || user.displayName || user.fullName || '').trim().toLowerCase();
  const uemail = String(user.email || '').trim().toLowerCase();

  // 2. Respective counsellor
  const cId = String(entry.createdById || entry.counsellorId || entry.userId || entry.assignedToId || '').trim();
  const cName = String(entry.createdBy || entry.counsellorName || entry.assignedToName || '').trim().toLowerCase();
  const cEmail = String(entry.counsellorEmail || '').trim().toLowerCase();

  if (uid && cId && uid === cId) return true;
  if (uemail && cEmail && uemail === cEmail) return true;
  if (uname && cName && (uname === cName || uname.includes(cName) || cName.includes(uname))) return true;

  return false;
}

/**
 * Visible to Admin and the respective counsellor
 */
export function canUserSeeCallbackToast(payload, currentUser = null) {
  if (!payload) return false;
  const user = currentUser || getCurrentStoredUser();
  if (!user) return false;

  // 1. Admin always has full visibility
  if (isAdminOrManager(user)) return true;

  const uid = String(user._id || user.id || '').trim();
  if (!uid) return false;

  // 2. Respective counsellor (creator, assigned counsellor, or campaign-assigned counsellor)
  const creatorId = String(payload.filledById || payload.createdById || payload.createdBy?._id || payload.createdBy || '').trim();
  if (creatorId && creatorId === uid) return true;

  const assignedToId = String(payload.assignedToId || payload.assignedTo?._id || payload.assignedTo || '').trim();
  if (assignedToId && assignedToId === uid) return true;

  const counsellorId = String(payload.counsellorId || payload.userId || '').trim();
  if (counsellorId && counsellorId === uid) return true;

  if (Array.isArray(payload.campaignAssignedUserIds) && payload.campaignAssignedUserIds.map(String).includes(uid)) {
    return true;
  }

  // Name fallback if IDs are missing
  const uname = String(user.name || user.displayName || user.fullName || '').trim().toLowerCase();
  const cName = String(payload.counsellorName || payload.filledByName || payload.assignedToName || '').trim().toLowerCase();
  if (uname && cName && (uname === cName || uname.includes(cName) || cName.includes(uname))) {
    return true;
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
      const curUserId = String(curUser?._id || curUser?.id || '').trim();
      const curUserIsExec = isExecutiveOnly(curUser);
      let hasChanges = false;
      for (const k of Object.keys(stored)) {
        if (resolvedSet.has(String(k))) {
          delete stored[k];
          hasChanges = true;
          continue;
        }
        // Entries that were wrongly stamped with the watching admin's own name are
        // reassigned to the lead's counsellor instead of showing the admin.
        const entryId = String(stored[k].counsellorId || stored[k].createdById || '').trim();
        if (curUserIsExec && curUserId && entryId === curUserId) {
          const assigneeName = personDisplayName(stored[k].assignedToName);
          stored[k].counsellorName = assigneeName || 'Counsellor';
          stored[k].createdBy = stored[k].counsellorName;
          stored[k].counsellorId = String(stored[k].assignedToId || '');
          hasChanges = true;
          continue;
        }
        // Same guard for entries that only carry the watching admin's *name*.
        const ownName = curUserIsExec ? personDisplayName(curUser).toLowerCase() : '';
        const storedName = (
          personDisplayName(stored[k].counsellorName) || personDisplayName(stored[k].createdBy)
        ).toLowerCase();
        if (ownName && storedName && ownName === storedName) {
          const assigneeName = personDisplayName(stored[k].assignedToName);
          stored[k].counsellorName = assigneeName || 'Counsellor';
          stored[k].createdBy = stored[k].counsellorName;
          stored[k].counsellorId = String(stored[k].assignedToId || '');
          hasChanges = true;
          continue;
        }
        const safeName =
          personDisplayName(stored[k].counsellorName) ||
          personDisplayName(stored[k].createdBy) ||
          personDisplayName(stored[k].assignedToName);
        const safeCampaign = normalizeCampaignName(stored[k].campaign);
        if (safeName !== String(stored[k].counsellorName || '') || safeCampaign !== String(stored[k].campaign || '')) {
          stored[k].counsellorName =
            safeName || (isAdminOrManager(curUser) ? 'Counsellor' : personDisplayName(curUser) || 'Counsellor');
          stored[k].createdBy = stored[k].counsellorName;
          if (!stored[k].counsellorId && stored[k].assignedToId) stored[k].counsellorId = stored[k].assignedToId;
          stored[k].campaign = safeCampaign;
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
    const counsellorName = payload.counsellorName || payload.filledByName || payload.assignedToName || 'Counsellor';
    const campaignName = payload.campaign && payload.campaign !== 'undefined' ? String(payload.campaign).trim() : '';

    const toastId = `callback-toast-${dedupeKey}`;
    const handleClose = () => toast.dismiss(toastId);

    toast.custom(
      () =>
        React.createElement(
          'div',
          {
            className:
              'w-[310px] max-w-[92vw] bg-white border border-sky-200/90 rounded-2xl shadow-xl p-3 text-slate-800 flex flex-col gap-2 select-none font-sans',
          },
          React.createElement(
            'div',
            { className: 'flex items-center justify-between gap-2 border-b border-sky-100/70 pb-1.5' },
            React.createElement(
              'span',
              { className: 'text-[11.5px] font-bold text-sky-700 flex items-center gap-1.5' },
              React.createElement('span', null, '⏰'),
              React.createElement('span', null, isDueAlert ? 'Call Back Due Now' : 'Call Back Later')
            ),
            React.createElement(
              'button',
              {
                onClick: handleClose,
                className: 'text-slate-400 hover:text-slate-700 text-xs cursor-pointer leading-none p-0.5 rounded hover:bg-slate-100 transition-colors',
                title: 'Close',
              },
              '✕'
            )
          ),
          React.createElement(
            'div',
            { className: 'flex items-center justify-between gap-2.5' },
            React.createElement(
              'div',
              { className: 'min-w-0 flex-1 flex flex-col gap-0.5' },
              React.createElement(
                'div',
                { className: 'text-[12px] font-bold text-slate-900 truncate', title: personName },
                `👤 ${personName}`
              ),
              schedStr
                ? React.createElement(
                    'div',
                    { className: 'text-[10px] text-slate-500 truncate' },
                    `🕒 ${schedStr}`
                  )
                : null,
              React.createElement(
                'div',
                { className: 'text-[10px] text-slate-600 truncate flex items-center gap-1', title: `Counsellor: ${counsellorName}` },
                React.createElement('span', null, '🎯'),
                React.createElement('span', { className: 'text-slate-500 font-medium' }, 'Counsellor:'),
                React.createElement('span', { className: 'font-semibold text-slate-800 truncate' }, counsellorName)
              ),
              React.createElement(
                'div',
                { className: 'text-[10px] text-slate-600 truncate flex items-center gap-1', title: `Campaign: ${campaignName || 'Direct'}` },
                React.createElement('span', null, '📢'),
                React.createElement('span', { className: 'text-slate-500 font-medium' }, 'Campaign:'),
                React.createElement(
                  'span',
                  { className: campaignName ? 'font-semibold text-sky-800 bg-sky-50 px-1 py-0.2 rounded border border-sky-100/80 truncate' : 'italic text-slate-500 truncate' },
                  campaignName || 'Direct'
                )
              )
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
                  'px-3 py-1.5 rounded-xl text-[11px] font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-xs transition-all cursor-pointer shrink-0 self-center active:scale-95 flex items-center gap-1',
              },
              React.createElement('span', null, '✏️'),
              React.createElement('span', null, 'Add Note')
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
    campaignName,
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
    const viewerIsPrivileged = isExecutiveOnly(currentUser);

    // Never stamp the popup with the acting Admin/Director (their displayName is a
    // role label such as "Managing Director") - the reminder belongs to the
    // counsellor who actually kept the call summary.
    const existingName = personDisplayName(existing?.counsellorName) || personDisplayName(existing?.createdBy);
    const existingId = String(existing?.counsellorId || existing?.createdById || '').trim();
    const viewerName = viewerIsPrivileged ? '' : personDisplayName(currentUser);
    const viewerId = viewerIsPrivileged ? '' : String(currentUser?._id || currentUser?.id || '').trim();

    // A watching admin (e.g. the Managing Director) must never end up in the
    // counsellor slot - not even through a stale entry left in localStorage.
    const ownName = personDisplayName(currentUser);
    const ownId = String(currentUser?._id || currentUser?.id || '').trim();
    const existingIsSelf =
      Boolean(viewerIsPrivileged) &&
      ((ownId && existingId && existingId === ownId) ||
        (ownName && existingName && existingName.toLowerCase() === ownName.toLowerCase()));
    const safeExistingName = existingIsSelf ? '' : existingName;
    const safeExistingId = existingIsSelf ? '' : existingId;

    const finalCounsellorName =
      personDisplayName(counsellorName) ||
      personDisplayName(createdBy) ||
      safeExistingName ||
      personDisplayName(assignedToName) ||
      personDisplayName(existing?.assignedToName) ||
      viewerName ||
      'Counsellor';

    const finalCounsellorId =
      String(createdById || counsellorId || '').trim() ||
      safeExistingId ||
      viewerId;

    const finalCounsellorEmail =
      String(counsellorEmail || '').trim() ||
      String(existing?.counsellorEmail || '').trim() ||
      (viewerId ? String(currentUser?.email || '').trim() : '');

    const finalCampaign =
      normalizeCampaignName(campaign) ||
      normalizeCampaignName(campaignName) ||
      normalizeCampaignName(existing?.campaign);

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
      campaign: finalCampaign,
      isMeta: Boolean(isMeta || existing?.isMeta),
      registeredAt: existing?.registeredAt || now,
      lastRemindedAt: now,
    };
    saveStoredReminders(reminders);

    // Queue reminder so it displays one after one
    if (canUserSeeNoteReminder(reminders[strId])) {
      this.enqueueToast(reminders[strId]);
    }

    // Broadcast across WebSocket to keep Admin & the counsellor notified in real-time
    if (!isRemoteBroadcast) {
      this.broadcastWebSocketMessage('lead_note:reminder_needed', reminders[strId]);
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
   * The server knows the real user records, so the reminder identity is always
   * re-confirmed right before the popup is shown. That way a stale/guessed name
   * stored in the browser (for example the watching admin's own name) can never
   * be displayed to anybody.
   */
  async refreshReminderContext(entry) {
    if (!entry || !entry.id) return entry;
    try {
      const res = await api.get(`/leads/${entry.id}/reminder-context`);
      const data = res?.data;
      if (!data || data.success === false) return entry;

      // No trace of an owner on the server: keep this counsellor's own reminder
      // intact instead of replacing it with a generic label.
      const serverHasOwner = Boolean(String(data.counsellorId || data.assignedToId || '').trim());
      if (!serverHasOwner) {
        const viewer = getCurrentStoredUser();
        if (viewer && !isAdminOrManager(viewer)) return entry;
      }

      const serverName = personDisplayName(data.counsellorName);
      const assignedToName = personDisplayName(data.assignedToName);
      const campaignName = normalizeCampaignName(data.campaignName);

      entry.counsellorName = serverName || assignedToName || 'Counsellor';
      entry.createdBy = entry.counsellorName;
      entry.counsellorId = String(data.counsellorId || data.assignedToId || entry.counsellorId || '').trim();
      entry.createdById = entry.counsellorId;
      entry.counsellorEmail = String(data.counsellorEmail || entry.counsellorEmail || '').trim();
      entry.assignedToId = String(data.assignedToId || entry.assignedToId || '').trim();
      entry.assignedToName = assignedToName || personDisplayName(entry.assignedToName) || '';
      if (campaignName) entry.campaign = campaignName;
      const serverLeadName = String(data.name || '').trim();
      if (serverLeadName) entry.name = serverLeadName;
      if (data.isMeta) entry.isMeta = true;

      const reminders = getStoredReminders();
      if (reminders[String(entry.id)]) {
        reminders[String(entry.id)] = { ...reminders[String(entry.id)], ...entry };
        saveStoredReminders(reminders);
      }
      this.toastQueue = this.toastQueue.map(item =>
        String(item.id) === String(entry.id) ? { ...item, ...entry } : item
      );
    } catch (_) {
      // Offline / API hiccup: keep whatever we already had.
    }
    return entry;
  }

  /**
   * Displays a small, simple bottom-right toast container.
   * Clicking "Add Note" redirects directly to the Lead.
   */
  async showToast(entry) {
    if (!entry || !entry.id) return;
    if (!canUserSeeNoteReminder(entry)) {
      this.onToastClosed(entry.id);
      return;
    }

    // Reserve the slot before the async refresh so the queue cannot render twice.
    this.activeToastId = entry.id;

    // Re-confirm the counsellor / campaign with the server before showing anything.
    entry = await this.refreshReminderContext(entry);
    if (this.activeToastId !== entry.id) return; // closed while refreshing
    if (getResolvedLeadsSet().has(String(entry.id))) {
      this.onToastClosed(entry.id);
      return;
    }
    if (!canUserSeeNoteReminder(entry)) {
      this.onToastClosed(entry.id);
      return;
    }

    toast.dismiss();

    const leadName = entry.name || 'Student';
    const summaryStatus = entry.status || 'Call Back Later';
    const counsellorName =
      personDisplayName(entry.counsellorName) ||
      personDisplayName(entry.createdBy) ||
      personDisplayName(entry.assignedToName) ||
      'Counsellor';
    const campaignName = normalizeCampaignName(entry.campaign);

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
              'note-reminder-card relative overflow-hidden w-[310px] max-w-[92vw] bg-white border border-amber-200/90 rounded-2xl shadow-xl p-3 text-slate-800 flex flex-col gap-2 transition-all select-none font-sans',
          },
          React.createElement(
            'div',
            { className: 'flex items-center justify-between gap-2 border-b border-amber-100/70 pb-1.5' },
            React.createElement(
              'span',
              { className: 'text-[11.5px] font-bold text-amber-700 flex items-center gap-1.5' },
              React.createElement('span', null, '📝'),
              React.createElement('span', null, 'Call Back / Note Reminder')
            ),
            React.createElement(
              'button',
              {
                onClick: handleClose,
                className: 'text-slate-400 hover:text-slate-700 text-xs cursor-pointer leading-none p-0.5 rounded hover:bg-slate-100 transition-colors',
                title: 'Close',
              },
              '✕'
            )
          ),
          React.createElement(
            'div',
            { className: 'flex items-center justify-between gap-2.5' },
            React.createElement(
              'div',
              { className: 'min-w-0 flex-1 flex flex-col gap-0.5' },
              React.createElement(
                'div',
                { className: 'text-[12px] font-bold text-slate-900 truncate', title: leadName },
                `👤 ${leadName}`
              ),
              React.createElement(
                'div',
                { className: 'text-[10px] text-slate-500 truncate', title: summaryStatus },
                `📞 ${summaryStatus}`
              ),
              React.createElement(
                'div',
                { className: 'text-[10px] text-slate-600 truncate flex items-center gap-1', title: `Counsellor: ${counsellorName}` },
                React.createElement('span', null, '🎯'),
                React.createElement('span', { className: 'text-slate-500 font-medium' }, 'Counsellor:'),
                React.createElement('span', { className: 'font-semibold text-slate-800 truncate' }, counsellorName)
              ),
              React.createElement(
                'div',
                { className: 'text-[10px] text-slate-600 truncate flex items-center gap-1', title: `Campaign: ${campaignName || 'Direct'}` },
                React.createElement('span', null, '📢'),
                React.createElement('span', { className: 'text-slate-500 font-medium' }, 'Campaign:'),
                React.createElement(
                  'span',
                  { className: campaignName ? 'font-semibold text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-100/80 truncate' : 'italic text-slate-500 truncate' },
                  campaignName || 'Direct'
                )
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
                        counsellorName: counsellorName,
                        campaign: campaignName,
                        isMeta: Boolean(entry.isMeta),
                      },
                    })
                  );
                },
                className:
                  'px-3 py-1.5 rounded-xl text-[11px] font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-xs transition-all cursor-pointer shrink-0 self-center active:scale-95 flex items-center gap-1',
              },
              React.createElement('span', null, '✏️'),
              React.createElement('span', null, 'Add Note')
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
