import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  CircleF,
  PolylineF,
  OverlayViewF,
  OverlayView,
  InfoWindowF,
} from '@react-google-maps/api';
import {
  OFFICE_LOCATION,
  OFFICE_COORDS_LNG_LAT,
  STATUS_THEME,
  isValidCoordinates,
} from '../../config/trackingConfig';

const LIBRARIES = ['places', 'geometry'];

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
};

const DEFAULT_MAP_OPTIONS = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: true,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'simplified' }],
    },
    {
      featureType: 'transit',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

export default function LiveMap({
  employees = [],
  selectedEmployeeId = null,
  onSelectEmployee = () => {},
  historyPoints = [],
  historyBounds = null,
  isHistoryMode = false,
  officeConfig = null,
  followEmployee = false,
  onToggleFollow = () => {},
  showRouteTrail = true,
  onToggleRouteTrail = () => {},
}) {
  const mapRef = useRef(null);
  const [selectedPopupEmployee, setSelectedPopupEmployee] = useState(null);

  // Determine Google Maps API Key from officeConfig or environment
  const apiKey =
    officeConfig?.googleMapsApiKey ||
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    '';

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  // Office Coordinates & Radius (Single source of truth)
  const officeCenter = useMemo(() => {
    if (officeConfig?.latitude && officeConfig?.longitude) {
      return {
        lat: Number(officeConfig.latitude),
        lng: Number(officeConfig.longitude),
      };
    }
    return {
      lat: OFFICE_COORDS_LNG_LAT[1],
      lng: OFFICE_COORDS_LNG_LAT[0],
    };
  }, [officeConfig]);

  const geofenceRadius = officeConfig?.radiusMeters || OFFICE_LOCATION.radiusMeters;

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Selected Employee object
  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees.find(
      (e) => String(e._id || e.employeeId || e.id || '') === String(selectedEmployeeId)
    );
  }, [employees, selectedEmployeeId]);

  // Keep map centered on selected employee if followMode is enabled
  useEffect(() => {
    if (!mapRef.current || !followEmployee || !selectedEmployee?.location) return;
    const loc = selectedEmployee.location;
    if (isValidCoordinates(loc.latitude, loc.longitude)) {
      mapRef.current.panTo({ lat: Number(loc.latitude), lng: Number(loc.longitude) });
    }
  }, [followEmployee, selectedEmployee]);

  // Fit bounds in History Mode or when historyBounds changes
  useEffect(() => {
    if (!mapRef.current || !isHistoryMode || !historyBounds) return;
    try {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: historyBounds.minLat, lng: historyBounds.minLng });
      bounds.extend({ lat: historyBounds.maxLat, lng: historyBounds.maxLng });
      mapRef.current.fitBounds(bounds, { padding: 60 });
    } catch (err) {
      console.warn('[Google Maps FitBounds Warning]:', err);
    }
  }, [isHistoryMode, historyBounds]);

  // Center Map to Office
  const centerToOffice = () => {
    if (mapRef.current) {
      mapRef.current.panTo(officeCenter);
      mapRef.current.setZoom(16);
    }
  };

  // Center Map to Selected Employee
  const centerToSelectedEmployee = () => {
    if (!selectedEmployee?.location || !mapRef.current) return;
    const loc = selectedEmployee.location;
    if (isValidCoordinates(loc.latitude, loc.longitude)) {
      mapRef.current.panTo({ lat: Number(loc.latitude), lng: Number(loc.longitude) });
      mapRef.current.setZoom(17);
    }
  };

  // Polyline coordinates for historical route
  const historyPolylinePath = useMemo(() => {
    if (!isHistoryMode || !historyPoints || historyPoints.length === 0) return [];
    return historyPoints
      .filter((p) => isValidCoordinates(p.latitude, p.longitude))
      .map((p) => ({ lat: Number(p.latitude), lng: Number(p.longitude) }));
  }, [isHistoryMode, historyPoints]);

  if (loadError) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 42, marginBottom: 12 }}>🗺️</div>
        <h3 style={{ margin: '0 0 6px 0', fontSize: 16, color: '#0f172a', fontWeight: 800 }}>
          Google Maps Initialization Issue
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', maxWidth: 420 }}>
          {loadError?.message || 'Unable to load Google Maps SDK. Please verify VITE_GOOGLE_MAPS_API_KEY in .env file.'}
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          gap: 12,
        }}
      >
        <div className="w-10 h-10 spinner-gradient" />
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
          Loading Google Maps Engine...
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={officeCenter}
        zoom={15.5}
        options={DEFAULT_MAP_OPTIONS}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
        onClick={() => setSelectedPopupEmployee(null)}
      >
        {/* ── 1. AOTMS Office Geofence Circle (100m Radius) ──────────────────── */}
        <CircleF
          center={officeCenter}
          radius={geofenceRadius}
          options={{
            fillColor: '#0284c7',
            fillOpacity: 0.14,
            strokeColor: '#0284c7',
            strokeOpacity: 0.85,
            strokeWeight: 2,
          }}
        />

        {/* ── 2. AOTMS Office Marker Overlay ─────────────────────────────────── */}
        <OverlayViewF
          position={officeCenter}
          mapPaneName={OverlayView.OVERLAY_MOUSETARGET}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              centerToOffice();
            }}
            style={{
              transform: 'translate(-50%, -100%)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              filter: 'drop-shadow(0 4px 12px rgba(2, 132, 199, 0.45))',
            }}
          >
            <div
              style={{
                background: '#0284c7',
                color: '#ffffff',
                width: 44,
                height: 44,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                border: '3px solid #ffffff',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}
            >
              🏢
            </div>
            <div
              style={{
                marginTop: 4,
                background: 'rgba(15, 23, 42, 0.94)',
                color: '#ffffff',
                fontSize: 10.5,
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 6,
                whiteSpace: 'nowrap',
                border: '1px solid rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <span>🏢 AOTMS OFFICE</span>
            </div>
          </div>
        </OverlayViewF>

        {/* ── 3. Live Employee Overlay Markers ──────────────────────────────── */}
        {!isHistoryMode &&
          employees.map((emp) => {
            const uId = String(emp._id || emp.employeeId || emp.id || '');
            const loc = emp.location || {};
            if (!isValidCoordinates(loc.latitude, loc.longitude)) return null;

            const isSelected = String(selectedEmployeeId || '') === uId;
            const status = loc.trackingStatus || 'OFFLINE';
            const theme = STATUS_THEME[status] || STATUS_THEME.STOPPED;
            const heading = loc.heading || 0;
            const speed = loc.speed || 0;
            const road = loc.road || '';
            const initial = (emp.name || 'E').charAt(0).toUpperCase();

            const pos = { lat: Number(loc.latitude), lng: Number(loc.longitude) };

            return (
              <OverlayViewF
                key={uId}
                position={pos}
                mapPaneName={OverlayView.OVERLAY_MOUSETARGET}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEmployee(uId);
                    setSelectedPopupEmployee(emp);
                  }}
                  style={{
                    transform: isSelected
                      ? 'translate(-50%, -100%) scale(1.15)'
                      : 'translate(-50%, -100%) scale(1)',
                    transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    cursor: 'pointer',
                    zIndex: isSelected ? 60 : 25,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  {/* MOVING STATUS (Motorcycle / Delivery Courier Marker) */}
                  {status === 'MOVING' || status === 'LEAVING_OFFICE' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        style={{
                          position: 'relative',
                          width: 46,
                          height: 46,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {/* Direction Compass Ring */}
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            background: '#ffffff',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.28), 0 0 0 2.5px #10b981',
                          }}
                        />

                        {/* Rotating Motorcycle SVG */}
                        <div
                          style={{
                            position: 'absolute',
                            width: 36,
                            height: 36,
                            transform: `rotate(${heading}deg)`,
                            transition: 'transform 0.35s ease-out',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg width="32" height="32" viewBox="0 0 34 34" fill="none">
                            <rect x="15" y="24" width="4" height="8" rx="2" fill="#1e293b" />
                            <rect x="15" y="2" width="4" height="8" rx="2" fill="#1e293b" />
                            <rect x="12" y="21" width="2" height="6" rx="1" fill="#64748b" />
                            <path d="M14 8 H20 L19.5 25 H14.5 L14 8 Z" fill="#059669" />
                            <path d="M14.5 11 C14.5 9 19.5 9 19.5 11 L20 18 C20 20 14 20 14 18 Z" fill="#10b981" />
                            <circle cx="17" cy="16" r="4" fill="#0f172a" />
                            <circle cx="17" cy="14.5" r="2.2" fill="#38bdf8" />
                            <path d="M9 9 L25 9" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
                            <rect x="13.5" y="21" width="7" height="6" rx="1.5" fill="#0284c7" stroke="#ffffff" strokeWidth="0.8" />
                          </svg>
                        </div>

                        <div
                          style={{
                            position: 'absolute',
                            bottom: -2,
                            right: -2,
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: '#10b981',
                            border: '2px solid #ffffff',
                          }}
                        />
                      </div>

                      {/* Name & Speed Pill */}
                      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <div
                          style={{
                            background: 'rgba(15, 23, 42, 0.94)',
                            color: '#ffffff',
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 12,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.18)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <span>🏍️ {emp.name || 'Courier'}</span>
                          <span
                            style={{
                              background: '#10b981',
                              color: '#ffffff',
                              fontSize: 9.5,
                              padding: '0 4px',
                              borderRadius: 6,
                              fontWeight: 800,
                            }}
                          >
                            {speed > 0 ? `${speed} km/h` : 'Moving'}
                          </span>
                        </div>
                        {road && (
                          <div
                            style={{
                              background: '#ffffff',
                              color: '#0f172a',
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 8,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                              border: '1px solid #e2e8f0',
                              maxWidth: 130,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            🛣️ {road}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : status === 'AT_OFFICE' ? (
                    /* AT OFFICE STATUS */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        style={{
                          position: 'relative',
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: '#ffffff',
                          border: '3px solid #0284c7',
                          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {emp.avatar ? (
                          <img src={emp.avatar} alt={emp.name} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                            {initial}
                          </div>
                        )}
                        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: '#0284c7', border: '2px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>
                          🏢
                        </div>
                      </div>
                      <div style={{ marginTop: 4, background: 'rgba(15, 23, 42, 0.9)', color: '#ffffff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{emp.name || 'Employee'}</span>
                        <span style={{ background: '#0284c7', color: '#ffffff', fontSize: 8.5, padding: '0 4px', borderRadius: 4, fontWeight: 800 }}>At Office</span>
                      </div>
                    </div>
                  ) : (
                    /* STOPPED / OFFLINE STATUS */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        style={{
                          position: 'relative',
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: '#ffffff',
                          border: `3px solid ${theme.primary}`,
                          boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {emp.avatar ? (
                          <img src={emp.avatar} alt={emp.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: theme.bg, color: theme.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
                            {initial}
                          </div>
                        )}
                      </div>
                      <div style={{ marginTop: 3, background: 'rgba(15, 23, 42, 0.9)', color: '#ffffff', fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 8, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{emp.name || 'Employee'}</span>
                        <span style={{ background: theme.primary, color: '#ffffff', fontSize: 8, padding: '0 3px', borderRadius: 3, fontWeight: 800 }}>
                          {theme.label}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </OverlayViewF>
            );
          })}

        {/* ── 4. Selected Employee InfoWindow Popup ─────────────────────────── */}
        {selectedPopupEmployee && selectedPopupEmployee.location && (
          <InfoWindowF
            position={{
              lat: Number(selectedPopupEmployee.location.latitude),
              lng: Number(selectedPopupEmployee.location.longitude),
            }}
            onCloseClick={() => setSelectedPopupEmployee(null)}
          >
            <div style={{ fontFamily: 'system-ui, sans-serif', padding: '4px 6px', minWidth: 170 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>
                  {selectedPopupEmployee.name || 'Employee'}
                </div>
                <span
                  style={{
                    background: STATUS_THEME[selectedPopupEmployee.location.trackingStatus]?.bg || '#f1f5f9',
                    color: STATUS_THEME[selectedPopupEmployee.location.trackingStatus]?.text || '#475569',
                    padding: '1px 6px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {STATUS_THEME[selectedPopupEmployee.location.trackingStatus]?.label || 'STOPPED'}
                </span>
              </div>
              {selectedPopupEmployee.location.road && (
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', marginBottom: 2 }}>
                  🛣️ {selectedPopupEmployee.location.road}
                </div>
              )}
              {selectedPopupEmployee.location.area && (
                <div style={{ fontSize: 10.5, color: '#64748b', marginBottom: 4 }}>
                  📍 {selectedPopupEmployee.location.area}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5, color: '#64748b', marginTop: 4, borderTop: '1px solid #f1f5f9', paddingTop: 3 }}>
                <span>{selectedPopupEmployee.location.speed > 0 ? `🏍️ ${selectedPopupEmployee.location.speed} km/h` : '⏱️ Stationary'}</span>
              </div>
            </div>
          </InfoWindowF>
        )}

        {/* ── 5. Historical Route Polyline & Waypoints ──────────────────────── */}
        {isHistoryMode && historyPolylinePath.length > 0 && (
          <>
            <PolylineF
              path={historyPolylinePath}
              options={{
                strokeColor: '#0284c7',
                strokeOpacity: 0.85,
                strokeWeight: 4,
              }}
            />
            {/* Start Marker */}
            <OverlayViewF position={historyPolylinePath[0]} mapPaneName={OverlayView.OVERLAY_MOUSETARGET}>
              <div style={{ transform: 'translate(-50%, -50%)', background: '#10b981', color: '#ffffff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, border: '2px solid #ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                A
              </div>
            </OverlayViewF>
            {/* End Marker */}
            <OverlayViewF position={historyPolylinePath[historyPolylinePath.length - 1]} mapPaneName={OverlayView.OVERLAY_MOUSETARGET}>
              <div style={{ transform: 'translate(-50%, -50%)', background: '#ef4444', color: '#ffffff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, border: '2px solid #ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                B
              </div>
            </OverlayViewF>
          </>
        )}
      </GoogleMap>

      {/* Floating Map Controls Bar */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 10,
        }}
      >
        <button
          onClick={centerToOffice}
          title="Center on AOTMS Office"
          style={{
            background: '#ffffff',
            color: '#0284c7',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '7px 12px',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          🏢 Center Office
        </button>
        {selectedEmployee && (
          <button
            onClick={centerToSelectedEmployee}
            title="Locate Selected Employee"
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '7px 12px',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2,132,199,0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            📍 Center Employee
          </button>
        )}
      </div>
    </div>
  );
}
