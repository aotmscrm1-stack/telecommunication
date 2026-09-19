import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { leadsAPI, followupsAPI, reportsAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import StatCard from '../components/dashboard/StatCard';
import EmployeeTrackingCard from '../components/tracking/EmployeeTrackingCard';
import LiveMap from '../components/tracking/LiveMap';
import {
  FaUsers, FaMoneyBillWave, FaChartLine, FaCalendarCheck, FaPhone,
  FaTrophy, FaLocationDot, FaBuilding, FaMagnifyingGlass, FaRotate, FaFilter,
  FaCircleCheck, FaEye, FaMapLocationDot, FaUserTie, FaChartPie,
  FaClock, FaXmark, FaCheck, FaPhoneVolume, FaCalendarDays, FaFileLines,
  FaChevronRight, FaBullhorn, FaArrowTrendUp, FaTowerCell
} from 'react-icons/fa6';

const EVERGREEN    = '#152614';
const DARK_SPRUCE  = '#1e441e';
const FOREST_GREEN = '#119822';
const LIME_GREEN   = '#72ff47';
const LIME_ACCENT  = '#43ff0a';

const PALETTE_COLORS = ['#72ff47', '#46ea5c', '#18d531', '#119822', '#569c52', '#8bc088'];

const STATUS_COLORS = {
  'Fresh':               '#46ea5c',
  'Connected':           '#72ff47',
  'Call Not Responding': '#f43f5e',
  'Call Back Later':     '#f59e0b',
  'Not interested':      '#ef4444',
  'Demo Scheduled':      '#38bdf8',
  'Demo Done':           '#818cf8',
  'Won':                 '#43ff0a',
  'Lost':                '#e11d48',
  'Wrong Number':        '#94a3b8',
};

function fmtDuration(sec) {
  if (!sec || isNaN(sec) || sec <= 0) return '0s';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDateDisplay(isoStr) {
  if (!isoStr) return '—';
  const parts = String(isoStr).split('T')[0].split('-');
  if (parts.length === 3) {
    const d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T00:00:00`);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
  return isoStr;
}

function getLiveStatusBadge(status) {
  switch (status) {
    case 'ON_DUTY':
      return {
        bg: 'rgba(30, 68, 30, 0.8)',
        color: '#72ff47',
        border: 'rgba(114, 255, 71, 0.4)',
        dot: '#72ff47',
        label: 'On Duty',
      };
    case 'ON_CALL':
      return {
        bg: 'rgba(10, 91, 21, 0.8)',
        color: '#84f193',
        border: 'rgba(70, 234, 92, 0.4)',
        dot: '#46ea5c',
        label: 'On Call',
      };
    case 'ON_BREAK':
      return {
        bg: 'rgba(19, 82, 0, 0.8)',
        color: '#a1ff85',
        border: 'rgba(114, 255, 71, 0.4)',
        dot: '#a1ff85',
        label: 'On Break',
      };
    case 'COMPLETED':
      return {
        bg: 'rgba(7, 61, 14, 0.8)',
        color: '#c1f8c9',
        border: 'rgba(24, 213, 49, 0.4)',
        dot: '#18d531',
        label: 'Completed',
      };
    case 'ACTIVE':
      return {
        bg: 'rgba(21, 38, 20, 0.8)',
        color: '#43ff0a',
        border: 'rgba(67, 255, 10, 0.4)',
        dot: '#43ff0a',
        label: 'Active GPS',
      };
    case 'NOT_STARTED':
      return {
        bg: 'rgba(30, 41, 59, 0.8)',
        color: '#94a3b8',
        border: 'rgba(148, 163, 184, 0.3)',
        dot: '#64748b',
        label: 'Not Started',
      };
    case 'OFFLINE':
    default:
      return {
        bg: 'rgba(153, 27, 27, 0.3)',
        color: '#fca5a5',
        border: 'rgba(239, 68, 68, 0.3)',
        dot: '#ef4444',
        label: 'Offline',
      };
  }
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [callers, setCallers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Enhanced Employees Activity & Live Status state
  const [employeesActivityData, setEmployeesActivityData] = useState({
    dates: {},
    office: {},
    totalEmployees: 0,
    activeEmployees: 0,
    employees: [],
  });
  const [activityCallsDateFilter, setActivityCallsDateFilter] = useState('today');
  const [activitySearch, setActivitySearch] = useState('');

  // Interactive Modals State
  const [detailModalEmployee, setDetailModalEmployee] = useState(null);
  const [statusModalEmployee, setStatusModalEmployee] = useState(null);
  const [mapModalEmployee, setMapModalEmployee] = useState(null);
  const [callsModalEmployee, setCallsModalEmployee] = useState(null);
  const [callsModalPeriod, setCallsModalPeriod] = useState('today');
  const [callsModalCustomDate, setCallsModalCustomDate] = useState('');
  const [callsModalData, setCallsModalData] = useState(null);
  const [callsModalLoading, setCallsModalLoading] = useState(false);

  // Pre-generate all date options for dropdown
  const allDateOptions = useMemo(() => {
    const list = [];
    const now = new Date();

    list.push({ key: 'all', label: 'All Dates (Full History)' });

    const todayFormatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const todayDay = now.toLocaleDateString('en-US', { weekday: 'short' });
    list.push({ key: 'today', label: `Today — ${todayFormatted} (${todayDay})` });

    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestFormatted = yest.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const yestDay = yest.toLocaleDateString('en-US', { weekday: 'short' });
    list.push({ key: 'yesterday', label: `Yesterday — ${yestFormatted} (${yestDay})` });

    const tmrw = new Date(now);
    tmrw.setDate(tmrw.getDate() + 1);
    const tmrwFormatted = tmrw.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const tmrwDay = tmrw.toLocaleDateString('en-US', { weekday: 'short' });
    list.push({ key: 'tomorrow', label: `Tomorrow (Scheduled) — ${tmrwFormatted} (${tmrwDay})` });

    for (let i = 2; i <= 60; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const iso = `${yyyy}-${mm}-${dd}`;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const formatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      list.push({ key: iso, label: `${formatted} (${dayName})` });
    }

    return list;
  }, []);

  // Leaderboard tab & user modal states
  const [leaderboardTab, setLeaderboardTab] = useState('employees');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userAnalysisData, setUserAnalysisData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const isSuperAdmin = user?.role === 'admin';
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const openAnalysisModal = async (userId) => {
    setSelectedUserId(userId);
    setModalLoading(true);
    setUserAnalysisData(null);
    try {
      const res = await reportsAPI.userAnalysis(userId);
      setUserAnalysisData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const closeAnalysisModal = () => {
    setSelectedUserId(null);
    setUserAnalysisData(null);
  };

  const openCallsModal = async (employee, period = 'today', customDate = '') => {
    setCallsModalEmployee(employee);
    setCallsModalPeriod(period);
    setCallsModalCustomDate(customDate || '');
    setCallsModalLoading(true);
    setCallsModalData(null);
    try {
      const params = customDate ? { date: customDate } : { period };
      const res = await reportsAPI.getEmployeeCallRecords(employee._id, params);
      if (res.data?.ok) {
        setCallsModalData(res.data);
      }
    } catch (err) {
      console.error('[Call Records Fetch Error]:', err);
    } finally {
      setCallsModalLoading(false);
    }
  };

  const switchCallsModalPeriod = async (period) => {
    if (!callsModalEmployee) return;
    setCallsModalPeriod(period);
    setCallsModalCustomDate('');
    setCallsModalLoading(true);
    try {
      const res = await reportsAPI.getEmployeeCallRecords(callsModalEmployee._id, { period });
      if (res.data?.ok) {
        setCallsModalData(res.data);
      }
    } catch (err) {
      console.error('[Call Records Switch Error]:', err);
    } finally {
      setCallsModalLoading(false);
    }
  };

  const switchCallsModalCustomDate = async (dateStr) => {
    if (!callsModalEmployee || !dateStr) return;
    setCallsModalPeriod('custom');
    setCallsModalCustomDate(dateStr);
    setCallsModalLoading(true);
    try {
      const res = await reportsAPI.getEmployeeCallRecords(callsModalEmployee._id, { date: dateStr });
      if (res.data?.ok) {
        setCallsModalData(res.data);
      }
    } catch (err) {
      console.error('[Call Records Custom Date Error]:', err);
    } finally {
      setCallsModalLoading(false);
    }
  };

  const handleCallsDateDropdownChange = (val) => {
    if (!val) return;
    if (val === 'today' || val === 'yesterday' || val === 'tomorrow' || val === 'all') {
      switchCallsModalPeriod(val);
    } else {
      switchCallsModalCustomDate(val);
    }
  };

  const fetchData = async () => {
    setFetchError(null);
    try {
      if (isAdmin || isSuperAdmin) {
        const [statsRes, adminRes, usersRes, activityRes] = await Promise.all([
          leadsAPI.getStats().catch(e => { throw new Error(`leads/stats API: ${e.response?.data?.message || e.message}`); }),
          reportsAPI.adminAnalysis().catch(e => { console.warn('admin-analysis API unavailable:', e.message); return { data: null }; }),
          usersAPI.getAll().catch(e => { throw new Error(`users API: ${e.response?.data?.message || e.message}`); }),
          reportsAPI.getEmployeesLiveActivity().catch(e => { console.warn('employees-live-activity API unavailable:', e.message); return { data: null }; }),
        ]);

        setStats(statsRes.data);
        if (adminRes.data) setAdminStats(adminRes.data);
        setCallers(usersRes.data.users?.filter(u => u.role === 'employee' || u.role === 'caller') || []);
        if (activityRes?.data?.ok) {
          setEmployeesActivityData(activityRes.data);
        }
      } else {
        const statsRes = await leadsAPI.getStats().catch(e => { throw new Error(`leads/stats API: ${e.response?.data?.message || e.message}`); });
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('[Dashboard Fetch Error]:', err);
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role) {
      fetchData();
    }
  }, [user?.role]);

  const refresh = () => {
    setLoading(true);
    fetchData();
  };

  const filteredActivityEmployees = useMemo(() => {
    const list = employeesActivityData.employees || [];
    if (!activitySearch.trim()) return list;
    const q = activitySearch.toLowerCase().trim();
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.phone && e.phone.includes(q)) ||
        (e.location?.formattedAddress && e.location.formattedAddress.toLowerCase().includes(q))
    );
  }, [employeesActivityData.employees, activitySearch]);

  if (loading) return (
    <div className="flex items-center justify-center h-80">
      <div className="w-10 h-10 border-4 border-[#72ff47]/20 border-t-[#72ff47] rounded-full animate-spin" />
    </div>
  );

  const renderEmployeeDashboard = () => (
    <div className="flex flex-col gap-6 max-w-full overflow-x-hidden">
      <EmployeeTrackingCard />
    </div>
  );

  const renderAdminDashboard = () => {
    if (!adminStats) {
      return (
        <div className="flex flex-col items-center justify-center h-72 gap-3 bg-[#0c160c]/80 border border-[#72ff47]/20 rounded-2xl p-6">
          <FaChartPie className="w-10 h-10 text-[#72ff47]" />
          <div className="text-sm font-medium text-slate-200">Analytics Loading or Unavailable</div>
          <button
            onClick={refresh}
            className="bg-[#119822] hover:bg-[#18d531] text-white rounded-xl px-5 py-2 text-xs font-normal transition-all"
          >
            Retry Refresh
          </button>
        </div>
      );
    }

    const revenueWon = adminStats.revenueWon || 0;
    const funnelStages = adminStats.conversionFunnel || [];
    const campaignStats = adminStats.campaignPerformance || [];
    const actualDemosCombined = adminStats?.demosScheduledThisMonth || 0;

    const totalLeadsCount = stats?.total || 0;
    const wonCount = funnelStages.find(f => f.stage === 'Won')?.count || 0;
    const leadConversionRate = totalLeadsCount > 0 ? Math.round((wonCount / totalLeadsCount) * 100) : 0;

    const activeEmployeesCount = employeesActivityData.activeEmployees || 0;
    const totalEmployeesCount = employeesActivityData.totalEmployees || employeesActivityData.employees.length;

    return (
      <div className="flex flex-col gap-6 max-w-full overflow-x-hidden">
        {/* Live Attendance & Location Tracking Widget */}
        <EmployeeTrackingCard />

        {/* Strategic KPIs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            icon={<FaUsers />}
            label="Total Leads In System" 
            value={stats?.total || 0} 
            sub="All-time database count" 
            bg="rgba(30, 68, 30, 0.6)" 
            iconColor="#72ff47"
          />
          <StatCard 
            icon={<FaMoneyBillWave />}
            label="Revenue Won (This Month)" 
            value={`₹${revenueWon.toLocaleString('en-IN')}`} 
            sub="Closed won pipeline" 
            bg="rgba(17, 152, 34, 0.4)" 
            iconColor="#43ff0a"
          />
          <StatCard 
            icon={<FaArrowTrendUp />}
            label="Lead-to-Won Success Rate" 
            value={`${leadConversionRate}%`} 
            sub="Conversion efficiency" 
            bg="rgba(30, 68, 30, 0.6)" 
            iconColor="#72ff47"
          />
          <StatCard 
            icon={<FaCalendarCheck />}
            label="Strategic Demos Scheduled" 
            value={actualDemosCombined} 
            sub="Scheduled this month" 
            bg="rgba(17, 152, 34, 0.4)" 
            iconColor="#43ff0a"
          />
        </div>

        {/* ── 1. Employees Activity & Live Status Dashboard ──────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0c160c]/90 border border-[#72ff47]/20 rounded-2xl p-5 shadow-2xl backdrop-blur-xl flex flex-col gap-4 text-slate-100"
        >
          {/* Header Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1e441e] pb-4">
            <div>
              <div className="text-base font-medium text-white flex items-center gap-2.5">
                <FaTowerCell className="w-5 h-5 text-[#72ff47]" />
                <span>Employees Activity & Live Telemetry</span>
              </div>
              <div className="text-xs font-normal text-[#8bc088] mt-0.5">
                Real-time employee presence, live GPS location, attendance timings, and call performance
              </div>
            </div>

            {/* Filter and Control Group */}
            <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
              {/* Search Box */}
              <div className="flex items-center gap-2 bg-[#040704] border border-[#356033] rounded-xl px-3 py-1.5 min-w-[200px] flex-1 sm:flex-initial">
                <FaMagnifyingGlass className="w-3.5 h-3.5 text-[#8bc088]" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-slate-100 placeholder-slate-500 w-full"
                />
                {activitySearch && (
                  <button onClick={() => setActivitySearch('')} className="text-slate-400 hover:text-white">
                    <FaXmark className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Calls Date Selector Dropdown */}
              <div className="flex items-center gap-2 bg-[#1e441e] border border-[#72ff47]/30 rounded-xl px-3 py-1.5">
                <span className="text-xs font-normal text-[#72ff47]">Calls:</span>
                <select
                  value={activityCallsDateFilter}
                  onChange={(e) => setActivityCallsDateFilter(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-normal text-slate-100 cursor-pointer"
                >
                  <option value="today" className="bg-[#0c160c] text-white">Today ({employeesActivityData.dates?.today?.day?.slice(0, 3) || 'Today'})</option>
                  <option value="yesterday" className="bg-[#0c160c] text-white">Yesterday ({employeesActivityData.dates?.yesterday?.day?.slice(0, 3) || 'Yest'})</option>
                  <option value="tomorrow" className="bg-[#0c160c] text-white">Tomorrow ({employeesActivityData.dates?.tomorrow?.day?.slice(0, 3) || 'Tmrw'})</option>
                </select>
              </div>

              {/* Active Badge */}
              <div className="bg-[#1e441e] text-[#72ff47] border border-[#72ff47]/40 text-xs font-normal px-3 py-1.5 rounded-xl flex items-center gap-2 shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#72ff47] animate-pulse" />
                <span>{activeEmployeesCount} Active / {totalEmployeesCount} Total</span>
              </div>

              {/* Refresh Button */}
              <button
                onClick={refresh}
                title="Refresh Activity"
                className="bg-[#1e441e] hover:bg-[#356033] border border-[#72ff47]/30 p-2 rounded-xl text-slate-200 transition-colors"
              >
                <FaRotate className="w-3.5 h-3.5 text-[#72ff47]" />
              </button>
            </div>
          </div>

          {/* Table Container */}
          {filteredActivityEmployees.length === 0 ? (
            <div className="text-center py-8 text-xs font-normal text-[#8bc088]">
              No employee records matching your search or activity filters.
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#1e441e] rounded-xl">
              <table className="w-full text-xs text-left text-slate-200 min-w-[950px]">
                <thead className="bg-[#040704] text-[#8bc088] uppercase tracking-wider text-[11px] font-normal border-b border-[#1e441e]">
                  <tr>
                    <th className="py-3 px-4 font-normal">Employee</th>
                    <th className="py-3 px-3 text-center font-normal">Live Status</th>
                    <th className="py-3 px-3 text-center font-normal">Attendance</th>
                    <th className="py-3 px-3 text-center font-normal">
                      Calls ({activityCallsDateFilter === 'today' ? 'Today' : activityCallsDateFilter === 'yesterday' ? 'Yesterday' : 'Tomorrow'})
                    </th>
                    <th className="py-3 px-3 text-center font-normal">Last Call</th>
                    <th className="py-3 px-4 text-center font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e441e]">
                  {filteredActivityEmployees.map((emp) => {
                    const badge = getLiveStatusBadge(emp.liveStatus);
                    const callInfo = emp.calls?.[activityCallsDateFilter] || {};

                    return (
                      <tr
                        key={emp._id}
                        className="hover:bg-[#1e441e]/50 transition-colors"
                      >
                        {/* 1. Employee Column */}
                        <td
                          onClick={() => setDetailModalEmployee(emp)}
                          className="py-3 px-4 cursor-pointer"
                          title="Click to view complete employee profile & history"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#119822] to-[#31cb00] text-white font-medium text-xs flex items-center justify-center shrink-0 shadow-md">
                              {emp.name?.[0]?.toUpperCase() || 'E'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-100 truncate">{emp.name}</span>
                                <span className="text-[10px] font-mono text-[#72ff47] bg-[#152614] border border-[#356033] px-1.5 py-0.2 rounded">
                                  {emp.employeeId}
                                </span>
                              </div>
                              <div className="text-[11px] font-normal text-[#8bc088] truncate">{emp.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Live Status Column */}
                        <td
                          onClick={() => setStatusModalEmployee(emp)}
                          className="py-3 px-3 text-center cursor-pointer"
                          title="Click to view status details & live telemetry"
                        >
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-normal border"
                            style={{ background: badge.bg, color: badge.color, borderColor: badge.border }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: badge.dot }} />
                            {badge.label}
                          </span>
                        </td>

                        {/* 3. Attendance Column */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`font-normal ${emp.todayAttendance?.status !== 'NOT_STARTED' ? 'text-[#72ff47]' : 'text-slate-400'}`}>
                              {emp.todayAttendance?.startTimeFormatted || 'Not Started'}
                            </span>
                            {emp.todayAttendance?.status !== 'NOT_STARTED' && (
                              <span className="text-[10px] font-mono text-[#8bc088] bg-[#040704] px-1.5 py-0.2 rounded border border-[#356033]">
                                ⚡ {emp.todayAttendance?.formattedActualWork || emp.todayAttendance?.durationFormatted}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Calls Column */}
                        <td
                          onClick={() => openCallsModal(emp, activityCallsDateFilter)}
                          className="py-3 px-3 text-center cursor-pointer"
                          title="Click to view individual call records"
                        >
                          {activityCallsDateFilter === 'tomorrow' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1e441e] text-[#a1ff85] border border-[#72ff47]/30 text-[11px]">
                              <FaCalendarDays className="w-3 h-3 text-[#72ff47]" /> {callInfo.scheduledCount || 0} Scheduled
                            </span>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="px-2.5 py-0.5 rounded-lg bg-[#1e441e] text-[#72ff47] border border-[#72ff47]/30 text-[11px] font-normal">
                                📞 {callInfo.count || 0} Calls
                              </span>
                              {callInfo.totalDurationSec > 0 && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  {callInfo.totalDurationFormatted}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 5. Last Call Column */}
                        <td
                          onClick={() => openCallsModal(emp, activityCallsDateFilter)}
                          className="py-3 px-3 text-center cursor-pointer"
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-normal text-slate-200">
                              {emp.calls?.today?.lastCallTimeFormatted || 'Never'}
                            </span>
                            {emp.calls?.today?.lastCallDurationSec > 0 && (
                              <span className="text-[10px] font-mono text-[#8bc088]">
                                {emp.calls.today.lastCallDurationFormatted}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Actions Column */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setDetailModalEmployee(emp)}
                              className="bg-[#152614] hover:bg-[#1e441e] text-slate-200 border border-[#356033] px-2.5 py-1 rounded-lg text-[11px] font-normal flex items-center gap-1 transition-colors"
                            >
                              <FaUserTie className="w-3 h-3 text-[#72ff47]" /> Profile
                            </button>
                            <button
                              onClick={() => setMapModalEmployee(emp)}
                              className="bg-[#1e441e] hover:bg-[#356033] text-[#72ff47] border border-[#72ff47]/30 px-2.5 py-1 rounded-lg text-[11px] font-normal flex items-center gap-1 transition-colors"
                            >
                              <FaMapLocationDot className="w-3 h-3" /> Map
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* 2. Visualizations & Leaderboard Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Conversion Funnel Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-7 bg-[#0c160c]/90 border border-[#72ff47]/20 rounded-2xl p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between"
          >
            <div className="text-base font-medium text-white flex items-center gap-2 mb-4">
              <FaChartLine className="w-4 h-4 text-[#72ff47]" />
              <span>Lead Pipeline Conversion Visualization</span>
            </div>
            
            {funnelStages.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={funnelStages} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e441e" vertical={false} />
                  <XAxis dataKey="stage" stroke="#8bc088" fontSize={11} tickLine={false} />
                  <YAxis stroke="#8bc088" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#0c160c', border: '1px solid rgba(114,255,71,0.4)', borderRadius: 12, fontSize: 12, color: '#f8fafc' }}
                  />
                  <Bar dataKey="count" fill="#119822" radius={[6, 6, 0, 0]}>
                    {funnelStages.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.stage] || PALETTE_COLORS[index % PALETTE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-xs font-normal text-[#8bc088]">
                No conversion pipeline data available.
              </div>
            )}
          </motion.div>

          {/* Team Productivity Leaderboard */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-5 bg-[#0c160c]/90 border border-[#72ff47]/20 rounded-2xl p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-base font-medium text-white flex items-center gap-2">
                  <FaTrophy className="w-4 h-4 text-[#72ff47]" /> Team Leaderboard
                </span>
                <div className="flex bg-[#040704] p-1 rounded-xl border border-[#356033]">
                  <button 
                    onClick={() => setLeaderboardTab('employees')}
                    className={`text-xs font-normal px-3 py-1 rounded-lg transition-colors ${
                      leaderboardTab === 'employees' ? 'bg-[#1e441e] text-[#72ff47]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Employees
                  </button>
                  <button 
                    onClick={() => setLeaderboardTab('admins')}
                    className={`text-xs font-normal px-3 py-1 rounded-lg transition-colors ${
                      leaderboardTab === 'admins' ? 'bg-[#1e441e] text-[#72ff47]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Admins
                  </button>
                </div>
              </div>

              {(() => {
                const filteredCallers = adminStats?.callers?.filter(c => {
                  if (leaderboardTab === 'admins') return c.user?.role === 'manager' || c.user?.role === 'admin';
                  return c.user?.role === 'employee' || c.user?.role === 'caller';
                }) || [];

                return filteredCallers.length > 0 ? (
                  <div className="divide-y divide-[#1e441e] text-xs">
                    {filteredCallers.map((c, idx) => (
                      <div 
                        key={c._id} 
                        onClick={() => openAnalysisModal(c.user?._id)}
                        className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-[#1e441e]/40 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono text-[11px] text-[#72ff47] w-4">{idx + 1}.</span>
                          <div className="w-6 h-6 rounded-full bg-[#119822] text-white text-[10px] font-medium flex items-center justify-center shrink-0">
                            {c.user?.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="font-normal text-slate-200 truncate">{c.user?.name}</span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-slate-400 font-normal">{c.totalCalls} dials</span>
                          <span className="text-[#72ff47] font-medium">{c.sales || 0} wins</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs font-normal text-[#8bc088]">No activity logged yet.</div>
                );
              })()}
            </div>
          </motion.div>
        </div>

        {/* 3. Campaign Performance Table */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0c160c]/90 border border-[#72ff47]/20 rounded-2xl p-5 shadow-2xl backdrop-blur-xl"
        >
          <div className="text-base font-medium text-white flex items-center gap-2 mb-4">
            <FaBullhorn className="w-4 h-4 text-[#72ff47]" />
            <span>Campaign Performance Analytics</span>
          </div>

          {campaignStats.length === 0 ? (
            <div className="text-center py-6 text-xs font-normal text-[#8bc088]">No campaign statistics available.</div>
          ) : (
            <div className="overflow-x-auto border border-[#1e441e] rounded-xl">
              <table className="w-full text-xs text-left text-slate-200">
                <thead className="bg-[#040704] text-[#8bc088] uppercase tracking-wider text-[11px] font-normal border-b border-[#1e441e]">
                  <tr>
                    <th className="py-3 px-4 font-normal">Campaign Name</th>
                    <th className="py-3 px-3 text-center font-normal">Total Leads</th>
                    <th className="py-3 px-3 text-center font-normal">Called %</th>
                    <th className="py-3 px-3 text-center font-normal">Won</th>
                    <th className="py-3 px-3 text-center font-normal">Lost</th>
                    <th className="py-3 px-4 text-right font-normal">Conv. Rate %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e441e]">
                  {campaignStats.map(c => {
                    const callPct = c.totalLeads > 0 ? Math.round((c.called / c.totalLeads) * 100) : 0;
                    const convPct = c.totalLeads > 0 ? Math.round((c.won / c.totalLeads) * 100) : 0;
                    return (
                      <tr 
                        key={c._id || 'unassigned'} 
                        onClick={() => c._id && navigate('/campaigns/' + c._id)}
                        className={`hover:bg-[#1e441e]/50 transition-colors ${c._id ? 'cursor-pointer' : ''}`}
                      >
                        <td className="py-3 px-4 font-medium text-slate-100">{c.name}</td>
                        <td className="py-3 px-3 text-center font-normal">{c.totalLeads}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="bg-[#1e441e] text-[#72ff47] px-2 py-0.5 rounded-md text-[11px] font-normal border border-[#72ff47]/30">
                            {callPct}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-[#43ff0a]">{c.won}</td>
                        <td className="py-3 px-3 text-center font-medium text-rose-400">{c.lost}</td>
                        <td className="py-3 px-4 text-right font-medium text-[#72ff47]">{convPct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

      </div>
    );
  };

  if (fetchError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="text-sm font-normal text-rose-400">Dashboard Load Notice: {fetchError}</div>
        <button onClick={refresh} className="bg-[#119822] text-white px-5 py-2 rounded-xl text-xs font-normal">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6 max-w-full overflow-x-hidden text-slate-100">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-[#1e441e] pb-4 flex-wrap gap-3">
        <div>
          <div className="text-xl font-medium text-white flex items-center gap-3">
            <span>{isSuperAdmin ? 'Admin Dashboard' : isAdmin ? 'Manager Dashboard' : 'Employee Portal'}</span>
            <button
              onClick={refresh}
              className="text-[#72ff47] hover:text-white transition-colors"
              title="Refresh Dashboard"
            >
              <FaRotate className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs font-normal text-[#8bc088] mt-1">
            Welcome back, {user?.name}!
          </div>
        </div>
      </div>

      {/* Render Role specific layout */}
      {isAdmin ? renderAdminDashboard() : renderEmployeeDashboard()}

      {/* ── MODAL 1: Complete Employee Details Modal ───────────────────────── */}
      <AnimatePresence>
        {detailModalEmployee && (
          <div className="fixed inset-0 bg-[#040704]/80 z-50 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setDetailModalEmployee(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c160c] border border-[#72ff47]/30 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-[#1e441e] bg-[#040704]/90 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#119822] to-[#31cb00] text-white font-medium text-sm flex items-center justify-center">
                    {detailModalEmployee.name?.[0]?.toUpperCase() || 'E'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-medium text-white">{detailModalEmployee.name}</span>
                      <span className="text-[10px] font-mono text-[#72ff47] bg-[#152614] border border-[#356033] px-2 py-0.5 rounded">
                        {detailModalEmployee.employeeId}
                      </span>
                    </div>
                    <div className="text-xs text-[#8bc088]">{detailModalEmployee.email} • {detailModalEmployee.role?.toUpperCase()}</div>
                  </div>
                </div>
                <button onClick={() => setDetailModalEmployee(null)} className="text-slate-400 hover:text-white">
                  <FaXmark className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex flex-col gap-4 text-xs">
                {/* Attendance Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#1e441e]/50 border border-[#72ff47]/30 rounded-xl p-4 flex flex-col gap-2">
                    <div className="font-normal text-[#72ff47] uppercase text-[11px] flex items-center justify-between border-b border-[#1e441e] pb-2">
                      <span>🟢 Today's Attendance</span>
                      <span>{detailModalEmployee.todayAttendance?.day}</span>
                    </div>
                    <div className="flex justify-between"><span className="text-[#8bc088]">Start Time:</span> <span className="text-[#72ff47]">{detailModalEmployee.todayAttendance?.startTimeFormatted}</span></div>
                    <div className="flex justify-between"><span className="text-[#8bc088]">Logout Time:</span> <span>{detailModalEmployee.todayAttendance?.endTimeFormatted}</span></div>
                    <div className="flex justify-between"><span className="text-[#8bc088]">Duration:</span> <span className="font-mono">{detailModalEmployee.todayAttendance?.durationFormatted}</span></div>
                    <div className="flex justify-between pt-2 border-t border-[#1e441e]"><span className="text-white">Actual Work:</span> <span className="font-mono text-[#72ff47] font-medium">{detailModalEmployee.todayAttendance?.formattedActualWork}</span></div>
                  </div>

                  <div className="bg-[#040704] border border-[#356033] rounded-xl p-4 flex flex-col gap-2">
                    <div className="font-normal text-slate-400 uppercase text-[11px] flex items-center justify-between border-b border-[#1e441e] pb-2">
                      <span>⏱️ Yesterday's Attendance</span>
                      <span>{detailModalEmployee.yesterdayAttendance?.day || 'Yesterday'}</span>
                    </div>
                    <div className="flex justify-between"><span className="text-[#8bc088]">Start Time:</span> <span>{detailModalEmployee.yesterdayAttendance?.startTimeFormatted}</span></div>
                    <div className="flex justify-between"><span className="text-[#8bc088]">Logout Time:</span> <span>{detailModalEmployee.yesterdayAttendance?.endTimeFormatted}</span></div>
                    <div className="flex justify-between"><span className="text-[#8bc088]">Duration:</span> <span className="font-mono">{detailModalEmployee.yesterdayAttendance?.durationFormatted}</span></div>
                    <div className="flex justify-between pt-2 border-t border-[#1e441e]"><span className="text-white">Actual Work:</span> <span className="font-mono text-slate-200">{detailModalEmployee.yesterdayAttendance?.formattedActualWork}</span></div>
                  </div>
                </div>

                {/* Location Telemetry */}
                <div className="bg-[#1e441e]/30 border border-[#72ff47]/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-normal text-[#72ff47] uppercase flex items-center gap-2">
                      <FaLocationDot /> Live Location Telemetry
                    </span>
                    <button
                      onClick={() => {
                        const target = detailModalEmployee;
                        setDetailModalEmployee(null);
                        setMapModalEmployee(target);
                      }}
                      className="bg-[#119822] hover:bg-[#18d531] text-white px-3 py-1 rounded-lg text-xs font-normal flex items-center gap-1"
                    >
                      <FaMapLocationDot /> View Live Map
                    </button>
                  </div>
                  <div className="text-slate-200 font-normal mt-1">{detailModalEmployee.location?.formattedAddress || 'Location unavailable'}</div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 3: Live Map Modal ───────────────────────────────── */}
      <AnimatePresence>
        {mapModalEmployee && (
          <div className="fixed inset-0 bg-[#040704]/80 z-50 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setMapModalEmployee(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c160c] border border-[#72ff47]/30 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-[#1e441e] bg-[#040704]/90 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaMapLocationDot className="w-5 h-5 text-[#72ff47]" />
                  <div>
                    <div className="text-sm font-medium text-white">Live Map — {mapModalEmployee.name} ({mapModalEmployee.employeeId})</div>
                    <div className="text-xs text-[#8bc088]">{mapModalEmployee.location?.formattedAddress || 'Tracking live'}</div>
                  </div>
                </div>
                <button onClick={() => setMapModalEmployee(null)} className="text-slate-400 hover:text-white">
                  <FaXmark className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 relative">
                <LiveMap
                  employees={[mapModalEmployee]}
                  selectedEmployee={mapModalEmployee}
                  onSelectEmployee={() => {}}
                  officeConfig={employeesActivityData.office}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 4: Call Records Modal ──────────────── */}
      <AnimatePresence>
        {callsModalEmployee && (
          <div className="fixed inset-0 bg-[#040704]/80 z-50 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setCallsModalEmployee(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c160c] border border-[#72ff47]/30 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-[#1e441e] bg-[#040704]/90 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <FaPhone className="w-4 h-4 text-[#72ff47]" />
                  <div>
                    <div className="text-sm font-medium text-white">Call Records — {callsModalEmployee.name}</div>
                    <div className="text-xs text-[#8bc088]">{callsModalEmployee.employeeId} • {callsModalEmployee.email}</div>
                  </div>
                </div>
                <button onClick={() => setCallsModalEmployee(null)} className="text-slate-400 hover:text-white">
                  <FaXmark className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto">
                {callsModalLoading ? (
                  <div className="text-center py-8 text-xs text-[#8bc088]">Loading records...</div>
                ) : !callsModalData || callsModalData.calls?.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">No call activity records found for this period.</div>
                ) : (
                  <table className="w-full text-xs text-left text-slate-200">
                    <thead className="bg-[#040704] text-[#8bc088] uppercase text-[11px] font-normal border-b border-[#1e441e]">
                      <tr>
                        <th className="py-2.5 px-3 font-normal">Time</th>
                        <th className="py-2.5 px-3 font-normal">Contact</th>
                        <th className="py-2.5 px-3 font-normal">Phone</th>
                        <th className="py-2.5 px-3 text-center font-normal">Status</th>
                        <th className="py-2.5 px-3 text-right font-normal">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e441e]">
                      {callsModalData.calls.map((c, idx) => (
                        <tr key={c.id || idx}>
                          <td className="py-2.5 px-3 font-normal">{c.callTime}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-100">{c.contactName}</td>
                          <td className="py-2.5 px-3 font-mono text-[#8bc088]">{c.contactNumber}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-normal bg-[#1e441e] text-[#72ff47]">
                              {c.callStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-200">{c.callDurationFormatted}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}