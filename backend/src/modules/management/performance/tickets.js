const express = require('express');
const router = express.Router();
const { protect } = require('../../../core/middleware/auth');
const PerformanceTicket = require('../../../database/models/PerformanceTicket');
const PerformanceAuditLog = require('../../../database/models/PerformanceAuditLog');
const User = require('../../../database/models/User');

/**
 * GET /api/performance/tickets
 * Query governance tickets with multi-filter and natural sorting
 */
router.get('/', protect, async (req, res) => {
  try {
    const { 
      date, 
      employeeId, 
      department, 
      checkpoint, 
      triggerType, 
      priority, 
      status, 
      forMe 
    } = req.query;

    const query = {};
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';

    if (forMe === 'true' || !isAdmin) {
      query.employee = req.user._id;
    } else if (employeeId) {
      query.employee = employeeId;
    }

    if (date) query.incidentDate = date;
    if (department) query.department = department;
    if (checkpoint) query.checkpoint = checkpoint;
    if (triggerType) query.triggerType = triggerType;
    if (priority) query.priority = priority;
    if (status) query.status = status;

    const tickets = await PerformanceTicket.find(query)
      .populate('employee', 'name email employeeId department avatar')
      .populate('assignedManager', 'name email')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ ok: true, count: tickets.length, tickets });
  } catch (err) {
    console.error('[GET /performance/tickets]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * GET /api/performance/tickets/:id
 * Single ticket detail
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const ticket = await PerformanceTicket.findById(req.params.id)
      .populate('employee', 'name email employeeId department avatar')
      .populate('relatedAttendance')
      .populate('relatedTasks')
      .populate('assignedManager', 'name email')
      .populate('resolvedBy', 'name email')
      .populate('responses.author', 'name role avatar');

    if (!ticket) {
      return res.status(404).json({ ok: false, message: 'Ticket not found' });
    }

    // Access control: Employee can only view own ticket unless manager/admin
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    if (!isAdmin && String(ticket.employee?._id || ticket.employee) !== String(req.user._id)) {
      return res.status(403).json({ ok: false, message: 'Unauthorized to view this ticket' });
    }

    res.json({ ok: true, ticket });
  } catch (err) {
    console.error('[GET /performance/tickets/:id]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * POST /api/performance/tickets/:id/explain
 * Employee submits an explanation or dispute
 */
router.post('/:id/explain', protect, async (req, res) => {
  try {
    const { explanation, attachments } = req.body;
    if (!explanation || !explanation.trim()) {
      return res.status(400).json({ ok: false, message: 'Explanation message is required' });
    }

    const ticket = await PerformanceTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ ok: false, message: 'Ticket not found' });
    }

    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    if (!isAdmin && String(ticket.employee) !== String(req.user._id)) {
      return res.status(403).json({ ok: false, message: 'Only the ticket assignee or manager can submit explanations' });
    }

    ticket.employeeExplanation = explanation.trim();
    ticket.isDisputed = true;
    ticket.status = 'under_review';

    ticket.responses.push({
      author: req.user._id,
      authorRole: req.user.role,
      message: explanation.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
      createdAt: new Date()
    });

    ticket.timeline.push({
      action: 'explanation_submitted',
      performedBy: req.user._id,
      notes: `Explanation submitted by ${req.user.name}: "${explanation.trim().slice(0, 100)}"`,
      timestamp: new Date()
    });

    await ticket.save();

    // Audit log
    await PerformanceAuditLog.create({
      entityType: 'TICKET',
      entityId: ticket._id,
      action: 'EXPLANATION_SUBMITTED',
      performedBy: req.user._id,
      performedByRole: req.user.role,
      reason: explanation.trim(),
      timestamp: new Date()
    }).catch(() => {});

    res.json({ ok: true, message: 'Explanation recorded successfully', ticket });
  } catch (err) {
    console.error('[POST /performance/tickets/:id/explain]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * POST /api/performance/tickets/:id/resolve
 * Management resolution with corrective action plan
 */
router.post('/:id/resolve', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    if (!isAdmin) {
      return res.status(403).json({ ok: false, message: 'Only Admin or Manager can resolve compliance tickets' });
    }

    const { resolutionNotes, correctiveActionPlan, status = 'resolved' } = req.body;
    if (!resolutionNotes || !resolutionNotes.trim()) {
      return res.status(400).json({ ok: false, message: 'Resolution notes are required' });
    }

    const ticket = await PerformanceTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ ok: false, message: 'Ticket not found' });
    }

    ticket.status = status;
    ticket.resolvedBy = req.user._id;
    ticket.resolvedAt = new Date();
    ticket.resolutionNotes = resolutionNotes.trim();
    if (correctiveActionPlan) {
      ticket.correctiveActionPlan = correctiveActionPlan.trim();
    }

    ticket.timeline.push({
      action: `ticket_${status}`,
      performedBy: req.user._id,
      notes: `Resolved by ${req.user.name}: "${resolutionNotes.trim().slice(0, 100)}"`,
      timestamp: new Date()
    });

    await ticket.save();

    // Audit log
    await PerformanceAuditLog.create({
      entityType: 'TICKET',
      entityId: ticket._id,
      action: 'TICKET_RESOLVED',
      performedBy: req.user._id,
      performedByRole: req.user.role,
      reason: resolutionNotes.trim(),
      newState: { status, resolutionNotes, correctiveActionPlan },
      timestamp: new Date()
    }).catch(() => {});

    res.json({ ok: true, message: 'Ticket resolved successfully', ticket });
  } catch (err) {
    console.error('[POST /performance/tickets/:id/resolve]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;

