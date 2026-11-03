require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const app = require('../src/app/app');
const User = require('../src/database/models/User');
const EmployeeDailyActivitySchedule = require('../src/database/models/EmployeeDailyActivitySchedule');

async function runTests() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB for Daily Activity Schedule Verification...');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function api(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { status: res.status, body };
  }

  try {
    // 1. Fetch test users
    const mdUser = await User.findOne({ email: 'ameen@aotms.in' });
    const hrUser = await User.findOne({ email: 'deenaz@aotms.in' });
    const devUser1 = await User.findOne({ email: 'saadiya@aotms.in' });
    const devUser2 = await User.findOne({ email: 'jayaveer@aotms.in' });

    if (!mdUser || !hrUser || !devUser1 || !devUser2) {
      throw new Error('Required test users not found in DB');
    }

    const secret = process.env.JWT_SECRET;
    const mdToken = jwt.sign({ id: mdUser._id }, secret, { expiresIn: '1h' });
    const hrToken = jwt.sign({ id: hrUser._id }, secret, { expiresIn: '1h' });
    const dev1Token = jwt.sign({ id: devUser1._id }, secret, { expiresIn: '1h' });
    const dev2Token = jwt.sign({ id: devUser2._id }, secret, { expiresIn: '1h' });

    console.log('\n--- TEST 1: HR View All Schedules & Staging ---');
    const hrListRes = await api('/api/daily-activity-schedules', {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    console.log(`HR List Status: ${hrListRes.status} (Expected 200)`);
    console.log(`Configured count: ${hrListRes.body.configuredCount}, Total employees: ${hrListRes.body.totalEmployees}`);
    if (hrListRes.status !== 200 || !hrListRes.body.directory) throw new Error('HR list failed');

    const hrStagingRes = await api('/api/daily-activity-schedules/staging', {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    console.log(`HR Staging Status: ${hrStagingRes.status} (Expected 200)`);
    console.log(`Staged unconfirmed profiles count: ${hrStagingRes.body.staging?.length}`);
    if (hrStagingRes.status !== 200) throw new Error('HR staging failed');

    console.log('\n--- TEST 2: Admin & Manager Full Access ---');
    const mdListRes = await api('/api/daily-activity-schedules', {
      headers: { Authorization: `Bearer ${mdToken}` }
    });
    console.log(`Admin/MD List Status: ${mdListRes.status} (Expected 200)`);
    if (mdListRes.status !== 200) throw new Error('Admin list failed');

    // Admin/MD has full edit access
    const testSchedule = await EmployeeDailyActivitySchedule.findOne({ employee: devUser1._id });
    const mdEditRes = await api(`/api/daily-activity-schedules/${testSchedule._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${mdToken}` },
      body: JSON.stringify({
        workingHours: {
          loginTime: '09:15 AM',
          logoutTime: '06:15 PM',
          note: '09:15 AM Login & Daily Planning; 06:15 PM Logout'
        },
        summary: 'Admin verified schedule'
      })
    });
    console.log(`Admin/MD Edit Status: ${mdEditRes.status} (Expected 200)`);
    if (mdEditRes.status !== 200) throw new Error('Admin/MD should have full edit access');

    console.log('\n--- TEST 3: Employee Read-Only Access To Own Schedule ---');
    const dev1OwnRes = await api('/api/daily-activity-schedules/me', {
      headers: { Authorization: `Bearer ${dev1Token}` }
    });
    console.log(`Employee Own Schedule Status: ${dev1OwnRes.status} (Expected 200)`);
    console.log(`Employee Name in Schedule: ${dev1OwnRes.body.schedule?.employee?.name}`);
    if (dev1OwnRes.status !== 200 || dev1OwnRes.body.schedule?.employee?._id.toString() !== devUser1._id.toString()) {
      throw new Error('Employee should receive only their own schedule');
    }

    console.log('\n--- TEST 4: Horizontal Privilege Escalation Prevention ---');
    // Dev1 attempts to fetch Dev2's schedule
    const dev1AccessDev2Res = await api(`/api/daily-activity-schedules/${devUser2._id}`, {
      headers: { Authorization: `Bearer ${dev1Token}` }
    });
    console.log(`Dev1 Accessing Dev2 Schedule Status: ${dev1AccessDev2Res.status} (Expected 403)`);
    console.log(`Blocked Message: "${dev1AccessDev2Res.body.message}"`);
    if (dev1AccessDev2Res.status !== 403) throw new Error('Employee should NOT be allowed to view other employees\' schedules');

    // Dev1 attempts to create a schedule
    const dev1CreateRes = await api('/api/daily-activity-schedules', {
      method: 'POST',
      headers: { Authorization: `Bearer ${dev1Token}` },
      body: JSON.stringify({ employee: devUser1._id })
    });
    console.log(`Dev1 Create Attempt Status: ${dev1CreateRes.status} (Expected 403)`);
    if (dev1CreateRes.status !== 403) throw new Error('Employee should NOT be allowed to create schedules');

    // Dev1 attempts to access HR staging
    const dev1StagingRes = await api('/api/daily-activity-schedules/staging', {
      headers: { Authorization: `Bearer ${dev1Token}` }
    });
    console.log(`Dev1 Staging Access Status: ${dev1StagingRes.status} (Expected 403)`);
    if (dev1StagingRes.status !== 403) throw new Error('Employee should NOT be allowed to view staging queue');

    console.log('\n--- TEST 5: HR Update With Audit Diff Tracking ---');
    const originalLoginTime = testSchedule.workingHours?.loginTime || '09:15 AM';
    const updatedLoginTime = originalLoginTime === '09:15 AM' ? '09:30 AM' : '09:15 AM';

    const hrUpdateRes = await api(`/api/daily-activity-schedules/${testSchedule._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({
        workingHours: {
          loginTime: updatedLoginTime,
          logoutTime: testSchedule.workingHours?.logoutTime || '06:15 PM',
          note: testSchedule.workingHours?.note || ''
        },
        summary: 'HR updated login time for testing'
      })
    });

    console.log(`HR Update Status: ${hrUpdateRes.status} (Expected 200)`);
    console.log(`Modified fields count: ${hrUpdateRes.body.modifiedFieldsCount}`);
    
    // Check audit history on the updated schedule
    const updatedScheduleInDb = await EmployeeDailyActivitySchedule.findById(testSchedule._id);
    const lastAudit = updatedScheduleInDb.auditHistory[updatedScheduleInDb.auditHistory.length - 1];
    console.log(`Audit Action Recorded: "${lastAudit?.action}"`);
    console.log(`Audit Summary: "${lastAudit?.summary}"`);
    console.log(`Audit Diff:`, lastAudit?.fieldChanges);

    if (hrUpdateRes.status !== 200 || !lastAudit || lastAudit.fieldChanges.length === 0) {
      throw new Error('Audit history diff was not recorded properly');
    }

    console.log('\n--- TEST 6: HR Soft Archiving & Restoring ---');
    const archiveRes = await api(`/api/daily-activity-schedules/${testSchedule._id}/archive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    console.log(`Archive Status: ${archiveRes.status} (Expected 200)`);
    console.log(`Publish Status After Archive: "${archiveRes.body.schedule?.publishStatus}"`);
    if (archiveRes.body.schedule?.publishStatus !== 'archived') throw new Error('Archive failed');

    const restoreRes = await api(`/api/daily-activity-schedules/${testSchedule._id}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    console.log(`Restore Status: ${restoreRes.status} (Expected 200)`);
    console.log(`Publish Status After Restore: "${restoreRes.body.schedule?.publishStatus}"`);
    if (restoreRes.body.schedule?.publishStatus !== 'published') throw new Error('Restore failed');

    console.log('\n======================================================');
    console.log('✅ ALL DAILY ACTIVITY SCHEDULE TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().then(() => process.exit(0)).catch(err => {
  console.error('\n❌ TEST FAILURE:', err);
  process.exit(1);
});
