import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// ── Verified Real-World AOTMS Office Coordinates (Pothuri Towers, MG Road, Vijayawada) ──
const DEFAULT_OFFICE_COORDS = [80.648500, 16.499614]; // [lng, lat]
const DEFAULT_GEOFENCE_RADIUS = 100; // meters

const DEFAULT_MAP_STYLE = {
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

const MAP_STYLE = import.meta.env.VITE_MAP_STYLE_URL || DEFAULT_MAP_STYLE;

const STATUS_THEME = {
  AT_OFFICE: {
    primary: '#0284c7',
    pulse: 'rgba(2, 132, 199, 0.35)',
    bg: '#e0f2fe',
    text: '#0369a1',
    border: '#7dd3fc',
    label: 'At Office',
    iconBg: '#0284c7',
  },
  LEAVING_OFFICE: {
    primary: '#8b5cf6',
    pulse: 'rgba(139, 92, 246, 0.35)',
    bg: '#f3e8ff',
    text: '#6d28d9',
    border: '#c4b5fd',
    label: 'Leaving Office',
    iconBg: '#8b5cf6',
  },
  MOVING: {
    primary: '#10b981',
    pulse: 'rgba(16, 185, 129, 0.45)',
    bg: '#ecfdf5',
    text: '#065f46',
    border: '#6ee7b7',
    label: 'Moving',
    iconBg: '#10b981',
  },
  STOPPED: {
    primary: '#f59e0b',
    pulse: 'rgba(245, 158, 11, 0.35)',
    bg: '#fffbeb',
    text: '#92400e',
    border: '#fcd34d',
    label: 'Stopped',
    iconBg: '#f59e0b',
  },
  OFFLINE: {
    primary: '#94a3b8',
    pulse: 'transparent',
    bg: '#f1f5f9',
    text: '#475569',
    border: '#cbd5e1',
    label: 'Offline',
    iconBg: '#94a3b8',
  },
};

/**
 * Generate a GeoJSON Polygon circle for the geofence
 */
function createGeoJsonCircle(centerLngLat, radiusInMeters, points = 64) {
  const coords = {
    latitude: centerLngLat[1],
    longitude: centerLngLat[0],
  };
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
    geometry: {
      type: 'Polygon',
      coordinates: [ret],
    },
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
  const markersRef = useRef(new Map()); // employeeId -> { marker, el, popup, currentLngLat, animFrame }
  const historyMarkersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // One source of truth for office coordinates
  const officeLngLat = officeConfig?.longitude && officeConfig?.latitude
    ? [Number(officeConfig.longitude), Number(officeConfig.latitude)]
    : DEFAULT_OFFICE_COORDS;
  const geofenceRadius = officeConfig?.radiusMeters || DEFAULT_GEOFENCE_RADIUS;

  // ── 1. Initialize MapLibre GL ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center map around real AOTMS Office at Pothuri Towers, MG Road, Vijayawada
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: officeLngLat,
      zoom: 15.5,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.addControl(
      new maplibregl.AttributionControl({ compact: true, customAttribution: 'AOTMS Field Logistics • OpenStreetMap' }),
      'bottom-right'
    );

    map.on('load', () => {
      // Add Geofence Circle Layers centered around real AOTMS Office
      const circleGeoJson = createGeoJsonCircle(officeLngLat, geofenceRadius);

      map.addSource('office-geofence-source', {
        type: 'geojson',
        data: circleGeoJson,
      });

      // Semi-transparent Fill
      map.addLayer({
        id: 'office-geofence-fill',
        type: 'fill',
        source: 'office-geofence-source',
        paint: {
          'fill-color': '#0284c7',
          'fill-opacity': 0.14,
        },
      });

      // Dashed Border Outline
      map.addLayer({
        id: 'office-geofence-line',
        type: 'line',
        source: 'office-geofence-source',
        paint: {
          'line-color': '#0284c7',
          'line-width': 2.5,
          'line-dasharray': [3, 2],
          'line-opacity': 0.85,
        },
      });

      // Add Real-World AOTMS Office Building Marker (Pothuri Towers)
      const officeEl = document.createElement('div');
      officeEl.className = 'aotms-office-marker';
      officeEl.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          filter: drop-shadow(0 4px 12px rgba(2, 132, 199, 0.45));
          z-index: 40;
        ">
          <div style="
            background: #0284c7;
            color: #ffffff;
            width: 42px;
            height: 42px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 21px;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 14px rgba(0,0,0,0.3);
          ">
            🏢
          </div>
          <div style="
            margin-top: 4px;
            background: rgba(15, 23, 42, 0.94);
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 6px;
            white-space: nowrap;
            letter-spacing: 0.02em;
            border: 1px solid rgba(255,255,255,0.25);
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          ">
            <span>AOTMS</span>
            <span style="color: #38bdf8;">• Pothuri Towers</span>
          </div>
        </div>
      `;

      const officePopup = new maplibregl.Popup({ offset: 28, closeButton: false }).setHTML(`
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px 8px; max-width: 270px;">
          <div style="font-weight: 800; font-size: 13.5px; color: #0284c7; margin-bottom: 3px;">
            🏢 Academy Of Tech Masters
          </div>
          <div style="font-size: 11.5px; font-weight: 700; color: #0f172a;">
            2nd Floor, Pothuri Towers
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">
            MG Road, Near DV Manor
          </div>
          <div style="font-size: 11px; color: #0284c7; font-weight: 600; margin-top: 1px;">
            Opposite Lucky Shopping Mall
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 1px;">
            Vijayawada, Andhra Pradesh - 520010
          </div>
          <div style="margin-top: 6px; font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 2px 7px; border-radius: 4px; font-weight: 700; display: inline-block;">
            Geofence Boundary: ${geofenceRadius}m
          </div>
        </div>
      `);

      officeMarkerRef.current = new maplibregl.Marker({ element: officeEl })
        .setLngLat(officeLngLat)
        .setPopup(officePopup)
        .addTo(map);

      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      if (officeMarkerRef.current) officeMarkerRef.current.remove();
      markersRef.current.forEach(({ marker, animFrame }) => {
        if (animFrame) cancelAnimationFrame(animFrame);
        marker.remove();
      });
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update office marker & geofence circle if officeConfig updates
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    if (officeMarkerRef.current) {
      officeMarkerRef.current.setLngLat(officeLngLat);
    }

    const circleGeoJson = createGeoJsonCircle(officeLngLat, geofenceRadius);
    if (map.getSource('office-geofence-source')) {
      map.getSource('office-geofence-source').setData(circleGeoJson);
    }
  }, [officeLngLat, geofenceRadius, mapLoaded]);

  // ── 2. Helper to Build Realistic Blinkit Motorcycle / Field Delivery Marker ──
  const buildMarkerHtml = (emp, loc, isSelected) => {
    const status = loc.trackingStatus || 'OFFLINE';
    const theme = STATUS_THEME[status] || STATUS_THEME.STOPPED;
    const heading = loc.heading || 0;
    const speed = loc.speed || 0;
    const road = loc.road || '';
    const initial = (emp.name || 'E').charAt(0).toUpperCase();

    // ── CASE A: Active Moving Employee (Motorcycle / Delivery Bike Marker) ────
    if (status === 'MOVING' || status === 'LEAVING_OFFICE') {
      return `
        <div class="delivery-bike-wrapper ${isSelected ? 'is-selected' : ''}" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          user-select: none;
          transform: ${isSelected ? 'scale(1.15) translateY(-4px)' : 'scale(1)'};
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: ${isSelected ? 60 : 25};
        ">
          <!-- Dynamic Directional Bike Marker Housing -->
          <div class="bike-beacon-container" style="
            position: relative;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <!-- Radar Pulse Wave -->
            <div style="
              position: absolute;
              inset: -6px;
              border-radius: 50%;
              background: rgba(16, 185, 129, 0.35);
              animation: pulse-radar 1.8s infinite ease-out;
              pointer-events: none;
              z-index: 1;
            "></div>

            <!-- Direction Compass Ring -->
            <div style="
              position: absolute;
              inset: 0;
              border-radius: 50%;
              background: #ffffff;
              box-shadow: 0 4px 16px rgba(0,0,0,0.28), 0 0 0 2.5px #10b981;
              z-index: 2;
            "></div>

            <!-- Rotating Motorcycle Vehicle SVG with Headlight Beam -->
            <div style="
              position: absolute;
              width: 38px;
              height: 38px;
              transform: rotate(${heading}deg);
              transition: transform 0.35s ease-out;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 3;
            ">
              <!-- Headlight Beam -->
              <div style="
                position: absolute;
                top: -14px;
                width: 0;
                height: 0;
                border-left: 9px solid transparent;
                border-right: 9px solid transparent;
                border-bottom: 18px solid rgba(56, 189, 248, 0.45);
                filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.8));
                pointer-events: none;
              "></div>

              <!-- Top-down Delivery Motorcycle SVG -->
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Back Wheel -->
                <rect x="15" y="24" width="4" height="8" rx="2" fill="#1e293b"/>
                <!-- Front Wheel -->
                <rect x="15" y="2" width="4" height="8" rx="2" fill="#1e293b"/>
                <!-- Exhaust Pipe -->
                <rect x="12" y="21" width="2" height="6" rx="1" fill="#64748b"/>
                <!-- Bike Chassis -->
                <path d="M14 8 H20 L19.5 25 H14.5 L14 8 Z" fill="#059669"/>
                <!-- Tank / Green Fairing -->
                <path d="M14.5 11 C14.5 9 19.5 9 19.5 11 L20 18 C20 20 14 20 14 18 Z" fill="#10b981"/>
                <!-- Rider Helmet -->
                <circle cx="17" cy="16" r="4" fill="#0f172a"/>
                <circle cx="17" cy="14.5" r="2.2" fill="#38bdf8"/>
                <!-- Handlebars -->
                <path d="M9 9 L25 9" stroke="#334155" stroke-width="2.5" stroke-linecap="round"/>
                <circle cx="9" cy="9" r="1.5" fill="#0f172a"/>
                <circle cx="25" cy="9" r="1.5" fill="#0f172a"/>
                <!-- Delivery Box Carrier -->
                <rect x="13.5" y="21" width="7" height="6" rx="1.5" fill="#0284c7" stroke="#ffffff" stroke-width="0.8"/>
              </svg>
            </div>

            <!-- Tiny Speed Dot -->
            <div style="
              position: absolute;
              bottom: -2px;
              right: -2px;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: #10b981;
              border: 2px solid #ffffff;
              z-index: 4;
            "></div>
          </div>

          <!-- Name & Road / Speed Info Pill (Blinkit Style) -->
          <div class="marker-tag-pill" style="
            margin-top: 4px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
          ">
            <div style="
              background: rgba(15, 23, 42, 0.94);
              backdrop-filter: blur(4px);
              color: #ffffff;
              font-size: 10.5px;
              font-weight: 700;
              padding: 2px 8px;
              border-radius: 12px;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              border: 1px solid rgba(255,255,255,0.18);
              display: flex;
              align-items: center;
              gap: 5px;
            ">
              <span>🏍️ ${emp.name || 'Courier'}</span>
              <span style="
                background: #10b981;
                color: #ffffff;
                font-size: 9.5px;
                padding: 0 4px;
                border-radius: 6px;
                font-weight: 800;
              ">${speed > 0 ? `${speed} km/h` : 'Moving'}</span>
            </div>

            ${
              road
                ? `<div style="
                    background: #ffffff;
                    color: #0f172a;
                    font-size: 9px;
                    font-weight: 700;
                    padding: 1px 6px;
                    border-radius: 8px;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
                    border: 1px solid #e2e8f0;
                    max-width: 120px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                  ">🛣️ ${road}</div>`
                : ''
            }
          </div>
        </div>
      `;
    }

    // ── CASE B: At Office Status ──────────────────────────────────────────────
    if (status === 'AT_OFFICE') {
      return `
        <div class="office-emp-wrapper ${isSelected ? 'is-selected' : ''}" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transform: ${isSelected ? 'scale(1.15) translateY(-4px)' : 'scale(1)'};
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: ${isSelected ? 50 : 20};
        ">
          <div style="
            position: relative;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #ffffff;
            border: 3px solid #0284c7;
            box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${
              emp.avatar
                ? `<img src="${emp.avatar}" alt="${emp.name}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;" />`
                : `<div style="width: 30px; height: 30px; border-radius: 50%; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800;">${initial}</div>`
            }
            <div style="
              position: absolute;
              bottom: -2px;
              right: -2px;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: #0284c7;
              border: 2px solid #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 8px;
            ">🏢</div>
          </div>
          <div style="
            margin-top: 4px;
            background: rgba(15, 23, 42, 0.9);
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 10px;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>${emp.name || 'Employee'}</span>
            <span style="background: #0284c7; color: #ffffff; font-size: 8.5px; padding: 0 4px; border-radius: 4px; font-weight: 800;">At Office</span>
          </div>
        </div>
      `;
    }

    // ── CASE C: Stopped Outside Office ────────────────────────────────────────
    if (status === 'STOPPED') {
      return `
        <div class="stopped-marker-wrapper ${isSelected ? 'is-selected' : ''}" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transform: ${isSelected ? 'scale(1.15) translateY(-4px)' : 'scale(1)'};
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: ${isSelected ? 50 : 15};
        ">
          <div style="
            position: relative;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #ffffff;
            border: 3px solid #f59e0b;
            box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${
              emp.avatar
                ? `<img src="${emp.avatar}" alt="${emp.name}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;" />`
                : `<div style="width: 30px; height: 30px; border-radius: 50%; background: #fffbeb; color: #92400e; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800;">${initial}</div>`
            }
            <div style="
              position: absolute;
              bottom: -2px;
              right: -2px;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: #f59e0b;
              border: 2px solid #ffffff;
            "></div>
          </div>
          <div style="
            margin-top: 4px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
          ">
            <div style="
              background: rgba(15, 23, 42, 0.9);
              color: #ffffff;
              font-size: 10px;
              font-weight: 700;
              padding: 2px 7px;
              border-radius: 10px;
              white-space: nowrap;
              box-shadow: 0 2px 6px rgba(0,0,0,0.2);
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              <span>${emp.name || 'Employee'}</span>
              <span style="background: #f59e0b; color: #ffffff; font-size: 8.5px; padding: 0 4px; border-radius: 4px; font-weight: 800;">Stopped</span>
            </div>
            ${
              road
                ? `<div style="
                    background: #ffffff;
                    color: #0f172a;
                    font-size: 9px;
                    font-weight: 700;
                    padding: 1px 6px;
                    border-radius: 8px;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
                    border: 1px solid #e2e8f0;
                    max-width: 120px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                  ">📍 ${road}</div>`
                : ''
            }
          </div>
        </div>
      `;
    }

    // ── CASE D: Offline (Default) ─────────────────────────────────────────────
    return `
      <div class="offline-marker-wrapper ${isSelected ? 'is-selected' : ''}" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        opacity: 0.85;
        transform: ${isSelected ? 'scale(1.15) translateY(-4px)' : 'scale(1)'};
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        z-index: ${isSelected ? 50 : 10};
      ">
        <div style="
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #ffffff;
          border: 2.5px solid ${theme.primary};
          box-shadow: 0 3px 10px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="width: 26px; height: 26px; border-radius: 50%; background: ${theme.bg}; color: ${theme.text}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800;">
            ${initial}
          </div>
        </div>
        <div style="
          margin-top: 3px;
          background: rgba(15, 23, 42, 0.85);
          color: #ffffff;
          font-size: 9.5px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 8px;
          white-space: nowrap;
        ">
          ${emp.name || 'Employee'}
        </div>
      </div>
    `;
  };

  // ── 3. Smooth Marker Transition Helper (requestAnimationFrame) ──────────────
  const animateMarkerMovement = (markerEntry, targetLngLat) => {
    const startLng = markerEntry.currentLngLat[0];
    const startLat = markerEntry.currentLngLat[1];
    const endLng = targetLngLat[0];
    const endLat = targetLngLat[1];

    if (startLng === endLng && startLat === endLat) return;

    if (markerEntry.animFrame) {
      cancelAnimationFrame(markerEntry.animFrame);
    }

    const duration = 300; // ms
    const startTime = performance.now();

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      const curLng = startLng + (endLng - startLng) * ease;
      const curLat = startLat + (endLat - startLat) * ease;

      markerEntry.marker.setLngLat([curLng, curLat]);

      if (progress < 1) {
        markerEntry.animFrame = requestAnimationFrame(step);
      } else {
        markerEntry.currentLngLat = targetLngLat;
        markerEntry.animFrame = null;
      }
    };

    markerEntry.animFrame = requestAnimationFrame(step);
  };

  // ── 4. Real-Time Marker Synchronization ─────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || isHistoryMode) return;

    const map = mapRef.current;
    const currentEmployeeIds = new Set();

    employees.forEach((emp) => {
      const uId = emp._id || emp.employeeId;
      if (!uId) return;
      currentEmployeeIds.add(uId);

      const loc = emp.location || emp;
      const lat = loc?.latitude;
      const lng = loc?.longitude;
      const isValid = lat != null && lng != null && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

      if (!isValid) {
        if (markersRef.current.has(uId)) {
          const entry = markersRef.current.get(uId);
          if (entry.animFrame) cancelAnimationFrame(entry.animFrame);
          entry.marker.remove();
          markersRef.current.delete(uId);
        }
        return;
      }

      const isSelected = selectedEmployeeId === uId;
      let markerEntry = markersRef.current.get(uId);

      const statusTheme = STATUS_THEME[loc.trackingStatus] || STATUS_THEME.STOPPED;
      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${emp.name}</div>
            <span style="background: ${statusTheme.bg}; color: ${statusTheme.text}; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 800;">
              ${statusTheme.label}
            </span>
          </div>
          ${loc.road ? `<div style="font-size: 11px; font-weight: 700; color: #0284c7; margin-bottom: 2px;">🛣️ ${loc.road}</div>` : ''}
          ${loc.area || loc.city ? `<div style="font-size: 10.5px; color: #64748b; margin-bottom: 4px;">📍 ${[loc.area, loc.city].filter(Boolean).join(', ')}</div>` : ''}
          <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-top: 4px;">
            ${loc.speed > 0 ? `<span style="background: #ecfdf5; color: #059669; padding: 1px 6px; border-radius: 4px; font-weight: 700;">🏍️ ${loc.speed} km/h</span>` : ''}
            ${loc.heading > 0 ? `<span style="background: #f1f5f9; color: #475569; padding: 1px 6px; border-radius: 4px; font-weight: 600;">🧭 ${loc.heading}°</span>` : ''}
            ${loc.accuracy ? `<span style="background: #f8fafc; color: #64748b; padding: 1px 5px; border-radius: 4px; font-size: 10px;">±${Math.round(loc.accuracy)}m</span>` : ''}
          </div>
        </div>
      `;

      if (!markerEntry) {
        // Create new MapLibre DOM Marker
        const el = document.createElement('div');
        el.innerHTML = buildMarkerHtml(emp, loc, isSelected);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectEmployee(uId);
        });

        const popup = new maplibregl.Popup({ offset: 25, closeButton: false, closeOnClick: false })
          .setHTML(popupHtml);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);

        markerEntry = { marker, el, popup, currentLngLat: [lng, lat], animFrame: null };
        markersRef.current.set(uId, markerEntry);
      } else {
        // Smooth position transition
        animateMarkerMovement(markerEntry, [lng, lat]);
        markerEntry.el.innerHTML = buildMarkerHtml(emp, loc, isSelected);
        markerEntry.popup.setHTML(popupHtml);
      }
    });

    // Clean up removed employees
    markersRef.current.forEach(({ marker, animFrame }, id) => {
      if (!currentEmployeeIds.has(id)) {
        if (animFrame) cancelAnimationFrame(animFrame);
        marker.remove();
        markersRef.current.delete(id);
      }
    });
  }, [employees, mapLoaded, selectedEmployeeId, isHistoryMode]);

  // ── 5. Selected Employee Route Polyline & GPS Accuracy Circle ────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || isHistoryMode) return;
    const map = mapRef.current;
    const liveRouteSourceId = 'live-active-route-source';
    const liveRouteLayerId = 'live-active-route-layer';
    const accuracySourceId = 'live-accuracy-circle-source';
    const accuracyFillLayerId = 'live-accuracy-circle-fill';
    const accuracyLineLayerId = 'live-accuracy-circle-line';

    if (!selectedEmployeeId || !showRouteTrail) {
      if (map.getLayer(liveRouteLayerId)) map.removeLayer(liveRouteLayerId);
      if (map.getSource(liveRouteSourceId)) map.removeSource(liveRouteSourceId);
      if (map.getLayer(accuracyFillLayerId)) map.removeLayer(accuracyFillLayerId);
      if (map.getLayer(accuracyLineLayerId)) map.removeLayer(accuracyLineLayerId);
      if (map.getSource(accuracySourceId)) map.removeSource(accuracySourceId);
      return;
    }

    const emp = employees.find((e) => (e._id || e.employeeId) === selectedEmployeeId);
    const loc = emp?.location || emp;

    if (loc?.latitude && loc?.longitude) {
      // 1. Live Route Polyline from Breadcrumbs or Office -> Current Position
      const rawBreadcrumbs = Array.isArray(loc.breadcrumbs) && loc.breadcrumbs.length > 0 ? loc.breadcrumbs : [];
      const routeCoords = [
        officeLngLat,
        ...rawBreadcrumbs.filter((pt) => pt && pt.length === 2 && pt[0] !== 0 && pt[1] !== 0),
        [loc.longitude, loc.latitude],
      ];

      const routeGeojson = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routeCoords,
        },
      };

      if (map.getSource(liveRouteSourceId)) {
        map.getSource(liveRouteSourceId).setData(routeGeojson);
      } else {
        map.addSource(liveRouteSourceId, {
          type: 'geojson',
          data: routeGeojson,
        });

        map.addLayer({
          id: liveRouteLayerId,
          type: 'line',
          source: liveRouteSourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#0284c7',
            'line-width': 3.5,
            'line-dasharray': [2, 2],
            'line-opacity': 0.75,
          },
        });
      }

      // 2. Accuracy Circle Polygon around selected employee
      const accuracyRadiusMeters = Math.min(Math.max(loc.accuracy || 15, 8), 100);
      const accuracyCircleGeojson = createGeoJsonCircle([loc.longitude, loc.latitude], accuracyRadiusMeters, 32);

      if (map.getSource(accuracySourceId)) {
        map.getSource(accuracySourceId).setData(accuracyCircleGeojson);
      } else {
        map.addSource(accuracySourceId, {
          type: 'geojson',
          data: accuracyCircleGeojson,
        });

        map.addLayer({
          id: accuracyFillLayerId,
          type: 'fill',
          source: accuracySourceId,
          paint: {
            'fill-color': '#38bdf8',
            'fill-opacity': 0.12,
          },
        });

        map.addLayer({
          id: accuracyLineLayerId,
          type: 'line',
          source: accuracySourceId,
          paint: {
            'line-color': '#38bdf8',
            'line-width': 1.5,
            'line-dasharray': [2, 2],
            'line-opacity': 0.6,
          },
        });
      }
    }
  }, [selectedEmployeeId, employees, mapLoaded, isHistoryMode, officeLngLat, showRouteTrail]);

  // ── 6. Follow Employee Mode / Camera Pan ─────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !selectedEmployeeId || isHistoryMode) return;

    const emp = employees.find((e) => (e._id || e.employeeId) === selectedEmployeeId);
    const loc = emp?.location || emp;

    if (loc?.latitude && loc?.longitude && loc.latitude !== 0 && loc.longitude !== 0) {
      if (followEmployee) {
        // Continuous smooth ease to keep courier centered
        mapRef.current.easeTo({
          center: [loc.longitude, loc.latitude],
          zoom: Math.max(mapRef.current.getZoom(), 16),
          duration: 400,
        });
      } else {
        // Initial center on select
        mapRef.current.flyTo({
          center: [loc.longitude, loc.latitude],
          zoom: Math.max(mapRef.current.getZoom(), 16),
          speed: 1.4,
          curve: 1.2,
          essential: true,
        });
      }

      const entry = markersRef.current.get(selectedEmployeeId);
      if (entry?.marker && !entry.marker.getPopup().isOpen()) {
        entry.marker.togglePopup();
      }
    }
  }, [selectedEmployeeId, followEmployee, mapLoaded]);

  // ── 7. Historical Route Trail Overlay ───────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    const sourceId = 'history-route-source';
    const layerId = 'history-route-layer';
    const casingLayerId = 'history-route-casing';

    historyMarkersRef.current.forEach((m) => m.remove());
    historyMarkersRef.current = [];

    if (!isHistoryMode || historyPoints.length === 0) {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);

      // Restore live markers
      markersRef.current.forEach(({ el }) => {
        el.style.display = 'flex';
      });
      return;
    }

    // Hide live markers in history playback mode
    markersRef.current.forEach(({ el }) => {
      el.style.display = 'none';
    });

    const coordinates = historyPoints
      .filter((p) => p.latitude && p.longitude && p.latitude !== 0 && p.longitude !== 0)
      .map((p) => [p.longitude, p.latitude]);

    if (coordinates.length === 0) return;

    const geojson = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates,
      },
    };

    if (map.getSource(sourceId)) {
      map.getSource(sourceId).setData(geojson);
    } else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson,
      });

      // Outer glowing casing
      map.addLayer({
        id: casingLayerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#0369a1',
          'line-width': 8,
          'line-opacity': 0.4,
        },
      });

      // Main route line
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#0284c7',
          'line-width': 4.5,
          'line-opacity': 0.95,
        },
      });
    }

    // 🚩 Start Point Pin
    const startCoord = coordinates[0];
    const startEl = document.createElement('div');
    startEl.innerHTML = `
      <div style="
        background: #10b981;
        color: #ffffff;
        font-weight: 800;
        font-size: 11px;
        padding: 4px 9px;
        border-radius: 14px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        border: 2px solid #ffffff;
      ">
        🚩 Start
      </div>
    `;
    const startMarker = new maplibregl.Marker({ element: startEl }).setLngLat(startCoord).addTo(map);
    historyMarkersRef.current.push(startMarker);

    // 🏁 Destination Point Pin
    const endCoord = coordinates[coordinates.length - 1];
    const endEl = document.createElement('div');
    endEl.innerHTML = `
      <div style="
        background: #ef4444;
        color: #ffffff;
        font-weight: 800;
        font-size: 11px;
        padding: 4px 9px;
        border-radius: 14px;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        border: 2px solid #ffffff;
      ">
        🏁 End
      </div>
    `;
    const endMarker = new maplibregl.Marker({ element: endEl }).setLngLat(endCoord).addTo(map);
    historyMarkersRef.current.push(endMarker);

    // Fit bounds smoothly
    if (historyBounds) {
      map.fitBounds(
        [
          [historyBounds.minLng, historyBounds.minLat],
          [historyBounds.maxLng, historyBounds.maxLat],
        ],
        { padding: 80, maxZoom: 16, duration: 1200 }
      );
    }
  }, [isHistoryMode, historyPoints, historyBounds, mapLoaded]);

  // ── 8. Control Actions ──────────────────────────────────────────────────────
  const handleFitAll = useCallback(() => {
    if (!mapRef.current) return;
    const coords = employees
      .filter((e) => e.location?.latitude && e.location?.longitude)
      .map((e) => [e.location.longitude, e.location.latitude]);

    coords.push(officeLngLat);

    if (coords.length > 0) {
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 16, duration: 800 });
    }
  }, [employees, officeLngLat]);

  const handleCenterOffice = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({ center: officeLngLat, zoom: 16.5, duration: 800 });
    if (officeMarkerRef.current && !officeMarkerRef.current.getPopup().isOpen()) {
      officeMarkerRef.current.togglePopup();
    }
  }, [officeLngLat]);

  const handleCenterSelected = useCallback(() => {
    if (!mapRef.current || !selectedEmployeeId) return;
    const emp = employees.find((e) => (e._id || e.employeeId) === selectedEmployeeId);
    const loc = emp?.location || emp;
    if (loc?.latitude && loc?.longitude) {
      mapRef.current.flyTo({ center: [loc.longitude, loc.latitude], zoom: 16, duration: 800 });
    }
  }, [employees, selectedEmployeeId]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Map Controls Toolbar */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          zIndex: 20,
        }}
      >
        {selectedEmployeeId && (
          <>
            {/* Follow Employee Mode Button */}
            <button
              onClick={onToggleFollow}
              title={followEmployee ? 'Disable Follow Mode' : 'Enable Follow Mode (Camera auto-tracks courier)'}
              style={{
                background: followEmployee ? '#0284c7' : '#ffffff',
                color: followEmployee ? '#ffffff' : '#0369a1',
                border: `1px solid ${followEmployee ? '#0284c7' : '#bae6fd'}`,
                borderRadius: 8,
                padding: '7px 12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 13 }}>🎯</span>
              Follow Courier: {followEmployee ? 'ON' : 'OFF'}
            </button>

            {/* Toggle Route Trail Button */}
            <button
              onClick={onToggleRouteTrail}
              title={showRouteTrail ? 'Hide Route Polyline' : 'Show Route Polyline'}
              style={{
                background: showRouteTrail ? '#f0f9ff' : '#ffffff',
                color: showRouteTrail ? '#0284c7' : '#64748b',
                border: `1px solid ${showRouteTrail ? '#bae6fd' : '#e2e8f0'}`,
                borderRadius: 8,
                padding: '7px 12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s',
              }}
            >
              <span>🗺️</span>
              Route Trail: {showRouteTrail ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={handleCenterSelected}
              title="Center on Selected Employee"
              style={{
                background: '#ffffff',
                color: '#0369a1',
                border: '1px solid #bae6fd',
                borderRadius: 8,
                padding: '7px 12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Focus Courier
            </button>
          </>
        )}

        <button
          onClick={handleCenterOffice}
          title="Center on AOTMS Office (Pothuri Towers)"
          style={{
            background: '#ffffff',
            color: '#0284c7',
            border: '1px solid #bae6fd',
            borderRadius: 8,
            padding: '7px 12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s',
          }}
        >
          <span>🏢</span>
          AOTMS Office
        </button>

        <button
          onClick={handleFitAll}
          title="Show All Active Employees + AOTMS Office"
          style={{
            background: '#ffffff',
            color: '#334155',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '7px 12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          Fit All Fleet
        </button>
      </div>

      {/* Radar Pulse Animation Keyframes */}
      <style>{`
        @keyframes pulse-radar {
          0% {
            transform: scale(0.9);
            opacity: 0.85;
          }
          70% {
            transform: scale(1.6);
            opacity: 0;
          }
          100% {
            transform: scale(0.9);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
