const { handleGpsUpdate, determineTrackingState, calculateBearing, liveLocations } = require('../src/services/trackingSocket');
const { getOfficeConfig, isInsideOfficeGeofence, getDistanceToOffice } = require('../src/config/officeConfig');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ${message}`);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runEndToEndTelemetrySimulationTest() {
  console.log('===============================================================');
  console.log('🛰️ EXECUTING END-TO-END ADMIN MAP TELEMETRY TEST');
  console.log('===============================================================\n');

  // Test User Object (Mock authenticated Test Employee)
  const testUser = {
    _id: 'TEST-EMP-001',
    name: 'Test Employee',
    email: 'test.employee@aotms.com',
    role: 'caller',
    phone: '+91 98765 43210',
    avatar: '',
  };

  // 1. Office Location Verification
  console.log('─── STEP 1: Office Coordinates & Geofence ───');
  const office = getOfficeConfig();
  assert(office.latitude === 16.499614, 'Office latitude matches verified Pothuri Towers (16.499614)');
  assert(office.longitude === 80.648500, 'Office longitude matches verified Pothuri Towers (80.648500)');
  assert(office.radiusMeters === 100, 'Office geofence radius configured to 100m');

  // 2. Telemetry Packet 1: At Office (Stationary, 0 km/h)
  console.log('\n─── STEP 2: Telemetry Packet 1 (At Office: Pothuri Towers) ───');
  const packet1 = await handleGpsUpdate(testUser, {
    latitude: 16.499614,
    longitude: 80.648500,
    speed: 0,
    heading: 0,
    accuracy: 5,
  });
  assert(packet1.employeeId === 'TEST-EMP-001', 'Packet contains correct employeeId TEST-EMP-001');
  assert(packet1.trackingStatus === 'AT_OFFICE', `Packet 1 tracking status is AT_OFFICE (Actual: ${packet1.trackingStatus})`);
  assert(packet1.speed === 0, 'Packet 1 speed is 0 km/h');
  assert(packet1.road === 'MG Road', `Packet 1 road is "${packet1.road}"`);

  // Wait 3 seconds
  await sleep(3000);

  // 3. Telemetry Packet 2: Exiting compound onto MG Road past DV Manor Hotel
  console.log('\n─── STEP 3: Telemetry Packet 2 (Exiting compound onto MG Road) ───');
  const packet2 = await handleGpsUpdate(testUser, {
    latitude: 16.500250,
    longitude: 80.649350,
    speed: 24,
    heading: 52,
    accuracy: 5,
  });
  assert(packet2.trackingStatus === 'LEAVING_OFFICE' || packet2.trackingStatus === 'MOVING', `Packet 2 status is active transit (${packet2.trackingStatus})`);
  assert(packet2.speed === 24, 'Packet 2 speed is 24 km/h');
  assert(packet2.heading === 52, 'Packet 2 heading is 52°');

  // Wait 3 seconds
  await sleep(3000);

  // 4. Telemetry Packet 3: Cruising East along MG Road / Labbipet (36 km/h, 62°)
  console.log('\n─── STEP 4: Telemetry Packet 3 (Cruising East along MG Road) ───');
  const packet3 = await handleGpsUpdate(testUser, {
    latitude: 16.500800,
    longitude: 80.650150,
    speed: 36,
    heading: 62,
    accuracy: 5,
  });
  assert(packet3.trackingStatus === 'MOVING' || packet3.trackingStatus === 'LEAVING_OFFICE', `Packet 3 status is MOVING (${packet3.trackingStatus})`);
  assert(packet3.speed === 36, 'Packet 3 speed is 36 km/h');
  assert(packet3.breadcrumbs.length >= 2, `Packet 3 breadcrumbs recorded (${packet3.breadcrumbs.length} points)`);

  // Wait 3 seconds
  await sleep(3000);

  // 5. Telemetry Packet 4: Stopped at Traffic Signal (0 km/h, 62°)
  console.log('\n─── STEP 5: Telemetry Packet 4 (Stopped at Traffic Signal) ───');
  const packet4 = await handleGpsUpdate(testUser, {
    latitude: 16.500900,
    longitude: 80.650300,
    speed: 0,
    heading: 62,
    accuracy: 5,
  });
  assert(packet4.trackingStatus === 'STOPPED', `Packet 4 status is STOPPED (${packet4.trackingStatus})`);
  assert(packet4.speed === 0, 'Packet 4 speed is 0 km/h');

  // 6. In-Memory Cache Verification (Single Registry Entry, No Duplicates)
  console.log('\n─── STEP 6: Registry & Duplicate Marker Prevention ───');
  assert(liveLocations.has('TEST-EMP-001'), 'TEST-EMP-001 exists in live registry');
  const cachedLoc = liveLocations.get('TEST-EMP-001');
  assert(cachedLoc.latitude === 16.500900 && cachedLoc.longitude === 80.650300, 'Registry contains latest coordinates without duplicate entry');

  // 7. Testing Controlled Invalid GPS Packets Rejection
  console.log('\n─── STEP 7: Testing Controlled Invalid GPS Packets ───');
  const invalidCases = [
    { label: 'Null coordinates', payload: { latitude: null, longitude: null } },
    { label: 'Out-of-bound coordinates (>90, >180)', payload: { latitude: 999, longitude: 999 } },
    { label: 'NaN coordinates', payload: { latitude: NaN, longitude: NaN } },
    { label: 'Zero (0, 0) coordinates', payload: { latitude: 0, longitude: 0 } },
  ];

  for (const tc of invalidCases) {
    let errorCaught = false;
    try {
      await handleGpsUpdate(testUser, tc.payload);
    } catch (err) {
      errorCaught = true;
      assert(err.message === 'Invalid GPS coordinates', `Rejected ${tc.label} with message: "${err.message}"`);
    }
    assert(errorCaught, `Expected rejection for ${tc.label}`);
  }

  console.log('\n===============================================================');
  console.log('🎉 ALL END-TO-END TELEMETRY TESTS PASSED (100% SUCCESS)');
  console.log('===============================================================');
}

runEndToEndTelemetrySimulationTest().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
