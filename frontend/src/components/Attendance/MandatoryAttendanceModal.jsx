import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { attendanceAPI, followupsAPI } from '../../services/api';
import geoTracker from '../../services/geoTracker';
import logoImg from '../../assets/aotms-global-logo.png';
import {
  FiClock,
  FiMapPin,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiPlay,
  FiLogOut,
  FiCalendar,
  FiUser,
  FiActivity,
  FiPlus,
  FiTrash2,
  FiList,
  FiCheck,
  FiLock,
  FiArrowRight,
} from 'react-icons/fi';
import { RiShieldCheckFill, RiTimerFlashLine, RiTaskLine, RiCheckboxCircleFill } from 'react-icons/ri';

/**
 * Format IST Date and Day string (e.g., Saturday, 26 September 2026)
 */
function formatISTDate(dateObj) {
  if (!dateObj) return '';
  return dateObj.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format IST Time (e.g., 09:30:15 AM)
 */
function formatISTTime(dateObj) {
  if (!dateObj) return '00:00:00 AM';
  return dateObj.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Get greeting based on current local hour
 */
function getGreeting(dateObj) {
  const hour = dateObj.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const PRIORITY_BADGES = {
  high: { label: 'High', bg: '#fef2f2', color: '#dc2626', border: '#fecaca', dot: '#ef4444' },
  medium: { label: 'Medium', bg: '#fffbeb', color: '#d97706', border: '#fde68a', dot: '#f59e0b' },
  low: { label: 'Low', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', dot: '#10b981' },
};

export default function MandatoryAttendanceModal() {
  const { user, logout } = useAuth();

  // Modal Flow Step: 'ATTENDANCE' | 'TASK' | 'CLOSED'
  const [currentStep, setCurrentStep] = useState('CLOSED');
  const [checking, setChecking] = useState(true);
  const [now, setNow] = useState(new Date());

  // Step 1: Attendance state
  const [clockingIn, setClockingIn] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('detecting'); // 'detecting' | 'ready' | 'fallback'
  const [gpsCoords, setGpsCoords] = useState(null);

  // Step 2: Task Setup state
  const [todayTasks, setTodayTasks] = useState([]);
  const [fetchingTasks, setFetchingTasks] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueTime, setTaskDueTime] = useState('18:00'); // default 6:00 PM
  const [addingTask, setAddingTask] = useState(false);
  const [taskError, setTaskError] = useState(null);
  const [taskSuccessMsg, setTaskSuccessMsg] = useState('');

  // Real-time digital clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's tasks for current user
  const fetchTodayTasks = useCallback(async () => {
    if (!user) return [];
    try {
      setFetchingTasks(true);
      const res = await followupsAPI.getAll({ forMe: 'true', due: 'today' });
      const list = res.data?.followups || [];
      setTodayTasks(list);
      return list;
    } catch (err) {
      console.warn('[MandatoryCheckIn] Fetch tasks error:', err.message);
      return [];
    } finally {
      setFetchingTasks(false);
    }
  }, [user]);

  // Check overall Check-in Status on mount
  const evaluateCheckInStatus = useCallback(async () => {
    if (!user) {
      setCurrentStep('CLOSED');
      setChecking(false);
      return;
    }

    try {
      setChecking(true);
      // 1. Check Attendance status for today
      const attRes = await attendanceAPI.getCurrentStatus();
      const attData = attRes.data || {};
      const isAttActiveOrDone =
        attData.active === true ||
        attData.status === 'ON_DUTY' ||
        attData.status === 'ON_BREAK' ||
        attData.status === 'COMPLETED';

      if (!isAttActiveOrDone) {
        // Attendance not started for today -> Step 1: Attendance
        setCurrentStep('ATTENDANCE');
      } else if (attData.status === 'COMPLETED') {
        // Attendance already completed/ended for today -> Permanently closed
        setCurrentStep('CLOSED');
      } else {
        // Attendance active (ON_DUTY or ON_BREAK) -> Check Step 2: Tasks for today
        const tasks = await fetchTodayTasks();
        if (tasks.length === 0) {
          // No tasks planned for today -> Step 2: Mandatory Task Setup
          setCurrentStep('TASK');
        } else {
          // Both attendance and at least 1 task completed -> Close modal
          setCurrentStep('CLOSED');
        }
      }
    } catch (err) {
      console.warn('[MandatoryCheckIn] Evaluation error:', err.message);
    } finally {
      setChecking(false);
    }
  }, [user, fetchTodayTasks]);

  useEffect(() => {
    evaluateCheckInStatus();
  }, [evaluateCheckInStatus]);

  // Listen for external updates
  useEffect(() => {
    const handleAttendanceUpdate = () => {
      evaluateCheckInStatus();
    };
    window.addEventListener('attendance-updated', handleAttendanceUpdate);
    return () => window.removeEventListener('attendance-updated', handleAttendanceUpdate);
  }, [evaluateCheckInStatus]);

  // Pre-fetch GPS coordinates when Attendance step is open
  useEffect(() => {
    if (currentStep !== 'ATTENDANCE') return;

    if (navigator.geolocation) {
      setGpsStatus('detecting');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setGpsStatus('ready');
        },
        (err) => {
          console.warn('[MandatoryAttendanceModal] Geolocation fallback:', err.message);
          setGpsStatus('fallback');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      setGpsStatus('fallback');
    }
  }, [currentStep]);

  // Block background scrolling and intercept Escape key
  useEffect(() => {
    if (currentStep !== 'CLOSED') {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      window.addEventListener('keydown', handleKeyDown, true);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown, true);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [currentStep]);

  // ── Step 1 Action: Start Attendance ──────────────────────────────────────────
  const handleStartAttendance = async () => {
    try {
      setClockingIn(true);
      setAttendanceError(null);

      let locationData = {
        latitude: gpsCoords?.latitude || null,
        longitude: gpsCoords?.longitude || null,
        accuracy: gpsCoords?.accuracy || 0,
        platform: navigator.platform || 'web',
      };

      if (!locationData.latitude && navigator.geolocation) {
        try {
          const freshPos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 6000,
            });
          });
          locationData.latitude = freshPos.coords.latitude;
          locationData.longitude = freshPos.coords.longitude;
          locationData.accuracy = freshPos.coords.accuracy;
        } catch (geoErr) {
          console.warn('[MandatoryAttendance] GPS fallback:', geoErr.message);
        }
      }

      const res = await attendanceAPI.start(locationData);

      if (res.data?.ok) {
        geoTracker.startTracking().catch((gErr) => {
          console.warn('[MandatoryAttendance] GeoTracker start:', gErr.message);
        });

        setAttendanceSuccess(true);
        window.dispatchEvent(new CustomEvent('attendance-updated', { detail: res.data.attendance }));

        // Immediately transition to Step 2: Task Setup
        setTimeout(async () => {
          await fetchTodayTasks();
          setClockingIn(false);
          setAttendanceSuccess(false);
          setCurrentStep('TASK');
        }, 800);
      } else {
        setAttendanceError(res.data?.message || 'Failed to start attendance. Please try again.');
        setClockingIn(false);
      }
    } catch (err) {
      console.error('[MandatoryAttendance] Start error:', err);
      const msg = err.response?.data?.message || err.message || 'Unable to connect to server. Please try again.';
      setAttendanceError(msg);
      setClockingIn(false);
    }
  };

  // ── Step 2 Action: Add Task ──────────────────────────────────────────────────
  const handleAddTask = async (e) => {
    if (e) e.preventDefault();
    const title = taskTitle.trim();
    if (!title) {
      setTaskError('Please enter a task description');
      return;
    }

    try {
      setAddingTask(true);
      setTaskError(null);
      setTaskSuccessMsg('');

      // Build scheduledAt date for today at chosen time
      const today = new Date();
      const [hh, mm] = taskDueTime.split(':');
      today.setHours(parseInt(hh || '18', 10), parseInt(mm || '00', 10), 0, 0);

      const payload = {
        type: 'todo',
        title,
        note: title,
        description: title,
        scheduledAt: today.toISOString(),
        priority: taskPriority,
        assignedTo: user?._id,
        assignedBy: user?._id,
      };

      const res = await followupsAPI.create(payload);
      if (res.data?.followup) {
        const created = res.data.followup;
        setTodayTasks((prev) => [created, ...prev]);
        setTaskTitle('');
        setTaskSuccessMsg('✓ Task added successfully!');
        setTimeout(() => setTaskSuccessMsg(''), 3000);

        window.dispatchEvent(new CustomEvent('tasks-updated', { detail: created }));
      }
    } catch (err) {
      console.error('[MandatoryTask] Create error:', err);
      setTaskError(err.response?.data?.message || 'Failed to add task. Please try again.');
    } finally {
      setAddingTask(false);
    }
  };

  // Delete task action (if added by mistake in modal)
  const handleDeleteTask = async (taskId) => {
    try {
      await followupsAPI.delete(taskId);
      setTodayTasks((prev) => prev.filter((t) => t._id !== taskId));
      window.dispatchEvent(new CustomEvent('tasks-updated'));
    } catch (err) {
      console.warn('[MandatoryTask] Delete error:', err.message);
    }
  };

  // ── Final Exit Action: Save & Enter Workspace ────────────────────────────────
  const handleFinishAndEnter = () => {
    if (todayTasks.length === 0) {
      setTaskError('Please add at least 1 task for today before entering the workspace.');
      return;
    }
    window.dispatchEvent(new CustomEvent('attendance-updated'));
    window.dispatchEvent(new CustomEvent('tasks-updated'));
    setCurrentStep('CLOSED');
  };

  if (currentStep === 'CLOSED' || checking) return null;

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'EMP';
  const roleDisplay = user?.designation || user?.role || 'Staff Member';
  const greeting = getGreeting(now);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 select-none"
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Glowing Background Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-35 blur-3xl animate-pulse"
            style={{ background: 'radial-gradient(circle, #0284c7, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-35 blur-3xl animate-pulse"
            style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)', animationDelay: '1.5s' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #f97316, transparent 70%)' }}
          />
        </div>

        {/* Modal Window Container */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.93, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 15 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border"
          style={{
            background: 'linear-gradient(165deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
            borderColor: '#e2e8f0',
            boxShadow: '0 25px 70px rgba(15, 23, 42, 0.5), 0 0 40px rgba(2, 132, 199, 0.2)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Multi-Color Brand Bar */}
          <div
            className="h-2 w-full shrink-0"
            style={{
              background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 30%, #10b981 70%, #f97316 100%)',
            }}
          />

          {/* Modal Header: Logo + Steps Progression Indicator */}
          <div className="p-6 pb-4 sm:p-8 sm:pb-4 shrink-0 border-b border-slate-100">
            <div className="flex items-center justify-between gap-4 mb-4">
              <img
                src={logoImg}
                alt="AOTMS"
                className="h-9 sm:h-10 object-contain"
                style={{ filter: 'drop-shadow(0 2px 8px rgba(2, 132, 199, 0.25))' }}
              />

              {/* Step Pill Badges */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                {/* Step 1 badge */}
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold tracking-wide transition-all ${
                    currentStep === 'ATTENDANCE'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {currentStep === 'ATTENDANCE' ? (
                    <span>1. Shift In</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <FiCheck className="w-3.5 h-3.5 text-emerald-600" /> Shift Active
                    </span>
                  )}
                </div>

                {/* Step 2 badge */}
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold tracking-wide transition-all ${
                    currentStep === 'TASK'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-transparent text-slate-400'
                  }`}
                >
                  <RiTaskLine className="w-3.5 h-3.5" />
                  <span>2. Daily Task</span>
                </div>
              </div>
            </div>

            {/* Title & Greeting Banner */}
            <div className="text-left">
              {currentStep === 'ATTENDANCE' ? (
                <>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <span>{greeting},</span>
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {user?.name?.split(' ')[0] || 'Team'}
                    </span>
                    <span>👋</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                    Step 1 of 2: Please clock in your attendance to start your shift timer.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Plan Today's Tasks</span>
                    <span className="text-emerald-600">🎯</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                    Step 2 of 2: Add at least <strong className="text-slate-800 font-bold">1 task/goal</strong> for today's shift before entering the workspace.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Scrollable Body Content */}
          <div className="p-6 sm:p-8 pt-4 overflow-y-auto flex-1 space-y-5">
            {/* ═══════════════════════════════════════════════════════════════════
                STEP 1: ATTENDANCE CLOCK-IN
               ═══════════════════════════════════════════════════════════════════ */}
            {currentStep === 'ATTENDANCE' && (
              <>
                {/* Live Clock & Date Banner */}
                <div
                  className="p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 border shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    borderColor: '#bae6fd',
                  }}
                >
                  <div className="flex items-center gap-2.5 text-slate-700">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600 font-bold border border-sky-200">
                      <FiCalendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">Today's Date</div>
                      <div className="text-xs font-semibold text-slate-800">{formatISTDate(now)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 border border-sky-200 shadow-inner">
                    <FiClock className="w-4 h-4 text-sky-600 animate-pulse" />
                    <span className="font-mono text-sm sm:text-base font-bold text-sky-900 tracking-tight">
                      {formatISTTime(now)}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">IST</span>
                  </div>
                </div>

                {/* Employee Profile Card */}
                <div
                  className="p-4 rounded-2xl flex items-center gap-3.5 border bg-white shadow-sm"
                  style={{ borderColor: '#e2e8f0' }}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-sm overflow-hidden shrink-0 shadow-md"
                    style={{
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #f97316 100%)',
                    }}
                  >
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900 truncate">{user?.name || 'Employee'}</span>
                      <span
                        className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0"
                        style={{
                          background: 'rgba(2, 132, 199, 0.10)',
                          color: '#0284c7',
                          border: '1px solid rgba(2, 132, 199, 0.25)',
                        }}
                      >
                        {roleDisplay}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="truncate">{user?.email || 'user@example.com'}</span>
                      {user?.employeeId && (
                        <span className="font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                          {user.employeeId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Shift Info & GPS status */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div
                    className="p-3 rounded-xl border flex items-center gap-2.5"
                    style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}
                  >
                    <RiTimerFlashLine className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Shift Target</div>
                      <div className="font-bold text-slate-700">09:00:00 Hours</div>
                    </div>
                  </div>

                  <div
                    className="p-3 rounded-xl border flex items-center gap-2.5"
                    style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}
                  >
                    <FiMapPin className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">GPS Verification</div>
                      <div className="font-bold text-slate-700">
                        {gpsStatus === 'ready'
                          ? 'GPS Active 📍'
                          : gpsStatus === 'detecting'
                          ? 'Locating...'
                          : 'Vijayawada HQ'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {attendanceError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl flex items-start gap-2.5 text-xs text-red-700 bg-red-50 border border-red-200 shadow-sm"
                  >
                    <FiAlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 font-medium">{attendanceError}</div>
                  </motion.div>
                )}

                {/* Success Banner */}
                {attendanceSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-2xl flex items-center justify-center gap-2.5 text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 shadow-md"
                  >
                    <FiCheckCircle className="w-5 h-5 text-emerald-600 animate-bounce" />
                    <span>Attendance Clocked In! Proceeding to Task Setup...</span>
                  </motion.div>
                )}

                {/* Start Attendance Action Button */}
                <motion.button
                  whileHover={{ scale: clockingIn || attendanceSuccess ? 1 : 1.02 }}
                  whileTap={{ scale: clockingIn || attendanceSuccess ? 1 : 0.98 }}
                  disabled={clockingIn || attendanceSuccess}
                  onClick={handleStartAttendance}
                  className="w-full py-4 px-6 rounded-2xl font-extrabold text-sm sm:text-base text-white transition-all shadow-lg flex items-center justify-center gap-3 relative overflow-hidden"
                  style={{
                    background: attendanceSuccess
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #f97316 100%)',
                    boxShadow: attendanceSuccess
                      ? '0 10px 25px rgba(16, 185, 129, 0.4)'
                      : '0 12px 30px rgba(2, 132, 199, 0.35)',
                  }}
                >
                  {clockingIn ? (
                    <>
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Clocking In & Starting Live Shift...</span>
                    </>
                  ) : attendanceSuccess ? (
                    <>
                      <FiCheckCircle className="w-5 h-5" />
                      <span>Attendance Active!</span>
                    </>
                  ) : (
                    <>
                      <FiPlay className="w-5 h-5 fill-current" />
                      <span>Start Attendance</span>
                    </>
                  )}
                </motion.button>
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                STEP 2: MANDATORY TASK SETUP
               ═══════════════════════════════════════════════════════════════════ */}
            {currentStep === 'TASK' && (
              <>
                {/* Task Creation Form */}
                <form onSubmit={handleAddTask} className="p-4 rounded-2xl border bg-white shadow-sm space-y-4" style={{ borderColor: '#e2e8f0' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <FiPlus className="text-emerald-600 font-bold" /> Add Task for Today
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {todayTasks.length === 0 ? '⚠️ 0 tasks added' : `✓ ${todayTasks.length} task(s) added`}
                    </span>
                  </div>

                  {/* Task Description Input */}
                  <div>
                    <input
                      type="text"
                      placeholder="e.g. Follow up with 15 leads & prepare daily report..."
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl border text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                      style={{ background: '#f8fafc', borderColor: '#cbd5e1' }}
                    />
                  </div>

                  {/* Priority Selector + Due Time Selector */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Priority Pills */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500 mr-1">Priority:</span>
                      {['low', 'medium', 'high'].map((p) => {
                        const cfg = PRIORITY_BADGES[p];
                        const isSelected = taskPriority === p;
                        return (
                          <button
                            type="button"
                            key={p}
                            onClick={() => setTaskPriority(p)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border"
                            style={{
                              background: isSelected ? cfg.bg : '#ffffff',
                              color: isSelected ? cfg.color : '#64748b',
                              borderColor: isSelected ? cfg.dot : '#e2e8f0',
                              boxShadow: isSelected ? `0 0 8px ${cfg.bg}` : 'none',
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ background: isSelected ? cfg.dot : '#cbd5e1' }}
                            />
                            <span>{cfg.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Target Due Time */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500">Due:</span>
                      <input
                        type="time"
                        value={taskDueTime}
                        onChange={(e) => setTaskDueTime(e.target.value)}
                        className="px-2 py-1 rounded-lg border text-xs font-bold text-slate-700 focus:outline-none focus:border-sky-500"
                        style={{ background: '#f8fafc', borderColor: '#cbd5e1' }}
                      />
                    </div>
                  </div>

                  {/* Add Task Button */}
                  <button
                    type="submit"
                    disabled={addingTask || !taskTitle.trim()}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    }}
                  >
                    {addingTask ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Adding Task...</span>
                      </>
                    ) : (
                      <>
                        <FiPlus className="w-4 h-4" />
                        <span>Add Task To Today's Plan</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Feedback Alerts */}
                {taskError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl flex items-start gap-2.5 text-xs text-red-700 bg-red-50 border border-red-200"
                  >
                    <FiAlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 font-medium">{taskError}</div>
                  </motion.div>
                )}

                {taskSuccessMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2.5 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200"
                  >
                    <FiCheck className="w-4 h-4 text-emerald-600" />
                    <span>{taskSuccessMsg}</span>
                  </motion.div>
                )}

                {/* List of Tasks Added for Today */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <FiList className="text-sky-600" /> Today's Planned Tasks ({todayTasks.length})
                    </span>
                    {todayTasks.length >= 1 ? (
                      <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                        <FiCheckCircle /> Requirement Fulfilled
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold text-[11px] flex items-center gap-1">
                        <FiLock /> Add 1 task to proceed
                      </span>
                    )}
                  </div>

                  {todayTasks.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-400 bg-slate-50/50">
                      <RiTaskLine className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                      <p className="font-medium text-slate-500">No tasks added for today yet.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Please type a goal above and click <strong>"Add Task"</strong> to enable the enter button.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {todayTasks.map((t, idx) => {
                        const priCfg = PRIORITY_BADGES[t.priority] || PRIORITY_BADGES.medium;
                        return (
                          <div
                            key={t._id || idx}
                            className="p-3 rounded-xl border bg-white flex items-center justify-between gap-3 shadow-sm hover:border-slate-300 transition-all"
                            style={{ borderColor: '#e2e8f0' }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{t.title || t.note}</p>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-medium">
                                  <span
                                    className="px-1.5 py-0.2 rounded font-bold uppercase tracking-wider"
                                    style={{ background: priCfg.bg, color: priCfg.color, border: `1px solid ${priCfg.border}` }}
                                  >
                                    {priCfg.label}
                                  </span>
                                  <span>Due: {t.scheduledAt ? new Date(t.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Today'}</span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              title="Remove task"
                              onClick={() => handleDeleteTask(t._id)}
                              className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Final Exit Button: Save & Enter Workspace */}
                <motion.button
                  whileHover={{ scale: todayTasks.length === 0 ? 1 : 1.02 }}
                  whileTap={{ scale: todayTasks.length === 0 ? 1 : 0.98 }}
                  disabled={todayTasks.length === 0}
                  onClick={handleFinishAndEnter}
                  className={`w-full py-4 px-6 rounded-2xl font-extrabold text-sm sm:text-base text-white transition-all shadow-lg flex items-center justify-center gap-3 relative overflow-hidden ${
                    todayTasks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  style={{
                    background:
                      todayTasks.length === 0
                        ? '#94a3b8'
                        : 'linear-gradient(135deg, #10b981 0%, #059669 50%, #0284c7 100%)',
                    boxShadow:
                      todayTasks.length === 0
                        ? 'none'
                        : '0 12px 30px rgba(16, 185, 129, 0.35)',
                  }}
                >
                  {todayTasks.length === 0 ? (
                    <>
                      <FiLock className="w-4 h-4" />
                      <span>Add At Least 1 Task to Enter Workspace</span>
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="w-5 h-5" />
                      <span>Save & Enter Workspace ({todayTasks.length} Tasks)</span>
                      <FiArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </>
            )}
          </div>

          {/* Modal Footer (Sign out option) */}
          <div className="p-4 px-6 sm:px-8 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-[11px] text-slate-400 font-medium shrink-0">
            <div className="flex items-center gap-1.5">
              <FiShield className="w-3.5 h-3.5 text-slate-400" />
              <span>Shift check-in & goal planning policy active</span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="hover:text-red-500 transition-colors flex items-center gap-1 font-semibold text-slate-500 hover:underline"
            >
              <FiLogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
