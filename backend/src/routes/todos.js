const express = require('express');
const mongoose = require('mongoose');
const Todo = require('../models/Todo');
const User = require('../models/User');
const FollowUp = require('../models/FollowUp');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { notifyAdminsTaskCreated } = require('../services/notificationService');

const router = express.Router();

// Auto-sync legacy followups with type='todo' into Todo documents
async function syncFollowUpTodos() {
  try {
    const legacyTodos = await FollowUp.find({ type: 'todo' }).lean();
    if (!legacyTodos.length) return;

    for (const f of legacyTodos) {
      if (!f.title && !f.note) continue;
      const titleText = (f.title || f.note || '').trim();
      if (!titleText) continue;

      const exists = await Todo.findOne({ title: titleText, assignedTo: f.assignedTo, dueDate: f.scheduledAt });
      if (!exists) {
        let validCreatedBy = f.assignedBy;
        if (validCreatedBy && typeof validCreatedBy === 'object' && validCreatedBy._id) {
          validCreatedBy = validCreatedBy._id;
        }
        if (!validCreatedBy || !mongoose.Types.ObjectId.isValid(validCreatedBy)) {
          validCreatedBy = f.assignedTo;
        }

        await Todo.create({
          title: titleText,
          description: f.note || '',
          type: 'assigned',
          createdBy: validCreatedBy,
          assignedTo: f.assignedTo,
          department: f.department || 'HR',
          departmentId: (f.departmentId && mongoose.Types.ObjectId.isValid(f.departmentId)) ? f.departmentId : undefined,
          priority: f.priority || 'high',
          status: f.status === 'done' ? 'completed' : f.status === 'cancelled' ? 'cancelled' : 'pending',
          dueDate: f.scheduledAt || new Date(),
          startDate: f.createdAt || new Date(),
          checklist: [],
          comments: [],
          attachments: [],
          activityLog: [{ action: 'Todo created from task history', performedBy: f.assignedTo, timestamp: f.createdAt || new Date() }]
        });
      }
    }
  } catch (err) {
    console.error('Error syncing legacy followups to todos:', err);
  }
}

// Helper to check if actor can assign work to assignee
async function canAssignTodo(actor, assigneeId, targetDept) {
  if (!assigneeId) return true;
  if (actor.role === 'admin' || actor.role === 'superadmin') return true;
  
  const actorDept = String(actor.department || '').trim().toLowerCase();
  const actorDesig = String(actor.designation || '').trim().toLowerCase();

  // Executives & Admin roles have full cross-department assignment permissions
  if (['managing director', 'md', 'cto', 'ceo'].includes(actorDesig)) {
    return true;
  }

  // Assigning to self is always allowed
  if (assigneeId.toString() === actor._id.toString()) {
    return true;
  }

  // Managers can assign within their department
  if (actor.role === 'manager' || actorDesig.includes('manager') || actorDesig.includes('hr')) {
    const assignee = await User.findById(assigneeId);
    if (!assignee) return false;
    const assigneeDept = String(assignee.department || '').trim().toLowerCase();
    if (actorDept && assigneeDept && actorDept === assigneeDept) return true;
    if (actorDesig.includes('hr')) return true; // HR can delegate work to staff
  }

  return false;
}

