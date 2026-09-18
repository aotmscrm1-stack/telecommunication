const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Attendance = require('../src/models/Attendance');

const JWT_SECRET = process.env.JWT_SECRET || 'aotms-telecom-crm-jwt-secret-key-2025';
const BASE_URL = 'http://localhost:5000/api';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('===============================================================');
  console.log('🚀 AOTMS Attendance & Multiple Breaks Full Verification Suite');
  console.log('===============================================================\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/telecommunication');
    console.log('✅ Connected to MongoDB successfully.');

    // 1. Setup / Find Test Users (Admin & Employee)
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.create({
        name: 'Admin Test User',
        email: 'admin_test_auto@aotms.com',
        password: 'Password@123',
        role: 'admin',
        isActive: true,
      });
    }

    let employee = await User.findOne({ role: { $in: ['employee', 'caller', 'agent'] } });
    if (!employee) {
      employee = await User.create({
        name: 'Employee Break Tester',
        email: 'emp_breaks_test@aotms.com',
        password: 'Password@123',
        role: 'employee',
        employeeId: 'EMP-BRK-001',
        isActive: true,
      });
    }

    const adminToken = jwt.sign({ id: admin._id, role: admin.role }, JWT_SECRET, { expiresIn: '1h' });
    const empToken = jwt.sign({ id: employee._id, role: employee.role }, JWT_SECRET, { expiresIn: '1h' });

    // Clean up any stale active sessions for this employee
    await Attendance.deleteMany({ employeeId: employee._id });

    // ── Test 1: Check initial status before starting attendance ───────────────
    console.log('\n--- [Test 1] Initial Status (Off Duty) ---');
    const curRes1 = await fetch(`${BASE_URL}/attendance/current`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const curData1 = await curRes1.json();
    console.log('Status before starting:', curData1.status, '| Active:', curData1.active);
    if (curData1.active === false && curData1.status === 'NOT_STARTED') {
      console.log('✅ Test 1 PASSED: Employee has NOT started attendance.');
    } else {
      throw new Error(`Test 1 FAILED: Expected NOT_STARTED but got ${curData1.status}`);
    }

    // ── Test 2: Start Attendance ──────────────────────────────────────────────
    console.log('\n--- [Test 2] Start Attendance (On Duty) ---');
    const startRes = await fetch(`${BASE_URL}/attendance/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        latitude: 16.499614,
        longitude: 80.648500,
        accuracy: 5,
        speed: 0,
      }),
    });
    const startData = await startRes.json();
    console.log('Start response status:', startRes.status, '| Message:', startData.message);
    if (startData.ok && startData.attendance?.status === 'ON_DUTY') {
      console.log('✅ Test 2 PASSED: Attendance started. Status is ON_DUTY.');
      console.log('   StartTime:', startData.attendance.startTime, '| Employee:', startData.attendance.employeeName);
    } else {
      throw new Error('Test 2 FAILED: Start attendance failed');
    }

    await sleep(2000); // 2 seconds work elapsed

    // ── Test 3: Take Break 1 ──────────────────────────────────────────────────
    console.log('\n--- [Test 3] Take Break 1 (On Break) ---');
    const break1Res = await fetch(`${BASE_URL}/attendance/break/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({ notes: 'Tea break' }),
    });
    const break1Data = await break1Res.json();
    console.log('Break 1 status:', break1Data.attendance?.status, '| Breaks count:', break1Data.attendance?.breaks?.length);
    if (break1Data.ok && break1Data.attendance?.status === 'ON_BREAK' && break1Data.activeBreak?.breakNumber === 1) {
      console.log('✅ Test 3 PASSED: Break 1 started. Status is ON_BREAK.');
    } else {
      throw new Error('Test 3 FAILED: Break 1 start failed');
    }

    await sleep(2000); // 2 seconds break duration

    // ── Test 4: Resume Work after Break 1 ─────────────────────────────────────
    console.log('\n--- [Test 4] Resume Work after Break 1 ---');
    const resume1Res = await fetch(`${BASE_URL}/attendance/break/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
    });
    const resume1Data = await resume1Res.json();
    console.log('Resume 1 status:', resume1Data.attendance?.status, '| Total break sec:', resume1Data.attendance?.totalBreakSeconds);
    const b1 = resume1Data.attendance?.breaks?.[0];
    if (resume1Data.ok && resume1Data.attendance?.status === 'ON_DUTY' && b1?.status === 'COMPLETED' && b1?.durationSeconds >= 1) {
      console.log(`✅ Test 4 PASSED: Work resumed. Break 1 duration: ${b1.durationSeconds}s (${b1.formattedDuration}).`);
    } else {
      throw new Error('Test 4 FAILED: Resume work after Break 1 failed');
    }

    await sleep(2000); // 2 seconds work elapsed

    // ── Test 5: Take Break 2 & Resume ─────────────────────────────────────────
    console.log('\n--- [Test 5] Take Break 2 & Resume (Lunch Break) ---');
    await fetch(`${BASE_URL}/attendance/break/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${empToken}` },
      body: JSON.stringify({ notes: 'Lunch break' }),
    });
    await sleep(2000);
    const resume2Res = await fetch(`${BASE_URL}/attendance/break/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${empToken}` },
    });
    const resume2Data = await resume2Res.json();
    console.log('Breaks after Break 2:', resume2Data.attendance?.breaks?.length, '| Total Break Secs:', resume2Data.attendance?.totalBreakSeconds);
    if (resume2Data.attendance?.breaks?.length === 2 && resume2Data.attendance?.breaks[1].status === 'COMPLETED') {
      console.log('✅ Test 5 PASSED: Break 2 recorded and completed.');
    } else {
      throw new Error('Test 5 FAILED: Break 2 lifecycle failed');
    }

    // ── Test 6: Take Break 3 and STOP ATTENDANCE WHILE ON BREAK ───────────────
    console.log('\n--- [Test 6] Take Break 3 & Stop Attendance While On Break ---');
    await fetch(`${BASE_URL}/attendance/break/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${empToken}` },
      body: JSON.stringify({ notes: 'Evening snack & Leave' }),
    });
    await sleep(2000);

    const stopRes = await fetch(`${BASE_URL}/attendance/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        latitude: 16.500200,
        longitude: 80.650000,
      }),
    });
    const stopData = await stopRes.json();
    console.log('Stop while on break status:', stopData.attendance?.status);
    console.log('Total Attendance Duration:', stopData.attendance?.formattedDuration);
    console.log('Total Breaks Count:', stopData.attendance?.breakCount);
    console.log('Total Break Duration:', stopData.attendance?.formattedBreakDuration);
    console.log('Actual Working Duration:', stopData.attendance?.formattedActualWork);

    const b3 = stopData.attendance?.breaks?.[2];
    if (
      stopData.ok &&
      stopData.attendance?.status === 'COMPLETED' &&
      stopData.attendance?.breakCount === 3 &&
      b3?.status === 'COMPLETED' &&
      b3?.endTime != null
    ) {
      console.log('✅ Test 6 PASSED: Active Break 3 was automatically closed on Stop. Final actual working time calculated.');
    } else {
      throw new Error('Test 6 FAILED: Stop attendance while on break failed');
    }

    // ── Test 7: Admin Attendance Records API Verification ────────────────────
    console.log('\n--- [Test 7] Admin Attendance Records API ---');
    const recordsRes = await fetch(`${BASE_URL}/attendance/records`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const recordsData = await recordsRes.json();
    console.log('Admin records retrieved count:', recordsData.records?.length);
    const empRec = recordsData.records?.find((r) => r.employeeId === employee._id.toString());

    if (empRec && empRec.breakCount === 3 && empRec.breaks?.length === 3 && empRec.status === 'COMPLETED') {
      console.log('✅ Test 7 PASSED: Admin records endpoint returns complete break details and working metrics:');
      console.log('   - Break Count:', empRec.breakCount);
      console.log('   - Total Break Duration:', empRec.formattedBreakDuration);
      console.log('   - Actual Work Hours:', empRec.formattedActualWork);
    } else {
      throw new Error('Test 7 FAILED: Admin attendance records endpoint missing break data');
    }

    // ── Test 8: Admin Attendance Summary KPI Metrics ─────────────────────────
    console.log('\n--- [Test 8] Admin Summary KPI Metrics ---');
    const summaryRes = await fetch(`${BASE_URL}/attendance/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const summaryData = await summaryRes.json();
    console.log('Summary metrics:', summaryData.summary);
    if (
      summaryData.ok &&
      summaryData.summary?.totalEmployees >= 1 &&
      summaryData.summary?.presentToday >= 1 &&
      summaryData.summary?.completedAttendance >= 1 &&
      summaryData.summary?.totalBreakTimeToday != null
    ) {
      console.log('✅ Test 8 PASSED: Admin summary includes totalBreakTimeToday & break counters.');
    } else {
      throw new Error('Test 8 FAILED: Admin summary metrics invalid');
    }

    // ── Test 9: Employee History API ──────────────────────────────────────────
    console.log('\n--- [Test 9] Employee History API with Break Totals ---');
    const histRes = await fetch(`${BASE_URL}/attendance/employee/${employee._id}/history`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const histData = await histRes.json();
    console.log('Employee stats:', histData.stats);
    if (histData.ok && histData.stats?.totalBreakHours && histData.records?.length >= 1) {
      console.log('✅ Test 9 PASSED: Employee history returns totalBreakHours and formatted records.');
    } else {
      throw new Error('Test 9 FAILED: Employee history API error');
    }

    // ── Test 10: Authorization Security Test ──────────────────────────────────
    console.log('\n--- [Test 10] Security & Role Protection ---');
    const unauthRecordsRes = await fetch(`${BASE_URL}/attendance/records`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    console.log('Non-admin access status:', unauthRecordsRes.status);
    if (unauthRecordsRes.status === 403) {
      console.log('✅ Test 10 PASSED: Employee cannot access admin-only records (HTTP 403 Forbidden).');
    } else {
      throw new Error(`Test 10 FAILED: Expected 403 Forbidden but got ${unauthRecordsRes.status}`);
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL 10 VERIFICATION TESTS PASSED PERFECTLY!');
    console.log('===============================================================\n');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
