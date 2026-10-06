const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const FollowUp = require('../../database/models/FollowUp');
const Task = require('../../database/models/Task');
const Todo = require('../../database/models/Todo');
const Lead = require('../../database/models/Lead');
const User = require('../../database/models/User');
const { protect, authorize } = require('../../core/middleware/auth');
const { notifyAdminsTaskCreated, notifyAdminsTaskEdited } = require('../../modules/notifications/notificationService');

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
  if (type === 'task') return Task;
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

function isValidId(val) {
  return val && mongoose.Types.ObjectId.isValid(val);
}

// GET /api/followups
router.get('/', protect, async (req, res) => {
  try {
    const { status, date, due: dueQuery, callerId, userId: queryUserId, type, forMe: forMeQuery, leadId } = req.query;
    const query = {};

    if (isValidId(leadId)) {
      query.lead = leadId;
    }

    const isAdmin = isStrictAdmin(req.user);
    const isMgr = isManager(req.user);
    const forMe = forMeQuery === 'true';

    // Role-based visibility scoping
    if (queryUserId) {
      const targetId = queryUserId === 'me' ? req.user._id : queryUserId;
      if (!isValidId(targetId)) {
        query.$or = [{ assignedTo: req.user._id }, { assignedBy: req.user._id }, { createdBy: req.user._id }];
      } else {
        if (!isAdmin && !isMgr && String(targetId) !== String(req.user._id)) {
          return res.status(403).json({ message: "You are not authorized to view another user's list." });
        }
        query.$or = [{ assignedTo: targetId }, { assignedBy: targetId }, { createdBy: targetId }];
      }
    } else if (!isAdmin) {
      if (isMgr && !forMe) {
        // Manager Panel: View relative department items & team members
        if (callerId && callerId !== 'all' && isValidId(callerId)) {
          query.$or = [{ assignedTo: callerId }, { assignedBy: callerId }, { createdBy: callerId }];
        } else if (req.user.department) {
          const deptUsers = await User.find({ department: req.user.department }).select('_id');
          const deptUserIds = deptUsers.map(u => u._id);
          query.$or = [
            { assignedTo: { $in: deptUserIds } },
            { assignedBy: { $in: deptUserIds } },
            { createdBy: { $in: deptUserIds } },
            { department: req.user.department }
          ];
        } else {
          query.$or = [{ assignedTo: req.user._id }, { assignedBy: req.user._id }, { createdBy: req.user._id }];
        }
      } else {
        // Developer, Trainer, Digital Marketing, Employee Panels:
        // ONLY see their own assigned, created, or assignedBy items!
        query.$or = [{ assignedTo: req.user._id }, { assignedBy: req.user._id }, { createdBy: req.user._id }];
      }
    } else {
      // ONLY Admin Panel: Full Visibility across all members & departments
      if (forMe) {
        query.$or = [{ assignedTo: req.user._id }, { assignedBy: req.user._id }, { createdBy: req.user._id }];
      } else if (callerId && callerId !== 'all' && isValidId(callerId)) {
        query.$or = [{ assignedTo: callerId }, { assignedBy: callerId }, { createdBy: callerId }];
      }
    }

    if (status) {
      const statuses = status.split(',').map(s => {
        const trimmed = s.trim();
        if (trimmed === 'pending' || trimmed === 'upcoming') return ['upcoming', 'pending', 'in_progress'];
        if (trimmed === 'done' || trimmed === 'completed') return ['done', 'completed'];
        return [trimmed];
      }).flat();
      query.status = { $in: Array.from(new Set(statuses)) };
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

    const ModelClass = getTargetModel(type);
    let reqQueryFind = ModelClass.find(query)
      .populate('lead', 'name phone status')
      .populate('assignedTo', 'name avatar')
      .populate('assignedBy', 'name avatar')
      .populate('completedBy', 'name avatar');
    if (ModelClass === Todo) {
      reqQueryFind = reqQueryFind.populate('createdBy', 'name avatar');
    }
    const results = await reqQueryFind.sort({ scheduledAt: 1, createdAt: -1 });

    const sanitized = results.map(f => {
      const doc = f.toObject ? f.toObject() : { ...f };
      doc.type = type || (ModelClass === Todo ? 'todo' : ModelClass === Task ? 'task' : 'call_followup');
      doc.scheduledAt = doc.scheduledAt || doc.dueDate || doc.startDate || doc.createdAt;
      doc.dueDate = doc.dueDate || doc.scheduledAt;
      doc.note = doc.note || doc.description || doc.title || '';
      doc.title = doc.title || doc.note || doc.description || '';
      doc.description = doc.description || doc.note || doc.title || '';
      if (doc.status === 'completed') doc.status = 'done';
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

    if (!isAdmin && !isMgr && String(targetUserId) !== String(req.user._id)) {
      return res.status(403).json({ message: "You are not authorized to view another user's todo/task list." });
    }

    const ModelClass = getTargetModel(type);
    const query = {
      $or: [
        { assignedTo: targetUserId },
        { createdBy: targetUserId },
        { assignedBy: targetUserId }
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
    if (ModelClass === Todo) {
      reqQueryFind = reqQueryFind.populate('createdBy', 'name email avatar');
    }
    const results = await reqQueryFind.sort({ scheduledAt: 1, createdAt: -1 });

    const sanitized = results.map(f => {
      const doc = f.toObject ? f.toObject() : { ...f };
      doc.type = type || (ModelClass === Todo ? 'todo' : ModelClass === Task ? 'task' : 'call_followup');
      doc.scheduledAt = doc.scheduledAt || doc.dueDate || doc.startDate || doc.createdAt;
      doc.dueDate = doc.dueDate || doc.scheduledAt;
      doc.note = doc.note || doc.description || doc.title || '';
      doc.title = doc.title || doc.note || doc.description || '';
      doc.description = doc.description || doc.note || doc.title || '';
      if (doc.status === 'completed') doc.status = 'done';
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
  if (actor.role === 'admin' || actor.role === 'superadmin' || actor.role === 'manager') return true;
  const desig = String(actor.designation || '').trim().toUpperCase();
  if (['HR', 'CEO', 'MANAGING DIRECTOR', 'MD', 'CTO', 'DEVELOPER', 'TRAINER', 'TRAINERS', 'DIGITAL MARKETING', 'DEGITAL MARKETING'].includes(desig)) {
    return true;
  }
  if (assigneeId.toString() === actor._id.toString()) return true;
  return false;
}

// POST /api/followups
router.post('/', protect, async (req, res) => {
  try {
    if (req.body.assignedTo && !(await canAssignTo(req.user, req.body.assignedTo))) {
      return res.status(403).json({ message: 'You are not allowed to assign tasks to this user' });
    }

    const { recurrence, ...body } = req.body;
    const itemType = body.type || 'call_followup';
    const ModelClass = getTargetModel(itemType);

    const frequency = recurrence?.frequency;
    const hasRecurrence = frequency && frequency !== 'none';

    const baseDoc = {
      ...body,
      type: itemType,
      assignedTo: req.body.assignedTo || req.user._id,
      assignedBy: req.body.assignedBy || req.user._id,
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
    if (baseDoc.assignedBy && mongoose.Types.ObjectId.isValid(baseDoc.assignedBy)) {
      await followup.populate('assignedBy', 'name email');
    } else if (baseDoc.assignedBy === 'all' || baseDoc.assignedBy === 'All') {
      followup.assignedBy = { _id: 'all', name: 'All' };
    }

    fireAndForget(() => notifyAdminsTaskCreated({ followup, performedByUser: req.user }));

    return res.status(201).json({ followup });
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

    let existing = await Task.findById(req.params.id);
    let ModelClass = Task;
    if (!existing) {
      existing = await Todo.findById(req.params.id);
      ModelClass = Todo;
    }
    if (!existing) {
      existing = await FollowUp.findById(req.params.id);
      ModelClass = FollowUp;
    }
    if (!existing) return res.status(404).json({ message: 'Item not found' });

    const isAdminOrMgr = req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'manager';
    if (!isAdminOrMgr) {
      const isAssignedUser = String(existing.assignedTo || '') === String(req.user._id) ||
                             String(existing.createdBy || '') === String(req.user._id);
      if (!isAssignedUser) {
        return res.status(403).json({ message: 'You can only update tasks assigned to you.' });
      }
    }

    const update = { ...req.body };
    if ((update.status === 'done' || update.status === 'completed')) {
      if (!update.completedAt) update.completedAt = new Date();
      update.completedBy = req.user._id;
    }
    const followup = await ModelClass.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('lead', 'name phone status')
      .populate('assignedTo', 'name email avatar')
      .populate('assignedBy', 'name email avatar')
      .populate('completedBy', 'name email avatar');

    if (!followup) return res.status(404).json({ message: 'Item not found' });

    fireAndForget(() => notifyAdminsTaskEdited({ followup, performedByUser: req.user }));

    res.json({ followup });
  } catch (err) {
    console.error('[PUT /followups/:id]', err);
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/followups/:id/status
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    let existing = await Task.findById(req.params.id);
    let ModelClass = Task;
    if (!existing) {
      existing = await Todo.findById(req.params.id);
      ModelClass = Todo;
    }
    if (!existing) {
      existing = await FollowUp.findById(req.params.id);
      ModelClass = FollowUp;
    }
    if (!existing) return res.status(404).json({ message: 'Item not found' });

    const update = { status: (status === 'completed' || status === 'done') ? 'done' : status };
    if (update.status === 'done') {
      update.completedAt = new Date();
      update.completedBy = req.user._id;
    }

    const followup = await ModelClass.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('lead', 'name phone status')
      .populate('assignedTo', 'name email avatar')
      .populate('assignedBy', 'name email avatar')
      .populate('completedBy', 'name email avatar');

    res.json({ followup });
  } catch (err) {
    console.error('[PATCH /followups/:id/status]', err);
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/followups/:id
router.patch('/:id', protect, async (req, res) => {
  try {
    let existing = await Task.findById(req.params.id);
    let ModelClass = Task;
    if (!existing) {
      existing = await Todo.findById(req.params.id);
      ModelClass = Todo;
    }
    if (!existing) {
      existing = await FollowUp.findById(req.params.id);
      ModelClass = FollowUp;
    }
    if (!existing) return res.status(404).json({ message: 'Item not found' });

    const update = { ...req.body };
    if (update.status === 'done' || update.status === 'completed') {
      update.status = 'done';
      update.completedAt = update.completedAt || new Date();
      update.completedBy = req.user._id;
    }

    const followup = await ModelClass.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('lead', 'name phone status')
      .populate('assignedTo', 'name email avatar')
      .populate('assignedBy', 'name email avatar')
      .populate('completedBy', 'name email avatar');

    res.json({ followup });
  } catch (err) {
    console.error('[PATCH /followups/:id]', err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/followups/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    let target = await Task.findById(req.params.id);
    let ModelClass = Task;
    if (!target) {
      target = await Todo.findById(req.params.id);
      ModelClass = Todo;
    }
    if (!target) {
      target = await FollowUp.findById(req.params.id);
      ModelClass = FollowUp;
    }
    if (!target) return res.status(404).json({ message: 'Item not found' });

    const isAdmin = isStrictAdmin(req.user) || isManager(req.user);

    const createdById = extractId(target.createdBy);
    const assignedToId = extractId(target.assignedTo);
    const assignedById = extractId(target.assignedBy);
    const currentUserId = String(req.user._id);

    const isOwnerOrAssignee =
      createdById === currentUserId ||
      assignedToId === currentUserId ||
      assignedById === currentUserId;

    if (!isAdmin && !isOwnerOrAssignee) {
      return res.status(403).json({ message: 'You are not authorized to delete this item.' });
    }

    if (target.recurringGroupId) {
      await ModelClass.deleteMany({ recurringGroupId: target.recurringGroupId });
    } else {
      await ModelClass.findByIdAndDelete(target._id);
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

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
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