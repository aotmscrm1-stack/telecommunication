const crypto = require('crypto');
const User = require('../../database/models/User');
const PerformanceTicket = require('../../database/models/PerformanceTicket');
const { getNextTicketNumber } = require('../../database/models/PerformanceTicketSequence');

// Overall tickets summarise a whole week / month, so they are never part of the
// day-by-day ticket counting in the roster, the calendar or the insights.
const OVERALL_TRIGGERS = ['WEEK_OVERALL_VIOLATION', 'MONTH_OVERALL_VIOLATION'];

const DAILY_MORNING_TRIGGERS = [
  'ATTENDANCE_NON_COMPLIANCE',
  'DAILY_TASK_SUBMISSION_MISSING',
  'MORNING_COMPLIANCE_DUAL_VIOLATION'
];

const PRIORITY_RANK = { critical: 4, red: 3, high: 3, orange: 2, medium: 2, low: 1 };

const CLOSED_STATUSES = ['resolved', 'closed', 'overridden', 'cleared', 'verified'];

function shiftDate(dateStr, deltaDays) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function weekRangeOf(dateStr) {
  const weekdayIndex = new Date(`${dateStr}T00:00:00.000Z`).getUTCDay(); // 0 = Sunday
  const start = shiftDate(dateStr, -((weekdayIndex + 6) % 7)); // Monday
  return { start, end: shiftDate(start, 6) };
}

function monthRangeOf(dateStr) {
  const start = `${dateStr.slice(0, 7)}-01`;
  const end = shiftDate(`${shiftDate(start, 32).slice(0, 7)}-01`, -1);
  return { start, end };
}

function shortDate(dateStr) {
  return new Date(`${dateStr}T00:00:00.000Z`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC'
  });
}

function rangeLabel(range) {
  return `${shortDate(range.start)} – ${shortDate(range.end)}`;
}

/**
 * Collapses the daily tickets of a period into one summary.
 */
function summarise(tickets) {
  const summary = {
    total: tickets.length,
    critical: 0,
    red: 0,
    orange: 0,
    attendance: 0,
    tasks: 0,
    both: 0,
    worstStreak: 0,
    priority: 'orange',
    numbers: []
  };

  tickets.forEach((ticket) => {
    if (ticket.priority === 'critical') summary.critical += 1;
    else if (ticket.priority === 'red' || ticket.priority === 'high') summary.red += 1;
    else summary.orange += 1;

    if (ticket.triggerType === 'ATTENDANCE_NON_COMPLIANCE') summary.attendance += 1;
    else if (ticket.triggerType === 'DAILY_TASK_SUBMISSION_MISSING') summary.tasks += 1;
    else if (ticket.triggerType === 'MORNING_COMPLIANCE_DUAL_VIOLATION') summary.both += 1;

    const streak = Number(ticket.consecutiveCount || 1);
    if (streak > summary.worstStreak) summary.worstStreak = streak;
    if (ticket.ticketNumber) summary.numbers.push(ticket.ticketNumber);
  });

  summary.numbers.sort();
  summary.priority = summary.critical ? 'critical' : summary.red ? 'red' : 'orange';
  return summary;
}

function reasonLine(summary) {
  const parts = [];
  if (summary.attendance) parts.push(`${summary.attendance} attendance miss`);
  if (summary.tasks) parts.push(`${summary.tasks} task miss`);
  if (summary.both) parts.push(`${summary.both} attendance + task miss`);
  return parts.length ? parts.join(' · ') : 'morning compliance miss';
}

/**
 * Creates, refreshes or clears the single overall ticket of one period.
 */
