const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const Todo = require('../models/Todo');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

function isExecutiveOrAdmin(user) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'manager') return true;
  const desig = String(user.designation || '').trim().toUpperCase();
  const dept = String(user.department || '').trim().toUpperCase();
  return (
    ['CEO', 'MANAGING DIRECTOR', 'MD', 'CTO', 'HR', 'ADMIN', 'MANAGER'].includes(desig) ||
    desig.includes('DIRECTOR') ||
    desig.includes('MANAGER') ||
    desig.includes('HR') ||
    ['ADMIN', 'MANAGEMENT', 'HR'].includes(dept)
  );
}

// GET /api/todos — fetch todos from 'todos' collection with role-based visibility
router.get('/', protect, async (req, res) => {
  try {
    const { status, date, due: dueQuery, callerId, forMe: forMeQuery } = req.query;
    const query = {};

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
        // Employees / Callers see ONLY their own todos
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

// POST /api/todos
router.post('/', protect, async (req, res) => {
  try {
    const baseDoc = {
      ...req.body,
      type: 'todo',
      createdBy: req.user._id,
      assignedTo: req.body.assignedTo || req.user._id,
      assignedBy: req.body.assignedBy || req.user._id,
    };
    const todo = await Todo.create(baseDoc);
    await todo.populate('assignedTo', 'name email');
    if (baseDoc.assignedBy && mongoose.Types.ObjectId.isValid(baseDoc.assignedBy)) {
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

// DELETE /api/todos/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const target = await Todo.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'Todo not found' });

    const isAdmin = isExecutiveOrAdmin(req.user);
    const isOwnerOrAssignee =
      String(target.createdBy || '') === String(req.user._id) ||
      String(target.assignedTo || '') === String(req.user._id) ||
      String(target.assignedBy || '') === String(req.user._id);

    if (!isAdmin && !isOwnerOrAssignee) {
      return res.status(403).json({ message: 'You are not authorized to delete this todo.' });
    }

    await Todo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('[DELETE /todos/:id]', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