// ── GET /api/todos/stats - Role-Tailored Todo Statistics ──────────────────────
router.get('/stats', protect, async (req, res) => {
  try {
    await syncFollowUpTodos();
    const user = req.user;
    const userDept = String(user.department || '').trim();
    let query = {};

    if (user.role === 'admin' || ['managing director', 'md', 'cto', 'ceo'].includes(String(user.designation || '').toLowerCase())) {
      // Admin: Organization-wide
      query = {};
    } else if (user.role === 'manager' || String(user.designation || '').toLowerCase().includes('manager')) {
      // Manager: Team / Department + Own
      query = {
        $or: [
          { department: userDept },
          { assignedTo: user._id },
          { createdBy: user._id }
        ]
      };
    } else {
      // Employee: Assigned to me or Created by me
      query = {
        $or: [
          { assignedTo: user._id },
          { createdBy: user._id }
        ]
      };
    }

    const todos = await Todo.find(query).lean();
    const now = new Date();

    let total = todos.length;
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let cancelled = 0;
    let overdue = 0;

    const deptCounts = {};
    const employeeCounts = {};

    todos.forEach(t => {
      if (t.status === 'pending') pending++;
      else if (t.status === 'in_progress') inProgress++;
      else if (t.status === 'completed') completed++;
      else if (t.status === 'cancelled') cancelled++;

      if (t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && new Date(t.dueDate) < now) {
        overdue++;
      }

      const dName = t.department || 'General';
      deptCounts[dName] = (deptCounts[dName] || 0) + 1;

      const empId = String(t.assignedTo || 'Unassigned');
      employeeCounts[empId] = (employeeCounts[empId] || 0) + 1;
    });

    res.json({
      success: true,
      stats: {
        total,
        pending,
        inProgress,
        completed,
        cancelled,
        overdue,
        deptCounts,
        employeeCounts
      }
    });
  } catch (err) {
    console.error('[GET /api/todos/stats Error]:', err);
    res.status(500).json({ message: 'Failed to fetch todo stats' });
  }
});

// ── GET /api/todos - List Todos with Scoping & Filtering ──────────────────────
router.get('/', protect, async (req, res) => {
  try {
    await syncFollowUpTodos();
    const { status, priority, department, assignedTo, createdBy, due, type, search } = req.query;
    const user = req.user;
    const userDept = String(user.department || '').trim();
    const query = {};

    // 1. Role-based Scope
    if (user.role === 'admin' || ['managing director', 'md', 'cto', 'ceo'].includes(String(user.designation || '').toLowerCase())) {
      // Admin: view all, unless filtered by department or user
      if (department && department !== 'All' && department !== 'all') {
        query.department = department;
      }
      if (assignedTo && assignedTo !== 'all') {
        query.assignedTo = assignedTo;
      }
    } else if (user.role === 'manager' || String(user.designation || '').toLowerCase().includes('manager')) {
      // Manager scope
      query.$or = [
        { department: userDept },
        { assignedTo: user._id },
        { createdBy: user._id }
      ];
      if (assignedTo && assignedTo !== 'all') {
        query.assignedTo = assignedTo;
      }
    } else {
      // Employee scope: strictly own assigned or created
      query.$or = [
        { assignedTo: user._id },
        { createdBy: user._id }
      ];
    }

    // 2. Query Filters
    if (type && type !== 'all') {
      query.type = type;
    }
    if (status && status !== 'all') {
      const statuses = status.split(',').map(s => s.trim());
      query.status = { $in: statuses };
    }
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    if (createdBy && createdBy !== 'all') {
      query.createdBy = createdBy;
    }

    // 3. Due Date Filter
    if (due) {
      const now = new Date();
      if (due === 'today') {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setHours(23, 59, 59, 999);
        query.dueDate = { $gte: start, $lte: end };
      } else if (due === 'overdue') {
        query.dueDate = { $lt: now };
        query.status = { $nin: ['completed', 'cancelled'] };
      } else if (due === 'upcoming') {
        query.dueDate = { $gte: now };
        query.status = { $nin: ['completed', 'cancelled'] };
      }
    }

    // 4. Search Filter
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$and = (query.$and || []).concat([
        {
          $or: [
            { title: regex },
            { description: regex },
            { 'checklist.title': regex }
          ]
        }
      ]);
    }

    const todos = await Todo.find(query)
      .populate('createdBy', 'name email avatar designation department')
      .populate('assignedTo', 'name email avatar designation department')
      .populate('comments.user', 'name avatar designation')
      .populate('activityHistory.performedBy', 'name avatar')
      .sort({ dueDate: 1, createdAt: -1 });

    res.json({ success: true, count: todos.length, todos });
  } catch (err) {
    console.error('[GET /api/todos Error]:', err);
    res.status(500).json({ message: 'Failed to fetch todos' });
  }
});

// ── GET /api/todos/:id - Single Todo Detail View ──────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id)
      .populate('createdBy', 'name email avatar designation department phone')
      .populate('assignedTo', 'name email avatar designation department phone')
      .populate('comments.user', 'name avatar designation')
      .populate('activityHistory.performedBy', 'name avatar');

    if (!todo) {
      return res.status(404).json({ message: 'Todo item not found' });
    }

    res.json({ success: true, todo });
  } catch (err) {
    console.error('[GET /api/todos/:id Error]:', err);
    res.status(500).json({ message: 'Failed to fetch todo item details' });
  }
});

