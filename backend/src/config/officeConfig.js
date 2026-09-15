/**
 * Real-World Office Location & Geofence Configuration
 * Academy Of Tech Masters (AOTMS)
 * Building: Pothuri Towers (2nd Floor)
 * Landmarks: Near DV Manor Hotel, Opposite Lucky Shopping Mall
 * Road: MG Road
 * City: Vijayawada, Andhra Pradesh - 520010, India
 * 
 * Verified Real-World Coordinates:
 *   Latitude:  16.499614
 *   Longitude: 80.648500
 */

const OFFICE_LATITUDE = Number(process.env.OFFICE_LATITUDE) || 16.499614;
const OFFICE_LONGITUDE = Number(process.env.OFFICE_LONGITUDE) || 80.648500;
const OFFICE_GEOFENCE_RADIUS_METERS = Number(process.env.OFFICE_GEOFENCE_RADIUS_METERS) || 100;
const OFFICE_GEOFENCE_EXIT_RADIUS_METERS = Number(process.env.OFFICE_GEOFENCE_EXIT_RADIUS_METERS) || 140;
const OFFICE_NAME = process.env.OFFICE_NAME || 'AOTMS Global Pvt Ltd';
const OFFICE_SHORT_NAME = process.env.OFFICE_SHORT_NAME || 'AOTMS Office';
const OFFICE_BUILDING = process.env.OFFICE_BUILDING || 'Pothuri Towers, 2nd Floor';
const OFFICE_ROAD = process.env.OFFICE_ROAD || 'MG Road';
const OFFICE_LANDMARK = process.env.OFFICE_LANDMARK || 'Near DV Manor Hotel, Opp. Lucky Shopping Mall';
const OFFICE_ADDRESS = process.env.OFFICE_ADDRESS || 'Pothuri Towers, 2nd Floor, MG Road, Near DV Manor Hotel, Vijayawada';
const OFFICE_FULL_ADDRESS = process.env.OFFICE_FULL_ADDRESS || 'AOTMS Global Pvt Ltd, Pothuri Towers, 2nd Floor, MG Road, Near DV Manor Hotel, Chandra Mouli Puram / Sriram Nagar, Vijayawada, Andhra Pradesh - 520010, India';
const OFFICE_AREA = process.env.OFFICE_AREA || 'Chandra Mouli Puram / Sriram Nagar';
const OFFICE_CITY = process.env.OFFICE_CITY || 'Vijayawada';
const OFFICE_STATE = process.env.OFFICE_STATE || 'Andhra Pradesh';
const OFFICE_PINCODE = process.env.OFFICE_PINCODE || '520010';

/**
 * Calculates distance in meters between two lat/lng pairs using the Haversine formula
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371000; // Earth radius in meters
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
 * Checks if a given coordinate is within the configured office geofence radius
 * Implements hysteresis:
 * - Enter office: dist <= OFFICE_GEOFENCE_RADIUS_METERS (75m)
 * - Stay at office: if already at office, stays at office until dist > OFFICE_GEOFENCE_EXIT_RADIUS_METERS (125m)
 */
function isInsideOfficeGeofence(lat, lng, isAlreadyAtOffice = false) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return false;
  const dist = calculateDistanceMeters(OFFICE_LATITUDE, OFFICE_LONGITUDE, Number(lat), Number(lng));
  const threshold = isAlreadyAtOffice ? OFFICE_GEOFENCE_EXIT_RADIUS_METERS : OFFICE_GEOFENCE_RADIUS_METERS;
  return dist <= threshold;
}

/**
 * Gets distance in meters from given coordinate to the configured office
 */
function getDistanceToOffice(lat, lng) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null;
  return Math.round(calculateDistanceMeters(OFFICE_LATITUDE, OFFICE_LONGITUDE, Number(lat), Number(lng)));
}

/**
 * Returns public office configuration object (single source of truth)
 */
function getOfficeConfig() {
  return {
    latitude: OFFICE_LATITUDE,
    longitude: OFFICE_LONGITUDE,
    radiusMeters: OFFICE_GEOFENCE_RADIUS_METERS,
    exitRadiusMeters: OFFICE_GEOFENCE_EXIT_RADIUS_METERS,
    name: OFFICE_NAME,
    shortName: OFFICE_SHORT_NAME,
    building: OFFICE_BUILDING,
    road: OFFICE_ROAD,
    landmark: OFFICE_LANDMARK,
    address: OFFICE_ADDRESS,
    displayAddress: 'Pothuri Towers, 2nd Floor, MG Road, Vijayawada',
    fullAddress: OFFICE_FULL_ADDRESS,
    area: OFFICE_AREA,
    city: OFFICE_CITY,
    state: OFFICE_STATE,
    pincode: OFFICE_PINCODE,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  };
}

module.exports = {
  OFFICE_LATITUDE,
  OFFICE_LONGITUDE,
  OFFICE_GEOFENCE_RADIUS_METERS,
  OFFICE_GEOFENCE_EXIT_RADIUS_METERS,
  OFFICE_NAME,
  OFFICE_SHORT_NAME,
  OFFICE_BUILDING,
  OFFICE_ROAD,
  OFFICE_LANDMARK,
  OFFICE_ADDRESS,
  OFFICE_FULL_ADDRESS,
  OFFICE_AREA,
  OFFICE_CITY,
  OFFICE_STATE,
  OFFICE_PINCODE,
  calculateDistanceMeters,
  isInsideOfficeGeofence,
  getDistanceToOffice,
  getOfficeConfig,
};
