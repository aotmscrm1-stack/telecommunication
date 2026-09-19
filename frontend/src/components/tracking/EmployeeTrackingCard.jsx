import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import geoTracker from '../../services/geoTracker';
import { attendanceAPI, trackingAPI } from '../../services/api';
import {
  FaCalendarCheck,
  FaMugHot,
  FaCircleCheck,
  FaPlay,
  FaPause,
  FaStop,
  FaTowerCell,
  FaLocationDot,
  FaClock,
  FaRotate,
  FaPhone,
  FaLaptopCode,
  FaGaugeHigh,
  FaSatelliteDish,
  FaChevronDown,
  FaCalendarDays,
  FaCheck
} from 'react-icons/fa6';

const GRADIENT = 'var(--btn-gradient, linear-gradient(90deg, #ffb37c 0%, #38bdf8 100%))';

// Format seconds into HH:MM:SS format
function formatHms(seconds) {
  if (seconds == null || isNaN(seconds) || seconds < 0) return '00:00:00';
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Format 12-hour time (e.g. 09:15 AM)
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

function formatDurationText(diffSec) {
  if (diffSec == null || isNaN(diffSec) || diffSec <= 0) return '0m';
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

export default function EmployeeTrackingCard({ compact = false }) {
  const { user } = useAuth();
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(''); // '' | 'start' | 'break' | 'resume' | 'stop'
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastSyncText, setLastSyncText] = useState('');
  const [showSimModal, setShowSimModal] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Live timer states (in seconds)
  const [liveWorkSeconds, setLiveWorkSeconds] = useState(0);
  const [liveBreakSeconds, setLiveBreakSeconds] = useState(0);

  // Selected Date Filter ('today', 'yesterday', 'prevDay')
  const [selectedDateFilter, setSelectedDateFilter] = useState('today');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const dateDropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target)) {
        setDateDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const status = attendanceRecord?.status || 'NOT_STARTED';
  const isTracking = status === 'ON_DUTY';
  const isOnBreak = status === 'ON_BREAK';
  const isCompletedToday = status === 'COMPLETED';

  // 1. Fetch current attendance state from backend on mount & restore active session
  useEffect(() => {
    let isMounted = true;

    attendanceAPI
      .getCurrentStatus()
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.attendance) {
          const att = res.data.attendance;
          setAttendanceRecord(att);
          if (att.latestLocation?.latitude) {
            setPosition(att.latestLocation);
          } else if (att.endLocation?.latitude) {
            setPosition(att.endLocation);
          }

          if (att.status === 'ON_DUTY') {
            geoTracker.startTracking().catch((gErr) => {
              console.warn('[EmployeeTrackingCard] Auto-resume GPS watcher notice:', gErr.message);
            });
          }
        }
      })
      .catch((err) => {
        console.warn('[EmployeeTrackingCard] Get current status error:', err.message);
      })
      .finally(() => {
        if (isMounted) setInitialLoading(false);
      });

    // Subscribe to geoTracker state updates
    const unsubscribe = geoTracker.subscribe((state) => {
      if (!isMounted) return;
      if (state.position) setPosition(state.position);
      if (state.error && isTracking) setError(state.error);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isTracking]);

  // 2. High-precision live working & break timers calculation every second
  useEffect(() => {
    if (!attendanceRecord || (!isTracking && !isOnBreak)) {
      if (isCompletedToday && attendanceRecord) {
        setLiveWorkSeconds(attendanceRecord.actualWorkSeconds || 0);
        setLiveBreakSeconds(0);
      }
      return;
    }

    const updateTimers = () => {
      const now = Date.now();
      const startTimeMs = new Date(attendanceRecord.startTime).getTime();
      const breaks = Array.isArray(attendanceRecord.breaks) ? attendanceRecord.breaks : [];

      // Calculate total completed breaks duration
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

      if (isOnBreak && activeBreakObj) {
        // Break is ongoing: calculate active break duration
        const activeBreakStartMs = new Date(activeBreakObj.startTime).getTime();
        const curBreakSec = Math.max(0, Math.floor((now - activeBreakStartMs) / 1000));
        setLiveBreakSeconds(curBreakSec);

        // Working time is frozen at the moment break started
        const workSecAtBreakStart = Math.max(0, Math.floor((activeBreakStartMs - startTimeMs) / 1000) - completedBreaksSec);
        setLiveWorkSeconds(workSecAtBreakStart);
      } else if (isTracking) {
        // On duty: total time elapsed since start minus completed breaks
        const totalElapsedSec = Math.max(0, Math.floor((now - startTimeMs) / 1000));
        const netWorkSec = Math.max(0, totalElapsedSec - completedBreaksSec);
        setLiveWorkSeconds(netWorkSec);
        setLiveBreakSeconds(0);
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [attendanceRecord, isTracking, isOnBreak, isCompletedToday]);

  // 3. Relative last updated timer for GPS
  useEffect(() => {
    if (!isTracking) {
      setLastSyncText('Not syncing');
      return;
    }
    const interval = setInterval(() => {
      if (geoTracker.lastSentTime > 0) {
        const diffSec = Math.floor((Date.now() - geoTracker.lastSentTime) / 1000);
        if (diffSec < 2) setLastSyncText('Just now');
        else if (diffSec < 60) setLastSyncText(`${diffSec}s ago`);
        else setLastSyncText(`${Math.floor(diffSec / 60)}m ago`);
      } else {
        setLastSyncText('Waiting for GPS fix...');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking]);

  // Helper to extract device battery if supported
  const getBatteryLevel = async () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function') {
        const battery = await navigator.getBattery();
        return Math.round(battery.level * 100);
      }
    } catch {
      // ignore
    }
    return null;
  };

  // Helper to get one-time GPS fix before API start
  const getGpsFix = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation is not supported by your browser.'));
      }
      navigator.geolocation.getCurrentPosition(
        resolve,
        (err) => {
          if (err.code === 1) return reject(err); // Denied
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 0,
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

  // 4. Start Attendance Handler
  const handleStartAttendance = async () => {
    setError('');
    setActionLoading('start');

    try {
      let lat = null;
      let lng = null;
      let accuracy = 10;
      let speed = 0;
      let heading = 0;

      try {
        const pos = await getGpsFix();
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        accuracy = pos.coords.accuracy || 10;
        speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6 * 10) / 10 : 0;
        heading = pos.coords.heading || 0;
      } catch (gpsErr) {
        if (gpsErr.code === 1) {
          throw new Error('Location permission denied. Please allow GPS location access in your browser to start attendance.');
        } else {
          console.warn('[Start Attendance] GPS fix fallback:', gpsErr.message);
        }
      }

      const battery = await getBatteryLevel();

      const res = await attendanceAPI.start({
        latitude: lat,
        longitude: lng,
        accuracy,
        speed,
        heading,
        battery,
        platform: navigator.platform || '',
      });

      const att = res.data?.attendance;
      setAttendanceRecord(att);

      if (att?.latestLocation) {
        setPosition(att.latestLocation);
      }

      try {
        await geoTracker.startTracking();
      } catch (trackErr) {
        console.warn('[GeoTracker start tracking error]:', trackErr.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to start attendance. Please try again.');
    } finally {
      setActionLoading('');
    }
  };

  // 5. Start Break Handler
  const handleStartBreak = async () => {
    setError('');
    setActionLoading('break');

    try {
      const res = await attendanceAPI.startBreak({});
      const att = res.data?.attendance;
      setAttendanceRecord(att);
    } catch (err) {
      setError(err.message || 'Failed to start break. Please try again.');
    } finally {
      setActionLoading('');
    }
  };

  // 6. Resume Work Handler
  const handleResumeWork = async () => {
    setError('');
    setActionLoading('resume');

    try {
      const res = await attendanceAPI.resumeBreak({});
      const att = res.data?.attendance;
      setAttendanceRecord(att);
    } catch (err) {
      setError(err.message || 'Failed to resume work. Please try again.');
    } finally {
      setActionLoading('');
    }
  };

  // 7. Stop / Leave Handler
  const handleStopAttendance = async () => {
    setError('');
    setActionLoading('stop');

    try {
      const curPos = geoTracker.lastPosition || position || {};

      const res = await attendanceAPI.stop({
        latitude: curPos.latitude,
        longitude: curPos.longitude,
        accuracy: curPos.accuracy || 0,
      });

      const att = res.data?.attendance;
      setAttendanceRecord(att);

      await geoTracker.stopTracking().catch(() => {});
    } catch (err) {
      setError(err.message || 'Failed to stop attendance session. Please try again.');
    } finally {
      setActionLoading('');
    }
  };

  // ── Development Simulation Tool (Pothuri Towers -> MG Road Vijayawada) ────
  const runSimulatedRoute = async () => {
    setSimulating(true);
    setError('');
    try {
      const officeLat = 16.499614;
      const officeLng = 80.648500;

      const waypoints = [
        { lat: officeLat, lng: officeLng, speed: 0, heading: 0, desc: '1. At Office: Pothuri Towers, Opposite Lucky Mall (Stationary)' },
        { lat: officeLat + 0.0006, lng: officeLng + 0.0008, speed: 16, heading: 60, desc: '2. Leaving Pothuri Towers onto MG Road' },
        { lat: officeLat + 0.0014, lng: officeLng + 0.0028, speed: 32, heading: 75, desc: '3. Riding East on MG Road past DV Manor / Lucky Mall' },
        { lat: officeLat + 0.0026, lng: officeLng + 0.0062, speed: 42, heading: 70, desc: '4. Accelerating along MG Road / Labbipet' },
        { lat: officeLat + 0.0034, lng: officeLng + 0.0086, speed: 0, heading: 70, desc: '5. Stopped at Benz Circle Traffic Signal' },
        { lat: officeLat + 0.0048, lng: officeLng + 0.0120, speed: 36, heading: 60, desc: '6. Moving along Bandar Road' },
        { lat: officeLat + 0.0063, lng: officeLng + 0.0150, speed: 0, heading: 60, desc: '7. Arrived at Destination (Stopped)' },
      ];

      for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i];
        const res = await trackingAPI.devSimulate({
          targetUserId: user?._id,
          latitude: wp.lat,
          longitude: wp.lng,
          speed: wp.speed,
          heading: wp.heading,
        });

        const loc = res.data?.location || {};
        setPosition({
          latitude: wp.lat,
          longitude: wp.lng,
          speed: wp.speed,
          heading: wp.heading,
          accuracy: 5,
          road: loc.road,
          trackingStatus: loc.trackingStatus,
        });

        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err) {
      setError(err.message || 'Simulation error');
    } finally {
      setSimulating(false);
      setShowSimModal(false);
    }
  };

  const completedBreaksCount = (attendanceRecord?.breaks || []).filter((b) => b?.status === 'COMPLETED').length;
  const activeBreakNum = (attendanceRecord?.breaks || []).find((b) => b?.status === 'ACTIVE')?.breakNumber || (completedBreaksCount + 1);

  const now = new Date();
  const dayToday = now.toLocaleDateString('en-US', { weekday: 'short' });
  const dateToday = now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const dayYesterday = yesterday.toLocaleDateString('en-US', { weekday: 'short' });
  const dateYesterday = yesterday.getDate();

  const prevDay = new Date(now);
  prevDay.setDate(now.getDate() - 2);
  const dayPrevDay = prevDay.toLocaleDateString('en-US', { weekday: 'short' });
  const datePrevDay = prevDay.getDate();

  const totalShiftSec = liveWorkSeconds + liveBreakSeconds;
  const liveEfficiencyPercent = totalShiftSec > 0 
    ? Math.min(100, Math.max(15, Math.round((liveWorkSeconds / totalShiftSec) * 100))) 
    : (isCompletedToday ? 94 : 86);

  return (
    <div className="bg-white rounded-[28px] border border-gray-100/90 p-6 shadow-[0_4px_25px_rgba(0,0,0,0.03)] relative overflow-hidden text-gray-900">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#e6f4ea] text-[#0d6537] flex items-center justify-center font-bold shrink-0 shadow-xs border border-[#b7e4c7]">
            <FaTowerCell className="w-5 h-5 text-[#0d6537]" />
          </div>
          <div>
            <h4 className="m-0 text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <span>Attendance & Live Location Status</span>
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{
                  background: isTracking ? '#0d6537' : isOnBreak ? '#f59e0b' : isCompletedToday ? '#22c55e' : '#ef4444',
                }}
              />
              <span className="text-xs font-semibold text-gray-500">
                {isTracking
                  ? 'On Duty — Live Telemetry & GPS Location Active'
                  : isOnBreak
                  ? `On Break (Break #${activeBreakNum}) — Work Timer Paused`
                  : isCompletedToday
                  ? `Completed — Attendance Recorded (${attendanceRecord?.formattedActualWork || attendanceRecord?.formattedDuration || 'Logged'})`
                  : 'Off Duty — Attendance Not Started'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Custom Date Selector Filter Dropdown with React Icons */}
          <div className="relative" ref={dateDropdownRef}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              className="bg-white hover:bg-gray-50 border border-gray-200/90 text-gray-800 text-xs font-semibold rounded-full px-4 py-2 flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <FaCalendarDays className="w-3.5 h-3.5 text-[#0d6537]" />
              <span>
                {selectedDateFilter === 'today'
                  ? `Open Now — Today (${dayToday} ${dateToday})`
                  : selectedDateFilter === 'yesterday'
                  ? `Yesterday (${dayYesterday} ${dateYesterday})`
                  : `Previous Day (${dayPrevDay} ${datePrevDay})`}
              </span>
              <FaChevronDown className={`w-2.5 h-2.5 text-gray-400 transition-transform duration-200 ${dateDropdownOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
              {dateDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 z-40 text-xs flex flex-col gap-1"
                >
                  <button
                    type="button"
                    onClick={() => { setSelectedDateFilter('today'); setDateDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between font-medium transition-colors cursor-pointer ${
                      selectedDateFilter === 'today' ? 'bg-[#e6f4ea] text-[#0d6537] font-bold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#0d6537] animate-pulse" />
                      <span>Open Now — Today ({dayToday} {dateToday})</span>
                    </div>
                    {selectedDateFilter === 'today' && <FaCheck className="w-3 h-3 text-[#0d6537]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSelectedDateFilter('yesterday'); setDateDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between font-medium transition-colors cursor-pointer ${
                      selectedDateFilter === 'yesterday' ? 'bg-[#e6f4ea] text-[#0d6537] font-bold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FaCircleCheck className="w-3 h-3 text-emerald-600" />
                      <span>Yesterday ({dayYesterday} {dateYesterday})</span>
                    </div>
                    {selectedDateFilter === 'yesterday' && <FaCheck className="w-3 h-3 text-[#0d6537]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSelectedDateFilter('prevDay'); setDateDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between font-medium transition-colors cursor-pointer ${
                      selectedDateFilter === 'prevDay' ? 'bg-[#e6f4ea] text-[#0d6537] font-bold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FaClock className="w-3 h-3 text-teal-600" />
                      <span>Previous Day ({dayPrevDay} {datePrevDay})</span>
                    </div>
                    {selectedDateFilter === 'prevDay' && <FaCheck className="w-3 h-3 text-[#0d6537]" />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Live Working Digital Counter */}
          {(isTracking || isOnBreak || isCompletedToday) && (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200/80 px-4 py-2 rounded-2xl">
              <FaClock className="w-4 h-4 text-[#0d6537]" />
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Live Work Counter</div>
                <div className="text-sm font-black text-gray-900 font-mono tracking-tight">
                  {formatHms(liveWorkSeconds)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ACTIVE RECORD CARD DISPLAY (ONLY SELECTED DATE SHOWN) ────────── */}
      <div className="my-3">
        <AnimatePresence mode="wait">
          {/* CARD 1: TODAY (Light Lime Green Theme) */}
          {selectedDateFilter === 'today' && (
            <motion.div 
              key="today-card"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="bg-gradient-to-r from-[#d9f99d] via-[#dcfce7] to-[#e6f4ea] text-[#0d4722] rounded-[24px] p-4 shadow-sm border border-[#b7e4c7] flex items-center justify-between flex-wrap gap-4 relative"
            >
              <div className="flex items-center gap-4 flex-wrap">
                {/* Date Badge Chevron */}
                <div className="relative flex items-center shrink-0">
                  <div className="bg-white rounded-2xl px-4 py-2.5 shadow-md flex flex-col items-center justify-center min-w-[68px] border border-gray-100 text-gray-900">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{dayToday}</span>
                    <span className="text-2xl font-black tracking-tight leading-none mt-0.5 text-gray-900">{dateToday}</span>
                  </div>
                  <div className="w-0 h-0 border-y-[9px] border-y-transparent border-l-[9px] border-l-white -ml-[1px]" />
                </div>

                {/* Productive & Wave Sparkline */}
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-[11px] font-bold text-[#0d4722]/80 uppercase tracking-wider">Productive</div>
                    <div className="flex items-center gap-2 mt-1">
                      <svg className="w-14 h-5 overflow-visible shrink-0" viewBox="0 0 60 20">
                        <path d="M0 10 Q12 2, 24 10 T48 10 T60 10" fill="none" stroke="#0d6537" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                      <span className="bg-white/90 shadow-2xs text-[#0d6537] text-xs font-black px-2.5 py-0.5 rounded-full border border-[#0d6537]/20">
                        {liveEfficiencyPercent}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-9 w-[1px] bg-[#0d4722]/20 hidden md:block" />

                {/* Productive Time */}
                <div>
                  <div className="text-[11px] font-bold text-[#0d4722]/80 uppercase tracking-wider">Productive Time</div>
                  <div className="text-xl font-black text-[#0d4722] tracking-tight mt-0.5">
                    {formatDurationText(liveWorkSeconds)}
                  </div>
                </div>

                <div className="h-9 w-[1px] bg-[#0d4722]/20 hidden md:block" />

                {/* Time at Work */}
                <div>
                  <div className="text-[11px] font-bold text-[#0d4722]/80 uppercase tracking-wider">Time at Work</div>
                  <div className="text-xl font-black text-[#0d4722] tracking-tight mt-0.5">
                    {formatDurationText(liveWorkSeconds + liveBreakSeconds)}
                  </div>
                </div>
              </div>

              {/* Integrated Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap ml-auto">
                {/* Button 1: Start Attendance */}
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 8px 20px rgba(13, 101, 55, 0.25)' }}
                  whileTap={{ scale: 0.95 }}
                  id="start-attendance-btn"
                  onClick={handleStartAttendance}
                  disabled={!!actionLoading || initialLoading || simulating || isTracking || isOnBreak}
                  className={`rounded-full px-5 py-2 text-xs font-bold flex items-center gap-2 transition-all ${
                    isTracking || isOnBreak
                      ? 'bg-white/50 text-gray-400 cursor-not-allowed border border-white/60'
                      : 'bg-[#0d6537] hover:bg-[#0b542e] text-white shadow-sm cursor-pointer'
                  }`}
                >
                  {actionLoading === 'start' ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <FaCalendarCheck className="w-3.5 h-3.5" />
                      <span>Start Attendance</span>
                    </>
                  )}
                </motion.button>

                {/* Button 2: Take Break / Resume Work */}
                {isOnBreak ? (
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: '0 8px 20px rgba(13, 101, 55, 0.25)' }}
                    whileTap={{ scale: 0.95 }}
                    id="resume-work-btn"
                    onClick={handleResumeWork}
                    disabled={!!actionLoading || initialLoading || simulating}
                    className="bg-[#0d6537] hover:bg-[#0b542e] text-white rounded-full px-5 py-2 text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                  >
                    {actionLoading === 'resume' ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Resuming...</span>
                      </>
                    ) : (
                      <>
                        <FaPlay className="w-3 h-3" />
                        <span>Resume Work</span>
                      </>
                    )}
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: '0 8px 20px rgba(217, 119, 6, 0.25)' }}
                    whileTap={{ scale: 0.95 }}
                    id="take-break-btn"
                    onClick={handleStartBreak}
                    disabled={!!actionLoading || initialLoading || simulating || !isTracking}
                    className={`rounded-full px-5 py-2 text-xs font-bold flex items-center gap-2 transition-all ${
                      !isTracking
                        ? 'bg-white/50 text-gray-400 border border-white/60 cursor-not-allowed'
                        : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm cursor-pointer'
                    }`}
                  >
                    {actionLoading === 'break' ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Pausing...</span>
                      </>
                    ) : (
                      <>
                        <FaMugHot className="w-3.5 h-3.5" />
                        <span>Take Break</span>
                      </>
                    )}
                  </motion.button>
                )}

                {/* Button 3: Stop / Leave */}
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 8px 20px rgba(225, 29, 72, 0.25)' }}
                  whileTap={{ scale: 0.95 }}
                  id="stop-attendance-btn"
                  onClick={handleStopAttendance}
                  disabled={!!actionLoading || initialLoading || simulating || (!isTracking && !isOnBreak)}
                  className={`rounded-full px-5 py-2 text-xs font-bold flex items-center gap-2 transition-all ${
                    !isTracking && !isOnBreak
                      ? 'bg-white/50 text-gray-400 border border-white/60 cursor-not-allowed'
                      : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer'
                  }`}
                >
                  {actionLoading === 'stop' ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Stopping...</span>
                    </>
                  ) : (
                    <>
                      <FaStop className="w-3 h-3" />
                      <span>Stop / Leave</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* CARD 2: YESTERDAY (Medium Emerald Green Theme) */}
          {selectedDateFilter === 'yesterday' && (
            <motion.div 
              key="yesterday-card"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="bg-gradient-to-r from-[#22c55e] via-[#16a34a] to-[#15803d] text-white rounded-[24px] p-4 shadow-sm border border-emerald-500/40 flex items-center justify-between flex-wrap gap-4"
            >
              <div className="flex items-center gap-4 flex-wrap">
                {/* Date Badge Chevron */}
                <div className="relative flex items-center shrink-0">
                  <div className="bg-white rounded-2xl px-4 py-2.5 shadow-md flex flex-col items-center justify-center min-w-[68px] border border-gray-100 text-gray-900">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{dayYesterday}</span>
                    <span className="text-2xl font-black tracking-tight leading-none mt-0.5 text-gray-900">{dateYesterday}</span>
                  </div>
                  <div className="w-0 h-0 border-y-[9px] border-y-transparent border-l-[9px] border-l-white -ml-[1px]" />
                </div>

                {/* Productive & Wave Sparkline */}
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">Productive</div>
                    <div className="flex items-center gap-2 mt-1">
                      <svg className="w-14 h-5 overflow-visible shrink-0" viewBox="0 0 60 20">
                        <path d="M0 10 Q12 2, 24 10 T48 10 T60 10" fill="none" stroke="#b7e4c7" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                      <span className="bg-white/20 backdrop-blur-xs text-white text-xs font-black px-2.5 py-0.5 rounded-full border border-white/30">
                        72%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-9 w-[1px] bg-white/20 hidden md:block" />

                {/* Productive Time */}
                <div>
                  <div className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">Productive Time</div>
                  <div className="text-xl font-black text-white tracking-tight mt-0.5">
                    4h 10m
                  </div>
                </div>

                <div className="h-9 w-[1px] bg-white/20 hidden md:block" />

                {/* Time at Work */}
                <div>
                  <div className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">Time at Work</div>
                  <div className="text-xl font-black text-white tracking-tight mt-0.5">
                    6h 30m
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-xs px-3.5 py-1.5 rounded-full text-xs font-bold text-white border border-white/30 ml-auto">
                <FaCircleCheck className="w-3.5 h-3.5 text-emerald-200" />
                <span>Shift Completed ✔</span>
              </div>
            </motion.div>
          )}

          {/* CARD 3: PREVIOUS DAY (Deep Forest / Spruce Dark Green Theme) */}
          {selectedDateFilter === 'prevDay' && (
            <motion.div 
              key="prevday-card"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="bg-gradient-to-r from-[#0c4a3e] via-[#134e4a] to-[#064e3b] text-white rounded-[24px] p-4 shadow-sm border border-[#0c4a3e] flex items-center justify-between flex-wrap gap-4"
            >
              <div className="flex items-center gap-4 flex-wrap">
                {/* Date Badge Chevron */}
                <div className="relative flex items-center shrink-0">
                  <div className="bg-white rounded-2xl px-4 py-2.5 shadow-md flex flex-col items-center justify-center min-w-[68px] border border-gray-100 text-gray-900">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{dayPrevDay}</span>
                    <span className="text-2xl font-black tracking-tight leading-none mt-0.5 text-gray-900">{datePrevDay}</span>
                  </div>
                  <div className="w-0 h-0 border-y-[9px] border-y-transparent border-l-[9px] border-l-white -ml-[1px]" />
                </div>

                {/* Productive & Wave Sparkline */}
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider">Productive</div>
                    <div className="flex items-center gap-2 mt-1">
                      <svg className="w-14 h-5 overflow-visible shrink-0" viewBox="0 0 60 20">
                        <path d="M0 10 Q12 2, 24 10 T48 10 T60 10" fill="none" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                      <span className="bg-white/20 backdrop-blur-xs text-white text-xs font-black px-2.5 py-0.5 rounded-full border border-white/30">
                        60%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-9 w-[1px] bg-white/20 hidden md:block" />

                {/* Productive Time */}
                <div>
                  <div className="text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider">Productive Time</div>
                  <div className="text-xl font-black text-white tracking-tight mt-0.5">
                    3h 05m
                  </div>
                </div>

                <div className="h-9 w-[1px] bg-white/20 hidden md:block" />

                {/* Time at Work */}
                <div>
                  <div className="text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider">Time at Work</div>
                  <div className="text-xl font-black text-white tracking-tight mt-0.5">
                    7h 10m
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-xs px-3.5 py-1.5 rounded-full text-xs font-bold text-white border border-white/30 ml-auto">
                <FaClock className="w-3.5 h-3.5 text-lime-300" />
                <span>Verified Log ✔</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 3. Break Details History Chips (if breaks have been taken) ──────── */}
      {Array.isArray(attendanceRecord?.breaks) && attendanceRecord.breaks.length > 0 && (
        <div
          style={{
            background: 'rgba(255,255,255,0.7)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 12,
            border: '1px solid #cae9ea',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#457b9d', textTransform: 'uppercase' }}>
            ☕ Breaks Today:
          </span>
          {attendanceRecord.breaks.map((b, idx) => (
            <div
              key={idx}
              style={{
                background: b.status === 'ACTIVE' ? '#fffbeb' : '#ffffff',
                border: `1px solid ${b.status === 'ACTIVE' ? '#fde68a' : '#cbd5e1'}`,
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: 11.5,
                fontWeight: 600,
                color: b.status === 'ACTIVE' ? '#b45309' : '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>{b.status === 'ACTIVE' ? '🟡' : '✅'}</span>
              <b>Break #{b.breakNumber}:</b>
              <span>{formatTime12h(b.startTime)} - {b.endTime ? formatTime12h(b.endTime) : 'Active'}</span>
              <span style={{ color: b.status === 'ACTIVE' ? '#d97706' : '#059669', fontWeight: 700 }}>
                ({b.formattedDuration || formatDurationText(b.durationSeconds)})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── 4. Telemetry Stats Grid (Location, Speed, GPS Accuracy, Last Sync) ─ */}
      {(isTracking || isOnBreak || (position && position.latitude)) && (
        <div className="bg-gray-50/80 rounded-2xl p-3.5 mt-3 border border-gray-200/70 grid grid-cols-2 sm:grid-cols-4 gap-3 shadow-2xs">
          {/* Item 1: Current Location */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-[#0d6537] flex items-center justify-center shrink-0">
              <FaLocationDot className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Location</div>
              <div className="text-xs font-bold text-gray-900 truncate mt-0.5" title={position?.road || 'Vijayawada, AP'}>
                {position?.trackingStatus === 'AT_OFFICE'
                  ? '🏢 AOTMS - Pothuri Towers'
                  : position?.road
                  ? position.road
                  : position?.latitude
                  ? `${position.latitude.toFixed(3)}, ${position.longitude.toFixed(3)}`
                  : 'Vijayawada, AP'}
              </div>
            </div>
          </div>

          {/* Item 2: Speed */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
              <FaGaugeHigh className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Speed</div>
              <div className="text-xs font-bold text-emerald-700 mt-0.5">
                {position?.speed != null && position.speed > 0 ? `${position.speed} km/h` : '0 km/h'}
              </div>
            </div>
          </div>

          {/* Item 3: GPS Accuracy */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-100/70 text-sky-600 flex items-center justify-center shrink-0">
              <FaSatelliteDish className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">GPS Accuracy</div>
              <div className="text-xs font-bold text-gray-900 mt-0.5">
                ±{Math.round(position?.accuracy || 5)}m
              </div>
            </div>
          </div>

          {/* Item 4: Last Sync */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center shrink-0">
              <FaRotate className="w-3.5 h-3.5 animate-spin-slow" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Sync</div>
              <div className="text-xs font-bold text-gray-900 mt-0.5">{lastSyncText || 'Just now'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Error notice display */}
      {error && (
        <div
          style={{
            background: '#fad7da',
            color: '#cb1928',
            border: '1.5px solid #f08790',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 13,
            marginBottom: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <b>⚠️ Location Notice:</b> {error}
          </div>
          <button
            onClick={handleStartAttendance}
            style={{
              background: '#f5afb5',
              color: '#99131e',
              border: '1px solid #f08790',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              marginLeft: 8,
              whiteSpace: 'nowrap',
            }}
          >
            Retry
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(2, 132, 199, 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(2, 132, 199, 0.15); }
        }
      `}</style>

      {/* Transparency & Consent Notice */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <p style={{ margin: 0, fontSize: 12, color: '#457b9d', fontWeight: 600, lineHeight: 1.4 }}>
          🔒 Your location is shared securely in real-time only with authorized team managers while sharing is turned ON.
        </p>

        {/* Development Simulation Button */}
        <button
          onClick={() => setShowSimModal(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#6366f1',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'underline',
            whiteSpace: 'nowrap',
            marginLeft: 8,
          }}
        >
          🧪 Dev Simulation
        </button>
      </div>

      {/* Dev Simulation Modal */}
      {showSimModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
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
              borderRadius: 14,
              padding: 22,
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                🧪 Test Vijayawada M.G. Road Field Route
              </h3>
              <button
                onClick={() => setShowSimModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, marginBottom: 16 }}>
              Simulates a realistic field journey starting at Pothuri Towers:
              <br />
              <b>1. 🏢 At Office: Pothuri Towers, Opp. Lucky Mall (Stationary)</b>
              <br />
              <b>2. 🚶 Leaving Office Building onto MG Road</b>
              <br />
              <b>3. 🏍️ Riding East on MG Road past DV Manor / Lucky Mall (32 km/h)</b>
              <br />
              <b>4. 🏍️ Accelerating along MG Road / Labbipet (42 km/h)</b>
              <br />
              <b>5. 🟡 Stopped at Benz Circle Traffic Signal (0 km/h)</b>
              <br />
              <b>6. 🏍️ Moving along Bandar Road (36 km/h)</b>
              <br />
              <b>7. 📍 Destination Reached (Stopped)</b>
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowSimModal(false)}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={runSimulatedRoute}
                disabled={simulating}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  background: GRADIENT,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: simulating ? 0.7 : 1,
                }}
              >
                {simulating ? 'Simulating Journey...' : '▶ Start Test Drive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
