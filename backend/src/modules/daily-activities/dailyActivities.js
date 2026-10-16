const express = require('express');
const mongoose = require('mongoose');
const DailyActivity = require('../../database/models/DailyActivity');
const FollowUp = require('../../database/models/FollowUp');
const Lead = require('../../database/models/Lead');
const User = require('../../database/models/User');
const { protect, authorize } = require('../../core/middleware/auth');
const { validateDailyActivityPayload } = require('./validators');

const router = express.Router();

// Helper: Check if user has admin/management overview privileges
function canReviewReports(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  const desig = String(user.designation || '').toUpperCase();
  const isExecutive = desig === 'MANAGING DIRECTOR' || desig === 'MD' || desig === 'CTO' || desig === 'CEO' || desig === 'HR';
  return role === 'admin' || role === 'manager' || isExecutive;
}

// ── 1. GET /calendar: Return date status dots for a month ──────────────────────
router.get('/calendar', protect, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7); // Format: YYYY-MM
    let targetEmployeeId = req.user._id;

    // Admin/Manager can query a specific employee's calendar
    if (req.query.employeeId && canReviewReports(req.user)) {
      if (mongoose.Types.ObjectId.isValid(req.query.employeeId)) {
        targetEmployeeId = new mongoose.Types.ObjectId(req.query.employeeId);
      }
    }

    const monthRegex = new RegExp(`^${month}`);
    const items = await DailyActivity.find({
      employeeId: targetEmployeeId,
      activityDate: monthRegex,
    })
      .select('activityDate status metrics.callsAttempted')
      .lean();

    const days = items.map(it => ({
      date: it.activityDate,
      status: it.status,
      callsAttempted: it.metrics?.callsAttempted || 0,
    }));

    res.json({
      success: true,
      month,
      days,
    });
  } catch (err) {
    console.error('[DailyActivity] /calendar error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch calendar status markers: ' + err.message });
  }
});

// ── 2. GET /: Fetch activity report for a specific date ────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    let targetEmployeeId = req.user._id;

    if (req.query.employeeId && canReviewReports(req.user)) {
      if (mongoose.Types.ObjectId.isValid(req.query.employeeId)) {
        targetEmployeeId = new mongoose.Types.ObjectId(req.query.employeeId);
      }
    }

    const activity = await DailyActivity.findOne({
      employeeId: targetEmployeeId,
      activityDate: date,
    })
      .populate('employee', 'name email role department designation avatar')
      .populate('reviewedBy', 'name email designation')
      .lean();

    res.json({
      success: true,
      activity: activity || null,
      userDepartment: req.user.department || 'Telecalling',
    });
  } catch (err) {
    console.error('[DailyActivity] GET / error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch daily activity: ' + err.message });
  }
});

// ── 3. POST /: Create or update draft report ──────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const body = req.body || {};
    const activityDate = body.activityDate || new Date().toISOString().slice(0, 10);
    const department = req.user.department || body.department || 'Telecalling';

    const payloadToValidate = {
      ...body,
      activityDate,
      department,
    };

    const validation = validateDailyActivityPayload(payloadToValidate, false);
    if (!validation.isValid) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed.',
        errors: validation.errors,
      });
    }

    // Check for existing report for this date
    let existing = await DailyActivity.findOne({
      employeeId: req.user._id,
      activityDate,
    });

    if (existing && existing.status === 'reviewed') {
      return res.status(409).json({
        success: false,
        message: 'This report has already been reviewed by management and cannot be modified.',
      });
    }

    if (existing && existing.status === 'submitted') {
      return res.status(409).json({
        success: false,
        message: 'This activity report was already submitted. If correction is needed, request manager review.',
      });
    }

    if (existing) {
      // Update existing draft or needs_correction record
      existing.department = department;
      if (body.metrics) existing.metrics = body.metrics;
      if (Array.isArray(body.outcomes)) existing.outcomes = body.outcomes;
      if (body.departmentData) existing.departmentData = body.departmentData;
      if (body.remarks !== undefined) existing.remarks = body.remarks;
      if (body.nextSteps !== undefined) existing.nextSteps = body.nextSteps;

      if (existing.status === 'needs_correction') {
        existing.revisions.push({
          editedAt: new Date(),
          editedBy: req.user._id,
          changesSummary: 'Draft updated following manager correction request.',
          previousStatus: 'needs_correction',
        });
      }

      await existing.save();
      return res.json({
        success: true,
        message: 'Daily activity draft saved successfully.',
        activity: existing,
      });
    }

    // Create new draft
    const newActivity = new DailyActivity({
      employeeId: req.user._id,
      department,
      activityDate,
      status: 'draft',
      metrics: body.metrics || {},
      outcomes: Array.isArray(body.outcomes) ? body.outcomes : [],
      departmentData: body.departmentData || {},
      remarks: body.remarks || '',
      nextSteps: body.nextSteps || '',
      revisions: [
        {
          editedAt: new Date(),
          editedBy: req.user._id,
          changesSummary: 'Initial draft created.',
          previousStatus: '',
        },
      ],
    });

    await newActivity.save();

    res.status(201).json({
      success: true,
      message: 'Daily activity draft created successfully.',
      activity: newActivity,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A report already exists for this date. Please refresh your view.',
      });
    }
    console.error('[DailyActivity] POST / error:', err);
    res.status(500).json({ success: false, message: 'Failed to save daily activity: ' + err.message });
  }
});

