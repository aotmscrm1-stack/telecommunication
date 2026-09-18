import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import geoTracker from '../../services/geoTracker';
import { attendanceAPI, trackingAPI } from '../../services/api';

const GRADIENT = 'var(--btn-gradient, linear-gradient(90deg, #ffb37c 0%, #38bdf8 100%))';

export default function EmployeeTrackingCard({ compact = false }) {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastSyncText, setLastSyncText] = useState('');
  const [showSimModal, setShowSimModal] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // 1. Fetch current attendance state from backend on mount & restore active session
  useEffect(() => {
    let isMounted = true;

    attendanceAPI
      .getCurrentStatus()
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.active && res.data?.attendance) {
          setIsTracking(true);
          setAttendanceRecord(res.data.attendance);
          if (res.data.attendance.latestLocation?.latitude) {
            setPosition(res.data.attendance.latestLocation);
          }
          // Resume active live GPS tracking watcher
          geoTracker.startTracking().catch((gErr) => {
            console.warn('[EmployeeTrackingCard] Auto-resume GPS watcher notice:', gErr.message);
          });
        } else if (res.data?.attendance) {
          setIsTracking(false);
          setAttendanceRecord(res.data.attendance);
          if (res.data.attendance.endLocation?.latitude || res.data.attendance.latestLocation?.latitude) {
            setPosition(res.data.attendance.endLocation || res.data.attendance.latestLocation);
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
  }, []);

  // 2. Relative last updated timer
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
          // Retry with standard accuracy if high accuracy timed out
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

  // 3. Start Attendance Handler
  const handleStartAttendance = async () => {
    setError('');
    setLoading(true);

    try {
      let lat = null;
      let lng = null;
      let accuracy = 10;
      let speed = 0;
      let heading = 0;

      // Request GPS location
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

      // Create attendance session on the backend
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
      setIsTracking(true);

      if (att?.latestLocation) {
        setPosition(att.latestLocation);
      }

      // Start real-time background GPS tracking
      try {
        await geoTracker.startTracking();
      } catch (trackErr) {
        console.warn('[GeoTracker start tracking error]:', trackErr.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to start attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Stop / Leave Handler
  const handleStopAttendance = async () => {
    setError('');
    setLoading(true);

    try {
      const curPos = geoTracker.lastPosition || position || {};

      // Mark attendance as completed in the backend
      const res = await attendanceAPI.stop({
        latitude: curPos.latitude,
        longitude: curPos.longitude,
        accuracy: curPos.accuracy || 0,
      });

      const att = res.data?.attendance;
      setAttendanceRecord(att);
      setIsTracking(false);

      // Stop real-time GPS tracking watcher
      await geoTracker.stopTracking().catch(() => {});
    } catch (err) {
      setError(err.message || 'Failed to stop attendance session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Development Simulation Tool (Pothuri Towers -> MG Road Vijayawada) ────
  const runSimulatedRoute = async () => {
    setSimulating(true);
    setError('');
    try {
      // Real AOTMS Office: Pothuri Towers, 2nd Floor, MG Road, Opposite Lucky Mall
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
        setIsTracking(true);

        // Wait 3 seconds between steps
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err) {
      setError(err.message || 'Simulation error');
    } finally {
      setSimulating(false);
      setShowSimModal(false);
    }
  };

  const isCompletedToday = !isTracking && attendanceRecord?.status === 'COMPLETED';

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: compact ? '14px 16px' : '20px 22px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: isTracking ? '#ecfdf5' : isCompletedToday ? '#eff6ff' : '#fff1f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isTracking ? '#10b981' : isCompletedToday ? '#3b82f6' : '#f43f5e',
              border: `1px solid ${isTracking ? '#a7f3d0' : isCompletedToday ? '#bfdbfe' : '#fecdd3'}`,
              fontSize: 22,
            }}
          >
            {isTracking ? '📅' : isCompletedToday ? '✅' : '🌴'}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              Attendance & Live Location Status
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isTracking ? '#10b981' : isCompletedToday ? '#3b82f6' : '#ef4444',
                }}
              />
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: isTracking ? '#059669' : isCompletedToday ? '#2563eb' : '#e11d48',
                }}
              >
                {isTracking
                  ? 'On Duty — Live GPS Location Active'
                  : isCompletedToday
                  ? `Completed — Attendance Recorded (${attendanceRecord?.formattedDuration || 'Logged'})`
                  : 'Off Duty — Attendance Not Started'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Start Attendance & Stop / Leave */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Start Attendance Button */}
          <button
            id="start-attendance-btn"
            onClick={handleStartAttendance}
            disabled={loading || initialLoading || simulating || isTracking}
            title={isTracking ? 'Attendance is currently active' : 'Click to start attendance and enable live GPS location'}
            style={{
              background: isTracking ? '#e2e8f0' : GRADIENT,
              color: isTracking ? '#94a3b8' : '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 700,
              cursor: isTracking || loading || initialLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: isTracking ? 'none' : '0 2px 6px rgba(2, 132, 199, 0.25)',
              transition: 'all 0.15s',
              opacity: loading && !isTracking ? 0.8 : 1,
            }}
          >
            {loading && !isTracking ? (
              <>
                <svg
                  style={{ animation: 'spin 1s linear infinite', width: 14, height: 14 }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
                Starting Attendance...
              </>
            ) : (
              <>
                <span style={{ fontSize: 14 }}>📅</span> Start Attendance
              </>
            )}
          </button>

          {/* Stop / Leave Button */}
          <button
            id="stop-attendance-btn"
            onClick={handleStopAttendance}
            disabled={loading || initialLoading || simulating || !isTracking}
            title={!isTracking ? 'Attendance is not active' : 'Click to stop attendance and disable live location sharing'}
            style={{
              background: !isTracking ? '#f1f5f9' : '#fee2e2',
              color: !isTracking ? '#94a3b8' : '#dc2626',
              border: `1px solid ${!isTracking ? '#e2e8f0' : '#fca5a5'}`,
              borderRadius: 8,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 700,
              cursor: !isTracking || loading || initialLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s',
              opacity: loading && isTracking ? 0.8 : 1,
            }}
          >
            {loading && isTracking ? (
              'Stopping...'
            ) : (
              <>
                <span style={{ fontSize: 14 }}>🌴</span> Stop / Leave
              </>
            )}
          </button>
        </div>
      </div>

      {/* Telemetry Stats Grid */}
      {(isTracking || (position && position.latitude)) && (
        <div
          style={{
            background: '#f8fafc',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 12,
            border: '1px solid #edf2f7',
          }}
        >
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Current Location
            </div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: '#0369a1',
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
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Speed</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#059669', marginTop: 2 }}>
              {position?.speed != null && position.speed > 0 ? `${position.speed} km/h` : '0 km/h'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              GPS Accuracy
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#475569', marginTop: 2 }}>
              ±{Math.round(position?.accuracy || 5)}m
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Last Sync
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#475569', marginTop: 2 }}>{lastSyncText}</div>
          </div>
        </div>
      )}

      {/* Error notice display */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
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
              background: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fca5a5',
              borderRadius: 6,
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 700,
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
      `}</style>

      {/* Transparency & Consent Notice */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <p style={{ margin: 0, fontSize: 11.5, color: '#64748b', lineHeight: 1.4 }}>
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
