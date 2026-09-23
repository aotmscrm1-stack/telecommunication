import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import {
  OFFICE_LOCATION,
  OFFICE_COORDS_LNG_LAT,
  isValidCoordinates,
  calculateDistanceMeters,
} from '../../config/trackingConfig';

// Initialize MapLibre web worker (self-hosted with fallback)
if (typeof window !== 'undefined' && !maplibregl.getWorkerUrl()) {
  try {
    maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
  } catch (e) {
    maplibregl.setWorkerUrl(
      `https://unpkg.com/maplibre-gl@${maplibregl.getVersion()}/dist/maplibre-gl-worker.mjs`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VECTOR MAP THEMES (Default 13.0x zoom as requested)
// ─────────────────────────────────────────────────────────────────────────────
const MAP_THEMES = {
  bright: {
    id: 'bright',
    name: 'Clean Vector',
    badge: 'Vector',
    url: 'https://tiles.openfreemap.org/styles/bright',
    pitch: 0,
    bearing: 0,
    zoom: 13.0,
  },
  liberty3d: {
    id: 'liberty3d',
    name: '3D Liberty',
    badge: '3D',
    url: 'https://tiles.openfreemap.org/styles/liberty',
    pitch: 60,
    bearing: -20,
    zoom: 13.0,
  },
  positron: {
    id: 'positron',
    name: 'Minimal Light',
    badge: 'Light',
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    pitch: 0,
    bearing: 0,
    zoom: 13.0,
  },
  darkmatter: {
    id: 'darkmatter',
    name: 'Midnight Dark',
    badge: 'Night',
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    pitch: 45,
    bearing: 15,
    zoom: 13.0,
  },
};

/**
 * Generate smooth GeoJSON circle for Office Geofence
 */
function createGeofencePolygon(centerLngLat, radiusInMeters, points = 64) {
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
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const officeMarkerRef = useRef(null);
  const markersRef = useRef(new Map());
  const historyLayerIdsRef = useRef([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeTheme, setActiveTheme] = useState('bright');
  const [is3DMode, setIs3DMode] = useState(false);
  // Default zoom is 13.0x as requested
  const [cameraTelemetry, setCameraTelemetry] = useState({ pitch: 0, bearing: 0, zoom: 13.0 });
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [currentCameraTarget, setCurrentCameraTarget] = useState('office'); // 'office' | 'employee'

  // Office Coordinates
  const officeLngLat = useMemo(() => {
    if (officeConfig?.longitude && officeConfig?.latitude) {
      return [Number(officeConfig.longitude), Number(officeConfig.latitude)];
    }
    return OFFICE_COORDS_LNG_LAT;
  }, [officeConfig]);

  const geofenceRadius = officeConfig?.radiusMeters || OFFICE_LOCATION.radiusMeters;

  // Selected Employee
  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees.find(
      (e) => String(e._id || e.employeeId || e.id || '') === String(selectedEmployeeId)
    );
  }, [employees, selectedEmployeeId]);

  // Distance from HQ for selected agent
  const distanceFromOffice = useMemo(() => {
    if (!selectedEmployee?.location) return null;
    const { latitude, longitude } = selectedEmployee.location;
    if (!isValidCoordinates(latitude, longitude)) return null;
    const meters = calculateDistanceMeters(
      latitude,
      longitude,
      officeLngLat[1],
      officeLngLat[0]
    );
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
  }, [selectedEmployee, officeLngLat]);

  // ── 1. Initialize MapLibre GL (Default 13.0x zoom) ──────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let map = null;

    try {
      const themeConfig = MAP_THEMES[activeTheme] || MAP_THEMES.bright;

      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: themeConfig.url,
        center: officeLngLat,
        zoom: 13.0, // Requested: Default 13.0x zoom
        pitch: is3DMode ? 60 : 0,
        bearing: is3DMode ? -20 : 0,
        attributionControl: false,
        antialias: true,
      });

      map.addControl(
        new maplibregl.AttributionControl({ compact: true, customAttribution: 'AOTMS Field Tracker' }),
        'bottom-left'
      );

      // Camera telemetry updates
      const handleMove = () => {
        setCameraTelemetry({
          pitch: Math.round(map.getPitch()),
          bearing: Math.round(map.getBearing()),
          zoom: Number(map.getZoom().toFixed(1)),
        });
      };
      map.on('move', handleMove);

      map.on('load', () => {
        setupGeofenceLayers(map);
        setupOfficeMarker(map);
        setMapLoaded(true);
        setTimeout(() => map.resize(), 100);
      });

      mapRef.current = map;
    } catch (err) {
      console.error('[LiveMap Initialization Error]:', err);
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

  // ── 2. Geofence Layer Setup ───────────────────────────────────────────────
  const setupGeofenceLayers = useCallback((map) => {
    if (!map) return;
    const circleGeoJson = createGeofencePolygon(officeLngLat, geofenceRadius);

    if (map.getSource('office-geofence-source')) {
      map.getSource('office-geofence-source').setData(circleGeoJson);
      return;
    }

    map.addSource('office-geofence-source', { type: 'geojson', data: circleGeoJson });

    map.addLayer({
      id: 'office-geofence-glow',
      type: 'fill',
      source: 'office-geofence-source',
      paint: {
        'fill-color': '#0284c7',
        'fill-opacity': 0.07,
      },
    });

    map.addLayer({
      id: 'office-geofence-pulse-ring',
      type: 'line',
      source: 'office-geofence-source',
      paint: {
        'line-color': '#0284c7',
        'line-width': 1.8,
        'line-dasharray': [4, 3],
        'line-opacity': 0.6,
      },
    });
  }, [officeLngLat, geofenceRadius]);

  // ── 3. Office HQ Map Pin Setup (Clean Map Icon Pin - No Surrounding Waves) ─
  const setupOfficeMarker = useCallback((map) => {
    if (!map) return;
    if (officeMarkerRef.current) officeMarkerRef.current.remove();

    const el = document.createElement('div');
    el.className = 'aotms-hq-marker-pin';
    el.style.cssText = 'position: relative; cursor: pointer; display: flex; flex-direction: column; align-items: center; user-select: none;';

    // Clean Map Pin Teardrop Style with Building Icon (No messy surrounding wave circles)
    el.innerHTML = `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <!-- Teardrop Pin Top -->
        <div style="
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4), 0 1px 3px rgba(0,0,0,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <!-- Building / Office Icon -->
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
            <path d="M9 22v-4h6v4"/>
            <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/>
          </svg>
        </div>

        <!-- Pointed Pin Tip -->
        <div style="
          width: 10px;
          height: 10px;
          background: #0369a1;
          transform: rotate(45deg);
          margin-top: -5px;
          border-right: 2px solid #ffffff;
          border-bottom: 2px solid #ffffff;
        "></div>

        <!-- White Glass Label Pill -->
        <div style="
          margin-top: 2px;
          background: #ffffff;
          border: 1px solid #bae6fd;
          color: #0369a1;
          padding: 2px 8px;
          border-radius: 9999px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.02em;
          white-space: nowrap;
        ">
          AOTMS HQ
        </div>
      </div>
    `;

    el.addEventListener('click', () => {
      shiftToOffice();
    });

    officeMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat(officeLngLat)
      .addTo(map);
  }, [officeLngLat]);

  // ── 4. Style / Theme Change Handling ──────────────────────────────────────
  const handleThemeChange = (themeKey) => {
    setActiveTheme(themeKey);
    setThemeDropdownOpen(false);
    const map = mapRef.current;
    if (!map) return;

    const targetTheme = MAP_THEMES[themeKey];
    if (!targetTheme) return;

    map.setStyle(targetTheme.url, { diff: false });
    map.once('style.load', () => {
      setupGeofenceLayers(map);
      setupOfficeMarker(map);
      map.easeTo({
        pitch: is3DMode ? targetTheme.pitch : 0,
        bearing: is3DMode ? targetTheme.bearing : 0,
        zoom: 13.0,
        duration: 800,
      });
    });
  };

  // ── 5. Toggle 2D / 3D Pitch ────────────────────────────────────────────────
  const toggle3DMode = () => {
    const nextState = !is3DMode;
    setIs3DMode(nextState);
    if (!mapRef.current) return;

    mapRef.current.easeTo({
      pitch: nextState ? 60 : 0,
      bearing: nextState ? -20 : 0,
      duration: 800,
    });
  };

  // ── 6. Easy Shift Camera: Office <—> Employee ─────────────────────────────
  const shiftToOffice = () => {
    setCurrentCameraTarget('office');
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: officeLngLat,
      zoom: 14.5,
      pitch: is3DMode ? 60 : 0,
      bearing: is3DMode ? -20 : 0,
      duration: 900,
      essential: true,
    });
  };

  const shiftToEmployee = () => {
    if (!selectedEmployee?.location || !mapRef.current) return;
    const { latitude, longitude, heading } = selectedEmployee.location;
    if (isValidCoordinates(latitude, longitude)) {
      setCurrentCameraTarget('employee');
      mapRef.current.flyTo({
        center: [Number(longitude), Number(latitude)],
        zoom: 15.5,
        pitch: is3DMode ? 60 : 0,
        bearing: heading || 0,
        duration: 900,
        essential: true,
      });
    }
  };

  // ── 7. Update Field Employee Markers (Clean Map Icons Style - No Surrounding Blue Rings) ─
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
      const rawStatus = (loc.trackingStatus || 'OFFLINE').toUpperCase();
      const speed = Math.round(loc.speed || 0);
      const heading = loc.heading || 0;
      const name = emp.name || 'Agent';

      const isMoving = rawStatus === 'MOVING' || rawStatus === 'LEAVING_OFFICE' || speed > 2;
      const isOffline = rawStatus === 'OFFLINE' || rawStatus === 'DISCONNECTED';
      const isStopped = !isMoving && !isOffline;

      // Color scheme based on state: Cool Blue for Moving, Calm Orange for Stopped, Slate for Offline
      const pinColor = isMoving ? '#0284c7' : isStopped ? '#f97316' : '#64748b';
      const pinTipColor = isMoving ? '#0369a1' : isStopped ? '#ea580c' : '#475569';

      // Clean Map Icon Inside Teardrop Pin
      let innerIcon = '';
      if (isMoving) {
        innerIcon = `
          <div style="transform: rotate(${heading}deg); transition: transform 0.3s ease; display: flex; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </div>
        `;
      } else if (isStopped) {
        innerIcon = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <rect x="6" y="4" width="4" height="16" fill="#ffffff"/>
            <rect x="14" y="4" width="4" height="16" fill="#ffffff"/>
          </svg>
        `;
      } else {
        innerIcon = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        `;
      }

      // Selected ring indicator
      const selectedBorder = isSelected ? 'border: 2.5px solid #0284c7; box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.25);' : '';

      const markerHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; user-select: none; z-index: ${
          isSelected ? 60 : isMoving ? 40 : 25
        };">
          <!-- Clean Teardrop Map Icon Pin (No surrounding blurry wave animations) -->
          <div style="
            width: ${isSelected ? '38px' : '34px'};
            height: ${isSelected ? '38px' : '34px'};
            border-radius: 50%;
            background: ${pinColor};
            border: 2.2px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s ease;
            ${selectedBorder}
          ">
            ${innerIcon}
          </div>

          <!-- Pointed Pin Tip -->
          <div style="
            width: 8px;
            height: 8px;
            background: ${pinTipColor};
            transform: rotate(45deg);
            margin-top: -4px;
            border-right: 1.8px solid #ffffff;
            border-bottom: 1.8px solid #ffffff;
          "></div>

          <!-- Crisp Name Pill -->
          <div style="
            margin-top: 2px;
            background: #ffffff;
            border: 1px solid ${isSelected ? '#0284c7' : '#e2e8f0'};
            color: #0f172a;
            padding: 1.5px 6.5px;
            border-radius: 9999px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
          ">
            <span style="
              width: 5px;
              height: 5px;
              border-radius: 50%;
              background: ${pinColor};
            "></span>
            <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; font-size: 10px; font-weight: 600; color: #1e293b;">${name}</span>
            ${
              isMoving && speed > 0
                ? `<span style="font-family: monospace; font-size: 8.5px; font-weight: 700; color: #0284c7; background: #e0f2fe; padding: 0.5px 3px; border-radius: 3px;">${speed}k</span>`
                : isStopped
                ? `<span style="font-size: 8px; font-weight: 700; color: #ea580c;">IDLE</span>`
                : `<span style="font-size: 8px; font-weight: 600; color: #94a3b8;">OFF</span>`
            }
          </div>
        </div>
      `;

      let entry = markersRef.current.get(uId);
      if (!entry) {
        const el = document.createElement('div');
        el.innerHTML = markerHtml;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectEmployee(uId);
          // Auto-center camera on employee upon click
          if (isValidCoordinates(lat, lng)) {
            setCurrentCameraTarget('employee');
            map.flyTo({ center: [lng, lat], zoom: 15.5, duration: 800 });
          }
        });
        const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
        markersRef.current.set(uId, { marker, el });
      } else {
        entry.marker.setLngLat([lng, lat]);
        entry.el.innerHTML = markerHtml;
      }
    });

    // Clean up removed employees
    markersRef.current.forEach(({ marker }, id) => {
      if (!currentEmployeeIds.has(String(id))) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Auto-follow selected employee
    if (followEmployee && selectedEmployee?.location) {
      const loc = selectedEmployee.location;
      if (isValidCoordinates(loc.latitude, loc.longitude)) {
        map.easeTo({
          center: [Number(loc.longitude), Number(loc.latitude)],
          duration: 600,
        });
      }
    }
  }, [employees, mapLoaded, selectedEmployeeId, isHistoryMode, followEmployee, selectedEmployee]);

  // ── 8. History Mode Route Trail ───────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    historyLayerIdsRef.current.forEach((id) => {
      try {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
      } catch (e) {}
    });
    historyLayerIdsRef.current = [];

    if (!isHistoryMode || !historyPoints || historyPoints.length < 2) return;

    const coordinates = historyPoints
      .filter((p) => isValidCoordinates(p.latitude, p.longitude))
      .map((p) => [Number(p.longitude), Number(p.latitude)]);

    if (coordinates.length < 2) return;

    const sourceId = 'history-route-source';
    const casingLayerId = 'history-route-casing';
    const lineLayerId = 'history-route-line';

    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates },
      },
    });

    map.addLayer({
      id: casingLayerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#38bdf8',
        'line-width': 6,
        'line-opacity': 0.3,
      },
    });

    map.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#0284c7',
        'line-width': 3,
        'line-opacity': 0.95,
      },
    });

    historyLayerIdsRef.current = [casingLayerId, lineLayerId, sourceId];

    if (coordinates.length > 0) {
      const bounds = coordinates.reduce(
        (b, coord) => b.extend(coord),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 1000 });
    }
  }, [isHistoryMode, historyPoints, mapLoaded]);

  // ── 9. Camera Controls ────────────────────────────────────────────────────
  const zoomIn = () => mapRef.current?.zoomIn({ duration: 300 });
  const zoomOut = () => mapRef.current?.zoomOut({ duration: 300 });
  const resetNorth = () => mapRef.current?.resetNorth({ duration: 600 });

  const activeThemeObj = MAP_THEMES[activeTheme] || MAP_THEMES.bright;

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-white font-sans">
      {/* ── MAPLIBRE CANVAS (Default 13.0x zoom) ── */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* ── TOP UNIFIED HUD COMMAND BAR: Agents, 3D, Theme & Camera Shift ── */}
      <div className="absolute top-3 left-3 z-20 pointer-events-auto">
        <div className="flex flex-wrap items-center gap-2 bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
          {/* Active Field Agents Counter */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 rounded-xl border border-sky-200 shrink-0">
            <span className="size-2 rounded-full bg-sky-500 shadow-[0_0_6px_#0284c7]"></span>
            <span className="text-xs font-semibold text-sky-800 tracking-tight">
              {employees.length} <span className="hidden xs:inline">Field </span>Agents
            </span>
            <span className="size-1 rounded-full bg-orange-400" />
          </div>

          {/* 3D View Toggle Button */}
          <button
            onClick={toggle3DMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all border cursor-pointer shrink-0 ${
              is3DMode
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white border-sky-400 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle 3D View / 2D Flat View"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>{is3DMode ? '3D Active' : '2D Flat'}</span>
          </button>

          {/* Theme Dropdown Toggle */}
          <div className="relative shrink-0">
            <button
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl transition-all border border-slate-200 cursor-pointer shadow-2xs"
              title="Select Map Theme"
            >
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
                {activeThemeObj.badge}
              </span>
              <span>{activeThemeObj.name}</span>
              <svg className={`size-3.5 text-slate-400 transition-transform duration-200 ${themeDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>

            {themeDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 w-44 bg-white/98 backdrop-blur-2xl border border-slate-200 rounded-2xl p-1.5 shadow-xl z-50 flex flex-col gap-1">
                {Object.values(MAP_THEMES).map((thm) => (
                  <button
                    key={thm.id}
                    onClick={() => handleThemeChange(thm.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTheme === thm.id
                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>{thm.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{thm.badge}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── CLEAN SUBTLE VERTICAL DIVIDER ── */}
          <div className="hidden sm:block h-6 w-px bg-slate-200/90 mx-1 shrink-0" />

          {/* ── CAMERA SHIFT CONTROLS (Merged into same bar with clean spacing) ── */}
          <div className="flex items-center gap-1 bg-slate-100/70 p-0.5 rounded-xl border border-slate-200/70 shrink-0">
            {/* Shift to Office */}
            <button
              onClick={shiftToOffice}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                currentCameraTarget === 'office'
                  ? 'bg-white text-sky-700 border border-sky-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
              title="Shift Camera to Office HQ"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                <path d="M9 22v-4h6v4"/>
              </svg>
              <span>Shift to Office</span>
            </button>

            {/* Bidirectional Arrow */}
            <div className="px-1 text-slate-300">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m8 3 4 8 5-5 5 15H2L8 3z"/>
              </svg>
            </div>

            {/* Shift to Employee */}
            <button
              onClick={shiftToEmployee}
              disabled={!selectedEmployee}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                !selectedEmployee
                  ? 'text-slate-400 opacity-60 cursor-not-allowed'
                  : currentCameraTarget === 'employee'
                  ? 'bg-white text-orange-700 border border-orange-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
              title={selectedEmployee ? `Shift Camera to ${selectedEmployee.name}` : 'Click an employee to enable shift'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>{selectedEmployee ? `Shift: ${selectedEmployee.name.split(' ')[0]}` : 'Shift to Employee'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── DOCKED FLOATING NAVIGATION CONTROLS (Right Side) ── */}
      <div className="absolute top-3 right-3 z-30 pointer-events-auto flex flex-col gap-2">
        <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl p-1 shadow-lg flex flex-col gap-1">
          {/* Zoom In */}
          <button
            onClick={zoomIn}
            className="size-9 flex items-center justify-center text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>

          {/* Zoom Out */}
          <button
            onClick={zoomOut}
            className="size-9 flex items-center justify-center text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>

          <div className="h-px bg-slate-200/80 my-0.5 mx-1" />

          {/* Compass / Reset North */}
          <button
            onClick={resetNorth}
            className="size-9 flex items-center justify-center text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors cursor-pointer group"
            title="Reset North Heading"
            aria-label="Reset North"
          >
            <div
              style={{ transform: `rotate(${-cameraTelemetry.bearing}deg)`, transition: 'transform 0.2s ease' }}
              className="flex items-center justify-center"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <polygon points="12 2 16 12 12 9 8 12" fill="#f97316" />
                <polygon points="12 22 16 12 12 15 8 12" fill="#0284c7" />
              </svg>
            </div>
          </button>

          {/* 3D Tilt Quick Button */}
          <button
            onClick={toggle3DMode}
            className={`size-9 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
              is3DMode ? 'text-sky-700 bg-sky-50 border border-sky-200' : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50'
            }`}
            title="Toggle 3D Camera Tilt"
            aria-label="Toggle 3D Tilt"
          >
            <span className="font-mono text-xs font-bold">3D</span>
          </button>
        </div>

        {/* Selected Employee Quick Action Button */}
        {selectedEmployee && (
          <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl p-1 shadow-lg flex flex-col gap-1">
            <button
              onClick={shiftToEmployee}
              className="size-9 flex items-center justify-center text-orange-600 hover:text-white bg-orange-50 hover:bg-orange-500 rounded-xl transition-all cursor-pointer"
              title={`Shift to ${selectedEmployee.name}`}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
            </button>

            <button
              onClick={onToggleFollow}
              className={`size-9 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                followEmployee
                  ? 'text-orange-600 bg-orange-50 border border-orange-200 shadow-2xs'
                  : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50'
              }`}
              title={followEmployee ? 'Auto-following agent (Click to stop)' : 'Auto-follow agent camera'}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            </button>
          </div>
        )}
      </div>

      {/* ── BOTTOM-LEFT: Selected Agent Telemetry Spotlight Card ── */}
      {selectedEmployee && !isHistoryMode && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md z-30 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.08)] text-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center font-bold text-sm text-white shadow-2xs shrink-0">
                  {selectedEmployee.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm tracking-tight text-slate-900 flex items-center gap-1.5 truncate">
                    <span className="truncate">{selectedEmployee.name}</span>
                    <span className="size-2 rounded-full bg-sky-500 shrink-0" />
                  </h4>
                  <p className="text-slate-500 text-xs truncate">
                    {selectedEmployee.role || selectedEmployee.department || 'Field Staff'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  selectedEmployee.location?.trackingStatus === 'MOVING'
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : selectedEmployee.location?.trackingStatus === 'AT_OFFICE'
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-orange-50 text-orange-700 border-orange-200'
                }`}>
                  {selectedEmployee.location?.trackingStatus?.replace('_', ' ') || 'ACTIVE'}
                </span>

                {/* Close Spotlight Button */}
                <button
                  onClick={() => onSelectEmployee(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Close Card"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            {/* Quick Shift Button Row inside Card */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={shiftToOffice}
                className="flex-1 py-1.5 px-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-xl border border-sky-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Shift to Office</span>
              </button>
              <button
                onClick={shiftToEmployee}
                className="flex-1 py-1.5 px-2 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-xl border border-orange-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Shift to Employee</span>
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
              <div className="bg-sky-50/60 rounded-xl py-1.5 px-2 border border-sky-100">
                <div className="text-[9.5px] text-sky-700/80 uppercase tracking-wider font-semibold">Speed</div>
                <div className="font-mono text-sm font-bold text-sky-700">
                  {Math.round(selectedEmployee.location?.speed || 0)} <span className="text-[9px] font-normal text-slate-500">km/h</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl py-1.5 px-2 border border-slate-100">
                <div className="text-[9.5px] text-slate-500 uppercase tracking-wider font-semibold">From HQ</div>
                <div className="font-mono text-sm font-bold text-slate-800">
                  {distanceFromOffice || '--'}
                </div>
              </div>

              <div className="bg-orange-50/60 rounded-xl py-1.5 px-2 border border-orange-100">
                <div className="text-[9.5px] text-orange-700/80 uppercase tracking-wider font-semibold">Battery</div>
                <div className="font-mono text-sm font-bold text-orange-600">
                  {selectedEmployee.location?.batteryLevel ? `${selectedEmployee.location.batteryLevel}%` : '96%'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM-RIGHT HUD: Camera Telemetry Pill (Default 13.0x zoom display) ── */}
      <div className="absolute bottom-3 right-3 z-10 pointer-events-none hidden sm:block">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl px-2.5 py-1 text-[9.5px] font-mono text-slate-600 shadow-2xs flex items-center gap-2.5">
          <span>PITCH: <strong className="text-sky-600">{cameraTelemetry.pitch}°</strong></span>
          <span className="text-slate-300">|</span>
          <span>HEADING: <strong className="text-orange-500">{cameraTelemetry.bearing}°</strong></span>
          <span className="text-slate-300">|</span>
          <span>ZOOM: <strong className="text-slate-800">{cameraTelemetry.zoom}x</strong></span>
        </div>
      </div>
    </div>
  );
}
