import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadsAPI, followupsAPI, reportsAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import StatCard from '../components/dashboard/StatCard';
import EmployeeTrackingCard from '../components/tracking/EmployeeTrackingCard';
import LiveMap from '../components/tracking/LiveMap';

// User Color Palette: Oxford Navy (#1d3557), Cerulean (#457b9d), Frosted Blue (#a8dadc), Honeydew (#f1faee), Punch Red (#e63946)
const OXFORD_NAVY  = '#1d3557';
const CERULEAN     = '#457b9d';
const FROSTED_BLUE = '#a8dadc';
const HONEYDEW      = '#f1faee';
const PUNCH_RED     = '#e63946';
const BORDER        = '#e2e8f0';

const PALETTE_COLORS = [OXFORD_NAVY, CERULEAN, '#6097b9', '#315a93', '#88b1cb', PUNCH_RED];

const STATUS_COLORS = {
  'Fresh':               CERULEAN,
  'Connected':           OXFORD_NAVY,
  'Call Not Responding': PUNCH_RED,
  'Call Back Later':     '#d97706',
  'Not interested':      PUNCH_RED,
  'Demo Scheduled':      '#315a93',
  'Demo Done':           '#4e7fc4',
  'Won':                 OXFORD_NAVY,
  'Lost':                PUNCH_RED,
  'Wrong Number':        '#cb1928',
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
        bg: '#ecfdf5',
        color: '#047857',
        border: '#a7f3d0',
        dot: '#10b981',
        label: 'On Duty',
        icon: '🟢',
      };
    case 'ON_CALL':
      return {
        bg: '#eff6ff',
        color: '#1d4ed8',
        border: '#93c5fd',
        dot: '#3b82f6',
        label: 'On Call',
        icon: '🔵',
      };
    case 'ON_BREAK':
      return {
        bg: '#fffbeb',
        color: '#b45309',
        border: '#fde68a',
        dot: '#f59e0b',
        label: 'On Break',
        icon: '🟡',
      };
    case 'COMPLETED':
      return {
        bg: '#f0fdf4',
        color: '#15803d',
        border: '#bbf7d0',
        dot: '#22c55e',
        label: 'Completed',
        icon: '✅',
      };
    case 'ACTIVE':
      return {
        bg: '#f0fdfa',
        color: '#0f766e',
        border: '#99f6e4',
        dot: '#14b8a6',
        label: 'Active GPS',
        icon: '📍',
      };
    case 'NOT_STARTED':
      return {
        bg: '#f8fafc',
        color: '#64748b',
        border: '#e2e8f0',
        dot: '#94a3b8',
        label: 'Not Started',
        icon: '⚪',
      };
    case 'OFFLINE':
    default:
      return {
        bg: '#fef2f2',
        color: '#991b1b',
        border: '#fecaca',
        dot: '#ef4444',
        label: 'Offline',
        icon: '🔴',
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
  const [activityCallsDateFilter, setActivityCallsDateFilter] = useState('today'); // 'yesterday' | 'today' | 'tomorrow'
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

  // Pre-generate all date options for dropdown (flat continuous list with all dates at a time)
  const allDateOptions = useMemo(() => {
    const list = [];
    const now = new Date();

    // 1. All Dates
    list.push({ key: 'all', label: 'All Dates (Full History)' });

    // 2. Today
    const todayFormatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const todayDay = now.toLocaleDateString('en-US', { weekday: 'short' });
    list.push({ key: 'today', label: `Today — ${todayFormatted} (${todayDay})` });

    // 3. Yesterday
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestFormatted = yest.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const yestDay = yest.toLocaleDateString('en-US', { weekday: 'short' });
    list.push({ key: 'yesterday', label: `Yesterday — ${yestFormatted} (${yestDay})` });

    // 4. Tomorrow
    const tmrw = new Date(now);
    tmrw.setDate(tmrw.getDate() + 1);
    const tmrwFormatted = tmrw.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const tmrwDay = tmrw.toLocaleDateString('en-US', { weekday: 'short' });
    list.push({ key: 'tomorrow', label: `Tomorrow (Scheduled) — ${tmrwFormatted} (${tmrwDay})` });

    // 5. Consecutive past dates (from 2 days ago up to 60 days)
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

  // Employee Priorities workspace states
  const [activeQueueIndex, setActiveQueueIndex] = useState(null);
  const [workspaceLead, setWorkspaceLead] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [callStatus, setCallStatus] = useState('connected');
  const [callNote, setCallNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [nextFollowupNote, setNextFollowupNote] = useState('');
  const [demoDate, setDemoDate] = useState('');
  const [savingCall, setSavingCall] = useState(false);

  const isSuperAdmin = user?.role === 'admin';
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const isEmployee = !isAdmin;

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

  // Open Call Details Modal for a specific employee and timeframe / date
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

  // Call timer effect
  useEffect(() => {
    let interval = null;
    if (timerActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  // Load lead details when calling workspace opens
  useEffect(() => {
    if (activeQueueIndex !== null && stats?.startMyDayQueue?.[activeQueueIndex]) {
      const leadId = stats.startMyDayQueue[activeQueueIndex].lead._id;
      setWorkspaceLoading(true);
      setWorkspaceLead(null);
      setCallDuration(0);
      setTimerActive(true);
      setCallStatus('connected');
      setCallNote('');
      setNewStatus('');
      setNextFollowupDate('');
      setNextFollowupNote('');
      setDemoDate('');
      
      leadsAPI.getOne(leadId)
        .then(res => {
          setWorkspaceLead(res.data.lead);
          setNewStatus(res.data.lead.status);
        })
        .catch(err => console.error(err))
        .finally(() => setWorkspaceLoading(false));
    } else {
      setTimerActive(false);
    }
  }, [activeQueueIndex, stats]);

  const handleSaveCall = async () => {
    if (!workspaceLead) return;
    setSavingCall(true);
    try {
      await leadsAPI.logCall(workspaceLead._id, {
        duration: callDuration,
        callStatus,
        note: callNote
      });

      if (newStatus && newStatus !== workspaceLead.status) {
        const statusPayload = { status: newStatus };
        if (newStatus === 'Demo Scheduled') {
          statusPayload.demoScheduledDate = demoDate ? new Date(demoDate).toISOString() : new Date().toISOString();
        }
        await leadsAPI.updateStatus(workspaceLead._id, statusPayload);
      }

      if (nextFollowupDate) {
        await followupsAPI.create({
          lead: workspaceLead._id,
          scheduledAt: new Date(nextFollowupDate),
          note: nextFollowupNote || 'Scheduled from calling queue workspace'
        });
      }

      if (activeQueueIndex < (stats.startMyDayQueue.length - 1)) {
        setActiveQueueIndex(prev => prev + 1);
      } else {
        setActiveQueueIndex(null);
        refresh();
      }
    } catch (err) {
      console.error(err);
      alert('Error saving call outcome: ' + err.message);
    } finally {
      setSavingCall(false);
    }
  };

  // Filtered employees for the table
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
      <div className="spinner-gradient" style={{ width: 32, height: 32 }} />
    </div>
  );

  // -------------------------------------------------------------
  // EMPLOYEE PORTAL DASHBOARD VIEW
  // -------------------------------------------------------------
  const renderEmployeeDashboard = () => {
    return (
      <div className="dash-employee-shell" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: '100%', overflowX: 'hidden' }}>
        <EmployeeTrackingCard />
      </div>
    );
  };

  // -------------------------------------------------------------
  // ADMIN & SUPERADMIN DASHBOARD VIEW
  // -------------------------------------------------------------
  const renderAdminDashboard = () => {
    if (!adminStats) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: 12 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={CERULEAN} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div style={{ fontSize: 15, fontWeight: 600, color: OXFORD_NAVY }}>Analytics Loading or Unavailable</div>
          <button
            onClick={refresh}
            style={{ background: CERULEAN, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >Retry Refresh</button>
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
      <div className="dash-admin-shell" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: '100%', overflowX: 'hidden' }}>
        <style>{`
          @media (max-width: 768px) {
            .dash-grid-2 { grid-template-columns: 1fr !important; }
            .dash-kpis-4 { grid-template-columns: 1fr 1fr !important; }
          }
          @media (max-width: 480px) {
            .dash-kpis-4 { grid-template-columns: 1fr !important; }
          }
        `}</style>

        {/* Live Attendance & Location Tracking Widget */}
        <EmployeeTrackingCard />

        {/* Strategic KPIs Row */}
        <div className="dash-kpis-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <StatCard 
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            label="Total Leads In System" 
            value={stats?.total || 0} 
            sub="All-time database count" 
            bg="#edf8f8" 
            iconColor={CERULEAN}
          />
          <StatCard 
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
            label="Revenue Won (This Month)" 
            value={`₹${revenueWon.toLocaleString('en-IN')}`} 
            sub="Closed won pipeline" 
            bg="#f1faee" 
            iconColor={OXFORD_NAVY}
          />
          <StatCard 
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
            label="Lead-to-Won Success Rate" 
            value={`${leadConversionRate}%`} 
            sub="Conversion efficiency" 
            bg="#edf8f8" 
            iconColor={CERULEAN}
          />
          <StatCard 
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            label="Strategic Demos Scheduled" 
            value={actualDemosCombined} 
            sub="Scheduled this month" 
            bg="#f1faee" 
            iconColor={OXFORD_NAVY}
          />
        </div>

        {/* ── 1. Enhanced Employees Activity & Live Status Dashboard ──────────────── */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #a8dadc',
            borderRadius: 18,
            padding: '22px 24px',
            boxShadow: '0 4px 20px rgba(29, 53, 87, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Header Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ fontWeight: 700, color: OXFORD_NAVY, fontSize: 17, display: 'flex', alignItems: 'center', gap: 9 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={CERULEAN} strokeWidth="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                Employees Activity & Live Status
              </div>
              <div style={{ fontSize: 12, color: CERULEAN, marginTop: 3 }}>
                Real-time employee presence, live GPS location, attendance timings, and call performance
              </div>
            </div>

            {/* Filter and Control Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Search Box */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '6px 12px', minWidth: 200 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12.5, color: OXFORD_NAVY, width: '100%' }}
                />
                {activitySearch && (
                  <button onClick={() => setActivitySearch('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>✕</button>
                )}
              </div>

              {/* Calls Date Selector Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#edf8f8', border: '1px solid #a8dadc', borderRadius: 10, padding: '4px 10px' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: OXFORD_NAVY }}>Calls:</span>
                <select
                  value={activityCallsDateFilter}
                  onChange={(e) => setActivityCallsDateFilter(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: OXFORD_NAVY,
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="today">Today ({employeesActivityData.dates?.today?.day?.slice(0, 3) || 'Today'})</option>
                  <option value="yesterday">Yesterday ({employeesActivityData.dates?.yesterday?.day?.slice(0, 3) || 'Yest'})</option>
                  <option value="tomorrow">Tomorrow ({employeesActivityData.dates?.tomorrow?.day?.slice(0, 3) || 'Tmrw'})</option>
                </select>
              </div>

              {/* Active Badge */}
              <span style={{ background: '#ecfdf5', color: '#047857', fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '5px 12px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
                {activeEmployeesCount} Active / {totalEmployeesCount} Total
              </span>

              {/* Refresh Button */}
              <button
                onClick={refresh}
                title="Refresh Activity"
                style={{ background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: OXFORD_NAVY }}
              >
                🔄
              </button>
            </div>
          </div>

          {/* Table Container */}
          {filteredActivityEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: CERULEAN, fontSize: 13 }}>
              No employee records matching your search or activity filters.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: `1px solid ${BORDER}`, borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 980 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: `1.5px solid ${BORDER}`, color: OXFORD_NAVY, height: 40 }}>
                    <th style={{ textAlign: 'left', fontWeight: 700, padding: '10px 16px', width: '25%' }}>Employee</th>
                    <th style={{ textAlign: 'center', fontWeight: 700, padding: '10px 12px', width: '14%' }}>Live Status</th>
                    <th style={{ textAlign: 'center', fontWeight: 700, padding: '10px 12px', width: '15%' }}>Attendance</th>
                    <th style={{ textAlign: 'center', fontWeight: 700, padding: '10px 12px', width: '16%' }}>
                      Calls ({activityCallsDateFilter === 'today' ? 'Today' : activityCallsDateFilter === 'yesterday' ? 'Yesterday' : 'Tomorrow'})
                    </th>
                    <th style={{ textAlign: 'center', fontWeight: 700, padding: '10px 12px', width: '15%' }}>Last Call</th>
                    <th style={{ textAlign: 'center', fontWeight: 700, padding: '10px 16px', width: '15%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivityEmployees.map((emp) => {
                    const badge = getLiveStatusBadge(emp.liveStatus);
                    const callInfo = emp.calls?.[activityCallsDateFilter] || {};

                    return (
                      <tr
                        key={emp._id}
                        style={{
                          borderBottom: `1px solid ${BORDER}`,
                          height: 52,
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* 1. Employee Column: Clickable to view full details */}
                        <td
                          onClick={() => setDetailModalEmployee(emp)}
                          style={{ padding: '10px 16px', cursor: 'pointer' }}
                          title="Click to view complete employee profile & history"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                background: '#edf8f8',
                                color: OXFORD_NAVY,
                                fontSize: 13,
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1.5px solid #a8dadc',
                                flexShrink: 0,
                              }}
                            >
                              {emp.name?.[0]?.toUpperCase() || 'E'}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: OXFORD_NAVY, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {emp.name}
                                </span>
                                <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 10.5, fontWeight: 700, padding: '1px 6px', borderRadius: 6, border: '1px solid #e2e8f0', fontFamily: 'monospace' }}>
                                  {emp.employeeId}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: CERULEAN, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {emp.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Live Status Column: Clickable to view live telemetry */}
                        <td
                          onClick={() => setStatusModalEmployee(emp)}
                          style={{ textAlign: 'center', padding: '10px 12px', cursor: 'pointer' }}
                          title="Click to view status details & live telemetry"
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`,
                                padding: '4px 12px',
                                borderRadius: 14,
                                fontSize: 12,
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: badge.dot }} />
                              {badge.label}
                            </span>
                          </div>
                        </td>

                        {/* 3. Attendance Column */}
                        <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <span style={{ fontWeight: 700, color: emp.todayAttendance?.status !== 'NOT_STARTED' ? '#047857' : '#64748b', fontSize: 12 }}>
                              {emp.todayAttendance?.startTimeFormatted || 'Not Started'}
                            </span>
                            {emp.todayAttendance?.status !== 'NOT_STARTED' && (
                              <span style={{ fontSize: 11, color: CERULEAN, background: '#edf8f8', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>
                                ⚡ {emp.todayAttendance?.formattedActualWork || emp.todayAttendance?.durationFormatted}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Calls Column: Clickable to open Call Details modal */}
                        <td
                          onClick={() => openCallsModal(emp, activityCallsDateFilter)}
                          style={{ textAlign: 'center', padding: '10px 12px', cursor: 'pointer' }}
                          title="Click to view individual call records"
                        >
                          {activityCallsDateFilter === 'tomorrow' ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 9px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                              <span>📅</span> {callInfo.scheduledCount || 0} Scheduled
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                                📞 {callInfo.count || 0} Calls
                              </span>
                              {callInfo.totalDurationSec > 0 && (
                                <span style={{ fontSize: 10.5, color: '#64748b', fontFamily: 'monospace' }}>
                                  {callInfo.totalDurationFormatted}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 5. Last Call Column: Two-line layout (Time & Duration) */}
                        <td
                          onClick={() => openCallsModal(emp, activityCallsDateFilter)}
                          style={{ textAlign: 'center', padding: '10px 12px', cursor: 'pointer' }}
                          title="Click to view call record"
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <span style={{ fontWeight: 700, color: emp.calls?.today?.lastCallTime ? OXFORD_NAVY : '#94a3b8', fontSize: 12 }}>
                              {emp.calls?.today?.lastCallTimeFormatted || 'Never'}
                            </span>
                            {emp.calls?.today?.lastCallDurationSec > 0 && (
                              <span style={{ fontSize: 10.5, color: CERULEAN, fontFamily: 'monospace' }}>
                                Duration: {emp.calls.today.lastCallDurationFormatted}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Actions Column */}
                        <td style={{ textAlign: 'center', padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <button
                              onClick={() => setDetailModalEmployee(emp)}
                              title="View Employee Profile"
                              style={{
                                background: '#f8fafc',
                                color: '#334155',
                                border: `1px solid ${BORDER}`,
                                borderRadius: 7,
                                padding: '4px 8px',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              👤 Profile
                            </button>
                            <button
                              onClick={() => setMapModalEmployee(emp)}
                              title="View Live Location Map"
                              style={{
                                background: '#f0f9ff',
                                color: '#0284c7',
                                border: '1px solid #bae6fd',
                                borderRadius: 7,
                                padding: '4px 8px',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              🗺️ Map
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
        </div>

        {/* 2. Dashboard Visualizations (Graphs & Visual Progress) */}
        <div className="dash-grid-2" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
          
          {/* Conversion Funnel Visualization Chart */}
          <div style={{ background: '#ffffff', border: '1px solid #a8dadc', borderRadius: 16, padding: 22, boxShadow: '0 4px 18px rgba(29, 53, 87, 0.04)' }}>
            <div style={{ fontWeight: 600, color: OXFORD_NAVY, fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={CERULEAN} strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              Lead Pipeline Conversion Visualization
            </div>
            
            {funnelStages.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={funnelStages} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#edf8f8" vertical={false} />
                  <XAxis dataKey="stage" stroke={CERULEAN} fontSize={11} tickLine={false} />
                  <YAxis stroke={CERULEAN} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#ffffff', border: '1px solid #a8dadc', borderRadius: 8, fontSize: 12, color: OXFORD_NAVY }}
                  />
                  <Bar dataKey="count" fill={OXFORD_NAVY} radius={[4, 4, 0, 0]}>
                    {funnelStages.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.stage] || PALETTE_COLORS[index % PALETTE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: CERULEAN, fontSize: 13 }}>
                No conversion pipeline data available.
              </div>
            )}
          </div>

          {/* Campaign Performance & Team Productivity Leaderboard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: '#ffffff', border: '1px solid #a8dadc', borderRadius: 16, padding: 22, boxShadow: '0 4px 18px rgba(29, 53, 87, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontWeight: 600, color: OXFORD_NAVY, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                  🏆 Team Productivity Leaderboard
                </span>
                <div style={{ display: 'flex', background: '#edf8f8', padding: 2, borderRadius: 6, border: '1px solid #a8dadc' }}>
                  <button 
                    onClick={() => setLeaderboardTab('employees')}
                    style={{ border: 'none', background: leaderboardTab === 'employees' ? '#fff' : 'transparent', color: leaderboardTab === 'employees' ? OXFORD_NAVY : CERULEAN, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}
                  >
                    Employees
                  </button>
                  <button 
                    onClick={() => setLeaderboardTab('admins')}
                    style={{ border: 'none', background: leaderboardTab === 'admins' ? '#fff' : 'transparent', color: leaderboardTab === 'admins' ? OXFORD_NAVY : CERULEAN, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}
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
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #a8dadc', color: CERULEAN, height: 28 }}>
                        <th style={{ textAlign: 'left', fontWeight: 600, paddingBottom: 6 }}>User</th>
                        <th style={{ textAlign: 'center', fontWeight: 600, paddingBottom: 6 }}>Dials</th>
                        <th style={{ textAlign: 'right', fontWeight: 600, paddingBottom: 6 }}>Wins</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCallers.map(c => (
                        <tr 
                          key={c._id} 
                          onClick={() => openAnalysisModal(c.user?._id)}
                          style={{ borderBottom: '1px solid #edf8f8', height: 38, cursor: 'pointer' }}
                        >
                          <td style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38 }}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#edf8f8', color: OXFORD_NAVY, fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {c.user?.name?.[0]?.toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, color: OXFORD_NAVY, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.user?.name}</span>
                          </td>
                          <td style={{ textAlign: 'center', color: CERULEAN, fontWeight: 600 }}>{c.totalCalls}</td>
                          <td style={{ textAlign: 'right', color: OXFORD_NAVY, fontWeight: 600 }}>{c.sales || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: CERULEAN, fontSize: 12 }}>No activity logged yet.</div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* 3. Campaign Performance Visual Table */}
        <div style={{ background: '#ffffff', border: '1px solid #a8dadc', borderRadius: 16, padding: 22, boxShadow: '0 4px 18px rgba(29, 53, 87, 0.04)' }}>
          <div style={{ fontWeight: 600, color: OXFORD_NAVY, fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={CERULEAN} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Campaign Performance Analytics
          </div>

          {campaignStats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: CERULEAN }}>No campaign statistics available.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #a8dadc', color: CERULEAN, height: 32 }}>
                    <th style={{ textAlign: 'left', fontWeight: 600, paddingBottom: 8 }}>Campaign Name</th>
                    <th style={{ textAlign: 'center', fontWeight: 600, paddingBottom: 8 }}>Total Leads</th>
                    <th style={{ textAlign: 'center', fontWeight: 600, paddingBottom: 8 }}>Called %</th>
                    <th style={{ textAlign: 'center', fontWeight: 600, paddingBottom: 8 }}>Won</th>
                    <th style={{ textAlign: 'center', fontWeight: 600, paddingBottom: 8 }}>Lost</th>
                    <th style={{ textAlign: 'right', fontWeight: 600, paddingBottom: 8 }}>Conv. Rate %</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignStats.map(c => {
                    const callPct = c.totalLeads > 0 ? Math.round((c.called / c.totalLeads) * 100) : 0;
                    const convPct = c.totalLeads > 0 ? Math.round((c.won / c.totalLeads) * 100) : 0;
                    return (
                      <tr 
                        key={c._id || 'unassigned'} 
                        onClick={() => c._id && navigate('/campaigns/' + c._id)}
                        style={{ borderBottom: '1px solid #edf8f8', height: 40, cursor: c._id ? 'pointer' : 'default' }}
                      >
                        <td style={{ padding: '8px 0', fontWeight: 600, color: c._id ? OXFORD_NAVY : CERULEAN }}>
                          {c.name}
                        </td>
                        <td style={{ textAlign: 'center', color: OXFORD_NAVY }}>{c.totalLeads}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ background: '#edf8f8', color: CERULEAN, padding: '2px 8px', borderRadius: 8, fontSize: 11.5, fontWeight: 600 }}>
                            {callPct}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', color: OXFORD_NAVY, fontWeight: 600 }}>{c.won}</td>
                        <td style={{ textAlign: 'center', color: PUNCH_RED, fontWeight: 600 }}>{c.lost}</td>
                        <td style={{ textAlign: 'right', color: OXFORD_NAVY, fontWeight: 600 }}>{convPct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    );
  };

  if (fetchError) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: PUNCH_RED }}>Dashboard Load Notice: {fetchError}</div>
        <button onClick={refresh} style={{ background: CERULEAN, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dash-outer-shell" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #a8dadc', paddingBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: OXFORD_NAVY, display: 'flex', alignItems: 'center', gap: 8 }}>
            {isSuperAdmin ? 'Admin Dashboard' : isAdmin ? 'Manager Dashboard' : 'Employee Portal'}
            <button
              onClick={refresh}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: CERULEAN, padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            </button>
          </div>
          <div style={{ fontSize: 12.5, color: CERULEAN, marginTop: 2 }}>
            Welcome back, {user?.name}!
          </div>
        </div>
      </div>

      {/* Render Role specific layout */}
      {isAdmin ? renderAdminDashboard() : renderEmployeeDashboard()}

      {/* ── MODAL 1: Complete Employee Details Modal ───────────────────────── */}
      {detailModalEmployee && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setDetailModalEmployee(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 780,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              border: `1px solid ${BORDER}`,
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    fontSize: 18,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #bae6fd',
                  }}
                >
                  {detailModalEmployee.name?.[0]?.toUpperCase() || 'E'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: OXFORD_NAVY }}>{detailModalEmployee.name}</span>
                    <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontFamily: 'monospace' }}>
                      {detailModalEmployee.employeeId}
                    </span>
                    <span style={{ background: detailModalEmployee.isActive ? '#ecfdf5' : '#fef2f2', color: detailModalEmployee.isActive ? '#047857' : '#991b1b', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, border: `1px solid ${detailModalEmployee.isActive ? '#a7f3d0' : '#fecaca'}` }}>
                      {detailModalEmployee.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: CERULEAN, marginTop: 2 }}>{detailModalEmployee.email} • {detailModalEmployee.role?.toUpperCase()}</div>
                </div>
              </div>
              <button onClick={() => setDetailModalEmployee(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Section 1: Attendance Timings (Today & Yesterday) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                
                {/* Today's Attendance Card */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: 16 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: '#15803d', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>🟢 Today's Attendance</span>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{detailModalEmployee.todayAttendance?.day}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4b5563' }}>Date:</span>
                      <span style={{ fontWeight: 700, color: OXFORD_NAVY }}>{formatDateDisplay(detailModalEmployee.todayAttendance?.date)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4b5563' }}>Start Time:</span>
                      <span style={{ fontWeight: 700, color: '#047857' }}>{detailModalEmployee.todayAttendance?.startTimeFormatted}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4b5563' }}>Stop / Leave:</span>
                      <span style={{ fontWeight: 700, color: OXFORD_NAVY }}>{detailModalEmployee.todayAttendance?.endTimeFormatted}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4b5563' }}>Total Duration:</span>
                      <span style={{ fontWeight: 700, color: OXFORD_NAVY, fontFamily: 'monospace' }}>{detailModalEmployee.todayAttendance?.durationFormatted}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4b5563' }}>Total Break Time:</span>
                      <span style={{ fontWeight: 700, color: '#b45309', fontFamily: 'monospace' }}>{detailModalEmployee.todayAttendance?.formattedBreakDuration} ({detailModalEmployee.todayAttendance?.breakCount || 0} breaks)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #dcfce7', paddingTop: 6 }}>
                      <span style={{ color: '#15803d', fontWeight: 700 }}>Actual Work:</span>
                      <span style={{ fontWeight: 800, color: '#15803d', fontFamily: 'monospace' }}>{detailModalEmployee.todayAttendance?.formattedActualWork}</span>
                    </div>
                  </div>
                </div>

                {/* Yesterday's Attendance Card */}
                <div style={{ background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>⏱️ Yesterday's Attendance</span>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{detailModalEmployee.yesterdayAttendance?.day || 'Yesterday'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4b5563' }}>Date:</span>
                      <span style={{ fontWeight: 700, color: OXFORD_NAVY }}>{formatDateDisplay(detailModalEmployee.yesterdayAttendance?.date)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4b5563' }}>Start Time:</span>
                      <span style={{ fontWeight: 700, color: OXFORD_NAVY }}>{detailModalEmployee.yesterdayAttendance?.startTimeFormatted}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4b5563' }}>Logout Time:</span>
                      <span style={{ fontWeight: 700, color: OXFORD_NAVY }}>{detailModalEmployee.yesterdayAttendance?.endTimeFormatted}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4b5563' }}>Total Duration:</span>
                      <span style={{ fontWeight: 700, color: OXFORD_NAVY, fontFamily: 'monospace' }}>{detailModalEmployee.yesterdayAttendance?.durationFormatted}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4b5563' }}>Total Break Time:</span>
                      <span style={{ fontWeight: 700, color: '#b45309', fontFamily: 'monospace' }}>{detailModalEmployee.yesterdayAttendance?.formattedBreakDuration}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${BORDER}`, paddingTop: 6 }}>
                      <span style={{ color: '#334155', fontWeight: 700 }}>Actual Work:</span>
                      <span style={{ fontWeight: 800, color: '#334155', fontFamily: 'monospace' }}>{detailModalEmployee.yesterdayAttendance?.formattedActualWork}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Live GPS Location & Map Access */}
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📍</span> Live Location Status
                  </div>
                  <button
                    onClick={() => {
                      const target = detailModalEmployee;
                      setDetailModalEmployee(null);
                      setMapModalEmployee(target);
                    }}
                    style={{ background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    🗺️ View Live Location on Map
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 12.5 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>GPS Sharing Status</div>
                    <div style={{ fontWeight: 700, color: detailModalEmployee.location?.isLive ? '#047857' : '#991b1b' }}>
                      {detailModalEmployee.location?.isLive ? '🟢 Active GPS Location Sharing' : '🔴 Location Inactive / Offline'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Current Address</div>
                    <div style={{ fontWeight: 700, color: OXFORD_NAVY }}>{detailModalEmployee.location?.formattedAddress || 'Location unavailable'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Speed & Accuracy</div>
                    <div style={{ fontWeight: 700, color: OXFORD_NAVY }}>
                      {detailModalEmployee.location?.speed || 0} km/h • Accuracy: ±{Math.round(detailModalEmployee.location?.accuracy || 0)}m
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Last Updated</div>
                    <div style={{ fontWeight: 700, color: OXFORD_NAVY }}>
                      {detailModalEmployee.location?.lastUpdated ? new Date(detailModalEmployee.location.lastUpdated).toLocaleTimeString() : 'Never'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Call Activity Summary */}
              <div style={{ background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: OXFORD_NAVY, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📞</span> Call Activity Summary
                  </div>
                  <button
                    onClick={() => {
                      const target = detailModalEmployee;
                      setDetailModalEmployee(null);
                      openCallsModal(target, 'today');
                    }}
                    style={{ background: '#f8fafc', color: '#0284c7', border: '1px solid #bae6fd', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    View Individual Call Records →
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, textAlign: 'center' }}>
                  <div style={{ background: '#f8fafc', padding: '10px 8px', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Today's Calls</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: OXFORD_NAVY, marginTop: 2 }}>{detailModalEmployee.calls?.today?.count || 0}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px 8px', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Today's Duration</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: OXFORD_NAVY, marginTop: 2, fontFamily: 'monospace' }}>{detailModalEmployee.calls?.today?.totalDurationFormatted || '00m 00s'}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px 8px', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Last Call Time</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: OXFORD_NAVY, marginTop: 2 }}>{detailModalEmployee.calls?.today?.lastCallTimeFormatted || 'Never'}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px 8px', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Last Call Duration</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: OXFORD_NAVY, marginTop: 2, fontFamily: 'monospace' }}>{detailModalEmployee.calls?.today?.lastCallDurationFormatted || '—'}</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Live Status & Telemetry Modal ─────────────────────────── */}
      {statusModalEmployee && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setStatusModalEmployee(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 540,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              border: `1px solid ${BORDER}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: OXFORD_NAVY }}>{statusModalEmployee.name} — Live Status</div>
                  <div style={{ fontSize: 11.5, color: CERULEAN }}>{statusModalEmployee.employeeId} • {statusModalEmployee.email}</div>
                </div>
              </div>
              <button onClick={() => setStatusModalEmployee(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            {/* Current Status Pill Highlight */}
            {(() => {
              const badge = getLiveStatusBadge(statusModalEmployee.liveStatus);
              return (
                <div style={{ background: badge.bg, border: `1.5px solid ${badge.border}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: badge.color, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Current Operational Status</div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: badge.color, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: badge.dot }} />
                      {badge.label}
                    </div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '5px 12px', borderRadius: 8, border: `1px solid ${badge.border}`, fontSize: 12, fontWeight: 700, color: badge.color }}>
                    {badge.icon} Live
                  </div>
                </div>
              );
            })()}

            {/* Attendance Timings & Location Telemetry Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 13, background: '#f8fafc', padding: 16, borderRadius: 14, border: `1px solid ${BORDER}` }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Today's Login Time</div>
                <div style={{ fontWeight: 800, color: statusModalEmployee.todayAttendance?.startTimeFormatted !== 'Not Started' ? '#047857' : '#64748b', fontSize: 14, marginTop: 2 }}>
                  {statusModalEmployee.todayAttendance?.startTimeFormatted || 'Not Started'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Yesterday's Logout Time</div>
                <div style={{ fontWeight: 800, color: statusModalEmployee.yesterdayAttendance?.endTimeFormatted && statusModalEmployee.yesterdayAttendance.endTimeFormatted !== 'No Record' ? OXFORD_NAVY : '#64748b', fontSize: 14, marginTop: 2 }}>
                  {statusModalEmployee.yesterdayAttendance?.endTimeFormatted || 'No Record'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Location Sharing Status</div>
                <div style={{ fontWeight: 700, color: statusModalEmployee.location?.isLive ? '#047857' : '#991b1b', marginTop: 2 }}>
                  {statusModalEmployee.location?.isLive ? '🟢 Active GPS Sharing' : '🔴 Inactive / Offline'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Last Location Ping</div>
                <div style={{ fontWeight: 700, color: OXFORD_NAVY, marginTop: 2 }}>
                  {statusModalEmployee.location?.lastUpdated ? new Date(statusModalEmployee.location.lastUpdated).toLocaleTimeString() : 'Never'}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Current Location Address</div>
                <div style={{ fontWeight: 700, color: OXFORD_NAVY, marginTop: 3, fontSize: 13.5 }}>
                  {statusModalEmployee.location?.formattedAddress || 'Location unavailable'}
                </div>
              </div>
            </div>

            {/* View Live Location on Map Button */}
            <button
              onClick={() => {
                const target = statusModalEmployee;
                setStatusModalEmployee(null);
                setMapModalEmployee(target);
              }}
              style={{
                background: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '12px 18px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                transition: 'all 0.15s',
              }}
            >
              🗺️ View Live Location on Map
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Live Location Map Modal ───────────────────────────────── */}
      {mapModalEmployee && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setMapModalEmployee(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 900,
              height: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.3)',
              border: `1px solid ${BORDER}`,
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 22px', borderBottom: `1px solid ${BORDER}`, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>🗺️</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: OXFORD_NAVY }}>
                    Live Location — {mapModalEmployee.name} ({mapModalEmployee.employeeId})
                  </div>
                  <div style={{ fontSize: 12, color: CERULEAN }}>
                    {mapModalEmployee.location?.formattedAddress || 'Location tracking active'}
                  </div>
                </div>
              </div>
              <button onClick={() => setMapModalEmployee(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
              <LiveMap
                employees={[mapModalEmployee]}
                selectedEmployee={mapModalEmployee}
                onSelectEmployee={() => {}}
                officeConfig={employeesActivityData.office}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: Individual Call Records & Activity Modal ──────────────── */}
      {callsModalEmployee && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setCallsModalEmployee(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 820,
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              border: `1px solid ${BORDER}`,
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '16px 22px', borderBottom: `1px solid ${BORDER}`, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#edf8f8', color: OXFORD_NAVY, fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {callsModalEmployee.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: OXFORD_NAVY }}>
                    Call Details — {callsModalEmployee.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: CERULEAN }}>{callsModalEmployee.employeeId} • {callsModalEmployee.email}</div>
                </div>
              </div>

              {/* Controls: Yesterday / Today / Tomorrow buttons + Unified Dates dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* Segmented Quick Pills: Yesterday, Today, Tomorrow */}
                <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: 8, padding: 3, gap: 2 }}>
                  {[
                    { key: 'yesterday', label: 'Yesterday' },
                    { key: 'today', label: 'Today' },
                    { key: 'tomorrow', label: 'Tomorrow (Scheduled)' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => switchCallsModalPeriod(t.key)}
                      style={{
                        border: 'none',
                        background: callsModalPeriod === t.key ? '#ffffff' : 'transparent',
                        color: callsModalPeriod === t.key ? OXFORD_NAVY : '#64748b',
                        fontSize: 12,
                        fontWeight: callsModalPeriod === t.key ? 700 : 600,
                        padding: '6px 12px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        boxShadow: callsModalPeriod === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Unified Dates Dropdown (All dates at a time, without separate optgroups) */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#ffffff',
                    border: `1.5px solid ${callsModalPeriod === 'all' || callsModalPeriod === 'custom' ? '#457b9d' : '#cbd5e1'}`,
                    borderRadius: 8,
                    padding: '4px 10px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: 13, color: '#457b9d' }}>📅</span>
                  <select
                    value={callsModalPeriod === 'custom' ? callsModalCustomDate : callsModalPeriod}
                    onChange={(e) => handleCallsDateDropdownChange(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: OXFORD_NAVY,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none',
                      minWidth: 160,
                      maxWidth: 240,
                    }}
                    title="Select any date from history or full history"
                  >
                    {allDateOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setCallsModalEmployee(null)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '50%',
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#64748b',
                    marginLeft: 2,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                    e.currentTarget.style.color = OXFORD_NAVY;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.color = '#64748b';
                  }}
                  title="Close Modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Summary Metrics Bar */}
            {callsModalData && (
              <div style={{ padding: '12px 22px', background: '#edf8f8', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <span style={{ color: '#64748b' }}>Date: </span>
                  <span style={{ fontWeight: 800, color: OXFORD_NAVY }}>
                    {callsModalPeriod === 'all' || callsModalData.period === 'all'
                      ? 'All Dates (Full History)'
                      : `${formatDateDisplay(callsModalData.targetDate)} ${callsModalData.day ? `(${callsModalData.day})` : ''}`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Total Calls: </span>
                    <span style={{ fontWeight: 800, color: OXFORD_NAVY }}>{callsModalData.totalCalls}</span>
                  </div>
                  {!callsModalData.isTomorrow && (
                    <div>
                      <span style={{ color: '#64748b' }}>Connected Duration: </span>
                      <span style={{ fontWeight: 800, color: '#047857', fontFamily: 'monospace' }}>{callsModalData.totalConnectedDurationFormatted}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Body: Call Records Table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
              {callsModalLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: CERULEAN }}>Loading call records...</div>
              ) : !callsModalData || callsModalData.calls?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: 13 }}>
                  {callsModalPeriod === 'tomorrow' ? 'No scheduled calls or tasks planned for tomorrow.' : 'No call activity records found for this date.'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `1.5px solid ${BORDER}`, color: OXFORD_NAVY, height: 34 }}>
                      <th style={{ textAlign: 'left', fontWeight: 700, padding: '8px 10px' }}>
                        {callsModalPeriod === 'all' || callsModalData?.period === 'all' ? 'Date & Time' : 'Time'}
                      </th>
                      <th style={{ textAlign: 'left', fontWeight: 700, padding: '8px 10px' }}>Contact</th>
                      <th style={{ textAlign: 'left', fontWeight: 700, padding: '8px 10px' }}>Phone</th>
                      <th style={{ textAlign: 'center', fontWeight: 700, padding: '8px 10px' }}>Status</th>
                      <th style={{ textAlign: 'right', fontWeight: 700, padding: '8px 10px' }}>Duration</th>
                      <th style={{ textAlign: 'left', fontWeight: 700, padding: '8px 10px' }}>Notes / Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {callsModalData.calls.map((c, idx) => (
                      <tr key={c.id || idx} style={{ borderBottom: `1px solid ${BORDER}`, height: 42 }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: OXFORD_NAVY }}>
                          {(callsModalPeriod === 'all' || callsModalData?.period === 'all') && (
                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{formatDateDisplay(c.callDate)}</div>
                          )}
                          <div>{c.callTime}</div>
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: OXFORD_NAVY }}>{c.contactName}</td>
                        <td style={{ padding: '8px 10px', color: CERULEAN, fontFamily: 'monospace' }}>{c.contactNumber}</td>
                        <td style={{ textAlign: 'center', padding: '8px 10px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 700,
                              background: c.rawCallStatus === 'connected' || c.callStatus === 'Scheduled' ? '#ecfdf5' : '#fef2f2',
                              color: c.rawCallStatus === 'connected' || c.callStatus === 'Scheduled' ? '#047857' : '#991b1b',
                            }}
                          >
                            {c.callStatus}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700, color: OXFORD_NAVY }}>
                          {c.callDurationFormatted}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#64748b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.notes || c.callType}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legacy User Performance Modal */}
      {selectedUserId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(29, 53, 87, 0.4)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
        }} onClick={closeAnalysisModal}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '85vh',
            display: 'flex', flexDirection: 'column', padding: 20
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #a8dadc', paddingBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: OXFORD_NAVY }}>Employee Performance Details</span>
              <button onClick={closeAnalysisModal} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: CERULEAN }}>✕</button>
            </div>
            <div style={{ padding: '16px 0', flex: 1, overflowY: 'auto' }}>
              {modalLoading ? (
                <div style={{ textAlign: 'center', color: CERULEAN, padding: '30px 0' }}>Loading user details...</div>
              ) : userAnalysisData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div style={{ background: '#edf8f8', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: CERULEAN }}>Total Calls</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: OXFORD_NAVY }}>{userAnalysisData.stats?.totalCalls || 0}</div>
                    </div>
                    <div style={{ background: '#edf8f8', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: CERULEAN }}>Duration</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: OXFORD_NAVY }}>{fmtDuration(userAnalysisData.stats?.totalDuration)}</div>
                    </div>
                    <div style={{ background: '#edf8f8', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: CERULEAN }}>Connect %</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: OXFORD_NAVY }}>
                        {userAnalysisData.stats?.totalCalls > 0 ? Math.round((userAnalysisData.stats?.connected / userAnalysisData.stats?.totalCalls) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                </div>
              ) : <div style={{ color: CERULEAN }}>No analysis data available.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}