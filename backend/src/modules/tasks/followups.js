const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const FollowUp = require('../../database/models/FollowUp');
const Todo = require('../../database/models/Todo');
const Lead = require('../../database/models/Lead');
const MetaLead = require('../../database/models/MetaLead');
const MetaCampaignAssignment = require('../../database/models/MetaCampaignAssignment');
const User = require('../../database/models/User');
const { protect, authorize } = require('../../core/middleware/auth');
const { notifyAdminsTaskCreated, notifyAdminsTaskEdited } = require('../../modules/notifications/notificationService');
const { broadcastWebSocketEvent } = require('../../app/websocket');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const MAX_RECURRING_OCCURRENCES = 366;

function buildRecurrenceDates(startDate, frequency, endDate) {
  const dates = [new Date(startDate)];
  if (frequency === 'none' || !endDate) return dates;

  const stepDays = frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : null;
  const stepMonths = frequency === 'monthly' ? 1 : null;

  let cursor = new Date(startDate);
  while (dates.length < MAX_RECURRING_OCCURRENCES) {
    const next = new Date(cursor);
    if (stepDays) next.setDate(next.getDate() + stepDays);
    else if (stepMonths) next.setMonth(next.getMonth() + stepMonths);
    else break;

    if (next.getTime() > new Date(endDate).getTime()) break;
    dates.push(next);
    cursor = next;
  }
  return dates;
}

function fireAndForget(fn) {
  try {
    Promise.resolve(fn()).catch(err =>
      console.error('[notification] fire-and-forget error:', err.message)
    );
  } catch (err) {
    console.error('[notification] sync error:', err.message);
  }
}

function getTargetModel(type) {
  if (type === 'todo') return Todo;
  return FollowUp;
}

// Helper to check strict Admin / Executive Director privileges (MD, CEO, CTO, Admin)
function isStrictAdmin(user) {
  if (!user) return false;
  const role = String(user.role || '').trim().toLowerCase();
  if (role === 'admin' || role === 'superadmin') return true;

  const desig = String(user.designation || '').trim().toUpperCase();
  const dept = String(user.department || '').trim().toUpperCase();

  return (
    desig === 'MANAGING DIRECTOR' ||
    desig === 'MD' ||
    desig === 'CEO' ||
    desig === 'CTO' ||
    desig === 'ADMIN' ||
    desig === 'SUPERADMIN' ||
    dept === 'ADMIN' ||
    dept === 'MANAGEMENT'
  );
}

// Helper to check Manager / Team Lead status
function isManager(user) {
  if (!user) return false;
  const role = String(user.role || '').trim().toLowerCase();
  if (role === 'manager') return true;

  const desig = String(user.designation || '').trim().toUpperCase();
  return desig.includes('MANAGER') || desig.includes('HEAD') || desig.includes('LEAD') || desig.includes('SUPERVISOR');
}

function extractId(val) {
  if (!val) return '';
  if (typeof val === 'object') {
    return String(val._id || val.id || '');
  }
  return String(val);
}

function toIdVariants(id) {
  if (!id) return [];
  const str = String(id._id || id.id || id);
  if (mongoose.Types.ObjectId.isValid(str)) {
    return [new mongoose.Types.ObjectId(str), str];
  }
  return [str];
}

function toIdVariantsList(ids) {
  if (!Array.isArray(ids)) return toIdVariants(ids);
  const result = [];
  ids.forEach(id => {
    toIdVariants(id).forEach(v => result.push(v));
  });
  return result;
}

function isValidId(val) {
  return val && mongoose.Types.ObjectId.isValid(val);
}

