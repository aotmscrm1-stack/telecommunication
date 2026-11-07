import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  ShieldAlert, 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronRight, 
  ChevronLeft,
  Award, 
  TrendingUp, 
  Check, 
  Send, 
  X, 
  Sliders, 
  Calendar,
  Ticket,
  Eye,
  Download,
  Flame,
  CheckCheck,
  RefreshCcw,
  ShieldX,
  UserCheck,
  CalendarDays,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { performanceAPI } from '../../../services/api';

const PRIMARY_COLOR = '#1677C8';

export default function PerformanceDashboard() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  // Current working date (Asia/Kolkata default)
  const [currentDate, setCurrentDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );

  // Summary Metrics State
  const [metrics, setMetrics] = useState(null);

  // Employee Roster State
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  // activeFilterPill: 'ALL' | 'COMPLIANT' | 'VIOLATIONS' | 'TASKS_MISSING' | 'ATTENDANCE_MISSING' | 'DUAL'
  const [activeFilterPill, setActiveFilterPill] = useState('ALL');

  // Sweep Trigger State
  const [sweepLoading, setSweepLoading] = useState(false);
  const [sweepMessage, setSweepMessage] = useState('');
  const [exportingExcel, setExportingExcel] = useState(false);

  // Selected Ticket for Side Drawer
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedCompliantRecord, setSelectedCompliantRecord] = useState(null);
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

  // Score Override Modal Target
  const [overrideModalTarget, setOverrideModalTarget] = useState(null);
  const [overrideScore, setOverrideScore] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);

  // Employee Monthly Calendar Modal Target
  const [calendarModalEmp, setCalendarModalEmp] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7)
  );
  const [employeeHistoryData, setEmployeeHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedDayAudit, setSelectedDayAudit] = useState(null);

  // =============================================================
  // DATA FETCHING
  // =============================================================

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await performanceAPI.getComplianceToday({ date: currentDate });
      if (res.data?.ok && res.data.metrics) {
        setMetrics(res.data.metrics);
      }
    } catch (err) {
      console.error('[fetchMetrics]', err);
    }
  }, [currentDate]);

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

  const fetchManagers = useCallback(async () => {
    try {
      if (performanceAPI.getTicketManagers) {
        const res = await performanceAPI.getTicketManagers();
        if (res.data?.ok) {
          setManagersList(res.data.managers || []);
        }
      }
    } catch (err) {
      console.error('[fetchManagers]', err);
    }
  }, []);

  const fetchEmployeeCalendar = useCallback(async (empId, month) => {
    if (!empId) return;
    try {
      setHistoryLoading(true);
      setSelectedDayAudit(null);
      const res = await performanceAPI.getEmployeeHistory(empId, { month: month || calendarMonth });
      if (res.data?.ok) {
        setEmployeeHistoryData(res.data);
      }
    } catch (err) {
      console.error('[fetchEmployeeCalendar]', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [calendarMonth]);

  useEffect(() => {
    fetchMetrics();
    fetchRoster();
  }, [fetchMetrics, fetchRoster]);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  useEffect(() => {
    if (calendarModalEmp) {
      const empId = calendarModalEmp.employee?._id || calendarModalEmp._id;
      fetchEmployeeCalendar(empId, calendarMonth);
    }
  }, [calendarModalEmp, calendarMonth, fetchEmployeeCalendar]);

  // =============================================================
  // CALCULATED METRICS (Guarantees KPI Cards are NEVER Empty or '--')
  // =============================================================
  const stats = useMemo(() => {
    const total = roster.length > 0 ? roster.length : (typeof metrics?.totalActive === 'number' ? metrics.totalActive : 0);
    let compliant = 0;
    let attMissing = 0;
    let tasksMissing = 0;
    let dual = 0;

    roster.forEach(r => {
      const tickets = Array.isArray(r.tickets) ? r.tickets : [];
      const violationTickets = tickets.filter(t => t.priority !== 'green' && t.triggerType !== 'MORNING_COMPLIANCE_PASSED');
      const hasGreenTicket = tickets.some(t => t.priority === 'green' || t.triggerType === 'MORNING_COMPLIANCE_PASSED');
      const isCompliant = violationTickets.length === 0 || hasGreenTicket || r.morningCheck?.isCompliant;

      if (isCompliant) {
        compliant++;
      } else {
        const hasDual = violationTickets.some(t => t.triggerType === 'MORNING_COMPLIANCE_DUAL_VIOLATION');
        const hasAtt = violationTickets.some(t => t.triggerType === 'ATTENDANCE_NON_COMPLIANCE');
        const hasTasks = violationTickets.some(t => t.triggerType === 'DAILY_TASK_SUBMISSION_MISSING');
        if (hasDual) dual++;
        else if (hasAtt) attMissing++;
        else if (hasTasks) tasksMissing++;
        else tasksMissing++;
      }
    });

    if (roster.length > 0) {
      return { total, compliant, attMissing, tasksMissing, dual };
    }

    return {
      total: (typeof metrics?.totalActive === 'number') ? metrics.totalActive : 0,
      compliant: (typeof metrics?.fullyCompliantMorning === 'number') ? metrics.fullyCompliantMorning : 0,
      attMissing: (typeof metrics?.attendanceMissingTickets === 'number') ? metrics.attendanceMissingTickets : 0,
      tasksMissing: (typeof metrics?.taskMissingTickets === 'number') ? metrics.taskMissingTickets : 0,
      dual: (typeof metrics?.dualViolations === 'number') ? metrics.dualViolations : 0
    };
  }, [roster, metrics]);

  // =============================================================
  // MANUAL 10:00 AM SWEEP
  // =============================================================
  const handleRunManualSweep = async () => {
    try {
      setSweepLoading(true);
      setSweepMessage('');
      const res = await performanceAPI.runMorningSweep({ date: currentDate });
      if (res.data?.ok) {
        setSweepMessage(res.data.message || '10:00 AM sweep completed successfully!');
        await fetchMetrics();
        await fetchRoster();
      }
    } catch (err) {
      setSweepMessage(err.response?.data?.message || 'Sweep execution failed');
    } finally {
      setSweepLoading(false);
      setTimeout(() => setSweepMessage(''), 7000);
    }
  };

  // =============================================================
  // EXPORT TO EXCEL
  // =============================================================
  const handleExportToExcel = () => {
    try {
      setExportingExcel(true);
      const rows = filteredRoster.map((item, idx) => {
        const emp = item.employee || { name: item.employeeName, employeeId: item.employeeCode, department: item.department };
        const empTickets = Array.isArray(item.tickets) ? item.tickets : [];
        const ticket = empTickets[0];

        return {
          'S.No': idx + 1,
          'Employee ID': emp.employeeId || item.employeeCode || '',
          'Employee Name': emp.name || item.employeeName || '',
          'Department': emp.department || item.department || '',
          'Composite Score': item.compositeScore ?? '--',
          'Performance Category': item.category || 'PENDING',
          'Tasks Completion Pillar': `${item.pillarScores?.taskCompletion ?? '--'}%`,
          'Productivity Pillar': `${item.pillarScores?.productivity ?? '--'}%`,
          'Attendance Pillar': `${item.pillarScores?.attendance ?? '--'}%`,
          'Work Quality Pillar': `${item.pillarScores?.workQuality ?? '--'}%`,
          'Discipline Pillar': `${item.pillarScores?.discipline ?? '--'}%`,
          'Raised Ticket': ticket ? ticket.ticketNumber : `PASS-${currentDate.replace(/-/g, '')}-${emp.employeeId || 'PASS'}`,
          'Compliance Status': ticket ? formatTriggerType(ticket.triggerType) : '100% Morning Compliant (Green Ticket)',
          'Priority': ticket ? (ticket.priority || '').toUpperCase() : 'COMPLIANT',
          'Violation Streak': ticket ? `${ticket.consecutiveCount || 1} Days` : '0 Days',
          'Ticket Status': ticket ? (ticket.status || 'open').toUpperCase() : 'VERIFIED',
          'Evaluation Date': currentDate
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length + 3, 14) }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Compliance');
      XLSX.writeFile(workbook, `AOTMS_Compliance_Roster_${currentDate}.xlsx`);
    } catch (err) {
      console.error('[handleExportToExcel]', err);
      alert('Failed to export Excel file: ' + err.message);
    } finally {
      setExportingExcel(false);
    }
  };

  // =============================================================
  // TICKET DRAWER HANDLERS
  // =============================================================
  const handleOpenTicketDrawer = async (ticket) => {
    try {
      setSelectedCompliantRecord(null);
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
        if (res.data?.ok && res.data.ticket) {
          setSelectedTicket(res.data.ticket);
        }
      }
    } catch (err) {
      console.error('[handleOpenTicketDrawer]', err);
    } finally {
      setTicketDetailLoading(false);
    }
  };

  // Opens Green Clearance Ticket for Compliant Employees
  const handleOpenCompliantDrawer = (rosterItem) => {
    setSelectedTicket(null);
    setSelectedCompliantRecord(rosterItem);
  };

  const handleAcknowledgeTicket = async () => {
    if (!selectedTicket) return;
    try {
      setSubmittingAction(true);
      const res = await performanceAPI.acknowledgeTicket(selectedTicket._id, { notes: ackNotes.trim() });
      if (res.data?.ok) {
        setSelectedTicket(res.data.ticket);
        setDrawerToast('Ticket acknowledged successfully!');
        await fetchRoster();
        await fetchMetrics();
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
        await fetchRoster();
        await fetchMetrics();
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
        await fetchRoster();
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
        await fetchRoster();
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
        correctiveActionPlan: actionPlan.trim()
      });
      if (res.data?.ok) {
        setSelectedTicket(res.data.ticket);
        setResolveNotes('');
        setActionPlan('');
        setDrawerToast('Ticket resolved and closed!');
        await fetchRoster();
        await fetchMetrics();
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
        overrideReason: overrideReasonTicket.trim()
      });
      if (res.data?.ok) {
        setSelectedTicket(res.data.ticket);
        setOverrideReasonTicket('');
        setDrawerToast('Ticket overridden by management!');
        await fetchRoster();
        await fetchMetrics();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to override ticket');
    } finally {
      setSubmittingAction(false);
      setTimeout(() => setDrawerToast(''), 4000);
    }
  };

  // Score Override Modal
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
        reason: overrideReason.trim()
      });
      setOverrideModalTarget(null);
      await fetchRoster();
      await fetchMetrics();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to override score');
    } finally {
      setOverrideLoading(false);
    }
  };

  // Human-friendly trigger types
  const formatTriggerType = (type) => {
    switch (type) {
      case 'MORNING_COMPLIANCE_DUAL_VIOLATION':
        return 'Dual Violation (Att + Tasks)';
      case 'DAILY_TASK_SUBMISSION_MISSING':
        return 'Tasks Missing by 10 AM';
      case 'ATTENDANCE_NON_COMPLIANCE':
        return 'Attendance Missing by 10 AM';
      case 'SHIFT_TASK_UPDATE_MISSING':
        return 'Shift Tasks Unclosed';
      case 'TASK_OVERDUE':
        return 'Task Overdue';
      case 'POOR_PERFORMANCE_DAILY':
        return 'Daily Score < 65';
      default:
        return String(type || '').replace(/_/g, ' ');
    }
  };

  // Unique departments
  const uniqueDepartments = useMemo(() => {
    const set = new Set();
    roster.forEach(r => { if (r.department) set.add(r.department); });
    return Array.from(set).sort();
  }, [roster]);

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return roster.filter(item => {
      const emp = item.employee || { name: item.employeeName, employeeId: item.employeeCode, department: item.department };
      const empTickets = Array.isArray(item.tickets) ? item.tickets : [];

      const matchesSearch = !searchQuery || 
        (emp.name && emp.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (emp.employeeId && emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.employeeName && item.employeeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.employeeCode && item.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesDept = selectedDept === 'ALL' || item.department === selectedDept || emp.department === selectedDept;
      const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;

      const violationTickets = empTickets.filter(t => t.priority !== 'green' && t.triggerType !== 'MORNING_COMPLIANCE_PASSED');
      const hasGreenTicket = empTickets.some(t => t.priority === 'green' || t.triggerType === 'MORNING_COMPLIANCE_PASSED');
      const isCompliant = violationTickets.length === 0 || hasGreenTicket || item.morningCheck?.isCompliant;

      // Pill filter
      let matchesPill = true;
      if (activeFilterPill === 'COMPLIANT') {
        matchesPill = isCompliant;
      } else if (activeFilterPill === 'VIOLATIONS') {
        matchesPill = !isCompliant && violationTickets.length > 0;
      } else if (activeFilterPill === 'TASKS_MISSING') {
        matchesPill = violationTickets.some(t => t.triggerType === 'DAILY_TASK_SUBMISSION_MISSING');
      } else if (activeFilterPill === 'ATTENDANCE_MISSING') {
        matchesPill = violationTickets.some(t => t.triggerType === 'ATTENDANCE_NON_COMPLIANCE');
      } else if (activeFilterPill === 'DUAL') {
        matchesPill = violationTickets.some(t => t.triggerType === 'MORNING_COMPLIANCE_DUAL_VIOLATION');
      } else if (activeFilterPill === 'ORANGE') {
        matchesPill = violationTickets.some(t => t.priority === 'orange');
      } else if (activeFilterPill === 'RED') {
        matchesPill = violationTickets.some(t => t.priority === 'red');
      } else if (activeFilterPill === 'CRITICAL') {
        matchesPill = violationTickets.some(t => t.priority === 'critical');
      }

      return matchesSearch && matchesDept && matchesCat && matchesPill;
    });
  }, [roster, searchQuery, selectedDept, selectedCategory, activeFilterPill]);

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 md:p-6 space-y-6 font-sans">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & CONTROLS */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-3.5">
          <span 
            className="p-3 text-white rounded-2xl shadow-sm flex items-center justify-center shrink-0"
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            <Award className="w-6 h-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Employee Performance & Compliance</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-[#1677C8] border border-sky-200">
                10:00 AM IST Universal Rule
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Live morning compliance, progressive ticket escalation, and 5-pillar scores
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-inner">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-600 text-[11px] uppercase">Date:</span>
            <input 
              type="date" 
              value={currentDate} 
              onChange={(e) => setCurrentDate(e.target.value)}
              className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer text-xs"
            />
          </div>

          {isAdminOrManager && (
            <button
              onClick={handleRunManualSweep}
              disabled={sweepLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:opacity-95 active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sweepLoading ? 'animate-spin' : ''}`} />
              <span>{sweepLoading ? 'Evaluating...' : 'Run 10:00 AM Sweep'}</span>
            </button>
          )}

          <button
            onClick={handleExportToExcel}
            disabled={exportingExcel || roster.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            title="Export full employee performance and tickets to Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportingExcel ? 'Exporting...' : 'Export Excel'}</span>
          </button>

          <button
            onClick={() => { fetchMetrics(); fetchRoster(); }}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
            title="Refresh current data"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {sweepMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span>{sweepMessage}</span>
          </div>
          <button onClick={() => setSweepMessage('')} className="text-emerald-700 hover:text-emerald-950 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. SUMMARY KPI CARDS (ALWAYS POPULATED, CLICK TO FILTER) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* Total Active */}
        <div 
          onClick={() => setActiveFilterPill('ALL')}
          className={`bg-white p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group ${
            activeFilterPill === 'ALL' ? 'border-[#1677C8] ring-2 ring-[#1677C8]/20' : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Total Active</span>
            <Users className="w-4 h-4 text-slate-400 group-hover:text-[#1677C8]" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {stats.total ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Target Workforce</div>
        </div>

        {/* Both Compliant */}
        <div 
          onClick={() => setActiveFilterPill('COMPLIANT')}
          className={`bg-white p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group ${
            activeFilterPill === 'COMPLIANT' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-emerald-100'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
            <span>Both Compliant</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">
            {stats.compliant ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600/80">Attendance & Tasks on time</div>
        </div>

        {/* Attendance Missing */}
        <div 
          onClick={() => setActiveFilterPill('ATTENDANCE_MISSING')}
          className={`bg-white p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group ${
            activeFilterPill === 'ATTENDANCE_MISSING' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-rose-100'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 text-[11px] font-bold uppercase tracking-wider">
            <span>Attendance Missing</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600">
            {stats.attMissing ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-rose-600/80">Check-in not marked by 10 AM</div>
        </div>

        {/* Tasks Missing */}
        <div 
          onClick={() => setActiveFilterPill('TASKS_MISSING')}
          className={`bg-white p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group ${
            activeFilterPill === 'TASKS_MISSING' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-amber-100'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 text-[11px] font-bold uppercase tracking-wider">
            <span>Tasks Missing</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600">
            {stats.tasksMissing ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-amber-600/80">No daily tasks uploaded</div>
        </div>

        {/* Dual Violations */}
        <div 
          onClick={() => setActiveFilterPill('DUAL')}
          className={`bg-white p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between col-span-2 sm:col-span-1 group ${
            activeFilterPill === 'DUAL' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-purple-100'
          }`}
        >
          <div className="flex items-center justify-between text-purple-700 text-[11px] font-bold uppercase tracking-wider">
            <span>Dual Violations</span>
            <ShieldAlert className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-purple-700">
            {stats.dual ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-purple-600/80">Single combined ticket</div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SEARCH & QUICK FILTER PILLS BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by employee name or ID (e.g. AOTMS-01)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1677C8]"
            />
          </div>

          {/* Department & Category Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Departments</option>
              {uniqueDepartments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Score Categories</option>
              <option value="GREEN">🟢 Green (85–100)</option>
              <option value="ORANGE">🟠 Orange (65–84.99)</option>
              <option value="RED">🔴 Red (&lt; 65)</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-bold uppercase text-[10px] shrink-0 mr-1">Filter View:</span>
          
          <button
            onClick={() => setActiveFilterPill('ALL')}
            className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 ${
              activeFilterPill === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Employees ({stats.total})
          </button>

          <button
            onClick={() => setActiveFilterPill('COMPLIANT')}
            className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeFilterPill === 'COMPLIANT'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Fully Compliant ({stats.compliant})</span>
          </button>

          <button
            onClick={() => setActiveFilterPill('VIOLATIONS')}
            className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeFilterPill === 'VIOLATIONS'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/80'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>With Violations ({stats.total - stats.compliant})</span>
          </button>

          <button
            onClick={() => setActiveFilterPill('TASKS_MISSING')}
            className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeFilterPill === 'TASKS_MISSING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Tasks Missing ({stats.tasksMissing})</span>
          </button>

          <button
            onClick={() => setActiveFilterPill('ATTENDANCE_MISSING')}
            className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeFilterPill === 'ATTENDANCE_MISSING'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/80'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Att Missing ({stats.attMissing})</span>
          </button>

          <button
            onClick={() => setActiveFilterPill('DUAL')}
            className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeFilterPill === 'DUAL'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/80'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Dual Violations ({stats.dual})</span>
          </button>

          {(searchQuery || selectedDept !== 'ALL' || selectedCategory !== 'ALL' || activeFilterPill !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDept('ALL');
                setSelectedCategory('ALL');
                setActiveFilterPill('ALL');
              }}
              className="px-2.5 py-1 text-slate-400 hover:text-slate-700 font-bold ml-auto text-[11px]"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. MASTER UNIFIED EMPLOYEE PERFORMANCE & COMPLIANCE TABLE */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee ID & Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">10:00 AM Morning Check</th>
                <th className="py-3 px-4">Compliance & Raised Ticket</th>
                <th className="py-3 px-4 text-center">Score & Category</th>
                {isAdminOrManager && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {rosterLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1677C8]" />
                    <span>Loading workforce records...</span>
                  </td>
                </tr>
              ) : filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    No employee records found matching your filters for {currentDate}.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((item) => {
                  const emp = item.employee || { 
                    name: item.employeeName, 
                    employeeId: item.employeeCode, 
                    department: item.department 
                  };

                  const catBadge = {
                    GREEN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    ORANGE: 'bg-amber-50 text-amber-700 border-amber-200',
                    RED: 'bg-rose-50 text-rose-700 border-rose-200'
                  }[item.category] || 'bg-slate-50 text-slate-600';

                  const empTickets = Array.isArray(item.tickets) ? item.tickets : [];
                  const violationTickets = empTickets.filter(t => t.priority !== 'green' && t.triggerType !== 'MORNING_COMPLIANCE_PASSED');
                  const greenTicket = empTickets.find(t => t.priority === 'green' || t.triggerType === 'MORNING_COMPLIANCE_PASSED');
                  const isFullyCompliant = violationTickets.length === 0 && (greenTicket || item.morningCheck?.isCompliant || empTickets.length === 0);

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* 1. Employee Profile */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-sky-100 text-[#1677C8] font-black flex items-center justify-center text-xs shrink-0">
                            {emp.name?.slice(0, 1) || 'E'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">{emp.name || item.employeeName}</div>
                            <div className="text-[11px] text-slate-400 font-mono font-semibold">
                              {emp.employeeId || item.employeeCode || 'ID Pending'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Department */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold">
                          {emp.department || item.department || 'General'}
                        </span>
                      </td>

                      {/* 3. 10:00 AM Morning Check */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 text-[11px]">
                          {/* Check A: Attendance */}
                          <div className="flex items-center gap-1.5">
                            {item.morningCheck?.hasAttendance ? (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Att: {item.morningCheck.checkInTime || 'On Time'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-bold text-rose-600">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span>Att: Missing by 10 AM</span>
                              </span>
                            )}
                          </div>

                          {/* Check B: Tasks */}
                          <div className="flex items-center gap-1.5">
                            {item.morningCheck?.hasTasks ? (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Tasks: {item.morningCheck.taskCount ? `${item.morningCheck.taskCount} in place` : 'Uploaded'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>Tasks: Missing by 10 AM</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Compliance & Raised Tickets (WITH OFFICIAL GREEN TICKETS FOR COMPLIANT EMPLOYEES) */}
                      <td className="py-3.5 px-4">
                        {violationTickets.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {violationTickets.map((t) => {
                              const isCritical = t.priority === 'critical';
                              const isRed = t.priority === 'red';
                              const isDual = t.triggerType === 'MORNING_COMPLIANCE_DUAL_VIOLATION';
                              
                              const badgeStyle = isCritical
                                ? 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
                                : isRed || isDual
                                  ? 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
                                  : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100';

                              return (
                                <button
                                  key={t._id || t.ticketNumber}
                                  onClick={() => handleOpenTicketDrawer(t)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all text-left shadow-2xs cursor-pointer ${badgeStyle}`}
                                  title="Click to view full ticket details and HR actions"
                                >
                                  <Ticket className="w-3.5 h-3.5 shrink-0" />
                                  <span className="font-mono">{t.ticketNumber}:</span>
                                  <span className="truncate max-w-[150px]">{formatTriggerType(t.triggerType)}</span>
                                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-white font-semibold ml-auto">
                                    {t.status || 'open'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          /* OFFICIAL GREEN TICKET FOR FULLY COMPLIANT EMPLOYEES */
                          (() => {
                            const activeGreenTicket = greenTicket || {
                              ticketNumber: `TKT-${currentDate.replace(/-/g, '')}-PASS-${emp.employeeId || 'PASS'}`,
                              triggerType: 'MORNING_COMPLIANCE_PASSED',
                              priority: 'green',
                              status: 'cleared',
                              title: `[GREEN TICKET] 100% Morning Compliant: ${emp.name}`,
                              description: `Employee ${emp.name} marked attendance on time and maintained daily tasks on or before 10:00 AM IST.`,
                              incidentDate: currentDate
                            };

                            return (
                              <button
                                onClick={() => handleOpenCompliantDrawer({ ...item, greenTicket: activeGreenTicket })}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-all font-bold text-[11px] shadow-2xs group cursor-pointer"
                                title="Click to view official 100% Morning Compliance Green Ticket"
                              >
                                <Ticket className="w-3.5 h-3.5 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                                <span className="font-mono text-emerald-800 font-bold">
                                  {activeGreenTicket.ticketNumber}:
                                </span>
                                <span className="text-emerald-950 font-semibold truncate max-w-[140px]">
                                  100% Morning Compliant
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider ml-auto">
                                  GREEN TICKET
                                </span>
                              </button>
                            );
                          })()
                        )}
                      </td>

                      {/* 5. Score & Category */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm font-black text-slate-900">{item.compositeScore}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${catBadge}`}>
                            {item.category}
                          </span>
                        </div>
                        {item.isOverridden ? (
                          <span className="block text-[8px] text-amber-600 font-bold uppercase mt-0.5">Overridden</span>
                        ) : (
                          <span className="block text-[9px] text-slate-400 mt-0.5">
                            Tasks: {item.pillarScores?.taskCompletion ?? '--'}% | Att: {item.pillarScores?.attendance ?? '--'}%
                          </span>
                        )}
                      </td>

                      {/* 6. Actions */}
                      {isAdminOrManager && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Manage Ticket Button (Green Ticket for compliant, Warning Ticket for violations) */}
                            {violationTickets.length > 0 ? (
                              <button
                                onClick={() => handleOpenTicketDrawer(violationTickets[0])}
                                className="px-2.5 py-1 text-[11px] font-bold text-white rounded-lg transition-all shadow-2xs flex items-center gap-1 hover:opacity-95"
                                style={{ backgroundColor: PRIMARY_COLOR }}
                                title="Manage and resolve compliance ticket"
                              >
                                <Ticket className="w-3 h-3" />
                                <span>Ticket</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  const activeGreenTicket = greenTicket || {
                                    ticketNumber: `TKT-${currentDate.replace(/-/g, '')}-PASS-${emp.employeeId || 'PASS'}`,
                                    triggerType: 'MORNING_COMPLIANCE_PASSED',
                                    priority: 'green',
                                    status: 'cleared',
                                    title: `[GREEN TICKET] 100% Morning Compliant: ${emp.name}`,
                                    description: `Employee ${emp.name} marked attendance on time and maintained daily tasks on or before 10:00 AM IST.`,
                                    incidentDate: currentDate
                                  };
                                  handleOpenCompliantDrawer({ ...item, greenTicket: activeGreenTicket });
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all flex items-center gap-1 shadow-2xs"
                                title="View official Green Clearance Ticket"
                              >
                                <Ticket className="w-3 h-3 text-white" />
                                <span>Green Ticket</span>
                              </button>
                            )}

                            {/* Monthly Calendar Button */}
                            <button
                              onClick={() => setCalendarModalEmp(item)}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                              title="View employee's monthly compliance calendar & history"
                            >
                              <CalendarDays className="w-3 h-3 text-slate-500" />
                              <span>Calendar</span>
                            </button>

                            {/* Score Override */}
                            <button
                              onClick={() => {
                                setOverrideModalTarget(item);
                                setOverrideScore(item.compositeScore);
                                setOverrideReason(item.overrideReason || '');
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Override composite score"
                            >
                              Score
                            </button>
                          </div>
                        </td>
                      )}

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5A. GREEN CLEARANCE TICKET DRAWER FOR COMPLIANT EMPLOYEES */}
      {/* ------------------------------------------------------------- */}
      {selectedCompliantRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white shadow-2xl border-l border-slate-200 w-full max-w-xl h-full overflow-y-auto p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300">
                    {selectedCompliantRecord.greenTicket?.ticketNumber || `TKT-${currentDate.replace(/-/g, '')}-PASS-${selectedCompliantRecord.employee?.employeeId || selectedCompliantRecord.employeeCode || 'PASS'}`}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                    OFFICIAL GREEN TICKET
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedCompliantRecord(null)} 
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-5 space-y-4 text-xs">
                <div className="p-4 bg-emerald-50/90 rounded-2xl border border-emerald-300 text-emerald-950 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-base font-black text-emerald-950">100% Morning Compliance Clearance Pass</h2>
                  </div>
                  <p className="text-emerald-800 text-[11px] mt-1 font-medium">
                    Employee has verified 100% morning compliance under the 10:00:00 AM IST Universal Rule. Zero disciplinary action required.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-600">Employee:</span>
                    <span className="font-bold text-slate-900">
                      {selectedCompliantRecord.employee?.name || selectedCompliantRecord.employeeName} ({selectedCompliantRecord.employee?.employeeId || selectedCompliantRecord.employeeCode || 'ID Pending'})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-600">Department:</span>
                    <span className="font-semibold text-slate-800">{selectedCompliantRecord.department || selectedCompliantRecord.employee?.department || 'General'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-600">Evaluation Date:</span>
                    <span className="font-mono text-slate-800">{currentDate} (10:00 AM IST Universal Cutoff)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-600">Violation Streak:</span>
                    <span className="font-bold text-emerald-700">0 Days (Compliant Reset)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-600">Composite Performance Score:</span>
                    <span className="font-black text-slate-900 text-sm">{selectedCompliantRecord.compositeScore} / 100</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-700 block">Universal 10:00 AM Verified Checkpoints:</span>
                  <div className="p-3 bg-white border border-emerald-300 rounded-xl flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="font-bold text-slate-800 block">Check A: Attendance Check-in</span>
                        <span className="text-[10px] text-slate-500">
                          {selectedCompliantRecord.morningCheck?.checkInTime 
                            ? `Clock-in recorded at ${selectedCompliantRecord.morningCheck.checkInTime} IST` 
                            : 'Marked on or before 10:00:00 AM IST'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      PASSED (VERIFIED)
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-emerald-300 rounded-xl flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="font-bold text-slate-800 block">Check B: Daily Tasks Planning</span>
                        <span className="text-[10px] text-slate-500">
                          {selectedCompliantRecord.morningCheck?.taskCount 
                            ? `${selectedCompliantRecord.morningCheck.taskCount} daily work tasks verified active/scheduled in advance` 
                            : 'Tasks submitted or scheduled in advance prior to 10:00 AM IST'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      PASSED (VERIFIED)
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                  <div className="font-bold text-slate-800 mb-0.5">Governance Audit Summary:</div>
                  This employee successfully fulfilled morning compliance obligations. No disciplinary warning ticket or penalty score deduction is applied for this date.
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedCompliantRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5B. VIOLATION TICKET DETAILS SLIDE DRAWER (MANAGEMENT ACTIONS) */}
      {/* ------------------------------------------------------------- */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white shadow-2xl border-l border-slate-200 w-full max-w-xl h-full overflow-y-auto p-6 flex flex-col justify-between">
            
            {/* Header */}
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-black text-[#1677C8] bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
                    {selectedTicket.ticketNumber}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    selectedTicket.priority === 'orange' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                    selectedTicket.priority === 'red' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                    'bg-purple-50 text-purple-800 border-purple-200'
                  }`}>
                    {selectedTicket.priority} Priority
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {(selectedTicket.status || 'open').replace('_', ' ')}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedTicket(null)} 
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {drawerToast && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{drawerToast}</span>
                </div>
              )}

              {/* Drawer Content */}
              <div className="py-4 space-y-4 text-xs">
                <div>
                  <h2 className="text-base font-black text-slate-900">{selectedTicket.title}</h2>
                  <p className="text-slate-600 mt-1">{selectedTicket.description}</p>
                </div>

                {/* Profile & Evidence */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Employee:</span>
                    <span className="font-bold text-slate-900">{selectedTicket.employeeName} ({selectedTicket.employeeCode || 'ID Pending'})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Department:</span>
                    <span className="font-semibold text-slate-800">{selectedTicket.department}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Incident Date:</span>
                    <span className="font-mono text-slate-800">{selectedTicket.incidentDate} (10:00 AM IST Cutoff)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Consecutive Streak:</span>
                    <span className="font-bold text-rose-700 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" />
                      {selectedTicket.consecutiveCount || 1} Consecutive Working Days
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">SLA Correction Deadline:</span>
                    <span className="font-bold text-amber-700">
                      {selectedTicket.correctionDeadline ? new Date(selectedTicket.correctionDeadline).toLocaleString('en-IN') : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Acknowledgement */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-700 block">Employee Acknowledgement:</span>
                    <span className="text-[11px] text-slate-500">
                      {selectedTicket.isAcknowledged ? (
                        <span className="text-emerald-700 font-bold">
                          ✓ Acknowledged on {new Date(selectedTicket.acknowledgedAt).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold">Pending Acknowledgement</span>
                      )}
                    </span>
                  </div>

                  {!selectedTicket.isAcknowledged && (
                    <button
                      onClick={handleAcknowledgeTicket}
                      disabled={submittingAction}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>

                {/* Employee Explanation */}
                {selectedTicket.employeeExplanation ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                    <span className="font-bold block">Employee Dispute / Explanation:</span>
                    <p className="text-xs">{selectedTicket.employeeExplanation}</p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <label className="font-bold text-slate-700 block">Submit Dispute / Explanation:</label>
                    <textarea
                      rows={2}
                      placeholder="Provide reason for missing 10:00 AM compliance..."
                      value={explainText}
                      onChange={(e) => setExplainText(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1677C8]"
                    />
                    <button
                      onClick={handleSubmitExplanation}
                      disabled={submittingAction || !explainText.trim()}
                      className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Explanation</span>
                    </button>
                  </div>
                )}

                {/* HR Remarks Log */}
                {selectedTicket.hrRemarks && (
                  <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 space-y-1">
                    <span className="font-bold block">HR Remarks:</span>
                    <p className="text-xs">{selectedTicket.hrRemarks}</p>
                  </div>
                )}

                {/* Resolution Notes Log */}
                {selectedTicket.resolutionNotes && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                    <span className="font-bold block">Management Resolution:</span>
                    <p className="text-xs">{selectedTicket.resolutionNotes}</p>
                    {selectedTicket.correctiveActionPlan && (
                      <p className="text-[11px] font-semibold text-emerald-800 mt-1">
                        Action Plan: {selectedTicket.correctiveActionPlan}
                      </p>
                    )}
                  </div>
                )}

                {/* HR & Management Controls */}
                {isAdminOrManager && selectedTicket.status !== 'resolved' && (
                  <div className="pt-3 border-t border-slate-200 space-y-3">
                    <span className="font-bold text-slate-800 uppercase text-[11px] tracking-wider block">
                      HR & Management Actions
                    </span>

                    {/* Add HR Remarks */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 block">Add HR Remarks:</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add official HR note..."
                          value={hrRemarksText}
                          onChange={(e) => setHrRemarksText(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1677C8]"
                        />
                        <button
                          onClick={handleAddHrRemarks}
                          disabled={submittingAction || !hrRemarksText.trim()}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                        >
                          Save Note
                        </button>
                      </div>
                    </div>

                    {/* Reassign Ticket */}
                    {managersList.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 block">Assign To Manager / HR:</label>
                        <div className="flex gap-2">
                          <select
                            value={assignedManagerId}
                            onChange={(e) => setAssignedManagerId(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-medium text-slate-700 focus:outline-none"
                          >
                            <option value="">Select Manager</option>
                            {managersList.map(m => (
                              <option key={m._id} value={m._id}>{m.name} ({m.role})</option>
                            ))}
                          </select>
                          <button
                            onClick={handleAssignTicket}
                            disabled={submittingAction || !assignedManagerId}
                            className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                          >
                            Assign
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Resolve Ticket Form */}
                    <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2">
                      <span className="font-bold text-emerald-900 block">Resolve & Close Ticket:</span>
                      <textarea
                        rows={2}
                        placeholder="Resolution findings & justification..."
                        value={resolveNotes}
                        onChange={(e) => setResolveNotes(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-emerald-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <input
                        type="text"
                        placeholder="Corrective action plan (optional)..."
                        value={actionPlan}
                        onChange={(e) => setActionPlan(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-emerald-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        onClick={handleResolveTicket}
                        disabled={submittingAction || !resolveNotes.trim()}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirm Ticket Resolution</span>
                      </button>
                    </div>

                    {/* Management Override */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-800 block text-[11px]">Management Override (Exemption):</span>
                      <input
                        type="text"
                        placeholder="Exemption / override justification..."
                        value={overrideReasonTicket}
                        onChange={(e) => setOverrideReasonTicket(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none"
                      />
                      <button
                        onClick={handleOverrideTicket}
                        disabled={submittingAction || !overrideReasonTicket.trim()}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                      >
                        Confirm Override
                      </button>
                    </div>

                  </div>
                )}

              </div>

            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. EMPLOYEE MONTHLY COMPLIANCE CALENDAR MODAL */}
      {/* ------------------------------------------------------------- */}
      {calendarModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-sky-50 text-[#1677C8] rounded-xl border border-sky-100">
                  <CalendarDays className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {calendarModalEmp.employee?.name || calendarModalEmp.employeeName} — Monthly History
                  </h3>
                  <p className="text-xs text-slate-400">
                    ID: {calendarModalEmp.employee?.employeeId || calendarModalEmp.employeeCode || 'ID Pending'} • Department: {calendarModalEmp.department}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={calendarMonth}
                  onChange={(e) => setCalendarMonth(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-800 cursor-pointer focus:outline-none"
                />
                <button onClick={() => setCalendarModalEmp(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Monthly Stats Summary */}
            {employeeHistoryData?.summary && (
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block">Tickets</span>
                  <span className="font-black text-slate-900 text-base">{employeeHistoryData.summary.totalMonthTickets || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] text-amber-700 font-bold block">Orange</span>
                  <span className="font-black text-amber-700 text-base">{employeeHistoryData.summary.orangeCount || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] text-rose-700 font-bold block">Red</span>
                  <span className="font-black text-rose-700 text-base">{employeeHistoryData.summary.redCount || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
                  <span className="text-[10px] text-purple-700 font-bold block">Critical</span>
                  <span className="font-black text-purple-700 text-base">{employeeHistoryData.summary.criticalCount || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 font-bold block">Resolved</span>
                  <span className="font-black text-emerald-700 text-base">{employeeHistoryData.summary.resolvedCount || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200">
                  <span className="text-[10px] text-orange-700 font-bold block">Streak</span>
                  <span className="font-black text-orange-700 text-base flex items-center justify-center gap-0.5">
                    <Flame className="w-3.5 h-3.5" />
                    {employeeHistoryData.summary.currentStreak || 0}d
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold block">Longest</span>
                  <span className="font-black text-slate-800 text-base">{employeeHistoryData.summary.longestStreak || 0}d</span>
                </div>
              </div>
            )}

            {/* Calendar Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500 bg-slate-50 p-2.5 rounded-xl">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Compliant</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Orange Warning</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Red Escalation</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Critical</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Leave</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Sunday</span>
            </div>

            {/* Calendar Grid */}
            {historyLoading ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1677C8]" />
                <span>Loading calendar...</span>
              </div>
            ) : !employeeHistoryData?.calendar ? (
              <div className="py-16 text-center text-slate-400">
                No calendar data available for this month.
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center text-[10px] font-bold text-slate-400 uppercase">
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                  <div>Sun</div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ 
                    length: (employeeHistoryData.calendar[0]?.dayOfWeek === 0 ? 6 : employeeHistoryData.calendar[0]?.dayOfWeek - 1) 
                  }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-16 rounded-xl bg-slate-50/40"></div>
                  ))}

                  {employeeHistoryData.calendar.map((day) => {
                    const isSunday = day.dayOfWeek === 0;
                    let bgStyle = 'bg-white border-slate-200 text-slate-800';

                    if (isSunday) {
                      bgStyle = 'bg-slate-50 border-slate-100 text-slate-400';
                    } else if (day.status === 'ON_LEAVE') {
                      bgStyle = 'bg-slate-100 border-slate-200 text-slate-600';
                    } else if (day.status === 'COMPLIANT') {
                      bgStyle = 'bg-emerald-50 border-emerald-200 text-emerald-900';
                    } else if (day.status === 'WARNING_ORANGE') {
                      bgStyle = 'bg-amber-50 border-amber-300 text-amber-900';
                    } else if (day.status === 'ESCALATION_RED') {
                      bgStyle = 'bg-rose-50 border-rose-300 text-rose-900';
                    } else if (day.status === 'ESCALATION_CRITICAL') {
                      bgStyle = 'bg-purple-50 border-purple-300 text-purple-900';
                    }

                    return (
                      <div
                        key={day.date}
                        onClick={() => setSelectedDayAudit(day)}
                        className={`h-16 p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${bgStyle} ${
                          selectedDayAudit?.date === day.date ? 'ring-2 ring-[#1677C8]' : ''
                        }`}
                      >
                        <span className="text-xs font-mono font-bold">{day.dayOfMonth}</span>
                        {day.ticket ? (
                          <span className="text-[9px] font-bold text-rose-700 truncate">
                            🔥 {day.ticket.consecutiveCount || 1}d
                          </span>
                        ) : day.status === 'COMPLIANT' ? (
                          <span className="text-[9px] font-bold text-emerald-700">✓ On time</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Day Audit Details */}
            {selectedDayAudit && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 text-xs space-y-1.5 animate-in fade-in">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>Day Audit: <b className="font-mono text-[#1677C8]">{selectedDayAudit.date}</b></span>
                  <button onClick={() => setSelectedDayAudit(null)} className="text-slate-400 hover:text-slate-700 font-bold">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="font-bold text-slate-500">Attendance: </span>
                    {selectedDayAudit.attendance?.marked ? (
                      <span className="text-emerald-700 font-bold">Marked at {selectedDayAudit.attendance.time || '10:00 AM IST'}</span>
                    ) : selectedDayAudit.dayOfWeek === 0 ? (
                      <span className="text-slate-400">Sunday Weekend</span>
                    ) : selectedDayAudit.status === 'ON_LEAVE' ? (
                      <span className="text-slate-600 font-bold">Approved Leave</span>
                    ) : (
                      <span className="text-rose-600 font-bold">Missing by 10 AM</span>
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-slate-500">Daily Tasks: </span>
                    {selectedDayAudit.todo?.created ? (
                      <span className="text-emerald-700 font-bold">Uploaded ({selectedDayAudit.todo.count || 1} tasks)</span>
                    ) : selectedDayAudit.dayOfWeek === 0 ? (
                      <span className="text-slate-400">Sunday Weekend</span>
                    ) : selectedDayAudit.status === 'ON_LEAVE' ? (
                      <span className="text-slate-600 font-bold">Approved Leave</span>
                    ) : (
                      <span className="text-amber-600 font-bold">Missing by 10 AM</span>
                    )}
                  </div>
                </div>
                {selectedDayAudit.ticket && (
                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-mono font-bold text-[#1677C8] text-[11px]">
                      Ticket: {selectedDayAudit.ticket.ticketNumber} ({formatTriggerType(selectedDayAudit.ticket.triggerType)})
                    </span>
                    <button
                      onClick={() => {
                        setCalendarModalEmp(null);
                        handleOpenTicketDrawer(selectedDayAudit.ticket);
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold text-white rounded bg-[#1677C8]"
                    >
                      Open Ticket
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setCalendarModalEmp(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. SCORE OVERRIDE MODAL */}
      {/* ------------------------------------------------------------- */}
      {overrideModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Override Performance Score</h3>
              <button onClick={() => setOverrideModalTarget(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3">
              <div>
                <span className="font-bold text-slate-800">Employee:</span> {overrideModalTarget.employeeName} ({overrideModalTarget.employeeCode})
              </div>
              <div>
                <label className="font-bold text-slate-800 block mb-1">New Score (0 – 100):</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1677C8]"
                />
              </div>
              <div>
                <label className="font-bold text-slate-800 block mb-1">Mandatory Override Justification:</label>
                <textarea
                  rows={2}
                  placeholder="Official reason for manual adjustment..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1677C8]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setOverrideModalTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScoreOverride}
                disabled={overrideLoading}
                className="px-4 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50 shadow-sm"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                {overrideLoading ? 'Saving...' : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
