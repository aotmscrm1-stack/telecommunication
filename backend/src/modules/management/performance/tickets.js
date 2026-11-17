const express = require('express');
const router = express.Router();
const { protect } = require('../../../core/middleware/auth');
const PerformanceTicket = require('../../../database/models/PerformanceTicket');
const PerformanceAuditLog = require('../../../database/models/PerformanceAuditLog');
const Attendance = require('../../../database/models/Attendance');
const Todo = require('../../../database/models/Todo');
const User = require('../../../database/models/User');
const {
  isDigitalCalendarUser,
  findCalendarTasksForRange,
  bucketCalendarTasksByDay
} = require('../../../core/utils/digitalCalendarTasks');

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
 * GET /api/performance/tickets/summary
 * Master statistics for the 10 KPI Dashboard Cards
 */
router.get('/summary', protect, async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const cutoff10Am = new Date(`${dateStr}T10:00:00.000+05:30`);

    const activeEmployees = await User.find({ isActive: { $ne: false } }).select('_id');
    const totalEmployees = activeEmployees.length;

    // All tickets for dateStr
    const todayTickets = await PerformanceTicket.find({ incidentDate: dateStr });
    
    // Violation Breakdown for dateStr
    const attendanceMissing = todayTickets.filter(t => t.triggerType === 'ATTENDANCE_NON_COMPLIANCE').length;
    const todoMissing = todayTickets.filter(t => t.triggerType === 'DAILY_TASK_SUBMISSION_MISSING').length;
    const dualViolations = todayTickets.filter(t => t.triggerType === 'MORNING_COMPLIANCE_DUAL_VIOLATION').length;
    const totalViolationsToday = attendanceMissing + todoMissing + dualViolations;

    const fullyCompliant = Math.max(0, totalEmployees - totalViolationsToday);
    const complianceRate = totalEmployees > 0 
      ? Number(((fullyCompliant / totalEmployees) * 100).toFixed(1))
      : 100.0;

    // Ticket Status & Severity counts (across active / open database or for current query range)
    const allTickets = await PerformanceTicket.find();
    const totalOpenTickets = allTickets.filter(t => t.status === 'open' || t.status === 'acknowledged' || t.status === 'under_review').length;
    const orangeWarnings = allTickets.filter(t => t.priority === 'orange' || t.priority === 'medium' || t.priority === 'low').length;
    const redEscalations = allTickets.filter(t => t.priority === 'red' || t.priority === 'high').length;
    const criticalTickets = allTickets.filter(t => t.priority === 'critical').length;
    const resolvedTickets = allTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

    res.json({
      ok: true,
      date: dateStr,
      metrics: {
        totalEmployees,
        fullyCompliant,
        complianceRate,
        attendanceMissing,
        todoMissing,
        dualViolations,
        totalOpenTickets,
        orangeWarnings,
        redEscalations,
        criticalTickets,
        resolvedTickets
      }
    });
  } catch (err) {
    console.error('[GET /performance/tickets/summary]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

const TICKET_TYPE_BUCKETS = {
  ATTENDANCE_NON_COMPLIANCE: 'attendance',
  DAILY_TASK_SUBMISSION_MISSING: 'tasks',
  MORNING_COMPLIANCE_DUAL_VIOLATION: 'both'
};

// One overall ticket per week / month summarises the daily ones, so it never
// counts as a day in the roster, the calendar or the insights.
const OVERALL_TRIGGERS = ['WEEK_OVERALL_VIOLATION', 'MONTH_OVERALL_VIOLATION'];

const TICKET_CLOSED_STATUSES = ['resolved', 'closed', 'overridden', 'cleared', 'verified'];

function shiftDate(dateStr, deltaDays) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function emptyTicketBucket() {
  return { total: 0, attendance: 0, tasks: 0, both: 0, other: 0, open: 0, resolved: 0 };
}

function addTicketToBucket(bucket, ticket) {
  bucket.total += 1;
  const typeKey = TICKET_TYPE_BUCKETS[ticket.triggerType] || 'other';
  bucket[typeKey] += 1;
  if (TICKET_CLOSED_STATUSES.includes(ticket.status)) bucket.resolved += 1;
  else bucket.open += 1;
}

/**
 * GET /api/performance/tickets/insights
 * Day / week / month ticket totals plus a per-day breakdown for the selected month.
 * Green clearance passes are excluded: they are rewards, not tickets.
 */
router.get('/insights', protect, async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const monthStart = `${dateStr.slice(0, 7)}-01`;
    const monthEnd = shiftDate(shiftDate(monthStart, 32).slice(0, 7) + '-01', -1);

    const weekdayIndex = new Date(`${dateStr}T00:00:00.000Z`).getUTCDay(); // 0 = Sunday
    const weekStart = shiftDate(dateStr, -((weekdayIndex + 6) % 7));
    const weekEnd = shiftDate(weekStart, 6);

    const query = {
      incidentDate: { $gte: weekStart < monthStart ? weekStart : monthStart, $lte: weekEnd > monthEnd ? weekEnd : monthEnd },
      triggerType: { $nin: ['MORNING_COMPLIANCE_PASSED', ...OVERALL_TRIGGERS] },
      priority: { $ne: 'green' }
    };
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    if (!isAdmin) query.employee = req.user._id;

    const rangeTickets = await PerformanceTicket.find(query)
      .select('ticketNumber employee employeeName employeeCode department triggerType priority status incidentDate consecutiveCount missingRequirement title description createdAt')
      .sort({ incidentDate: -1, createdAt: -1 })
      .lean();

    // One bucket per calendar day of the selected month
    const days = [];
    for (let cursor = monthStart; cursor <= monthEnd; cursor = shiftDate(cursor, 1)) {
      days.push({ date: cursor, dayOfMonth: Number(cursor.slice(8, 10)), ...emptyTicketBucket() });
    }

    const dayIndex = new Map(days.map((day) => [day.date, day]));
    const week = emptyTicketBucket();
    // Exact per-employee counts for the roster column (the list below is capped)
    const byEmployee = {};
    const bumpEmployee = (employeeKey, field) => {
      const entry = byEmployee[employeeKey] || (byEmployee[employeeKey] = { today: 0, week: 0, month: 0 });
      entry[field] += 1;
    };

    rangeTickets.forEach((ticket) => {
      const bucket = dayIndex.get(ticket.incidentDate);
      if (bucket) addTicketToBucket(bucket, ticket);
      if (ticket.incidentDate >= weekStart && ticket.incidentDate <= weekEnd) {
        addTicketToBucket(week, ticket);
      }
      const employeeKey = String(ticket.employee || '');
      if (!employeeKey) return;
      if (ticket.incidentDate === dateStr) bumpEmployee(employeeKey, 'today');
      if (ticket.incidentDate >= weekStart && ticket.incidentDate <= weekEnd) bumpEmployee(employeeKey, 'week');
      if (ticket.incidentDate >= monthStart && ticket.incidentDate <= monthEnd) bumpEmployee(employeeKey, 'month');
    });

    const month = emptyTicketBucket();
    days.forEach((day) => {
      Object.keys(month).forEach((key) => { month[key] += day[key]; });
    });

    const todayBucket = dayIndex.get(dateStr);
    const today = todayBucket ? { ...todayBucket } : { date: dateStr, dayOfMonth: Number(dateStr.slice(8, 10)), ...emptyTicketBucket() };

    res.json({
      ok: true,
      date: dateStr,
      monthStart,
      monthEnd,
      weekStart,
      weekEnd,
      today,
      week: { startDate: weekStart, endDate: weekEnd, ...week },
      month: { startDate: monthStart, endDate: monthEnd, ...month },
      days,
      byEmployee,
      tickets: rangeTickets.slice(0, 200)
    });
  } catch (err) {
    console.error('[GET /performance/tickets/insights]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * GET /api/performance/tickets
 * Query governance tickets with multi-filter, pagination, and natural sorting
 */
router.get('/', protect, async (req, res) => {
  try {
    const { 
      search,
      date, 
      startDate,
      endDate,
      employeeId, 
      department, 
      checkpoint, 
      triggerType, 
      priority, 
      status, 
      forMe,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';

    if (forMe === 'true' || !isAdmin) {
      query.employee = req.user._id;
    } else if (employeeId && employeeId !== 'ALL') {
      query.employee = employeeId;
    }

    if (date) {
      query.incidentDate = date;
    } else if (startDate && endDate) {
      query.incidentDate = { $gte: startDate, $lte: endDate };
    }

    if (department && department !== 'ALL') query.department = { $regex: new RegExp(`^${department}$`, 'i') };
    if (checkpoint && checkpoint !== 'ALL') query.checkpoint = checkpoint;
    if (triggerType && triggerType !== 'ALL') query.triggerType = triggerType;
    
    if (priority && priority !== 'ALL') {
      if (priority === 'orange') {
        query.priority = { $in: ['orange', 'medium', 'low'] };
      } else if (priority === 'red') {
        query.priority = { $in: ['red', 'high'] };
      } else {
        query.priority = priority;
      }
    }

    if (status && status !== 'ALL') query.status = status;

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { ticketNumber: { $regex: q, $options: 'i' } },
        { employeeName: { $regex: q, $options: 'i' } },
        { employeeCode: { $regex: q, $options: 'i' } },
        { title: { $regex: q, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await PerformanceTicket.countDocuments(query);
    const tickets = await PerformanceTicket.find(query)
      .populate('employee', 'name email employeeId department avatar role')
      .populate('assignedManager', 'name email employeeId')
      .populate('resolvedBy', 'name email')
      .populate('overriddenBy', 'name email')
      .sort({ incidentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Natural sort by employee ID if requested, or preserve chronological order
    res.json({ 
      ok: true, 
      count: totalCount, 
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
      tickets 
    });
  } catch (err) {
    console.error('[GET /performance/tickets]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * GET /api/performance/tickets/employee-history/:employeeId
 * Monthly violation calendar and streak statistics for an employee
 */
router.get('/employee-history/:employeeId', protect, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const monthParam = req.query.month || todayStr.slice(0, 7); // "YYYY-MM"

    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    if (!isAdmin && String(req.user._id) !== String(employeeId)) {
      return res.status(403).json({ ok: false, message: 'Unauthorized to view this employee history' });
    }

    const employee = await User.findById(employeeId).select('name employeeId department designation email avatar');
    if (!employee) {
      return res.status(404).json({ ok: false, message: 'Employee not found' });
    }

    // An explicit start/end wins (week, today or any custom window),
    // otherwise the whole calendar month is used for the month grid.
    let rangeStart = req.query.start;
    let rangeEnd = req.query.end;
    if (!rangeStart || !rangeEnd) {
      const [year, month] = monthParam.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      rangeStart = `${monthParam}-01`;
      rangeEnd = `${monthParam}-${String(daysInMonth).padStart(2, '0')}`;
    }
    if (rangeStart > rangeEnd) [rangeStart, rangeEnd] = [rangeEnd, rangeStart];

    const rangeStartAt = new Date(`${rangeStart}T00:00:00.000+05:30`);
    const rangeEndAt = new Date(`${rangeEnd}T23:59:59.999+05:30`);

    // Four bulk queries instead of two per day, so the person view opens fast
    // Digital Marketing staff are read from their Digital Calendar instead of Todo.
    const usesDigitalCalendar = isDigitalCalendarUser(employee);
    const weekStartOf = (dateStr) => shiftDate(dateStr, -((new Date(`${dateStr}T00:00:00.000Z`).getUTCDay() + 6) % 7));
    const overallKeys = [
      `${employeeId}_WEEK_${weekStartOf(todayStr)}`,
      `${employeeId}_WEEK_${weekStartOf(rangeStart)}`,
      `${employeeId}_MONTH_${todayStr.slice(0, 7)}-01`,
      `${employeeId}_MONTH_${rangeStart.slice(0, 7)}-01`
    ];
    const [rangeTickets, streakTickets, attendanceRecords, taskRecords, calendarRecords, overallTickets] = await Promise.all([
      PerformanceTicket.find({
        employee: employeeId,
        incidentDate: { $gte: rangeStart, $lte: rangeEnd },
        triggerType: { $nin: ['MORNING_COMPLIANCE_PASSED', ...OVERALL_TRIGGERS] },
        priority: { $ne: 'green' }
      }).sort({ incidentDate: -1 }).lean(),
      PerformanceTicket.find({ employee: employeeId, triggerType: { $nin: OVERALL_TRIGGERS } })
        .select('incidentDate consecutiveCount').sort({ incidentDate: 1 }).lean(),
      Attendance.find({ employeeId, date: { $gte: rangeStart, $lte: rangeEnd } })
        .select('date startTime endTime actualWorkSeconds durationSeconds status').lean(),
      Todo.find({
        $and: [
          { $or: [{ assignedTo: employeeId }, { createdBy: employeeId }] },
          { createdAt: { $lte: rangeEndAt } },
          {
            $or: [
              { scheduledAt: { $gte: rangeStartAt, $lte: rangeEndAt } },
              { dueDate: { $gte: rangeStartAt, $lte: rangeEndAt } },
              { createdAt: { $gte: rangeStartAt, $lte: rangeEndAt } }
            ]
          }
        ]
      }).select('_id title createdAt scheduledAt dueDate').lean(),
      usesDigitalCalendar
        ? findCalendarTasksForRange(employeeId, rangeStart, rangeEnd)
        : Promise.resolve([]),
      PerformanceTicket.find({ employee: employeeId, overallPeriodKey: { $in: overallKeys } })
        .select('ticketNumber triggerType priority status incidentDate title description missingRequirement consecutiveCount evidenceSnapshot createdAt')
        .lean()
    ]);

    // Latest check-in wins when the device leaves more than one row for a day
    const attendanceByDate = new Map();
    attendanceRecords.forEach((record) => {
      const existing = attendanceByDate.get(record.date);
      const recordStart = record.startTime ? new Date(record.startTime).getTime() : 0;
      const existingStart = existing?.startTime ? new Date(existing.startTime).getTime() : -1;
      if (!existing || recordStart > existingStart) attendanceByDate.set(record.date, record);
    });

    // One ticket per day: the most severe one wins the day colour
    const priorityRank = { critical: 4, red: 3, high: 3, orange: 2, medium: 2, low: 1 };
    const ticketsByDate = new Map();
    rangeTickets.forEach((ticket) => {
      const list = ticketsByDate.get(ticket.incidentDate) || [];
      list.push(ticket);
      ticketsByDate.set(ticket.incidentDate, list);
    });
    const ticketByDate = new Map();
    ticketsByDate.forEach((list, date) => {
      const worst = [...list].sort((a, b) => (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0))[0];
      ticketByDate.set(date, worst);
    });

    const orangeCount = rangeTickets.filter(t => t.priority === 'orange' || t.priority === 'medium' || t.priority === 'low').length;
    const redCount = rangeTickets.filter(t => t.priority === 'red' || t.priority === 'high').length;
    const criticalCount = rangeTickets.filter(t => t.priority === 'critical').length;
    const closedStatuses = ['resolved', 'closed', 'overridden', 'cleared', 'verified'];
    const resolvedCount = rangeTickets.filter(t => closedStatuses.includes(t.status)).length;
    const pendingCount = rangeTickets.length - resolvedCount;

    // Streak numbers come from the whole history, not just this range
    let currentStreak = 0;
    let longestStreak = 0;
    if (streakTickets.length > 0) {
      currentStreak = streakTickets[streakTickets.length - 1].consecutiveCount || 1;
      longestStreak = Math.max(...streakTickets.map(t => t.consecutiveCount || 1));
    }

    // Same "work in place before 10:00 AM IST" rule as the morning sweep
    const calendarByDate = bucketCalendarTasksByDay(calendarRecords);
    const tasksOnDay = (dateStr) => {
      const dayStart = new Date(`${dateStr}T00:00:00.000+05:30`).getTime();
      const dayEnd = new Date(`${dateStr}T23:59:59.999+05:30`).getTime();
      const cutoff = new Date(`${dateStr}T10:00:00.000+05:30`).getTime();

      if (usesDigitalCalendar) {
        // A content item dated that day is the day's work for the marketing team
        return (calendarByDate.get(dateStr) || [])
          .map((item) => ({ _id: item._id, title: item.content_title, status: item.overall_status }));
      }

      return taskRecords.filter((task) => {
        if (!task.createdAt) return false;
        const created = new Date(task.createdAt).getTime();
        if (created > cutoff) return false;
        const scheduled = task.scheduledAt ? new Date(task.scheduledAt).getTime() : null;
        const due = task.dueDate ? new Date(task.dueDate).getTime() : null;
        if (scheduled !== null && scheduled >= dayStart && scheduled <= dayEnd) return true;
        if (due !== null && due >= dayStart && due <= dayEnd) return true;
        return created >= dayStart && created <= cutoff;
      });
    };

    // Day by day: attendance, tasks and the ticket reason for every date in range
    const calendarDays = [];
    for (let cursor = rangeStart; cursor <= rangeEnd; cursor = shiftDate(cursor, 1)) {
      const dayOfWeek = new Date(`${cursor}T00:00:00.000Z`).getUTCDay();
      const isSunday = dayOfWeek === 0;
      const cutoff10Am = new Date(`${cursor}T10:00:00.000+05:30`);
      const attendance = attendanceByDate.get(cursor) || null;
      const ticket = ticketByDate.get(cursor) || null;
      const dayTickets = ticketsByDate.get(cursor) || [];
      const dayTasks = tasksOnDay(cursor);

      const attendanceOnTime = Boolean(attendance?.startTime) && new Date(attendance.startTime) <= cutoff10Am;
      const hasTasks = dayTasks.length > 0;

      let status = 'neutral';
      if (attendance?.status === 'ON_LEAVE') {
        status = 'leave';
      } else if (ticket) {
        if (ticket.priority === 'critical') status = 'critical';
        else if (ticket.priority === 'red' || ticket.priority === 'high') status = 'red';
        else status = 'orange';
      } else if (isSunday) {
        status = 'weekend';
      } else if (attendanceOnTime && hasTasks) {
        status = 'compliant';
      } else if (attendance || hasTasks) {
        status = 'partial';
      }

      calendarDays.push({
        date: cursor,
        dayNumber: Number(cursor.slice(8, 10)),
        dayOfMonth: Number(cursor.slice(8, 10)),
        dayOfWeek,
        isSunday,
        isFuture: cursor > todayStr,
        status,
        ticket: ticket ? {
          _id: ticket._id,
          ticketNumber: ticket.ticketNumber,
          triggerType: ticket.triggerType,
          priority: ticket.priority,
          status: ticket.status,
          title: ticket.title,
          missingRequirement: ticket.missingRequirement || '',
          description: ticket.description || '',
          consecutiveCount: ticket.consecutiveCount || 1
        } : null,
        ticketCount: dayTickets.length,
        tickets: dayTickets.map((t) => ({
          _id: t._id,
          ticketNumber: t.ticketNumber,
          triggerType: t.triggerType,
          priority: t.priority,
          status: t.status,
          title: t.title,
          missingRequirement: t.missingRequirement || '',
          description: t.description || '',
          consecutiveCount: t.consecutiveCount || 1
        })),
        attendance: {
          marked: Boolean(attendance),
          onTime: attendanceOnTime,
          time: attendance?.startTime
            ? new Date(attendance.startTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })
            : null,
          checkIn: attendance?.startTime || null,
          checkOut: attendance?.endTime || null,
          workSeconds: attendance?.actualWorkSeconds || attendance?.durationSeconds || 0,
          attendanceStatus: attendance?.status || ''
        },
        todo: {
          created: hasTasks,
          count: dayTasks.length,
          source: usesDigitalCalendar ? 'digital-calendar' : 'todo',
          titles: dayTasks.slice(0, 3).map(t => t.title).filter(Boolean)
        }
      });
    }

    res.json({
      ok: true,
      employee,
      month: rangeStart.slice(0, 7),
      range: { start: rangeStart, end: rangeEnd },
      summary: {
        totalMonthTickets: rangeTickets.length,
        totalTicketsThisMonth: rangeTickets.length,
        orangeCount,
        redCount,
        criticalCount,
        resolvedCount,
        pendingCount,
        currentStreak,
        longestStreak
      },
      calendarDays,
      calendar: calendarDays,
      overallTickets: overallTickets.map((ticket) => ({
        _id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        triggerType: ticket.triggerType,
        priority: ticket.priority,
        status: ticket.status,
        incidentDate: ticket.incidentDate,
        title: ticket.title,
        description: ticket.description || '',
        missingRequirement: ticket.missingRequirement || '',
        consecutiveCount: ticket.consecutiveCount || 1,
        period: ticket.evidenceSnapshot?.overall || null
      }))
    });
  } catch (err) {
    console.error('[GET /performance/tickets/employee-history]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * GET /api/performance/tickets/analytics/overview
 * Master multi-month aggregation & trend analytics
 */
router.get('/analytics/overview', protect, async (req, res) => {
  try {
    const { range = '6m', department } = req.query;

    const query = {};
    if (department && department !== 'ALL') {
      query.department = { $regex: new RegExp(`^${department}$`, 'i') };
    }

    const allTickets = await PerformanceTicket.find(query).sort({ incidentDate: 1 });

    // 1. Month-wise Aggregation Table
    const monthsMap = {};
    allTickets.forEach(t => {
      const m = t.incidentDate.slice(0, 7); // "YYYY-MM"
      if (!monthsMap[m]) {
        monthsMap[m] = {
          month: m,
          orange: 0,
          red: 0,
          critical: 0,
          totalIncidents: 0,
          resolved: 0,
          pending: 0
        };
      }
      monthsMap[m].totalIncidents++;
      if (t.priority === 'critical') monthsMap[m].critical++;
      else if (t.priority === 'red' || t.priority === 'high') monthsMap[m].red++;
      else monthsMap[m].orange++;

      if (t.status === 'resolved' || t.status === 'closed') {
        monthsMap[m].resolved++;
      } else {
        monthsMap[m].pending++;
      }
    });

    const monthlyBreakdown = Object.values(monthsMap).sort((a, b) => b.month.localeCompare(a.month));

    // 2. Department-wise breakdown
    const deptMap = {};
    allTickets.forEach(t => {
      const d = t.department || 'General';
      if (!deptMap[d]) deptMap[d] = { department: d, count: 0, orange: 0, red: 0, critical: 0 };
      deptMap[d].count++;
      if (t.priority === 'critical') deptMap[d].critical++;
      else if (t.priority === 'red' || t.priority === 'high') deptMap[d].red++;
      else deptMap[d].orange++;
    });

    // 3. Violation Type Breakdown (Attendance vs Todo vs Dual)
    const typeDistribution = {
      attendance: allTickets.filter(t => t.triggerType === 'ATTENDANCE_NON_COMPLIANCE').length,
      todo: allTickets.filter(t => t.triggerType === 'DAILY_TASK_SUBMISSION_MISSING').length,
      dual: allTickets.filter(t => t.triggerType === 'MORNING_COMPLIANCE_DUAL_VIOLATION').length,
      logout: allTickets.filter(t => t.triggerType === 'SHIFT_TASK_UPDATE_MISSING').length
    };

    // 4. Repeated Violations (Top Employees)
    const empMap = {};
    allTickets.forEach(t => {
      const key = String(t.employee);
      if (!empMap[key]) {
        empMap[key] = {
          employeeId: key,
          name: t.employeeName,
          code: t.employeeCode,
          department: t.department,
          total: 0,
          maxStreak: 0,
          critical: 0
        };
      }
      empMap[key].total++;
      if (t.consecutiveCount > empMap[key].maxStreak) empMap[key].maxStreak = t.consecutiveCount;
      if (t.priority === 'critical') empMap[key].critical++;
    });

    const topRepeatOffenders = Object.values(empMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    res.json({
      ok: true,
      totalIncidents: allTickets.length,
      monthlyBreakdown,
      departmentBreakdown: Object.values(deptMap),
      typeDistribution,
      topRepeatOffenders
    });
  } catch (err) {
    console.error('[GET /performance/tickets/analytics/overview]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * GET /api/performance/tickets/managers
 * Returns list of managers/admins for ticket assignment
 */
router.get('/managers', protect, async (req, res) => {
  try {
    const managers = await User.find({
      role: { $in: ['admin', 'manager', 'hr'] },
      isActive: { $ne: false }
    }).select('_id name email employeeId role department').sort({ name: 1 });

    res.json({ ok: true, managers });
  } catch (err) {
    console.error('[GET /performance/tickets/managers]', err);
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
      .populate('assignedManager', 'name email employeeId')
      .populate('resolvedBy', 'name email')
      .populate('overriddenBy', 'name email')
      .populate('responses.author', 'name role avatar');

    if (!ticket) {
      return res.status(404).json({ ok: false, message: 'Ticket not found' });
    }

    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    if (!isAdmin && String(ticket.employee?._id || ticket.employee) !== String(req.user._id)) {
      return res.status(403).json({ ok: false, message: 'Unauthorized to view this ticket' });
    }

    // Also fetch employee violation streak context
    const previousTickets = await PerformanceTicket.find({
      employee: ticket.employee?._id || ticket.employee,
      incidentDate: { $lt: ticket.incidentDate }
    }).select('ticketNumber incidentDate triggerType priority status consecutiveCount').sort({ incidentDate: -1 }).limit(5);

    res.json({ ok: true, ticket, previousTickets });
  } catch (err) {
    console.error('[GET /performance/tickets/:id]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * POST /api/performance/tickets/:id/acknowledge
 * Employee acknowledges warning/escalation ticket
 */
router.post('/:id/acknowledge', protect, async (req, res) => {
  try {
    const ticket = await PerformanceTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ ok: false, message: 'Ticket not found' });
    }

    const isAssignee = String(ticket.employee) === String(req.user._id);
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    if (!isAssignee && !isAdmin) {
      return res.status(403).json({ ok: false, message: 'Only the employee can acknowledge this ticket' });
    }

    const { notes } = req.body;
    ticket.isAcknowledged = true;
    ticket.acknowledgedAt = new Date();
    ticket.acknowledgementNotes = (notes || '').trim();
    if (ticket.status === 'open') {
      ticket.status = 'acknowledged';
    }

    ticket.timeline.push({
      action: 'ticket_acknowledged',
      performedBy: req.user._id,
      notes: `Acknowledged by ${req.user.name}: "${(notes || 'Acknowledged warning').slice(0, 80)}"`,
      timestamp: new Date()
    });

    await ticket.save();

    await PerformanceAuditLog.create({
      entityType: 'TICKET',
      entityId: ticket._id,
      action: 'TICKET_ACKNOWLEDGED',
      performedBy: req.user._id,
      performedByRole: req.user.role,
      reason: notes || 'Employee acknowledged ticket',
      timestamp: new Date()
    }).catch(() => {});

    res.json({ ok: true, message: 'Ticket acknowledged successfully', ticket });
  } catch (err) {
    console.error('[POST /performance/tickets/:id/acknowledge]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * POST /api/performance/tickets/:id/explain
 * Employee submits explanation
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
      return res.status(403).json({ ok: false, message: 'Only the ticket assignee can submit explanations' });
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
      notes: `Explanation submitted: "${explanation.trim().slice(0, 100)}"`,
      timestamp: new Date()
    });

    await ticket.save();

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
 * POST /api/performance/tickets/:id/remarks
 * HR / Admin adds management remarks
 */
router.post('/:id/remarks', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    if (!isAdmin) {
      return res.status(403).json({ ok: false, message: 'Only HR or Management can add remarks' });
    }

    const { remarks } = req.body;
    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ ok: false, message: 'Remarks are required' });
    }

    const ticket = await PerformanceTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ ok: false, message: 'Ticket not found' });

    ticket.hrRemarks = remarks.trim();
    ticket.timeline.push({
      action: 'hr_remarks_added',
      performedBy: req.user._id,
      notes: `Remarks added by ${req.user.name}: "${remarks.trim().slice(0, 80)}"`,
      timestamp: new Date()
    });

    await ticket.save();
    res.json({ ok: true, message: 'Remarks added successfully', ticket });
  } catch (err) {
    console.error('[POST /performance/tickets/:id/remarks]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * POST /api/performance/tickets/:id/assign
 * HR / Admin reassigns ticket to a manager
 */
router.post('/:id/assign', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    if (!isAdmin) {
      return res.status(403).json({ ok: false, message: 'Only HR or Management can reassign tickets' });
    }

    const { managerId } = req.body;
    const ticket = await PerformanceTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ ok: false, message: 'Ticket not found' });

    const manager = await User.findById(managerId).select('name email role');
    if (!manager) return res.status(404).json({ ok: false, message: 'Manager not found' });

    ticket.assignedManager = manager._id;
    ticket.timeline.push({
      action: 'ticket_assigned',
      performedBy: req.user._id,
      notes: `Ticket assigned to ${manager.name}`,
      timestamp: new Date()
    });

    await ticket.save();
    res.json({ ok: true, message: `Ticket assigned to ${manager.name}`, ticket });
  } catch (err) {
    console.error('[POST /performance/tickets/:id/assign]', err);
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

/**
 * POST /api/performance/tickets/:id/override
 * Management override (waives ticket violation with mandatory reason)
 */
router.post('/:id/override', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    if (!isAdmin) {
      return res.status(403).json({ ok: false, message: 'Only Admin or Manager can override compliance tickets' });
    }

    const { overrideReason } = req.body;
    if (!overrideReason || !overrideReason.trim()) {
      return res.status(400).json({ ok: false, message: 'Mandatory override reason is required' });
    }

    const ticket = await PerformanceTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ ok: false, message: 'Ticket not found' });

    ticket.isOverridden = true;
    ticket.overrideReason = overrideReason.trim();
    ticket.overriddenBy = req.user._id;
    ticket.overriddenAt = new Date();
    ticket.status = 'overridden';

    ticket.timeline.push({
      action: 'ticket_overridden',
      performedBy: req.user._id,
      notes: `Overridden by ${req.user.name}: "${overrideReason.trim().slice(0, 100)}"`,
      timestamp: new Date()
    });

    await ticket.save();

    await PerformanceAuditLog.create({
      entityType: 'TICKET',
      entityId: ticket._id,
      action: 'TICKET_OVERRIDDEN',
      performedBy: req.user._id,
      performedByRole: req.user.role,
      reason: overrideReason.trim(),
      timestamp: new Date()
    }).catch(() => {});

    res.json({ ok: true, message: 'Ticket overridden successfully', ticket });
  } catch (err) {
    console.error('[POST /performance/tickets/:id/override]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * POST /api/performance/tickets/:id/escalate
 * Management manual escalation (e.g., Orange -> Red, Red -> Critical)
 */
router.post('/:id/escalate', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    if (!isAdmin) {
      return res.status(403).json({ ok: false, message: 'Only Admin or Manager can escalate tickets' });
    }

    const { priority = 'red', notes } = req.body;
    const ticket = await PerformanceTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ ok: false, message: 'Ticket not found' });

    const prevPriority = ticket.priority;
    ticket.priority = priority;
    ticket.status = 'escalated';
    ticket.escalationLevel = priority === 'critical' ? 3 : 2;

    ticket.timeline.push({
      action: 'ticket_escalated',
      performedBy: req.user._id,
      notes: `Escalated from ${prevPriority.toUpperCase()} to ${priority.toUpperCase()} by ${req.user.name}: "${(notes || 'Management escalation').slice(0, 80)}"`,
      timestamp: new Date()
    });

    await ticket.save();

    await PerformanceAuditLog.create({
      entityType: 'TICKET',
      entityId: ticket._id,
      action: 'TICKET_ESCALATED',
      performedBy: req.user._id,
      performedByRole: req.user.role,
      reason: notes || `Escalated to ${priority}`,
      timestamp: new Date()
    }).catch(() => {});

    res.json({ ok: true, message: `Ticket escalated to ${priority.toUpperCase()}`, ticket });
  } catch (err) {
    console.error('[POST /performance/tickets/:id/escalate]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