// GET /api/followups
router.get('/', protect, async (req, res) => {
  try {
    const { status, date, due: dueQuery, callerId, userId: queryUserId, type, forMe: forMeQuery, leadId, department } = req.query;

    const isAdmin = isStrictAdmin(req.user);
    const isMgr = isManager(req.user);
    const isHead = Boolean(req.user?.isHead);
    const forMe = forMeQuery === 'true';

    // Only non-admin marketing staff are restricted from the todo module (they exclusively use Digital Calendar)
    const userDept = String(req.user.department || '').trim().toLowerCase();
    const userDesig = String(req.user.designation || '').trim().toLowerCase();
    const isMarketing = userDept.includes('marketing') || userDesig.includes('marketing') || userDesig.includes('digital');

    if (!isAdmin && type === 'todo' && (
      isMarketing ||
      String(department || '').trim().toLowerCase() === 'marketing'
    )) {
      return res.json({ followups: [], total: 0 });
    }

    const query = {};

    if (type === 'todo') {
      if (!isAdmin && !isMgr) {
        query.department = { $not: /^marketing$/i };
      }
      query.type = 'todo';
    } else if (type === 'call_followup') {
      query.type = 'call_followup';
    } else if (type === 'task') {
      query.type = { $in: ['task', null] };
    }

    if (isValidId(leadId)) {
      query.$and = query.$and || [];
      query.$and.push({ $or: [{ lead: leadId }, { metaLeadId: leadId }] });
    }

    // Role-based visibility scoping
    if (queryUserId) {
      const targetId = queryUserId === 'me' ? req.user._id : queryUserId;
      if (!isValidId(targetId)) {
        query.$or = [{ assignedTo: req.user._id }, { assignedBy: req.user._id }, { createdBy: req.user._id }];
      } else {
        if (!isAdmin && !isMgr && String(targetId) !== String(req.user._id)) {
          // Fallback to own items so page never crashes with 403
          query.$or = [{ assignedTo: req.user._id }, { assignedBy: req.user._id }, { createdBy: req.user._id }];
        } else {
          query.$or = [{ assignedTo: targetId }, { assignedBy: targetId }, { createdBy: targetId }];
        }
      }
    } else if (!isAdmin) {
      if (isHead && !forMe) {
        // Department Head: View relative department items & team members
        if (callerId && callerId !== 'all' && isValidId(callerId)) {
          query.$or = [{ assignedTo: callerId }, { assignedBy: callerId }, { createdBy: callerId }];
        } else if (department && department !== 'All' && department !== 'all') {
          const deptRegex = new RegExp(`^${department}$`, 'i');
          const deptUsers = await User.find({
            $or: [{ department: deptRegex }, { designation: deptRegex }]
          }).select('_id');
          const deptUserIds = deptUsers.map(u => u._id);
          query.$or = [
            { assignedTo: { $in: deptUserIds } },
            { assignedBy: { $in: deptUserIds } },
            { createdBy: { $in: deptUserIds } },
            { department: deptRegex }
          ];
        } else if (req.user.department || req.user.designation) {
          const deptOrDesigFilter = [];
          if (req.user.department) deptOrDesigFilter.push({ department: req.user.department });
          if (req.user.designation) deptOrDesigFilter.push({ designation: req.user.designation });
          const deptUsers = await User.find({ $or: deptOrDesigFilter }).select('_id');
          const deptUserIds = deptUsers.map(u => u._id);
          query.$or = [
            { assignedTo: { $in: deptUserIds } },
            { assignedBy: { $in: deptUserIds } },
            { createdBy: { $in: deptUserIds } },
            ...(req.user.department ? [{ department: req.user.department }] : [])
          ];
        } else {
          query.$or = [{ assignedTo: req.user._id }, { assignedBy: req.user._id }, { createdBy: req.user._id }];
        }
      } else {
        // Non-managers (including Jr Marketing Executives): strictly ONLY see own assigned, created, or assignedBy items!
        query.$or = [{ assignedTo: req.user._id }, { assignedBy: req.user._id }, { createdBy: req.user._id }];
      }
    } else {
      // ONLY Admin Panel: Full Visibility across all members & departments
      if (forMe) {
        query.$or = [{ assignedTo: req.user._id }, { assignedBy: req.user._id }, { createdBy: req.user._id }];
      } else if (callerId && callerId !== 'all' && isValidId(callerId)) {
        query.$or = [{ assignedTo: callerId }, { assignedBy: callerId }, { createdBy: callerId }];
      } else if (department && department !== 'All' && department !== 'all') {
        const deptRegex = new RegExp(`^${department}$`, 'i');
        const deptUsers = await User.find({
          $or: [{ department: deptRegex }, { designation: deptRegex }]
        }).select('_id');
        const deptUserIds = deptUsers.map(u => u._id);
        query.$or = [
          { assignedTo: { $in: deptUserIds } },
          { assignedBy: { $in: deptUserIds } },
          { createdBy: { $in: deptUserIds } },
          { department: deptRegex }
        ];
      }
    }

    if (status) {
      const statuses = status.split(',').map(s => {
        const trimmed = s.trim();
        if (trimmed === 'pending' || trimmed === 'upcoming') return ['upcoming', 'pending', 'in_progress'];
        if (trimmed === 'done' || trimmed === 'completed') return ['done', 'completed'];
        return [trimmed];
      }).flat();
      const uniqueStatuses = Array.from(new Set(statuses));
      if (uniqueStatuses.includes('done') || uniqueStatuses.includes('completed')) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { status: { $in: uniqueStatuses } },
            { completedAt: { $exists: true, $ne: null } }
          ]
        });
      } else {
        query.status = { $in: uniqueStatuses };
        query.completedAt = null;
      }
    }

    const due = dueQuery || date;
    if (due) {
      if (due === 'today') {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setHours(23, 59, 59, 999);
        query.$or = [{ scheduledAt: { $gte: start, $lte: end } }, { dueDate: { $gte: start, $lte: end } }];
      } else if (due === 'tomorrow') {
        const start = new Date(); start.setDate(start.getDate() + 1); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setDate(end.getDate() + 1); end.setHours(23, 59, 59, 999);
        query.$or = [{ scheduledAt: { $gte: start, $lte: end } }, { dueDate: { $gte: start, $lte: end } }];
      }
    }

    if (type === 'todo') {
      const todoResults = await Todo.find(query)
        .populate('lead', 'name phone status')
        .populate('assignedTo', 'name avatar department designation')
        .populate('assignedBy', 'name avatar department designation')
        .populate('completedBy', 'name avatar')
        .populate('createdBy', 'name avatar department designation')
        .sort({ scheduledAt: 1, createdAt: -1 });

      const sanitized = todoResults.map(f => {
        const doc = f.toObject ? f.toObject() : { ...f };
        doc.type = 'todo';
        doc.scheduledAt = doc.scheduledAt || doc.dueDate || doc.startDate || doc.createdAt;
        doc.dueDate = doc.dueDate || doc.scheduledAt;
        doc.note = doc.note || doc.description || doc.title || '';
        doc.title = doc.title || doc.note || doc.description || '';
        doc.description = doc.description || doc.note || doc.title || '';
        if (doc.status === 'completed' || doc.status === 'done' || doc.completedAt) doc.status = 'done';
        else if (doc.status === 'pending' || doc.status === 'in_progress') doc.status = 'upcoming';

        if (!doc.assignedBy) {
          if (doc.createdBy && typeof doc.createdBy === 'object') {
            doc.assignedBy = doc.createdBy;
          } else if (f.get && (f.get('assignedBy') === 'all' || f.get('assignedBy') === 'All')) {
            doc.assignedBy = { _id: 'all', name: 'All' };
          } else {
            doc.assignedBy = doc.assignedTo || { _id: 'all', name: 'All' };
          }
        } else if (doc.assignedBy === 'all' || doc.assignedBy === 'All') {
          doc.assignedBy = { _id: 'all', name: 'All' };
        }
        return doc;
      });

      return res.json({ followups: sanitized, total: sanitized.length });
    }

    const ModelClass = getTargetModel(type);
    let reqQueryFind = ModelClass.find(query)
      .populate('lead', 'name phone status')
      .populate('assignedTo', 'name avatar department designation')
      .populate('assignedBy', 'name avatar department designation')
      .populate('completedBy', 'name avatar')
      .populate('createdBy', 'name avatar department designation');
    const results = await reqQueryFind.sort({ scheduledAt: 1, createdAt: -1 });

    let allDocs = [...results];

    const sanitized = allDocs.map(f => {
      const doc = f.toObject ? f.toObject() : { ...f };
      doc.type = type || 'call_followup';
      doc.scheduledAt = doc.scheduledAt || doc.dueDate || doc.startDate || doc.createdAt;
      doc.dueDate = doc.dueDate || doc.scheduledAt;
      doc.note = doc.note || doc.description || doc.title || '';
      doc.title = doc.title || doc.note || doc.description || '';
      doc.description = doc.description || doc.note || doc.title || '';
      if (doc.status === 'completed' || doc.status === 'done' || doc.completedAt) doc.status = 'done';
      else if (doc.status === 'pending' || doc.status === 'in_progress') doc.status = 'upcoming';

      if (!doc.assignedBy) {
        if (doc.createdBy && typeof doc.createdBy === 'object') {
          doc.assignedBy = doc.createdBy;
        } else if (f.get && (f.get('assignedBy') === 'all' || f.get('assignedBy') === 'All')) {
          doc.assignedBy = { _id: 'all', name: 'All' };
        } else {
          doc.assignedBy = doc.assignedTo || { _id: 'all', name: 'All' };
        }
      } else if (doc.assignedBy === 'all' || doc.assignedBy === 'All') {
        doc.assignedBy = { _id: 'all', name: 'All' };
      }
      return doc;
    });

    res.json({ followups: sanitized });
  } catch (err) {
    console.error('[GET /followups]', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/followups/user/:userId — Direct User ID linked endpoint for Todo/Task/Followup list
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, status } = req.query;
    const targetUserId = userId === 'me' ? req.user._id : userId;

    const isAdmin = isStrictAdmin(req.user);
    const isMgr = isManager(req.user);

    let effectiveUserId = targetUserId;
    if (!isAdmin && !isMgr && String(targetUserId) !== String(req.user._id)) {
      effectiveUserId = req.user._id;
    }

    const ModelClass = getTargetModel(type);
    const query = {
      $or: [
        { assignedTo: effectiveUserId },
        { createdBy: effectiveUserId },
        { assignedBy: effectiveUserId }
      ]
    };

    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      query.status = { $in: statuses };
    }

    let reqQueryFind = ModelClass.find(query)
      .populate('lead', 'name phone status')
      .populate('assignedTo', 'name email avatar designation department')
      .populate('assignedBy', 'name email avatar')
      .populate('completedBy', 'name email avatar');
    const results = await reqQueryFind.sort({ scheduledAt: 1, createdAt: -1 });

    const sanitized = results.map(f => {
      const doc = f.toObject ? f.toObject() : { ...f };
      doc.type = type || (ModelClass === Todo ? 'todo' : ModelClass === Task ? 'task' : 'call_followup');
      doc.scheduledAt = doc.scheduledAt || doc.dueDate || doc.startDate || doc.createdAt;
      doc.dueDate = doc.dueDate || doc.scheduledAt;
      doc.note = doc.note || doc.description || doc.title || '';
      doc.title = doc.title || doc.note || doc.description || '';
      doc.description = doc.description || doc.note || doc.title || '';
      if (doc.status === 'completed' || doc.status === 'done' || doc.completedAt) doc.status = 'done';
      else if (doc.status === 'pending' || doc.status === 'in_progress') doc.status = 'upcoming';

      if (!doc.assignedBy) {
        if (doc.createdBy && typeof doc.createdBy === 'object') {
          doc.assignedBy = doc.createdBy;
        } else if (f.get && (f.get('assignedBy') === 'all' || f.get('assignedBy') === 'All')) {
          doc.assignedBy = { _id: 'all', name: 'All' };
        } else {
          doc.assignedBy = doc.assignedTo || { _id: 'all', name: 'All' };
        }
      } else if (doc.assignedBy === 'all' || doc.assignedBy === 'All') {
        doc.assignedBy = { _id: 'all', name: 'All' };
      }
      return doc;
    });

    res.json({ ok: true, userId: targetUserId, followups: sanitized, todos: sanitized, tasks: sanitized });
  } catch (err) {
    console.error('[GET /followups/user/:userId]', err);
    res.status(500).json({ message: err.message });
  }
});

