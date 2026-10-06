const OFFICE_CONFIG = {
  OFFICE_LATITUDE: parseFloat(process.env.OFFICE_LATITUDE) || 17.4486,
  OFFICE_LONGITUDE: parseFloat(process.env.OFFICE_LONGITUDE) || 78.3908,
  GEOFENCE_RADIUS_METERS: parseFloat(process.env.GEOFENCE_RADIUS_METERS) || 300,
  WORK_START_TIME: process.env.WORK_START_TIME || '09:30',
  WORK_END_TIME: process.env.WORK_END_TIME || '18:30',
};

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // distance in metres
}

function isWithinOfficeGeofence(lat, lon) {
  if (!lat || !lon) return false;
  const distance = calculateDistance(
    OFFICE_CONFIG.OFFICE_LATITUDE,
    OFFICE_CONFIG.OFFICE_LONGITUDE,
    parseFloat(lat),
    parseFloat(lon)
  );
  return distance <= OFFICE_CONFIG.GEOFENCE_RADIUS_METERS;
}

module.exports = {
  OFFICE_CONFIG,
  getOfficeConfig: () => OFFICE_CONFIG,
  calculateDistance,
  isWithinOfficeGeofence
};