// ── 4. POST /:id/submit: Formally submit a daily activity report ──────────────
router.post('/:id/submit', protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID.' });
    }

    const activity = await DailyActivity.findById(id);
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity report not found.' });
    }

    // Ownership check
    const ownerId = activity.employeeId ? activity.employeeId.toString() : '';
    if (ownerId !== req.user._id.toString() && !canReviewReports(req.user)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to submit this report.' });
    }

    if (activity.status === 'submitted') {
      return res.status(400).json({ success: false, message: 'This report is already submitted.' });
    }

    // Optional payload updates upon submission
    const body = req.body || {};
    if (body.metrics) activity.metrics = body.metrics;
    if (Array.isArray(body.outcomes)) activity.outcomes = body.outcomes;
    if (body.departmentData) activity.departmentData = body.departmentData;
    if (body.remarks !== undefined) activity.remarks = body.remarks;
    if (body.nextSteps !== undefined) activity.nextSteps = body.nextSteps;

    const validation = validateDailyActivityPayload(activity.toObject(), true);
    if (!validation.isValid) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed for submission.',
        errors: validation.errors,
      });
    }

    const prevStatus = activity.status;
    activity.status = 'submitted';
    activity.submittedAt = new Date();
    activity.revisions.push({
      editedAt: new Date(),
      editedBy: req.user._id,
      changesSummary: `Report submitted for review. Previous status: '${prevStatus}'.`,
      previousStatus: prevStatus,
    });
    await activity.save();

    res.json({
      success: true,
      message: 'Daily activity submitted successfully.',
      activity,
    });
  } catch (err) {
    console.error('[DailyActivity] POST /:id/submit error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit daily activity: ' + err.message });
  }
});

// ── 5. GET /history: Paginated history of authenticated user's submissions ────
router.get('/history', protect, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { employeeId: req.user._id };

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    const [items, total] = await Promise.all([
      DailyActivity.find(query)
        .sort({ activityDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DailyActivity.countDocuments(query),
    ]);

    res.json({
      success: true,
      activities: items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    console.error('[DailyActivity] GET /history error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch activity history: ' + err.message });
  }
});

// ── 6. GET /follow-ups: Fetch telecaller's call follow-ups due today & upcoming ──
router.get('/follow-ups', protect, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const startOfToday = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfToday = new Date(`${todayStr}T23:59:59.999Z`);

    // 1. Fetch from FollowUp collection
    const followUps = await FollowUp.find({
      $or: [
        { assignedTo: req.user._id },
        { assignedTo: req.user.name },
        { createdBy: req.user._id },
      ],
      status: { $ne: 'Completed' },
    })
      .populate('leadId', 'name phone email status city')
      .sort({ dueDate: 1 })
      .limit(20)
      .lean();

    // 2. Also check leads directly assigned to this telecaller with a nextFollowUpDate
    const directLeads = await Lead.find({
      $or: [
        { assignedTo: req.user._id },
        { assignedEmployee: req.user._id },
      ],
      nextFollowUpDate: { $gte: startOfToday },
    })
      .select('name phone email status nextFollowUpDate notes')
      .sort({ nextFollowUpDate: 1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      followUps: followUps.map(f => ({
        _id: f._id,
        leadName: f.leadId?.name || f.clientName || 'Lead Contact',
        phone: f.leadId?.phone || f.phone || '',
        leadId: f.leadId?._id || null,
        dueTime: f.dueDate ? new Date(f.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        dueDate: f.dueDate ? new Date(f.dueDate).toISOString().slice(0, 10) : '',
        priority: f.priority || 'Medium',
        notes: f.notes || f.description || '',
        status: f.status || 'Pending',
      })),
      directLeads: directLeads.map(l => ({
        _id: l._id,
        leadName: l.name,
        phone: l.phone || '',
        leadId: l._id,
        dueTime: l.nextFollowUpDate ? new Date(l.nextFollowUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        dueDate: l.nextFollowUpDate ? new Date(l.nextFollowUpDate).toISOString().slice(0, 10) : '',
        notes: l.notes || '',
        status: l.status,
      })),
    });
  } catch (err) {
    console.error('[DailyActivity] GET /follow-ups error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch follow-ups: ' + err.message });
  }
});

