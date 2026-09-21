import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { attendanceAPI, trackingAPI, usersAPI } from '../../services/api';
import LiveMap from '../../components/tracking/LiveMap';
import {
  Users,
  User,
  Calendar,
  Activity,
  Coffee,
  CheckCircle2,
  Clock,
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  MapPin,
  FileText,
  Zap,
  Download,
  RefreshCw,
} from 'lucide-react';

const GRADIENT = 'var(--btn-gradient, linear-gradient(90deg, #ffb37c 0%, #38bdf8 100%))';
const TEXT_MAIN = '#0f172a';
const TEXT_MUTED = '#64748b';
const BORDER = '#e2e8f0';

// Format seconds into HH:MM:SS format
function formatHms(seconds) {
  if (seconds == null || isNaN(seconds) || seconds < 0) return '00:00:00';
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Format seconds into readable standardized text e.g. "08h 15m" or "45s"
function formatDurationText(diffSec) {
  if (diffSec == null || isNaN(diffSec) || diffSec <= 0) return '00h 00m';
  const totalSecs = Math.floor(diffSec);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = diffSec % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  } else if (minutes > 0) {
    return `00h ${String(minutes).padStart(2, '0')}m`;
  } else {
    return `${seconds}s`;
  }
}

// Helper to normalize backend duration strings to uniform format (e.g. "8h 15m" -> "08h 15m")
function normalizeDurationStr(str) {
  if (!str || str === '—' || str === '-') return '—';
  if (str.includes(':')) return str; // Already HH:MM:SS
  const hMatch = str.match(/(\d+)h/);
  const mMatch = str.match(/(\d+)m/);
  const sMatch = str.match(/(\d+)s/);

  if (hMatch || mMatch) {
    const hrs = hMatch ? parseInt(hMatch[1], 10) : 0;
    const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
    return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  }
  if (sMatch) {
    return `${parseInt(sMatch[1], 10)}s`;
  }
  return str;
}

