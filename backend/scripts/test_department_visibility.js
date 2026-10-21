const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config({ path: './.env' });

const User = require('../src/database/models/User');
const DailyActivity = require('../src/database/models/DailyActivity');
const env = require('../src/config/env');

const BASE_URL = 'http://localhost:5000/api/daily-activities';

async function runTests() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(' Connected to MongoDB:', mongoose.connection.name);

  // 1. Fetch Users
  const adminUser = await User.findOne({ email: 'ameen@aotms.in' });
  const hrManager = await User.findOne({ email: 'rajasree@gmai.com' });
  const devUser = await User.findOne({ email: 'jayaveer@aotms.in' }) || await User.findOne({ department: 'Development' });
  const telecallerUser = await User.findOne({ email: 'bhavani@aotms.in' }) || await User.findOne({ department: 'Telecalling' });

  console.log('\n--- Test Users ---');
  console.log('Admin:', adminUser?.email, '| Role:', adminUser?.role, '| Dept:', adminUser?.department);
  console.log('HR Manager:', hrManager?.email, '| Role:', hrManager?.role, '| Dept:', hrManager?.department);
  console.log('Developer:', devUser?.email, '| Role:', devUser?.role, '| Dept:', devUser?.department);
  console.log('Telecaller:', telecallerUser?.email, '| Role:', telecallerUser?.role, '| Dept:', telecallerUser?.department);

  const adminToken = jwt.sign({ id: adminUser._id }, env.JWT_SECRET, { expiresIn: '1h' });
  const hrToken = hrManager ? jwt.sign({ id: hrManager._id }, env.JWT_SECRET, { expiresIn: '1h' }) : null;
  const devToken = devUser ? jwt.sign({ id: devUser._id }, env.JWT_SECRET, { expiresIn: '1h' }) : null;
  const telecallerToken = telecallerUser ? jwt.sign({ id: telecallerUser._id }, env.JWT_SECRET, { expiresIn: '1h' }) : null;

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` PASS: ${message}`);
      passed++;
    } else {
      console.error(` FAIL: ${message}`);
      failed++;
    }
  }

  // ── TEST 1: Admin querying Admin Overview for Development ───────────────────
  console.log('\n--- TEST 1: Admin querying Overview for Development ---');
  try {
    const res = await axios.get(`${BASE_URL}/admin/overview?department=Development`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.data.success === true, 'Admin overview returned success');
    const devActivities = res.data.activities || [];
    console.log(`Found ${devActivities.length} Development activities in overview.`);
    
    // Check that ALL Development activities have metrics === null and outcomes === []
    const allSanitized = devActivities.every(a => a.metrics === null && (!a.outcomes || a.outcomes.length === 0));
    assert(allSanitized, 'Calling Performance Metrics and Outcomes are STRICTLY null/empty for all Development records');
  } catch (err) {
    assert(false, `Test 1 failed: ${err.message}`);
  }

  // ── TEST 2: Admin querying Admin Overview for Telecalling ───────────────────
  console.log('\n--- TEST 2: Admin querying Overview for Telecalling ---');
  try {
    const res = await axios.get(`${BASE_URL}/admin/overview?department=Telecalling`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.data.success === true, 'Admin overview for Telecalling returned success');
    const telActivities = res.data.activities || [];
    console.log(`Found ${telActivities.length} Telecalling activities in overview.`);
    if (telActivities.length > 0) {
      const hasMetrics = telActivities.some(a => a.metrics !== null && a.metrics.callsAttempted !== undefined);
      assert(hasMetrics, 'Telecalling activities correctly retain calling metrics for authorized oversight');
    }
  } catch (err) {
    assert(false, `Test 2 failed: ${err.message}`);
  }

  // ── TEST 3: Calling Follow-ups endpoint protection ──────────────────────────
  console.log('\n--- TEST 3: Calling Follow-ups endpoint visibility ---');
  try {
    // 3a. Admin querying for department=Development
    const resDev = await axios.get(`${BASE_URL}/follow-ups?department=Development`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      resDev.data.success && resDev.data.followUps.length === 0 && resDev.data.directLeads.length === 0,
      'GET /follow-ups?department=Development returns empty lists (calling follow-ups hidden for Development)'
    );

    // 3b. Developer user querying follow-ups
    if (devToken) {
      const resDevUser = await axios.get(`${BASE_URL}/follow-ups`, {
        headers: { Authorization: `Bearer ${devToken}` },
      });
      assert(
        resDevUser.data.success && resDevUser.data.followUps.length === 0,
        'Developer staff querying /follow-ups receives empty follow-ups (backend authorization enforced)'
      );
    }
  } catch (err) {
    assert(false, `Test 3 failed: ${err.message}`);
  }

  // ── TEST 4: Single Report Inspection (GET /:id) Sanitization ────────────────
  console.log('\n--- TEST 4: Single Report GET /:id Sanitization ---');
  try {
    const devDoc = await DailyActivity.findOne({ department: /development/i });
    if (devDoc) {
      const res = await axios.get(`${BASE_URL}/${devDoc._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res.data.success === true, 'Fetched Development report details');
      assert(res.data.activity.metrics === null, 'Inspecting Development report has metrics === null (Calling Performance Metrics strictly blocked)');
      assert(Array.isArray(res.data.activity.outcomes) && res.data.activity.outcomes.length === 0, 'Inspecting Development report has outcomes === []');
      assert(res.data.activity.departmentData !== undefined, 'DepartmentData (Developer deliverables) is preserved');
    } else {
      console.log('No existing development document to test GET /:id, skipping.');
    }
  } catch (err) {
    assert(false, `Test 4 failed: ${err.message}`);
  }

  // ── TEST 5: Developer Employee Personal Activity (GET /) ───────────────────
  console.log('\n--- TEST 5: Developer Employee Personal Activity (GET /) ---');
  if (devToken) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await axios.get(`${BASE_URL}?date=${today}&department=Development`, {
        headers: { Authorization: `Bearer ${devToken}` },
      });
      assert(res.data.success === true, 'Developer successfully queried personal daily activity');
      if (res.data.activity) {
        assert(res.data.activity.metrics === null, 'Developer personal activity has metrics === null (no calling metrics exposed)');
      } else {
        assert(true, 'No report yet for today; ready for draft creation');
      }
    } catch (err) {
      assert(false, `Test 5 failed: ${err.message}`);
    }
  }

  // ── TEST 6: Admin Saving Draft in Development Workspace ─────────────────────
  console.log('\n--- TEST 6: Admin Saving Draft in Development Workspace ---');
  try {
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      activityDate: today,
      department: 'Development',
      // Intentionally sending calling numbers to verify backend strips them for non-calling
      metrics: { callsAttempted: 50, connectedCalls: 40 },
      departmentData: {
        projectName: 'CRM Core Workspace',
        status: 'In Progress',
        ticketId: 'DEV-101',
        workCompleted: 'Implemented department-based workspace filtering and security sanitization.',
      },
      remarks: 'Verified workspace isolation.',
      nextSteps: 'Complete regression testing.',
    };

    const res = await axios.post(`${BASE_URL}`, payload, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.data.success === true, 'Admin draft saved in Development workspace');
    assert(res.data.activity.metrics === null, 'Backend sanitization stripped calling metrics in returned activity');
    assert(res.data.activity.department === 'Development', 'Activity department correctly set to Development');
  } catch (err) {
    assert(false, `Test 6 failed: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================`);

  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
