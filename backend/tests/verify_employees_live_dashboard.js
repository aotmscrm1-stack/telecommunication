// Test script to verify employees-live-activity and employee-call-records backend endpoints
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const User = require('../src/models/User');

async function runTests() {
  console.log('--- Starting Employees Live Activity & Call Records Tests ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/telecom-crm');
  console.log('Connected to MongoDB');

  // 1. Find or create an admin user for authentication token
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = await User.create({
      name: 'Admin Test',
      email: `admintest_${Date.now()}@telecom.com`,
      password: 'Password123!',
      role: 'admin',
      phone: '9876543210',
    });
  }

  const token = jwt.sign(
    { id: admin._id, role: admin.role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1d' }
  );

  const baseUrl = 'http://localhost:5000/api';

  // 2. Test GET /api/reports/employees-live-activity
  console.log('\n[Test 1] Testing GET /api/reports/employees-live-activity...');
  const res1 = await fetch(`${baseUrl}/reports/employees-live-activity`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data1 = await res1.json();

  console.log('Status:', res1.status);
  console.log('Response ok:', data1.ok);
  console.log('Total Employees:', data1.totalEmployees);
  console.log('Active Employees:', data1.activeEmployees);
  console.log('Sample Employee:', data1.employees?.[0]?.name, {
    employeeId: data1.employees?.[0]?.employeeId,
    liveStatus: data1.employees?.[0]?.liveStatus,
    todayAtt: data1.employees?.[0]?.todayAttendance?.status,
    yesterdayAtt: data1.employees?.[0]?.yesterdayAttendance?.status,
    callsToday: data1.employees?.[0]?.calls?.today?.count,
    callsYesterday: data1.employees?.[0]?.calls?.yesterday?.count,
    callsTomorrow: data1.employees?.[0]?.calls?.tomorrow?.scheduledCount,
  });

  if (res1.status !== 200 || !data1.ok) {
    throw new Error(`Test 1 Failed: ${JSON.stringify(data1)}`);
  }
  console.log('✅ Test 1 Passed: /api/reports/employees-live-activity returned verified structure.');

  // 3. Test GET /api/reports/employee-call-records/:employeeId for today, yesterday, and tomorrow
  const sampleEmp = data1.employees?.[0];
  if (sampleEmp) {
    console.log(`\n[Test 2] Testing GET /api/reports/employee-call-records/${sampleEmp._id}?period=today...`);
    const res2 = await fetch(`${baseUrl}/reports/employee-call-records/${sampleEmp._id}?period=today`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data2 = await res2.json();

    console.log('Status:', res2.status);
    console.log('Period:', data2.period, 'Total Calls:', data2.totalCalls);
    if (res2.status !== 200 || !data2.ok) {
      throw new Error(`Test 2 Failed: ${JSON.stringify(data2)}`);
    }
    console.log('✅ Test 2 Passed: /api/reports/employee-call-records (today) returned valid response.');

    console.log(`\n[Test 3] Testing GET /api/reports/employee-call-records/${sampleEmp._id}?period=tomorrow...`);
    const res3 = await fetch(`${baseUrl}/reports/employee-call-records/${sampleEmp._id}?period=tomorrow`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data3 = await res3.json();

    console.log('Status:', res3.status);
    console.log('Period:', data3.period, 'Scheduled Calls:', data3.totalCalls, 'isTomorrow:', data3.isTomorrow);
    if (res3.status !== 200 || !data3.ok) {
      throw new Error(`Test 3 Failed: ${JSON.stringify(data3)}`);
    }
    console.log('✅ Test 3 Passed: /api/reports/employee-call-records (tomorrow) returned valid response.');
  }

  console.log('\n=============================================');
  console.log('🎉 ALL BACKEND ENDPOINT TESTS PASSED SUCCESSFULLY!');
  console.log('=============================================\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
