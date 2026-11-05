const express = require('express');
const router = express.Router();
const { protect } = require('../../../core/middleware/auth');
const User = require('../../../database/models/User');
const Attendance = require('../../../database/models/Attendance');
const Todo = require('../../../database/models/Todo');
const PerformanceTicket = require('../../../database/models/PerformanceTicket');
const ComplianceJobState = require('../../../database/models/ComplianceJobState');
const { runMorning10AmCheck } = require('../../../jobs/workers/morningComplianceChecker');

/**
 * GET /api/performance/compliance/today
 * Full workforce summary for Checkpoint 1 (10 AM) and Checkpoint 2 (Logout)
 */
router.get('/today', protect, async (req, res) => {
  try {
    const todayStr = req.query.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const cutoff10Am = new Date(`${todayStr}T10:00:00.000+05:30`);
    const now = new Date();
    const istTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
    const isToday = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === todayStr;

    // If viewing today and past 10:00 AM IST, ensure the morning sweep has been evaluated
    if (isToday && istTimeStr >= '10:00:00') {
      const state = await ComplianceJobState.findOne({ jobName: 'MORNING_10AM_COMPLIANCE', date: todayStr });
      if (!state || state.status !== 'completed') {
        try {
          await runMorning10AmCheck(todayStr, 'auto_today_query');
          await ComplianceJobState.findOneAndUpdate(
            { jobName: 'MORNING_10AM_COMPLIANCE', date: todayStr },
            { $set: { status: 'completed', lastRunCompletedAt: now } },
            { upsert: true }
          );
        } catch (sweepErr) {
          console.warn('[Auto-sweep Notice]', sweepErr.message);
        }
      }
    }

    const activeEmployees = await User.find({ isActive: { $ne: false } })
      .select('_id name employeeId department role');

    const totalActive = activeEmployees.length;

    // Tickets generated for today
    const tickets = await PerformanceTicket.find({ incidentDate: todayStr });
    const dualViolations = tickets.filter(t => t.triggerType === 'MORNING_COMPLIANCE_DUAL_VIOLATION').length;
    const attendanceMissingTickets = tickets.filter(t => t.triggerType === 'ATTENDANCE_NON_COMPLIANCE').length;
    const taskMissingTickets = tickets.filter(t => t.triggerType === 'DAILY_TASK_SUBMISSION_MISSING').length;
    const logoutTickets = tickets.filter(t => t.triggerType === 'SHIFT_TASK_UPDATE_MISSING').length;

    // Attendances
    const attendances = await Attendance.find({ date: todayStr });
    const attendanceOnTime = attendances.filter(a => a.startTime && new Date(a.startTime) <= cutoff10Am).length;
    const attendanceLate = attendances.filter(a => a.startTime && new Date(a.startTime) > cutoff10Am).length;
    const attendanceMissing = Math.max(0, totalActive - attendances.length);

    // Calculate compliant count
    const totalViolations = dualViolations + attendanceMissingTickets + taskMissingTickets;
    const fullyCompliantMorning = Math.max(0, totalActive - totalViolations);

    res.json({
      ok: true,
      date: todayStr,
      metrics: {
        totalActive,
        fullyCompliantMorning,
        attendanceOnTime,
        attendanceLate,
        attendanceMissing,
        attendanceMissingTickets,
        taskMissingTickets,
        dualViolations,
        logoutTickets,
        totalTicketsToday: tickets.length
      }
    });
  } catch (err) {
    console.error('[GET /compliance/today]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * GET /api/performance/compliance/my-status
 * Current user status for Checkpoint 1 & Checkpoint 2
 */
router.get('/my-status', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const cutoff10Am = new Date(`${todayStr}T10:00:00.000+05:30`);
    const startOfDay = new Date(`${todayStr}T00:00:00.000+05:30`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999+05:30`);

    // Checkpoint 1: Attendance
    const attendance = await Attendance.findOne({
      employeeId: userId,
      date: todayStr
    }).sort({ startTime: -1 });

    const attendanceMarked = !!attendance;
    const attendanceOnTime = attendance && new Date(attendance.startTime) <= cutoff10Am;

    // Checkpoint 1: Tasks
    const tasks = await Todo.find({
      assignedTo: userId,
      $or: [
        { scheduledAt: { $gte: startOfDay, $lte: endOfDay } },
        { scheduledAt: null, createdAt: { $gte: startOfDay, $lte: endOfDay } }
      ]
    }).select('_id title status note comments activityHistory createdAt');

    const tasksUploadedOnTime = tasks.some(t => new Date(t.createdAt) <= cutoff10Am);

    // Checkpoint 2: Tasks un-updated for logout
    const unupdatedTasks = [];
    if (attendance) {
      for (const t of tasks) {
        const hasStatusUpdateToday = Array.isArray(t.activityHistory) && t.activityHistory.some((log) => {
          return (log.action === 'status_update' || log.action === 'status_confirmed') &&
                 new Date(log.timestamp) >= new Date(attendance.startTime);
        });
        const isCompleted = t.status === 'completed' || t.status === 'done';
        const hasReason = Boolean((t.note && t.note.trim()) || (Array.isArray(t.comments) && t.comments.length > 0));

        if (!hasStatusUpdateToday && !isCompleted) {
          unupdatedTasks.push({ id: t._id, title: t.title, status: t.status, missing: 'Status update needed' });
        } else if (!isCompleted && !hasReason) {
          unupdatedTasks.push({ id: t._id, title: t.title, status: t.status, missing: 'Reason required' });
        }
      }
    }

    // Tickets for today
    const myTickets = await PerformanceTicket.find({
      employee: userId,
      incidentDate: todayStr
    });

    res.json({
      ok: true,
      date: todayStr,
      checkpoint1: {
        attendanceMarked,
        attendanceOnTime,
        checkInTime: attendance?.startTime || null,
        tasksUploadedOnTime,
        taskCount: tasks.length
      },
      checkpoint2: {
        canLogoutSafely: unupdatedTasks.length === 0,
        unupdatedCount: unupdatedTasks.length,
        unupdatedTasks
      },
      ticketsToday: myTickets
    });
  } catch (err) {
    console.error('[GET /compliance/my-status]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * POST /api/performance/compliance/run-morning-sweep
 * Admin / Manager manual trigger of the 10:00 AM sweep
 */
router.post('/run-morning-sweep', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    if (!isAdmin) {
      return res.status(403).json({ ok: false, message: 'Only Admin or Manager can trigger compliance sweeps' });
    }

    const todayStr = req.body.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const summary = await runMorning10AmCheck(todayStr, `manual_${req.user._id}`);

    await ComplianceJobState.findOneAndUpdate(
      { jobName: 'MORNING_10AM_COMPLIANCE', date: todayStr },
      { $set: { status: 'completed', lastRunCompletedAt: new Date() } },
      { upsert: true }
    );

    res.json({
      ok: true,
      message: `Morning compliance sweep completed for ${todayStr}`,
      summary
    });
  } catch (err) {
    console.error('[POST /compliance/run-morning-sweep]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