// ── POST /api/todos - Create New Todo ─────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const {
      title,
      description,
      type = 'personal',
      assignedTo,
      department,
      departmentId,
      priority = 'medium',
      startDate,
      dueDate,
      checklist = [],
      attachments = []
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Todo title is required' });
    }

    if (!dueDate) {
      return res.status(400).json({ message: 'Due date is required' });
    }

    const targetAssigneeId = assignedTo || req.user._id;

    // Backend Permission Enforcement
    const isAllowed = await canAssignTodo(req.user, targetAssigneeId, department);
    if (!isAllowed) {
      return res.status(403).json({ message: 'You do not have permission to assign todos to this employee.' });
    }

    // Auto-resolve Department if not provided
    let finalDept = department;
    if (!finalDept && targetAssigneeId.toString() !== req.user._id.toString()) {
      const assigneeUser = await User.findById(targetAssigneeId);
      finalDept = assigneeUser?.department || req.user.department || '';
    } else if (!finalDept) {
      finalDept = req.user.department || '';
    }

    const formattedChecklist = (Array.isArray(checklist) ? checklist : []).map(item => ({
      title: typeof item === 'string' ? item : item.title,
      completed: false
    }));

    const formattedAttachments = (Array.isArray(attachments) ? attachments : []).map(att => ({
      name: att.name || 'Attachment',
      url: att.url || att,
      uploadedAt: new Date()
    }));

    // Initial Activity History Entry
    const initialActivity = [{
      action: 'Todo Created',
      performedBy: req.user._id,
      details: `Created by ${req.user.name} and assigned to ${targetAssigneeId.toString() === req.user._id.toString() ? 'Self' : 'Employee'}`,
      timestamp: new Date()
    }];

    const todo = await Todo.create({
      title: title.trim(),
      description: (description || '').trim(),
      type: targetAssigneeId.toString() === req.user._id.toString() ? 'personal' : 'assigned',
      createdBy: req.user._id, // System controlled! Never manual frontend selection
      assignedTo: targetAssigneeId,
      department: finalDept,
      departmentId: departmentId || undefined,
      priority,
      status: 'pending',
      startDate: startDate ? new Date(startDate) : new Date(),
      dueDate: new Date(dueDate),
      checklist: formattedChecklist,
      attachments: formattedAttachments,
      activityHistory: initialActivity
    });

    await todo.populate('createdBy', 'name email avatar designation department');
    await todo.populate('assignedTo', 'name email avatar designation department');

    // Create Notification if assigned to someone else
    if (targetAssigneeId.toString() !== req.user._id.toString()) {
      try {
        await Notification.create({
          recipient: targetAssigneeId,
          sender: req.user._id,
          type: 'task_assigned',
          title: 'New Todo Assigned',
          message: `${req.user.name} assigned you a todo: "${title.trim()}" (Due: ${new Date(dueDate).toLocaleDateString()})`,
          link: `/tasks?todoId=${todo._id}`
        });
      } catch (nErr) {
        console.warn('Failed to send todo assignment notification:', nErr.message);
      }
    }

    res.status(201).json({ success: true, todo });
  } catch (err) {
    console.error('[POST /api/todos Error]:', err);
    res.status(500).json({ message: err.message || 'Failed to create todo' });
  }
});

// ── PUT /api/todos/:id - Update Todo Details ──────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: 'Todo not found' });

    const { title, description, priority, startDate, dueDate } = req.body;

    if (title) todo.title = title.trim();
    if (description !== undefined) todo.description = description.trim();
    if (priority) todo.priority = priority;
    if (startDate) todo.startDate = new Date(startDate);
    if (dueDate) todo.dueDate = new Date(dueDate);

    todo.activityHistory.push({
      action: 'Todo Details Updated',
      performedBy: req.user._id,
      details: `Updated details by ${req.user.name}`,
      timestamp: new Date()
    });

    await todo.save();
    await todo.populate('createdBy', 'name email avatar designation department');
    await todo.populate('assignedTo', 'name email avatar designation department');

    res.json({ success: true, todo });
  } catch (err) {
    console.error('[PUT /api/todos/:id Error]:', err);
    res.status(500).json({ message: err.message || 'Failed to update todo' });
  }
});