async function syncPeriod({ kind, range, tickets, employee }) {
  const periodWord = kind === 'WEEK' ? 'week' : 'month';
  const overallPeriodKey = `${employee._id}_${kind}_${range.start}`;
  const existing = await PerformanceTicket.findOne({ overallPeriodKey });

  // A period without daily violations carries no overall ticket
  if (!tickets.length) {
    if (existing && !CLOSED_STATUSES.includes(existing.status)) {
      await PerformanceTicket.deleteOne({ _id: existing._id });
      return { removed: 1 };
    }
    return {};
  }

  const summary = summarise(tickets);
  const escalationLevel = summary.priority === 'critical' ? 3 : summary.priority === 'red' ? 2 : 1;
  const title = `[${kind} OVERALL] ${summary.total} compliance ticket${summary.total > 1 ? 's' : ''} — ${
    employee.name
  } (${rangeLabel(range)})`;
  const description = `Employee ${employee.name} (${employee.employeeId || 'ID Pending'}) recorded ${
    summary.total
  } morning compliance violation${summary.total > 1 ? 's' : ''} during the ${periodWord} ${rangeLabel(range)}: ${
    summary.critical
  } critical, ${summary.red} red escalation, ${summary.orange} warning. Breakdown: ${reasonLine(
    summary
  )}. Worst consecutive streak in this ${periodWord}: day #${summary.worstStreak}. Built from the daily 10:00 AM tickets ${
    summary.numbers.join(', ') || 'recorded for this period'
  }.`;
  const missingRequirement = `${summary.total} daily compliance violation${
    summary.total > 1 ? 's' : ''
  } in this ${periodWord} (${reasonLine(summary)}).`;

  const payload = {
    employee: employee._id,
    employeeCode: employee.employeeId || '',
    employeeName: employee.name,
    department: employee.department || 'General',
    checkpoint: 'PERFORMANCE_GOVERNANCE',
    triggerType: kind === 'WEEK' ? 'WEEK_OVERALL_VIOLATION' : 'MONTH_OVERALL_VIOLATION',
    priority: summary.priority,
    escalationLevel,
    consecutiveCount: summary.worstStreak || 1,
    incidentDate: range.end,
    title,
    description,
    missingRequirement,
    evidenceSnapshot: {
      overall: {
        kind,
        periodStart: range.start,
        periodEnd: range.end,
        total: summary.total,
        critical: summary.critical,
        red: summary.red,
        orange: summary.orange,
        attendance: summary.attendance,
        tasks: summary.tasks,
        both: summary.both,
        worstStreak: summary.worstStreak,
        priority: summary.priority,
        sourceTickets: summary.numbers
      },
      evaluatedAt: new Date().toISOString()
    }
  };

  if (existing) {
    // Keep the ticket identity, status and responses; only refresh the numbers
    await PerformanceTicket.updateOne(
      { _id: existing._id },
      {
        $set: payload,
        $push: {
          timeline: {
            action: 're_evaluated',
            notes: `Overall ${periodWord} ticket refreshed: ${summary.total} daily ticket${
              summary.total > 1 ? 's' : ''
            }, now ${summary.priority.toUpperCase()}`,
            timestamp: new Date()
          }
        }
      }
    );
    return { updated: 1 };
  }

  const ticketNumber = await getNextTicketNumber(range.end);
  const incidentHash = crypto
    .createHash('sha256')
    .update(`${employee._id}_${kind}_${range.start}_OVERALL`)
    .digest('hex');

  await PerformanceTicket.create({
    ...payload,
    ticketNumber,
    incidentHash,
    overallPeriodKey,
    status: 'open',
    timeline: [
      {
        action: 'auto_generated',
        notes: `Overall ${periodWord} ticket auto-generated from ${summary.total} daily ticket${
          summary.total > 1 ? 's' : ''
        } of ${rangeLabel(range)}`,
        timestamp: new Date()
      }
    ]
  });
  return { created: 1 };
}

/**
 * Keeps one WEEK and one MONTH overall ticket per active employee in sync with
 * that period's daily tickets. Called after every morning sweep (and safe to
 * re-run at any time — it upserts instead of duplicating).
 */
async function syncOverallTickets(dateStr, options = {}) {
  const week = weekRangeOf(dateStr);
  const month = monthRangeOf(dateStr);
  const queryStart = week.start < month.start ? week.start : month.start;
  const queryEnd = week.end > month.end ? week.end : month.end;

  const employees = options.employees && options.employees.length
    ? options.employees
    : await User.find({ isActive: { $ne: false } }).select('_id name employeeId department');

  const result = { employees: employees.length, created: 0, updated: 0, removed: 0 };

  for (const employee of employees) {
    try {
      const dailyTickets = await PerformanceTicket.find({
        employee: employee._id,
        triggerType: { $in: DAILY_MORNING_TRIGGERS },
        priority: { $ne: 'green' },
        incidentDate: { $gte: queryStart, $lte: queryEnd }
      })
        .select('ticketNumber triggerType priority consecutiveCount incidentDate')
        .lean();

      for (const kind of ['WEEK', 'MONTH']) {
        const range = kind === 'WEEK' ? week : month;
        const periodTickets = dailyTickets.filter(
          (ticket) => ticket.incidentDate >= range.start && ticket.incidentDate <= range.end
        );
        const outcome = await syncPeriod({ kind, range, tickets: periodTickets, employee });
        result.created += outcome.created || 0;
        result.updated += outcome.updated || 0;
        result.removed += outcome.removed || 0;
      }
    } catch (err) {
      console.error(`[Overall ticket sync for ${employee.name || employee._id}]`, err.message);
    }
  }

  return result;
}

module.exports = {
  syncOverallTickets,
  OVERALL_TRIGGERS,
  DAILY_MORNING_TRIGGERS,
  weekRangeOf,
  monthRangeOf
};
