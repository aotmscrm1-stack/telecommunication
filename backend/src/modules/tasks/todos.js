const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const Todo = require('../../database/models/Todo');
const { protect, authorize } = require('../../core/middleware/auth');

const router = express.Router();

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

function isValidId(val) {
  return val && mongoose.Types.ObjectId.isValid(val);
}

// GET /api/todos — fetch todos from 'todos' collection with role-based visibility
router.get('/', protect, async (req, res) => {
  try {
    const { status, date, due: dueQuery, callerId, userId: queryUserId, forMe: forMeQuery } = req.query;
    const query = {};

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
          return res.status(403).json({ message: "You are not authorized to view another user's todo list." });
        }
        query.$or = [{ assignedTo: targetId }, { assignedBy: targetId }, { createdBy: targetId }];
      }
    } else if (!isAdmin) {
      if (isMgr && !forMe) {
        if (callerId && callerId !== 'all' && isValidId(callerId)) {
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
        // Developer, Trainer, Digital Marketing, Employee Panels: ONLY see own todos!
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

    const todos = await Todo.find(query)
      .populate('lead', 'name phone status')
      .populate('assignedTo', 'name avatar')
      .populate('assignedBy', 'name avatar')
      .populate('createdBy', 'name avatar')
      .populate('completedBy', 'name avatar')
      .sort({ createdAt: -1 });

    const sanitized = todos.map(f => {
      const doc = f.toObject ? f.toObject() : { ...f };
      doc.type = 'todo';
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

    res.json({ followups: sanitized, todos: sanitized });
  } catch (err) {
    console.error('[GET /todos]', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/todos/user/:userId — Direct User ID linked endpoint for Todos
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = userId === 'me' ? req.user._id : (isValidId(userId) ? userId : req.user._id);

    const isAdmin = isStrictAdmin(req.user);
    const isMgr = isManager(req.user);

    if (!isAdmin && !isMgr && String(targetUserId) !== String(req.user._id)) {
      return res.status(403).json({ message: "You are not authorized to view another user's todo list." });
    }

    const query = {
      $or: [
        { assignedTo: targetUserId },
        { createdBy: targetUserId },
        { assignedBy: targetUserId }
      ]
    };

    if (req.query.status) {
      query.status = req.query.status;
    }

    const todos = await Todo.find(query)
      .populate('lead', 'name phone status')
      .populate('assignedTo', 'name email avatar designation department')
      .populate('assignedBy', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('completedBy', 'name email avatar')
      .sort({ scheduledAt: 1, createdAt: -1 });

    const sanitized = todos.map(f => {
      const doc = f.toObject ? f.toObject() : { ...f };
      doc.type = 'todo';
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
        } else {
          doc.assignedBy = doc.assignedTo || { _id: 'all', name: 'All' };
        }
      }
      return doc;
    });

    res.json({ ok: true, userId: targetUserId, todos: sanitized, followups: sanitized });
  } catch (err) {
    console.error('[GET /todos/user/:userId]', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/todos
router.post('/', protect, async (req, res) => {
  try {
    const assignedToVal = isValidId(req.body.assignedTo) ? req.body.assignedTo : req.user._id;
    const assignedByVal = isValidId(req.body.assignedBy) ? req.body.assignedBy : req.user._id;

    const baseDoc = {
      ...req.body,
      type: 'todo',
      createdBy: req.user._id,
      assignedTo: assignedToVal,
      assignedBy: assignedByVal,
    };
    const todo = await Todo.create(baseDoc);
    await todo.populate('assignedTo', 'name email');
    if (baseDoc.assignedBy && isValidId(baseDoc.assignedBy)) {
      await todo.populate('assignedBy', 'name email');
    }

    res.status(201).json({ followup: todo, todo });
  } catch (err) {
    console.error('[POST /todos]', err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/todos/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.status === 'done' || update.status === 'completed') {
      update.completedAt = update.completedAt || new Date();
      update.completedBy = req.user._id;
    }
    const todo = await Todo.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('assignedTo', 'name email avatar')
      .populate('assignedBy', 'name email avatar')
      .populate('completedBy', 'name email avatar');
    if (!todo) return res.status(404).json({ message: 'Todo not found' });

    res.json({ followup: todo, todo });
  } catch (err) {
    console.error('[PUT /todos/:id]', err);
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/todos/:id/status
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const update = { status: (status === 'completed' || status === 'done') ? 'done' : status };
    if (update.status === 'done') {
      update.completedAt = new Date();
      update.completedBy = req.user._id;
    }
    const todo = await Todo.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('assignedTo', 'name email avatar')
      .populate('assignedBy', 'name email avatar')
      .populate('completedBy', 'name email avatar');
    if (!todo) return res.status(404).json({ message: 'Todo not found' });

    res.json({ followup: todo, todo });
  } catch (err) {
    console.error('[PATCH /todos/:id/status]', err);
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/todos/:id
router.patch('/:id', protect, async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.status === 'done' || update.status === 'completed') {
      update.status = 'done';
      update.completedAt = update.completedAt || new Date();
      update.completedBy = req.user._id;
    }
    const todo = await Todo.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('assignedTo', 'name email avatar')
      .populate('assignedBy', 'name email avatar')
      .populate('completedBy', 'name email avatar');
    if (!todo) return res.status(404).json({ message: 'Todo not found' });

    res.json({ followup: todo, todo });
  } catch (err) {
    console.error('[PATCH /todos/:id]', err);
    res.status(500).json({ message: err.message });
  }
});

function extractId(val) {
  if (!val) return '';
  if (typeof val === 'object') return String(val._id || val.id || '');
  return String(val);
}

// DELETE /api/todos/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    let target = await Todo.findById(req.params.id);
    let ModelClass = Todo;
    if (!target) {
      target = await Task.findById(req.params.id);
      ModelClass = Task;
    }
    if (!target) return res.status(404).json({ message: 'Todo not found' });

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
      return res.status(403).json({ message: 'You are not authorized to delete this todo.' });
    }

    if (target.recurringGroupId) {
      await ModelClass.deleteMany({ recurringGroupId: target.recurringGroupId });
    } else {
      await ModelClass.findByIdAndDelete(target._id);
    }

    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('[DELETE /todos/:id]', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
