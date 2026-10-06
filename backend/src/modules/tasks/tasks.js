const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const Task = require('../../database/models/Task');
const { protect, authorize } = require('../../core/middleware/auth');
const { notifyAdminsTaskCreated, notifyAdminsTaskEdited } = require('../../modules/notifications/notificationService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function fireAndForget(fn) {
  try {
    Promise.resolve(fn()).catch(err => console.error('[notification] fire-and-forget error:', err.message));
  } catch (err) {
    console.error('[notification] sync error:', err.message);
  }
}

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

function isManager(user) {
  if (!user) return false;
  const role = String(user.role || '').trim().toLowerCase();
  if (role === 'manager') return true;

  const desig = String(user.designation || '').trim().toUpperCase();
  return desig.includes('MANAGER') || desig.includes('HEAD') || desig.includes('LEAD') || desig.includes('SUPERVISOR');
}

// GET /api/tasks — fetch official tasks from 'tasks' collection
router.get('/', protect, async (req, res) => {
  try {
    const { status, date, due: dueQuery, callerId, userId: queryUserId, forMe: forMeQuery, leadId } = req.query;
    const query = { type: 'task' };

    if (leadId) query.lead = leadId;

    const isAdmin = isStrictAdmin(req.user);
    const isMgr = isManager(req.user);
    const forMe = forMeQuery === 'true';

    // Role-based visibility scoping
    if (queryUserId) {
      const targetId = queryUserId === 'me' ? req.user._id : queryUserId;
      if (!isAdmin && !isMgr && String(targetId) !== String(req.user._id)) {
        return res.status(403).json({ message: "You are not authorized to view another user's task list." });
      }
      query.$or = [{ assignedTo: targetId }, { assignedBy: targetId }, { createdBy: targetId }];
    } else if (!isAdmin) {
      if (isMgr && !forMe) {
        if (callerId && callerId !== 'all') {
          query.$or = [{ assignedTo: callerId }, { assignedBy: callerId }, { createdBy: callerId }];
        } else if (req.user.department) {
          const User = require('../../database/models/User');
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
        // Developer, Trainer, Digital Marketing, Employee Panels: ONLY see own tasks!
        query.$or = [{ assignedTo: req.user._id }, { assignedBy: req.user._id }, { createdBy: req.user._id }];
      }
    } else {
      // ONLY Admin Panel: Full Visibility across all members & departments
      if (forMe) {
        query.$or = [{ assignedTo: req.user._id }, { assignedBy: req.user._id }, { createdBy: req.user._id }];
      } else if (callerId && callerId !== 'all') {
        query.$or = [{ assignedTo: callerId }, { assignedBy: callerId }, { createdBy: callerId }];
      }
    }

    if (status) {
      const statuses = status.split(',').map(s => s.trim() === 'pending' ? 'upcoming' : s.trim());
      query.status = { $in: statuses };
    }

    const due = dueQuery || date;
    if (due) {
      if (due === 'today') {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setHours(23, 59, 59, 999);
        query.scheduledAt = { $gte: start, $lte: end };
      } else if (due === 'tomorrow') {
        const start = new Date(); start.setDate(start.getDate() + 1); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setDate(end.getDate() + 1); end.setHours(23, 59, 59, 999);
        query.scheduledAt = { $gte: start, $lte: end };
      }
    }

    const tasks = await Task.find(query)
      .populate('lead', 'name phone status')
      .populate('assignedTo', 'name avatar')
      .populate('assignedBy', 'name avatar')
      .sort({ scheduledAt: 1 });

    res.json({ followups: tasks, tasks });
  } catch (err) {
    console.error('[GET /tasks]', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tasks/user/:userId — Direct User ID linked endpoint for Tasks
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = userId === 'me' ? req.user._id : userId;

    const isAdmin = isStrictAdmin(req.user);
    const isMgr = isManager(req.user);

    if (!isAdmin && !isMgr && String(targetUserId) !== String(req.user._id)) {
      return res.status(403).json({ message: "You are not authorized to view another user's task list." });
    }

    const query = {
      type: 'task',
      $or: [
        { assignedTo: targetUserId },
        { createdBy: targetUserId },
        { assignedBy: targetUserId }
      ]
    };

    if (req.query.status) {
      query.status = req.query.status;
    }

    const tasks = await Task.find(query)
      .populate('lead', 'name phone status')
      .populate('assignedTo', 'name email avatar designation department')
      .populate('assignedBy', 'name email avatar')
      .sort({ scheduledAt: 1, createdAt: -1 });

    res.json({ ok: true, userId: targetUserId, tasks, followups: tasks });
  } catch (err) {
    console.error('[GET /tasks/user/:userId]', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tasks — create an official task in 'tasks' collection
router.post('/', protect, async (req, res) => {
  try {
    const baseDoc = {
      ...req.body,
      type: 'task',
      assignedTo: req.body.assignedTo || req.user._id,
      assignedBy: req.body.assignedBy || req.user._id,
      createdBy: req.user._id,
    };
    const task = await Task.create(baseDoc);
    await task.populate('lead', 'name phone status');
    await task.populate('assignedTo', 'name email');
    if (baseDoc.assignedBy && mongoose.Types.ObjectId.isValid(baseDoc.assignedBy)) {
      await task.populate('assignedBy', 'name email');
    }

    fireAndForget(() => notifyAdminsTaskCreated({ followup: task, performedByUser: req.user }));
    res.status(201).json({ followup: task, task });
  } catch (err) {
    console.error('[POST /tasks]', err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.status === 'done' && !update.completedAt) {
      update.completedAt = new Date();
    }
    const task = await Task.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('lead', 'name phone status')
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    res.json({ followup: task, task });
  } catch (err) {
    console.error('[PUT /tasks/:id]', err);
    res.status(500).json({ message: err.message });
  }
});

function extractId(val) {
  if (!val) return '';
  if (typeof val === 'object') return String(val._id || val.id || '');
  return String(val);
}

// DELETE /api/tasks/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    let target = await Task.findById(req.params.id);
    let ModelClass = Task;
    if (!target) {
      target = await Todo.findById(req.params.id);
      ModelClass = Todo;
    }
    if (!target) return res.status(404).json({ message: 'Task not found' });

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
      return res.status(403).json({ message: 'You are not authorized to delete this task.' });
    }

    if (target.recurringGroupId) {
      await ModelClass.deleteMany({ recurringGroupId: target.recurringGroupId });
    } else {
      await ModelClass.findByIdAndDelete(target._id);
    }

    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('[DELETE /tasks/:id]', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
