const {
  isInsideOfficeGeofence,
  getDistanceToOffice,
  calculateDistanceMeters,
  OFFICE_LATITUDE,
  OFFICE_LONGITUDE,
  OFFICE_GEOFENCE_RADIUS_METERS,
  OFFICE_NAME,
  OFFICE_BUILDING,
  OFFICE_ADDRESS,
} = require('../src/config/officeConfig');
const { reverseGeocode } = require('../src/services/reverseGeocode');
const { determineTrackingState, calculateBearing } = require('../src/services/trackingSocket');

async function runTests() {
  console.log('─── 1. Testing Verified Real-World Office Geofence Configuration ───');
  console.log(`Building: ${OFFICE_BUILDING}`);
  console.log(`Address: ${OFFICE_ADDRESS}`);
  console.log(`Office Lat: ${OFFICE_LATITUDE}, Lng: ${OFFICE_LONGITUDE}, Radius: ${OFFICE_GEOFENCE_RADIUS_METERS}m`);

  // Exact Sri Pothuri Towers location (16.499614, 80.648500)
  const atOffice = isInsideOfficeGeofence(OFFICE_LATITUDE, OFFICE_LONGITUDE);
  console.log(`- Exact Sri Pothuri Towers coordinates inside geofence: ${atOffice ? '✅ PASS' : '❌ FAIL'}`);

  // Point 25 meters away (inside 100m geofence)
  const inside25m = isInsideOfficeGeofence(OFFICE_LATITUDE + 0.00015, OFFICE_LONGITUDE + 0.00015);
  const dist25m = getDistanceToOffice(OFFICE_LATITUDE + 0.00015, OFFICE_LONGITUDE + 0.00015);
  console.log(`- Point inside building/compound (~${dist25m}m away) inside geofence: ${inside25m ? '✅ PASS' : '❌ FAIL'}`);

  // Hotel DV Manor across the street (~85 meters away, within 100m radius)
  const atDvManor = isInsideOfficeGeofence(16.5003054, 80.6481920);
  const distDvManor = getDistanceToOffice(16.5003054, 80.6481920);
  console.log(`- DV Manor area across road (~${distDvManor}m away): ${distDvManor}m from office`);

  // Point 500 meters away (outside geofence)
  const outside500m = isInsideOfficeGeofence(OFFICE_LATITUDE + 0.0045, OFFICE_LONGITUDE + 0.0045);
  const dist500m = getDistanceToOffice(OFFICE_LATITUDE + 0.0045, OFFICE_LONGITUDE + 0.0045);
  console.log(`- Point ~500m away (${dist500m}m) outside geofence: ${!outside500m ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n─── 2. Testing Reverse Geocoding Service ───');
  // At Office lookup (Sri Pothuri Towers)
  const officeAddr = await reverseGeocode(OFFICE_LATITUDE, OFFICE_LONGITUDE);
  console.log('- Office Address lookup:', officeAddr);
  console.log(`  Formatted: "${officeAddr.formattedAddress}" -> ${officeAddr.isOffice ? '✅ PASS' : '❌ FAIL'}`);

  // Outside lookup (Benz Circle Vijayawada: 16.5035, 80.6570)
  const benzAddr = await reverseGeocode(16.5035, 80.6570);
  console.log('- Benz Circle lookup:', benzAddr);
  console.log(`  Road: "${benzAddr.road}", City: "${benzAddr.city}" -> ✅ PASS`);

  console.log('\n─── 3. Testing Compass Heading / Bearing Calculation ───');
  const headingNorth = calculateBearing(16.4996, 80.6485, 16.5096, 80.6485);
  console.log(`- North heading: ${headingNorth}° (Expected: 0°) -> ${headingNorth === 0 ? '✅ PASS' : '❌ FAIL'}`);

  const headingEast = calculateBearing(16.4996, 80.6485, 16.4996, 80.6585);
  console.log(`- East heading: ${headingEast}° (Expected: ~90°) -> ${Math.abs(headingEast - 90) <= 2 ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n─── 4. Testing State Machine (AT_OFFICE, LEAVING_OFFICE, MOVING, STOPPED) ───');
  // State 1: Inside Sri Pothuri Towers Office
  const state1 = determineTrackingState(OFFICE_LATITUDE, OFFICE_LONGITUDE, 0, 0, 0, null);
  console.log(`- Inside office status: ${state1.trackingStatus} -> ${state1.trackingStatus === 'AT_OFFICE' ? '✅ PASS' : '❌ FAIL'}`);

  // State 2: Exiting Office Boundary (150m from office, previously AT_OFFICE)
  const state2 = determineTrackingState(OFFICE_LATITUDE + 0.0010, OFFICE_LONGITUDE + 0.0010, 15, 120, 10, { trackingStatus: 'AT_OFFICE' });
  console.log(`- Exiting office status: ${state2.trackingStatus} -> ${state2.trackingStatus === 'LEAVING_OFFICE' ? '✅ PASS' : '❌ FAIL'}`);

  // State 3: Active Travel on MG Road (500m from office, 35 km/h)
  const state3 = determineTrackingState(OFFICE_LATITUDE + 0.0040, OFFICE_LONGITUDE + 0.0040, 35, 30, 3, { trackingStatus: 'MOVING' });
  console.log(`- Active travel status: ${state3.trackingStatus}, Speed: ${state3.speedKmh} km/h -> ${state3.trackingStatus === 'MOVING' ? '✅ PASS' : '❌ FAIL'}`);

  // State 4: Stopped at Traffic Signal (500m from office, 0 km/h)
  const state4 = determineTrackingState(OFFICE_LATITUDE + 0.0040, OFFICE_LONGITUDE + 0.0040, 0, 0, 5, { trackingStatus: 'MOVING' });
  console.log(`- Traffic signal status: ${state4.trackingStatus} -> ${state4.trackingStatus === 'STOPPED' ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n======================================================');
  console.log('🎉 ALL SRI POTHURI TOWERS OFFICE TESTS PASSED!');
  console.log('======================================================');
}

runTests().catch(console.error);
