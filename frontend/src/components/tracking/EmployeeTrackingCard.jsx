import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import geoTracker from '../../services/geoTracker';
import { trackingAPI } from '../../services/api';

const GRADIENT = 'var(--btn-gradient, linear-gradient(90deg, #ffb37c 0%, #38bdf8 100%))';

export default function EmployeeTrackingCard({ compact = false }) {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastSyncText, setLastSyncText] = useState('');
  const [showSimModal, setShowSimModal] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Subscribe to geoTracker state changes
  useEffect(() => {
    const unsubscribe = geoTracker.subscribe((state) => {
      setIsTracking(state.isTracking);
      if (state.position) setPosition(state.position);
      if (state.error) setError(state.error);
    });

    // Also check current backend status
    trackingAPI
      .getStatus()
      .then((res) => {
        if (res.data?.active) {
          setIsTracking(true);
          if (res.data?.location) setPosition(res.data.location);
        }
      })
      .catch(() => {});

    return () => unsubscribe();
  }, []);

  // Relative last updated timer
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

  const handleStart = async () => {
    setError('');
    setLoading(true);
    try {
      await geoTracker.startTracking();
    } catch (err) {
      setError(err.message || 'Failed to start GPS tracking');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setError('');
    setLoading(true);
    try {
      await geoTracker.stopTracking();
    } catch (err) {
      setError(err.message || 'Failed to stop GPS tracking');
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: isTracking ? '#ecfdf5' : '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isTracking ? '#10b981' : '#64748b',
              border: `1px solid ${isTracking ? '#a7f3d0' : '#e2e8f0'}`,
              fontSize: 18,
            }}
          >
            🏍️
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Live Location Tracking</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isTracking ? '#10b981' : '#ef4444',
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: isTracking ? '#059669' : '#64748b' }}>
                {isTracking ? 'Sharing Active (Live)' : 'Not Sharing'}
              </span>
            </div>
          </div>
        </div>

        {/* Toggle Button */}
        <div>
          {isTracking ? (
            <button
              onClick={handleStop}
              disabled={loading || simulating}
              style={{
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fca5a5',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              {loading ? 'Stopping...' : 'Stop Sharing'}
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={loading || simulating}
              style={{
                background: GRADIENT,
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                transition: 'all 0.15s',
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading ? (
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
                  Acquiring GPS...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Start Location Sharing
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Stats Grid */}
      {isTracking && position && (
        <div
          style={{
            background: '#f8fafc',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 10,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: 10,
            border: '1px solid #edf2f7',
          }}
        >
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Current Location
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {position.trackingStatus === 'AT_OFFICE' ? '🏢 AOTMS - Pothuri Towers' : position.road || 'MG Road, Vijayawada'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Speed</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
              {position.speed != null ? `${position.speed} km/h` : '0 km/h'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>GPS Accuracy</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
              ±{Math.round(position.accuracy || 5)}m
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Last Sync</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{lastSyncText}</div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            marginBottom: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <b>⚠️ GPS Notice:</b> {error}
          </div>
          <button
            onClick={handleStart}
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
        <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
          🔒 Your location is shared securely in real-time only with authorized team managers while sharing is turned ON.
        </p>

        {/* Development Simulation Button */}
        <button
          onClick={() => setShowSimModal(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#6366f1',
            fontSize: 11,
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
              <br />
              <br />
              Watch the motorcycle marker glide on the map with rotating heading and real road names!
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
