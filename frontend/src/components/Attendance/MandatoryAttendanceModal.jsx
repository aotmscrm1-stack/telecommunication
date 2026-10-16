import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { attendanceAPI } from '../../services/api';
import geoTracker from '../../services/geoTracker';
import logoImg from '../../assets/aotms-global-logo.png';
import {
  FiClock,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiPlay,
  FiLogOut,
  FiCalendar,
} from 'react-icons/fi';
import { RiTimerFlashLine } from 'react-icons/ri';

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

export default function MandatoryAttendanceModal() {
  const { user, logout } = useAuth();

  // Modal Flow Step: 'ATTENDANCE' | 'CLOSED'
  const [currentStep, setCurrentStep] = useState('CLOSED');
  const [checking, setChecking] = useState(true);
  const [now, setNow] = useState(new Date());

  // Attendance Clock-in State
  const [clockingIn, setClockingIn] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('Attendance Clocked In!');
  const [attendanceError, setAttendanceError] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);

  // Real-time digital clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check overall Check-in Status on mount / refresh
  const evaluateCheckInStatus = useCallback(async () => {
    if (!user) {
      setCurrentStep('CLOSED');
      setChecking(false);
      return;
    }

    try {
      setChecking(true);
      const attRes = await attendanceAPI.getCurrentStatus();
      const attData = attRes.data || {};
      const isAttActiveOrDone =
        attData.active === true ||
        attData.status === 'ON_DUTY' ||
        attData.status === 'ON_BREAK' ||
        attData.status === 'COMPLETED';

      if (!isAttActiveOrDone) {
        // Attendance not started for today -> Prompt attendance clock-in
        setCurrentStep('ATTENDANCE');
      } else {
        // Attendance already active or completed -> Close modal immediately
        setCurrentStep('CLOSED');
      }
    } catch (err) {
      console.warn('[MandatoryCheckIn] Evaluation error:', err.message);
      setCurrentStep('CLOSED');
    } finally {
      setChecking(false);
    }
  }, [user]);

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

  // Background location retrieval
  useEffect(() => {
    if (currentStep !== 'ATTENDANCE') return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          console.warn('[MandatoryAttendanceModal] Location fallback:', err.message);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  }, [currentStep]);

  // Block background scrolling and intercept Escape key
  useEffect(() => {
    if (currentStep !== 'CLOSED') {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [currentStep]);

  // Handle Attendance Clock In Action
  const handleStartAttendance = async () => {
    try {
      setClockingIn(true);
      setAttendanceError(null);

      const locationData = {
        latitude: gpsCoords?.latitude || 0,
        longitude: gpsCoords?.longitude || 0,
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
          console.warn('[MandatoryAttendance] Location fallback:', geoErr.message);
        }
      }

      const res = await attendanceAPI.start(locationData);

      if (res.data?.ok) {
        geoTracker.startTracking().catch((gErr) => {
          console.warn('[MandatoryAttendance] GeoTracker start:', gErr.message);
        });

        window.dispatchEvent(new CustomEvent('attendance-updated', { detail: res.data.attendance }));

        setSuccessMsg('Attendance Clocked In Successfully!');
        setAttendanceSuccess(true);
        setTimeout(() => {
          setClockingIn(false);
          setAttendanceSuccess(false);
          setCurrentStep('CLOSED');
        }, 600);
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

  if (currentStep === 'CLOSED' || checking) return null;

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'EMP';
  const roleDisplay = user?.designation || user?.role || 'Staff Member';
  const greeting = getGreeting(now);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 select-none"
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
            style={{ background: 'radial-gradient(circle, #2563eb, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
            style={{ background: 'radial-gradient(circle, #f97316, transparent 70%)', animationDelay: '1.5s' }}
          />
        </div>

        {/* Modal Window Container */}
        <motion.div
          key="ATTENDANCE"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Section with Logo and Attendance Badge */}
          <div className="relative p-4 shrink-0 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Attendance Check-in
              </span>
            </div>
            <img src={logoImg} alt="AOTMS" className="h-8 object-contain" />
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="text-xs font-semibold text-slate-500 hover:text-red-600 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
            >
              <FiLogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {/* Greeting Header */}
            <div className="text-center mb-2">
              <h2 className="text-xl font-semibold text-slate-800">
                {greeting}, <span className="text-blue-600">{user?.name?.split(' ')[0] || 'Team'}</span> 👋
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Please clock in your attendance to open your workspace.
              </p>
            </div>

            {/* Date & Time Box */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <FiCalendar className="w-4 h-4 text-blue-600" />
                <div>
                  <span className="text-[10px] text-blue-600 font-medium uppercase tracking-wider block">Today</span>
                  <span className="font-medium text-slate-800">{formatISTDate(now)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 font-mono text-sm font-semibold">
                <FiClock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                <span>{formatISTTime(now)}</span>
              </div>
            </div>

            {/* Employee Profile Card */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center text-white font-medium text-sm overflow-hidden shrink-0 shadow-sm">
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
                  <span className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'Employee'}</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                    {roleDisplay}
                  </span>
                </div>
                <div className="text-xs text-slate-500 truncate mt-0.5">
                  {user?.email || 'user@example.com'}
                </div>
              </div>
            </div>

            {/* Shift Target Info */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-3 text-xs">
              <RiTimerFlashLine className="w-5 h-5 text-orange-500 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 font-medium uppercase">Shift Target</div>
                <div className="font-semibold text-slate-700">09:00:00 Hours</div>
              </div>
            </div>

            {/* Error Banner */}
            {attendanceError && (
              <div className="p-3 rounded-xl flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200">
                <FiAlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{attendanceError}</div>
              </div>
            )}

            {/* Success Banner */}
            {attendanceSuccess && (
              <div className="p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
                <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Start Attendance Action Button */}
            <button
              type="button"
              disabled={clockingIn || attendanceSuccess}
              onClick={handleStartAttendance}
              className="w-full py-3.5 px-4 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {clockingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Clocking In...</span>
                </>
              ) : attendanceSuccess ? (
                <>
                  <FiCheckCircle className="w-4 h-4" />
                  <span>Attendance Active</span>
                </>
              ) : (
                <>
                  <FiPlay className="w-4 h-4 fill-current" />
                  <span>Start Attendance</span>
                </>
              )}
            </button>
          </div>

          {/* Modal Footer */}
          <div className="p-3 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-400 font-medium shrink-0">
            <div className="flex items-center gap-1">
              <FiShield className="w-3.5 h-3.5 text-slate-400" />
              <span>Shift check-in policy active</span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="hover:text-red-500 transition-colors flex items-center gap-1 text-slate-500 font-medium"
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
