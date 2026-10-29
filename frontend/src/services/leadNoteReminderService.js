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

class LeadNoteReminderService {
  constructor() {
    this.intervalId = null;
    this.initialized = false;
  }

  /**
   * Initialize background timer (checks every 10 seconds for 5-minute intervals)
   */
  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Check every 10 seconds
    this.intervalId = setInterval(() => {
      this.checkAndTriggerPendingReminders();
    }, 10000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.initialized = false;
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
