import { useState, useEffect, useMemo, useRef } from 'react';
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
  FaLaptopCode
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
  const [actionLoading, setActionLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastSyncText, setLastSyncText] = useState('');
  const [showSimModal, setShowSimModal] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Live timer states (in seconds)
  const [liveWorkSeconds, setLiveWorkSeconds] = useState(0);
  const [liveBreakSeconds, setLiveBreakSeconds] = useState(0);

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
    setActionLoading(true);

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
      setActionLoading(false);
    }
  };

  // 5. Start Break Handler
  const handleStartBreak = async () => {
    setError('');
    setActionLoading(true);

    try {
      const res = await attendanceAPI.startBreak({});
      const att = res.data?.attendance;
      setAttendanceRecord(att);
    } catch (err) {
      setError(err.message || 'Failed to start break. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Resume Work Handler
  const handleResumeWork = async () => {
    setError('');
    setActionLoading(true);

    try {
      const res = await attendanceAPI.resumeBreak({});
      const att = res.data?.attendance;
      setAttendanceRecord(att);
    } catch (err) {
      setError(err.message || 'Failed to resume work. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Stop / Leave Handler
  const handleStopAttendance = async () => {
    setError('');
    setActionLoading(true);

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
      setActionLoading(false);
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

  const completedBreaksCount = (attendanceRecord?.breaks || []).filter((b) => b.status === 'COMPLETED').length;
  const activeBreakNum = (attendanceRecord?.breaks || []).find((b) => b.status === 'ACTIVE')?.breakNumber || (completedBreaksCount + 1);

  return (
    <div
      className="bg-white rounded-[28px] border border-gray-100/90 p-6 shadow-[0_4px_25px_rgba(0,0,0,0.03)] relative overflow-hidden text-gray-900"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 border shadow-xs"
            style={{
              background: isTracking ? '#e6f4ea' : isOnBreak ? '#fef3c7' : isCompletedToday ? '#dcfce7' : '#ffe4e6',
              color: isTracking ? '#0d6537' : isOnBreak ? '#b45309' : isCompletedToday ? '#15803d' : '#e11d48',
              borderColor: isTracking ? '#b7e4c7' : isOnBreak ? '#fde68a' : isCompletedToday ? '#86efac' : '#fecdd3',
            }}
          >
            {isTracking ? <FaCalendarCheck className="w-5 h-5 text-[#0d6537]" /> : isOnBreak ? <FaMugHot className="w-5 h-5 text-amber-600" /> : isCompletedToday ? <FaCircleCheck className="w-5 h-5 text-emerald-600" /> : <FaClock className="w-5 h-5 text-rose-500" />}
          </div>
          <div>
            <h4 className="m-0 text-base font-semibold text-gray-900 tracking-tight flex items-center gap-2">
              <FaTowerCell className="w-4 h-4 text-[#0d6537]" />
              <span>Attendance & Live Location Status</span>
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{
                  background: isTracking ? '#0d6537' : isOnBreak ? '#f59e0b' : isCompletedToday ? '#22c55e' : '#ef4444',
                }}
              />
              <span
                className="text-xs font-medium"
                style={{
                  color: isTracking ? '#0d6537' : isOnBreak ? '#b45309' : isCompletedToday ? '#15803d' : '#e11d48',
                }}
              >
                {isTracking
                  ? 'On Duty — Live GPS Location Active'
                  : isOnBreak
                  ? `On Break (Break #${activeBreakNum}) — Work Timer Paused`
                  : isCompletedToday
                  ? `Completed — Attendance Recorded (${attendanceRecord?.formattedActualWork || attendanceRecord?.formattedDuration || 'Logged'})`
                  : 'Off Duty — Attendance Not Started'}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Attendance Action Buttons: Start, Break/Resume, Stop */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Button 1: Start Attendance */}
          <button
            id="start-attendance-btn"
            onClick={handleStartAttendance}
            disabled={actionLoading || initialLoading || simulating || isTracking || isOnBreak}
            title={isTracking || isOnBreak ? 'Attendance is currently active' : 'Click to start attendance and enable live GPS location'}
            className={`rounded-full px-5 py-2 text-xs font-semibold flex items-center gap-2 transition-all ${
              isTracking || isOnBreak
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                : 'bg-[#0d6537] hover:bg-[#0b542e] text-white shadow-sm cursor-pointer'
            }`}
          >
            {actionLoading && !isTracking && !isOnBreak ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Starting...</span>
              </>
            ) : (
              <>
                <FaCalendarCheck className="w-3.5 h-3.5" />
                <span>Start Attendance</span>
              </>
            )}
          </button>

          {/* Button 2: Break / Resume Work Button */}
          {isOnBreak ? (
            /* Resume Work Button */
            <button
              id="resume-work-btn"
              onClick={handleResumeWork}
              disabled={actionLoading || initialLoading || simulating}
              className="bg-[#0d6537] hover:bg-[#0b542e] text-white rounded-full px-5 py-2 text-xs font-semibold shadow-sm flex items-center gap-2 transition-all"
            >
              {actionLoading ? (
                <span>Resuming...</span>
              ) : (
                <>
                  <FaPlay className="w-3 h-3" />
                  <span>Resume Work</span>
                </>
              )}
            </button>
          ) : (
            /* Take Break Button */
            <button
              id="take-break-btn"
              onClick={handleStartBreak}
              disabled={actionLoading || initialLoading || simulating || !isTracking}
              className={`rounded-full px-5 py-2 text-xs font-semibold flex items-center gap-2 transition-all ${
                !isTracking
                  ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 cursor-pointer'
              }`}
            >
              {actionLoading && isTracking ? (
                <span>Pausing...</span>
              ) : (
                <>
                  <FaMugHot className="w-3.5 h-3.5 text-amber-600" />
                  <span>Take Break</span>
                </>
              )}
            </button>
          )}

          {/* Button 3: Stop / Leave Button */}
          <button
            id="stop-attendance-btn"
            onClick={handleStopAttendance}
            disabled={actionLoading || initialLoading || simulating || (!isTracking && !isOnBreak)}
            className={`rounded-full px-5 py-2 text-xs font-semibold flex items-center gap-2 transition-all ${
              !isTracking && !isOnBreak
                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer'
            }`}
          >
            {actionLoading && (isTracking || isOnBreak) ? (
              <span>Stopping...</span>
            ) : (
              <>
                <FaStop className="w-3 h-3 text-rose-600" />
                <span>Stop / Leave</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 2. Live Working Timer & Break Timer Display Card ────────────────── */}
      {(isTracking || isOnBreak || isCompletedToday) && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 14,
            border: `1.5px solid ${isOnBreak ? '#fde68a' : isTracking ? '#a7f3d0' : '#bfdbfe'}`,
            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          {/* Left: Active Working Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: isTracking ? '#ecfdf5' : isOnBreak ? '#fffbeb' : '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                border: `1px solid ${isTracking ? '#a7f3d0' : isOnBreak ? '#fde68a' : '#bfdbfe'}`,
              }}
            >
              ⏱️
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isOnBreak ? 'Actual Working Time (Paused)' : isCompletedToday ? 'Total Actual Working Hours' : 'Live Actual Working Time'}
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  color: isOnBreak ? '#b45309' : isTracking ? '#059669' : '#1e40af',
                  letterSpacing: '0.02em',
                  lineHeight: 1.1,
                  marginTop: 2,
                }}
              >
                {formatHms(liveWorkSeconds)}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                Started at <b style={{ color: '#0f172a' }}>{formatTime12h(attendanceRecord?.startTime)}</b>
                {completedBreaksCount > 0 && ` • ${completedBreaksCount} break${completedBreaksCount > 1 ? 's' : ''} deducted`}
              </div>
            </div>
          </div>

          {/* Right: Break Status / Current Break Live Timer */}
          {isOnBreak ? (
            <div
              style={{
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: 12,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div style={{ fontSize: 24 }}>☕</div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
                  Current Break #{activeBreakNum} Timer
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    color: '#d97706',
                    marginTop: 1,
                  }}
                >
                  {formatHms(liveBreakSeconds)}
                </div>
                <div style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>
                  Click &ldquo;Resume Work&rdquo; when ready
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Breaks Taken Today
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1d3557', marginTop: 2 }}>
                  {attendanceRecord?.breaks?.length || 0} ({attendanceRecord?.formattedBreakDuration || '0m'})
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 12,
            border: '1px solid #a8dadc',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#457b9d', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Current Location
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#1d3557',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: 2,
              }}
            >
              {position?.trackingStatus === 'AT_OFFICE'
                ? '🏢 AOTMS - Pothuri Towers'
                : position?.road
                ? `🛣️ ${position.road}`
                : position?.latitude
                ? `${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`
                : 'Vijayawada, AP'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#457b9d', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Speed</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginTop: 2 }}>
              {position?.speed != null && position.speed > 0 ? `${position.speed} km/h` : '0 km/h'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#457b9d', textTransform: 'uppercase', letterSpacing: '0.3px' }}>GPS Accuracy</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1d3557', marginTop: 2 }}>
              ±{Math.round(position?.accuracy || 5)}m
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#457b9d', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Last Sync</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1d3557', marginTop: 2 }}>{lastSyncText}</div>
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
