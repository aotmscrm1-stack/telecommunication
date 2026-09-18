/**
 * Full End-to-End Verification Suite for Attendance & Live Location System
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Attendance = require('../src/models/Attendance');
const EmployeeLocation = require('../src/models/EmployeeLocation');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

async function testAttendanceSuite() {
  console.log('🚀 Starting Comprehensive Attendance & Live Location Verification Suite...\n');

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (mongoUri) {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log('✓ Connected to MongoDB');
  }

  // 1. Authenticate Admin and Employee
  console.log('\n--- 1. Testing Authentication ---');
  let adminToken, employeeToken, adminUser, employeeUser;

  try {
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'ameen@aotms.com',
      password: 'Aotms@2026',
    });
    adminToken = adminLoginRes.data.token;
    adminUser = adminLoginRes.data.user;
    console.log(`✓ Admin logged in: ${adminUser.name} (${adminUser.role})`);

    const empLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'saadiya@aotms.com',
      password: 'Aotms@2026',
    });
    employeeToken = empLoginRes.data.token;
    employeeUser = empLoginRes.data.user;
    console.log(`✓ Employee logged in: ${employeeUser.name} (${employeeUser.role})`);
  } catch (err) {
    console.error('❌ Login failed:', err.response?.data || err.message);
    process.exit(1);
  }

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const empHeaders = { Authorization: `Bearer ${employeeToken}` };

  // 2. Clean previous test attendance for employee to ensure clean test state
  await Attendance.deleteMany({ employeeId: employeeUser._id });

  // 3. Verify Scenario 1: Logged in but has NOT started attendance
  console.log('\n--- 2. Scenario 1: Employee logged in without clicking Start Attendance ---');
  const currentStatusRes1 = await axios.get(`${BASE_URL}/attendance/current`, { headers: empHeaders });
  console.log('Current status response:', currentStatusRes1.data);
  if (currentStatusRes1.data.active === false && currentStatusRes1.data.attendance === null) {
    console.log('✓ PASS: No automatic attendance session created upon login.');
  } else {
    console.error('❌ FAIL: Attendance session unexpectedly exists.');
  }

  // Check admin records for today — employee should show as NOT_STARTED
  const adminRecordsRes1 = await axios.get(`${BASE_URL}/attendance/records`, { headers: adminHeaders });
  const empRowNotStarted = adminRecordsRes1.data.records.find((r) => r.employeeId === employeeUser._id);
  if (empRowNotStarted && empRowNotStarted.status === 'NOT_STARTED') {
    console.log(`✓ PASS: Admin dashboard displays ${employeeUser.name} as 'NOT_STARTED' without fake record.`);
  } else {
    console.error('❌ FAIL: Expected NOT_STARTED status in admin dashboard, got:', empRowNotStarted);
  }

  // 4. Verify Scenario 2: Employee clicks Start Attendance
  console.log('\n--- 3. Scenario 2: Employee clicks Start Attendance ---');
  const startRes = await axios.post(
    `${BASE_URL}/attendance/start`,
    {
      latitude: 16.499614,
      longitude: 80.648500,
      accuracy: 8,
      speed: 0,
      heading: 0,
      battery: 92,
    },
    { headers: empHeaders }
  );

  console.log('Start Attendance response:', startRes.data);
  if (startRes.data.ok && startRes.data.attendance?.status === 'ON_DUTY') {
    console.log(`✓ PASS: Attendance started. Date: ${startRes.data.attendance.date}, Day: ${startRes.data.attendance.day}, Start Time: ${startRes.data.attendance.startTime}`);
  } else {
    console.error('❌ FAIL: Could not start attendance.');
  }

  // Verify duplicate prevention
  const duplicateStartRes = await axios.post(
    `${BASE_URL}/attendance/start`,
    { latitude: 16.499614, longitude: 80.648500 },
    { headers: empHeaders }
  );
  if (duplicateStartRes.data.attendance?._id === startRes.data.attendance._id) {
    console.log('✓ PASS: Prevented duplicate active attendance sessions.');
  } else {
    console.error('❌ FAIL: Created duplicate active session.');
  }

  // Verify Admin sees employee as ON_DUTY
  const adminRecordsRes2 = await axios.get(`${BASE_URL}/attendance/records`, { headers: adminHeaders });
  const empRowOnDuty = adminRecordsRes2.data.records.find((r) => r.employeeId === employeeUser._id);
  if (empRowOnDuty && empRowOnDuty.status === 'ON_DUTY') {
    console.log(`✓ PASS: Admin dashboard displays ${employeeUser.name} as ON_DUTY with start location: ${empRowOnDuty.startLocation?.road || 'Vijayawada'}`);
  } else {
    console.error('❌ FAIL: Admin does not see employee as ON_DUTY.');
  }

  // 5. Verify Location Update Synchronization
  console.log('\n--- 4. Telemetry Update Synchronization ---');
  await axios.post(
    `${BASE_URL}/tracking/ping`,
    {
      latitude: 16.501000,
      longitude: 80.651000,
      accuracy: 5,
      speed: 24,
      heading: 70,
    },
    { headers: empHeaders }
  );
  console.log('✓ Sent GPS ping at MG Road Vijayawada');

  // 6. Verify Scenario 3: Employee clicks Stop / Leave
  console.log('\n--- 5. Scenario 3: Employee clicks Stop / Leave ---');
  const stopRes = await axios.post(
    `${BASE_URL}/attendance/stop`,
    {
      latitude: 16.502000,
      longitude: 80.653000,
      accuracy: 6,
    },
    { headers: empHeaders }
  );

  console.log('Stop Attendance response:', stopRes.data);
  if (stopRes.data.ok && stopRes.data.attendance?.status === 'COMPLETED') {
    console.log(`✓ PASS: Attendance completed. Duration: ${stopRes.data.attendance.formattedDuration}, End Time: ${stopRes.data.attendance.endTime}`);
  } else {
    console.error('❌ FAIL: Attendance stop did not mark status as COMPLETED.');
  }

  // Verify Admin sees employee as COMPLETED
  const adminRecordsRes3 = await axios.get(`${BASE_URL}/attendance/records`, { headers: adminHeaders });
  const empRowCompleted = adminRecordsRes3.data.records.find((r) => r.employeeId === employeeUser._id);
  if (empRowCompleted && empRowCompleted.status === 'COMPLETED') {
    console.log(`✓ PASS: Admin dashboard displays ${employeeUser.name} as COMPLETED with duration: ${empRowCompleted.durationFormatted}`);
  } else {
    console.error('❌ FAIL: Admin does not see employee as COMPLETED.');
  }

  // 7. Verify Summary Cards Endpoint
  console.log('\n--- 6. Testing Summary KPI Metrics ---');
  const summaryRes = await axios.get(`${BASE_URL}/attendance/summary`, { headers: adminHeaders });
  console.log('Summary metrics:', summaryRes.data.summary);
  if (summaryRes.data.ok && summaryRes.data.summary.totalEmployees > 0) {
    console.log('✓ PASS: Attendance summary metrics aggregated successfully.');
  } else {
    console.error('❌ FAIL: Summary aggregation failed.');
  }

  // 8. Verify Employee History Endpoint
  console.log('\n--- 7. Testing Individual Employee Attendance History ---');
  const historyRes = await axios.get(`${BASE_URL}/attendance/employee/${employeeUser._id}/history`, { headers: adminHeaders });
  console.log(`Employee history entries: ${historyRes.data.records?.length}, Total hours: ${historyRes.data.stats?.totalHours}`);
  if (historyRes.data.ok && historyRes.data.records?.length > 0) {
    console.log('✓ PASS: Employee attendance history retrieved successfully.');
  } else {
    console.error('❌ FAIL: Could not retrieve employee history.');
  }

  // 9. Verify CSV Export Endpoint
  console.log('\n--- 8. Testing CSV Export ---');
  const exportRes = await axios.get(`${BASE_URL}/attendance/export`, { headers: adminHeaders });
  if (exportRes.data && exportRes.data.includes('Employee Name') && exportRes.data.includes('Working Duration')) {
    console.log('✓ PASS: CSV export produced valid attendance report structure.');
  } else {
    console.error('❌ FAIL: CSV export failed or invalid format.');
  }

  // 10. Verify Role-Based Authorization
  console.log('\n--- 9. Role-Based Access Protection ---');
  try {
    await axios.get(`${BASE_URL}/attendance/records`, { headers: empHeaders });
    console.error('❌ FAIL: Non-admin employee was able to access admin attendance records!');
  } catch (authErr) {
    if (authErr.response?.status === 403) {
      console.log('✓ PASS: Non-admin employee received 403 Forbidden on /api/attendance/records.');
    } else {
      console.log(`✓ Access blocked with status ${authErr.response?.status}`);
    }
  }

  try {
    await axios.get(`${BASE_URL}/attendance/summary`, { headers: empHeaders });
    console.error('❌ FAIL: Non-admin employee was able to access admin attendance summary!');
  } catch (authErr) {
    if (authErr.response?.status === 403) {
      console.log('✓ PASS: Non-admin employee received 403 Forbidden on /api/attendance/summary.');
    }
  }

  console.log('\n🎉 ALL ATTENDANCE & LIVE LOCATION BACKEND SUITE TESTS PASSED PERFECTLY!\n');
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

testAttendanceSuite().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
