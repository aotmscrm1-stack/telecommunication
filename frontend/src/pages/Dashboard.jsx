import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { leadsAPI, followupsAPI, reportsAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AreaChart, Area, BarChart, Bar, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import StatCard from '../components/dashboard/StatCard';
import EmployeeTrackingCard from '../components/tracking/EmployeeTrackingCard';
import LiveMap from '../components/tracking/LiveMap';
import {
  FaUsers, FaMoneyBillWave, FaChartLine, FaCalendarCheck, FaPhone,
  FaTrophy, FaLocationDot, FaBuilding, FaMagnifyingGlass, FaRotate, FaFilter,
  FaCircleCheck, FaEye, FaMapLocationDot, FaUserTie, FaChartPie,
  FaClock, FaXmark, FaCheck, FaPhoneVolume, FaCalendarDays, FaFileLines,
  FaChevronRight, FaBullhorn, FaArrowTrendUp, FaTowerCell, FaArrowUpRightFromSquare,
  FaArrowUp, FaArrowDown, FaPlus, FaCalendar, FaCreditCard, FaWifi,
  FaLock, FaUserCheck, FaCoins, FaGaugeHigh, FaUserGroup, FaFileInvoiceDollar,
  FaReceipt, FaGlobe
} from 'react-icons/fa6';

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
        bg: '#e6f4ea',
        color: '#0d6537',
        border: '#b7e4c7',
        dot: '#0d6537',
        label: 'On Duty',
      };
    case 'ON_CALL':
      return {
        bg: '#e0f2fe',
        color: '#0369a1',
        border: '#bae6fd',
        dot: '#0284c7',
        label: 'On Call',
      };
    case 'ON_BREAK':
      return {
        bg: '#fef3c7',
        color: '#b45309',
        border: '#fde68a',
        dot: '#f59e0b',
        label: 'On Break',
      };
    case 'COMPLETED':
      return {
        bg: '#dcfce7',
        color: '#15803d',
        border: '#86efac',
        dot: '#22c55e',
        label: 'Completed',
      };
    case 'ACTIVE':
      return {
        bg: '#f0fdf4',
        color: '#166534',
        border: '#bbf7d0',
        dot: '#16a34a',
        label: 'Active GPS',
      };
    case 'NOT_STARTED':
      return {
        bg: '#f1f5f9',
        color: '#64748b',
        border: '#e2e8f0',
        dot: '#94a3b8',
        label: 'Not Started',
      };
    case 'OFFLINE':
    default:
      return {
        bg: '#ffe4e6',
        color: '#9f1239',
        border: '#fecdd3',
        dot: '#f43f5e',
        label: 'Offline',
      };
  }
}

// Sample chart data matching the reference layout aesthetics
const sampleEngagementData = [
  { month: 'JAN', value: 2100 },
  { month: 'FEB', value: 4200 },
  { month: 'MAR', value: 3100 },
  { month: 'APR', value: 5400, highlight: true },
  { month: 'MAY', value: 3800 },
  { month: 'JUN', value: 4600 },
];

