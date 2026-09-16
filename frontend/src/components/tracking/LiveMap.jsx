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
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import {
  OFFICE_LOCATION,
  OFFICE_COORDS_LNG_LAT,
  STATUS_THEME,
  isValidCoordinates,
  calculateDistanceMeters,
} from '../../config/trackingConfig';

const GOOGLE_LIBRARIES = ['places', 'geometry'];

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
};

const DEFAULT_GOOGLE_MAP_OPTIONS = {
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

const DEFAULT_MAPLIBRE_STYLE = {
  version: 8,
  sources: {
    'osm-standard': {
      type: 'raster',
      tiles: [
        import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'osm-standard-layer',
      type: 'raster',
      source: 'osm-standard',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

/**
 * Generate a GeoJSON Polygon circle for MapLibre office geofence boundary
 */
function createGeoJsonCircle(centerLngLat, radiusInMeters, points = 64) {
  const coords = { latitude: centerLngLat[1], longitude: centerLngLat[0] };
  const km = radiusInMeters / 1000;
  const ret = [];
  const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([coords.longitude + x, coords.latitude + y]);
  }
  ret.push(ret[0]);
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [ret] },
    properties: {},
  };
}

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
  // Determine API key & Key Validity
  const rawApiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    officeConfig?.googleMapsApiKey ||
    '';

  const isValidGoogleKey =
    typeof rawApiKey === 'string' &&
    rawApiKey.trim().length > 10 &&
    rawApiKey.trim().startsWith('AIza');

  // Active Map Engine State ('google' vs 'osm')
  const [activeEngine, setActiveEngine] = useState(isValidGoogleKey ? 'google' : 'osm');

  // Sync activeEngine if valid Google Key becomes available
  useEffect(() => {
    if (isValidGoogleKey) {
      setActiveEngine('google');
    } else {
      setActiveEngine('osm');
    }
  }, [isValidGoogleKey]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {activeEngine === 'google' && isValidGoogleKey ? (
        <GoogleMapsView
          rawApiKey={rawApiKey.trim()}
          employees={employees}
          selectedEmployeeId={selectedEmployeeId}
          onSelectEmployee={onSelectEmployee}
          historyPoints={historyPoints}
          historyBounds={historyBounds}
          isHistoryMode={isHistoryMode}
          officeConfig={officeConfig}
          followEmployee={followEmployee}
          onToggleEngine={() => setActiveEngine('osm')}
        />
      ) : (
        <MapLibreView
          employees={employees}
          selectedEmployeeId={selectedEmployeeId}
          onSelectEmployee={onSelectEmployee}
          historyPoints={historyPoints}
          historyBounds={historyBounds}
          isHistoryMode={isHistoryMode}
          officeConfig={officeConfig}
          followEmployee={followEmployee}
          isValidGoogleKey={isValidGoogleKey}
          onToggleEngine={() => {
            if (isValidGoogleKey) setActiveEngine('google');
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GOOGLE MAPS ENGINE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function GoogleMapsView({
  rawApiKey,
  employees,
  selectedEmployeeId,
  onSelectEmployee,
  historyPoints,
  historyBounds,
  isHistoryMode,
  officeConfig,
  followEmployee,
  onToggleEngine,
}) {
  const mapRef = useRef(null);
  const [selectedPopupEmployee, setSelectedPopupEmployee] = useState(null);

  const loaderOptions = useMemo(
    () => ({
      id: 'google-map-script',
      googleMapsApiKey: rawApiKey,
      libraries: GOOGLE_LIBRARIES,
    }),
    [rawApiKey]
  );

  const { isLoaded, loadError } = useJsApiLoader(loaderOptions);

  const officeCenter = useMemo(() => {
    if (officeConfig?.latitude && officeConfig?.longitude) {
      return { lat: Number(officeConfig.latitude), lng: Number(officeConfig.longitude) };
    }
    return { lat: OFFICE_COORDS_LNG_LAT[1], lng: OFFICE_COORDS_LNG_LAT[0] };
  }, [officeConfig]);

  const geofenceRadius = officeConfig?.radiusMeters || OFFICE_LOCATION.radiusMeters;

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees.find(
      (e) => String(e._id || e.employeeId || e.id || '') === String(selectedEmployeeId)
    );
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    if (!mapRef.current || !followEmployee || !selectedEmployee?.location) return;
    const loc = selectedEmployee.location;
    if (isValidCoordinates(loc.latitude, loc.longitude)) {
      mapRef.current.panTo({ lat: Number(loc.latitude), lng: Number(loc.longitude) });
    }
  }, [followEmployee, selectedEmployee]);

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

  const centerToOffice = () => {
    if (mapRef.current) {
      mapRef.current.panTo(officeCenter);
      mapRef.current.setZoom(16);
    }
  };

  const centerToSelectedEmployee = () => {
    if (!selectedEmployee?.location || !mapRef.current) return;
    const loc = selectedEmployee.location;
    if (isValidCoordinates(loc.latitude, loc.longitude)) {
      mapRef.current.panTo({ lat: Number(loc.latitude), lng: Number(loc.longitude) });
      mapRef.current.setZoom(17);
    }
  };

  const historyPolylinePath = useMemo(() => {
    if (!isHistoryMode || !historyPoints || historyPoints.length === 0) return [];
    return historyPoints
      .filter((p) => isValidCoordinates(p.latitude, p.longitude))
      .map((p) => ({ lat: Number(p.latitude), lng: Number(p.longitude) }));
  }, [isHistoryMode, historyPoints]);

  if (loadError || !isLoaded) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', gap: 12 }}>
        <div className="w-10 h-10 spinner-gradient" />
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 600 }}>Loading Google Maps...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={officeCenter}
        zoom={15.5}
        options={DEFAULT_GOOGLE_MAP_OPTIONS}
        onLoad={(map) => { mapRef.current = map; }}
        onUnmount={() => { mapRef.current = null; }}
        onClick={() => setSelectedPopupEmployee(null)}
      >
        <CircleF
          center={officeCenter}
          radius={geofenceRadius}
          options={{ fillColor: '#0284c7', fillOpacity: 0.14, strokeColor: '#0284c7', strokeOpacity: 0.85, strokeWeight: 2 }}
        />

        <OverlayViewF position={officeCenter} mapPaneName={OverlayView.OVERLAY_MOUSETARGET}>
          <div onClick={(e) => { e.stopPropagation(); centerToOffice(); }} style={{ transform: 'translate(-50%, -100%)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', filter: 'drop-shadow(0 4px 12px rgba(2, 132, 199, 0.45))' }}>
            <div style={{ background: '#0284c7', color: '#ffffff', width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '3px solid #ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>🏢</div>
            <div style={{ marginTop: 4, background: 'rgba(15, 23, 42, 0.94)', color: '#ffffff', fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.25)' }}>🏢 AOTMS OFFICE</div>
          </div>
        </OverlayViewF>

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
              <OverlayViewF key={uId} position={pos} mapPaneName={OverlayView.OVERLAY_MOUSETARGET}>
                <div
                  onClick={(e) => { e.stopPropagation(); onSelectEmployee(uId); setSelectedPopupEmployee(emp); }}
                  style={{ transform: isSelected ? 'translate(-50%, -100%) scale(1.15)' : 'translate(-50%, -100%) scale(1)', transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)', cursor: 'pointer', zIndex: isSelected ? 60 : 25, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                >
                  {status === 'MOVING' || status === 'LEAVING_OFFICE' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ position: 'relative', width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.28), 0 0 0 2.5px #10b981' }} />
                        <div style={{ position: 'absolute', width: 36, height: 36, transform: `rotate(${heading}deg)`, transition: 'transform 0.35s ease-out', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: '50%', background: '#10b981', border: '2px solid #ffffff' }} />
                      </div>
                      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <div style={{ background: 'rgba(15, 23, 42, 0.94)', color: '#ffffff', fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 12, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span>🏍️ {emp.name || 'Courier'}</span>
                          <span style={{ background: '#10b981', color: '#ffffff', fontSize: 9.5, padding: '0 4px', borderRadius: 6, fontWeight: 800 }}>{speed > 0 ? `${speed} km/h` : 'Moving'}</span>
                        </div>
                        {road && <div style={{ background: '#ffffff', color: '#0f172a', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, border: '1px solid #e2e8f0', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🛣️ {road}</div>}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ position: 'relative', width: 38, height: 38, borderRadius: '50%', background: '#ffffff', border: `3px solid ${theme.primary}`, boxShadow: '0 4px 14px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {emp.avatar ? <img src={emp.avatar} alt={emp.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 28, height: 28, borderRadius: '50%', background: theme.bg, color: theme.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{initial}</div>}
                      </div>
                      <div style={{ marginTop: 3, background: 'rgba(15, 23, 42, 0.9)', color: '#ffffff', fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 8, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{emp.name || 'Employee'}</span>
                        <span style={{ background: theme.primary, color: '#ffffff', fontSize: 8, padding: '0 3px', borderRadius: 3, fontWeight: 800 }}>{theme.label}</span>
                      </div>
                    </div>
                  )}
                </div>
              </OverlayViewF>
            );
          })}

        {selectedPopupEmployee && selectedPopupEmployee.location && (
          <InfoWindowF position={{ lat: Number(selectedPopupEmployee.location.latitude), lng: Number(selectedPopupEmployee.location.longitude) }} onCloseClick={() => setSelectedPopupEmployee(null)}>
            <div style={{ fontFamily: 'system-ui, sans-serif', padding: '4px 6px', minWidth: 170 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>{selectedPopupEmployee.name}</div>
              {selectedPopupEmployee.location.road && <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 700 }}>🛣️ {selectedPopupEmployee.location.road}</div>}
            </div>
          </InfoWindowF>
        )}

        {isHistoryMode && historyPolylinePath.length > 0 && (
          <PolylineF path={historyPolylinePath} options={{ strokeColor: '#0284c7', strokeOpacity: 0.85, strokeWeight: 4 }} />
        )}
      </GoogleMap>

      {/* Control Buttons */}
      <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
        <button onClick={onToggleEngine} style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
          🗺️ Google Maps (Active)
        </button>
        <button onClick={centerToOffice} style={{ background: '#ffffff', color: '#0284c7', border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
          🏢 Center Office
        </button>
        {selectedEmployee && (
          <button onClick={centerToSelectedEmployee} style={{ background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(2,132,199,0.35)' }}>
            📍 Center Employee
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. OPENSTREETMAP / MAPLIBRE ENGINE COMPONENT (FALLBACK - 100% FREE)
// ─────────────────────────────────────────────────────────────────────────────
function MapLibreView({
  employees,
  selectedEmployeeId,
  onSelectEmployee,
  historyPoints,
  historyBounds,
  isHistoryMode,
  officeConfig,
  followEmployee,
  isValidGoogleKey,
  onToggleEngine,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const officeMarkerRef = useRef(null);
  const markersRef = useRef(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);

  const officeLngLat = useMemo(() => {
    if (officeConfig?.longitude && officeConfig?.latitude) {
      return [Number(officeConfig.longitude), Number(officeConfig.latitude)];
    }
    return OFFICE_COORDS_LNG_LAT;
  }, [officeConfig]);

  const geofenceRadius = officeConfig?.radiusMeters || OFFICE_LOCATION.radiusMeters;

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees.find(
      (e) => String(e._id || e.employeeId || e.id || '') === String(selectedEmployeeId)
    );
  }, [employees, selectedEmployeeId]);

  // MapLibre Initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let map = null;

    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: DEFAULT_MAPLIBRE_STYLE,
        center: officeLngLat,
        zoom: 15.5,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
      map.addControl(
        new maplibregl.AttributionControl({ compact: true, customAttribution: 'AOTMS Field Tracking • OpenStreetMap' }),
        'bottom-right'
      );

      map.on('load', () => {
        const circleGeoJson = createGeoJsonCircle(officeLngLat, geofenceRadius);

        map.addSource('office-geofence-source', { type: 'geojson', data: circleGeoJson });
        map.addLayer({
          id: 'office-geofence-fill',
          type: 'fill',
          source: 'office-geofence-source',
          paint: { 'fill-color': '#0284c7', 'fill-opacity': 0.14 },
        });
        map.addLayer({
          id: 'office-geofence-line',
          type: 'line',
          source: 'office-geofence-source',
          paint: { 'line-color': '#0284c7', 'line-width': 2.5, 'line-dasharray': [3, 2], 'line-opacity': 0.85 },
        });

        // Office Marker
        const officeEl = document.createElement('div');
        officeEl.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 4px 12px rgba(2, 132, 199, 0.45));">
            <div style="background: #0284c7; color: #ffffff; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; border: 3px solid #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.3);">🏢</div>
            <div style="margin-top: 4px; background: rgba(15, 23, 42, 0.94); color: #ffffff; font-size: 10.5px; font-weight: 800; padding: 3px 8px; border-radius: 6px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.25);">🏢 AOTMS OFFICE</div>
          </div>
        `;

        officeMarkerRef.current = new maplibregl.Marker({ element: officeEl })
          .setLngLat(officeLngLat)
          .addTo(map);

        setMapLoaded(true);
        map.resize();
      });

      mapRef.current = map;
    } catch (err) {
      console.error('[MapLibre Init Error]:', err);
    }

    return () => {
      if (officeMarkerRef.current) officeMarkerRef.current.remove();
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || isHistoryMode) return;
    const map = mapRef.current;
    const currentEmployeeIds = new Set();

    employees.forEach((emp) => {
      const uId = String(emp._id || emp.employeeId || emp.id || '');
      if (!uId) return;

      const loc = emp.location || emp;
      const lat = loc?.latitude;
      const lng = loc?.longitude;
      if (!isValidCoordinates(lat, lng)) {
        if (markersRef.current.has(uId)) {
          markersRef.current.get(uId).marker.remove();
          markersRef.current.delete(uId);
        }
        return;
      }

      currentEmployeeIds.add(uId);
      const isSelected = String(selectedEmployeeId || '') === uId;
      const status = loc.trackingStatus || 'OFFLINE';
      const speed = loc.speed || 0;
      const road = loc.road || '';
      const heading = loc.heading || 0;
      const initial = (emp.name || 'E').charAt(0).toUpperCase();

      const markerHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'}; transition: transform 0.2s;">
          ${status === 'MOVING' || status === 'LEAVING_OFFICE' ? `
            <div style="position: relative; width: 44px; height: 44px; background: #ffffff; border-radius: 50%; box-shadow: 0 4px 14px rgba(0,0,0,0.25), 0 0 0 2.5px #10b981; display: flex; align-items: center; justify-content: center;">
              <div style="transform: rotate(${heading}deg); transition: transform 0.3s;">
                <svg width="30" height="30" viewBox="0 0 34 34" fill="none"><rect x="15" y="24" width="4" height="8" rx="2" fill="#1e293b"/><path d="M14 8 H20 L19.5 25 H14.5 L14 8 Z" fill="#059669"/><circle cx="17" cy="16" r="4" fill="#0f172a"/><path d="M9 9 L25 9" stroke="#334155" stroke-width="2.5"/></svg>
              </div>
            </div>
            <div style="margin-top: 3px; background: rgba(15, 23, 42, 0.9); color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 8px;">🏍️ ${emp.name} (${speed} km/h)</div>
          ` : `
            <div style="width: 36px; height: 36px; border-radius: 50%; background: #ffffff; border: 3px solid ${status === 'AT_OFFICE' ? '#0284c7' : '#f59e0b'}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; color: #0f172a;">
              ${initial}
            </div>
            <div style="margin-top: 3px; background: rgba(15, 23, 42, 0.9); color: #ffffff; font-size: 9.5px; font-weight: 700; padding: 1px 6px; border-radius: 8px;">${emp.name}</div>
          `}
        </div>
      `;

      let entry = markersRef.current.get(uId);
      if (!entry) {
        const el = document.createElement('div');
        el.innerHTML = markerHtml;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectEmployee(uId);
        });
        const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
        markersRef.current.set(uId, { marker, el });
      } else {
        entry.marker.setLngLat([lng, lat]);
        entry.el.innerHTML = markerHtml;
      }
    });

    markersRef.current.forEach(({ marker }, id) => {
      if (!currentEmployeeIds.has(String(id))) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });
  }, [employees, mapLoaded, selectedEmployeeId, isHistoryMode]);

  const centerToOffice = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({ center: officeLngLat, zoom: 16 });
    }
  };

  const centerToSelectedEmployee = () => {
    if (!selectedEmployee?.location || !mapRef.current) return;
    const loc = selectedEmployee.location;
    if (isValidCoordinates(loc.latitude, loc.longitude)) {
      mapRef.current.flyTo({ center: [Number(loc.longitude), Number(loc.latitude)], zoom: 17 });
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Top Banner Notice when using OpenStreetMap */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(6px)',
          border: '1px solid #cbd5e1',
          padding: '6px 12px',
          borderRadius: 8,
          fontSize: 11.5,
          fontWeight: 600,
          color: '#334155',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 10,
        }}
      >
        <span>🌐 <b>OpenStreetMap</b> (Free Engine Active)</span>
        {!isValidGoogleKey && (
          <span style={{ fontSize: 10, color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
            Add Google API Key in .env to enable Google Maps
          </span>
        )}
      </div>

      {/* Floating Map Controls */}
      <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
        {isValidGoogleKey && (
          <button
            onClick={onToggleEngine}
            style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
          >
            🔄 Switch to Google Maps
          </button>
        )}
        <button onClick={centerToOffice} style={{ background: '#ffffff', color: '#0284c7', border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
          🏢 Center Office
        </button>
        {selectedEmployee && (
          <button onClick={centerToSelectedEmployee} style={{ background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(2,132,199,0.35)' }}>
            📍 Center Employee
          </button>
        )}
      </div>
    </div>
  );
}
