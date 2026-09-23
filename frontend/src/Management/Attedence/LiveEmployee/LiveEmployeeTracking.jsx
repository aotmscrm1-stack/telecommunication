import { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { trackingAPI } from '../../../services/api';
import trackingSocket, { ConnectionState } from '../../../services/trackingSocketClient';
import LiveMap from '../../../components/tracking/LiveMap';
import { isValidCoordinates } from '../../../config/trackingConfig';

export default function LiveEmployeeTracking() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'admin';
  const isAdmin = user?.role === 'manager' || isSuperAdmin;

  // Role Protection Guard
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
  const [connectionState, setConnectionState] = useState(
    trackingSocket.getConnectionState() || ConnectionState.DISCONNECTED
  );
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

  // Relative Sync Timer
  useEffect(() => {
    const interval = setInterval(() => {
      const diffSec = Math.floor((Date.now() - lastSyncTime) / 1000);
      if (diffSec < 3) setSyncTimerText('Just now');
      else if (diffSec < 60) setSyncTimerText(`${diffSec}s ago`);
      else setSyncTimerText(`${Math.floor(diffSec / 60)}m ago`);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastSyncTime]);

  // Real-Time Socket.IO Handlers
  useEffect(() => {
    trackingSocket.connect();
    trackingSocket.subscribeAdmin().catch(() => {});
    setConnectionState(trackingSocket.getConnectionState());

    const unsubState = trackingSocket.on('connectionStateChange', ({ state }) => {
      setConnectionState(state);
    });

    const unsubConn = trackingSocket.on('connect', () => {
      setConnectionState(ConnectionState.CONNECTED);
      trackingSocket.subscribeAdmin().catch(() => {});
    });

    const unsubDisconn = () => {
      setConnectionState(trackingSocket.getConnectionState());
    };
    trackingSocket.on('disconnect', unsubDisconn);
    trackingSocket.on('error', unsubDisconn);

    const unsubLocation = trackingSocket.on('admin:employee:location', (locPacket) => {
      setLastSyncTime(Date.now());
      setEmployees((prev) => {
        const pEmpId = String(locPacket.employeeId || locPacket._id || locPacket.id || '');
        const index = prev.findIndex((e) => String(e._id || e.employeeId || e.id || '') === pEmpId);
        if (index === -1) {
          const newEmp = {
            _id: pEmpId,
            employeeId: pEmpId,
            name: locPacket.name || 'Employee',
            email: locPacket.email || '',
            role: locPacket.role || 'caller',
            avatar: locPacket.avatar || '',
            phone: locPacket.phone || '',
            location: { ...locPacket },
          };
          return [...prev, newEmp];
        }
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          name: locPacket.name || updated[index].name,
          email: locPacket.email || updated[index].email,
          role: locPacket.role || updated[index].role,
          avatar: locPacket.avatar || updated[index].avatar,
          phone: locPacket.phone || updated[index].phone,
          location: {
            ...updated[index].location,
            ...locPacket,
          },
        };
        return updated;
      });
    });

    const unsubStatus = trackingSocket.on('admin:employee:status', (statusPacket) => {
      setLastSyncTime(Date.now());
      setEmployees((prev) => {
        const pEmpId = String(statusPacket.employeeId || statusPacket._id || statusPacket.id || '');
        const index = prev.findIndex((e) => String(e._id || e.employeeId || e.id || '') === pEmpId);
        if (index === -1) {
          const newEmp = {
            _id: pEmpId,
            employeeId: pEmpId,
            name: statusPacket.name || 'Employee',
            location: {
              trackingStatus: statusPacket.trackingStatus,
              lastUpdated: statusPacket.lastUpdated,
              isLive: statusPacket.trackingStatus !== 'OFFLINE',
            },
          };
          return [...prev, newEmp];
        }
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          name: statusPacket.name || updated[index].name,
          location: {
            ...(updated[index].location || {}),
            trackingStatus: statusPacket.trackingStatus,
            lastUpdated: statusPacket.lastUpdated,
            isLive: statusPacket.trackingStatus !== 'OFFLINE',
            speed:
              statusPacket.trackingStatus === 'OFFLINE' || statusPacket.trackingStatus === 'AT_OFFICE'
                ? 0
                : updated[index].location?.speed || 0,
          },
        };
        return updated;
      });
    });

    return () => {
      unsubState();
      unsubConn();
      trackingSocket.off('disconnect', unsubDisconn);
      trackingSocket.off('error', unsubDisconn);
      unsubLocation();
      unsubStatus();
    };
  }, []);

  // Historical Route Query
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

  // Filter & Search Logic
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const query = searchQuery.toLowerCase().trim();
      const loc = emp.location || {};

      const nameMatch = (emp.name || '').toLowerCase().includes(query);
      const emailMatch = (emp.email || '').toLowerCase().includes(query);
      const roadMatch = (loc.road || '').toLowerCase().includes(query);
      const areaMatch = (loc.area || '').toLowerCase().includes(query);
      const matchesSearch = !query || nameMatch || emailMatch || roadMatch || areaMatch;

      const status = loc.trackingStatus || 'OFFLINE';
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
      const loc = e.location || {};
      const st = loc.trackingStatus || 'OFFLINE';
      if (counts[st] !== undefined) counts[st]++;
      else if (st === 'LEAVING_OFFICE') counts.MOVING++;
      else counts.OFFLINE++;
    });
    return counts;
  }, [employees]);

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees.find(
      (e) => String(e._id || e.employeeId || e.id || '') === String(selectedEmployeeId)
    );
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

  // Connection state styling (Clean white background + cool blue / calm orange)
  const connectionTheme = {
    [ConnectionState.CONNECTED]: {
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      color: 'text-sky-700',
      dot: 'bg-sky-500',
      pulse: true,
      label: 'Live Telemetry',
    },
    [ConnectionState.CONNECTING]: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      color: 'text-orange-700',
      dot: 'bg-orange-500',
      pulse: false,
      label: 'Connecting...',
    },
    [ConnectionState.RECONNECTING]: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      color: 'text-orange-700',
      dot: 'bg-orange-500',
      pulse: true,
      label: 'Reconnecting...',
    },
    [ConnectionState.DISCONNECTED]: {
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      color: 'text-slate-600',
      dot: 'bg-slate-400',
      pulse: false,
      label: 'Disconnected',
    },
  }[connectionState] || {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    color: 'text-slate-600',
    dot: 'bg-slate-400',
    pulse: false,
    label: connectionState,
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-white font-sans text-slate-800">
      {/* ── 1. Top Header Bar (Pristine White + Cool Blue & Calm Orange Accents) ── */}
      <header className="h-14 px-4 sm:px-6 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-xs z-30">
        {/* Left: Brand title & live status indicator */}
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto py-1">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="size-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shadow-2xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-semibold text-slate-900 tracking-tight leading-tight">
                  Live Field Tracking
                </h1>
                <span className="size-1.5 rounded-full bg-orange-500" />
              </div>
              <span className="text-[11px] text-slate-500 font-normal hidden sm:inline">
                Real-time workforce telemetry
              </span>
            </div>
          </div>

          {/* Connection state pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${connectionTheme.bg} ${connectionTheme.border} ${connectionTheme.color} shrink-0`}>
            <span className="relative flex size-2">
              {connectionTheme.pulse && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connectionTheme.dot}`} />
              )}
              <span className={`relative inline-flex rounded-full size-2 ${connectionTheme.dot}`} />
            </span>
            <span>{connectionTheme.label}</span>
          </div>

          {/* Metric Chips (Calm & Cool Palettes) */}
          <div className="hidden lg:flex items-center gap-1.5 shrink-0">
            <span className="text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 shadow-2xs">
              Total <span className="font-semibold text-slate-800 ml-0.5">{statusCounts.ALL}</span>
            </span>

            <span className="text-xs px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200/80 text-sky-700 flex items-center gap-1 shadow-2xs">
              <svg className="size-3 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>
              <span>At Office</span>
              <span className="font-semibold ml-0.5">{statusCounts.AT_OFFICE}</span>
            </span>

            <span className="text-xs px-2.5 py-1 rounded-md bg-sky-50/70 border border-sky-300/80 text-sky-800 flex items-center gap-1 shadow-2xs">
              <svg className="size-3 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              <span>Moving</span>
              <span className="font-semibold text-sky-700 ml-0.5">{statusCounts.MOVING}</span>
            </span>

            <span className="text-xs px-2.5 py-1 rounded-md bg-orange-50 border border-orange-200 text-orange-700 flex items-center gap-1 shadow-2xs">
              <svg className="size-3 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              <span>Stopped</span>
              <span className="font-semibold ml-0.5">{statusCounts.STOPPED}</span>
            </span>

            <span className="text-xs px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-500 shadow-2xs">
              Offline <span className="font-semibold ml-0.5">{statusCounts.OFFLINE}</span>
            </span>
          </div>
        </div>

        {/* Right: Last updated & actions */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500">
            <svg className="size-3.5 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Updated {syncTimerText}</span>
          </div>

          {isHistoryMode ? (
            <button
              onClick={exitHistoryMode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer border border-sky-200 shadow-2xs"
            >
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              <span>Back to Live</span>
            </button>
          ) : (
            <button
              onClick={fetchEmployeesAndConfig}
              title="Refresh telemetry"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-sky-50/60 border border-slate-200 hover:border-sky-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <svg className="size-3.5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
              <span>Refresh</span>
            </button>
          )}
        </div>
      </header>

      {/* ── 2. Main Content Layout ──────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Employee Sidebar (Crisp White + Cool Blue & Calm Orange) */}
        <aside className="w-80 sm:w-88 md:w-96 bg-white border-r border-slate-200/80 flex flex-col overflow-hidden shrink-0 z-20 shadow-xs">
          {isHistoryMode ? (
            /* History Route Mode */
            <div className="p-4 flex flex-col h-full overflow-hidden bg-white">
              <div className="flex items-center gap-3 pb-3 mb-3 border-b border-slate-100">
                <div className="size-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-semibold text-sm flex items-center justify-center shrink-0 shadow-xs">
                  {(selectedEmployee?.name || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">
                    {selectedEmployee?.name}
                  </h3>
                  <p className="text-xs text-orange-600 font-medium truncate">
                    Route Playback & Logs
                  </p>
                </div>
              </div>

              {/* Date Filters */}
              <div className="flex gap-1.5 p-1 bg-slate-50 border border-slate-200/60 rounded-lg mb-3">
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
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      historyDateFilter === tab.key
                        ? 'bg-white text-sky-600 border border-sky-200 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Distance & Points KPI */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-sky-50/50 rounded-xl border border-sky-100 mb-3 text-center">
                <div>
                  <div className="text-[10px] text-sky-700/80 uppercase tracking-wider font-medium">Distance</div>
                  <div className="text-base font-semibold text-sky-700 mt-0.5">
                    {historyDistanceKm} <span className="text-xs font-normal text-slate-500">km</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-orange-700/80 uppercase tracking-wider font-medium">Breadcrumbs</div>
                  <div className="text-base font-semibold text-orange-600 mt-0.5">
                    {historyPoints.length}
                  </div>
                </div>
              </div>

              {/* Recorded Points Timeline */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Waypoints Log
                </div>
                {historyLoading ? (
                  <div className="text-center py-10 text-xs text-slate-400">Loading trail data...</div>
                ) : historyPoints.length === 0 ? (
                  <div className="text-center py-12 px-4 text-xs text-slate-400">
                    <p className="font-medium text-slate-700 mb-1">No recorded movement</p>
                    <p className="text-[11px]">No GPS breadcrumbs captured for this timeframe.</p>
                  </div>
                ) : (
                  historyPoints.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-white border border-slate-100 shadow-2xs text-xs flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-medium text-slate-800">
                          {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {p.road || `${p.latitude?.toFixed(4)}, ${p.longitude?.toFixed(4)}`}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        p.trackingStatus === 'MOVING'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : p.trackingStatus === 'AT_OFFICE'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-orange-50 text-orange-700 border border-orange-200'
                      }`}>
                        {p.speed ? `${p.speed} km/h` : p.trackingStatus || 'Point'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Live Directory Mode */
            <>
              {/* Search & Filter Bar */}
              <div className="p-3 border-b border-slate-100 space-y-2 bg-white">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50/80 rounded-xl border border-slate-200 focus-within:border-sky-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                  <svg className="size-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    type="text"
                    placeholder="Search name, area, or road..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>

                {/* Filter Tabs (Cool Blue & Calm Orange Segment) */}
                <div className="flex gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                  {[
                    { key: 'ALL', label: `All (${statusCounts.ALL})` },
                    { key: 'AT_OFFICE', label: `Office (${statusCounts.AT_OFFICE})` },
                    { key: 'MOVING', label: `Moving (${statusCounts.MOVING})` },
                    { key: 'STOPPED', label: `Stopped (${statusCounts.STOPPED})` },
                    { key: 'OFFLINE', label: `Offline (${statusCounts.OFFLINE})` },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setStatusFilter(tab.key)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                        statusFilter === tab.key
                          ? 'bg-sky-500 text-white shadow-2xs'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Employee Cards List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-white">
                {loading ? (
                  <div className="space-y-2 p-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-20 bg-slate-50 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="text-center py-16 px-4 text-xs text-slate-400">
                    <svg className="size-8 mx-auto text-slate-300 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>
                    <p className="font-medium text-slate-700">No agents match your filter</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Agents sharing live GPS will show up dynamically.</p>
                  </div>
                ) : (
                  filteredEmployees.map((emp) => {
                    const uId = emp._id || emp.employeeId;
                    const loc = emp.location || {};
                    const hasValidLocation = isValidCoordinates(loc.latitude, loc.longitude);
                    const status = hasValidLocation ? loc.trackingStatus || 'OFFLINE' : 'OFFLINE';
                    const isSelected = selectedEmployeeId === uId;
                    const isAtOffice = status === 'AT_OFFICE';
                    const isMoving = status === 'MOVING' || status === 'LEAVING_OFFICE';
                    const isStopped = status === 'STOPPED';

                    const statusBadgeTheme = {
                      AT_OFFICE: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', label: 'Office' },
                      LEAVING_OFFICE: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Departing' },
                      MOVING: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', label: 'Moving' },
                      STOPPED: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Stopped' },
                      OFFLINE: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', label: 'Offline' },
                    }[status] || { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', label: status };

                    return (
                      <div
                        key={uId}
                        onClick={() => setSelectedEmployeeId(uId)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-50/70 border-sky-400 shadow-sm ring-1 ring-sky-300/40'
                            : 'bg-white hover:bg-slate-50/80 border-slate-200/80 shadow-2xs'
                        }`}
                      >
                        {/* Header: Avatar, Name & Status Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <div className={`size-8 rounded-lg flex items-center justify-center text-xs font-semibold ${
                                isSelected
                                  ? 'bg-sky-500 text-white shadow-2xs'
                                  : 'bg-sky-50 text-sky-700 border border-sky-200/80'
                              }`}>
                                {(emp.name || 'A').charAt(0).toUpperCase()}
                              </div>
                              <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white ${
                                isAtOffice ? 'bg-sky-500' : isMoving ? 'bg-sky-500' : isStopped ? 'bg-orange-500' : 'bg-slate-400'
                              }`} />
                            </div>

                            <div className="min-w-0">
                              <h4 className="text-xs font-semibold text-slate-900 truncate">
                                {emp.name}
                              </h4>
                              <p className="text-[11px] text-slate-500 truncate">
                                {emp.email || emp.role || 'Field Agent'}
                              </p>
                            </div>
                          </div>

                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusBadgeTheme.bg} ${statusBadgeTheme.text} ${statusBadgeTheme.border} shrink-0`}>
                            {statusBadgeTheme.label}
                          </span>
                        </div>

                        {/* Location row */}
                        {hasValidLocation ? (
                          <div className="mt-2 px-2 py-1 bg-slate-50/80 rounded-lg text-[11px] flex items-center justify-between border border-slate-100">
                            <span className="text-slate-700 font-medium truncate flex items-center gap-1.5">
                              <svg className="size-3 text-sky-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                              <span className="truncate">{isAtOffice ? 'Office - Pothuri Towers' : loc.road || 'City Road'}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                              {loc.area || loc.city || 'Vijayawada'}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2 text-[11px] text-slate-400 italic">
                            Awaiting GPS position...
                          </div>
                        )}

                        {/* Bottom line: Telemetry + Route History trigger */}
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <div>
                            {hasValidLocation ? (
                              isAtOffice ? (
                                <span className="text-sky-700 font-medium">
                                  In office {formatTimeOnly(loc.sinceOfficeAt || loc.lastUpdated)}
                                </span>
                              ) : isMoving ? (
                                <span className="text-sky-700 font-medium flex items-center gap-1">
                                  <span className="size-1.5 rounded-full bg-sky-500 animate-pulse" />
                                  <span>{loc.speed != null ? `${loc.speed} km/h` : 'Moving'}</span>
                                </span>
                              ) : isStopped ? (
                                <span className="text-orange-600 font-medium">
                                  Idle {formatStoppedDuration(loc.stoppedAt)}
                                </span>
                              ) : (
                                <span>Seen {formatRelativeTime(loc.lastUpdated)}</span>
                              )
                            ) : (
                              <span>Seen {formatRelativeTime(loc.lastUpdated)}</span>
                            )}
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              loadEmployeeHistory(uId, 'today');
                            }}
                            className="text-orange-500 hover:text-orange-600 font-medium flex items-center gap-0.5 transition-colors cursor-pointer"
                          >
                            <span>Route</span>
                            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </aside>

        {/* ── 3. Right Map View Panel ─────────────────────────────────────────── */}
        <main className="flex-1 relative h-full overflow-hidden bg-white">
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
        </main>
      </div>
    </div>
  );
}
