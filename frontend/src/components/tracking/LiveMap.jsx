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
// VECTOR MAP THEMES (Clean Vector, 3D Liberty, Minimal Light, Midnight Dark)
// ─────────────────────────────────────────────────────────────────────────────
const MAP_THEMES = {
  bright: {
    id: 'bright',
    name: 'Clean Vector',
    badge: 'Vector',
    url: 'https://tiles.openfreemap.org/styles/bright',
    pitch: 0,
    bearing: 0,
    zoom: 15.5,
  },
  liberty3d: {
    id: 'liberty3d',
    name: '3D Liberty',
    badge: '3D',
    url: 'https://tiles.openfreemap.org/styles/liberty',
    pitch: 60,
    bearing: -20,
    zoom: 16.2,
  },
  positron: {
    id: 'positron',
    name: 'Minimal Light',
    badge: 'Light',
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    pitch: 0,
    bearing: 0,
    zoom: 15.5,
  },
  darkmatter: {
    id: 'darkmatter',
    name: 'Midnight Dark',
    badge: 'Night',
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    pitch: 45,
    bearing: 15,
    zoom: 15.8,
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
  const [cameraTelemetry, setCameraTelemetry] = useState({ pitch: 0, bearing: 0, zoom: 15.5 });
  const [showGeofence, setShowGeofence] = useState(true);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

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

  // ── 1. Initialize MapLibre GL ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let map = null;

    try {
      const themeConfig = MAP_THEMES[activeTheme] || MAP_THEMES.bright;

      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: themeConfig.url,
        center: officeLngLat,
        zoom: themeConfig.zoom,
        pitch: is3DMode ? 60 : 0,
        bearing: is3DMode ? -20 : 0,
        attributionControl: false,
        antialias: true,
      });

      // Keep native attribution tucked away neatly
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

  // ── 2. Geofence Layer Setup (Cool Calm Blue Tint) ─────────────────────────
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
        'fill-opacity': 0.08,
      },
    });

    map.addLayer({
      id: 'office-geofence-pulse-ring',
      type: 'line',
      source: 'office-geofence-source',
      paint: {
        'line-color': '#0284c7',
        'line-width': 2,
        'line-dasharray': [4, 3],
        'line-opacity': 0.75,
      },
    });
  }, [officeLngLat, geofenceRadius]);

  // ── 3. Office HQ 3D Symbol Setup (Cool Blue & Calm Orange) ─────────────────
  const setupOfficeMarker = useCallback((map) => {
    if (!map) return;
    if (officeMarkerRef.current) officeMarkerRef.current.remove();

    const el = document.createElement('div');
    el.className = 'aotms-hq-marker-light';
    el.style.cssText = 'position: relative; cursor: pointer; display: flex; flex-direction: column; align-items: center; user-select: none;';

    el.innerHTML = `
      <div style="position: relative; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center;">
        <!-- Expanding Wave Rings -->
        <div style="position: absolute; inset: -10px; border-radius: 50%; border: 1.5px solid rgba(2, 132, 199, 0.4); animation: hqSweepRingLight 3s infinite cubic-bezier(0, 0, 0.2, 1); pointer-events: none;"></div>
        <div style="position: absolute; inset: -3px; border-radius: 50%; background: radial-gradient(circle, rgba(2, 132, 199, 0.15) 0%, rgba(2, 132, 199, 0) 70%);"></div>

        <!-- 3D Corporate Tower Emblem -->
        <div style="
          position: relative;
          z-index: 3;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(145deg, #0284c7 0%, #0369a1 60%, #075985 100%);
          border: 2px solid #ffffff;
          box-shadow: 
            0 8px 20px -3px rgba(2, 132, 199, 0.45),
            0 2px 6px rgba(0, 0, 0, 0.1),
            inset 0 1.5px 3px rgba(255, 255, 255, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: perspective(600px) rotateX(10deg);
        ">
          <!-- Building Tower Icon -->
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 21V7L12 3L20 7V21" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9 21V12H15V21" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="rgba(255,255,255,0.2)"/>
            <path d="M8 8H10M14 8H16M8 12H10M14 12H16" stroke="#bae6fd" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
      </div>

      <!-- White Glass HQ Label Pill -->
      <div style="
        margin-top: 3px;
        background: #ffffff;
        border: 1px solid #bae6fd;
        color: #0f172a;
        padding: 2.5px 9px;
        border-radius: 9999px;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.15);
        display: flex;
        align-items: center;
        gap: 5px;
      ">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: #0284c7; box-shadow: 0 0 6px #0284c7;"></span>
        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; font-size: 10.5px; font-weight: 600; letter-spacing: 0.02em; color: #0369a1;">AOTMS HQ</span>
      </div>
    `;

    el.addEventListener('click', () => {
      map.flyTo({ center: officeLngLat, zoom: 17, duration: 1000 });
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

  // ── 6. Update Field Employee Markers ───────────────────────────────────────
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

      // ───────────────────────────────────────────────────────────────────────
      // COOL BLUE & CALM ORANGE 3D SYMBOLS
      // ───────────────────────────────────────────────────────────────────────
      let symbolContent = '';

      if (isMoving) {
        // ── 1. MOVING: Cool Calm Blue Puck with Heading Arrow
        symbolContent = `
          <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: -8px; border-radius: 50%; background: radial-gradient(circle, rgba(2, 132, 199, 0.35) 0%, rgba(2, 132, 199, 0) 70%); animation: movingPulseLight 2s infinite ease-out; pointer-events: none;"></div>
            
            <div style="
              position: relative;
              z-index: 2;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background: linear-gradient(135deg, #0284c7 0%, #0369a1 70%, #075985 100%);
              border: 2px solid #ffffff;
              box-shadow: 0 6px 16px -2px rgba(2, 132, 199, 0.45), 0 2px 4px rgba(0,0,0,0.1), inset 0 1.5px 3px rgba(255,255,255,0.6);
              display: flex;
              align-items: center;
              justify-content: center;
              transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
              transition: transform 0.2s ease;
            ">
              <div style="transform: rotate(${heading}deg); transition: transform 0.4s ease; display: flex; align-items: center; justify-content: center;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L19 21L12 17L5 21L12 2Z" fill="#ffffff" stroke="#0284c7" stroke-width="1.2" stroke-linejoin="round"/>
                </svg>
              </div>

              <!-- Speed Badge -->
              <div style="position: absolute; top: -5px; right: -7px; background: #ffffff; border: 1.5px solid #0284c7; color: #0284c7; font-family: monospace; font-size: 8.5px; font-weight: 700; padding: 0.5px 4px; border-radius: 9999px; box-shadow: 0 1px 4px rgba(0,0,0,0.15);">
                ${speed > 0 ? speed : 'RUN'}
              </div>
            </div>
          </div>
        `;
      } else if (isStopped) {
        // ── 2. STOPPED / IDLE: Calm Warm Orange Squircle Badge
        symbolContent = `
          <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: -4px; border-radius: 12px; background: radial-gradient(circle, rgba(249, 115, 22, 0.3) 0%, rgba(249, 115, 22, 0) 75%); animation: idleBreathingLight 2.8s infinite ease-in-out; pointer-events: none;"></div>
            
            <div style="
              position: relative;
              z-index: 2;
              width: 34px;
              height: 34px;
              border-radius: 10px;
              background: linear-gradient(135deg, #f97316 0%, #ea580c 70%, #c2410c 100%);
              border: 2px solid #ffffff;
              box-shadow: 0 6px 14px -2px rgba(249, 115, 22, 0.45), 0 2px 4px rgba(0,0,0,0.1), inset 0 1.5px 3px rgba(255,255,255,0.6);
              display: flex;
              align-items: center;
              justify-content: center;
              transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
              transition: transform 0.2s ease;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="5" width="4" height="14" rx="1" fill="#ffffff"/>
                <rect x="14" y="5" width="4" height="14" rx="1" fill="#ffffff"/>
              </svg>
            </div>
          </div>
        `;
      } else {
        // ── 3. OFFLINE: Muted Slate Gray Disc
        symbolContent = `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; opacity: 0.85;">
            <div style="
              position: relative;
              z-index: 2;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
              border: 2px solid #ffffff;
              box-shadow: 0 4px 10px rgba(0,0,0,0.15);
              display: flex;
              align-items: center;
              justify-content: center;
              transform: ${isSelected ? 'scale(1.1)' : 'scale(1)'};
            ">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="2" y1="2" x2="22" y2="22"/>
                <path d="M8.5 16.5a5 5 0 0 1 7 0"/>
                <path d="M2 8.82a15 15 0 0 1 4.17-2.65"/>
                <line x1="12" y1="20" x2="12.01" y2="20"/>
              </svg>
            </div>
          </div>
        `;
      }

      // Selected crosshair reticle
      const selectedReticle = isSelected
        ? `
          <div style="position: absolute; inset: -12px; border-radius: 50%; border: 2px dashed #0284c7; animation: rotateReticle 6s linear infinite; pointer-events: none;"></div>
        `
        : '';

      const markerHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; z-index: ${
          isSelected ? 60 : isMoving ? 40 : 25
        };">
          ${selectedReticle}
          ${symbolContent}

          <!-- White Glass Name Pill -->
          <div style="
            margin-top: 3px;
            background: #ffffff;
            border: 1px solid ${isSelected ? '#0284c7' : isMoving ? '#bae6fd' : isStopped ? '#fed7aa' : '#e2e8f0'};
            color: #0f172a;
            padding: 2px 7px;
            border-radius: 9999px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
          ">
            <span style="
              width: 5px;
              height: 5px;
              border-radius: 50%;
              background: ${isMoving ? '#0284c7' : isStopped ? '#f97316' : '#94a3b8'};
            "></span>
            <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; font-size: 10px; font-weight: 600; color: #1e293b;">${name}</span>
            ${
              isMoving && speed > 0
                ? `<span style="font-family: monospace; font-size: 8.5px; font-weight: 700; color: #0284c7; background: #e0f2fe; padding: 0.5px 3.5px; border-radius: 4px;">${speed}km/h</span>`
                : isStopped
                ? `<span style="font-size: 8px; font-weight: 700; color: #ea580c; text-transform: uppercase;">IDLE</span>`
                : `<span style="font-size: 8px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">OFF</span>`
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

  // ── 7. History Mode Route Trail ───────────────────────────────────────────
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

    // Cool Calm Blue Trail
    map.addLayer({
      id: casingLayerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#38bdf8',
        'line-width': 7,
        'line-opacity': 0.35,
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
      map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 1000 });
    }
  }, [isHistoryMode, historyPoints, mapLoaded]);

  // ── 8. Camera Controls ────────────────────────────────────────────────────
  const zoomIn = () => mapRef.current?.zoomIn({ duration: 300 });
  const zoomOut = () => mapRef.current?.zoomOut({ duration: 300 });
  const resetNorth = () => mapRef.current?.resetNorth({ duration: 600 });

  const centerToOffice = () => {
    mapRef.current?.flyTo({
      center: officeLngLat,
      zoom: 16.5,
      pitch: is3DMode ? 60 : 0,
      bearing: is3DMode ? -20 : 0,
      duration: 1000,
    });
  };

  const centerToSelectedEmployee = () => {
    if (!selectedEmployee?.location || !mapRef.current) return;
    const { latitude, longitude } = selectedEmployee.location;
    if (isValidCoordinates(latitude, longitude)) {
      mapRef.current.flyTo({
        center: [Number(longitude), Number(latitude)],
        zoom: 17.5,
        pitch: is3DMode ? 60 : 0,
        bearing: selectedEmployee.location.heading || 0,
        duration: 1000,
      });
    }
  };

  const activeThemeObj = MAP_THEMES[activeTheme] || MAP_THEMES.bright;

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-white font-sans">
      {/* ── MAPLIBRE CANVAS ── */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* ── RESPONSIVE TOP BAR (Pure White Glassmorphism + Cool Blue & Calm Orange) ── */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto z-20 pointer-events-auto">
        <div className="flex flex-wrap items-center gap-2 bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
          {/* Active Field Agents Counter */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 rounded-xl border border-sky-200 shrink-0">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-sky-500 shadow-[0_0_6px_#0284c7]"></span>
            </span>
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

          {/* Center Office Quick Button */}
          <button
            onClick={centerToOffice}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-xl transition-all border border-sky-200 cursor-pointer shrink-0"
            title="Focus AOTMS Headquarters"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/></svg>
            <span className="hidden sm:inline">HQ Center</span>
          </button>
        </div>
      </div>

      {/* ── DOCKED FLOATING NAVIGATION CONTROLS (Right Side - Crisp White Glass) ── */}
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
              onClick={centerToSelectedEmployee}
              className="size-9 flex items-center justify-center text-sky-600 hover:text-white bg-sky-50 hover:bg-sky-500 rounded-xl transition-all cursor-pointer"
              title={`Focus ${selectedEmployee.name}`}
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

      {/* ── BOTTOM-LEFT: Selected Agent Telemetry Spotlight Card (Pristine White Glass) ── */}
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
                    <span className="size-2 rounded-full bg-sky-500 animate-pulse shrink-0" />
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

      {/* ── BOTTOM-RIGHT HUD: Camera Telemetry Pill (Clean White Glass) ── */}
      <div className="absolute bottom-3 right-3 z-10 pointer-events-none hidden sm:block">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl px-2.5 py-1 text-[9.5px] font-mono text-slate-600 shadow-2xs flex items-center gap-2.5">
          <span>PITCH: <strong className="text-sky-600">{cameraTelemetry.pitch}°</strong></span>
          <span className="text-slate-300">|</span>
          <span>HEADING: <strong className="text-orange-500">{cameraTelemetry.bearing}°</strong></span>
          <span className="text-slate-300">|</span>
          <span>ZOOM: <strong className="text-slate-800">{cameraTelemetry.zoom}x</strong></span>
        </div>
      </div>

      {/* ── CSS KEYFRAME ANIMATIONS FOR SYMBOLS & RADARS ── */}
      <style>{`
        @keyframes movingPulseLight {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes idleBreathingLight {
          0%, 100% { opacity: 0.3; transform: scale(0.95); }
          50% { opacity: 0.7; transform: scale(1.15); }
        }
        @keyframes hqSweepRingLight {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes rotateReticle {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
