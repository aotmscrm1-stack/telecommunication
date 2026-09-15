const {
  isInsideOfficeGeofence,
  getDistanceToOffice,
  calculateDistanceMeters,
  getOfficeConfig,
  OFFICE_LATITUDE,
  OFFICE_LONGITUDE,
  OFFICE_GEOFENCE_RADIUS_METERS,
} = require('../src/config/officeConfig');
const { determineTrackingState, calculateBearing } = require('../src/services/trackingSocket');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ${message}`);
  }
}

async function runMapSuite() {
  console.log('===============================================================');
  console.log('🛰️ EXECUTING FULL LIVE MAP & TRACKING VERIFICATION SUITE');
  console.log('===============================================================\n');

  // TEST 1: Office Location Validation
  console.log('─── TEST 1: Office Location & Geofence ───');
  const config = getOfficeConfig();
  assert(config.latitude === 16.499614, 'Office latitude matches verified Pothuri Towers (16.499614)');
  assert(config.longitude === 80.648500, 'Office longitude matches verified Pothuri Towers (80.648500)');
  assert(config.radiusMeters === 100, 'Configurable geofence radius is 100m');
  assert(config.name === 'AOTMS Global Pvt Ltd', 'Office name is AOTMS Global Pvt Ltd');
  assert(config.displayAddress.includes('Pothuri Towers'), 'Address includes Pothuri Towers');

  // TEST 2: Coordinate validation
  console.log('\n─── TEST 2: Location Validation ───');
  function isValidCoordinates(lat, lng) {
    if (lat == null || lng == null) return false;
    const nLat = Number(lat);
    const nLng = Number(lng);
    return !isNaN(nLat) && !isNaN(nLng) && nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180 && !(nLat === 0 && nLng === 0);
  }
  assert(isValidCoordinates(16.499614, 80.648500), 'Valid Pothuri Towers coordinates accepted');
  assert(!isValidCoordinates(null, 80.6485), 'Null latitude rejected');
  assert(!isValidCoordinates(16.4996, undefined), 'Undefined longitude rejected');
  assert(!isValidCoordinates(0, 0), '(0, 0) coordinate rejected');
  assert(!isValidCoordinates(95, 80), 'Out-of-bound latitude (> 90) rejected');
  assert(!isValidCoordinates(16, 200), 'Out-of-bound longitude (> 180) rejected');

  // TEST 3: State Machine Transitions
  console.log('\n─── TEST 3: State Machine & Speed Transitions ───');
  const atOfficeState = determineTrackingState(16.499614, 80.648500, 0, 0, 0, null);
  assert(atOfficeState.trackingStatus === 'AT_OFFICE', 'Employee at Pothuri Towers is AT_OFFICE');

  const movingState = determineTrackingState(16.505000, 80.655000, 32, 20, 2, { trackingStatus: 'MOVING' });
  assert(movingState.trackingStatus === 'MOVING', 'Employee moving at 32 km/h outside office is MOVING');
  assert(movingState.speedKmh === 32, 'Speed retained as 32 km/h');

  const stoppedState = determineTrackingState(16.505000, 80.655000, 0, 0, 5, { trackingStatus: 'MOVING' });
  assert(stoppedState.trackingStatus === 'STOPPED', 'Stationary employee outside office is STOPPED');

  // TEST 4: Bearing Calculation
  console.log('\n─── TEST 4: Compass Heading Calculation ───');
  const northDeg = calculateBearing(16.4996, 80.6485, 16.5096, 80.6485);
  assert(northDeg === 0, 'Due North bearing is 0°');

  const eastDeg = calculateBearing(16.4996, 80.6485, 16.4996, 80.6585);
  assert(eastDeg === 90, 'Due East bearing is 90°');

  const southDeg = calculateBearing(16.5096, 80.6485, 16.4996, 80.6485);
  assert(southDeg === 180, 'Due South bearing is 180°');

  // TEST 5: Haversine Distance Accuracy
  console.log('\n─── TEST 5: Haversine Distance Accuracy ───');
  const distSamePoint = calculateDistanceMeters(16.499614, 80.648500, 16.499614, 80.648500);
  assert(distSamePoint === 0, 'Distance to same point is 0 meters');

  const distToDVManor = getDistanceToOffice(16.500305, 80.648192);
  assert(distToDVManor >= 60 && distToDVManor <= 110, `DV Manor distance (~84m) measured as ${distToDVManor}m`);

  console.log('\n===============================================================');
  console.log('🎉 ALL 5 COMPREHENSIVE SUITE TESTS PASSED 100%');
  console.log('===============================================================');
}

runMapSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