// ── PATCH /api/todos/:id/status - Update Status & Track Completion ────────────
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: 'Todo not found' });

    const oldStatus = todo.status;
    todo.status = status;

    if (status === 'completed') {
      todo.completedAt = new Date();
      // Auto-complete all checklist items when todo is completed
      todo.checklist.forEach(item => {
        item.completed = true;
        item.completedAt = new Date();
      });
    } else if (oldStatus === 'completed' && status !== 'completed') {
      todo.completedAt = undefined;
    }

    todo.activityHistory.push({
      action: status === 'completed' ? 'Todo Completed' : `Status Changed to ${status.replace('_', ' ')}`,
      performedBy: req.user._id,
      details: `Status changed from "${oldStatus}" to "${status}" by ${req.user.name}`,
      timestamp: new Date()
    });

    await todo.save();
    await todo.populate('createdBy', 'name email avatar designation department');
    await todo.populate('assignedTo', 'name email avatar designation department');

    // Notify creator / manager when completed by employee
    if (status === 'completed' && todo.createdBy.toString() !== req.user._id.toString()) {
      try {
        await Notification.create({
          recipient: todo.createdBy,
          sender: req.user._id,
          type: 'task_completed',
          title: 'Todo Completed',
          message: `${req.user.name} completed the todo: "${todo.title}"`,
          link: `/tasks?todoId=${todo._id}`
        });
      } catch (nErr) {
        console.warn('Completion notification error:', nErr.message);
      }
    }

    res.json({ success: true, todo });
  } catch (err) {
    console.error('[PATCH /api/todos/:id/status Error]:', err);
    res.status(500).json({ message: 'Failed to update todo status' });
  }
});

// ── PATCH /api/todos/:id/assign - Reassign Todo ───────────────────────────────
router.patch('/:id/assign', protect, async (req, res) => {
  try {
    const { assignedTo } = req.body;
    if (!assignedTo) return res.status(400).json({ message: 'assignedTo user ID is required' });

    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: 'Todo not found' });

    const isAllowed = await canAssignTodo(req.user, assignedTo, todo.department);
    if (!isAllowed) {
      return res.status(403).json({ message: 'You do not have permission to reassign work to this employee.' });
    }

    const newAssignee = await User.findById(assignedTo);
    if (!newAssignee) return res.status(404).json({ message: 'Assignee user not found' });

    todo.assignedTo = assignedTo;
    if (newAssignee.department) todo.department = newAssignee.department;

    todo.activityHistory.push({
      action: 'Todo Reassigned',
      performedBy: req.user._id,
      details: `Reassigned to ${newAssignee.name} by ${req.user.name}`,
      timestamp: new Date()
    });

    await todo.save();
    await todo.populate('createdBy', 'name email avatar designation department');
    await todo.populate('assignedTo', 'name email avatar designation department');

    res.json({ success: true, todo });
  } catch (err) {
    console.error('[PATCH /api/todos/:id/assign Error]:', err);
    res.status(500).json({ message: 'Failed to reassign todo' });
  }
});

// ── POST /api/todos/:id/checklist - Add Checklist Item ───────────────────────
router.post('/:id/checklist', protect, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Checklist item title is required' });
    }

    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: 'Todo not found' });

    todo.checklist.push({
      title: title.trim(),
      completed: false
    });

    todo.activityHistory.push({
      action: 'Checklist Item Added',
      performedBy: req.user._id,
      details: `Added "${title.trim()}" to checklist`,
      timestamp: new Date()
    });

    await todo.save();
    await todo.populate('createdBy', 'name email avatar designation department');
    await todo.populate('assignedTo', 'name email avatar designation department');

    res.json({ success: true, todo });
  } catch (err) {
    console.error('[POST /api/todos/:id/checklist Error]:', err);
    res.status(500).json({ message: 'Failed to add checklist item' });
  }
});