async function canAssignTo(actor, assigneeId) {
  if (!assigneeId) return true;
  if (!actor) return false;
  if (String(assigneeId) === String(actor._id)) return true;

  const role = String(actor.role || '').toLowerCase();
  if (role === 'admin' || role === 'superadmin' || role === 'manager') return true;
  if (isStrictAdmin(actor) || isManager(actor)) return true;

  const desig = String(actor.designation || '').trim().toUpperCase();
  const dept = String(actor.department || '').trim().toUpperCase();

  // Executives, Directors, HR can assign tasks across organization
  if (
    desig.includes('HR') ||
    desig.includes('DIRECTOR') ||
    desig.includes('MD') ||
    desig.includes('CEO') ||
    desig.includes('CTO') ||
    dept.includes('HR') ||
    dept.includes('ADMIN') ||
    dept.includes('MANAGEMENT')
  ) {
    return true;
  }

  // Department-based assignment: allow team members to assign tasks to peers in the same department
  try {
    const targetUser = await User.findById(assigneeId);
    if (!targetUser) return true;

    const targetDept = String(targetUser.department || '').trim().toUpperCase();
    const targetDesig = String(targetUser.designation || '').trim().toUpperCase();

    // Check same department
    if (dept && targetDept && dept === targetDept) return true;

    // Developer match (e.g. Jayaveer <-> Saadiya)
    const isActorDev = dept.includes('DEV') || desig.includes('DEV') || desig.includes('SOFTWARE') || desig.includes('ENGINEER');
    const isTargetDev = targetDept.includes('DEV') || targetDesig.includes('DEV') || targetDesig.includes('SOFTWARE') || targetDesig.includes('ENGINEER');
    if (isActorDev && isTargetDev) return true;

    // Marketing match (e.g. Ashok <-> Manasa <-> Moeen)
    const isActorMkt = dept.includes('MARKET') || desig.includes('MARKET');
    const isTargetMkt = targetDept.includes('MARKET') || targetDesig.includes('MARKET');
    if (isActorMkt && isTargetMkt) return true;

    // Trainer match (e.g. Venkat <-> Bhargav <-> Adilakshmi)
    const isActorTrn = dept.includes('TRAIN') || desig.includes('TRAIN');
    const isTargetTrn = targetDept.includes('TRAIN') || targetDesig.includes('TRAIN');
    if (isActorTrn && isTargetTrn) return true;

    // HR match
    const isActorHR = dept.includes('HR') || desig.includes('HR');
    const isTargetHR = targetDept.includes('HR') || targetDesig.includes('HR');
    if (isActorHR && isTargetHR) return true;

    // Allow assigning to Admin or Manager
    if (targetUser.role === 'admin' || targetUser.role === 'manager' || isStrictAdmin(targetUser) || isManager(targetUser)) {
      return true;
    }

    return true;
  } catch (err) {
    return true;
  }
}

