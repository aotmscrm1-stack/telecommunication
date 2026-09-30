const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const FollowUp = require('../models/FollowUp');
const Task = require('../models/Task');
const Todo = require('../models/Todo');
const Lead = require('../models/Lead');
const { protect, authorize } = require('../middleware/auth');
const { notifyAdminsTaskCreated, notifyAdminsTaskEdited } = require('../services/notificationService');

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

// Helper to check executive/admin status
function isExecutiveOrAdmin(user) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'superadmin') return true;
  const desig = String(user.designation || '').trim().toUpperCase();
  return ['CEO', 'MANAGING DIRECTOR', 'MD', 'CTO'].includes(desig);
}

// GET /api/followups
router.get('/', protect, async (req, res) => {
  try {
    const { status, date, due: dueQuery, callerId, type, forMe: forMeQuery, leadId } = req.query;
    const query = {};

    if (leadId) {
      query.lead = leadId;
    }

    const isAdmin = isExecutiveOrAdmin(req.user);
    const isMgr = req.user.role === 'manager';
    const forMe = forMeQuery === 'true';

    // Role-based visibility scoping
    if (!isAdmin) {
      if (isMgr && !forMe) {
        if (callerId && callerId !== 'all') {
          query.$or = [{ assignedTo: callerId }, { assignedBy: callerId }, { createdBy: callerId }];
        } else if (req.user.department) {
          query.$or = [
            { assignedTo: req.user._id },
            { assignedBy: req.user._id },
            { createdBy: req.user._id },
            { department: req.user.department }
          ];
        } else {
          query.$or = [{ assignedTo: req.user._id }, { assignedBy: req.user._id }, { createdBy: req.user._id }];
        }
      } else {
        // Employees / Callers see ONLY their own tasks, todos, and follow-ups
        query.$or = [{ assignedTo: req.user._id }, { assignedBy: req.user._id }, { createdBy: req.user._id }];
      }
    } else {
      // Admin Panel: Full Visibility across all members
      if (forMe) {
        query.$or = [{ assignedTo: req.user._id }, { assignedBy: req.user._id }, { createdBy: req.user._id }];
      } else if (callerId && callerId !== 'all') {
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

// DELETE /api/followups/:id
router.delete('/:id', protect, authorize('admin', 'superadmin', 'manager'), async (req, res) => {
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

    if (req.query.series === 'true' && target.recurringGroupId) {
      const result = await ModelClass.deleteMany({
        recurringGroupId: target.recurringGroupId,
        scheduledAt: { $gte: target.scheduledAt },
      });
      return res.json({ message: 'Deleted series', count: result.deletedCount });
    }

    await ModelClass.findByIdAndDelete(req.params.id);
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