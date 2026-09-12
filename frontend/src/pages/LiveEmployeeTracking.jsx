import { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { trackingAPI } from '../services/api';
import trackingSocket from '../services/trackingSocketClient';
import LiveMap from '../components/tracking/LiveMap';

const GRADIENT = 'var(--btn-gradient, linear-gradient(90deg, #ffb37c 0%, #38bdf8 100%))';

export default function LiveEmployeeTracking() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'admin';
  const isAdmin = user?.role === 'manager' || isSuperAdmin;

  // Role Protection Guard: Callers cannot access the Admin Live Tracking Dashboard
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const [employees, setEmployees] = useState([]);
  const [officeConfig, setOfficeConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, AT_OFFICE, MOVING, STOPPED, OFFLINE
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [followEmployee, setFollowEmployee] = useState(false);
  const [showRouteTrail, setShowRouteTrail] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const [syncTimerText, setSyncTimerText] = useState('Just now');

  // History mode state
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [historyPoints, setHistoryPoints] = useState([]);
  const [historyBounds, setHistoryBounds] = useState(null);
  const [historyDistanceKm, setHistoryDistanceKm] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDateFilter, setHistoryDateFilter] = useState('today');

  // Fetch initial employee list and office configuration
  const fetchEmployeesAndConfig = useCallback(async () => {
    try {
      setLoading(true);
      const [empRes, configRes] = await Promise.allSettled([
        trackingAPI.getEmployees(),
        trackingAPI.getConfig(),
      ]);

      if (empRes.status === 'fulfilled') {
        const list = empRes.value.data?.employees || [];
        setEmployees(list);
        setLastSyncTime(Date.now());

        if (!selectedEmployeeId && list.length > 0) {
          const activeOne = list.find(
            (e) =>
              e.location?.trackingStatus === 'MOVING' ||
              e.location?.trackingStatus === 'AT_OFFICE' ||
              e.location?.trackingStatus === 'STOPPED'
          );
          if (activeOne) setSelectedEmployeeId(activeOne._id || activeOne.employeeId);
        }
      }

      if (configRes.status === 'fulfilled') {
        setOfficeConfig(configRes.value.data?.office || null);
      }
    } catch (err) {
      console.error('[Tracking Fetch Error]:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    fetchEmployeesAndConfig();
  }, []);

  // ── Relative Sync Timer (e.g. "Last updated: 3 seconds ago") ───────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const diffSec = Math.floor((Date.now() - lastSyncTime) / 1000);
      if (diffSec < 3) setSyncTimerText('Just now');
      else if (diffSec < 60) setSyncTimerText(`${diffSec} seconds ago`);
      else setSyncTimerText(`${Math.floor(diffSec / 60)}m ago`);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastSyncTime]);

  // ── Real-Time Socket.IO Handlers ───────────────────────────────────────────
  useEffect(() => {
    const socket = trackingSocket.connect();
    if (socket) {
      setSocketConnected(socket.connected);
    }

    const unsubConn = trackingSocket.on('connect', () => {
      setSocketConnected(true);
      trackingSocket.subscribeAdmin().catch(() => {});
    });

    const unsubDisconn = () => {
      setSocketConnected(false);
    };
    trackingSocket.on('disconnect', unsubDisconn);
    trackingSocket.on('error', unsubDisconn);

    // Live position packet arrived from an employee
    const unsubLocation = trackingSocket.on('admin:employee:location', (locPacket) => {
      setLastSyncTime(Date.now());
      setEmployees((prev) => {
        const index = prev.findIndex((e) => (e._id || e.employeeId) === locPacket.employeeId);
        if (index === -1) {
          return [
            ...prev,
            {
              _id: locPacket.employeeId,
              name: locPacket.name,
              email: locPacket.email,
              role: locPacket.role,
              avatar: locPacket.avatar,
              phone: locPacket.phone,
              location: locPacket,
            },
          ];
        }
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          location: {
            ...updated[index].location,
            ...locPacket,
          },
        };
        return updated;
      });
    });

    // Status transition arrived (AT_OFFICE, LEAVING_OFFICE, MOVING, STOPPED, OFFLINE)
    const unsubStatus = trackingSocket.on('admin:employee:status', (statusPacket) => {
      setLastSyncTime(Date.now());
      setEmployees((prev) => {
        return prev.map((emp) => {
          if ((emp._id || emp.employeeId) === statusPacket.employeeId) {
            return {
              ...emp,
              location: {
                ...(emp.location || {}),
                trackingStatus: statusPacket.trackingStatus,
                lastUpdated: statusPacket.lastUpdated,
                speed: statusPacket.trackingStatus === 'OFFLINE' || statusPacket.trackingStatus === 'AT_OFFICE' ? 0 : emp.location?.speed || 0,
              },
            };
          }
          return emp;
        });
      });
    });

    return () => {
      unsubConn();
      trackingSocket.off('disconnect', unsubDisconn);
      trackingSocket.off('error', unsubDisconn);
      unsubLocation();
      unsubStatus();
    };
  }, []);

  // ── Historical Route Query ─────────────────────────────────────────────────
  const loadEmployeeHistory = async (empId, dateRange = 'today') => {
    if (!empId) return;
    setHistoryLoading(true);
    setIsHistoryMode(true);
    setSelectedEmployeeId(empId);

    let fromDate = new Date();
    let toDate = new Date();

    if (dateRange === 'today') {
      fromDate.setHours(0, 0, 0, 0);
    } else if (dateRange === 'yesterday') {
      fromDate.setDate(fromDate.getDate() - 1);
      fromDate.setHours(0, 0, 0, 0);
      toDate.setDate(toDate.getDate() - 1);
      toDate.setHours(23, 59, 59, 999);
    } else if (dateRange === 'last7days') {
      fromDate.setDate(fromDate.getDate() - 7);
      fromDate.setHours(0, 0, 0, 0);
    }

    try {
      const res = await trackingAPI.getHistory(empId, {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      });
      setHistoryPoints(res.data?.points || []);
      setHistoryBounds(res.data?.bounds || null);
      setHistoryDistanceKm(res.data?.distanceKm || 0);
    } catch (err) {
      console.error('[History Load Error]:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const exitHistoryMode = () => {
    setIsHistoryMode(false);
    setHistoryPoints([]);
    setHistoryBounds(null);
  };

  // ── Filter & Search Logic ──────────────────────────────────────────────────
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const nameMatch = (emp.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const emailMatch = (emp.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSearch = nameMatch || emailMatch;

      const status = emp.location?.trackingStatus || 'OFFLINE';
      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        matchesStatus = status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [employees, searchQuery, statusFilter]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { ALL: employees.length, AT_OFFICE: 0, MOVING: 0, STOPPED: 0, OFFLINE: 0 };
    employees.forEach((e) => {
      const st = e.location?.trackingStatus || 'OFFLINE';
      if (counts[st] !== undefined) counts[st]++;
      else if (st === 'LEAVING_OFFICE') counts.MOVING++;
    });
    return counts;
  }, [employees]);

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => (e._id || e.employeeId) === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'Never';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 4) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  };

  const formatStoppedDuration = (stoppedAt) => {
    if (!stoppedAt) return 'Just now';
    const diffMs = Date.now() - new Date(stoppedAt).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '< 1 min';
    if (diffMin < 60) return `${diffMin} min`;
    return `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
  };

  const formatTimeOnly = (dateStr) => {
    if (!dateStr) return '09:30 AM';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getHeadingDirectionLabel = (deg) => {
    if (deg == null) return 'North';
    const d = (deg + 360) % 360;
    if (d >= 337.5 || d < 22.5) return 'North ↑';
    if (d >= 22.5 && d < 67.5) return 'North-East ↗';
    if (d >= 67.5 && d < 112.5) return 'East →';
    if (d >= 112.5 && d < 157.5) return 'South-East ↘';
    if (d >= 157.5 && d < 202.5) return 'South ↓';
    if (d >= 202.5 && d < 247.5) return 'South-West ↙';
    if (d >= 247.5 && d < 292.5) return 'West ←';
    return 'North-West ↖';
  };

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* ── 1. Top Header Bar (Blinkit Style) ───────────────────────────────── */}
      <div
        style={{
          height: 60,
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {/* Left: Title + Real-time Socket Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7',
                fontSize: 18,
              }}
            >
              🏢
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Live Employee & Field Tracking
              </h2>
            </div>
          </div>

          {/* Real-time Socket Status Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 9px',
              borderRadius: 20,
              background: socketConnected ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${socketConnected ? '#a7f3d0' : '#fecaca'}`,
              color: socketConnected ? '#065f46' : '#991b1b',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: socketConnected ? '#10b981' : '#ef4444',
                boxShadow: socketConnected ? '0 0 0 2px rgba(16, 185, 129, 0.3)' : 'none',
              }}
            />
            {socketConnected ? 'LIVE' : 'Reconnecting...'}
          </div>

          {/* KPI Summary Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                color: '#475569',
              }}
            >
              Total: <b>{statusCounts.ALL}</b>
            </div>
            <div
              style={{
                background: '#e0f2fe',
                border: '1px solid #bae6fd',
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                color: '#0369a1',
              }}
            >
              🏢 {statusCounts.AT_OFFICE} At Office
            </div>
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                color: '#059669',
              }}
            >
              🏍️ {statusCounts.MOVING} Moving
            </div>
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                color: '#d97706',
              }}
            >
              🟡 {statusCounts.STOPPED} Stopped
            </div>
            <div
              style={{
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                color: '#64748b',
              }}
            >
              🔴 {statusCounts.OFFLINE} Offline
            </div>
          </div>
        </div>

        {/* Right: Sync Status & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500 }}>
            Last updated: <b style={{ color: '#0f172a' }}>{syncTimerText}</b>
          </span>

          {isHistoryMode ? (
            <button
              onClick={exitHistoryMode}
              style={{
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              ← Back to Live Map
            </button>
          ) : (
            <button
              onClick={fetchEmployeesAndConfig}
              title="Manual refresh"
              style={{
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Main Layout (Left Directory + Full Map) ──────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Left Employee Directory */}
        <div
          style={{
            width: 390,
            background: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
            zIndex: 20,
          }}
        >
          {isHistoryMode ? (
            /* History Route Sidebar */
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    fontWeight: 800,
                    fontSize: 15,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #bae6fd',
                  }}
                >
                  {(selectedEmployee?.name || 'E').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                    {selectedEmployee?.name}
                  </h4>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Route History & Travel Log</div>
                </div>
              </div>

              {/* Date Filters */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[
                  { key: 'today', label: 'Today' },
                  { key: 'yesterday', label: 'Yesterday' },
                  { key: 'last7days', label: '7 Days' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setHistoryDateFilter(tab.key);
                      loadEmployeeHistory(selectedEmployeeId, tab.key);
                    }}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: historyDateFilter === tab.key ? '#0284c7' : '#f1f5f9',
                      color: historyDateFilter === tab.key ? '#ffffff' : '#475569',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Summary Stats Card */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '12px 16px',
                  marginBottom: 16,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Distance Travelled
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0284c7', marginTop: 2 }}>
                    {historyDistanceKm} km
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    GPS Breadcrumbs
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    {historyPoints.length}
                  </div>
                </div>
              </div>

              {/* Waypoints Timeline */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
                  Recorded Route Points
                </div>
                {historyLoading ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', fontSize: 12 }}>
                    Loading GPS trail...
                  </div>
                ) : historyPoints.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8', fontSize: 12 }}>
                    No recorded movement for this time period.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {historyPoints.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '8px 12px',
                          background: '#ffffff',
                          border: '1px solid #f1f5f9',
                          borderRadius: 8,
                          fontSize: 11,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                          <div style={{ color: '#64748b', fontSize: 10 }}>
                            {p.road || `${p.latitude?.toFixed(4)}, ${p.longitude?.toFixed(4)}`}
                          </div>
                        </div>
                        <span
                          style={{
                            fontWeight: 800,
                            color:
                              p.trackingStatus === 'MOVING'
                                ? '#059669'
                                : p.trackingStatus === 'AT_OFFICE'
                                ? '#0284c7'
                                : '#d97706',
                          }}
                        >
                          {p.speed ? `${p.speed} km/h` : p.trackingStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Live Directory Sidebar */
            <>
              {/* Search Box & Filters */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '7px 12px',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search employee, road, or area..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontSize: 12.5,
                      width: '100%',
                      color: '#0f172a',
                    }}
                  />
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: 4, marginTop: 10, overflowX: 'auto', paddingBottom: 2 }}>
                  {[
                    { key: 'ALL', label: `All (${statusCounts.ALL})` },
                    { key: 'AT_OFFICE', label: `🏢 At Office (${statusCounts.AT_OFFICE})` },
                    { key: 'MOVING', label: `🏍️ Moving (${statusCounts.MOVING})` },
                    { key: 'STOPPED', label: `🟡 Stopped (${statusCounts.STOPPED})` },
                    { key: 'OFFLINE', label: `Offline (${statusCounts.OFFLINE})` },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setStatusFilter(f.key)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 10.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        background: statusFilter === f.key ? '#e0f2fe' : '#f8fafc',
                        color: statusFilter === f.key ? '#0369a1' : '#64748b',
                        border: `1px solid ${statusFilter === f.key ? '#bae6fd' : '#e2e8f0'}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Employee Cards List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
                {loading ? (
                  <div style={{ padding: 20 }}>
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        style={{
                          height: 85,
                          background: '#f1f5f9',
                          borderRadius: 10,
                          marginBottom: 8,
                          animation: 'pulse 1.5s infinite',
                        }}
                      />
                    ))}
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 16px', color: '#94a3b8' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>
                      No employees are currently sharing their location.
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      Employees who start location sharing will appear live on the map.
                    </div>
                  </div>
                ) : (
                  filteredEmployees.map((emp) => {
                    const uId = emp._id || emp.employeeId;
                    const loc = emp.location || {};
                    const status = loc.trackingStatus || 'OFFLINE';
                    const isSelected = selectedEmployeeId === uId;
                    const isAtOffice = status === 'AT_OFFICE';
                    const isMoving = status === 'MOVING' || status === 'LEAVING_OFFICE';
                    const isStopped = status === 'STOPPED';

                    const statusBadgeTheme = {
                      AT_OFFICE: { bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc', label: '🏢 At Office' },
                      LEAVING_OFFICE: { bg: '#f3e8ff', color: '#6d28d9', border: '#c4b5fd', label: '🚶 Leaving Office' },
                      MOVING: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', label: '🟢 Moving' },
                      STOPPED: { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: '🟡 Stopped' },
                      OFFLINE: { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0', label: '🔴 Offline' },
                    }[status] || { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0', label: status };

                    return (
                      <div
                        key={uId}
                        onClick={() => setSelectedEmployeeId(uId)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 10,
                          marginBottom: 8,
                          cursor: 'pointer',
                          background: isSelected ? '#f0f9ff' : '#ffffff',
                          border: isSelected ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                          boxShadow: isSelected ? '0 4px 12px rgba(2, 132, 199, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                          transition: 'all 0.18s ease',
                        }}
                      >
                        {/* Header Line */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ position: 'relative' }}>
                              <div
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: '50%',
                                  background: isSelected ? '#e0f2fe' : '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: 13,
                                  color: '#0f172a',
                                }}
                              >
                                {(emp.name || 'E').charAt(0).toUpperCase()}
                              </div>
                              <span
                                style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  right: 0,
                                  width: 11,
                                  height: 11,
                                  borderRadius: '50%',
                                  border: '2px solid white',
                                  background: isAtOffice ? '#0284c7' : isMoving ? '#10b981' : isStopped ? '#f59e0b' : '#9ca3af',
                                }}
                              />
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>{emp.name}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{emp.email}</div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '2px 7px',
                              borderRadius: 12,
                              background: statusBadgeTheme.bg,
                              color: statusBadgeTheme.color,
                              border: `1px solid ${statusBadgeTheme.border}`,
                              letterSpacing: '0.02em',
                            }}
                          >
                            {statusBadgeTheme.label}
                          </span>
                        </div>

                        {/* Reverse Geocoded Location Line */}
                        {(loc.road || isAtOffice) && (
                          <div
                            style={{
                              marginTop: 8,
                              padding: '4px 8px',
                              background: isSelected ? '#ffffff' : '#f8fafc',
                              borderRadius: 6,
                              fontSize: 11,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              border: '1px solid #edf2f7',
                            }}
                          >
                            <span style={{ fontWeight: 700, color: '#0369a1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                              {isAtOffice ? '🏢 AOTMS - Pothuri Towers' : `🛣️ ${loc.road}`}
                            </span>
                            <span style={{ color: '#64748b', fontSize: 10 }}>
                              {loc.city || 'Vijayawada'}
                            </span>
                          </div>
                        )}

                        {/* Telemetry Row */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: 8,
                            paddingTop: 6,
                            borderTop: '1px solid #f1f5f9',
                            fontSize: 11,
                            color: '#64748b',
                          }}
                        >
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            {isAtOffice ? (
                              <span style={{ color: '#0369a1', fontWeight: 700 }}>
                                Since {formatTimeOnly(loc.sinceOfficeAt || loc.lastUpdated)}
                              </span>
                            ) : isMoving ? (
                              <span style={{ color: '#059669', fontWeight: 800 }}>
                                🏍️ {loc.speed != null ? `${loc.speed} km/h` : 'Moving'}
                              </span>
                            ) : isStopped ? (
                              <span style={{ color: '#d97706', fontWeight: 700 }}>
                                ⏱️ Stopped {formatStoppedDuration(loc.stoppedAt)}
                              </span>
                            ) : (
                              <span style={{ color: '#64748b' }}>
                                Last seen {formatRelativeTime(loc.lastUpdated)}
                              </span>
                            )}
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              loadEmployeeHistory(uId, 'today');
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#0284c7',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            View Route ➔
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* ── 3. Right Map View Panel ─────────────────────────────────────────── */}
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          <LiveMap
            employees={employees}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={(id) => setSelectedEmployeeId(id)}
            historyPoints={historyPoints}
            historyBounds={historyBounds}
            isHistoryMode={isHistoryMode}
            officeConfig={officeConfig}
            followEmployee={followEmployee}
            onToggleFollow={() => setFollowEmployee((prev) => !prev)}
            showRouteTrail={showRouteTrail}
            onToggleRouteTrail={() => setShowRouteTrail((prev) => !prev)}
          />

          {/* Floating Selected Employee Telemetry Panel (Blinkit Card Style) */}
          {!isHistoryMode && selectedEmployee && (
            <div
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '16px 18px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                zIndex: 20,
                width: 330,
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 15,
                    }}
                  >
                    {(selectedEmployee.name || 'E').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                      {selectedEmployee.name}
                    </h4>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{selectedEmployee.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEmployeeId(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}
                >
                  ✕
                </button>
              </div>

              {/* Status & Speed Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, marginBottom: 10 }}>
                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <div style={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                    Current Speed
                  </div>
                  <div style={{ fontWeight: 800, color: '#0284c7', fontSize: 15, marginTop: 2 }}>
                    {selectedEmployee.location?.speed != null && selectedEmployee.location.speed > 0
                      ? `${selectedEmployee.location.speed} km/h`
                      : '0 km/h'}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <div style={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                    Movement Status
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 12.5,
                      marginTop: 2,
                      color:
                        selectedEmployee.location?.trackingStatus === 'AT_OFFICE'
                          ? '#0284c7'
                          : selectedEmployee.location?.trackingStatus === 'MOVING'
                          ? '#10b981'
                          : selectedEmployee.location?.trackingStatus === 'STOPPED'
                          ? '#f59e0b'
                          : '#94a3b8',
                    }}
                  >
                    {selectedEmployee.location?.trackingStatus === 'AT_OFFICE'
                      ? '🏢 At Office'
                      : selectedEmployee.location?.trackingStatus === 'MOVING'
                      ? '🟢 Moving'
                      : selectedEmployee.location?.trackingStatus === 'STOPPED'
                      ? '🟡 Stopped'
                      : '🔴 Offline'}
                  </div>
                </div>
              </div>

              {/* Road, Street & Area Telemetry Card */}
              <div
                style={{
                  fontSize: 11,
                  color: '#475569',
                  background: '#f8fafc',
                  borderRadius: 8,
                  padding: '10px 12px',
                  marginBottom: 12,
                  border: '1px solid #edf2f7',
                }}
              >
                {selectedEmployee.location?.trackingStatus === 'AT_OFFICE' ? (
                  <>
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ color: '#64748b', fontSize: 10, fontWeight: 700 }}>OFFICE LOCATION:</span>
                      <div style={{ fontWeight: 800, color: '#0369a1', marginTop: 1 }}>Academy Of Tech Masters</div>
                      <div style={{ fontSize: 11, color: '#0f172a', fontWeight: 600 }}>2nd Floor, Pothuri Towers</div>
                      <div style={{ fontSize: 10.5, color: '#475569', marginTop: 1 }}>MG Road, Near DV Manor</div>
                      <div style={{ fontSize: 10.5, color: '#0284c7', fontWeight: 600 }}>Opposite Lucky Shopping Mall</div>
                      <div style={{ fontSize: 10.5, color: '#64748b' }}>Vijayawada, AP - 520010</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 4, borderTop: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b' }}>Since:</span>
                      <b>{formatTimeOnly(selectedEmployee.location?.sinceOfficeAt || selectedEmployee.location?.lastUpdated)}</b>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ color: '#64748b', fontSize: 10, fontWeight: 700 }}>CURRENT ROAD:</span>
                      <div style={{ fontWeight: 800, color: '#0f172a', marginTop: 1 }}>
                        {selectedEmployee.location?.road || 'MG Road'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#64748b' }}>Area:</span>
                      <b>{selectedEmployee.location?.area || 'Labbipet'}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#64748b' }}>City:</span>
                      <b>{selectedEmployee.location?.city || 'Vijayawada'}</b>
                    </div>
                    {selectedEmployee.location?.officeDistanceMeters != null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: '#64748b' }}>Distance from Office:</span>
                        <b style={{ color: '#0284c7' }}>
                          {selectedEmployee.location.officeDistanceMeters >= 1000
                            ? `${(selectedEmployee.location.officeDistanceMeters / 1000).toFixed(1)} km`
                            : `${selectedEmployee.location.officeDistanceMeters} m`}
                        </b>
                      </div>
                    )}
                    {selectedEmployee.location?.accuracy != null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: '#64748b' }}>GPS Accuracy:</span>
                        <b style={{ color: selectedEmployee.location.accuracy <= 15 ? '#059669' : '#d97706' }}>
                          ±{Math.round(selectedEmployee.location.accuracy)}m
                        </b>
                      </div>
                    )}
                    {selectedEmployee.location?.heading > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: '#64748b' }}>Direction of Travel:</span>
                        <b style={{ color: '#059669' }}>
                          {getHeadingDirectionLabel(selectedEmployee.location?.heading)}
                        </b>
                      </div>
                    )}
                    {selectedEmployee.location?.trackingStatus === 'STOPPED' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: '#64748b' }}>Stopped for:</span>
                        <b style={{ color: '#d97706' }}>
                          {formatStoppedDuration(selectedEmployee.location?.stoppedAt)}
                        </b>
                      </div>
                    )}
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 4, borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>Last Updated:</span>
                  <b>{formatRelativeTime(selectedEmployee.location?.lastUpdated)}</b>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => loadEmployeeHistory(selectedEmployee._id || selectedEmployee.employeeId, 'today')}
                style={{
                  width: '100%',
                  background: GRADIENT,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 0',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                }}
              >
                🗺️ View Travelled Route History
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