// Helper to get local date (YYYY-MM-DD)
function getTodayIso() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to format date display (e.g. "18 Sep 2026")
function formatDateDisplay(isoStr) {
  if (!isoStr) return '—';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    const d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T00:00:00`);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return isoStr;
}

// Helper to format 12-hour time (e.g. "09:15 AM")
function formatTime12h(dateObj) {
  if (!dateObj) return '—';
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Helper to format friendly header date (e.g. "Friday, 18 September 2026")
function formatHeaderDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr + 'T00:00:00');
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function AttendanceRecords() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Date and filter states
  const [selectedDate, setSelectedDate] = useState(getTodayIso());
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [startDate, setStartDate] = useState(getTodayIso());
  const [endDate, setEndDate] = useState(getTodayIso());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ON_DUTY, ON_BREAK, COMPLETED, NOT_STARTED, INCOMPLETE
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('ALL'); // ALL or employeeId

  // Employee Dropdown state
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [empDropdownSearch, setEmpDropdownSearch] = useState('');
  const employeeDropdownRef = useRef(null);

  // Data states
  const [records, setRecords] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    presentToday: 0,
    currentlyOnDuty: 0,
    currentlyOnBreak: 0,
    completedAttendance: 0,
    totalBreakTimeToday: '00h 00m',
    incompleteAttendance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Live timer tick for active sessions
  const [currentNow, setCurrentNow] = useState(Date.now());

  // Modals state
  const [detailModalRecord, setDetailModalRecord] = useState(null);
  const [breakModalRecord, setBreakModalRecord] = useState(null);
  const [historyModalEmployee, setHistoryModalEmployee] = useState(null);
  const [employeeHistoryData, setEmployeeHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [mapModalRecord, setMapModalRecord] = useState(null);

  // Live clock tick every second for real-time timers in table
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all active system users for the employee dropdown
  useEffect(() => {
    usersAPI
      .getAll()
      .then((res) => {
        if (res.data?.users) {
          setSystemUsers(res.data.users);
        }
      })
      .catch((err) => {
        console.warn('[Fetch System Users Error]:', err.message);
      });
  }, []);

  // Close employee dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(e.target)) {
        setShowEmployeeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch summary and records for selected date / filters
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (isRangeMode) {
        params.fromDate = startDate;
        params.toDate = endDate;
      } else {
        params.date = selectedDate;
      }

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const [summaryRes, recordsRes] = await Promise.allSettled([
        attendanceAPI.getSummary({ date: isRangeMode ? endDate : selectedDate }),
        attendanceAPI.getRecords(params),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data?.ok) {
        setSummary(summaryRes.value.data.summary);
      }
      if (recordsRes.status === 'fulfilled' && recordsRes.value.data?.ok) {
        setRecords(recordsRes.value.data.records || []);
      }
    } catch (err) {
      console.error('[AttendanceRecords Fetch Error]:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, isRangeMode, startDate, endDate, statusFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived list of all distinct employees for the dropdown
  const employeeOptions = useMemo(() => {
    const empMap = new Map();

    // Add employees from records
    records.forEach((r) => {
      if (r.employeeId && !empMap.has(r.employeeId)) {
        empMap.set(r.employeeId, {
          id: r.employeeId,
          name: r.employeeName || 'Employee',
          code: r.employeeCode || 'EMP-001',
          email: r.email || '',
          status: r.status,
        });
      }
    });

    // Add employees from system users if not already present
    systemUsers.forEach((u, idx) => {
      const uId = u._id?.toString() || u.id?.toString();
      if (uId && !empMap.has(uId)) {
        empMap.set(uId, {
          id: uId,
          name: u.name,
          code: u.employeeId || `EMP-${String(idx + 1).padStart(3, '0')}`,
          email: u.email || '',
          status: 'NOT_STARTED',
        });
      }
    });

    return Array.from(empMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [records, systemUsers]);

  // Filtered employee options inside dropdown
  const filteredEmployeeOptions = useMemo(() => {
    if (!empDropdownSearch.trim()) return employeeOptions;
    const q = empDropdownSearch.toLowerCase().trim();
    return employeeOptions.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        (e.email && e.email.toLowerCase().includes(q))
    );
  }, [employeeOptions, empDropdownSearch]);

  // Selected employee object
  const selectedEmployeeObj = useMemo(() => {
    if (selectedEmployeeId === 'ALL') return null;
    return employeeOptions.find((e) => e.id === selectedEmployeeId) || null;
  }, [selectedEmployeeId, employeeOptions]);

  // Final records filtered by search query, status, and selected employee
  const displayRecords = useMemo(() => {
    let result = records;

    // Filter by selected employee from dropdown
    if (selectedEmployeeId !== 'ALL') {
      result = result.filter((r) => r.employeeId === selectedEmployeeId);
    }

    return result;
  }, [records, selectedEmployeeId]);

  // Date navigation handlers
  const handlePrevDay = () => {
    const cur = new Date(selectedDate + 'T00:00:00');
    cur.setDate(cur.getDate() - 1);
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const handleNextDay = () => {
    const cur = new Date(selectedDate + 'T00:00:00');
    cur.setDate(cur.getDate() + 1);
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const handleToday = () => {
    setSelectedDate(getTodayIso());
  };

  // Reset all active filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setSelectedEmployeeId('ALL');
    setEmpDropdownSearch('');
  };

  const isFilterActive = searchQuery || statusFilter !== 'ALL' || selectedEmployeeId !== 'ALL';

  // Export CSV handler
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = {};
      if (isRangeMode) {
        params.fromDate = startDate;
        params.toDate = endDate;
      } else {
        params.date = selectedDate;
      }
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await attendanceAPI.exportCSV(params);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AOTMS_Attendance_${isRangeMode ? `${startDate}_to_${endDate}` : selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Export CSV Error]:', err);
      alert('Failed to export attendance records: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  // Load individual employee history modal
  const handleOpenEmployeeHistory = async (empId) => {
    try {
      setHistoryLoading(true);
      setHistoryModalEmployee(empId);
      const res = await attendanceAPI.getEmployeeHistory(empId);
      if (res.data?.ok) {
        setEmployeeHistoryData(res.data);
      }
    } catch (err) {
      console.error('[Employee History Fetch Error]:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Calculate real-time timer values for a record
  const getRecordLiveTimes = (rec) => {
    if (!rec || rec.status === 'NOT_STARTED' || !rec.startTime) {
      return {
        totalAttendance: rec?.durationFormatted ? normalizeDurationStr(rec.durationFormatted) : '—',
        totalBreak: rec?.formattedBreakDuration ? normalizeDurationStr(rec.formattedBreakDuration) : '—',
        actualWork: rec?.formattedActualWork ? normalizeDurationStr(rec.formattedActualWork) : '—',
        liveBreakElapsed: null,
      };
    }

    if (rec.status === 'COMPLETED') {
      return {
        totalAttendance: normalizeDurationStr(rec.durationFormatted || '00h 00m'),
        totalBreak: normalizeDurationStr(rec.formattedBreakDuration || '00h 00m'),
        actualWork: normalizeDurationStr(rec.formattedActualWork || '00h 00m'),
        liveBreakElapsed: null,
      };
    }

    const startMs = new Date(rec.startTime).getTime();
    const breaks = Array.isArray(rec.breaks) ? rec.breaks : [];
    let completedBreaksSec = 0;
    let activeBreakObj = null;

    breaks.forEach((b) => {
      if (b.status === 'COMPLETED' && b.endTime) {
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        completedBreaksSec += Math.max(0, Math.floor((bEnd - bStart) / 1000));
      } else if (b.status === 'ACTIVE') {
        activeBreakObj = b;
      }
    });

    if (rec.status === 'ON_BREAK' && activeBreakObj) {
      const activeBreakStartMs = new Date(activeBreakObj.startTime).getTime();
      const curBreakSec = Math.max(0, Math.floor((currentNow - activeBreakStartMs) / 1000));
      const totalBreakSec = completedBreaksSec + curBreakSec;
      const totalElapsedSec = Math.max(0, Math.floor((currentNow - startMs) / 1000));
      const workSecAtBreakStart = Math.max(0, Math.floor((activeBreakStartMs - startMs) / 1000) - completedBreaksSec);

      return {
        totalAttendance: formatHms(totalElapsedSec),
        totalBreak: formatHms(totalBreakSec),
        actualWork: formatHms(workSecAtBreakStart),
        liveBreakElapsed: formatHms(curBreakSec),
      };
    }

    if (rec.status === 'ON_DUTY') {
      const totalElapsedSec = Math.max(0, Math.floor((currentNow - startMs) / 1000));
      const netWorkSec = Math.max(0, totalElapsedSec - completedBreaksSec);

      return {
        totalAttendance: formatHms(totalElapsedSec),
        totalBreak: formatDurationText(completedBreaksSec),
        actualWork: formatHms(netWorkSec),
        liveBreakElapsed: null,
      };
    }

    return {
      totalAttendance: normalizeDurationStr(rec.durationFormatted || '—'),
      totalBreak: normalizeDurationStr(rec.formattedBreakDuration || '—'),
      actualWork: normalizeDurationStr(rec.formattedActualWork || '—'),
      liveBreakElapsed: null,
    };
  };

  // Status badge style helper
  const getStatusBadge = (status) => {
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
      case 'ON_BREAK':
        return {
          bg: '#fffbeb',
          color: '#b45309',
          border: '#fde68a',
          dot: '#f59e0b',
          label: 'On Break',
          icon: '☕',
        };
      case 'COMPLETED':
        return {
          bg: '#eff6ff',
          color: '#1d4ed8',
          border: '#bfdbfe',
          dot: '#3b82f6',
          label: 'Completed',
          icon: '✅',
        };
      case 'INCOMPLETE':
        return {
          bg: '#fff7ed',
          color: '#c2410c',
          border: '#fed7aa',
          dot: '#f97316',
          label: 'Incomplete',
          icon: '⚠️',
        };
      case 'NOT_STARTED':
      default:
        return {
          bg: '#f8fafc',
          color: '#64748b',
          border: '#e2e8f0',
          dot: '#94a3b8',
          label: 'Not Started',
          icon: '⚪',
        };
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      
      {/* ──── 1. Top Header & Title Bar ────────────────────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          background: '#ffffff',
          padding: '20px 28px',
          borderRadius: 16,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              color: '#059669',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.1)',
            }}
          >
            <FileText size={24} color="#059669" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: TEXT_MAIN, letterSpacing: '-0.02em' }}>
              Attendance & Working Hours Records
            </h2>
            <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 600 }}><Calendar size={13} style={{ display: 'inline', marginRight: 4 }} /> {isRangeMode ? `${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}` : formatHeaderDate(selectedDate)}</span>
              {!isRangeMode && selectedDate === getTodayIso() && (
                <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 12 }}>
                  Today
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Header Actions: Date Picker & Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Single Date vs Range Toggle */}
          <button
            onClick={() => setIsRangeMode(!isRangeMode)}
            style={{
              background: isRangeMode ? '#e0f2fe' : '#f8fafc',
              color: isRangeMode ? '#0369a1' : '#475569',
              border: `1.5px solid ${isRangeMode ? '#bae6fd' : BORDER}`,
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s',
            }}
          >
            <><Calendar size={13} /> {isRangeMode ? 'Date Range Active' : 'Date Range'}</>
          </button>

          {!isRangeMode ? (
            /* Day Navigator */
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: '3px' }}>
              <button
                onClick={handlePrevDay}
                title="Previous Day"
                style={{ background: 'none', border: 'none', padding: '6px 10px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <ChevronLeft size={14} /> Prev Day
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  border: 'none',
                  background: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: TEXT_MAIN,
                  outline: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              />
              <button
                onClick={handleNextDay}
                title="Next Day"
                style={{ background: 'none', border: 'none', padding: '6px 10px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                Next Day <ChevronRight size={14} />
              </button>
              <button
                onClick={handleToday}
                style={{
                  background: selectedDate === getTodayIso() ? '#e2e8f0' : '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  margin: '0 4px',
                  padding: '5px 10px',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: '#334155',
                }}
              >
                Today
              </button>
            </div>
          ) : (
            /* Date Range Picker */
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: '4px 10px' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ border: 'none', background: '#ffffff', padding: '5px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: TEXT_MAIN }}
              />
              <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ border: 'none', background: '#ffffff', padding: '5px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: TEXT_MAIN }}
              />
            </div>
          )}

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={exporting || loading}
            style={{
              background: '#ffffff',
              color: '#0284c7',
              border: '1.5px solid #bae6fd',
              borderRadius: 10,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: exporting ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 1px 3px rgba(2, 132, 199, 0.08)',
              transition: 'all 0.15s',
            }}
          >
            {exporting ? 'Exporting...' : <><Download size={14} /> Export CSV</>}
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            title="Refresh Attendance Data"
            style={{
              background: '#ffffff',
              color: '#334155',
              border: `1.5px solid ${BORDER}`,
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ──── 2. Dashboard Summary KPI Cards (6 Cards) ────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
        }}
      >
        {/* Card 1: Total Employees */}
        <div
          style={{
            background: '#ffffff',
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: '18px 20px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            <Users size={22} color="#475569" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Total Employees
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: TEXT_MAIN, marginTop: 2 }}>
              {summary.totalEmployees}
            </div>
          </div>
        </div>

        {/* Card 2: Present Today */}
        <div
          style={{
            background: '#ffffff',
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: '18px 20px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: '#e0f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              color: '#0284c7',
            }}
          >
            <Calendar size={22} color="#0284c7" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Present Today
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0284c7', marginTop: 2 }}>
              {summary.presentToday}
            </div>
          </div>
        </div>

        {/* Card 3: Currently On Duty */}
        <div
          style={{
            background: '#ffffff',
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: '18px 20px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              color: '#059669',
            }}
          >
            <Activity size={22} color="#059669" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Currently On Duty
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#059669', marginTop: 2 }}>
              {summary.currentlyOnDuty}
            </div>
          </div>
        </div>

        {/* Card 4: Currently On Break */}
        <div
          style={{
            background: '#ffffff',
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: '18px 20px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: '#fffbeb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              color: '#d97706',
              border: '1px solid #fde68a',
            }}
          >
            <Coffee size={22} color="#d97706" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Currently On Break
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#d97706', marginTop: 2 }}>
              {summary.currentlyOnBreak || 0}
            </div>
          </div>
        </div>

        {/* Card 5: Completed Attendance */}
        <div
          style={{
            background: '#ffffff',
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: '18px 20px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              color: '#2563eb',
            }}
          >
            <CheckCircle2 size={22} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Completed
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#2563eb', marginTop: 2 }}>
              {summary.completedAttendance}
            </div>
          </div>
        </div>

        {/* Card 6: Total Break Time Today */}
        <div
          style={{
            background: '#ffffff',
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: '18px 20px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              color: '#b45309',
            }}
          >
            <Clock size={22} color="#b45309" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Total Break Time Today
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#b45309', marginTop: 2 }}>
              {normalizeDurationStr(summary.totalBreakTimeToday || '00h 00m')}
            </div>
          </div>
        </div>
      </div>

      {/* ──── 3. Filters & Search Section (With Dedicated Employee Dropdown) ────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          background: '#ffffff',
          padding: '16px 22px',
          borderRadius: 16,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
        }}
      >
        {/* Left Filter Group: Search Input + Modern Employee Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: '1 1 500px' }}>
          
          {/* Search input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#f8fafc',
              border: `1.5px solid ${BORDER}`,
              borderRadius: 10,
              padding: '9px 14px',
              minWidth: 260,
              flex: '1 1 280px',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search records by name, ID, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 13,
                width: '100%',
                color: TEXT_MAIN,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Dedicated Employee Dropdown Selector */}
          <div ref={employeeDropdownRef} style={{ position: 'relative', minWidth: 240 }}>
            <button
              onClick={() => setShowEmployeeDropdown((prev) => !prev)}
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: selectedEmployeeId !== 'ALL' ? '#eff6ff' : '#f8fafc',
                border: `1.5px solid ${selectedEmployeeId !== 'ALL' ? '#93c5fd' : BORDER}`,
                borderRadius: 10,
                padding: '9px 14px',
                fontSize: 13,
                fontWeight: selectedEmployeeId !== 'ALL' ? 700 : 600,
                color: selectedEmployeeId !== 'ALL' ? '#1d4ed8' : '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <User size={15} color="#3b82f6" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedEmployeeObj ? `${selectedEmployeeObj.name} (${selectedEmployeeObj.code})` : `All Employees (${employeeOptions.length})`}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {selectedEmployeeId !== 'ALL' && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEmployeeId('ALL');
                    }}
                    title="Clear employee filter"
                    style={{
                      background: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '50%',
                      width: 18,
                      height: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    ✕
                  </span>
                )}
                <span style={{ fontSize: 10, color: TEXT_MUTED, transform: showEmployeeDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                  ▼
                </span>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showEmployeeDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  width: 320,
                  background: '#ffffff',
                  borderRadius: 14,
                  border: `1px solid ${BORDER}`,
                  boxShadow: '0 12px 30px -4px rgba(15, 23, 42, 0.15)',
                  zIndex: 50,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 340,
                }}
              >
                {/* Search inside dropdown */}
                <div style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 10px' }}>
                    <Search size={13} color="#94a3b8" />
                    <input
                      type="text"
                      placeholder="Search employee by name or ID..."
                      value={empDropdownSearch}
                      onChange={(e) => setEmpDropdownSearch(e.target.value)}
                      autoFocus
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, width: '100%', color: TEXT_MAIN }}
                    />
                    {empDropdownSearch && (
                      <button onClick={() => setEmpDropdownSearch('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Dropdown Items List */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '6px' }}>
                  {/* Option: All Employees */}
                  <div
                    onClick={() => {
                      setSelectedEmployeeId('ALL');
                      setShowEmployeeDropdown(false);
                      setEmpDropdownSearch('');
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: selectedEmployeeId === 'ALL' ? '#e0f2fe' : 'transparent',
                      color: selectedEmployeeId === 'ALL' ? '#0369a1' : TEXT_MAIN,
                      fontWeight: selectedEmployeeId === 'ALL' ? 700 : 500,
                      fontSize: 12.5,
                      marginBottom: 2,
                    }}
                    onMouseEnter={(e) => {
                      if (selectedEmployeeId !== 'ALL') e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (selectedEmployeeId !== 'ALL') e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Users size={15} color="#64748b" />
                      <span>All Employees</span>
                    </div>
                    <span style={{ background: selectedEmployeeId === 'ALL' ? '#bae6fd' : '#f1f5f9', padding: '2px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#475569' }}>
                      {employeeOptions.length}
                    </span>
                  </div>

                  {/* Individual Employees */}
                  {filteredEmployeeOptions.length === 0 ? (
                    <div style={{ padding: '16px 12px', textAlign: 'center', color: TEXT_MUTED, fontSize: 12 }}>
                      No matching employees found
                    </div>
                  ) : (
                    filteredEmployeeOptions.map((emp) => {
                      const isSelected = selectedEmployeeId === emp.id;
                      const badge = getStatusBadge(emp.status);

                      return (
                        <div
                          key={emp.id}
                          onClick={() => {
                            setSelectedEmployeeId(emp.id);
                            setShowEmployeeDropdown(false);
                            setEmpDropdownSearch('');
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: isSelected ? '#eff6ff' : 'transparent',
                            color: isSelected ? '#1d4ed8' : TEXT_MAIN,
                            fontSize: 12.5,
                            marginBottom: 2,
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: isSelected ? '#dbeafe' : '#f1f5f9',
                                color: isSelected ? '#1d4ed8' : '#475569',
                                fontWeight: 800,
                                fontSize: 11,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: isSelected ? 800 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {emp.name}
                              </div>
                              <div style={{ fontSize: 11, color: TEXT_MUTED }}>{emp.code}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: badge.dot }} title={badge.label} />
                            {isSelected && <span style={{ color: '#2563eb', fontWeight: 800, fontSize: 13 }}>✓</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reset Filters button if any filter is active */}
          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              title="Clear all filters"
              style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>

        {/* Right Filter Group: Status Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'All Status' },
            { key: 'ON_DUTY', label: '🟢 On Duty' },
            { key: 'ON_BREAK', label: '🟡 On Break' },
            { key: 'COMPLETED', label: '✅ Completed' },
            { key: 'NOT_STARTED', label: '⚪ Not Started' },
            { key: 'INCOMPLETE', label: '⚠️ Incomplete' },
          ].map((pill) => (
            <button
              key={pill.key}
              onClick={() => setStatusFilter(pill.key)}
              style={{
                padding: '7px 13px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                background: statusFilter === pill.key ? '#0284c7' : '#f8fafc',
                color: statusFilter === pill.key ? '#ffffff' : '#475569',
                border: `1.5px solid ${statusFilter === pill.key ? '#0284c7' : BORDER}`,
                transition: 'all 0.15s',
                boxShadow: statusFilter === pill.key ? '0 2px 6px rgba(2, 132, 199, 0.2)' : 'none',
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* ──── 4. Main Attendance Records Table ────────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '1380px', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }}>
            <thead>
              <tr
                style={{
                  background: '#f8fafc',
                  borderBottom: `2px solid ${BORDER}`,
                  color: '#475569',
                  fontWeight: 800,
                  fontSize: 11.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  position: 'sticky',
                  top: 0,
                  zIndex: 5,
                }}
              >
                <th style={{ padding: '16px 20px', minWidth: 240, width: '18%' }}>Employee Details</th>
                <th style={{ padding: '16px 14px', minWidth: 120, width: '9%' }}>Employee ID</th>
                <th style={{ padding: '16px 14px', minWidth: 120, width: '9%' }}>Date</th>
                <th style={{ padding: '16px 14px', minWidth: 100, width: '7%' }}>Day</th>
                <th style={{ padding: '16px 14px', minWidth: 115, width: '8%' }}>Start Time</th>
                <th style={{ padding: '16px 14px', minWidth: 115, width: '8%' }}>End Time</th>
                <th style={{ padding: '16px 14px', minWidth: 140, width: '10%' }}>Total Attendance</th>
                <th style={{ padding: '16px 14px', minWidth: 110, width: '7%', textAlign: 'center' }}>Break Count</th>
                <th style={{ padding: '16px 14px', minWidth: 135, width: '9%' }}>Total Break Time</th>
                <th style={{ padding: '16px 14px', minWidth: 155, width: '11%' }}>Actual Working Hours</th>
                <th style={{ padding: '16px 14px', minWidth: 130, width: '9%' }}>Status</th>
                <th style={{ padding: '16px 20px', minWidth: 210, width: '13%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} style={{ padding: '80px 0', textAlign: 'center', color: TEXT_MUTED }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div className="w-9 h-9 spinner-gradient" style={{ width: 36, height: 36, borderRadius: '50%', border: '3.5px solid #0284c7', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: 14, fontWeight: 600 }}>Loading employee attendance records...</span>
                    </div>
                  </td>
                </tr>
              ) : displayRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '80px 20px', textAlign: 'center', color: TEXT_MUTED }}>
                    <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}><FileText size={40} color="#94a3b8" /></div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: TEXT_MAIN }}>No attendance records found</div>
                    <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 4 }}>
                      {isFilterActive
                        ? 'Try adjusting your search query, employee selector, or status filter.'
                        : 'No employees recorded attendance for the selected date.'}
                    </div>
                    {isFilterActive && (
                      <button
                        onClick={handleResetFilters}
                        style={{
                          marginTop: 14,
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '7px 16px',
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                displayRecords.map((rec) => {
                  const badge = getStatusBadge(rec.status);
                  const isNotStarted = rec.status === 'NOT_STARTED';
                  const liveTimes = getRecordLiveTimes(rec);
                  const breakCount = rec.breakCount || (Array.isArray(rec.breaks) ? rec.breaks.length : 0);

                  return (
                    <tr
                      key={rec._id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                        background: rec.status === 'ON_DUTY' ? '#fcfdfd' : rec.status === 'ON_BREAK' ? '#fffdf7' : '#ffffff',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = rec.status === 'ON_DUTY' ? '#fcfdfd' : rec.status === 'ON_BREAK' ? '#fffdf7' : '#ffffff')}
                    >
                      {/* Employee Details (Avatar + Name + Email) */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                              color: '#0369a1',
                              fontWeight: 800,
                              fontSize: 14,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #93c5fd',
                              flexShrink: 0,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            }}
                          >
                            {(rec.employeeName || 'E').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              onClick={() => handleOpenEmployeeHistory(rec.employeeId)}
                              style={{
                                fontWeight: 700,
                                color: '#0284c7',
                                cursor: 'pointer',
                                fontSize: 13.5,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                              title="Click to view employee's full attendance history"
                            >
                              {rec.employeeName}
                            </div>
                            <div style={{ fontSize: 11.5, color: TEXT_MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                              {rec.email || rec.role}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td style={{ padding: '16px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ background: '#f1f5f9', color: '#334155', fontWeight: 700, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontFamily: 'ui-monospace, monospace' }}>
                          {rec.employeeCode || 'EMP-001'}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '16px 14px', color: TEXT_MAIN, fontWeight: 600, whiteSpace: 'nowrap', fontSize: 13 }}>
                        {formatDateDisplay(rec.date)}
                      </td>

                      {/* Day */}
                      <td style={{ padding: '16px 14px', color: TEXT_MUTED, whiteSpace: 'nowrap', fontWeight: 500, fontSize: 13 }}>
                        {rec.day}
                      </td>

                      {/* Start Time */}
                      <td style={{ padding: '16px 14px', fontWeight: 700, color: isNotStarted ? '#94a3b8' : '#047857', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {rec.startTimeFormatted || '—'}
                      </td>

                      {/* End Time */}
                      <td style={{ padding: '16px 14px', fontWeight: 700, color: rec.endTimeFormatted === '—' ? '#94a3b8' : '#1d4ed8', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {rec.endTimeFormatted || '—'}
                      </td>

                      {/* Total Attendance */}
                      <td style={{ padding: '16px 14px', whiteSpace: 'nowrap' }}>
                        {rec.status === 'ON_DUTY' ? (
                          <span style={{ color: '#047857', fontWeight: 800, fontFamily: 'ui-monospace, monospace', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 9px', borderRadius: 8, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                            <Clock size={12} style={{ display: 'inline', marginRight: 3 }} />{liveTimes.totalAttendance}
                          </span>
                        ) : rec.status === 'ON_BREAK' ? (
                          <span style={{ color: '#b45309', fontWeight: 800, fontFamily: 'ui-monospace, monospace', background: '#fffbeb', border: '1px solid #fde68a', padding: '4px 9px', borderRadius: 8, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                            <Clock size={12} style={{ display: 'inline', marginRight: 3 }} />{liveTimes.totalAttendance}
                          </span>
                        ) : (
                          <span style={{ color: isNotStarted ? '#94a3b8' : '#1e293b', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {normalizeDurationStr(rec.durationFormatted) || '—'}
                          </span>
                        )}
                      </td>

                      {/* Break Count */}
                      <td style={{ padding: '16px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {isNotStarted ? (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        ) : breakCount > 0 ? (
                          <button
                            onClick={() => setBreakModalRecord(rec)}
                            title="Click to view break breakdown"
                            style={{
                              background: '#fffbeb',
                              border: '1px solid #fde68a',
                              color: '#b45309',
                              padding: '3px 10px',
                              borderRadius: 14,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                            }}
                          >
                            <Coffee size={12} /> {breakCount}
                          </button>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: 12.5, fontWeight: 600 }}>0</span>
                        )}
                      </td>

                      {/* Total Break Time */}
                      <td style={{ padding: '16px 14px', whiteSpace: 'nowrap' }}>
                        {rec.status === 'ON_BREAK' ? (
                          <span style={{ color: '#d97706', fontWeight: 800, fontFamily: 'ui-monospace, monospace', background: '#fffbeb', border: '1px solid #fde68a', padding: '4px 9px', borderRadius: 8, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                            <Coffee size={12} style={{ display: 'inline', marginRight: 3 }} />{liveTimes.totalBreak}
                          </span>
                        ) : isNotStarted ? (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        ) : (
                          <span style={{ color: breakCount > 0 ? '#b45309' : '#64748b', fontWeight: breakCount > 0 ? 700 : 500, fontVariantNumeric: 'tabular-nums' }}>
                            {normalizeDurationStr(rec.formattedBreakDuration) || '00h 00m'}
                          </span>
                        )}
                      </td>

                      {/* Actual Working Hours */}
                      <td style={{ padding: '16px 14px', whiteSpace: 'nowrap' }}>
                        {rec.status === 'ON_DUTY' ? (
                          <span style={{ color: '#047857', fontWeight: 800, fontFamily: 'ui-monospace, monospace', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: 8, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                            <Zap size={12} style={{ display: 'inline', marginRight: 3 }} />{liveTimes.actualWork}
                          </span>
                        ) : rec.status === 'ON_BREAK' ? (
                          <span style={{ color: '#b45309', fontWeight: 800, fontFamily: 'ui-monospace, monospace', background: '#fffbeb', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: 8, fontSize: 13, fontVariantNumeric: 'tabular-nums' }} title="Working timer paused while on break">
                            <Clock size={12} style={{ display: 'inline', marginRight: 3 }} />{liveTimes.actualWork}
                          </span>
                        ) : isNotStarted ? (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        ) : (
                          <span style={{ color: '#1d4ed8', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                            {normalizeDurationStr(rec.formattedActualWork || rec.durationFormatted) || '00h 00m'}
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '16px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 11px',
                            borderRadius: 16,
                            fontSize: 12,
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: badge.dot }} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions Column (Properly Spaced Buttons) */}
                      <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          {/* Button 1: Breaks Button */}
                          {!isNotStarted && (
                            <button
                              onClick={() => setBreakModalRecord(rec)}
                              title="View full break details breakdown"
                              style={{
                                height: 32,
                                background: '#fffbeb',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                borderRadius: 8,
                                padding: '0 10px',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                transition: 'all 0.15s',
                              }}
                            >
                              <Coffee size={12} /> Breaks
                            </button>
                          )}

                          {/* Button 2: Map Button */}
                          {(rec.latestLocation?.latitude || rec.startLocation?.latitude || rec.status === 'ON_DUTY' || rec.status === 'ON_BREAK') && (
                            <button
                              onClick={() => setMapModalRecord(rec)}
                              title="View GPS location on map"
                              style={{
                                height: 32,
                                background: '#f0f9ff',
                                color: '#0284c7',
                                border: '1px solid #bae6fd',
                                borderRadius: 8,
                                padding: '0 10px',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                transition: 'all 0.15s',
                              }}
                            >
                              <MapPin size={12} /> Map
                            </button>
                          )}

                          {/* Button 3: Details Button */}
                          {!isNotStarted && (
                            <button
                              onClick={() => setDetailModalRecord(rec)}
                              title="View complete record details"
                              style={{
                                height: 32,
                                background: '#f8fafc',
                                color: '#334155',
                                border: `1px solid ${BORDER}`,
                                borderRadius: 8,
                                padding: '0 10px',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                transition: 'all 0.15s',
                              }}
                            >
                              <FileText size={12} /> Details
                            </button>
                          )}
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

      {/* ──── 5. View Break Details Modal ────────────────────────────────────────────────────────────────────────────── */}
      {breakModalRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: 28,
              width: '100%',
              maxWidth: 660,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309', fontSize: 22, border: '1px solid #fde68a' }}>
                  <Coffee size={22} color="#b45309" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: TEXT_MAIN }}>
                    Break Details — {breakModalRecord.employeeName}
                  </h3>
                  <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 2 }}>
                    {breakModalRecord.employeeCode} • {formatDateDisplay(breakModalRecord.date)} ({breakModalRecord.day})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setBreakModalRecord(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: TEXT_MUTED, padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            {/* Summary Stat Chips (4 metrics) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase' }}>Total Attendance</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0369a1', marginTop: 3 }}>
                  {normalizeDurationStr(breakModalRecord.durationFormatted) || '—'}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase' }}>Total Breaks</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#b45309', marginTop: 3 }}>
                  {breakModalRecord.breakCount || breakModalRecord.breaks?.length || 0}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase' }}>Total Break Time</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#d97706', marginTop: 3 }}>
                  {normalizeDurationStr(breakModalRecord.formattedBreakDuration) || '00h 00m'}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase' }}>Actual Working</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#047857', marginTop: 3 }}>
                  {normalizeDurationStr(breakModalRecord.formattedActualWork || breakModalRecord.durationFormatted) || '00h 00m'}
                </div>
              </div>
            </div>

            {/* Breaks Table */}
            <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${BORDER}`, borderRadius: 12, marginBottom: 20 }}>
              {!Array.isArray(breakModalRecord.breaks) || breakModalRecord.breaks.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: TEXT_MUTED }}>
                  <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><Coffee size={32} color="#d97706" /></div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_MAIN }}>No breaks recorded</div>
                  <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 3 }}>
                    The employee did not record any breaks during this attendance session.
                  </div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `1.5px solid ${BORDER}`, color: TEXT_MUTED, textTransform: 'uppercase', fontSize: 11.5 }}>
                      <th style={{ padding: '11px 16px', textAlign: 'left' }}>Break #</th>
                      <th style={{ padding: '11px 14px', textAlign: 'left' }}>Start Time</th>
                      <th style={{ padding: '11px 14px', textAlign: 'left' }}>End Time</th>
                      <th style={{ padding: '11px 14px', textAlign: 'left' }}>Duration</th>
                      <th style={{ padding: '11px 16px', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakModalRecord.breaks.map((b, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '11px 16px', fontWeight: 700, color: '#1e293b' }}>
                          Break #{b.breakNumber || idx + 1}
                        </td>
                        <td style={{ padding: '11px 14px', color: '#047857', fontWeight: 700 }}>
                          {formatTime12h(b.startTime)}
                        </td>
                        <td style={{ padding: '11px 14px', color: b.endTime ? '#1d4ed8' : '#d97706', fontWeight: 700 }}>
                          {b.endTime ? formatTime12h(b.endTime) : 'Active (Ongoing)'}
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 700, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                          {normalizeDurationStr(b.formattedDuration) || formatDurationText(b.durationSeconds)}
                        </td>
                        <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              padding: '3px 9px',
                              borderRadius: 12,
                              background: b.status === 'ACTIVE' ? '#fffbeb' : '#ecfdf5',
                              color: b.status === 'ACTIVE' ? '#b45309' : '#047857',
                              border: `1px solid ${b.status === 'ACTIVE' ? '#fde68a' : '#a7f3d0'}`,
                            }}
                          >
                            {b.status === 'ACTIVE' ? '🟡 Active' : '✅ Completed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setBreakModalRecord(null)}
                style={{
                  padding: '9px 20px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: '#334155',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── 6. Full Record Details Modal ──────────────────────────────────────────────────────────────────────────── */}
      {detailModalRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: 28,
              width: '100%',
              maxWidth: 560,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', fontSize: 20 }}>
                  <FileText size={20} color="#0284c7" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: TEXT_MAIN }}>
                    {detailModalRecord.employeeName}
                  </h3>
                  <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 2 }}>
                    {detailModalRecord.employeeCode} • {formatDateDisplay(detailModalRecord.date)} ({detailModalRecord.day})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDetailModalRecord(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: TEXT_MUTED }}
              >
                ✕
              </button>
            </div>

            {/* Timings, Duration, Breaks & Actual Work */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase' }}>Start Time</div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: '#047857', marginTop: 3 }}>
                  {detailModalRecord.startTimeFormatted || '—'}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase' }}>End Time</div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: detailModalRecord.endTimeFormatted === '—' ? '#94a3b8' : '#1d4ed8', marginTop: 3 }}>
                  {detailModalRecord.endTimeFormatted || '—'}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase' }}>Total Attendance</div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0284c7', marginTop: 3 }}>
                  {normalizeDurationStr(detailModalRecord.durationFormatted) || '—'}
                </div>
              </div>
            </div>

            {/* Break & Net Work Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
              <div style={{ background: '#fffbeb', padding: '12px 14px', borderRadius: 10, border: '1px solid #fde68a' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
                  ☕ Breaks ({detailModalRecord.breakCount || detailModalRecord.breaks?.length || 0})
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#d97706', marginTop: 3 }}>
                  {normalizeDurationStr(detailModalRecord.formattedBreakDuration) || '00h 00m'}
                </div>
              </div>
              <div style={{ background: '#ecfdf5', padding: '12px 14px', borderRadius: 10, border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>⚡ Actual Work Hours</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#047857', marginTop: 3 }}>
                  {normalizeDurationStr(detailModalRecord.formattedActualWork || detailModalRecord.durationFormatted) || '00h 00m'}
                </div>
              </div>
            </div>

            {/* Locations Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {/* Start Location */}
              <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', marginBottom: 4 }}>
                  📍 Starting Location
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_MAIN }}>
                  {detailModalRecord.startLocation?.road || 'Vijayawada, AP'}
                </div>
                {detailModalRecord.startLocation?.area && (
                  <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                    Area: {detailModalRecord.startLocation.area}, {detailModalRecord.startLocation.city}
                  </div>
                )}
                {detailModalRecord.startLocation?.latitude && (
                  <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>
                    GPS: {detailModalRecord.startLocation.latitude.toFixed(6)}, {detailModalRecord.startLocation.longitude.toFixed(6)} (Accuracy ±{Math.round(detailModalRecord.startLocation.accuracy || 5)}m)
                  </div>
                )}
              </div>

              {/* Latest / End Location */}
              <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: detailModalRecord.status === 'ON_DUTY' ? '#047857' : '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
                  {detailModalRecord.status === 'ON_DUTY' ? '🟢 Current Live Location' : '📍 Final Recorded Location'}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_MAIN }}>
                  {detailModalRecord.latestLocation?.road || detailModalRecord.endLocation?.road || 'Vijayawada, AP'}
                </div>
                {(detailModalRecord.latestLocation?.area || detailModalRecord.endLocation?.area) && (
                  <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                    Area: {detailModalRecord.latestLocation?.area || detailModalRecord.endLocation?.area}, {detailModalRecord.latestLocation?.city || 'Vijayawada'}
                  </div>
                )}
                {detailModalRecord.latestLocation?.latitude && (
                  <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>
                    GPS: {detailModalRecord.latestLocation.latitude.toFixed(6)}, {detailModalRecord.latestLocation.longitude.toFixed(6)}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setDetailModalRecord(null)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: '#334155',
                }}
              >
                Close
              </button>
              {(detailModalRecord.latestLocation?.latitude || detailModalRecord.startLocation?.latitude) && (
                <button
                  onClick={() => {
                    const r = detailModalRecord;
                    setDetailModalRecord(null);
                    setMapModalRecord(r);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: GRADIENT,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <><MapPin size={13} /> View on Map</>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──── 7. Full Employee History Modal ──────────────────────────────────────────────────────────────────────── */}
      {historyModalEmployee && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: 28,
              width: '100%',
              maxWidth: 820,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: TEXT_MAIN }}>
                  {employeeHistoryData?.employee?.name || 'Employee'} — Complete Attendance Log
                </h3>
                <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 2 }}>
                  {employeeHistoryData?.employee?.employeeCode} • {employeeHistoryData?.employee?.email}
                </div>
              </div>
              <button
                onClick={() => {
                  setHistoryModalEmployee(null);
                  setEmployeeHistoryData(null);
                }}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: TEXT_MUTED }}
              >
                ✕
              </button>
            </div>

            {/* Overall Employee Stats (4 Cards) */}
            {employeeHistoryData?.stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED }}>Total Days Logged</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0284c7', marginTop: 2 }}>
                    {employeeHistoryData.stats.totalDays}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED }}>Completed Days</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#047857', marginTop: 2 }}>
                    {employeeHistoryData.stats.completedDays}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED }}>Total Actual Work</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8', marginTop: 2 }}>
                    {employeeHistoryData.stats.totalHours}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED }}>Total Break Hours</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706', marginTop: 2 }}>
                    {employeeHistoryData.stats.totalBreakHours || '0.0 hrs'}
                  </div>
                </div>
              </div>
            )}

            {/* History Table */}
            <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${BORDER}`, borderRadius: 12 }}>
              {historyLoading ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: TEXT_MUTED, fontSize: 13.5 }}>
                  Loading employee attendance history...
                </div>
              ) : !employeeHistoryData?.records?.length ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: TEXT_MUTED, fontSize: 13.5 }}>
                  No past attendance history recorded yet for this employee.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `1.5px solid ${BORDER}`, color: TEXT_MUTED, textTransform: 'uppercase', fontSize: 11.5 }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Day</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Start</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>End</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Total Span</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Breaks</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Actual Work</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeHistoryData.records.map((r) => {
                      const b = getStatusBadge(r.status);
                      return (
                        <tr key={r._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600 }}>{formatDateDisplay(r.date)}</td>
                          <td style={{ padding: '10px 14px', color: TEXT_MUTED }}>{r.day}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700 }}>{r.startTimeFormatted}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700 }}>{r.endTimeFormatted}</td>
                          <td style={{ padding: '10px 14px' }}>{normalizeDurationStr(r.formattedDuration) || '—'}</td>
                          <td style={{ padding: '10px 14px', color: '#b45309', fontWeight: 600 }}>
                            {r.breakCount > 0 ? `${r.breakCount} (${normalizeDurationStr(r.formattedBreakDuration) || '00h 00m'})` : '0'}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#047857' }}>
                            {normalizeDurationStr(r.formattedActualWork || r.formattedDuration) || '—'}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: b.color, background: b.bg, padding: '3px 8px', borderRadius: 12, border: `1px solid ${b.border}` }}>
                              {b.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──── 8. View on Map Modal ──────────────────────────────────────────────────────────────────────────────────────────── */}
      {mapModalRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 960,
              height: '82vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 24px',
                borderBottom: `1px solid ${BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={20} color="#0284c7" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: TEXT_MAIN }}>
                    {mapModalRecord.employeeName} — Location & Route
                  </h4>
                  <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 1 }}>
                    {mapModalRecord.employeeCode} • {mapModalRecord.latestLocation?.road || mapModalRecord.startLocation?.road || 'Vijayawada'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => {
                    navigate('/admin/employee-tracking');
                  }}
                  style={{
                    background: GRADIENT,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '7px 14px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Open in Live Field Tracking →
                </button>
                <button
                  onClick={() => setMapModalRecord(null)}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: TEXT_MUTED }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Embedded Live Map Component */}
            <div style={{ flex: 1, position: 'relative' }}>
              <LiveMap
                employees={[
                  {
                    _id: mapModalRecord.employeeId,
                    employeeId: mapModalRecord.employeeId,
                    name: mapModalRecord.employeeName,
                    location: mapModalRecord.latestLocation || mapModalRecord.startLocation || {
                      latitude: 16.499614,
                      longitude: 80.648500,
                      trackingStatus: mapModalRecord.status === 'ON_DUTY' ? 'MOVING' : 'STOPPED',
                    },
                  },
                ]}
                selectedEmployeeId={mapModalRecord.employeeId}
                showRouteTrail={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
