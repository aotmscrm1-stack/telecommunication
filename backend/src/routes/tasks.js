const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const { protect, authorize } = require('../middleware/auth');
const { notifyAdminsTaskCreated, notifyAdminsTaskEdited } = require('../services/notificationService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function fireAndForget(fn) {
  try {
    Promise.resolve(fn()).catch(err => console.error('[notification] fire-and-forget error:', err.message));
  } catch (err) {
    console.error('[notification] sync error:', err.message);
  }
}

function isExecutiveOrAdmin(user) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'superadmin') return true;
  const desig = String(user.designation || '').trim().toUpperCase();
  return ['CEO', 'MANAGING DIRECTOR', 'MD', 'CTO'].includes(desig);
}

// GET /api/tasks — fetch official tasks from 'tasks' collection
router.get('/', protect, async (req, res) => {
  try {
    const { status, date, due: dueQuery, callerId, forMe: forMeQuery, leadId } = req.query;
    const query = { type: 'task' };

    if (leadId) query.lead = leadId;

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
        // Employees / Callers see ONLY their own tasks
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

// DELETE /api/tasks/:id
router.delete('/:id', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('[DELETE /tasks/:id]', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