// ── PATCH /api/todos/:id/checklist/:itemId - Toggle Checklist Item ────────────
router.patch('/:id/checklist/:itemId', protect, async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: 'Todo not found' });

    const item = todo.checklist.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Checklist item not found' });

    item.completed = !item.completed;
    item.completedAt = item.completed ? new Date() : undefined;

    // Calculate completed count
    const completedCount = todo.checklist.filter(c => c.completed).length;
    const totalCount = todo.checklist.length;

    todo.activityHistory.push({
      action: 'Checklist Progress Updated',
      performedBy: req.user._id,
      details: `Marked "${item.title}" as ${item.completed ? 'completed' : 'pending'} (${completedCount}/${totalCount} done)`,
      timestamp: new Date()
    });

    await todo.save();
    await todo.populate('createdBy', 'name email avatar designation department');
    await todo.populate('assignedTo', 'name email avatar designation department');

    res.json({ success: true, todo });
  } catch (err) {
    console.error('[PATCH /api/todos/:id/checklist/:itemId Error]:', err);
    res.status(500).json({ message: 'Failed to toggle checklist item' });
  }
});

// ── DELETE /api/todos/:id/checklist/:itemId - Remove Checklist Item ──────────
router.delete('/:id/checklist/:itemId', protect, async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: 'Todo not found' });

    todo.checklist.pull({ _id: req.params.itemId });

    todo.activityHistory.push({
      action: 'Checklist Item Removed',
      performedBy: req.user._id,
      details: `Removed checklist item by ${req.user.name}`,
      timestamp: new Date()
    });

    await todo.save();
    await todo.populate('createdBy', 'name email avatar designation department');
    await todo.populate('assignedTo', 'name email avatar designation department');

    res.json({ success: true, todo });
  } catch (err) {
    console.error('[DELETE /api/todos/:id/checklist/:itemId Error]:', err);
    res.status(500).json({ message: 'Failed to remove checklist item' });
  }
});

// ── POST /api/todos/:id/comments - Add Comment ────────────────────────────────
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: 'Todo not found' });

    todo.comments.push({
      user: req.user._id,
      text: text.trim()
    });

    todo.activityHistory.push({
      action: 'Comment Added',
      performedBy: req.user._id,
      details: `Commented: "${text.trim().slice(0, 40)}${text.length > 40 ? '...' : ''}"`,
      timestamp: new Date()
    });

    await todo.save();
    await todo.populate('createdBy', 'name email avatar designation department');
    await todo.populate('assignedTo', 'name email avatar designation department');
    await todo.populate('comments.user', 'name avatar designation');

    res.json({ success: true, todo });
  } catch (err) {
    console.error('[POST /api/todos/:id/comments Error]:', err);
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

// ── POST /api/todos/:id/attachments - Add Attachment ──────────────────────────
router.post('/:id/attachments', protect, async (req, res) => {
  try {
    const { name, url } = req.body;
    if (!url || !url.trim()) {
      return res.status(400).json({ message: 'Attachment URL is required' });
    }

    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: 'Todo not found' });

    todo.attachments.push({
      name: name?.trim() || 'Document',
      url: url.trim(),
      uploadedAt: new Date()
    });

    todo.activityHistory.push({
      action: 'Attachment Uploaded',
      performedBy: req.user._id,
      details: `Uploaded attachment: "${name?.trim() || 'Document'}"`,
      timestamp: new Date()
    });

    await todo.save();
    await todo.populate('createdBy', 'name email avatar designation department');
    await todo.populate('assignedTo', 'name email avatar designation department');

    res.json({ success: true, todo });
  } catch (err) {
    console.error('[POST /api/todos/:id/attachments Error]:', err);
    res.status(500).json({ message: 'Failed to add attachment' });
  }
});

// ── DELETE /api/todos/:id - Delete Todo ───────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: 'Todo not found' });

    // Only Admin, Creator, or Manager can delete
    const isCreator = todo.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isManager = req.user.role === 'manager';

    if (!isAdmin && !isCreator && !isManager) {
      return res.status(403).json({ message: 'You do not have permission to delete this todo item.' });
    }

    await todo.deleteOne();
    res.json({ success: true, message: 'Todo item deleted successfully' });
  } catch (err) {
    console.error('[DELETE /api/todos/:id Error]:', err);
    res.status(500).json({ message: 'Failed to delete todo item' });
  }
});

module.exports = router;
