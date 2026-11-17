import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  Flame,
  ClipboardList,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Sliders,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import AotmsSpinner from '../../../components/common/AotmsSpinner';
import { performanceAPI } from '../../../services/api';

const PRIMARY_COLOR = '#1677C8';

// The page is built on two morning checkpoints only: attendance and daily tasks.
const ROW_STATUS = {
  OK: { label: 'On track', dot: 'bg-emerald-500', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  ATT: { label: 'Attendance missing', dot: 'bg-rose-500', badge: 'border-rose-200 bg-rose-50 text-rose-700' },
  TASK: { label: 'Tasks missing', dot: 'bg-amber-500', badge: 'border-amber-200 bg-amber-50 text-amber-700' },
  BOTH: { label: 'Attendance + tasks missing', dot: 'bg-purple-500', badge: 'border-purple-200 bg-purple-50 text-purple-700' },
};

const employeeOf = (item = {}) =>
  item.employee || { name: item.employeeName, employeeId: item.employeeCode, department: item.department };

const violationTicketsOf = (item) =>
  (Array.isArray(item?.tickets) ? item.tickets : []).filter(
    (t) => t.priority !== 'green' && t.triggerType !== 'MORNING_COMPLIANCE_PASSED'
  );

const statusKeyOf = (item) => {
  const attendance = Boolean(item?.morningCheck?.hasAttendance);
  const tasks = Boolean(item?.morningCheck?.hasTasks);
  if (attendance && tasks) return 'OK';
  if (!attendance && !tasks) return 'BOTH';
  return attendance ? 'TASK' : 'ATT';
};

const formatTriggerType = (type) => {
  switch (type) {
    case 'MORNING_COMPLIANCE_DUAL_VIOLATION':
      return 'Attendance and tasks both missing';
    case 'DAILY_TASK_SUBMISSION_MISSING':
      return 'Daily tasks not submitted by 10 AM';
    case 'ATTENDANCE_NON_COMPLIANCE':
      return 'Attendance not marked by 10 AM';
    case 'SHIFT_TASK_UPDATE_MISSING':
      return 'Tasks not updated before logout';
    case 'TASK_OVERDUE':
      return 'Task overdue';
    case 'POOR_PERFORMANCE_DAILY':
      return 'Daily score below 65';
    case 'REPEATED_LATE_LOGIN':
      return 'Repeated late login';
    case 'MISSED_DAILY_REPORT':
      return 'Missed daily report';
    case 'MANUAL_HR_DISCIPLINARY':
      return 'Manual HR disciplinary';
    case 'WEEK_OVERALL_VIOLATION':
      return 'Week overall ticket';
    case 'MONTH_OVERALL_VIOLATION':
      return 'Month overall ticket';
    default:
      return String(type || '').replace(/_/g, ' ');
  }
};

// Plain-language answer to "why was this ticket raised?"
const ticketWhyOf = (ticket) =>
  ticket?.missingRequirement || ticket?.description || 'No reason recorded on this ticket.';

const formatDayLabel = (dateStr) => {
  if (!dateStr) return '';
  return new Date(`${dateStr}T00:00:00.000Z`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
};

const priorityChipClass = (priority) => {
  if (priority === 'critical') return 'border-purple-200 bg-purple-50 text-purple-700';
  if (priority === 'red' || priority === 'high') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (priority === 'orange' || priority === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
};

const shiftIsoDate = (dateStr, deltaDays) => {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
};

// Monday - Sunday week that contains the given date
const getWeekRange = (dateStr) => {
  const weekdayIndex = new Date(`${dateStr}T00:00:00.000Z`).getUTCDay();
  const start = shiftIsoDate(dateStr, -((weekdayIndex + 6) % 7));
  return { start, end: shiftIsoDate(start, 6) };
};

const getMonthRange = (dateStr) => {
  const start = `${dateStr.slice(0, 7)}-01`;
  return { start, end: shiftIsoDate(shiftIsoDate(start, 32).slice(0, 7) + '-01', -1) };
};

const formatDayWithWeekday = (dateStr) => {
  if (!dateStr) return '';
  return new Date(`${dateStr}T00:00:00.000Z`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
};

// Mirrors the day status written by the employee-history endpoint
const DAY_TONE = {
  compliant: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  partial: 'border-amber-200 bg-amber-50 text-amber-700',
  orange: 'border-amber-200 bg-amber-50 text-amber-700',
  red: 'border-rose-200 bg-rose-50 text-rose-700',
  critical: 'border-purple-200 bg-purple-50 text-purple-700',
  leave: 'border-slate-200 bg-slate-100 text-slate-600',
  weekend: 'border-slate-100 bg-slate-50 text-slate-400',
  neutral: 'border-slate-200 bg-white text-slate-500',
};

// Saturated colours for the month calendar, so a raised ticket is obvious
const DAY_CELL = {
  critical: 'border-purple-300 bg-purple-100 text-purple-900',
  red: 'border-rose-300 bg-rose-100 text-rose-900',
  orange: 'border-amber-300 bg-amber-100 text-amber-900',
  partial: 'border-amber-200 bg-amber-50 text-amber-800',
  compliant: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  leave: 'border-slate-200 bg-slate-100 text-slate-600',
  weekend: 'border-slate-100 bg-slate-50 text-slate-400',
  neutral: 'border-slate-200 bg-white text-slate-500',
};

const DAY_STATUS_LABEL = {
  critical: 'Critical ticket',
  red: 'Escalated ticket',
  orange: 'Warning ticket',
  partial: 'Partly compliant',
  compliant: 'Compliant',
  leave: 'On leave',
  weekend: 'Sunday',
  neutral: 'No record',
};

// "2026-11" +- 1 -> "2026-10" / "2026-12"
const shiftMonthKey = (monthKey, delta) => {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
};

const formatMonthKey = (monthKey) => {
  if (!monthKey) return '';
  return new Date(`${monthKey}-01T00:00:00.000Z`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const formatMonthShort = (monthKey) => {
  if (!monthKey) return '';
  return new Date(`${monthKey}-01T00:00:00.000Z`).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

// ── Overall ticket: one summary raised from all daily tickets of a period ──
const OVERALL_TONE = {
  critical: {
    card: 'border-purple-200 bg-purple-50 text-purple-900',
    bar: 'bg-purple-500',
    chip: 'bg-purple-100 text-purple-700',
    label: 'Critical',
  },
  red: {
    card: 'border-rose-200 bg-rose-50 text-rose-900',
    bar: 'bg-rose-500',
    chip: 'bg-rose-100 text-rose-700',
    label: 'Red / escalated',
  },
  orange: {
    card: 'border-amber-200 bg-amber-50 text-amber-900',
    bar: 'bg-amber-500',
    chip: 'bg-amber-100 text-amber-700',
    label: 'Warning',
  },
  clean: {
    card: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-700',
    label: 'Clean',
  },
  none: {
    card: 'border-slate-200 bg-slate-50 text-slate-600',
    bar: 'bg-slate-300',
    chip: 'bg-slate-100 text-slate-600',
    label: 'No data',
  },
};

const PRIORITY_RANK = { critical: 4, red: 3, high: 3, orange: 2, medium: 2, low: 1 };

/**
 * Rolls every daily ticket of a week/month into one overall ticket:
 * how many were raised, how severe they were, and why.
 */
function buildOverallTicket(days = []) {
  const result = {
    total: 0,
    critical: 0,
    red: 0,
    orange: 0,
    attendance: 0,
    tasks: 0,
    both: 0,
    checkedDays: 0,
    compliantDays: 0,
    worstStreak: 0,
    worstTicket: null,
    entries: [],
    status: 'none',
    start: days[0]?.date || '',
    end: days[days.length - 1]?.date || '',
  };

  days.forEach((day) => {
    const onLeave = day.status === 'leave' || day.attendance?.attendanceStatus === 'ON_LEAVE';
    if (day.dayOfWeek !== 0 && !onLeave) {
      result.checkedDays += 1;
      if (day.status === 'compliant') result.compliantDays += 1;
    }

    const dayTickets = day.tickets?.length ? day.tickets : day.ticket ? [day.ticket] : [];
    dayTickets.forEach((ticket) => {
      result.total += 1;
      if (ticket.priority === 'critical') result.critical += 1;
      else if (ticket.priority === 'red' || ticket.priority === 'high') result.red += 1;
      else result.orange += 1;

      if (ticket.triggerType === 'ATTENDANCE_NON_COMPLIANCE') result.attendance += 1;
      else if (ticket.triggerType === 'DAILY_TASK_SUBMISSION_MISSING') result.tasks += 1;
      else if (ticket.triggerType === 'MORNING_COMPLIANCE_DUAL_VIOLATION') result.both += 1;

      const streak = Number(ticket.consecutiveCount || 1);
      if (streak > result.worstStreak) result.worstStreak = streak;
      if ((PRIORITY_RANK[ticket.priority] || 0) > (PRIORITY_RANK[result.worstTicket?.priority] || 0)) {
        result.worstTicket = ticket;
      }
      result.entries.push({
        _id: ticket._id,
        date: day.date,
        triggerType: ticket.triggerType,
        priority: ticket.priority,
        ticketNumber: ticket.ticketNumber,
      });
    });
  });

  if (result.critical) result.status = 'critical';
  else if (result.red) result.status = 'red';
  else if (result.total) result.status = 'orange';
  else if (result.checkedDays) result.status = 'clean';

  return result;
}

function OverallTicketCard({ title, subtitle, data, ticket }) {
  const [expanded, setExpanded] = useState(false);
  const tone = OVERALL_TONE[data.status] || OVERALL_TONE.none;
  const severity = [];
  if (data.critical) severity.push(`${data.critical} critical`);
  if (data.red) severity.push(`${data.red} escalated`);
  if (data.orange) severity.push(`${data.orange} warning`);
  const reasons = [];
  if (data.attendance) reasons.push(`${data.attendance} attendance miss`);
  if (data.tasks) reasons.push(`${data.tasks} task miss`);
  if (data.both) reasons.push(`${data.both} attendance + task miss`);

  return (
    <div className={`overflow-hidden rounded-xl border ${tone.card}`}>
      {/* Colour strip: the worst daily ticket inside this period */}
      <div className={`h-1 w-full ${tone.bar}`} />

      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wide">{title}</span>
          <span
            className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
              data.total ? tone.chip : 'bg-white/80 text-slate-500'
            }`}
          >
            {data.total ? `${data.total} ticket${data.total > 1 ? 's' : ''}` : data.checkedDays ? 'No ticket' : 'No data'}
          </span>
        </div>

        <p className="mt-1 text-[10px] font-medium opacity-70">{subtitle}</p>

        {data.total > 0 ? (
          <>
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${tone.chip}`}>
                {tone.label}
              </span>
              {severity.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                >
                  {item}
                </span>
              ))}
            </div>

            <p className="mt-1 text-[10px] font-semibold">
              Why: {reasons.join(' · ') || 'other reasons'}
              {data.worstStreak > 1 ? ` · worst streak day ${data.worstStreak}` : ''}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {ticket ? (
                <>
                  <span className="rounded-full bg-white/80 px-1.5 py-0.5 font-mono text-[9px]">
                    {ticket.ticketNumber}
                  </span>
                  <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                    {String(ticket.status || 'open').replace(/_/g, ' ')}
                  </span>
                </>
              ) : (
                <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                  Not raised yet
                </span>
              )}
              <button
                onClick={() => setExpanded((prev) => !prev)}
                className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide hover:bg-white"
              >
                Why these tickets
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            {expanded && (
              <ul className="mt-1.5 space-y-0.5 border-t border-white/60 pt-1.5">
                {data.entries.map((entry) => (
                  <li key={`${entry._id || entry.date}-${entry.ticketNumber || ''}`} className="flex items-baseline gap-1.5 text-[10px]">
                    <span className="w-11 shrink-0 font-bold">{formatDayLabel(entry.date)}</span>
                    <span className="flex-1">{formatTriggerType(entry.triggerType)}</span>
                    <span className="font-mono text-[9px] opacity-60">{entry.ticketNumber}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-1 text-[10px] font-semibold">
            {data.checkedDays
              ? `No ticket — ${data.compliantDays} of ${data.checkedDays} working day${
                  data.checkedDays > 1 ? 's' : ''
                } fully compliant.`
              : 'No working day recorded for this period.'}
          </p>
        )}
      </div>
    </div>
  );
}

// One ticket, written so it is clear what it is and why it was raised
function TicketLine({ ticket, onOpen }) {
  return (
    <button
      onClick={() => onOpen(ticket)}
      className="mt-1.5 w-full rounded-lg bg-slate-50 px-2.5 py-1.5 text-left transition hover:bg-slate-100"
    >
      <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] font-semibold text-slate-800">
        {formatTriggerType(ticket.triggerType)}
        <span className="font-mono text-[10px] font-normal text-slate-400">{ticket.ticketNumber}</span>
        <span
          className={`rounded-full border px-1.5 text-[9px] font-semibold uppercase ${priorityChipClass(
            ticket.priority
          )}`}
        >
          {ticket.priority}
        </span>
        <span className="rounded-full bg-slate-200 px-1.5 text-[9px] font-semibold uppercase text-slate-600">
          {(ticket.status || 'open').replace(/_/g, ' ')}
        </span>
      </div>
      <div className="mt-0.5 text-[10px] text-slate-500">Why: {ticketWhyOf(ticket)}</div>
    </button>
  );
}

export default function PerformanceDashboard() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  // Current working date (Asia/Kolkata default)
  const [currentDate, setCurrentDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );

  // Roster
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  // 'ALL' | 'OK' | 'ATT' | 'TASK' | 'BOTH'
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Toolbar actions
  const [sweepLoading, setSweepLoading] = useState(false);
  const [sweepMessage, setSweepMessage] = useState('');
  const [exportingExcel, setExportingExcel] = useState(false);

  // Person drawer: everything about one employee lives here
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [empPeriod, setEmpPeriod] = useState('MONTH'); // 'WEEK' | 'MONTH'
  const [empMonth, setEmpMonth] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7)
  );
  const [personHistory, setPersonHistory] = useState(null);
  const [personHistoryLoading, setPersonHistoryLoading] = useState(false);
  const [personWeek, setPersonWeek] = useState(null);
  const [selectedPersonDay, setSelectedPersonDay] = useState('');
  const [focusLatestTicket, setFocusLatestTicket] = useState(false);

  // Ticket drawer
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetailLoading, setTicketDetailLoading] = useState(false);
  const [explainText, setExplainText] = useState('');
  const [ackNotes, setAckNotes] = useState('');
  const [hrRemarksText, setHrRemarksText] = useState('');
  const [assignedManagerId, setAssignedManagerId] = useState('');
  const [resolveNotes, setResolveNotes] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [overrideReasonTicket, setOverrideReasonTicket] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [drawerToast, setDrawerToast] = useState('');
  const [managersList, setManagersList] = useState([]);

  // Score override modal
  const [overrideModalTarget, setOverrideModalTarget] = useState(null);
  const [overrideScore, setOverrideScore] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);

  // Company-wide ticket counts, used only for the per-person month/week column
  const [ticketInsights, setTicketInsights] = useState(null);

  // =============================================================
  // DATA FETCHING
  // =============================================================
  const fetchRoster = useCallback(async () => {
    try {
      setRosterLoading(true);
      const res = await performanceAPI.getRoster({ date: currentDate });
      if (res.data?.ok) {
        setRoster(res.data.roster || []);
      }
    } catch (err) {
      console.error('[fetchRoster]', err);
    } finally {
      setRosterLoading(false);
    }
  }, [currentDate]);

  const fetchTicketInsights = useCallback(async () => {
    try {
      const res = await performanceAPI.getTicketInsights({ date: currentDate });
      if (res.data?.ok) setTicketInsights(res.data);
    } catch (err) {
      console.error('[fetchTicketInsights]', err);
    }
  }, [currentDate]);

  const refreshData = useCallback(async () => {
    await Promise.all([fetchRoster(), fetchTicketInsights()]);
  }, [fetchRoster, fetchTicketInsights]);

  const fetchManagers = useCallback(async () => {
    try {
      if (performanceAPI.getTicketManagers) {
        const res = await performanceAPI.getTicketManagers();
        if (res.data?.ok) setManagersList(res.data.managers || []);
      }
    } catch (err) {
      console.error('[fetchManagers]', err);
    }
  }, []);

  // One person + one period: fetch exactly the days being looked at
  const fetchPersonHistory = useCallback(async (empId, range) => {
    if (!empId || !range?.start || !range?.end) return;
    try {
      setPersonHistoryLoading(true);
      const res = await performanceAPI.getEmployeeHistory(empId, {
        start: range.start,
        end: range.end,
      });
      setPersonHistory(res.data?.ok ? res.data : null);
    } catch (err) {
      console.error('[fetchPersonHistory]', err);
      setPersonHistory(null);
    } finally {
      setPersonHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoster();
    fetchTicketInsights();
  }, [fetchRoster, fetchTicketInsights]);

  // The overall ticket needs the week as well, even while the month is on screen
  const personWeekRange = useMemo(() => getWeekRange(currentDate), [currentDate]);

  const fetchPersonWeek = useCallback(async (empId, range) => {
    if (!empId || !range?.start) {
      setPersonWeek(null);
      return;
    }
    try {
      const res = await performanceAPI.getEmployeeHistory(empId, { start: range.start, end: range.end });
      setPersonWeek(res.data?.ok ? res.data : null);
    } catch (err) {
      console.error('[fetchPersonWeek]', err);
      setPersonWeek(null);
    }
  }, []);

  useEffect(() => {
    const empId = selectedEmployee?.employee?._id || selectedEmployee?.employee;
    if (!empId) {
      setPersonWeek(null);
      return;
    }
    fetchPersonWeek(empId, personWeekRange);
  }, [selectedEmployee, personWeekRange, fetchPersonWeek]);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  // Keep the open drawer in sync after actions refresh the roster
  useEffect(() => {
    if (!selectedEmployee) return;
    const selectedId = String(selectedEmployee.employee?._id || selectedEmployee.employee || '');
    const fresh = roster.find((r) => String(r.employee?._id || r.employee || '') === selectedId);
    if (fresh && fresh !== selectedEmployee) setSelectedEmployee(fresh);
  }, [roster]); // eslint-disable-line react-hooks/exhaustive-deps

  // =============================================================
  // SUMMARY
  // =============================================================
  const stats = useMemo(() => {
    let compliant = 0;
    let attMissing = 0;
    let tasksMissing = 0;
    let both = 0;
    let present = 0;
    let tasksSubmitted = 0;

    roster.forEach((item) => {
      const hasAtt = Boolean(item.morningCheck?.hasAttendance);
      const hasTasks = Boolean(item.morningCheck?.hasTasks);
      if (hasAtt) present += 1;
      if (hasTasks) tasksSubmitted += 1;
      if (hasAtt && hasTasks) compliant += 1;
      else if (!hasAtt && !hasTasks) both += 1;
      else if (!hasAtt) attMissing += 1;
      else tasksMissing += 1;
    });

    return { total: roster.length, compliant, attMissing, tasksMissing, both, present, tasksSubmitted };
  }, [roster]);

  // =============================================================
  // MAIN ACTIONS
  // =============================================================
  const handleRunManualSweep = async () => {
    try {
      setSweepLoading(true);
      setSweepMessage('');
      const res = await performanceAPI.runMorningSweep({ date: currentDate });
      if (res.data?.ok) {
        setSweepMessage(res.data.message || 'Morning attendance and task check completed.');
        await refreshData();
      }
    } catch (err) {
      setSweepMessage(err.response?.data?.message || 'Check failed to run');
    } finally {
      setSweepLoading(false);
      setTimeout(() => setSweepMessage(''), 7000);
    }
  };

  const handleExportToExcel = () => {
    try {
      setExportingExcel(true);
      const rows = filteredRoster.map((item, idx) => {
        const emp = employeeOf(item);
        const tickets = violationTicketsOf(item);
        return {
          'S.No': idx + 1,
          'Employee ID': emp.employeeId || '',
          'Employee Name': emp.name || '',
          Department: emp.department || item.department || '',
          Attendance: item.morningCheck?.hasAttendance ? 'Present' : 'Missing',
          'Check-in Time': item.morningCheck?.checkInTime || '',
          'Daily Tasks': item.morningCheck?.hasTasks ? 'Submitted' : 'Missing',
          'Task Count': item.morningCheck?.taskCount || 0,
          'Overall Status': ROW_STATUS[statusKeyOf(item)].label,
          'Score': item.compositeScore ?? '',
          'Category': item.category || '',
          'Open Tickets': tickets.map((t) => t.ticketNumber).join(', '),
          Date: currentDate,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = Object.keys(rows[0] || {}).map((key) => ({ wch: Math.max(key.length + 3, 14) }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance & Tasks');
      XLSX.writeFile(workbook, `AOTMS_Attendance_Tasks_${currentDate}.xlsx`);
    } catch (err) {
      console.error('[handleExportToExcel]', err);
      alert('Failed to export Excel file: ' + err.message);
    } finally {
      setExportingExcel(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDept('ALL');
    setActiveFilter('ALL');
  };

  // =============================================================
  // TICKET ACTIONS
  // =============================================================
  const handleOpenTicketDrawer = async (ticket) => {
    try {
      setSelectedTicket(ticket);
      setExplainText('');
      setAckNotes('');
      setHrRemarksText('');
      setAssignedManagerId(ticket.assignedManager?._id || ticket.assignedTo?._id || '');
      setResolveNotes('');
      setActionPlan('');
      setOverrideReasonTicket('');
      setDrawerToast('');

      if (ticket._id) {
        setTicketDetailLoading(true);
        const res = await performanceAPI.getTicket(ticket._id);
        if (res.data?.ok && res.data.ticket) setSelectedTicket(res.data.ticket);
      }
    } catch (err) {
      console.error('[handleOpenTicketDrawer]', err);
    } finally {
      setTicketDetailLoading(false);
    }
  };

  const handleAcknowledgeTicket = async () => {
    if (!selectedTicket) return;
    try {
      setSubmittingAction(true);
      const res = await performanceAPI.acknowledgeTicket(selectedTicket._id, { notes: ackNotes.trim() });
      if (res.data?.ok) {
        setSelectedTicket(res.data.ticket);
        setDrawerToast('Ticket acknowledged successfully!');
        await refreshData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to acknowledge ticket');
    } finally {
      setSubmittingAction(false);
      setTimeout(() => setDrawerToast(''), 4000);
    }
  };

  const handleSubmitExplanation = async () => {
    if (!selectedTicket || !explainText.trim()) return;
    try {
      setSubmittingAction(true);
      const res = await performanceAPI.explainTicket(selectedTicket._id, { explanation: explainText.trim() });
      if (res.data?.ok) {
        setSelectedTicket(res.data.ticket);
        setExplainText('');
        setDrawerToast('Explanation submitted for HR review!');
        await refreshData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit explanation');
    } finally {
      setSubmittingAction(false);
      setTimeout(() => setDrawerToast(''), 4000);
    }
  };

  const handleAddHrRemarks = async () => {
    if (!selectedTicket || !hrRemarksText.trim()) return;
    try {
      setSubmittingAction(true);
      const res = await performanceAPI.addTicketRemarks(selectedTicket._id, { remarks: hrRemarksText.trim() });
      if (res.data?.ok) {
        setSelectedTicket(res.data.ticket);
        setHrRemarksText('');
        setDrawerToast('HR remarks recorded in ticket log!');
        await refreshData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add HR remarks');
    } finally {
      setSubmittingAction(false);
      setTimeout(() => setDrawerToast(''), 4000);
    }
  };

  const handleAssignTicket = async () => {
    if (!selectedTicket || !assignedManagerId) return;
    try {
      setSubmittingAction(true);
      const res = await performanceAPI.assignTicket(selectedTicket._id, { managerId: assignedManagerId });
      if (res.data?.ok) {
        setSelectedTicket(res.data.ticket);
        setDrawerToast('Ticket reassigned successfully!');
        await refreshData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reassign ticket');
    } finally {
      setSubmittingAction(false);
      setTimeout(() => setDrawerToast(''), 4000);
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket || !resolveNotes.trim()) return;
    try {
      setSubmittingAction(true);
      const res = await performanceAPI.resolveTicket(selectedTicket._id, {
        resolutionNotes: resolveNotes.trim(),
        correctiveActionPlan: actionPlan.trim(),
      });
      if (res.data?.ok) {
        setSelectedTicket(res.data.ticket);
        setResolveNotes('');
        setActionPlan('');
        setDrawerToast('Ticket resolved and closed!');
        await refreshData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resolve ticket');
    } finally {
      setSubmittingAction(false);
      setTimeout(() => setDrawerToast(''), 4000);
    }
  };

  const handleOverrideTicket = async () => {
    if (!selectedTicket || !overrideReasonTicket.trim()) {
      alert('Mandatory override reason is required.');
      return;
    }
    try {
      setSubmittingAction(true);
      const res = await performanceAPI.overrideTicket(selectedTicket._id, {
        overrideReason: overrideReasonTicket.trim(),
      });
      if (res.data?.ok) {
        setSelectedTicket(res.data.ticket);
        setOverrideReasonTicket('');
        setDrawerToast('Ticket overridden by management!');
        await refreshData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to override ticket');
    } finally {
      setSubmittingAction(false);
      setTimeout(() => setDrawerToast(''), 4000);
    }
  };

  const handleSaveScoreOverride = async () => {
    if (!overrideModalTarget) return;
    if (isNaN(overrideScore) || overrideScore < 0 || overrideScore > 100) {
      alert('Score must be a number between 0 and 100');
      return;
    }
    if (!overrideReason.trim()) {
      alert('Mandatory override reason is required');
      return;
    }
    try {
      setOverrideLoading(true);
      await performanceAPI.overrideScore(overrideModalTarget._id, {
        newScore: Number(overrideScore),
        reason: overrideReason.trim(),
      });
      setOverrideModalTarget(null);
      await fetchRoster();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to override score');
    } finally {
      setOverrideLoading(false);
    }
  };

  // =============================================================
  // DERIVED LISTS
  // =============================================================
  const uniqueDepartments = useMemo(() => {
    const set = new Set();
    roster.forEach((r) => {
      const dept = r.department || r.employee?.department;
      if (dept) set.add(dept);
    });
    return Array.from(set).sort();
  }, [roster]);

  const filteredRoster = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return roster.filter((item) => {
      const emp = employeeOf(item);
      const matchesSearch =
        !query ||
        (emp.name || '').toLowerCase().includes(query) ||
        (emp.employeeId || '').toLowerCase().includes(query);
      const matchesDept =
        selectedDept === 'ALL' || (emp.department || item.department) === selectedDept;
      const matchesStatus = activeFilter === 'ALL' || statusKeyOf(item) === activeFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [roster, searchQuery, selectedDept, activeFilter]);

  const hasActiveFilters =
    Boolean(searchQuery) || selectedDept !== 'ALL' || activeFilter !== 'ALL';

  // Person drawer: the chosen month, or the week that contains the selected date
  const personPeriodRange = useMemo(() => {
    if (empPeriod === 'WEEK') return getWeekRange(currentDate);
    return getMonthRange(`${empMonth}-01`);
  }, [currentDate, empPeriod, empMonth]);

  // Reload whenever the person or the period changes
  useEffect(() => {
    const empId = selectedEmployee?.employee?._id || selectedEmployee?.employee;
    if (!empId || !personPeriodRange) return;
    fetchPersonHistory(empId, personPeriodRange);
  }, [selectedEmployee, personPeriodRange, fetchPersonHistory]);

  const personDays = useMemo(() => {
    const days = personHistory?.calendarDays || [];
    if (!personPeriodRange) return [];
    const empId = String(selectedEmployee?.employee?._id || selectedEmployee?.employee || '');
    const loadedFor = String(personHistory?.employee?._id || '');
    if (!empId || !loadedFor || empId !== loadedFor) return [];
    // Never count future days as missing
    return days.filter(
      (day) =>
        day.date >= personPeriodRange.start &&
        day.date <= personPeriodRange.end &&
        day.date <= currentDate
    );
  }, [personHistory, personPeriodRange, selectedEmployee, currentDate]);

  // Whole month as returned by the server — the calendar also shows future days
  const personMonthDays = useMemo(() => {
    const days = personHistory?.calendarDays || [];
    const empId = String(selectedEmployee?.employee?._id || selectedEmployee?.employee || '');
    const loadedFor = String(personHistory?.employee?._id || '');
    if (!empId || !loadedFor || empId !== loadedFor) return [];
    return days;
  }, [personHistory, selectedEmployee]);

  const selectedPersonDayData = useMemo(
    () => personMonthDays.find((day) => day.date === selectedPersonDay) || null,
    [personMonthDays, selectedPersonDay]
  );

  // Opening a person from the note icon jumps straight to their latest ticket day
  useEffect(() => {
    if (!focusLatestTicket || !personHistory) return;
    const empId = String(selectedEmployee?.employee?._id || selectedEmployee?.employee || '');
    const loadedFor = String(personHistory?.employee?._id || '');
    if (!empId || empId !== loadedFor) return; // still the previous person's history
    const latest = [...(personHistory.calendarDays || [])]
      .reverse()
      .find((day) => day.tickets?.length || day.ticket);
    if (latest) setSelectedPersonDay(latest.date);
    setFocusLatestTicket(false);
  }, [focusLatestTicket, personHistory, selectedEmployee]);

  // Week + month: one overall ticket each, raised from that period's daily tickets
  const personWeekDays = useMemo(() => {
    const days = personWeek?.calendarDays || [];
    const empId = String(selectedEmployee?.employee?._id || selectedEmployee?.employee || '');
    const loadedFor = String(personWeek?.employee?._id || '');
    if (!empId || !loadedFor || empId !== loadedFor) return [];
    return days.filter((day) => day.date >= personWeekRange.start && day.date <= currentDate);
  }, [personWeek, selectedEmployee, personWeekRange, currentDate]);

  const personMonthCheckedDays = useMemo(
    () => personMonthDays.filter((day) => day.date <= currentDate),
    [personMonthDays, currentDate]
  );

  const weekOverallTicket = useMemo(() => buildOverallTicket(personWeekDays), [personWeekDays]);
  const monthOverallTicket = useMemo(
    () => buildOverallTicket(personMonthCheckedDays),
    [personMonthCheckedDays]
  );

  // The real week/month ticket rows raised by the backend for this person
  const storedOverall = useMemo(() => {
    const list = [...(personHistory?.overallTickets || []), ...(personWeek?.overallTickets || [])];
    const seen = new Set();
    return list.filter((item) => {
      if (!item?._id || seen.has(String(item._id))) return false;
      seen.add(String(item._id));
      return true;
    });
  }, [personHistory, personWeek]);

  const weekOverallRow = useMemo(
    () =>
      storedOverall.find(
        (item) => item.period?.kind === 'WEEK' && item.period?.periodStart === personWeekRange.start
      ) || null,
    [storedOverall, personWeekRange]
  );

  const monthOverallRow = useMemo(
    () =>
      storedOverall.find(
        (item) => item.period?.kind === 'MONTH' && item.period?.periodStart === `${empMonth}-01`
      ) || null,
    [storedOverall, empMonth]
  );

  const personSummary = useMemo(() => {
    let workingDays = 0;
    let presentDays = 0;
    let taskDays = 0;
    let tickets = 0;
    let attTickets = 0;
    let taskTickets = 0;
    let bothTickets = 0;

    personDays.forEach((day) => {
      const onLeave = day.status === 'leave' || day.attendance?.attendanceStatus === 'ON_LEAVE';
      if (day.dayOfWeek !== 0 && !onLeave) {
        workingDays += 1;
        if (day.attendance?.marked) presentDays += 1;
        if (day.todo?.created) taskDays += 1;
      }
      const dayTickets = day.tickets?.length ? day.tickets : day.ticket ? [day.ticket] : [];
      dayTickets.forEach((ticket) => {
        tickets += 1;
        if (ticket.triggerType === 'ATTENDANCE_NON_COMPLIANCE') attTickets += 1;
        else if (ticket.triggerType === 'DAILY_TASK_SUBMISSION_MISSING') taskTickets += 1;
        else if (ticket.triggerType === 'MORNING_COMPLIANCE_DUAL_VIOLATION') bothTickets += 1;
      });
    });

    return {
      workingDays,
      presentDays,
      attMissing: Math.max(0, workingDays - presentDays),
      taskDays,
      tasksMissing: Math.max(0, workingDays - taskDays),
      tickets,
      attTickets,
      taskTickets,
      bothTickets,
    };
  }, [personDays]);

  // Month + week ticket counts per employee, for the roster column
  const ticketsByEmployee = useMemo(() => {
    const map = new Map();
    if (!ticketInsights) return map;
    // Exact server-side counts (the ticket list itself is capped)
    if (ticketInsights.byEmployee) {
      Object.entries(ticketInsights.byEmployee).forEach(([key, counts]) => map.set(key, counts));
      return map;
    }
    (ticketInsights.tickets || []).forEach((ticket) => {
      const key = String(ticket.employee || '');
      if (!key) return;
      const entry = map.get(key) || { month: 0, week: 0, today: 0 };
      if (
        ticket.incidentDate >= ticketInsights.monthStart &&
        ticket.incidentDate <= ticketInsights.monthEnd
      ) {
        entry.month += 1;
      }
      if (
        ticket.incidentDate >= ticketInsights.weekStart &&
        ticket.incidentDate <= ticketInsights.weekEnd
      ) {
        entry.week += 1;
      }
      if (ticket.incidentDate === ticketInsights.date) entry.today += 1;
      map.set(key, entry);
    });
    return map;
  }, [ticketInsights]);

  const summaryCards = [
    { key: 'ALL', label: 'Total employees', value: stats.total, icon: Users, tone: 'slate', hint: 'Everyone on the roster' },
    { key: 'OK', label: 'Fully compliant', value: stats.compliant, icon: CheckCircle2, tone: 'emerald', hint: 'Attendance and tasks on time' },
    { key: 'ATT', label: 'Attendance missing', value: stats.attMissing, icon: AlertTriangle, tone: 'rose', hint: 'Not marked by 10 AM' },
    { key: 'TASK', label: 'Tasks missing', value: stats.tasksMissing, icon: Clock, tone: 'amber', hint: 'No tasks uploaded' },
    { key: 'BOTH', label: 'Both missing', value: stats.both, icon: ShieldAlert, tone: 'purple', hint: 'Attendance and tasks both missing' },
  ];

  const cardTones = {
    slate: { ring: 'border-slate-900 ring-slate-900/10', text: 'text-slate-900', icon: 'text-slate-400 group-hover:text-slate-700' },
    emerald: { ring: 'border-emerald-500 ring-emerald-500/10', text: 'text-emerald-600', icon: 'text-emerald-500' },
    rose: { ring: 'border-rose-500 ring-rose-500/10', text: 'text-rose-600', icon: 'text-rose-500' },
    amber: { ring: 'border-amber-500 ring-amber-500/10', text: 'text-amber-600', icon: 'text-amber-500' },
    purple: { ring: 'border-purple-500 ring-purple-500/10', text: 'text-purple-600', icon: 'text-purple-500' },
  };

  // Week / month overall tickets are period summaries: they carry no acknowledgement,
  // no explanation and no correction deadline — those belong to the daily tickets.
  const selectedTicketIsOverall = Boolean(
    selectedTicket && ['WEEK_OVERALL_VIOLATION', 'MONTH_OVERALL_VIOLATION'].includes(selectedTicket.triggerType)
  );
  const selectedTicketPeriod = selectedTicket?.evidenceSnapshot?.overall || selectedTicket?.period || null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 sm:py-6 md:px-10 md:py-8 lg:px-16 xl:px-24">
      <div className="mx-auto w-full max-w-[1500px] space-y-5 font-sans">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-sm"
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            <Award className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Performance &amp; Compliance</h1>
            <p className="text-xs text-slate-500">
              Daily 10:00 AM check &middot; attendance and task submission for every employee
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              className="cursor-pointer bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
            />
          </div>

          {isAdminOrManager && (
            <button
              onClick={handleRunManualSweep}
              disabled={sweepLoading}
              className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              {sweepLoading ? <AotmsSpinner size={14} /> : <RefreshCw className="h-3.5 w-3.5" />}
              {sweepLoading ? 'Running...' : 'Run 10 AM check'}
            </button>
          )}

          <button
            onClick={handleExportToExcel}
            disabled={exportingExcel || roster.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            title="Export attendance and tasks to Excel"
          >
            <Download className="h-3.5 w-3.5" />
            {exportingExcel ? 'Exporting...' : 'Export'}
          </button>

          <button
            onClick={refreshData}
            disabled={rosterLoading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {rosterLoading ? <AotmsSpinner size={14} /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </button>
        </div>
      </div>

      {sweepMessage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{sweepMessage}</span>
          </div>
          <button onClick={() => setSweepMessage('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Summary cards (click to filter) ────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {summaryCards.map(({ key, label, value, icon: Icon, tone, hint }) => {
          const active = activeFilter === key;
          const t = cardTones[tone];
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(active ? 'ALL' : key)}
              className={`group rounded-xl border bg-white p-4 text-left transition ${
                active
                  ? `shadow-sm ring-2 ${t.ring}`
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </span>
                <Icon className={`h-4 w-4 ${t.icon}`} />
              </div>
              <div className={`mt-2 text-2xl font-bold ${t.text}`}>{value}</div>
              <div className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</div>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name or employee ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All departments</option>
              {uniqueDepartments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="rounded-lg px-2 py-2 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
              >
                Clear
              </button>
            )}

            <span className="hidden text-[11px] font-medium text-slate-400 sm:inline">
              {filteredRoster.length} shown
            </span>
          </div>
        </div>
      </div>

      {/* ── Roster table ───────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">Daily tasks</th>
                <th className="px-4 py-3">Tickets</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-2 py-3 text-right">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rosterLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <AotmsSpinner size={34} text="Loading roster..." />
                  </td>
                </tr>
              ) : filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    No employees match this view.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((item) => {
                  const emp = employeeOf(item);
                  const status = ROW_STATUS[statusKeyOf(item)];
                  const tickets = violationTicketsOf(item);
                  const morning = item.morningCheck || {};
                  const ticketCounts =
                    ticketsByEmployee.get(String(item.employee?._id || item.employee)) || {
                      month: 0,
                      week: 0,
                      today: 0,
                    };
                  // Note control: colour follows today's worst ticket
                  const worstToday = [...tickets].sort(
                    (a, b) => (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0)
                  )[0];
                  const noteIconTone = worstToday?.priority === 'critical'
                    ? 'text-purple-600'
                    : worstToday?.priority === 'red' || worstToday?.priority === 'high'
                    ? 'text-rose-600'
                    : worstToday
                    ? 'text-amber-600'
                    : 'text-slate-400';
                  const openPerson = (focusNote = false) => {
                    setEmpPeriod('MONTH');
                    setEmpMonth(currentDate.slice(0, 7));
                    setSelectedPersonDay('');
                    setFocusLatestTicket(focusNote);
                    setSelectedEmployee(item);
                  };

                  return (
                    <tr
                      key={item._id}
                      onClick={() => openPerson(false)}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                    >
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                            {emp.name?.slice(0, 1)?.toUpperCase() || 'E'}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">
                              {emp.name || 'Unnamed'}
                            </div>
                            <div className="truncate text-[11px] text-slate-400">
                              {emp.employeeId || 'ID pending'}
                              {emp.department ? ` · ${emp.department}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Attendance */}
                      <td className="px-4 py-3">
                        {morning.hasAttendance ? (
                          <div className="flex items-center gap-1.5 text-emerald-700">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span className="font-semibold">Present</span>
                            {morning.checkInTime && (
                              <span className="text-[11px] font-normal text-slate-400">
                                {morning.checkInTime}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-rose-600">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span className="font-semibold">Not marked</span>
                          </div>
                        )}
                      </td>

                      {/* Tasks (Todo, or Digital Calendar for the marketing team) */}
                      <td className="px-4 py-3">
                        {morning.hasTasks ? (
                          <div className="flex items-center gap-1.5 text-emerald-700">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span className="font-semibold">
                              {morning.taskCount
                                ? `${morning.taskCount} ${
                                    morning.taskSource === 'digital-calendar' ? 'planned' : 'submitted'
                                  }`
                                : 'Submitted'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-600">
                            <Clock className="h-4 w-4 shrink-0" />
                            <span className="font-semibold">Not submitted</span>
                          </div>
                        )}
                        {morning.taskSource === 'digital-calendar' && (
                          <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                            Digital Calendar
                          </span>
                        )}
                      </td>

                      {/* Tickets this month / this week */}
                      <td className="px-4 py-3">
                        <div
                          className={`text-xs font-semibold ${
                            ticketCounts.month > 0 ? 'text-slate-900' : 'text-slate-300'
                          }`}
                        >
                          {ticketCounts.month}
                          <span className="ml-1 text-[10px] font-medium text-slate-400">this month</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{ticketCounts.week} this week</div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.badge}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>

                      {/* Note: opens this person's notes on the right */}
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              openPerson(true);
                            }}
                            title={`Open ${emp.name || 'this person'}'s note — ${
                              ticketCounts.month
                            } ticket${ticketCounts.month === 1 ? '' : 's'} this month, ${
                              ticketCounts.week
                            } this week`}
                            className="inline-flex h-7 items-center gap-1 rounded-full border border-slate-200 bg-white pl-1.5 pr-2 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <MessageSquareText className={`h-3.5 w-3.5 shrink-0 ${noteIconTone}`} />
                            <span
                              className={`text-[10px] font-bold ${
                                ticketCounts.month > 0 ? 'text-slate-700' : 'text-slate-300'
                              }`}
                            >
                              {ticketCounts.month > 9 ? '9+' : ticketCounts.month}
                            </span>
                          </button>
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* ── Employee drawer ────────────────────────────────────── */}
      {selectedEmployee &&
        (() => {
          const item = selectedEmployee;
          const emp = employeeOf(item);
          const statusKey = statusKeyOf(item);
          const status = ROW_STATUS[statusKey];
          const morning = item.morningCheck || {};

          return (
            <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
              <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
                {/* Head */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                      {emp.name?.slice(0, 1)?.toUpperCase() || 'E'}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">{emp.name || 'Unnamed'}</h2>
                      <p className="text-[11px] text-slate-400">
                        {emp.employeeId || 'ID pending'}
                        {emp.department ? ` · ${emp.department}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEmployee(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 space-y-4 overflow-y-auto p-5">
                  {/* Today at a glance */}
                  <div className={`rounded-xl border px-3.5 py-3 ${status.badge}`}>
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                      {status.label}
                      <span className="ml-auto font-semibold opacity-70">
                        Score {item.compositeScore ?? '--'}
                        {item.category ? ` · ${item.category}` : ''}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-medium opacity-80">
                      {formatDayLabel(currentDate)} · attendance{' '}
                      {morning.hasAttendance ? 'marked' : 'missing'} ·{' '}
                      {morning.taskSource === 'digital-calendar' ? 'calendar' : 'tasks'}{' '}
                      {morning.hasTasks ? `${morning.taskCount || 1} submitted` : 'missing'}
                    </p>
                    {item.isOverridden && (
                      <p className="mt-1 text-[11px] font-medium opacity-80">
                        Score manually overridden{item.overrideReason ? `: ${item.overrideReason}` : ''}
                      </p>
                    )}
                  </div>

                  {/* Overall ticket: one for the week and one for the month, built from the daily tickets */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <OverallTicketCard
                      title="Week overall ticket"
                      subtitle={`${formatDayLabel(personWeekRange.start)} – ${formatDayLabel(
                        personWeekRange.end
                      )} · ${weekOverallTicket.checkedDays} daily check${
                        weekOverallTicket.checkedDays === 1 ? '' : 's'
                      }`}
                      data={weekOverallTicket}
                      ticket={weekOverallRow}
                    />
                    <OverallTicketCard
                      title={`${formatMonthShort(empMonth)} overall ticket`}
                      subtitle={
                        monthOverallTicket.start
                          ? `${formatDayLabel(monthOverallTicket.start)} – ${formatDayLabel(
                              monthOverallTicket.end
                            )} · ${monthOverallTicket.checkedDays} daily check${
                              monthOverallTicket.checkedDays === 1 ? '' : 's'
                            }`
                          : 'No days loaded for this month'
                      }
                      data={monthOverallTicket}
                      ticket={monthOverallRow}
                    />
                  </div>

                  {/* Colour legend for the overall tickets */}
                  <p className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" />critical</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />red</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />warning</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />clean</span>
                    <span>= worst daily ticket in that week / month</span>
                  </p>
                
                  {/* Period: this one person, one month or one week */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
                        {[
                          { key: 'WEEK', label: 'Week' },
                          { key: 'MONTH', label: 'Month' },
                        ].map((tab) => (
                          <button
                            key={tab.key}
                            onClick={() => {
                              setEmpPeriod(tab.key);
                              setSelectedPersonDay('');
                            }}
                            className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${
                              empPeriod === tab.key
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {`${formatDayLabel(personPeriodRange.start)} – ${formatDayLabel(
                          personPeriodRange.end
                        )}`}
                      </span>
                    </div>

                    {empPeriod === 'MONTH' && (
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 px-1.5 py-1">
                        <button
                          onClick={() => {
                            setEmpMonth((prev) => shiftMonthKey(prev, -1));
                            setSelectedPersonDay('');
                          }}
                          className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                          title="Previous month"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-[11px] font-semibold text-slate-700">
                          {formatMonthKey(empMonth)}
                        </span>
                        <button
                          onClick={() => {
                            setEmpMonth((prev) => shiftMonthKey(prev, 1));
                            setSelectedPersonDay('');
                          }}
                          className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                          title="Next month"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                
                  {personHistoryLoading ? (
                    <div className="py-8 text-center text-slate-400">
                      <AotmsSpinner size={26} text="Loading history..." />
                    </div>
                  ) : (
                    <>
                      {/* Summary for the selected period */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl border border-slate-200 p-3">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Attendance
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-900">
                            {personSummary.presentDays}
                            <span className="text-[11px] font-semibold text-slate-400">
                              {' '}
                              / {personSummary.workingDays} days
                            </span>
                          </div>
                          <div
                            className={`mt-0.5 text-[10px] font-semibold ${
                              personSummary.attMissing > 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {personSummary.attMissing > 0
                              ? `${personSummary.attMissing} missing`
                              : 'No misses'}
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-3">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Tasks
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-900">
                            {personSummary.taskDays}
                            <span className="text-[11px] font-semibold text-slate-400">
                              {' '}
                              / {personSummary.workingDays} days
                            </span>
                          </div>
                          <div
                            className={`mt-0.5 text-[10px] font-semibold ${
                              personSummary.tasksMissing > 0 ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            {personSummary.tasksMissing > 0
                              ? `${personSummary.tasksMissing} missing`
                              : 'No misses'}
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-3">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Tickets
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-900">
                            {personSummary.tickets}
                          </div>
                          <div className="mt-0.5 text-[10px] font-medium text-slate-400">
                            {personSummary.attTickets} att · {personSummary.taskTickets} task ·{' '}
                            {personSummary.bothTickets} both
                          </div>
                        </div>
                      </div>
                
                      {/* Month: one colour per day, so a raised ticket is visible */}
                      {empPeriod === 'MONTH' ? (
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              {formatMonthKey(empMonth)} · ticket colours
                            </h3>
                            <span className="text-[10px] text-slate-400">
                              {personMonthDays.length} days
                            </span>
                          </div>

                          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-slate-400">
                            <div>Mon</div>
                            <div>Tue</div>
                            <div>Wed</div>
                            <div>Thu</div>
                            <div>Fri</div>
                            <div>Sat</div>
                            <div>Sun</div>
                          </div>

                          {personMonthDays.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-[11px] text-slate-500">
                              No attendance, task or ticket history for this month.
                            </p>
                          ) : (
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({
                              length:
                                (personMonthDays[0]?.dayOfWeek ?? 1) === 0
                                  ? 6
                                  : (personMonthDays[0]?.dayOfWeek ?? 1) - 1,
                            }).map((_, i) => (
                              <div key={`blank-${i}`} />
                            ))}

                            {personMonthDays.map((day) => {
                              const ticketCount =
                                day.ticketCount || day.tickets?.length || (day.ticket ? 1 : 0);
                              const isSelected = selectedPersonDay === day.date;
                              return (
                                <button
                                  key={day.date}
                                  onClick={() => setSelectedPersonDay(isSelected ? '' : day.date)}
                                  title={`${formatDayLabel(day.date)} · ${
                                    DAY_STATUS_LABEL[day.status] || day.status
                                  }${ticketCount > 0 ? ` · ${ticketCount} ticket(s)` : ''}`}
                                  className={`flex h-14 flex-col items-center justify-center rounded-lg border transition ${
                                    DAY_CELL[day.status] || DAY_CELL.neutral
                                  } ${day.isFuture ? 'opacity-40' : ''} ${
                                    isSelected
                                      ? 'ring-2 ring-slate-900 ring-offset-1'
                                      : 'hover:border-slate-400'
                                  }`}
                                >
                                  <span className="text-[11px] font-bold">{day.dayOfMonth}</span>
                                  {ticketCount > 0 ? (
                                    <span className="mt-0.5 rounded-full bg-white/80 px-1 text-[9px] font-bold">
                                      {ticketCount} ticket{ticketCount > 1 ? 's' : ''}
                                    </span>
                                  ) : (
                                    <span className="mt-0.5 text-[9px] font-semibold">
                                      {day.status === 'compliant'
                                        ? 'On time'
                                        : day.status === 'partial'
                                        ? 'Partly'
                                        : ''}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-slate-500">
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-purple-500" /> Critical
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-rose-500" /> Escalated
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-amber-500" /> Warning
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" /> On time
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-slate-300" /> Leave / no record
                            </span>
                          </div>

                          {selectedPersonDayData ? (
                            <div className="mt-3 rounded-xl border border-slate-200 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-slate-800">
                                  {formatDayWithWeekday(selectedPersonDayData.date)}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                      DAY_TONE[selectedPersonDayData.status] || DAY_TONE.neutral
                                    }`}
                                  >
                                    {DAY_STATUS_LABEL[selectedPersonDayData.status] ||
                                      selectedPersonDayData.status}
                                  </span>
                                  <button
                                    onClick={() => setSelectedPersonDay('')}
                                    className="text-slate-400 hover:text-slate-700"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold">
                                <span
                                  className={
                                    selectedPersonDayData.attendance?.marked
                                      ? 'text-emerald-600'
                                      : 'text-rose-600'
                                  }
                                >
                                  {selectedPersonDayData.attendance?.marked
                                    ? `Attendance in ${selectedPersonDayData.attendance.time || '—'}${
                                        selectedPersonDayData.attendance.onTime
                                          ? ' (on time)'
                                          : ' (late)'
                                      }`
                                    : 'Attendance not marked'}
                                </span>
                                <span
                                  className={
                                    selectedPersonDayData.todo?.created
                                      ? 'text-emerald-600'
                                      : 'text-amber-600'
                                  }
                                >
                                  {selectedPersonDayData.todo?.created
                                    ? `${selectedPersonDayData.todo.count} ${
                                        selectedPersonDayData.todo.count > 1
                                          ? selectedPersonDayData.todo.source === 'digital-calendar'
                                            ? 'calendar items'
                                            : 'tasks'
                                          : selectedPersonDayData.todo.source === 'digital-calendar'
                                            ? 'calendar item'
                                            : 'task'
                                      } by 10 AM`
                                    : selectedPersonDayData.todo?.source === 'digital-calendar'
                                      ? 'No calendar work by 10 AM'
                                      : 'No tasks by 10 AM'}
                                </span>
                              </div>

                              {selectedPersonDayData.todo?.titles?.length ? (
                                <p className="mt-1.5 truncate text-[10px] text-slate-500" title={selectedPersonDayData.todo.titles.join(' · ')}>
                                  {selectedPersonDayData.todo.titles.join(' · ')}
                                </p>
                              ) : null}

                              {(selectedPersonDayData.tickets?.length
                                ? selectedPersonDayData.tickets
                                : selectedPersonDayData.ticket
                                ? [selectedPersonDayData.ticket]
                                : []
                              ).map((ticket) => (
                                <TicketLine
                                  key={ticket._id || ticket.ticketNumber}
                                  ticket={ticket}
                                  onOpen={handleOpenTicketDrawer}
                                />
                              ))}
                            </div>
                          ) : (
                            <p className="mt-3 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-center text-[10px] text-slate-500">
                              Tap a day to see attendance, tasks and the ticket reason.
                            </p>
                          )}
                        </div>
                      ) : (
                        /* Week: the same detail as a list */
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Day by day
                            </h3>
                            <span className="text-[10px] text-slate-400">
                              {personDays.length} days
                            </span>
                          </div>
                          {personDays.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-4 text-center text-[11px] text-slate-500">
                              No days to show for this week.
                            </p>
                          ) : (
                            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                              {personDays.map((day) => {
                                const isSunday = day.dayOfWeek === 0;
                                const onLeave = day.status === 'leave';
                                const attendance = day.attendance || {};
                                const todo = day.todo || {};
                                const dayTickets = day.tickets?.length
                                  ? day.tickets
                                  : day.ticket
                                  ? [day.ticket]
                                  : [];
                                return (
                                  <div key={day.date} className="px-3 py-2.5">
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                      <span className="w-[86px] shrink-0 text-[11px] font-semibold text-slate-700">
                                        {formatDayWithWeekday(day.date)}
                                      </span>
                                      {isSunday ? (
                                        <span className="text-[10px] text-slate-400">Sunday</span>
                                      ) : onLeave ? (
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                          On leave
                                        </span>
                                      ) : (
                                        <>
                                          <span
                                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                              attendance.marked ? 'text-emerald-600' : 'text-rose-600'
                                            }`}
                                          >
                                            {attendance.marked ? (
                                              <CheckCircle2 className="h-3.5 w-3.5" />
                                            ) : (
                                              <AlertTriangle className="h-3.5 w-3.5" />
                                            )}
                                            {attendance.marked
                                              ? `In ${attendance.time || '—'}`
                                              : 'No attendance'}
                                          </span>
                                          <span
                                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                              todo.created ? 'text-emerald-600' : 'text-amber-600'
                                            }`}
                                          >
                                            {todo.created ? (
                                              <CheckCircle2 className="h-3.5 w-3.5" />
                                            ) : (
                                              <Clock className="h-3.5 w-3.5" />
                                            )}
                                            {todo.created
                                              ? `${todo.count || 1} task${(todo.count || 1) > 1 ? 's' : ''}`
                                              : 'No tasks'}
                                          </span>
                                        </>
                                      )}
                                      {dayTickets.length > 0 && (
                                        <span
                                          className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                            DAY_TONE[day.status] || DAY_TONE.neutral
                                          }`}
                                        >
                                          {dayTickets.length} ticket{dayTickets.length > 1 ? 's' : ''}
                                        </span>
                                      )}
                                    </div>
                                    {dayTickets.map((ticket) => (
                                      <TicketLine
                                        key={ticket._id || ticket.ticketNumber}
                                        ticket={ticket}
                                        onOpen={handleOpenTicketDrawer}
                                      />
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2 border-t border-slate-100 p-4">
                  {isAdminOrManager && (
                    <button
                      onClick={() => {
                        setOverrideModalTarget(item);
                        setOverrideScore(item.compositeScore ?? '');
                        setOverrideReason(item.overrideReason || '');
                      }}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Sliders className="h-3.5 w-3.5 text-slate-500" />
                      Adjust score
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* ── Ticket drawer ──────────────────────────────────────── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-slate-900/50">
          <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="border-b border-slate-100 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-mono font-bold text-slate-700">
                  {selectedTicket.ticketNumber}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    selectedTicket.priority === 'orange'
                      ? 'bg-amber-50 text-amber-700'
                      : selectedTicket.priority === 'red'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-purple-50 text-purple-700'
                  }`}
                >
                  {selectedTicket.priority} priority
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                  {(selectedTicket.status || 'open').replace('_', ' ')}
                </span>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
              <h2 className="mt-3 text-sm font-bold text-slate-900">{selectedTicket.title}</h2>
              <p className="mt-1 text-[11px] text-slate-500">{selectedTicket.description}</p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
              {ticketDetailLoading && (
                <div className="py-4 text-center text-slate-400">
                  <AotmsSpinner size={24} text="Loading ticket..." />
                </div>
              )}

              {drawerToast && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  {drawerToast}
                </div>
              )}

              {/* Facts */}
              <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Employee</span>
                  <span className="font-semibold text-slate-900">
                    {selectedTicket.employeeName} ({selectedTicket.employeeCode || 'ID pending'})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Department</span>
                  <span className="font-semibold text-slate-800">{selectedTicket.department || 'General'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{selectedTicketIsOverall ? 'Period' : 'Date'}</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTicketIsOverall && selectedTicketPeriod
                      ? `${selectedTicketPeriod.periodStart} → ${selectedTicketPeriod.periodEnd}`
                      : selectedTicket.incidentDate}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{selectedTicketIsOverall ? 'Worst streak' : 'Streak'}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                    <Flame className="h-3.5 w-3.5" />
                    {selectedTicket.consecutiveCount || 1} working day
                    {(selectedTicket.consecutiveCount || 1) > 1 ? 's' : ''}
                  </span>
                </div>
                {!selectedTicketIsOverall && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Correction deadline</span>
                    <span className="font-semibold text-amber-700">
                      {selectedTicket.correctionDeadline
                        ? new Date(selectedTicket.correctionDeadline).toLocaleString('en-IN')
                        : 'N/A'}
                    </span>
                  </div>
                )}
                {selectedTicketIsOverall && selectedTicketPeriod?.sourceTickets?.length > 0 && (
                  <div className="border-t border-slate-100 pt-2">
                    <span className="text-slate-500">Daily tickets inside this summary</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedTicketPeriod.sourceTickets.map((number) => (
                        <span
                          key={number}
                          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600"
                        >
                          {number}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Acknowledge / explanation: only for a single day ticket, a period summary is not acknowledged */}
              {!selectedTicketIsOverall && (
                <>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <span className="font-semibold text-slate-700">Employee acknowledgement</span>
                  <p className="text-[11px] text-slate-500">
                    {selectedTicket.isAcknowledged ? (
                      <span className="font-semibold text-emerald-600">
                        Acknowledged on {new Date(selectedTicket.acknowledgedAt).toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-600">Pending</span>
                    )}
                  </p>
                </div>
                {!selectedTicket.isAcknowledged && (
                  <button
                    onClick={handleAcknowledgeTicket}
                    disabled={submittingAction}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                  >
                    Acknowledge
                  </button>
                )}
              </div>

              {/* Explanation */}
              {selectedTicket.employeeExplanation ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                  <span className="text-[11px] font-bold">Employee explanation</span>
                  <p className="mt-1 text-[11px]">{selectedTicket.employeeExplanation}</p>
                </div>
              ) : (
                <div className="space-y-2 rounded-xl border border-slate-200 px-4 py-3">
                  <label className="text-[11px] font-semibold text-slate-700">Add explanation</label>
                  <textarea
                    rows={2}
                    placeholder="Reason for missing the 10:00 AM check..."
                    value={explainText}
                    onChange={(e) => setExplainText(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                  <button
                    onClick={handleSubmitExplanation}
                    disabled={submittingAction || !explainText.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Submit explanation
                  </button>
                </div>
              )}
                </>
              )}

              {selectedTicket.hrRemarks && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-900">
                  <span className="text-[11px] font-bold">HR remarks</span>
                  <p className="mt-1 text-[11px]">{selectedTicket.hrRemarks}</p>
                </div>
              )}

              {selectedTicket.resolutionNotes && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
                  <span className="text-[11px] font-bold">Resolution</span>
                  <p className="mt-1 text-[11px]">{selectedTicket.resolutionNotes}</p>
                  {selectedTicket.correctiveActionPlan && (
                    <p className="mt-1 text-[11px] font-semibold">
                      Action plan: {selectedTicket.correctiveActionPlan}
                    </p>
                  )}
                </div>
              )}

              {/* Management actions */}
              {isAdminOrManager && selectedTicket.status !== 'resolved' && (
                <div className="space-y-4 border-t border-slate-200 pt-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Management actions
                  </h3>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700">HR remark</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Official HR note..."
                        value={hrRemarksText}
                        onChange={(e) => setHrRemarksText(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                      <button
                        onClick={handleAddHrRemarks}
                        disabled={submittingAction || !hrRemarksText.trim()}
                        className="rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  {managersList.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-700">Assign to</label>
                      <div className="flex gap-2">
                        <select
                          value={assignedManagerId}
                          onChange={(e) => setAssignedManagerId(e.target.value)}
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 focus:outline-none"
                        >
                          <option value="">Select manager</option>
                          {managersList.map((m) => (
                            <option key={m._id} value={m._id}>
                              {m.name} ({m.role})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAssignTicket}
                          disabled={submittingAction || !assignedManagerId}
                          className="rounded-lg bg-sky-700 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <span className="text-[11px] font-bold text-emerald-900">Resolve ticket</span>
                    <textarea
                      rows={2}
                      placeholder="Resolution findings..."
                      value={resolveNotes}
                      onChange={(e) => setResolveNotes(e.target.value)}
                      className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                    <input
                      type="text"
                      placeholder="Corrective action plan (optional)"
                      value={actionPlan}
                      onChange={(e) => setActionPlan(e.target.value)}
                      className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                    <button
                      onClick={handleResolveTicket}
                      disabled={submittingAction || !resolveNotes.trim()}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-[11px] font-semibold text-white disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Resolve and close
                    </button>
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <span className="text-[11px] font-semibold text-slate-700">Management override</span>
                    <input
                      type="text"
                      placeholder="Exemption justification..."
                      value={overrideReasonTicket}
                      onChange={(e) => setOverrideReasonTicket(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] focus:outline-none"
                    />
                    <button
                      onClick={handleOverrideTicket}
                      disabled={submittingAction || !overrideReasonTicket.trim()}
                      className="rounded-lg bg-slate-700 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                    >
                      Confirm override
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 p-4">
              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── Score override modal ───────────────────────────────── */}
      {overrideModalTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Adjust performance score</h3>
              <button
                onClick={() => setOverrideModalTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-[11px] text-slate-600">
              <div>
                <span className="font-semibold text-slate-800">Employee: </span>
                {employeeOf(overrideModalTarget).name}
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">New score (0 - 100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Reason</label>
                <textarea
                  rows={2}
                  placeholder="Why is the score being changed?"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setOverrideModalTarget(null)}
                className="rounded-lg px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScoreOverride}
                disabled={overrideLoading}
                className="rounded-lg px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                {overrideLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