const sampleSparklineData = [
  { name: '1', value: 1200 },
  { name: '2', value: 1900 },
  { name: '3', value: 1500 },
  { name: '4', value: 2400 },
  { name: '5', value: 1800 },
  { name: '6', value: 2800 },
  { name: '7', value: 2200 },
  { name: '8', value: 3100 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [callers, setCallers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Engagement Tab Toggle state
  const [engagementTab, setEngagementTab] = useState('Annually');

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

  // Leaderboard tab state
  const [leaderboardTab, setLeaderboardTab] = useState('employees');

  const isSuperAdmin = user?.role === 'admin';
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

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
    <div className="flex items-center justify-center h-80 bg-[#f4f6f8]">
      <div className="w-10 h-10 border-4 border-[#0d6537]/20 border-t-[#0d6537] rounded-full animate-spin" />
    </div>
  );

  const revenueWon = adminStats?.revenueWon || 0;
  const totalLeadsCount = stats?.total || 0;
  const actualDemosCombined = adminStats?.demosScheduledThisMonth || 0;

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-gray-900 p-4 sm:p-8 flex flex-col gap-8 max-w-full overflow-x-hidden font-sans">
      
      {/* ── TOP HEADER (Reference Style) ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 flex items-center gap-3">
            <span>Welcome Back,</span>
            <span className="font-normal text-gray-500">{user?.name || 'Sujon'}</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Range Picker Pill */}
          <div className="bg-white border border-gray-200/90 rounded-full px-4 py-2 text-xs font-medium text-gray-700 shadow-xs flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
            <FaCalendar className="w-3.5 h-3.5 text-gray-500" />
            <span>29 Jun, 2025 - 29 August, 2025</span>
            <span className="text-gray-400 text-[10px]">▼</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={refresh}
            title="Refresh Dashboard Data"
            className="w-9 h-9 rounded-full bg-white border border-gray-200/90 flex items-center justify-center text-[#0d6537] hover:bg-gray-50 transition-colors shadow-xs"
          >
            <FaRotate className="w-3.5 h-3.5" />
          </button>

          {/* Action Button */}
          <button 
            onClick={() => navigate('/leads/new')}
            className="bg-[#0d6537] hover:bg-[#0b542e] text-white rounded-full px-5 py-2 text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <FaPlus className="w-3 h-3" />
            <span>Add New Lead</span>
          </button>
        </div>
      </div>

      {/* ── TOP SECTION (3 COLUMNS: 1fr 1.5fr 1fr) ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* COLUMN 1: Total Revenue Target / Featured Dark Green Banner Card */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="lg:col-span-3 bg-white rounded-[28px] p-6 shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-gray-100/90 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-semibold text-gray-800 uppercase tracking-wider">Revenue Target</div>
              <div className="text-[11px] font-medium text-gray-400">Total closed pipeline goal</div>
            </div>
            <button 
              onClick={() => navigate('/reports')}
              className="w-8 h-8 rounded-full bg-gray-100/80 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"
              title="View Reports"
            >
              <FaArrowUpRightFromSquare className="w-3 h-3" />
            </button>
          </div>

          {/* Featured Emerald Green Credit Card Banner */}
          <div className="bg-gradient-to-br from-[#0d6537] via-[#117843] to-[#0a4e2a] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between h-44 my-2">
            <div className="flex items-center justify-between">
              <span className="text-base font-extrabold tracking-wider flex items-center gap-1.5">
                <FaCoins className="w-4 h-4 text-emerald-300" /> AOTMS CRM
              </span>
              <FaWifi className="w-4 h-4 opacity-80 rotate-90" />
            </div>

            <div>
              <div className="text-[11px] font-medium text-emerald-200 uppercase tracking-wide">Total Revenue Won</div>
              <div className="text-3xl font-extrabold tracking-tight mt-0.5">
                ₹ {revenueWon ? revenueWon.toLocaleString('en-IN') : '78,989.09'}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono opacity-90">
              <span>•••• 909090</span>
              <span>EXP 09/26</span>
            </div>
          </div>

          {/* Bottom Revenue Growth */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100">
            <div>
              <div className="text-[11px] font-medium text-gray-400">Monthly Won Growth</div>
              <div className="text-lg font-bold text-gray-900">₹ 3,945 Won</div>
            </div>
            <span className="bg-[#e6f4ea] text-[#0d6537] text-[11px] font-bold px-2.5 py-1 rounded-full">
              +12.8%
            </span>
          </div>
        </motion.div>

        {/* COLUMN 2: Lead Conversion Rate & Engagement Bar Chart Card */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="lg:col-span-6 bg-white rounded-[28px] p-6 shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-gray-100/90 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#e6f4ea] flex items-center justify-center text-[#0d6537]">
                <FaChartPie className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Engagement & Lead Pipeline Trends</div>
                <div className="text-[11px] font-medium text-gray-400">Monthly conversion rate analytics</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Pill Selector */}
              <div className="bg-gray-100/90 p-1 rounded-full flex gap-1">
                <button 
                  onClick={() => setEngagementTab('Monthly')}
                  className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${
                    engagementTab === 'Monthly' ? 'bg-[#0d6537] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
                <button 
                  onClick={() => setEngagementTab('Annually')}
                  className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${
                    engagementTab === 'Annually' ? 'bg-[#0d6537] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Annually
                </button>
              </div>

              <button 
                onClick={() => navigate('/reports')}
                className="w-8 h-8 rounded-full bg-gray-100/80 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"
                title="View Full Reports"
              >
                <FaArrowUpRightFromSquare className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="relative w-full h-56 mt-2">
            {/* Floating Highlight Badge above April */}
            <div className="absolute top-1 left-[54%] -translate-x-1/2 bg-[#0d6537] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 flex items-center gap-1">
              +17.8%
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sampleEngagementData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip 
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12, color: '#0f172a', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="value" radius={[14, 14, 0, 0]}>
                  {sampleEngagementData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.highlight ? '#0d6537' : '#8bc088'} 
                      opacity={entry.highlight ? 1 : 0.65}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* COLUMN 3: Total System Leads Area Chart Card */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="lg:col-span-3 bg-white rounded-[28px] p-6 shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-gray-100/90 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs font-semibold text-gray-800 uppercase tracking-wider">Total System Leads</div>
                <div className="text-[11px] font-medium text-gray-400">All-time database leads</div>
              </div>
              <button 
                onClick={() => navigate('/leads')}
                className="w-8 h-8 rounded-full bg-gray-100/80 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"
                title="View All Leads"
              >
                <FaArrowUpRightFromSquare className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-3">
              <div className="text-[11px] font-medium text-gray-400">Active Leads Count</div>
              <div className="text-3xl font-black text-gray-900 tracking-tight mt-0.5">
                {totalLeadsCount ? totalLeadsCount.toLocaleString() : '32,678'} Leads
              </div>
            </div>
          </div>

          {/* Area Chart Container */}
          <div className="w-full h-24 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sampleSparklineData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGreenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d6537" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#0d6537" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#0d6537" strokeWidth={2.5} fillOpacity={1} fill="url(#areaGreenGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Action Pills */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/leads/new')}
              className="bg-[#0d6537] hover:bg-[#0b542e] text-white rounded-full py-2 px-4 text-xs font-semibold shadow-sm flex-1 flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Add Lead</span>
              <FaArrowUp className="w-3 h-3" />
            </button>
            <button 
              onClick={() => navigate('/leads')}
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-full py-2 px-4 text-xs font-semibold flex-1 flex items-center justify-center gap-1.5 transition-all"
            >
              <span>View All</span>
              <FaArrowDown className="w-3 h-3" />
            </button>
          </div>
        </motion.div>

      </div>

      {/* ── BOTTOM SECTION (2 COLUMNS: 2fr 1fr) ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* COLUMN 1: Employees Activity & Live Telemetry Table */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="lg:col-span-8 bg-white rounded-[28px] p-6 shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-gray-100/90 flex flex-col justify-between"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FaTowerCell className="w-4 h-4 text-[#0d6537]" />
                <span>Employees Activity & Live Telemetry</span>
              </div>
              <div className="text-xs font-medium text-gray-400 mt-0.5">
                Real-time employee presence, live GPS location & attendance
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-gray-100/80 border border-gray-200/80 rounded-full px-3 py-1.5 text-xs">
                <FaMagnifyingGlass className="w-3 h-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-gray-900 placeholder-gray-400 w-28 sm:w-36"
                />
              </div>

              <button 
                onClick={() => navigate('/admin/employee-tracking')}
                className="w-8 h-8 rounded-full bg-gray-100/80 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors shrink-0"
                title="View Full Live Tracking"
              >
                <FaArrowUpRightFromSquare className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Sleek Table Layout */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-gray-400 font-medium border-b border-gray-100 pb-3">
                  <th className="pb-3 font-medium">Employee</th>
                  <th className="pb-3 text-center font-medium">Live Status</th>
                  <th className="pb-3 text-center font-medium">Attendance</th>
                  <th className="pb-3 text-center font-medium">Calls</th>
                  <th className="pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80">
                {filteredActivityEmployees.slice(0, 5).map((emp) => {
                  const badge = getLiveStatusBadge(emp.liveStatus);
                  const callInfo = emp.calls?.today || {};

                  return (
                    <tr key={emp._id} className="hover:bg-gray-50/80 transition-colors">
                      <td onClick={() => setDetailModalEmployee(emp)} className="py-3.5 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#e6f4ea] text-[#0d6537] font-bold text-xs flex items-center justify-center shrink-0">
                            {emp.name?.[0]?.toUpperCase() || 'E'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{emp.name}</div>
                            <div className="text-[10px] text-gray-400 font-medium">{emp.employeeId} • {emp.email}</div>
                          </div>
                        </div>
                      </td>

                      <td onClick={() => setStatusModalEmployee(emp)} className="py-3.5 text-center cursor-pointer">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border" style={{ background: badge.bg, color: badge.color, borderColor: badge.border }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: badge.dot }} />
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3.5 text-center font-medium text-gray-700">
                        {emp.todayAttendance?.startTimeFormatted || 'Not Started'}
                      </td>

                      <td className="py-3.5 text-center font-bold text-gray-900">
                        {callInfo.count || 0} Calls
                      </td>

                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setDetailModalEmployee(emp)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-[11px] font-semibold transition-colors">
                            Profile
                          </button>
                          <button onClick={() => setMapModalEmployee(emp)} className="bg-[#e6f4ea] hover:bg-[#d1e7dd] text-[#0d6537] px-3 py-1 rounded-full text-[11px] font-semibold transition-colors">
                            Map
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* COLUMN 2: Strategic Demos & Team Staff Stack */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="lg:col-span-4 bg-white rounded-[28px] p-6 shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-gray-100/90 flex flex-col justify-between gap-6"
        >
          {/* Section 1: Strategic Demos Scheduled */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#e6f4ea] flex items-center justify-center text-[#0d6537]">
                <FaCalendarCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-900">Strategic Demos Scheduled</div>
                <div className="text-[11px] font-medium text-gray-400">Scheduled client demos this month</div>
              </div>
            </div>

            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-3xl font-black text-gray-900 tracking-tight">{actualDemosCombined} Demos</span>
              <span className="bg-[#e6f4ea] text-[#0d6537] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                +12.8%
              </span>
            </div>
          </div>

          {/* Section 2: Attendance Staff Stack */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-semibold text-gray-900">Active Staff Presence</div>
                <div className="text-[11px] font-medium text-gray-400">On-duty team members</div>
              </div>
              <button 
                onClick={() => navigate('/admin/attendance-records')}
                className="w-8 h-8 rounded-full bg-gray-100/80 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"
                title="View Attendance Records"
              >
                <FaArrowUpRightFromSquare className="w-3 h-3" />
              </button>
            </div>

            {/* Overlapping Avatar Stack */}
            <div className="flex items-center -space-x-3">
              <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-slate-200 shadow-xs">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-slate-200 shadow-xs">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-slate-200 shadow-xs">
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-slate-200 shadow-xs">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-white bg-[#0d6537] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                +2
              </div>
            </div>
          </div>
        </motion.div>

      </div>

      {/* ── LIVE TELEMETRY & ATTENDANCE CARD WIDGET ─────────────────────── */}
      <div className="mt-2">
        <EmployeeTrackingCard />
      </div>

      {/* ── MODALS (Map, Call Records, Details) ──────────────────────────── */}
      <AnimatePresence>
        {mapModalEmployee && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setMapModalEmployee(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[28px] w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaMapLocationDot className="w-5 h-5 text-[#0d6537]" />
                  <div>
                    <div className="text-sm font-bold text-gray-900">Live Map — {mapModalEmployee.name} ({mapModalEmployee.employeeId})</div>
                    <div className="text-xs text-gray-500">{mapModalEmployee.location?.formattedAddress || 'Tracking live'}</div>
                  </div>
                </div>
                <button onClick={() => setMapModalEmployee(null)} className="text-gray-400 hover:text-gray-700">
                  <FaXmark className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 relative">
                <LiveMap employees={[mapModalEmployee]} selectedEmployee={mapModalEmployee} onSelectEmployee={() => {}} officeConfig={employeesActivityData.office} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Complete Employee Details ───────────────────────── */}
      <AnimatePresence>
        {detailModalEmployee && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setDetailModalEmployee(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[28px] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-gray-900" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#e6f4ea] text-[#0d6537] font-bold text-sm flex items-center justify-center">
                    {detailModalEmployee.name?.[0]?.toUpperCase() || 'E'}
                  </div>
                  <div>
                    <div className="text-base font-bold text-gray-900">{detailModalEmployee.name} ({detailModalEmployee.employeeId})</div>
                    <div className="text-xs text-gray-500">{detailModalEmployee.email} • {detailModalEmployee.role?.toUpperCase()}</div>
                  </div>
                </div>
                <button onClick={() => setDetailModalEmployee(null)} className="text-gray-400 hover:text-gray-700">
                  <FaXmark className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex flex-col gap-4 text-xs">
                <div className="bg-[#e6f4ea] border border-[#b7e4c7] rounded-2xl p-4">
                  <div className="text-xs font-bold text-[#0d6537] uppercase mb-2">Today's Attendance</div>
                  <div className="grid grid-cols-2 gap-2 text-gray-700">
                    <div>Start Time: <strong>{detailModalEmployee.todayAttendance?.startTimeFormatted || 'Not Started'}</strong></div>
                    <div>Logout Time: <strong>{detailModalEmployee.todayAttendance?.endTimeFormatted || '—'}</strong></div>
                    <div>Duration: <strong className="font-mono">{detailModalEmployee.todayAttendance?.durationFormatted || '00:00:00'}</strong></div>
                    <div>Actual Work: <strong className="font-mono text-[#0d6537]">{detailModalEmployee.todayAttendance?.formattedActualWork || '0m'}</strong></div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700 uppercase flex items-center gap-2">
                      <FaLocationDot className="text-[#0d6537]" /> Live GPS Location
                    </span>
                    <button onClick={() => { const t = detailModalEmployee; setDetailModalEmployee(null); setMapModalEmployee(t); }} className="bg-[#0d6537] text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <FaMapLocationDot /> View Map
                    </button>
                  </div>
                  <div className="text-gray-800 font-medium">{detailModalEmployee.location?.formattedAddress || 'Location unavailable'}</div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}