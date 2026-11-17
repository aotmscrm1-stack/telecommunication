// utils/counsellor.js
// Single source of truth for "which counsellor does this lead note reminder
// belong to?".
//
// The reminder popup must always name (and notify) the counsellor who actually
// kept the call summary. Two traps are handled here:
//   1. `displayName` frequently stores a role label ("Managing Director",
//      "Counsellor", "Telecaller") instead of the person's real name, so a role
//      label is never used as the counsellor name.
//   2. When an Admin / Executive records the summary, the reminder belongs to
//      the lead's counsellor (latest real note author, else `assignedTo`), not
//      to the acting admin.

const STATUS_LOG_RE = /^status\s+(changed|updated)/i;
// Legacy note/call records often store a role label instead of a name
// (e.g. "Telecaller Councellor", "Managing Director"), so a value built only out
// of role words is never treated as a person's name.
const ROLE_WORDS = new Set([
  'md', 'admin', 'administrator', 'ceo', 'cto', 'coo', 'manager', 'managers',
  'managing', 'director', 'counsellor', 'councellor', 'counselor',
  'counsellors', 'councellors', 'counselors',
  'telecaller', 'telecallers', 'tele', 'caller', 'callers',
  'staff', 'member', 'agent', 'agents', 'employee', 'executive',
  'hr', 'sr', 'jr', 'senior', 'junior', 'team', 'support',
]);

