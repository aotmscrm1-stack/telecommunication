import React, { useState, useEffect, useCallback } from 'react';
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
  ArrowUpRight,
  Sparkles, 
  Award, 
  TrendingUp, 
  FileText, 
  Check, 
  Send, 
  X, 
  Sliders, 
  Calendar,
  Ticket,
  Eye,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { performanceAPI } from '../../../services/api';

export default function PerformanceDashboard() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const [currentDate, setCurrentDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'tickets'

  // Summary Metrics State
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Roster State
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Tickets State
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketStatusFilter, setTicketStatusFilter] = useState('ALL');
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState('ALL');
  const [ticketCheckpointFilter, setTicketCheckpointFilter] = useState('ALL');

  // Selected Ticket for Modal / Drawer
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetailLoading, setTicketDetailLoading] = useState(false);
  const [explainText, setExplainText] = useState('');
  const [resolveNotes, setResolveNotes] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Score Override Modal
  const [overrideModalTarget, setOverrideModalTarget] = useState(null);
  const [overrideScore, setOverrideScore] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);

  // Sweep Trigger State
  const [sweepLoading, setSweepLoading] = useState(false);
  const [sweepMessage, setSweepMessage] = useState('');

  const fetchMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      const res = await performanceAPI.getComplianceToday({ date: currentDate });
      if (res.data?.ok) {
        setMetrics(res.data.metrics);
      }
    } catch (err) {
      console.error('[fetchMetrics]', err);
    } finally {
      setMetricsLoading(false);
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

  const fetchTickets = useCallback(async () => {
    try {
      setTicketsLoading(true);
      const res = await performanceAPI.getTickets({ date: currentDate });
      if (res.data?.ok) {
        setTickets(res.data.tickets || []);
      }
    } catch (err) {
      console.error('[fetchTickets]', err);
    } finally {
      setTicketsLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchMetrics();
    fetchRoster();
    fetchTickets();
  }, [fetchMetrics, fetchRoster, fetchTickets]);

  const handleRunManualSweep = async () => {
    try {
      setSweepLoading(true);
      setSweepMessage('');
      const res = await performanceAPI.runMorningSweep({ date: currentDate });
      if (res.data?.ok) {
        setSweepMessage(res.data.message || '10:00 AM sweep completed successfully!');
        await fetchMetrics();
        await fetchTickets();
        await fetchRoster();
      }
    } catch (err) {
      setSweepMessage(err.response?.data?.message || 'Sweep execution failed');
    } finally {
      setSweepLoading(false);
      setTimeout(() => setSweepMessage(''), 6000);
    }
  };

  const handleOpenTicketDrawer = async (ticket) => {
    try {
      setSelectedTicket(ticket);
      setExplainText('');
      setResolveNotes('');
      setActionPlan('');
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

  const handleSubmitExplanation = async () => {
    if (!selectedTicket || !explainText.trim()) return;
    try {
      setSubmittingAction(true);
      const res = await performanceAPI.explainTicket(selectedTicket._id, {
        explanation: explainText.trim()
      });
      if (res.data?.ok) {
        setSelectedTicket(res.data.ticket);
        setExplainText('');
        await fetchTickets();
        await fetchRoster();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit explanation');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket || !resolveNotes.trim()) return;
    try {
      setSubmittingAction(true);
      const res = await performanceAPI.resolveTicket(selectedTicket._id, {
        resolutionNotes: resolveNotes.trim(),
        correctiveActionPlan: actionPlan.trim(),
        status: 'resolved'
      });
      if (res.data?.ok) {
        setSelectedTicket(res.data.ticket);
        setResolveNotes('');
        setActionPlan('');
        await fetchTickets();
        await fetchRoster();
        await fetchMetrics();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resolve ticket');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Helper for human-friendly trigger type names
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

  // Filtered Roster
  const filteredRoster = roster.filter(item => {
    const emp = item.employee || { name: item.employeeName, employeeId: item.employeeCode, department: item.department };
    const matchesSearch = !searchQuery || 
      (emp.name && emp.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (emp.employeeId && emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.employeeName && item.employeeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.employeeCode && item.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDept = selectedDept === 'ALL' || item.department === selectedDept;
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;

    return matchesSearch && matchesDept && matchesCat;
  });

  // Filtered Tickets
  const filteredTickets = tickets.filter(t => {
    const matchesStatus = ticketStatusFilter === 'ALL' || t.status === ticketStatusFilter;
    const matchesPriority = ticketPriorityFilter === 'ALL' || t.priority === ticketPriorityFilter;
    const matchesCheckpoint = ticketCheckpointFilter === 'ALL' || t.checkpoint === ticketCheckpointFilter;
    return matchesStatus && matchesPriority && matchesCheckpoint;
  });

  const uniqueDepartments = Array.from(new Set(roster.map(r => r.department).filter(Boolean)));

  return (
    <div className="min-h-screen bg-slate-50/60 p-6 space-y-6">
      {/* Top Banner & Date Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
              <Award className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Employee Performance & Compliance</h1>
              <p className="text-xs font-medium text-slate-500">Universal 10:00 AM IST Morning Sweep & Mandatory Before-Logout Task Closure</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input 
              type="date" 
              value={currentDate} 
              onChange={(e) => setCurrentDate(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            />
          </div>

          {isAdminOrManager && (
            <button
              onClick={handleRunManualSweep}
              disabled={sweepLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-sky-600/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sweepLoading ? 'animate-spin' : ''}`} />
              <span>{sweepLoading ? 'Sweeping...' : 'Run 10:00 AM Sweep'}</span>
            </button>
          )}
        </div>
      </div>

      {sweepMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{sweepMessage}</span>
        </div>
      )}

      {/* KPI Cards: Universal 10:00 AM Sweep Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Active */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Active</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {metrics?.totalActive ?? '--'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Target Workforce</div>
        </div>

        {/* Compliant */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold uppercase tracking-wider">
            <span>Both Compliant</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">
            {metrics?.fullyCompliantMorning ?? '--'}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600/80">Attendance & Tasks on time</div>
        </div>

        {/* Attendance Missing */}
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold uppercase tracking-wider">
            <span>Attendance Missing</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600">
            {metrics?.attendanceMissingTickets ?? '--'}
          </div>
          <div className="mt-1 text-[11px] text-rose-600/80">Check-in not marked by 10 AM</div>
        </div>

        {/* Tasks Missing */}
        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold uppercase tracking-wider">
            <span>Tasks Missing</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600">
            {metrics?.taskMissingTickets ?? '--'}
          </div>
          <div className="mt-1 text-[11px] text-amber-600/80">No daily tasks uploaded</div>
        </div>

        {/* Dual Violations */}
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-purple-700 text-xs font-bold uppercase tracking-wider">
            <span>Dual Violations</span>
            <ShieldAlert className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-purple-700">
            {metrics?.dualViolations ?? '--'}
          </div>
          <div className="mt-1 text-[11px] text-purple-600/80">Single combined ticket</div>
        </div>
      </div>

      {/* Main Tab Controls */}
      <div className="flex items-center gap-3 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('roster')}
          className={`pb-3 px-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'roster'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Employee Performance Roster ({roster.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-3 px-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'tickets'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Ticket Governance Hub ({tickets.length})</span>
        </button>
      </div>

      {/* TAB 1: EMPLOYEE PERFORMANCE ROSTER (SHOWING ALL EMPLOYEES & THEIR TICKETS) */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Roster Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by employee name or ID (e.g. AOTMS-01)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Departments</option>
                {uniqueDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Categories</option>
                <option value="GREEN">🟢 Green (85–100)</option>
                <option value="ORANGE">🟠 Orange (65–84.99)</option>
                <option value="RED">🔴 Red (&lt; 65)</option>
              </select>
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Employee ID & Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">5-Pillar Score Breakdown</th>
                    <th className="py-3 px-4 text-center">Composite Score</th>
                    <th className="py-3 px-4 text-center">Category</th>
                    <th className="py-3 px-4">Compliance & Raised Tickets</th>
                    {isAdminOrManager && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {rosterLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-500" />
                        <span>Loading employee records...</span>
                      </td>
                    </tr>
                  ) : filteredRoster.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No employee records found for this date.
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

                      return (
                        <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Employee ID & Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-800 font-black flex items-center justify-center text-xs shrink-0">
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

                          {/* Department */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold">
                              {emp.department || item.department || 'General'}
                            </span>
                          </td>

                          {/* 5-Pillars */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="grid grid-cols-5 gap-1.5 text-[10px] text-slate-500">
                              <div>Tasks: <span className="font-bold text-slate-800">{item.pillarScores?.taskCompletion ?? '--'}%</span></div>
                              <div>Prod: <span className="font-bold text-slate-800">{item.pillarScores?.productivity ?? '--'}%</span></div>
                              <div>Att: <span className="font-bold text-slate-800">{item.pillarScores?.attendance ?? '--'}%</span></div>
                              <div>Qual: <span className="font-bold text-slate-800">{item.pillarScores?.workQuality ?? '--'}%</span></div>
                              <div>Disc: <span className="font-bold text-slate-800">{item.pillarScores?.discipline ?? '--'}%</span></div>
                            </div>
                          </td>

                          {/* Composite Score */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="text-sm font-black text-slate-900">{item.compositeScore}</span>
                            {item.isOverridden && (
                              <span className="block text-[9px] text-amber-600 font-bold uppercase">Overridden</span>
                            )}
                          </td>

                          {/* Category Badge */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${catBadge}`}>
                              {item.category}
                            </span>
                          </td>

                          {/* Raised Tickets & Compliance Column */}
                          <td className="py-3.5 px-4">
                            {empTickets.length > 0 ? (
                              <div className="flex flex-col gap-1.5">
                                {empTickets.map((t) => {
                                  const isCritical = t.priority === 'critical';
                                  const isHigh = t.priority === 'high';
                                  const isDual = t.triggerType === 'MORNING_COMPLIANCE_DUAL_VIOLATION';
                                  
                                  const badgeClass = isCritical || isDual
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                                    : isHigh
                                      ? 'bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200'
                                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200';

                                  return (
                                    <button
                                      key={t._id || t.ticketNumber}
                                      onClick={() => handleOpenTicketDrawer(t)}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all text-left shadow-2xl-hover ${badgeClass}`}
                                      title="Click to view ticket details and actions"
                                    >
                                      <Ticket className="w-3.5 h-3.5 shrink-0" />
                                      <span className="font-mono">{t.ticketNumber}:</span>
                                      <span className="truncate max-w-[150px]">{formatTriggerType(t.triggerType)}</span>
                                      <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-white/60 font-semibold ml-auto">
                                        {t.status || 'open'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Compliant (No Tickets)</span>
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          {isAdminOrManager && (
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {empTickets.length > 0 && (
                                  <button
                                    onClick={() => handleOpenTicketDrawer(empTickets[0])}
                                    className="px-2.5 py-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors flex items-center gap-1"
                                    title="Open ticket management drawer"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Ticket</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setOverrideModalTarget(item);
                                    setOverrideScore(item.compositeScore);
                                    setOverrideReason(item.overrideReason || '');
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                  title="Manually override composite score"
                                >
                                  Override
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
        </div>
      )}

      {/* TAB 2: TICKET GOVERNANCE HUB */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {/* Ticket Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center gap-3">
            <select
              value={ticketCheckpointFilter}
              onChange={(e) => setTicketCheckpointFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="ALL">All Checkpoints</option>
              <option value="CHECKPOINT_1_MORNING_10AM">Checkpoint 1 (10 AM Sweep)</option>
              <option value="CHECKPOINT_2_BEFORE_LOGOUT">Checkpoint 2 (Logout Task Closure)</option>
            </select>

            <select
              value={ticketPriorityFilter}
              onChange={(e) => setTicketPriorityFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="ALL">All Priorities</option>
              <option value="critical">🔴 Critical (24h SLA)</option>
              <option value="high">🟠 High (48h SLA)</option>
              <option value="medium">🟡 Medium (72h SLA)</option>
              <option value="low">⚪ Low (96h SLA)</option>
            </select>

            <select
              value={ticketStatusFilter}
              onChange={(e) => setTicketStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="open">Open</option>
              <option value="under_review">Under Review</option>
              <option value="action_required">Action Required (Escalated)</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Tickets List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ticketsLoading ? (
              <div className="col-span-2 py-12 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-500" />
                <span>Loading tickets...</span>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400">
                No tickets found matching filters for this date.
              </div>
            ) : (
              filteredTickets.map((t) => {
                const priorityBadge = {
                  critical: 'bg-rose-100 text-rose-800 border-rose-200',
                  high: 'bg-orange-100 text-orange-800 border-orange-200',
                  medium: 'bg-amber-100 text-amber-800 border-amber-200',
                  low: 'bg-slate-100 text-slate-800 border-slate-200'
                }[t.priority] || 'bg-slate-100 text-slate-800';

                return (
                  <div 
                    key={t._id} 
                    onClick={() => handleOpenTicketDrawer(t)}
                    className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100">
                          {t.ticketNumber}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${priorityBadge}`}>
                            {t.priority}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase">
                            {(t.status || 'open').replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{t.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-medium text-slate-600">{t.employeeName} ({t.employeeCode || 'ID Pending'})</span>
                      <span className="font-semibold text-sky-600 flex items-center gap-1">
                        View Details <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TICKET DETAILS & DISPUTE DRAWER / MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
                    {selectedTicket.ticketNumber}
                  </span>
                  <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {(selectedTicket.status || 'open').replace('_', ' ')}
                  </span>
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                    {selectedTicket.priority} SLA
                  </span>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="py-4 space-y-3.5 text-xs">
                <div>
                  <h2 className="text-base font-black text-slate-900">{selectedTicket.title}</h2>
                  <p className="text-slate-600 mt-1">{selectedTicket.description}</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div><span className="font-bold text-slate-700">Employee:</span> {selectedTicket.employeeName} ({selectedTicket.employeeCode || 'ID Pending'})</div>
                  <div><span className="font-bold text-slate-700">Department:</span> {selectedTicket.department}</div>
                  <div><span className="font-bold text-slate-700">Missing Requirement:</span> {selectedTicket.missingRequirement || 'Non-compliance incident'}</div>
                  <div><span className="font-bold text-slate-700">Incident Date:</span> {selectedTicket.incidentDate}</div>
                </div>

                {/* Explanation Thread */}
                {selectedTicket.employeeExplanation && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                    <span className="font-bold block mb-1">Employee Explanation / Dispute:</span>
                    <p>{selectedTicket.employeeExplanation}</p>
                  </div>
                )}

                {/* Resolution Notes Thread if Resolved */}
                {selectedTicket.resolutionNotes && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <span className="font-bold block mb-1">Management Resolution:</span>
                    <p>{selectedTicket.resolutionNotes}</p>
                    {selectedTicket.correctiveActionPlan && (
                      <p className="mt-1 text-[11px] font-semibold text-emerald-700">Action Plan: {selectedTicket.correctiveActionPlan}</p>
                    )}
                  </div>
                )}

                {/* Submit Explanation Form (for employee or anyone before closure) */}
                {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                  <div className="pt-2">
                    <label className="font-bold text-slate-700 block mb-1">Submit Dispute / Explanation:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Explain the reason for delinquency (e.g. system issue, client emergency)..."
                        value={explainText}
                        onChange={(e) => setExplainText(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        onClick={handleSubmitExplanation}
                        disabled={submittingAction || !explainText.trim()}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Management Resolution Form */}
                {isAdminOrManager && selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <label className="font-bold text-slate-700 block">Management Resolution & Corrective Action Plan:</label>
                    <textarea
                      rows={2}
                      placeholder="Resolution notes / action taken..."
                      value={resolveNotes}
                      onChange={(e) => setResolveNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <input
                      type="text"
                      placeholder="Corrective action plan (optional)..."
                      value={actionPlan}
                      onChange={(e) => setActionPlan(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={handleResolveTicket}
                        disabled={submittingAction || !resolveNotes.trim()}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>Resolve Ticket</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCORE OVERRIDE MODAL */}
      {overrideModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
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
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-800 block mb-1">Mandatory Override Reason:</label>
                <textarea
                  rows={2}
                  placeholder="Reason for manual adjustment..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                className="px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl disabled:opacity-50"
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
