import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { attendanceAPI, trackingAPI, usersAPI } from '../../services/api';
import geoTracker from '../../services/geoTracker';
import LiveMap from '../../components/tracking/LiveMap';
import { isManagingDirector } from '../../utils/permissions';
import SplitText from '../../components/ui/SplitText';
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
  Play,
  Square,
  AlertCircle,
  AlertTriangle,
  Timer,
  Loader2,
  Sparkles,
  ShieldCheck,
  ArrowUpRight,
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
  const isMD = isManagingDirector(user);

  // Live Personal Attendance Session state (Start / Break / Resume / Stop)
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // 'START' | 'BREAK' | 'RESUME' | 'STOP' | null
  const [actionStatusMsg, setActionStatusMsg] = useState(null); // { type: 'success' | 'error', message: string }
  const [nineHourWarningModal, setNineHourWarningModal] = useState(null); // { open: boolean, completedHms: string, remainingHms: string, percent: number }

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

  // Live clock tick every second for real-time timers in card and table
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch current user's live active attendance session
  const fetchCurrentSession = useCallback(async () => {
    try {
      setSessionLoading(true);
      const res = await attendanceAPI.getCurrentStatus();
      if (res.data?.ok) {
        setCurrentSession(res.data);
      }
    } catch (err) {
      console.warn('[Fetch Current Attendance Error]:', err.message);
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentSession();
  }, [fetchCurrentSession]);

  // Fetch all active system users for Managing Director's employee dropdown
  useEffect(() => {
    if (!isMD) return;
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
  }, [isMD]);

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
          avatar: r.avatar || '',
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
          avatar: u.avatar || '',
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

  // Action Handlers for Live Personal Attendance (Start / Break / Resume / Stop)
  const handleStartAttendance = async () => {
    try {
      setActionLoading('START');
      setActionStatusMsg(null);
      let location = { latitude: null, longitude: null, accuracy: null, platform: navigator.platform || 'web' };
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location.latitude = pos.coords.latitude;
          location.longitude = pos.coords.longitude;
          location.accuracy = pos.coords.accuracy;
        } catch (geoErr) {
          console.warn('Geolocation fallback:', geoErr.message);
        }
      }
      const res = await attendanceAPI.start(location);
      if (res.data?.ok) {
        setActionStatusMsg({ type: 'success', message: 'Attendance started successfully! Live timer running.' });
        geoTracker.startTracking().catch((err) => console.warn('[Attendance GeoTracker start]:', err.message));
        window.dispatchEvent(new CustomEvent('attendance-updated', { detail: res.data.attendance }));
        await fetchCurrentSession();
        await fetchData();
      } else {
        setActionStatusMsg({ type: 'error', message: res.data?.message || 'Failed to start attendance.' });
      }
    } catch (err) {
      setActionStatusMsg({ type: 'error', message: err.response?.data?.message || err.message || 'Error starting attendance.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartBreak = async () => {
    try {
      setActionLoading('BREAK');
      setActionStatusMsg(null);
      const res = await attendanceAPI.startBreak({ reason: 'General Break' });
      if (res.data?.ok) {
        setActionStatusMsg({ type: 'success', message: 'Break started and autosaved to MongoDB!' });
        await fetchCurrentSession();
        await fetchData();
      } else {
        setActionStatusMsg({ type: 'error', message: res.data?.message || 'Failed to start break.' });
      }
    } catch (err) {
      setActionStatusMsg({ type: 'error', message: err.response?.data?.message || err.message || 'Error starting break.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeBreak = async () => {
    try {
      setActionLoading('RESUME');
      setActionStatusMsg(null);
      const res = await attendanceAPI.resumeBreak();
      if (res.data?.ok) {
        setActionStatusMsg({ type: 'success', message: 'Resumed work! Break saved to MongoDB & timer continued.' });
        await fetchCurrentSession();
        await fetchData();
      } else {
        setActionStatusMsg({ type: 'error', message: res.data?.message || 'Failed to resume work.' });
      }
    } catch (err) {
      setActionStatusMsg({ type: 'error', message: err.response?.data?.message || err.message || 'Error resuming work.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopAttendance = async (overrideOptions = {}) => {
    // 9 Hours Validation Check: 9 * 3600 = 32,400 seconds
    const NINE_HOURS_SEC = 9 * 3600;
    const currentTotalSec = liveSessionMetrics.totalLoginSec || 0;

    if (currentTotalSec < NINE_HOURS_SEC && !overrideOptions.force) {
      const remainingSec = NINE_HOURS_SEC - currentTotalSec;
      const remHours = Math.floor(remainingSec / 3600);
      const remMins = Math.floor((remainingSec % 3600) / 60);
      const remSecs = remainingSec % 60;
      const remHms = `${String(remHours).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;

      // Open confirmation modal for all users with early end access
      setNineHourWarningModal({
        open: true,
        completedHms: liveSessionMetrics.totalHms,
        remainingHms: remHms,
        percent: liveSessionMetrics.percentToNineHours,
      });

      return;
    }

    if (!overrideOptions.force && !window.confirm('Are you sure you want to end your attendance session for today?')) return;
    try {
      setActionLoading('STOP');
      setActionStatusMsg(null);
      let location = { latitude: null, longitude: null, accuracy: null };
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location.latitude = pos.coords.latitude;
          location.longitude = pos.coords.longitude;
          location.accuracy = pos.coords.accuracy;
        } catch (geoErr) {}
      }
      const res = await attendanceAPI.stop({ ...location, force: overrideOptions.force || false });
      if (res.data?.ok) {
        setActionStatusMsg({
          type: 'success',
          message: overrideOptions.force
            ? 'Attendance ended early and recorded successfully.'
            : 'Attendance completed and saved successfully.'
        });
        geoTracker.stopTracking().catch((err) => console.warn('[Attendance GeoTracker stop]:', err.message));
        window.dispatchEvent(new CustomEvent('attendance-updated', { detail: res.data.attendance }));
        setNineHourWarningModal(null);
        await fetchCurrentSession();
        await fetchData();
      } else {
        setActionStatusMsg({ type: 'error', message: res.data?.message || 'Failed to end attendance.' });
      }
    } catch (err) {
      setActionStatusMsg({ type: 'error', message: err.response?.data?.message || err.message || 'Error ending attendance.' });
    } finally {
      setActionLoading(null);
    }
  };

  // Derive live real-time countdown / work timer for the personal session
  const liveSessionMetrics = useMemo(() => {
    const sessionData = currentSession?.attendance;
    const sessionStatus = currentSession?.status || 'NOT_STARTED';
    const NINE_HOURS_SEC = 9 * 3600; // 32,400 seconds = 09:00:00
    const ONE_HOUR_BREAK_SEC = 1 * 3600; // 3,600 seconds = 01:00:00

    if (!sessionData || sessionStatus === 'NOT_STARTED' || !sessionData.startTime) {
      return {
        status: 'NOT_STARTED',
        workHms: '00:00:00',
        breakHms: '00:00:00',
        totalHms: '00:00:00',
        totalLoginSec: 0,
        isNineHoursComplete: false,
        remainingLoginSec: NINE_HOURS_SEC,
        remainingHms: '09:00:00',
        percentToNineHours: 0,
        completedBreaksSec: 0,
        isBreakOverOneHour: false,
        breakRemainingHms: '01:00:00',
        breakCount: 0,
        activeBreakDurationHms: '00:00:00',
        startTimeFormatted: '—',
        endTimeFormatted: '—',
      };
    }

    const startMs = new Date(sessionData.startTime).getTime();
    const breaks = Array.isArray(sessionData.breaks) ? sessionData.breaks : [];
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

    const startTimeFormatted = formatTime12h(sessionData.startTime);

    // If attendance is COMPLETED for the day, freeze all timer calculations completely
    if (sessionStatus === 'COMPLETED') {
      const endMs = sessionData.endTime ? new Date(sessionData.endTime).getTime() : startMs;
      const totalSessionSec = sessionData.durationSeconds != null && sessionData.durationSeconds > 0
        ? sessionData.durationSeconds
        : Math.max(0, Math.floor((endMs - startMs) / 1000));
      const totalBreakSec = sessionData.totalBreakSeconds != null
        ? sessionData.totalBreakSeconds
        : completedBreaksSec;
      const finalWorkSec = sessionData.actualWorkSeconds != null && sessionData.actualWorkSeconds > 0
        ? sessionData.actualWorkSeconds
        : Math.max(0, totalSessionSec - totalBreakSec);
      const isNineHoursComplete = totalSessionSec >= NINE_HOURS_SEC;
      const percentToNineHours = Math.min(100, Math.round((totalSessionSec / NINE_HOURS_SEC) * 100));
      const isBreakOverOneHour = totalBreakSec > ONE_HOUR_BREAK_SEC;

      return {
        status: 'COMPLETED',
        workHms: formatHms(finalWorkSec),
        breakHms: formatHms(totalBreakSec),
        totalHms: formatHms(totalSessionSec),
        totalLoginSec: totalSessionSec,
        isNineHoursComplete,
        remainingLoginSec: 0,
        remainingHms: '00:00:00',
        percentToNineHours,
        completedBreaksSec: totalBreakSec,
        isBreakOverOneHour,
        breakRemainingHms: formatHms(Math.max(0, ONE_HOUR_BREAK_SEC - totalBreakSec)),
        breakCount: breaks.length,
        activeBreakDurationHms: '00:00:00',
        startTimeFormatted,
        endTimeFormatted: formatTime12h(sessionData.endTime),
      };
    }

    const totalElapsedSec = Math.max(0, Math.floor((currentNow - startMs) / 1000));
    const totalLoginSec = totalElapsedSec;
    const isNineHoursComplete = totalLoginSec >= NINE_HOURS_SEC;
    const remainingLoginSec = Math.max(0, NINE_HOURS_SEC - totalLoginSec);
    const remainingHms = formatHms(remainingLoginSec);
    const percentToNineHours = Math.min(100, Math.round((totalLoginSec / NINE_HOURS_SEC) * 100));
    const isBreakOverOneHour = completedBreaksSec > ONE_HOUR_BREAK_SEC;
    const breakRemainingHms = formatHms(Math.max(0, ONE_HOUR_BREAK_SEC - completedBreaksSec));

    if (sessionStatus === 'ON_BREAK' && activeBreakObj) {
      const activeBreakStartMs = new Date(activeBreakObj.startTime).getTime();
      const curBreakSec = Math.max(0, Math.floor((currentNow - activeBreakStartMs) / 1000));
      const totalBreakSec = completedBreaksSec + curBreakSec;
      const workSecAtBreakStart = Math.max(0, Math.floor((activeBreakStartMs - startMs) / 1000) - completedBreaksSec);

      return {
        status: 'ON_BREAK',
        workHms: formatHms(workSecAtBreakStart),
        breakHms: formatHms(totalBreakSec),
        totalHms: formatHms(totalElapsedSec),
        totalLoginSec,
        isNineHoursComplete,
        remainingLoginSec,
        remainingHms,
        percentToNineHours,
        completedBreaksSec: totalBreakSec,
        isBreakOverOneHour: totalBreakSec > ONE_HOUR_BREAK_SEC,
        breakRemainingHms: formatHms(Math.max(0, ONE_HOUR_BREAK_SEC - totalBreakSec)),
        breakCount: breaks.length,
        activeBreakDurationHms: formatHms(curBreakSec),
        startTimeFormatted,
      };
    }

    // ON_DUTY: live incrementing work time
    const netWorkSec = Math.max(0, totalElapsedSec - completedBreaksSec);
    return {
      status: 'ON_DUTY',
      workHms: formatHms(netWorkSec),
      breakHms: formatHms(completedBreaksSec),
      totalHms: formatHms(totalElapsedSec),
      totalLoginSec,
      isNineHoursComplete,
      remainingLoginSec,
      remainingHms,
      percentToNineHours,
      completedBreaksSec,
      isBreakOverOneHour,
      breakRemainingHms,
      breakCount: breaks.length,
      activeBreakDurationHms: '00:00:00',
      startTimeFormatted,
    };
  }, [currentSession, currentNow]);

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
          bg: '#eff6ff',
          color: '#1d4ed8',
          border: '#bfdbfe',
          dot: '#2563eb',
          label: 'On Duty',
          
        };
      case 'ON_BREAK':
        return {
          bg: '#fff7ed',
          color: '#c2410c',
          border: '#fed7aa',
          dot: '#f97316',
          label: 'On Break',
          
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
          color: '#ea580c',
          border: '#fed7aa',
          dot: '#ea580c',
          label: 'Incomplete',
          icon: '⚠️',
        };
      case 'NOT_STARTED':
      default:
        return {
          bg: '#ffffff',
          color: '#64748b',
          border: '#e2e8f0',
          dot: '#94a3b8',
          label: 'Not Started',
          
        };
    }
  };

  // Fast map of employee avatars from system users or records
  const userAvatarMap = useMemo(() => {
    const map = new Map();
    systemUsers.forEach((u) => {
      const uid = u._id?.toString() || u.id?.toString();
      if (uid && u.avatar) map.set(uid, u.avatar);
    });
    records.forEach((r) => {
      if (r.employeeId && r.avatar) map.set(r.employeeId.toString(), r.avatar);
    });
    if (user?._id && user?.avatar) {
      map.set(user._id.toString(), user.avatar);
    }
    return map;
  }, [systemUsers, records, user]);

  // Universal sharp employee avatar renderer with picture and fallback initials
  const renderEmployeeAvatar = (recOrEmp, size = 36, showStatusDot = false) => {
    const name = recOrEmp?.employeeName || recOrEmp?.name || 'Staff';
    const id = (recOrEmp?.employeeId || recOrEmp?.id || recOrEmp?._id || '')?.toString();
    const avatarUrl = recOrEmp?.avatar || userAvatarMap.get(id) || (id === user?._id?.toString() ? user?.avatar : '');
    const firstLetter = (name.charAt(0) || 'E').toUpperCase();
    const status = recOrEmp?.status || 'NOT_STARTED';
    const badge = getStatusBadge(status);

    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1.5px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(37,99,235,0.08)',
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextSibling) {
                  e.currentTarget.nextSibling.style.display = 'flex';
                }
              }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : null}
          <div
            style={{
              display: avatarUrl ? 'none' : 'flex',
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: Math.max(11, Math.round(size * 0.38)),
              color: '#1d4ed8',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            }}
          >
            {firstLetter}
          </div>
        </div>
        {showStatusDot && (
          <span
            title={badge.label}
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: Math.max(8, Math.round(size * 0.28)),
              height: Math.max(8, Math.round(size * 0.28)),
              borderRadius: '50%',
              background: badge.dot,
              border: '2px solid #ffffff',
              boxShadow: '0 0 4px rgba(0,0,0,0.15)',
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="attendance-records-outer" style={{ padding: '12px 18px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, width: '100%', boxSizing: 'border-box' }}>
      <style>{`
        @media (max-width: 1200px) {
          .attendance-records-outer { padding: 10px 14px !important; }
          .attendance-kpi-grid { grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)) !important; gap: 10px !important; }
        }
        @media (max-width: 900px) {
          .attendance-top-header { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; padding: 14px 16px !important; }
          .attendance-live-card-body { flex-direction: column !important; align-items: stretch !important; gap: 14px !important; }
          .attendance-stopwatch-hud { min-width: 0 !important; width: 100% !important; }
          .attendance-actions-wrap { justify-content: flex-start !important; }
          .attendance-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
        }
        @media (max-width: 640px) {
          .attendance-records-outer { padding: 8px 10px !important; gap: 12px !important; }
          .attendance-kpi-grid { grid-template-columns: 1fr !important; }
          .attendance-filters-row { flex-direction: column !important; align-items: stretch !important; }
          .attendance-search-box { min-width: 0 !important; width: 100% !important; }
          .attendance-table-wrap { border-radius: 10px !important; }
        }
      `}</style>
      
      {/* ──── 1. Top Header & Title Bar ────────────────────────────────────────────────────────────────────────────────── */}
      <div
        className="attendance-top-header"
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
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
            }}
          >
            <Clock size={22} color="#2563eb" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.015em' }}>
              My Attendance & Timesheet
            </h2>
            <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={13} color="#2563eb" /> {isRangeMode ? `${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}` : formatHeaderDate(selectedDate)}
              </span>
              {!isRangeMode && selectedDate === getTodayIso() && (
                <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 12 }}>
                  Today
                </span>
              )}
              <span style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 12 }}>
                {user?.displayName || user?.designation || 'Staff'} • {user?.name}
              </span>
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

      {/* ──── 1.5. Live Interactive Attendance & Action Card (White, Orange, Blue Theme) ──── */}
      <div
        className="attendance-live-card"
        style={{
          background: liveSessionMetrics.status === 'ON_BREAK'
            ? 'linear-gradient(135deg, #ffffff 0%, #fffbf7 40%, #fff7ed 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: 18,
          border: `2px solid ${liveSessionMetrics.status === 'ON_BREAK' ? '#fdba74' : '#bfdbfe'}`,
          boxShadow: liveSessionMetrics.status === 'ON_BREAK'
            ? '0 10px 28px -4px rgba(249, 115, 22, 0.14), 0 0 0 1px rgba(251, 146, 60, 0.15)'
            : '0 8px 20px -5px rgba(37, 99, 235, 0.08), 0 2px 6px rgba(0, 0, 0, 0.02)',
          padding: '18px 22px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Decorative Orange & Blue glowing accent top bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: liveSessionMetrics.status === 'ON_BREAK'
              ? 'linear-gradient(90deg, #ea580c 0%, #f97316 45%, #fb923c 80%, #38bdf8 100%)'
              : 'linear-gradient(90deg, #f97316 0%, #38bdf8 50%, #2563eb 100%)',
          }}
        />

        <div className="attendance-live-card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          
          {/* Left: User Identity & Profile Picture & Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {renderEmployeeAvatar({ ...user, employeeName: user?.name, status: liveSessionMetrics.status }, 50, true)}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {liveSessionMetrics.status === 'ON_BREAK' ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <SplitText
                      text="Break In Progress"
                      className="break-in-progress-title"
                      delay={40}
                      duration={0.8}
                      ease="power3.out"
                      style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#ea580c',
                        letterSpacing: '-0.015em',
                        display: 'inline-block',
                      }}
                    />
                  </div>
                ) : (
                  <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, color: TEXT_MAIN, letterSpacing: '-0.01em' }}>
                    {liveSessionMetrics.status === 'ON_DUTY'
                      ? 'Active Work Shift'
                      : liveSessionMetrics.status === 'COMPLETED'
                      ? 'Shift Completed'
                      : 'Attendance Session'}
                  </h3>
                )}

                {/* Status Indicator Pill */}
                {liveSessionMetrics.status === 'ON_DUTY' && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 20,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563eb', display: 'inline-block', boxShadow: '0 0 8px #2563eb' }} />
                    Live On Duty
                  </span>
                )}
                {liveSessionMetrics.status === 'ON_BREAK' && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#fff7ed',
                    color: '#ea580c',
                    border: '1px solid #fed7aa',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 20,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f97316', display: 'inline-block', boxShadow: '0 0 8px #f97316' }} />
                    Paused On Break (Autosaved)
                  </span>
                )}
                {liveSessionMetrics.status === 'COMPLETED' && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 20,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}>
                    <CheckCircle2 size={12} color="#2563eb" />
                    Completed
                  </span>
                )}
                {liveSessionMetrics.status === 'NOT_STARTED' && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 20,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}>
                    Ready to Start
                  </span>
                )}
              </div>

              <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 3, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <span>Employee: <strong style={{ color: TEXT_MAIN }}>{user?.name || 'Staff'}</strong></span>
                <span>•</span>
                <span>Role: <strong style={{ color: '#ea580c' }}>{user?.displayName || user?.designation || 'Team Member'}</strong></span>
                {liveSessionMetrics.startTimeFormatted !== '—' && (
                  <>
                    <span>•</span>
                    <span>Clock In: <strong style={{ color: '#2563eb', fontVariantNumeric: 'tabular-nums' }}>{liveSessionMetrics.startTimeFormatted}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Center / Main: High-Tech Digital Stopwatch HUD (Hours : Min : Sec) */}
          <div
            className="attendance-stopwatch-hud"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff',
              border: `1.5px solid ${liveSessionMetrics.status === 'ON_BREAK' ? '#fed7aa' : '#bfdbfe'}`,
              borderRadius: 14,
              padding: '10px 22px',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02), 0 2px 8px rgba(0,0,0,0.03)',
              minWidth: 230,
            }}
          >
            <div style={{
              fontSize: 10.5,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: liveSessionMetrics.status === 'ON_BREAK' ? '#ea580c' : '#2563eb',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}>
              {liveSessionMetrics.status === 'ON_BREAK' ? (
                <><Coffee size={12} /> Work Timer Paused</>
              ) : liveSessionMetrics.status === 'ON_DUTY' ? (
                <><Activity size={12} /> Live Work Timer</>
              ) : (
                <><Clock size={12} /> Total Working Hours</>
              )}
            </div>

            {/* Live 00:00:00 Counter - Sharp Tabular Numbers */}
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: 'clamp(26px, 3.2vw, 38px)',
                fontWeight: 800,
                letterSpacing: '0.04em',
                lineHeight: 1.1,
                marginTop: 3,
                fontVariantNumeric: 'tabular-nums',
                color: liveSessionMetrics.status === 'ON_BREAK'
                  ? '#ea580c'
                  : liveSessionMetrics.status === 'ON_DUTY'
                  ? '#1d4ed8'
                  : '#0f172a',
                textShadow: liveSessionMetrics.status === 'ON_DUTY' ? '0 0 16px rgba(37, 99, 235, 0.18)' : 'none',
              }}
            >
              {liveSessionMetrics.workHms}
            </div>

            {/* Sub-labels: Hours / Min / Sec */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: 200,
              fontSize: 9.5,
              fontWeight: 800,
              color: TEXT_MUTED,
              letterSpacing: '0.08em',
              marginTop: 2,
              padding: '0 4px',
            }}>
              <span>HOURS</span>
              <span>MIN</span>
              <span>SEC</span>
            </div>

            {/* Active Break Banner if ON_BREAK */}
            {liveSessionMetrics.status === 'ON_BREAK' && (
              <div
                style={{
                  marginTop: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: 10,
                  padding: '3px 8px',
                  color: '#ea580c',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                <Coffee size={11} color="#ea580c" />
                <span>Break: <strong style={{ fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>{liveSessionMetrics.activeBreakDurationHms}</strong></span>
                <span style={{ fontSize: 9.5, color: '#c2410c', opacity: 0.85 }}>(Autosaved)</span>
              </div>
            )}

            {/* Daily Shift Target & Claim: 9:00:00 Hours */}
            <div style={{
              width: '100%',
              maxWidth: 240,
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px dashed #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 700 }}>
                <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Timer size={12} color="#2563eb" /> Daily Claim: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>9:00:00h</strong>
                </span>
                <span style={{ color: liveSessionMetrics.status === 'COMPLETED' || liveSessionMetrics.isNineHoursComplete ? '#16a34a' : '#ea580c', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                  {liveSessionMetrics.percentToNineHours}%
                </span>
              </div>

              {/* Animated 9-Hour Progress Bar */}
              <div style={{ width: '100%', height: 5, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                <div
                  style={{
                    width: `${liveSessionMetrics.percentToNineHours}%`,
                    height: '100%',
                    background: liveSessionMetrics.status === 'COMPLETED' || liveSessionMetrics.isNineHoursComplete
                      ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                      : 'linear-gradient(90deg, #f97316 0%, #38bdf8 50%, #2563eb 100%)',
                    borderRadius: 10,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>

              {/* Sub-status badges */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 9.5, color: '#64748b', fontWeight: 600, marginTop: 1 }}>
                <span>Login: <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{liveSessionMetrics.totalHms}</strong></span>
                <span>Break: <strong style={{ color: liveSessionMetrics.isBreakOverOneHour ? '#dc2626' : '#ea580c', fontVariantNumeric: 'tabular-nums' }}>{liveSessionMetrics.breakHms}/1h</strong></span>
                {liveSessionMetrics.status === 'COMPLETED' ? (
                  <span style={{ color: '#16a34a', fontWeight: 800 }}>✓ Shift Closed</span>
                ) : liveSessionMetrics.isNineHoursComplete ? (
                  <span style={{ color: '#16a34a', fontWeight: 800 }}>✓ Reached</span>
                ) : (
                  <span style={{ color: '#ea580c', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>-{liveSessionMetrics.remainingHms}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action Buttons (White, Orange, Blue Theme) */}
          <div className="attendance-actions-wrap" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {liveSessionMetrics.status === 'NOT_STARTED' && (
              <button
                onClick={handleStartAttendance}
                disabled={actionLoading !== null}
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 22px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: actionLoading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                {actionLoading === 'START' ? (
                  <><Loader2 size={15} className="animate-spin" /> Starting...</>
                ) : (
                  <><Play size={15} fill="#ffffff" /> Start Attendance</>
                )}
              </button>
            )}

            {liveSessionMetrics.status === 'ON_DUTY' && (
              <>
                {/* Break Button (Autosave to MongoDB - Orange) */}
                <button
                  onClick={handleStartBreak}
                  disabled={actionLoading !== null}
                  title="Pause work timer & autosave break immediately to MongoDB"
                  style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 18px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: actionLoading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {actionLoading === 'BREAK' ? (
                    <><Loader2 size={15} className="animate-spin" /> Autosaving...</>
                  ) : (
                    <><Coffee size={15} /> Break (Autosave)</>
                  )}
                </button>

                {/* End Attendance Button (White & Orange) */}
                <button
                  onClick={handleStopAttendance}
                  disabled={actionLoading !== null}
                  title="End today's attendance session"
                  style={{
                    background: '#ffffff',
                    color: '#ea580c',
                    border: '1.5px solid #fed7aa',
                    borderRadius: 10,
                    padding: '10px 18px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: actionLoading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    boxShadow: '0 2px 8px rgba(234, 88, 12, 0.08)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {actionLoading === 'STOP' ? (
                    <><Loader2 size={15} className="animate-spin" /> Ending...</>
                  ) : (
                    <><Square size={14} fill="#ea580c" /> End Attendance</>
                  )}
                </button>
              </>
            )}

            {liveSessionMetrics.status === 'ON_BREAK' && (
              <>
                {/* Resume Work Button (Blue) */}
                <button
                  onClick={handleResumeBreak}
                  disabled={actionLoading !== null}
                  title="Resume work, continue timer, and complete break in MongoDB"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 20px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: actionLoading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {actionLoading === 'RESUME' ? (
                    <><Loader2 size={15} className="animate-spin" /> Resuming...</>
                  ) : (
                    <><Play size={15} fill="#ffffff" /> Resume (Continue Timer)</>
                  )}
                </button>

                {/* End Attendance Button (White & Orange) */}
                <button
                  onClick={handleStopAttendance}
                  disabled={actionLoading !== null}
                  title="End today's attendance session directly"
                  style={{
                    background: '#ffffff',
                    color: '#ea580c',
                    border: '1.5px solid #fed7aa',
                    borderRadius: 10,
                    padding: '10px 18px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: actionLoading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    boxShadow: '0 2px 8px rgba(234, 88, 12, 0.08)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {actionLoading === 'STOP' ? (
                    <><Loader2 size={15} className="animate-spin" /> Ending...</>
                  ) : (
                    <><Square size={14} fill="#ea580c" /> End Attendance</>
                  )}
                </button>
              </>
            )}

            {liveSessionMetrics.status === 'COMPLETED' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: 10,
                  padding: '9px 16px',
                  color: '#15803d',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.08)'
                }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span>Attendance Ended for Today ({liveSessionMetrics.workHms} recorded) — Shift Closed</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Alert if action completed or failed */}
        {actionStatusMsg && (
          <div
            style={{
              marginTop: 14,
              background: actionStatusMsg.type === 'success' ? '#eff6ff' : '#fff7ed',
              border: `1px solid ${actionStatusMsg.type === 'success' ? '#bfdbfe' : '#fed7aa'}`,
              color: actionStatusMsg.type === 'success' ? '#1d4ed8' : '#ea580c',
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 12.5,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {actionStatusMsg.type === 'success' ? <CheckCircle2 size={15} color="#2563eb" /> : <AlertCircle size={15} color="#ea580c" />}
              <span>{actionStatusMsg.message}</span>
            </div>
            <button
              onClick={() => setActionStatusMsg(null)}
              style={{ background: 'none', border: 'none', color: 'currentColor', cursor: 'pointer', fontSize: 13, fontWeight: 800 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Informational Sub-Bar: Break summary & MongoDB sync confirmation */}
        <div
          style={{
            marginTop: 14,
            paddingTop: 10,
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            fontSize: 11.5,
            color: TEXT_MUTED,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span>Total Break Time: <strong style={{ color: '#ea580c', fontVariantNumeric: 'tabular-nums' }}>{liveSessionMetrics.breakHms}</strong> ({liveSessionMetrics.breakCount} breaks)</span>
            <span>•</span>
            <span>Elapsed Total: <strong style={{ color: '#2563eb', fontVariantNumeric: 'tabular-nums' }}>{liveSessionMetrics.totalHms}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#2563eb', fontWeight: 600 }}>
            <ShieldCheck size={13} color="#2563eb" />
            <span>Real-Time Sync Active</span>
          </div>
        </div>
      </div>

      {/* ──── 2. Dashboard Summary KPI Cards (Modern Card Style per Reference UI) ──── */}
      <div
        className="attendance-kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        {[
          {
            id: 'my-status',
            title: 'My Status',
            value: isMD
              ? `${summary.presentToday} Present Today`
              : summary.presentToday
              ? 'Present Today'
              : 'Not Clocked In',
            description: isMD
              ? 'Overview of all active staff logged in today across company departments.'
              : 'Your personal real-time attendance clock-in state for today\'s scheduled shift.',
            theme: 'blue',
            icon: <Users size={20} color="#2563eb" />,
            actionLabel: 'Learn more',
            filter: summary.presentToday ? 'ON_DUTY' : 'ALL',
          },
          {
            id: 'currently-on-duty',
            title: 'Currently on Duty',
            value: summary.currentlyOnDuty || 0,
            description: 'Staff members actively working and logging shift hours right now.',
            theme: 'blue',
            icon: <Activity size={20} color="#1d4ed8" />,
            actionLabel: 'Learn more',
            filter: 'ON_DUTY',
          },
          {
            id: 'currently-on-break',
            title: 'Break In Progress',
            splitText: true,
            value: summary.currentlyOnBreak || 0,
            description: 'Team members currently on break with live autosave to MongoDB.',
            theme: 'orange',
            icon: <Coffee size={20} color="#ea580c" />,
            actionLabel: 'Learn more',
            filter: 'ON_BREAK',
          },
          {
            id: 'completed',
            title: 'Completed',
            value: summary.completedAttendance || 0,
            description: 'Employees who have finalized shift duration and clocked out today.',
            theme: 'blue',
            icon: <CheckCircle2 size={20} color="#2563eb" />,
            actionLabel: 'Learn more',
            filter: 'COMPLETED',
          },
          {
            id: 'total-break-time',
            title: 'Total Break Time Today',
            value: normalizeDurationStr(summary.totalBreakTimeToday || '00h 00m'),
            description: 'Cumulative paused break duration logged across all active shifts today.',
            theme: 'orange',
            icon: <Clock size={20} color="#ea580c" />,
            actionLabel: 'Learn more',
            filter: 'ON_BREAK',
          },
        ].map((card) => {
          const isOrange = card.theme === 'orange';
          return (
            <div
              key={card.id}
              style={{
                background: '#ffffff',
                borderRadius: 18,
                border: '1px solid #f1f5f9',
                padding: '18px 18px 16px 18px',
                boxShadow: '0 3px 14px -2px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 22px -4px rgba(15, 23, 42, 0.08)';
                e.currentTarget.style.borderColor = isOrange ? '#fed7aa' : '#bfdbfe';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 3px 14px -2px rgba(15, 23, 42, 0.04)';
                e.currentTarget.style.borderColor = '#f1f5f9';
              }}
            >
              {/* Top Row: Left Rounded Squircle Icon Badge + Right Round Action */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: isOrange ? '#fff7ed' : '#eff6ff',
                    border: `1px solid ${isOrange ? '#ffedd5' : '#dbeafe'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {card.icon}
                </div>

                <div
                  onClick={() => setStatusFilter(card.filter)}
                  title="Filter records"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isOrange ? '#fff7ed' : '#eff6ff';
                    e.currentTarget.style.color = isOrange ? '#ea580c' : '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                >
                  <ArrowUpRight size={14} />
                </div>
              </div>

              {/* Middle Content: Title, Value & Description */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                  {card.splitText ? (
                    <SplitText
                      text={card.title}
                      className="card-split-title"
                      delay={45}
                      duration={0.85}
                      ease="power3.out"
                      style={{
                        fontSize: 14.5,
                        fontWeight: 600,
                        color: isOrange ? '#ea580c' : '#0f172a',
                        letterSpacing: '-0.01em',
                        display: 'inline-block',
                      }}
                    />
                  ) : (
                    card.title
                  )}
                </div>

                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: isOrange ? '#ea580c' : '#1d4ed8',
                    marginTop: 6,
                    marginBottom: 4,
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {card.value}
                </div>

                <div style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.4, marginBottom: 14, flex: 1 }}>
                  {card.description}
                </div>
              </div>

              {/* Bottom Action: "Learn more" Style Pill Button */}
              <button
                onClick={() => setStatusFilter(card.filter)}
                style={{
                  width: '100%',
                  padding: '9px 16px',
                  borderRadius: 20,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isOrange ? '#fff7ed' : '#eff6ff';
                  e.currentTarget.style.color = isOrange ? '#ea580c' : '#1d4ed8';
                  e.currentTarget.style.borderColor = isOrange ? '#fed7aa' : '#bfdbfe';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <span>{card.actionLabel}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ──── 3. Filters & Search Section (With Dedicated Employee Dropdown) ────── */}
      <div
        className="attendance-filters-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          background: '#ffffff',
          padding: '14px 18px',
          borderRadius: 14,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
        }}
      >
        {/* Left Filter Group: Search Input + Modern Employee Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: '1 1 450px' }}>
          
          {/* Search input */}
          <div
            className="attendance-search-box"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#f8fafc',
              border: `1.5px solid ${BORDER}`,
              borderRadius: 10,
              padding: '8px 12px',
              minWidth: 240,
              flex: '1 1 240px',
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

          {/* Dedicated Employee Dropdown Selector (Only for Managing Director) */}
          {isMD ? (
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
                            {renderEmployeeAvatar(emp, 28, false)}
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
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#f8fafc',
              border: `1.5px solid ${BORDER}`,
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155'
            }}>
              <User size={15} color="#3b82f6" />
              <span>Personal Records: <strong style={{ color: TEXT_MAIN }}>{user?.name}</strong> ({user?.displayName || user?.designation || 'Staff'})</span>
            </div>
          )}

          {/* Reset Filters button if any filter is active */}
          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              title="Clear all filters"
              style={{
                background: '#fff7ed',
                color: '#ea580c',
                border: '1px solid #fed7aa',
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s',
              }}
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>

        {/* Right Filter Group: Status Filter Pills (White, Orange, Blue) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'All Status' },
            { key: 'ON_DUTY', label: ' On Duty' },
            { key: 'ON_BREAK', label: ' On Break' },
            { key: 'COMPLETED', label: '✓ Completed' },
            { key: 'NOT_STARTED', label: 'Not Started' },
            { key: 'INCOMPLETE', label: 'Incomplete' },
          ].map((pill) => {
            const isActive = statusFilter === pill.key;
            return (
              <button
                key={pill.key}
                onClick={() => setStatusFilter(pill.key)}
                style={{
                  padding: '7px 13px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: isActive ? '#2563eb' : '#ffffff',
                  color: isActive ? '#ffffff' : '#334155',
                  border: `1.5px solid ${isActive ? '#2563eb' : '#cbd5e1'}`,
                  transition: 'all 0.15s',
                  boxShadow: isActive ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
                }}
              >
                {pill.label}
              </button>
            );
          })}
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
          <table style={{ width: '100%', minWidth: '1080px', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr
                style={{
                  background: '#f8fafc',
                  borderBottom: `2px solid ${BORDER}`,
                  color: '#475569',
                  fontWeight: 800,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  position: 'sticky',
                  top: 0,
                  zIndex: 5,
                }}
              >
                <th style={{ padding: '12px 14px', minWidth: 200, width: '18%' }}>Employee Details</th>
                <th style={{ padding: '12px 10px', minWidth: 105, width: '8%' }}>Employee ID</th>
                <th style={{ padding: '12px 10px', minWidth: 95, width: '8%' }}>Date</th>
                <th style={{ padding: '12px 8px', minWidth: 65, width: '5%' }}>Day</th>
                <th style={{ padding: '12px 10px', minWidth: 90, width: '8%' }}>Start Time</th>
                <th style={{ padding: '12px 10px', minWidth: 90, width: '8%' }}>End Time</th>
                <th style={{ padding: '12px 10px', minWidth: 120, width: '10%' }}>Total Attendance</th>
                <th style={{ padding: '12px 8px', minWidth: 70, width: '6%', textAlign: 'center' }}>Breaks</th>
                <th style={{ padding: '12px 10px', minWidth: 110, width: '9%' }}>Total Break</th>
                <th style={{ padding: '12px 10px', minWidth: 125, width: '10%' }}>Actual Work</th>
                <th style={{ padding: '12px 10px', minWidth: 110, width: '8%' }}>Status</th>
                <th style={{ padding: '12px 14px', minWidth: 170, width: '12%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} style={{ padding: '70px 0', textAlign: 'center', color: TEXT_MUTED }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div className="w-9 h-9 spinner-gradient" style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid #0284c7', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>Loading employee attendance records...</span>
                    </div>
                  </td>
                </tr>
              ) : displayRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '70px 20px', textAlign: 'center', color: TEXT_MUTED }}>
                    <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}><FileText size={38} color="#94a3b8" /></div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_MAIN }}>No attendance records found</div>
                    <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 4 }}>
                      {isFilterActive
                        ? 'Try adjusting your search query, employee selector, or status filter.'
                        : 'No employees recorded attendance for the selected date.'}
                    </div>
                    {isFilterActive && (
                      <button
                        onClick={handleResetFilters}
                        style={{
                          marginTop: 12,
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '6px 14px',
                          fontSize: 12,
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
                      {/* Employee Details (Avatar Image + Name + Email) */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {renderEmployeeAvatar(rec, 36, true)}
                          <div style={{ minWidth: 0 }}>
                            <div
                              onClick={() => handleOpenEmployeeHistory(rec.employeeId)}
                              style={{
                                fontWeight: 700,
                                color: '#0284c7',
                                cursor: 'pointer',
                                fontSize: 13,
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
                            <div style={{ fontSize: 11, color: TEXT_MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                              {rec.email || rec.role}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>
                        <span style={{ background: '#f1f5f9', color: '#1e293b', fontWeight: 800, padding: '3px 8px', borderRadius: 6, fontSize: 11.5, fontFamily: 'ui-monospace, monospace', border: '1px solid #e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                          {rec.employeeCode || 'EMP-001'}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '10px 10px', color: TEXT_MAIN, fontWeight: 700, whiteSpace: 'nowrap', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                        {formatDateDisplay(rec.date)}
                      </td>

                      {/* Day */}
                      <td style={{ padding: '10px 8px', color: TEXT_MUTED, whiteSpace: 'nowrap', fontWeight: 600, fontSize: 12 }}>
                        {rec.day}
                      </td>

                      {/* Start Time */}
                      <td style={{ padding: '10px 10px', fontWeight: 800, color: isNotStarted ? '#94a3b8' : '#1d4ed8', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontSize: 12.5 }}>
                        {rec.startTimeFormatted || '—'}
                      </td>

                      {/* End Time */}
                      <td style={{ padding: '10px 10px', fontWeight: 800, color: rec.endTimeFormatted === '—' ? '#94a3b8' : '#1d4ed8', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontSize: 12.5 }}>
                        {rec.endTimeFormatted || '—'}
                      </td>

                      {/* Total Attendance */}
                      <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>
                        {rec.status === 'ON_DUTY' ? (
                          <span style={{ color: '#1d4ed8', fontWeight: 800, fontFamily: 'ui-monospace, monospace', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: 7, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                            <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />{liveTimes.totalAttendance}
                          </span>
                        ) : rec.status === 'ON_BREAK' ? (
                          <span style={{ color: '#ea580c', fontWeight: 800, fontFamily: 'ui-monospace, monospace', background: '#fff7ed', border: '1px solid #fed7aa', padding: '3px 8px', borderRadius: 7, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                            <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />{liveTimes.totalAttendance}
                          </span>
                        ) : (
                          <span style={{ color: isNotStarted ? '#94a3b8' : '#1e293b', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 12.5 }}>
                            {normalizeDurationStr(rec.durationFormatted) || '—'}
                          </span>
                        )}
                      </td>

                      {/* Break Count */}
                      <td style={{ padding: '10px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {isNotStarted ? (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        ) : breakCount > 0 ? (
                          <button
                            onClick={() => setBreakModalRecord(rec)}
                            title="Click to view break breakdown"
                            style={{
                              background: '#fff7ed',
                              border: '1px solid #fed7aa',
                              color: '#ea580c',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 11.5,
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                            }}
                          >
                            <Coffee size={11} /> {breakCount}
                          </button>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>0</span>
                        )}
                      </td>

                      {/* Total Break Time */}
                      <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>
                        {rec.status === 'ON_BREAK' ? (
                          <span style={{ color: '#ea580c', fontWeight: 800, fontFamily: 'ui-monospace, monospace', background: '#fff7ed', border: '1px solid #fed7aa', padding: '3px 8px', borderRadius: 7, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                            <Coffee size={11} style={{ display: 'inline', marginRight: 3 }} />{liveTimes.totalBreak}
                          </span>
                        ) : isNotStarted ? (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        ) : (
                          <span style={{ color: breakCount > 0 ? '#ea580c' : '#64748b', fontWeight: breakCount > 0 ? 800 : 600, fontVariantNumeric: 'tabular-nums', fontSize: 12.5 }}>
                            {normalizeDurationStr(rec.formattedBreakDuration) || '00h 00m'}
                          </span>
                        )}
                      </td>

                      {/* Actual Working Hours */}
                      <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>
                        {rec.status === 'ON_DUTY' ? (
                          <span style={{ color: '#15803d', fontWeight: 800, fontFamily: 'ui-monospace, monospace', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: 7, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                            <Zap size={11} style={{ display: 'inline', marginRight: 3 }} />{liveTimes.actualWork}
                          </span>
                        ) : rec.status === 'ON_BREAK' ? (
                          <span style={{ color: '#ea580c', fontWeight: 800, fontFamily: 'ui-monospace, monospace', background: '#fff7ed', border: '1px solid #fed7aa', padding: '3px 8px', borderRadius: 7, fontSize: 12, fontVariantNumeric: 'tabular-nums' }} title="Working timer paused while on break">
                            <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />{liveTimes.actualWork}
                          </span>
                        ) : isNotStarted ? (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        ) : (
                          <span style={{ color: '#1d4ed8', fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontSize: 12.5 }}>
                            {normalizeDurationStr(rec.formattedActualWork || rec.durationFormatted) || '00h 00m'}
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 9px',
                            borderRadius: 14,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: badge.dot }} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions Column (Properly Spaced Buttons) */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          {/* Button 1: Breaks Button */}
                          {!isNotStarted && (
                            <button
                              onClick={() => setBreakModalRecord(rec)}
                              title="View full break details breakdown"
                              style={{
                                height: 30,
                                background: '#fff7ed',
                                color: '#ea580c',
                                border: '1px solid #fed7aa',
                                borderRadius: 7,
                                padding: '0 8px',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                transition: 'all 0.15s',
                              }}
                            >
                              <Coffee size={11} /> Breaks
                            </button>
                          )}


                          {/* Button 3: Details Button */}
                          {!isNotStarted && (
                            <button
                              onClick={() => setDetailModalRecord(rec)}
                              title="View complete record details"
                              style={{
                                height: 30,
                                background: '#f8fafc',
                                color: '#334155',
                                border: `1px solid ${BORDER}`,
                                borderRadius: 7,
                                padding: '0 8px',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                transition: 'all 0.15s',
                              }}
                            >
                              <FileText size={11} /> Details
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
                {renderEmployeeAvatar(breakModalRecord, 42, true)}
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
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1d4ed8', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                  {normalizeDurationStr(breakModalRecord.durationFormatted) || '—'}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase' }}>Total Breaks</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#ea580c', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                  {breakModalRecord.breakCount || breakModalRecord.breaks?.length || 0}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase' }}>Total Break Time</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#ea580c', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                  {normalizeDurationStr(breakModalRecord.formattedBreakDuration) || '00h 00m'}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase' }}>Actual Working</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#15803d', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                  {normalizeDurationStr(breakModalRecord.formattedActualWork || breakModalRecord.durationFormatted) || '00h 00m'}
                </div>
              </div>
            </div>

            {/* Breaks Table */}
            <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${BORDER}`, borderRadius: 12, marginBottom: 20 }}>
              {!Array.isArray(breakModalRecord.breaks) || breakModalRecord.breaks.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: TEXT_MUTED }}>
                  <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><Coffee size={32} color="#ea580c" /></div>
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
                        <td style={{ padding: '11px 14px', color: '#1d4ed8', fontWeight: 700 }}>
                          {formatTime12h(b.startTime)}
                        </td>
                        <td style={{ padding: '11px 14px', color: b.endTime ? '#1d4ed8' : '#ea580c', fontWeight: 700 }}>
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
                              background: b.status === 'ACTIVE' ? '#fff7ed' : '#eff6ff',
                              color: b.status === 'ACTIVE' ? '#ea580c' : '#1d4ed8',
                              border: `1px solid ${b.status === 'ACTIVE' ? '#fed7aa' : '#bfdbfe'}`,
                            }}
                          >
                            {b.status === 'ACTIVE' ? '☕ Active' : '🔵 Completed'}
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
                {renderEmployeeAvatar(detailModalRecord, 42, true)}
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
                <div style={{ fontSize: 14.5, fontWeight: 800, color: '#1d4ed8', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                  {detailModalRecord.startTimeFormatted || '—'}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase' }}>End Time</div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: detailModalRecord.endTimeFormatted === '—' ? '#94a3b8' : '#1d4ed8', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                  {detailModalRecord.endTimeFormatted || '—'}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase' }}>Total Attendance</div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: '#2563eb', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                  {normalizeDurationStr(detailModalRecord.durationFormatted) || '—'}
                </div>
              </div>
            </div>

            {/* Break & Net Work Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
              <div style={{ background: '#fff7ed', padding: '12px 14px', borderRadius: 10, border: '1px solid #fed7aa' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>
                  ☕ Breaks ({detailModalRecord.breakCount || detailModalRecord.breaks?.length || 0})
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#ea580c', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                  {normalizeDurationStr(detailModalRecord.formattedBreakDuration) || '00h 00m'}
                </div>
              </div>
              <div style={{ background: '#eff6ff', padding: '12px 14px', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>⚡ Actual Work Hours</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#15803d', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                  {normalizeDurationStr(detailModalRecord.formattedActualWork || detailModalRecord.durationFormatted) || '00h 00m'}
                </div>
              </div>
            </div>

            {/* Locations Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {/* Start Location */}
              <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', marginBottom: 4 }}>
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
                <div style={{ fontSize: 11.5, fontWeight: 700, color: detailModalRecord.status === 'ON_DUTY' ? '#1d4ed8' : '#ea580c', textTransform: 'uppercase', marginBottom: 4 }}>
                  {detailModalRecord.status === 'ON_DUTY' ? '🔵 Current Live Location' : '📍 Final Recorded Location'}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {renderEmployeeAvatar(employeeHistoryData?.employee || { name: historyModalEmployee, _id: historyModalEmployee }, 42, true)}
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: TEXT_MAIN }}>
                    {employeeHistoryData?.employee?.name || 'Employee'} — Complete Attendance Log
                  </h3>
                  <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 2 }}>
                    {employeeHistoryData?.employee?.employeeCode} • {employeeHistoryData?.employee?.email}
                  </div>
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
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0284c7', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                    {employeeHistoryData.stats.totalDays}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED }}>Completed Days</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#047857', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                    {employeeHistoryData.stats.completedDays}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED }}>Total Actual Work</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                    {employeeHistoryData.stats.totalHours}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED }}>Total Break Hours</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
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
                          <td style={{ padding: '10px 14px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatDateDisplay(r.date)}</td>
                          <td style={{ padding: '10px 14px', color: TEXT_MUTED }}>{r.day}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.startTimeFormatted}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.endTimeFormatted}</td>
                          <td style={{ padding: '10px 14px', fontVariantNumeric: 'tabular-nums' }}>{normalizeDurationStr(r.formattedDuration) || '—'}</td>
                          <td style={{ padding: '10px 14px', color: '#b45309', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {r.breakCount > 0 ? `${r.breakCount} (${normalizeDurationStr(r.formattedBreakDuration) || '00h 00m'})` : '0'}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
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
                {renderEmployeeAvatar(mapModalRecord, 38, true)}
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

      {/* ──── 9. 9-Hour Incomplete Warning Modal ───────────────────────────────────────────────────────── */}
      {nineHourWarningModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 20,
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => setNineHourWarningModal(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 24,
              width: '70%',
              maxWidth: 520,
              boxShadow: '0 25px 50px -12px rgba(234, 88, 12, 0.28), 0 0 0 1px rgba(254, 215, 170, 0.5)',
              overflow: 'hidden',
              position: 'relative',
              textAlign: 'center',
              border: '2px solid #fed7aa',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gradient stripe */}
            <div
              style={{
                height: 6,
              }}
            />

            <div style={{ padding: '32px 28px 26px' }}>
              {/* Pulsing Warning Icon */}
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                  border: '2px solid #fed7aa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 0 24px rgba(249, 115, 22, 0.25)',
                }}
              >
                <AlertTriangle size={36} color="#ea580c" />
              </div>

              {/* Modal Title & Requirement Headline */}
              <h3 style={{ margin: '0 0 6px', fontSize: 21, fontWeight:200, color: '#0f172a', letterSpacing: '-0.02em' }}>
                End Attendance Confirmation
              </h3>

              <div
                style={{
                  background: '#fff7ed',
                  border: '1.5px solid #fed7aa',
                  borderRadius: 12,
                  padding: '12px 16px',
                  margin: '14px 0 16px',
                  color: '#c2410c',
                  fontSize: 14,
                  fontWeight: 500,
                  lineHeight: 1.4,
                  boxShadow: '0 2px 8px rgba(234, 88, 12, 0.08)',
                }}
              >
                9 hours are not complete ({nineHourWarningModal.remainingHms} remaining).
              </div>

              <p style={{ margin: '0 0 20px', fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>
                Daily full shift policy recommends a total of <strong>9:00:00 Hours</strong> login time. You can confirm and end your attendance early now, or continue working.
              </p>

              {/* Time Breakdown Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 18,
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Completed Login
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
                    {nineHourWarningModal.completedHms}
                  </div>
                  <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, marginTop: 2 }}>
                    Goal: 09:00:00 Hours
                  </div>
                </div>

                <div
                  style={{
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    borderRadius: 14,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Time Remaining
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#ea580c', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
                    {nineHourWarningModal.remainingHms}
                  </div>
                  <div style={{ fontSize: 11, color: '#ea580c', fontWeight: 600, marginTop: 2 }}>
                    {nineHourWarningModal.percent}% Claim Reached
                  </div>
                </div>
              </div>

              {/* Progress Bar inside modal */}
              <div style={{ marginBottom: 22, textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  <span>Daily Shift Progress</span>
                  <span style={{ color: '#ea580c', fontWeight: 500 }}>{nineHourWarningModal.percent}% Complete</span>
                </div>
                <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 8, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${nineHourWarningModal.percent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)',
                      borderRadius: 8,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons — Available for everyone */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Early End Attendance Confirmation Button */}
                <button
                  type="button"
                  onClick={() => handleStopAttendance({ force: true })}
                  disabled={actionLoading !== null}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '13px 20px',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: actionLoading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {actionLoading === 'STOP' ? (
                    <><Loader2 size={16} className="animate-spin" /> Ending Attendance...</>
                  ) : (
                    <><Square size={15} fill="#ffffff" /> End Attendance Early (Confirm)</>
                  )}
                </button>

                {/* Continue Attendance Button */}
                <button
                  type="button"
                  onClick={() => setNineHourWarningModal(null)}
                  disabled={actionLoading !== null}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '12px 20px',
                    fontSize: 13.5,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Play size={15} fill="#ffffff" /> Continue Attendance (Keep Working)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