function isRoleLabel(value) {
  const words = String(value || '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
  if (!words.length) return true;
  return words.every(word => ROLE_WORDS.has(word));
}

/**
 * Returns a real person's name and never a role label.
 * Accepts a populated user document, a plain string or nothing.
 */
function personName(person) {
  if (!person) return '';
  if (typeof person === 'string') {
    const str = person.trim();
    return !str || OBJECT_ID_RE.test(str) || isRoleLabel(str) ? '' : str;
  }
  const name = String(person.name || person.fullName || '').trim();
  if (name && !OBJECT_ID_RE.test(name) && !isRoleLabel(name)) return name;
  const displayName = String(person.displayName || '').trim();
  if (displayName && !OBJECT_ID_RE.test(displayName) && !isRoleLabel(displayName)) return displayName;
  return '';
}

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

/**
 * Admins / Directors / CXOs only ever *watch* the pipeline - they never do the
 * calls, so they can never own a call-summary reminder. Managers are NOT
 * excluded here: several managers also work leads as counsellors.
 */
function isAdminOrExecutive(user) {
  if (!user) return false;
  const role = String(user.role || '').trim().toLowerCase();
  const designation = String(user.designation || '').trim().toUpperCase();

  if (role === 'admin' || role === 'superadmin') return true;
  return (
    designation === 'ADMIN' ||
    designation === 'ADMINISTRATOR' ||
    designation === 'MD' ||
    designation.includes('MANAGING DIRECTOR') ||
    designation === 'CEO' ||
    designation === 'CTO'
  );
}

async function loadUserSummary(id) {
  const userId = String(id || '').trim();
  if (!OBJECT_ID_RE.test(userId)) return null;
  try {
    const User = require('../../database/models/User');
    return await User.findById(userId).select('name displayName email role designation').lean();
  } catch (_) {
    return null;
  }
}

/**
 * Every person that touched the lead's call summary, newest first.
 * Includes `status_change` entries: setting a Positive sub-status IS the
 * call-summary update the reminder is about, and it is the only trace that
 * exists before the note is written.
 */
function collectCallSummaryAuthors(lead) {
  const candidates = [];

  for (const activity of lead?.activities || []) {
    if (!activity) continue;
    const type = String(activity.type || '').toLowerCase();
    if (type !== 'note' && type !== 'call' && type !== 'status_change') continue;
    const text = String(activity.description || activity.note || '').trim();
    if (type !== 'status_change' && (!text || STATUS_LOG_RE.test(text))) continue;
    const performer = activity.performedBy && typeof activity.performedBy === 'object' ? activity.performedBy : null;
    candidates.push({
      id: String(performer?._id || activity.performedBy || '').trim(),
      name: personName(performer) || personName(activity.performedByName) || personName(activity.userName),
      email: performer?.email || '',
      at: new Date(activity.createdAt || 0).getTime(),
    });
  }

  for (const callNote of lead?.callNotes || []) {
    if (!callNote) continue;
    const isStatusLog = String(callNote.outcome || '').toLowerCase() === 'status_change';
    const text = String(callNote.note || '').trim();
    // Status-change entries are hidden notes, but they still record who made the
    // call-summary change.
    if (!isStatusLog && (!text || STATUS_LOG_RE.test(text))) continue;
    const author = callNote.user && typeof callNote.user === 'object' ? callNote.user : null;
    candidates.push({
      id: String(author?._id || callNote.user || '').trim(),
      name: personName(author) || personName(callNote.userName),
      email: author?.email || '',
      at: new Date(callNote.date || 0).getTime(),
    });
  }

  return candidates.filter(c => c.id || c.name).sort((a, b) => b.at - a.at);
}

/**
 * Latest call-summary author on the lead (status changes included).
 */
async function resolveLatestNoteAuthor(lead) {
  const [candidate] = collectCallSummaryAuthors(lead);
  if (!candidate) return null;
  const user = await loadUserSummary(candidate.id);
  return {
    id: candidate.id,
    name: candidate.name || personName(user),
    email: candidate.email || user?.email || '',
  };
}

/**
 * Finds the counsellor who actually recorded the lead's call summary:
 * newest trace by a non-admin/executive (status change, call or note), else
 * the lead's assigned counsellor.
 */
async function resolveCallSummaryCounsellor(lead, { excludeIds = [] } = {}) {
  const excluded = new Set(excludeIds.map(id => String(id || '').trim()).filter(Boolean));

  for (const candidate of collectCallSummaryAuthors(lead).slice(0, 10)) {
    if (candidate.id && excluded.has(candidate.id)) continue;
    const found = await loadUserSummary(candidate.id);
    if (found) {
      if (isAdminOrExecutive(found)) continue;
      return {
        counsellorId: candidate.id,
        counsellorName: personName(found) || candidate.name,
        counsellorEmail: found.email || candidate.email || '',
      };
    }
    if (candidate.name) {
      return {
        counsellorId: candidate.id,
        counsellorName: candidate.name,
        counsellorEmail: candidate.email || '',
      };
    }
  }

  return null;
}

/**
 * Counsellors assigned to a campaign (MetaCampaignAssignment). Several campaigns
 * are worked by exactly one counsellor, so when nothing on the lead records who
 * made the call that counsellor is the only possible owner of the reminder.
 */
function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function loadCampaignCounsellors(campaignName) {
  const name = String(campaignName || '').trim();
  if (!name) return [];
  try {
    const MetaCampaignAssignment = require('../../database/models/MetaCampaignAssignment');
    const assignment = await MetaCampaignAssignment.findOne({
      campaign: new RegExp(`^${escapeRegExp(name)}$`, 'i'),
    }).lean();
    const ids = Array.isArray(assignment?.assignedUsers) ? assignment.assignedUsers : [];
    if (!ids.length) return [];
    const User = require('../../database/models/User');
    const users = await User.find({ _id: { $in: ids } })
      .select('name displayName email role designation')
      .lean();
    return users.filter(u => u && !isAdminOrExecutive(u) && personName(u));
  } catch (_) {
    return [];
  }
}

/**
 * Resolves the counsellor for a note reminder broadcast.
 *   - a counsellor recording the summary is the owner
 *   - an Admin / Executive recording it hands the reminder to the counsellor
 *     who did the call (latest status change / call / note, else assignee)
 *   - when nothing on the lead records the caller, the campaign's assigned
 *     counsellor is used (only when that campaign has a single counsellor)
 *   - an admin's own name is never used as the counsellor name
 *
 * `assignedTo` may be a populated user document or an ObjectId.
 */
async function resolveReminderCounsellor({ user, lead, assignedTo = null, campaignName = '' }) {
  const actingId = String(user?._id || '').trim();
  if (user && !isAdminOrExecutive(user)) {
    const actingName = personName(user);
    if (actingName) {
      return {
        counsellorName: actingName,
        counsellorId: actingId,
        counsellorEmail: user.email || '',
      };
    }
  }

  const author = await resolveCallSummaryCounsellor(lead, { excludeIds: actingId ? [actingId] : [] });
  if (author && (author.counsellorName || author.counsellorId)) return author;

  if (assignedTo) {
    const id = String(assignedTo._id || assignedTo).trim();
    const assignedUser = await loadUserSummary(id);
    if (assignedUser && !isAdminOrExecutive(assignedUser)) {
      return {
        counsellorId: id,
        counsellorName: personName(assignedUser) || personName(assignedTo),
        counsellorEmail: assignedUser.email || '',
      };
    }
    const name = personName(assignedTo);
    if (!assignedUser && (name || id)) {
      return { counsellorName: name, counsellorId: id, counsellorEmail: assignedTo.email || '' };
    }
  }

  // Campaign fallback: campaigns worked by a single counsellor always resolve.
  const leadCampaign = String(
    campaignName ||
    lead?.campaignName ||
    lead?.campaign?.name ||
    (typeof lead?.campaign === 'string' ? lead.campaign : '') ||
    ''
  ).trim();
  const campaignCounsellors = await loadCampaignCounsellors(leadCampaign);
  if (campaignCounsellors.length) {
    const actingMatch = actingId
      ? campaignCounsellors.find(u => String(u._id) === actingId)
      : null;
    const picked = actingMatch || (campaignCounsellors.length === 1 ? campaignCounsellors[0] : null);
    if (picked) {
      return {
        counsellorId: String(picked._id),
        counsellorName: personName(picked),
        counsellorEmail: picked.email || '',
      };
    }
  }

  // Nothing reliable: let the admin see it as a generic reminder instead of
  // wrongly stamping the admin's own name on it.
  return { counsellorName: '', counsellorId: '', counsellorEmail: '' };
}

module.exports = {
  personName,
  isRoleLabel,
  isAdminOrExecutive,
  resolveLatestNoteAuthor,
  resolveCallSummaryCounsellor,
  resolveReminderCounsellor,
};