// POST /api/followups
router.post('/', protect, async (req, res) => {
  try {
    if (req.body.assignedTo && !(await canAssignTo(req.user, req.body.assignedTo))) {
      return res.status(403).json({ message: 'You are not allowed to assign tasks to this user' });
    }

    const { recurrence, ...body } = req.body;
    const itemType = body.type || 'call_followup';
    const dept = String(req.body.department || req.user.department || '').trim().toLowerCase();

    // Department Marketing TODO is permanently disabled
    if (itemType === 'todo') {
      if (dept === 'marketing' || String(req.user.department || '').trim().toLowerCase() === 'marketing') {
        return res.status(400).json({ message: 'TODO module is permanently disabled for the Marketing department.' });
      }
      if (req.body.assignedTo && isValidId(req.body.assignedTo)) {
        const targetUser = await User.findById(req.body.assignedTo).select('department designation').lean();
        if (targetUser && (targetUser.department?.toLowerCase() === 'marketing' || targetUser.designation?.toLowerCase().includes('marketing'))) {
          return res.status(400).json({ message: 'Cannot assign TODO tasks to Marketing department staff.' });
        }
      }
    }

    const ModelClass = getTargetModel(itemType);

    const frequency = recurrence?.frequency;
    const hasRecurrence = frequency && frequency !== 'none';

    const assignedToVal = isValidId(req.body.assignedTo) ? new mongoose.Types.ObjectId(req.body.assignedTo) : req.user._id;
    const assignedByVal = isValidId(req.body.assignedBy) ? new mongoose.Types.ObjectId(req.body.assignedBy) : req.user._id;

    let resolvedLeadName = req.body.leadName || '';
    let resolvedLeadPhone = req.body.leadPhone || '';
    let resolvedCampaign = req.body.campaign || '';
    let resolvedMetaLeadId = isValidId(req.body.metaLeadId) ? req.body.metaLeadId : null;

    if (!resolvedMetaLeadId && isValidId(body.lead)) {
      const maybeMeta = await MetaLead.findById(body.lead).lean().catch(() => null);
      if (maybeMeta) {
        resolvedMetaLeadId = maybeMeta._id;
        resolvedLeadName = resolvedLeadName || maybeMeta.fullName || maybeMeta.rawData?.full_name || maybeMeta.rawData?.Name || '';
        resolvedLeadPhone = resolvedLeadPhone || maybeMeta.phone || maybeMeta.normalizedPhone || '';
        resolvedCampaign = resolvedCampaign || maybeMeta.campaign || '';
      }
    } else if (resolvedMetaLeadId) {
      const maybeMeta = await MetaLead.findById(resolvedMetaLeadId).lean().catch(() => null);
      if (maybeMeta) {
        resolvedLeadName = resolvedLeadName || maybeMeta.fullName || maybeMeta.rawData?.full_name || maybeMeta.rawData?.Name || '';
        resolvedLeadPhone = resolvedLeadPhone || maybeMeta.phone || maybeMeta.normalizedPhone || '';
        resolvedCampaign = resolvedCampaign || maybeMeta.campaign || '';
      }
    }

    const baseDoc = {
      ...body,
      type: itemType,
      metaLeadId: resolvedMetaLeadId || undefined,
      leadName: resolvedLeadName,
      leadPhone: resolvedLeadPhone,
      campaign: resolvedCampaign,
      filledByName: req.user.name || req.body.filledByName || 'Agent',
      assignedTo: assignedToVal,
      assignedBy: assignedByVal,
      createdBy: req.user._id,
      department: req.body.department || req.user.department || '',
      initialScheduledAt: body.initialScheduledAt || body.scheduledAt,
      recurrence: hasRecurrence ? {
        frequency,
        endDate: recurrence.endDate
      } : undefined
    };

    const followup = await ModelClass.create(baseDoc);

    await followup.populate('lead', 'name phone status');
    await followup.populate('assignedTo', 'name email');
    await followup.populate('createdBy', 'name email');
    if (baseDoc.assignedBy && mongoose.Types.ObjectId.isValid(baseDoc.assignedBy)) {
      await followup.populate('assignedBy', 'name email');
    } else if (baseDoc.assignedBy === 'all' || baseDoc.assignedBy === 'All') {
      followup.assignedBy = { _id: 'all', name: 'All' };
    }

    if (resolvedMetaLeadId && itemType === 'call_followup') {
      await MetaLead.findByIdAndUpdate(resolvedMetaLeadId, {
        $set: { followUpDate: followup.scheduledAt }
      }).catch(() => {});
    }

    let callbackToastPayload = null;
    if (itemType === 'call_followup') {
      let campaignAssignedUserIds = [];
      if (resolvedCampaign) {
        const campAssign = await MetaCampaignAssignment.findOne({ campaign: resolvedCampaign }).select('assignedUsers').lean().catch(() => null);
        if (campAssign && Array.isArray(campAssign.assignedUsers)) {
          campaignAssignedUserIds = campAssign.assignedUsers.map(id => String(id));
        }
      }
      callbackToastPayload = {
        followupId: String(followup._id),
        leadId: String(followup.lead?._id || followup.lead || resolvedMetaLeadId || ''),
        metaLeadId: resolvedMetaLeadId ? String(resolvedMetaLeadId) : '',
        leadName: resolvedLeadName || followup.lead?.name || 'Lead',
        leadPhone: resolvedLeadPhone || followup.lead?.phone || '',
        campaign: resolvedCampaign || '',
        filledById: String(req.user._id),
        filledByName: req.user.name || baseDoc.filledByName || 'Agent',
        assignedToId: String(assignedToVal),
        assignedToName: followup.assignedTo?.name || req.user.name || 'Agent',
        campaignAssignedUserIds,
        scheduledAt: followup.scheduledAt,
        note: followup.note || ''
      };
      try {
        broadcastWebSocketEvent('callback:scheduled', callbackToastPayload);
      } catch (_) {}
    }

    fireAndForget(() => notifyAdminsTaskCreated({ followup, performedByUser: req.user }));

    return res.status(201).json({ followup, callbackToastPayload });
  } catch (err) {
    console.error('[POST /followups]', err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/followups/:id
router.put('/:id', protect, async (req, res) => {
  try {
    if (req.body.assignedTo && !(await canAssignTo(req.user, req.body.assignedTo))) {
      return res.status(403).json({ message: 'You are not allowed to assign tasks to this user' });
    }

    let followup = await FollowUp.findById(req.params.id);
    let ModelClass = FollowUp;
    if (!followup) {
      followup = await Todo.findById(req.params.id);
      ModelClass = Todo;
    }
    if (!followup) return res.status(404).json({ message: 'Item not found' });

    const effectiveType = req.body.type || followup.type;
    if (effectiveType === 'todo') {
      const dept = String(req.body.department || followup.department || '').trim().toLowerCase();
      if (dept === 'marketing') {
        return res.status(400).json({ message: 'TODO module is permanently disabled for the Marketing department.' });
      }
      if (req.body.assignedTo && isValidId(req.body.assignedTo)) {
        const targetUser = await User.findById(req.body.assignedTo).select('department designation').lean();
        if (targetUser && (targetUser.department?.toLowerCase() === 'marketing' || targetUser.designation?.toLowerCase().includes('marketing'))) {
          return res.status(400).json({ message: 'Cannot assign TODO tasks to Marketing department staff.' });
        }
      }
    }

    const isAdminOrMgr = req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'manager' || isStrictAdmin(req.user) || isManager(req.user) || Boolean(req.user?.isHead);
    if (!isAdminOrMgr) {
      const currentUserId = String(req.user._id);
      const isAssignedUser = String(followup.assignedTo || '') === currentUserId ||
                             String(followup.assignedBy || '') === currentUserId ||
                             String(followup.createdBy || '') === currentUserId;
      const isSameDept = req.user.department && followup.department &&
                         String(req.user.department).trim().toLowerCase() === String(followup.department).trim().toLowerCase();
      if (!isAssignedUser && !isSameDept) {
        // Allow collaborator updates
      }
    }

    const update = { ...req.body };
    if ((update.status === 'done' || update.status === 'completed')) {
      const isAdminUser = req.user.role === 'admin' || req.user.role === 'superadmin' || isStrictAdmin(req.user) || isManager(req.user) || Boolean(req.user?.isHead);
      if (!isAdminUser) {
        return res.status(403).json({ message: 'Only Admin has permission to confirm and mark tasks as completed' });
      }
      if (!update.completedAt) update.completedAt = new Date();
      update.completedBy = req.user._id;
    }
    const updatedFollowup = await ModelClass.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('lead', 'name phone status')
      .populate('assignedTo', 'name email avatar')
      .populate('assignedBy', 'name email avatar')
      .populate('completedBy', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    if (ModelClass === FollowUp) {
      Todo.findByIdAndUpdate(req.params.id, update).catch(() => {});
    } else {
      FollowUp.findByIdAndUpdate(req.params.id, update).catch(() => {});
    }

    if (!updatedFollowup) return res.status(404).json({ message: 'Item not found' });

    fireAndForget(() => notifyAdminsTaskEdited({ followup: updatedFollowup, performedByUser: req.user }));

    res.json({ followup: updatedFollowup });
  } catch (err) {
    console.error('[PUT /followups/:id]', err);
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/followups/:id/status
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    let existing = await FollowUp.findById(req.params.id);
    let ModelClass = FollowUp;
    if (!existing) {
      existing = await Todo.findById(req.params.id);
      ModelClass = Todo;
    }
    if (!existing) return res.status(404).json({ message: 'Item not found' });

    const update = { status: (status === 'completed' || status === 'done') ? 'done' : status };
    if (update.status === 'done') {
      const isAdminUser = req.user.role === 'admin' || req.user.role === 'superadmin' || isStrictAdmin(req.user) || isManager(req.user) || Boolean(req.user?.isHead);
      if (!isAdminUser) {
        return res.status(403).json({ message: 'Only Admin has permission to confirm and mark tasks as completed' });
      }
      update.completedAt = new Date();
      update.completedBy = req.user._id;
    }

    const followup = await ModelClass.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('lead', 'name phone status')
      .populate('assignedTo', 'name email avatar')
      .populate('assignedBy', 'name email avatar')
      .populate('completedBy', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    if (ModelClass === FollowUp) {
      Todo.findByIdAndUpdate(req.params.id, update).catch(() => {});
    } else {
      FollowUp.findByIdAndUpdate(req.params.id, update).catch(() => {});
    }

    res.json({ followup });
  } catch (err) {
    console.error('[PATCH /followups/:id/status]', err);
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/followups/:id
router.patch('/:id', protect, async (req, res) => {
  try {
    let existing = await FollowUp.findById(req.params.id);
    let ModelClass = FollowUp;
    if (!existing) {
      existing = await Todo.findById(req.params.id);
      ModelClass = Todo;
    }
    if (!existing) return res.status(404).json({ message: 'Item not found' });

    const update = { ...req.body };
    if (update.status === 'done' || update.status === 'completed') {
      const isAdminUser = req.user.role === 'admin' || req.user.role === 'superadmin' || isStrictAdmin(req.user) || isManager(req.user) || Boolean(req.user?.isHead);
      if (!isAdminUser) {
        return res.status(403).json({ message: 'Only Admin has permission to confirm and mark tasks as completed' });
      }
      update.status = 'done';
      update.completedAt = update.completedAt || new Date();
      update.completedBy = req.user._id;
    }

    const followup = await ModelClass.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('lead', 'name phone status')
      .populate('assignedTo', 'name email avatar')
      .populate('assignedBy', 'name email avatar')
      .populate('completedBy', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    if (ModelClass === FollowUp) {
      Todo.findByIdAndUpdate(req.params.id, update).catch(() => {});
    } else {
      FollowUp.findByIdAndUpdate(req.params.id, update).catch(() => {});
    }

    res.json({ followup });
  } catch (err) {
    console.error('[PATCH /followups/:id]', err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/followups/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    let target = await FollowUp.findById(req.params.id);
    let ModelClass = FollowUp;
    if (!target) {
      target = await Todo.findById(req.params.id);
      ModelClass = Todo;
    }
    if (!target) return res.status(404).json({ message: 'Item not found' });

    const isAdmin = isStrictAdmin(req.user) || isManager(req.user) || req.user.role === 'admin' || req.user.role === 'superadmin' || Boolean(req.user?.isHead);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only Admin has permission to delete tasks or todos' });
    }

    if (target.recurringGroupId) {
      await ModelClass.deleteMany({ recurringGroupId: target.recurringGroupId });
      await (ModelClass === FollowUp ? Todo : FollowUp).deleteMany({ recurringGroupId: target.recurringGroupId }).catch(() => {});
    } else {
      await ModelClass.findByIdAndDelete(target._id);
      await (ModelClass === FollowUp ? Todo : FollowUp).findByIdAndDelete(target._id).catch(() => {});
    }

    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('[DELETE /followups/:id]', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/followups/import
router.post('/import', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', codepage: 65001 });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Excel/CSV file is empty' });
    }

    const importType = req.body.activeTab === 'Todo' ? 'todo' : req.body.activeTab === 'Tasks' ? 'task' : 'call_followup';
    const ModelClass = getTargetModel(importType);

    let created = 0;
    for (const row of rows) {
      try {
        const normalizedRow = {};
        Object.keys(row).forEach(k => {
          normalizedRow[k.trim().toLowerCase()] = row[k];
        });

        const note = normalizedRow.note || normalizedRow.description || normalizedRow.task || '';
        const scheduledAtStr = normalizedRow.date || normalizedRow.scheduledat || normalizedRow.due_date || normalizedRow.duedate;

        let scheduledAt = new Date();
        if (scheduledAtStr) {
          const parsedDate = new Date(scheduledAtStr);
          if (!isNaN(parsedDate.getTime())) {
            scheduledAt = parsedDate;
          }
        }

        const priority = (normalizedRow.priority || 'medium').trim().toLowerCase();

        let leadId = undefined;
        const leadPhone = normalizedRow.phone || normalizedRow.lead_phone;
        if (leadPhone) {
          const lead = await Lead.findOne({ phone: String(leadPhone).trim() });
          if (lead) leadId = lead._id;
        }

        await ModelClass.create({
          lead: leadId,
          note,
          title: note,
          scheduledAt,
          dueDate: scheduledAt,
          priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
          type: importType,
          assignedTo: req.user._id,
          assignedBy: req.user._id,
          createdBy: req.user._id,
        });
        created++;
      } catch (rowError) {
        console.error('Error importing bulk row:', row, rowError.message);
      }
    }

    res.json({ message: 'Import completed successfully', count: created, total: rows.length });
  } catch (err) {
    console.error('[POST /followups/import]', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;