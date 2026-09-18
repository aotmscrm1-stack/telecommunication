import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadsAPI, followupsAPI, reportsAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import StatCard from '../components/dashboard/StatCard';
import EmployeeTrackingCard from '../components/tracking/EmployeeTrackingCard';

// User Color Palette: Oxford Navy (#1d3557), Cerulean (#457b9d), Frosted Blue (#a8dadc), Honeydew (#f1faee), Punch Red (#e63946)
const OXFORD_NAVY  = '#1d3557';
const CERULEAN     = '#457b9d';
const FROSTED_BLUE = '#a8dadc';
const HONEYDEW      = '#f1faee';
const PUNCH_RED     = '#e63946';

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
  if (!sec) return '0s';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [callers, setCallers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

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

  const fetchData = async () => {
    setFetchError(null);
    try {
      if (isAdmin || isSuperAdmin) {
        const [statsRes, adminRes, usersRes] = await Promise.all([
          leadsAPI.getStats().catch(e => { throw new Error(`leads/stats API: ${e.response?.data?.message || e.message}`); }),
          reportsAPI.adminAnalysis().catch(e => { console.warn('admin-analysis API unavailable:', e.message); return { data: null }; }),
          usersAPI.getAll().catch(e => { throw new Error(`users API: ${e.response?.data?.message || e.message}`); })
        ]);
        setStats(statsRes.data);
        if (adminRes.data) setAdminStats(adminRes.data);
        setCallers(usersRes.data.users?.filter(u => u.role === 'employee' || u.role === 'caller') || []);
      } else {
        const statsRes = await leadsAPI.getStats().catch(e => { throw new Error(`leads/stats API: ${e.response?.data?.message || e.message}`); });
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error(err);
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

    const liveCallers = adminStats.teamStatus || [];
    const totalCalls = liveCallers.reduce((sum, c) => sum + c.callsToday, 0);
    const revenueWon = adminStats.revenueWon || 0;
    const funnelStages = adminStats.conversionFunnel || [];
    const campaignStats = adminStats.campaignPerformance || [];

    const actualDemosCombined = adminStats?.demosScheduledThisMonth || 0;
    const targetDemosGoal = 500;
    const goalPercentage = Math.min(100, Math.round((actualDemosCombined / targetDemosGoal) * 100));

    const totalLeadsCount = stats?.total || 0;
    const wonCount = funnelStages.find(f => f.stage === 'Won')?.count || 0;
    const leadConversionRate = totalLeadsCount > 0 ? Math.round((wonCount / totalLeadsCount) * 100) : 0;

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

        {/* 1. /Dashboard Employees Activity & Live Status (UI UX Change) */}
        <div style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f1faee 100%)', border: '1px solid #a8dadc', borderRadius: 16, padding: '20px 24px', boxShadow: '0 4px 18px rgba(29, 53, 87, 0.05)' }}>
          <div style={{ fontWeight: 600, color: OXFORD_NAVY, fontSize: 17, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={CERULEAN} strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              Employees Activity & Live Status
            </div>
            <span style={{ background: '#edf8f8', color: OXFORD_NAVY, fontSize: 12.5, fontWeight: 600, borderRadius: 20, padding: '4px 14px', border: '1px solid #a8dadc' }}>
              {liveCallers.length} Employee{liveCallers.length !== 1 ? 's' : ''} Active
            </span>
          </div>

          {liveCallers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: CERULEAN, fontSize: 13 }}>No active employee activity recorded today.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: '#f1faee', borderBottom: '1px solid #a8dadc', color: OXFORD_NAVY, height: 38 }}>
                    <th style={{ textAlign: 'left', fontWeight: 600, padding: '10px 14px' }}>Employee Name</th>
                    <th style={{ textAlign: 'center', fontWeight: 600, padding: '10px 14px' }}>Live Status</th>
                    <th style={{ textAlign: 'center', fontWeight: 600, padding: '10px 14px' }}>Calls Logged Today</th>
                    <th style={{ textAlign: 'right', fontWeight: 600, padding: '10px 14px' }}>Last Call Time</th>
                  </tr>
                </thead>
                <tbody>
                  {liveCallers.map(caller => (
                    <tr 
                      key={caller.user?._id}
                      onClick={() => openAnalysisModal(caller.user?._id)}
                      style={{ borderBottom: '1px solid #edf8f8', height: 48, cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f1faee'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 14 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#a8dadc', color: OXFORD_NAVY, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {caller.user?.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <span style={{ color: OXFORD_NAVY, fontWeight: 600 }}>{caller.user?.name}</span>
                          <div style={{ fontSize: 11.5, color: CERULEAN }}>{caller.user?.email}</div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: caller.isActive ? OXFORD_NAVY : '#88b1cb' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: caller.isActive ? CERULEAN : '#cbd5e1' }} />
                          {caller.isActive ? 'Active Now' : 'Idle'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: OXFORD_NAVY }}>
                        {caller.callsToday}
                      </td>
                      <td style={{ textAlign: 'right', color: CERULEAN, paddingRight: 14 }}>
                        {caller.lastCallTime ? (
                          <span>
                            {new Date(caller.lastCallTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : 'Never'}
                      </td>
                    </tr>
                  ))}
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

      {/* User Performance Modal */}
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