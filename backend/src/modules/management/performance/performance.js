const express = require('express');
const router = express.Router();
const { protect } = require('../../../core/middleware/auth');
const User = require('../../../database/models/User');
const Attendance = require('../../../database/models/Attendance');
const Todo = require('../../../database/models/Todo');
const DailyActivity = require('../../../database/models/DailyActivity');
const EmployeePerformanceDaily = require('../../../database/models/EmployeePerformanceDaily');
const PerformanceTicket = require('../../../database/models/PerformanceTicket');
const PerformanceAuditLog = require('../../../database/models/PerformanceAuditLog');
const ComplianceJobState = require('../../../database/models/ComplianceJobState');
const { runMorning10AmCheck } = require('../../../jobs/workers/morningComplianceChecker');

/**
 * Natural employee ID comparator (AOTMS-01, AOTMS-02, ..., AOTMS-10)
 */
function compareByEmployeeId(a, b) {
  const strA = String(a?.employeeId || a?.employeeCode || '').trim();
  const strB = String(b?.employeeId || b?.employeeCode || '').trim();
  if (!strA && !strB) return String(a?.name || a?.employeeName || '').localeCompare(String(b?.name || b?.employeeName || ''));
  if (!strA) return 1;
  if (!strB) return -1;
  return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Computes the 5-pillar scores and composite score for a given employee and date
 */
async function computeDailyEmployeeScore(employee, dateStr) {
  const startOfDay = new Date(`${dateStr}T00:00:00.000+05:30`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999+05:30`);

  // Pillar 1: Task Completion (30%)
  const dailyTasks = await Todo.find({
    assignedTo: employee._id,
    $or: [
      { scheduledAt: { $gte: startOfDay, $lte: endOfDay } },
      { scheduledAt: null, createdAt: { $gte: startOfDay, $lte: endOfDay } }
    ]
  }).select('status note comments');

  let taskScore = 85.00; // Baseline when zero tasks assigned
  if (dailyTasks.length > 0) {
    let completedPoints = 0;
    dailyTasks.forEach(t => {
      const isDone = t.status === 'completed' || t.status === 'done';
      const hasReason = Boolean((t.note && t.note.trim()) || (Array.isArray(t.comments) && t.comments.length > 0));
      if (isDone) {
        completedPoints += 1.0;
      } else if (t.status === 'in_progress' && hasReason) {
        completedPoints += 0.75;
      } else if (t.status === 'pending' && hasReason) {
        completedPoints += 0.50;
      }
    });
    taskScore = Number(((completedPoints / dailyTasks.length) * 100).toFixed(2));
  }

  // Pillar 2: Productivity (25%)
  const attendance = await Attendance.findOne({ employeeId: employee._id, date: dateStr }).sort({ startTime: -1 });
  let prodScore = 0.00;
  if (attendance) {
    const workSeconds = attendance.actualWorkSeconds || attendance.durationSeconds || 0;
    const targetSeconds = 8 * 3600; // 8 hours net target
    prodScore = Math.min(100.00, Number(((workSeconds / targetSeconds) * 100).toFixed(2)));
  }

  // Pillar 3: Attendance & Punctuality (15%)
  let attScore = 0.00;
  if (attendance && attendance.startTime) {
    const loginTime = new Date(attendance.startTime);
    const loginTimeStr = loginTime.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
    if (loginTimeStr <= '09:30:00') {
      attScore = 100.00;
    } else if (loginTimeStr <= '09:45:00') {
      attScore = 85.00;
    } else if (loginTimeStr <= '10:00:00') {
      attScore = 60.00;
    } else {
      attScore = 20.00;
    }
  }

  // Pillar 4: Work Quality (20%) - Baseline 85.00 if unmeasured
  const qualityScore = 85.00;

  // Pillar 5: Discipline & Daily Reporting (10%)
  const dailyReport = await DailyActivity.findOne({ employeeId: employee._id, activityDate: dateStr });
  let discScore = 0.00;
  if (dailyReport && dailyReport.submittedAt) {
    const reportTime = new Date(dailyReport.submittedAt).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
    if (reportTime <= '19:30:00') {
      discScore = 100.00;
    } else if (reportTime <= '21:00:00') {
      discScore = 70.00;
    } else {
      discScore = 40.00;
    }
  }

  // Composite Calculation: 30% tasks, 25% prod, 15% att, 20% quality, 10% disc
  const composite = (taskScore * 0.30) + (prodScore * 0.25) + (attScore * 0.15) + (qualityScore * 0.20) + (discScore * 0.10);
  const compositeScore = Number(composite.toFixed(2));

  let category = 'ORANGE';
  if (compositeScore >= 85.00) category = 'GREEN';
  else if (compositeScore < 65.00) category = 'RED';

  return {
    pillarScores: {
      taskCompletion: taskScore,
      productivity: prodScore,
      attendance: attScore,
      workQuality: qualityScore,
      discipline: discScore
    },
    compositeScore,
    category
  };
}

/**
 * GET /api/performance/overview
 * Executive summary and department metrics
 */
router.get('/overview', protect, async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const activeUsers = await User.find({ isActive: { $ne: false } }).select('_id name employeeId department');
    const records = await EmployeePerformanceDaily.find({ date: dateStr });

    const greenCount = records.filter(r => r.category === 'GREEN').length;
    const orangeCount = records.filter(r => r.category === 'ORANGE').length;
    const redCount = records.filter(r => r.category === 'RED').length;

    const avgScore = records.length > 0
      ? Number((records.reduce((acc, r) => acc + r.compositeScore, 0) / records.length).toFixed(2))
      : 0;

    res.json({
      ok: true,
      date: dateStr,
      totalEmployees: activeUsers.length,
      evaluatedEmployees: records.length,
      distribution: {
        green: greenCount,
        orange: orangeCount,
        red: redCount
      },
      averageScore: avgScore
    });
  } catch (err) {
    console.error('[GET /performance/overview]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * GET /api/performance/roster
 * Full roster of all employees with their 5-pillar scores AND their raised tickets
 */
router.get('/roster', protect, async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const { department, category } = req.query;
    const now = new Date();
    const istTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
    const isToday = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === dateStr;

    // If past 10:00 AM on today, ensure morning compliance sweep has run
    if (isToday && istTimeStr >= '10:00:00') {
      const state = await ComplianceJobState.findOne({ jobName: 'MORNING_10AM_COMPLIANCE', date: dateStr });
      if (!state || state.status !== 'completed') {
        try {
          await runMorning10AmCheck(dateStr, 'roster_auto_sweep');
          await ComplianceJobState.findOneAndUpdate(
            { jobName: 'MORNING_10AM_COMPLIANCE', date: dateStr },
            { $set: { status: 'completed', lastRunCompletedAt: now } },
            { upsert: true }
          );
        } catch (e) {}
      }
    }

    // Fetch all active employees
    const userQuery = { isActive: { $ne: false } };
    if (department && department !== 'ALL') {
      userQuery.department = { $regex: new RegExp(`^${department}$`, 'i') };
    }
    const allEmployees = await User.find(userQuery).select('_id name email employeeId department avatar designation role');

    // Fetch all tickets for today
    const ticketsToday = await PerformanceTicket.find({ incidentDate: dateStr })
      .select('ticketNumber employee employeeName employeeCode department triggerType priority status missingRequirement title description employeeExplanation isDisputed resolutionNotes correctiveActionPlan createdAt');

    // Build map of tickets per employee
    const ticketsByEmployee = {};
    ticketsToday.forEach(t => {
      const empKey = String(t.employee);
      if (!ticketsByEmployee[empKey]) ticketsByEmployee[empKey] = [];
      ticketsByEmployee[empKey].push(t);
    });

    // Compute or fetch daily scores for every employee
    const rosterList = [];
    for (const emp of allEmployees) {
      let perfRecord = await EmployeePerformanceDaily.findOne({ employee: emp._id, date: dateStr }).lean();

      if (!perfRecord) {
        const computed = await computeDailyEmployeeScore(emp, dateStr);
        try {
          perfRecord = await EmployeePerformanceDaily.findOneAndUpdate(
            { employee: emp._id, date: dateStr },
            {
              $set: {
                employeeCode: emp.employeeId || '',
                employeeName: emp.name,
                department: emp.department || 'General',
                pillarScores: computed.pillarScores,
                compositeScore: computed.compositeScore,
                category: computed.category
              }
            },
            { upsert: true, new: true }
          ).lean();
        } catch (e) {
          perfRecord = {
            _id: `temp_${emp._id}`,
            employee: emp._id,
            employeeCode: emp.employeeId || '',
            employeeName: emp.name,
            department: emp.department || 'General',
            pillarScores: computed.pillarScores,
            compositeScore: computed.compositeScore,
            category: computed.category
          };
        }
      }

      // Attach employee details and tickets
      perfRecord.employee = emp;
      perfRecord.tickets = ticketsByEmployee[String(emp._id)] || [];

      // Check category filter
      if (!category || category === 'ALL' || perfRecord.category === category) {
        rosterList.push(perfRecord);
      }
    }

    // Natural numeric sort by employee ID (AOTMS-01, AOTMS-02, ..., AOTMS-10)
    rosterList.sort((a, b) => {
      const empA = a.employee || { employeeId: a.employeeCode, name: a.employeeName };
      const empB = b.employee || { employeeId: b.employeeCode, name: b.employeeName };
      return compareByEmployeeId(empA, empB);
    });

    res.json({ ok: true, count: rosterList.length, roster: rosterList });
  } catch (err) {
    console.error('[GET /performance/roster]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * POST /api/performance/override/:id
 * Manual score override with audit recording
 */
router.post('/override/:id', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    if (!isAdmin) {
      return res.status(403).json({ ok: false, message: 'Only Admin or Manager can override performance scores' });
    }

    const { newScore, reason } = req.body;
    if (newScore === undefined || isNaN(newScore) || newScore < 0 || newScore > 100) {
      return res.status(400).json({ ok: false, message: 'Valid new score between 0 and 100 is required' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ ok: false, message: 'Mandatory override reason is required' });
    }

    const record = await EmployeePerformanceDaily.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ ok: false, message: 'Performance record not found' });
    }

    const prevScore = record.compositeScore;
    record.originalScore = record.originalScore !== undefined ? record.originalScore : prevScore;
    record.compositeScore = Number(Number(newScore).toFixed(2));
    record.isOverridden = true;
    record.overrideReason = reason.trim();
    record.overriddenBy = req.user._id;
    record.overriddenAt = new Date();

    if (record.compositeScore >= 85.00) record.category = 'GREEN';
    else if (record.compositeScore < 65.00) record.category = 'RED';
    else record.category = 'ORANGE';

    await record.save();

    // Audit log
    await PerformanceAuditLog.create({
      entityType: 'SCORE',
      entityId: record._id,
      action: 'SCORE_OVERRIDDEN',
      performedBy: req.user._id,
      performedByRole: req.user.role,
      previousState: { compositeScore: prevScore },
      newState: { compositeScore: record.compositeScore, category: record.category },
      reason: reason.trim(),
      timestamp: new Date()
    }).catch(() => {});

    res.json({ ok: true, message: 'Score successfully overridden', record });
  } catch (err) {
    console.error('[POST /performance/override]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
