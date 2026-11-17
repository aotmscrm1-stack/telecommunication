const DigitalCalendar = require('../../database/models/DigitalCalendar');

/**
 * Digital Marketing staff do not work in the Todo module - their daily work is
 * planned and recorded in the Digital Calendar. The 10:00 AM compliance sweep,
 * the performance roster and the person history must therefore read "daily
 * tasks" from the same place the team actually works.
 */

const OWNED_BY = (employeeId) => ({
  $or: [
    { responsible_employee: employeeId },
    { 'contents.responsible_employee': employeeId },
    { createdBy: employeeId }
  ]
});

/** True for the Digital Marketing / Marketing team (same rule as the Todo module guard) */
function isDigitalCalendarUser(user) {
  if (!user) return false;
  const department = String(user.department || '').trim().toLowerCase();
  const designation = String(user.designation || '').trim().toLowerCase();
  return department.includes('marketing') || designation.includes('marketing') || designation.includes('digital');
}

// content_date is stored as new Date('YYYY-MM-DD') -> UTC midnight of that day
function utcDayWindow(dateStr) {
  return {
    start: new Date(`${dateStr}T00:00:00.000Z`),
    end: new Date(`${dateStr}T23:59:59.999Z`)
  };
}

const ITEM_FIELDS = '_id content_title content_type content_date overall_status approval_status createdAt';

/**
 * Calendar work dated on one day. The rule for the marketing team is simple:
 * if a content item is planned for that date, the day's work has been added.
 */
async function findCalendarTasksForDay(employeeId, dateStr) {
  const { start, end } = utcDayWindow(dateStr);

  return DigitalCalendar.find({
    $and: [OWNED_BY(employeeId), { content_date: { $gte: start, $lte: end } }]
  })
    .select(ITEM_FIELDS)
    .sort({ content_date: 1, createdAt: 1 })
    .lean();
}

/** Calendar items dated inside an inclusive day range (bulk query for the person view) */
async function findCalendarTasksForRange(employeeId, startDateStr, endDateStr) {
  return DigitalCalendar.find({
    $and: [
      OWNED_BY(employeeId),
      {
        content_date: {
          $gte: new Date(`${startDateStr}T00:00:00.000Z`),
          $lte: new Date(`${endDateStr}T23:59:59.999Z`)
        }
      }
    ]
  })
    .select(ITEM_FIELDS)
    .sort({ content_date: 1, createdAt: 1 })
    .lean();
}

/** Latest calendar write for one day - used to know when a sweep must be re-run */
async function getLatestCalendarActivity(dateStr) {
  const { start, end } = utcDayWindow(dateStr);
  const latest = await DigitalCalendar.find({ content_date: { $gte: start, $lte: end } })
    .sort({ updatedAt: -1 })
    .limit(1)
    .select('updatedAt createdAt')
    .lean();
  if (!latest.length) return null;
  return latest[0].updatedAt || latest[0].createdAt || null;
}

/** Groups a bulk list into per-day buckets keyed "YYYY-MM-DD" */
function bucketCalendarTasksByDay(items = []) {
  const map = new Map();
  items.forEach((item) => {
    if (!item || !item.content_date) return;
    const key = new Date(item.content_date).toISOString().slice(0, 10);
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  });
  return map;
}

const COMPLETED_STATUSES = ['Posted', 'Pending Platforms', 'Scheduled'];
const IN_PROGRESS_STATUSES = ['Ready to Post', 'In Design', 'Draft', 'Needs Approval'];

/** 0..1 completion weight of one calendar item (mirrors the Todo weighting) */
function calendarCompletionWeight(item) {
  const status = String(item?.overall_status || '').trim();
  if (COMPLETED_STATUSES.includes(status)) return 1;
  if (IN_PROGRESS_STATUSES.includes(status)) return 0.75;
  if (status === 'Planned') return 0.5;
  return 0;
}

module.exports = {
  isDigitalCalendarUser,
  findCalendarTasksForDay,
  findCalendarTasksForRange,
  getLatestCalendarActivity,
  bucketCalendarTasksByDay,
  calendarCompletionWeight
};
