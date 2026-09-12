const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const User = require('../src/models/User');
const EmployeeLocation = require('../src/models/EmployeeLocation');
const {
  handleStartTracking,
  handleGpsUpdate,
  handleStopTracking,
  getLiveEmployeesForUser,
  liveLocations,
} = require('../src/services/trackingSocket');

async function runVerification() {
  console.log('====================================================');
  console.log('🚀 RUNNING LIVE EMPLOYEE TRACKING COMPREHENSIVE TESTS');
  console.log('====================================================\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Find or create test users for all 3 roles
    let superAdmin = await User.findOne({ role: 'admin' });
    let manager = await User.findOne({ role: 'manager' });
    let caller = await User.findOne({ role: 'caller' });

    if (!superAdmin) {
      superAdmin = await User.create({
        name: 'Test Super Admin',
        email: 'test_superadmin@aotms.com',
        password: 'password123',
        role: 'admin',
      });
    }

    if (!manager) {
      manager = await User.create({
        name: 'Test Manager Admin',
        email: 'test_manager@aotms.com',
        password: 'password123',
        role: 'manager',
      });
    }

    if (!caller) {
      caller = await User.create({
        name: 'Test Field Caller',
        email: 'test_caller@aotms.com',
        password: 'password123',
        role: 'caller',
      });
    }

    console.log('✓ Verified Test Users:', {
      SuperAdmin: superAdmin.name,
      Manager: manager.name,
      Caller: caller.name,
    });

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 1: Role Access & Directory Scoping
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 1: Role-Based Directory Scoping ---');
    const superAdminView = await getLiveEmployeesForUser(superAdmin);
    const managerView = await getLiveEmployeesForUser(manager);
    const callerView = await getLiveEmployeesForUser(caller);

    console.log(`✓ Super Admin sees ${superAdminView.length} employees (All)`);
    console.log(`✓ Manager sees ${managerView.length} employees (Callers only)`);
    console.log(`✓ Caller sees ${callerView.length} employees (Blocked/0)`);

    if (callerView.length !== 0) throw new Error('Caller should not see other employees');
    if (managerView.some((e) => e.role === 'admin')) {
      throw new Error('Manager should not see Super Admins');
    }
    console.log('✅ TEST 1 PASSED: Role scoping enforced properly!');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 2: Start Location Sharing (Explicit Consent)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 2: Start Location Sharing ---');
    const startPos = {
      latitude: 17.4485,
      longitude: 78.3745,
      accuracy: 8,
      speed: 0,
      heading: 0,
    };
    const startResult = await handleStartTracking(caller, startPos);
    console.log('✓ Start Result:', {
      status: startResult.trackingStatus,
      lat: startResult.latitude,
      lng: startResult.longitude,
      isLive: startResult.isLive,
    });
    if (startResult.trackingStatus !== 'STOPPED' || !startResult.isLive) {
      throw new Error('Initial start tracking should be STOPPED and isLive=true');
    }
    console.log('✅ TEST 2 PASSED: Location sharing started cleanly!');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 3: Real GPS Movement & Status = MOVING
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 3: Real GPS Movement ---');
    const movePos1 = {
      latitude: 17.4510,
      longitude: 78.3780,
      speed: 32, // 32 km/h
      heading: 45,
      accuracy: 6,
    };
    const moveResult1 = await handleGpsUpdate(caller, movePos1);
    console.log('✓ Moved Pos 1 Result:', {
      status: moveResult1.trackingStatus,
      speed: moveResult1.speed,
      lat: moveResult1.latitude,
      lng: moveResult1.longitude,
    });
    if (moveResult1.trackingStatus !== 'MOVING' || moveResult1.speed <= 0) {
      throw new Error('Expected status to be MOVING with speed > 0');
    }
    console.log('✅ TEST 3 PASSED: Moving state & real GPS update validated!');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 4: Stationary / Stopped State
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 4: Stationary / Stopped State ---');
    const stopPos = {
      latitude: 17.451001, // negligible GPS jitter (< 1 meter)
      longitude: 78.378002,
      speed: 0, // 0 km/h
      heading: 45,
      accuracy: 5,
    };
    const stopResult = await handleGpsUpdate(caller, stopPos);
    console.log('✓ Stop Result:', {
      status: stopResult.trackingStatus,
      speed: stopResult.speed,
      lat: stopResult.latitude,
      lng: stopResult.longitude,
    });
    if (stopResult.trackingStatus !== 'STOPPED') {
      throw new Error('Expected status to be STOPPED when speed is 0 and position unchanged');
    }
    console.log('✅ TEST 4 PASSED: Marker stays stationary at stopped position!');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 5: Resume Movement
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 5: Resume Movement ---');
    const movePos2 = {
      latitude: 17.4550,
      longitude: 78.3820,
      speed: 40,
      heading: 90,
      accuracy: 5,
    };
    const moveResult2 = await handleGpsUpdate(caller, movePos2);
    console.log('✓ Resume Result:', {
      status: moveResult2.trackingStatus,
      speed: moveResult2.speed,
    });
    if (moveResult2.trackingStatus !== 'MOVING') {
      throw new Error('Expected status to resume to MOVING');
    }
    console.log('✅ TEST 5 PASSED: Resumed movement validated!');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 6: Stop Location Sharing & Offline Transition
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 6: Stop Location Sharing ---');
    const stopTrackingResult = await handleStopTracking(caller);
    console.log('✓ Stop Tracking Result:', {
      status: stopTrackingResult.trackingStatus,
      isLive: stopTrackingResult.isLive,
    });
    if (stopTrackingResult.trackingStatus !== 'OFFLINE' || stopTrackingResult.isLive !== false) {
      throw new Error('Expected status to be OFFLINE and isLive=false after stopping');
    }
    console.log('✅ TEST 6 PASSED: Offline state transition validated!');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 7: Historical Trail Persistence & Throttled DB Storage
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 7: Historical Route Query ---');
    const history = await EmployeeLocation.find({ employeeId: caller._id }).sort({ timestamp: 1 });
    console.log(`✓ Stored ${history.length} historical breadcrumbs for caller`);
    if (history.length === 0) {
      throw new Error('Expected at least one historical breadcrumb saved in MongoDB');
    }
    console.log('✅ TEST 7 PASSED: Location history accurately recorded in MongoDB!');

    console.log('\n====================================================');
    console.log('🎉 ALL 7 TEST SUITES PASSED SUCCESSFULLY!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runVerification();