// ── 7. GET /admin/overview: Admin / Manager multi-filter activity overview ──────
router.get('/admin/overview', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.department && req.query.department !== 'all') {
      query.department = new RegExp(`^${req.query.department.trim()}$`, 'i');
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    if (req.query.employeeId && req.query.employeeId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(req.query.employeeId)) {
        query.employeeId = new mongoose.Types.ObjectId(req.query.employeeId);
      }
    }

    if (req.query.from && req.query.to) {
      query.activityDate = { $gte: req.query.from, $lte: req.query.to };
    } else if (req.query.from) {
      query.activityDate = { $gte: req.query.from };
    } else if (req.query.to) {
      query.activityDate = { $lte: req.query.to };
    } else if (req.query.date) {
      query.activityDate = req.query.date;
    }

    // Search by employee name or email
    if (req.query.search && req.query.search.trim().length > 0) {
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: req.query.search.trim(), $options: 'i' } },
          { email: { $regex: req.query.search.trim(), $options: 'i' } },
        ],
      }).select('_id');

      const matchedIds = matchingUsers.map(u => u._id);
      if (query.employeeId) {
        // If employeeId is already set, verify intersection
        if (!matchedIds.some(id => id.toString() === query.employeeId.toString())) {
          return res.json({ success: true, activities: [], total: 0, page, totalPages: 1, summary: {} });
        }
      } else {
        query.employeeId = { $in: matchedIds };
      }
    }

    const [items, total, statusAgg] = await Promise.all([
      DailyActivity.find(query)
        .populate('employee', 'name email department designation avatar')
        .populate('reviewedBy', 'name email designation')
        .sort({ activityDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DailyActivity.countDocuments(query),
      DailyActivity.aggregate([
        { $match: query.activityDate ? { activityDate: query.activityDate } : {} },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const summary = {
      total,
      submitted: 0,
      draft: 0,
      reviewed: 0,
      needs_correction: 0,
    };

    statusAgg.forEach(s => {
      if (summary[s._id] !== undefined) {
        summary[s._id] = s.count;
      }
    });

    res.json({
      success: true,
      activities: items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      summary,
    });
  } catch (err) {
    console.error('[DailyActivity] /admin/overview error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch admin overview: ' + err.message });
  }
});

// ── 8. GET /:id: Detailed single report view ──────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID.' });
    }

    const activity = await DailyActivity.findById(id)
      .populate('employee', 'name email role department designation avatar')
      .populate('reviewedBy', 'name email designation')
      .populate('revisions.editedBy', 'name email')
      .lean();

    if (!activity) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    // RBAC: Check ownership or Admin permission
    const ownerId = (activity.employeeId && activity.employeeId._id)
      ? activity.employeeId._id.toString()
      : activity.employeeId ? activity.employeeId.toString() : '';
    if (ownerId !== req.user._id.toString() && !canReviewReports(req.user)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this report.' });
    }

    res.json({
      success: true,
      activity,
    });
  } catch (err) {
    console.error('[DailyActivity] GET /:id error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch report details: ' + err.message });
  }
});

// ── 9. PATCH /:id/review: Admin / Manager review workflow action ──────────────
router.patch('/:id/review', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, correctionReason } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID.' });
    }

    if (!['reviewed', 'needs_correction'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'reviewed' or 'needs_correction'.",
      });
    }

    if (status === 'needs_correction' && (!correctionReason || correctionReason.trim().length < 5)) {
      return res.status(422).json({
        success: false,
        message: 'A detailed reason is required when requesting correction.',
      });
    }

    const activity = await DailyActivity.findById(id);
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity report not found.' });
    }

    const previousStatus = activity.status;
    activity.status = status;
    activity.reviewedBy = req.user._id;
    activity.reviewedAt = new Date();
    activity.correctionReason = status === 'needs_correction' ? correctionReason.trim() : '';

    // Append to revision history
    const reviewerName = req.user.name || req.user.email || 'Manager';
    const reasonText = status === 'needs_correction' ? ` Reason: ${correctionReason.trim()}` : '';
    activity.revisions.push({
      editedAt: new Date(),
      editedBy: req.user._id,
      changesSummary: `Status changed from '${previousStatus}' to '${status}' by ${reviewerName}.${reasonText}`,
      previousStatus,
    });

    await activity.save();

    res.json({
      success: true,
      message: status === 'reviewed' ? 'Report approved and marked as reviewed.' : 'Correction requested from employee.',
      activity,
    });
  } catch (err) {
    console.error('[DailyActivity] PATCH /:id/review error:', err);
    res.status(500).json({ success: false, message: 'Failed to review activity report: ' + err.message });
  }
});

module.exports = router;
