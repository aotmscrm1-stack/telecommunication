/**
 * Centralized Tracking & Office Configuration (Single Source of Truth)
 * Academy Of Tech Masters / AOTMS Global Pvt Ltd
 * Building: Pothuri Towers, 2nd Floor
 * Road: MG Road, Near DV Manor Hotel
 * Area: Chandra Mouli Puram / Sriram Nagar / Labbipet
 * City: Vijayawada, Andhra Pradesh - 520010, India
 *
 * Verified Real-World Coordinates:
 *   Latitude:  16.499614
 *   Longitude: 80.648500
 */

export const OFFICE_LOCATION = {
  latitude: 16.499614,
  longitude: 80.648500,
  radiusMeters: 100, // Configurable office geofence radius
  exitRadiusMeters: 140, // Hysteresis for leaving office
  name: 'AOTMS Global Pvt Ltd',
  shortName: 'AOTMS Office',
  building: 'Pothuri Towers, 2nd Floor',
  road: 'MG Road',
  landmark: 'Near DV Manor Hotel, Opp. Lucky Shopping Mall',
  area: 'Chandra Mouli Puram / Sriram Nagar',
  city: 'Vijayawada',
  state: 'Andhra Pradesh',
  pincode: '520010',
  country: 'India',
  displayAddress: 'Pothuri Towers, 2nd Floor, MG Road, Vijayawada',
  fullAddress: 'AOTMS Global Pvt Ltd, Pothuri Towers, 2nd Floor, MG Road, Near DV Manor Hotel, Chandra Mouli Puram / Sriram Nagar, Vijayawada, Andhra Pradesh - 520010, India',
};

// [lng, lat] coordinate array for MapLibre / GeoJSON
export const OFFICE_COORDS_LNG_LAT = [
  OFFICE_LOCATION.longitude,
  OFFICE_LOCATION.latitude,
];

export const STATUS_THEME = {
  AT_OFFICE: {
    primary: '#0284c7',
    pulse: 'rgba(2, 132, 199, 0.35)',
    bg: '#e0f2fe',
    text: '#0369a1',
    border: '#7dd3fc',
    label: 'At Office',
    iconBg: '#0284c7',
    badge: '🏢 At Office',
  },
  LEAVING_OFFICE: {
    primary: '#8b5cf6',
    pulse: 'rgba(139, 92, 246, 0.35)',
    bg: '#f3e8ff',
    text: '#6d28d9',
    border: '#c4b5fd',
    label: 'Leaving Office',
    iconBg: '#8b5cf6',
    badge: '🚶 Leaving Office',
  },
  MOVING: {
    primary: '#10b981',
    pulse: 'rgba(16, 185, 129, 0.45)',
    bg: '#ecfdf5',
    text: '#065f46',
    border: '#6ee7b7',
    label: 'Moving',
    iconBg: '#10b981',
    badge: '🟢 Moving',
  },
  STOPPED: {
    primary: '#f59e0b',
    pulse: 'rgba(245, 158, 11, 0.35)',
    bg: '#fffbeb',
    text: '#92400e',
    border: '#fcd34d',
    label: 'Stopped',
    iconBg: '#f59e0b',
    badge: '🟡 Stopped',
  },
  OFFLINE: {
    primary: '#94a3b8',
    pulse: 'transparent',
    bg: '#f1f5f9',
    text: '#475569',
    border: '#cbd5e1',
    label: 'Offline',
    iconBg: '#94a3b8',
    badge: '🔴 Offline',
  },
};

/**
 * Validates GPS coordinates range and types
 */
export function isValidCoordinates(lat, lng) {
  if (lat == null || lng == null) return false;
  const numLat = Number(lat);
  const numLng = Number(lng);
  return (
    typeof numLat === 'number' &&
    typeof numLng === 'number' &&
    !isNaN(numLat) &&
    !isNaN(numLng) &&
    numLat >= -90 &&
    numLat <= 90 &&
    numLng >= -180 &&
    numLng <= 180 &&
    !(numLat === 0 && numLng === 0)
  );
}

/**
 * Calculates distance in meters between two lat/lng pairs using the Haversine formula
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Checks if a coordinate is inside the office geofence
 */
export function isInsideOfficeGeofence(lat, lng, radiusMeters = OFFICE_LOCATION.radiusMeters) {
  if (!isValidCoordinates(lat, lng)) return false;
  const dist = calculateDistanceMeters(OFFICE_LOCATION.latitude, OFFICE_LOCATION.longitude, Number(lat), Number(lng));
  return dist <= radiusMeters;
}

export default {
  OFFICE_LOCATION,
  OFFICE_COORDS_LNG_LAT,
  STATUS_THEME,
  isValidCoordinates,
  calculateDistanceMeters,
  isInsideOfficeGeofence,
};
