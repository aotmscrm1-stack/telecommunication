require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');
const jwt = require('jsonwebtoken');

const env = require('../src/config/env');
const User = require('../src/database/models/User');

const PORT = 5000;

async function run() {
  await mongoose.connect(env.MONGO_URI);
  const adminUser = await User.findOne({ role: 'admin' }) || await User.findOne({});
  console.log('Using test user:', adminUser?.name, adminUser?._id);

  const adminToken = jwt.sign(
    { id: adminUser._id },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  function makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const headers = {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      };

      const req = http.request(
        {
          hostname: 'localhost',
          port: PORT,
          path,
          method,
          headers
        },
        res => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
            } catch (_) {
              resolve({ statusCode: res.statusCode, raw: data });
            }
          });
        }
      );
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  console.log('====================================================');
  console.log('    TEST: REAL-TIME CALENDAR & CALL DATE FILTER     ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;
  function assert(cond, name) {
    if (cond) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  // 1. Test GET /api/meta-leads/call-dates without campaign (all)
  const res1 = await makeRequest('/api/meta-leads/call-dates');
  assert(res1.statusCode === 200, 'GET /api/meta-leads/call-dates returns HTTP 200');
  assert(res1.body.success === true, 'Response has success: true');
  assert(res1.body.callDates && typeof res1.body.callDates === 'object', 'callDates object present');
  console.log('All campaigns call dates sample:', Object.keys(res1.body.callDates || {}));

  // 2. Test GET /api/meta-leads/call-dates for SAP_Leads
  const res2 = await makeRequest('/api/meta-leads/call-dates?campaign=SAP_Leads');
  assert(res2.statusCode === 200, 'GET /api/meta-leads/call-dates?campaign=SAP_Leads returns HTTP 200');
  assert(res2.body.callDates['2026-10-29'] > 0, 'SAP_Leads has calls on 2026-10-29');
  console.log('SAP_Leads call dates:', res2.body.callDates);

  // 3. Test filtering leads by calledDate
  const res3 = await makeRequest('/api/meta-leads?campaign=SAP_Leads&calledDate=2026-10-29&limit=5');
  assert(res3.statusCode === 200, 'GET /api/meta-leads with calledDate=2026-10-29 returns HTTP 200');
  assert(res3.body.total > 0, `Returned ${res3.body.total} called leads for 2026-10-29`);
  assert(res3.body.leads.length > 0, 'Leads array has items');

  // Verify that returned lead has call notes or lastCallAt
  const lead1 = res3.body.leads[0];
  const hasCallRecord = lead1.lastCallAt || (lead1.callNotes && lead1.callNotes.length > 0);
  assert(hasCallRecord, 'Returned lead verified to contain call session record');

  // 4. Test Digital Marketing_Leads on 2026-10-29
  const res4 = await makeRequest('/api/meta-leads?campaign=' + encodeURIComponent('Digital Marketing_Leads') + '&calledDate=2026-10-29');
  assert(res4.statusCode === 200, 'Digital Marketing_Leads returns HTTP 200 for 2026-10-29');
  assert(res4.body.total === 3, `Digital Marketing_Leads has exactly 3 called leads on 2026-10-29 (found: ${res4.body.total})`);

  // 5. Test Date with NO calls (e.g. 2026-10-01)
  const res5 = await makeRequest('/api/meta-leads?campaign=SAP_Leads&calledDate=2026-10-01');
  assert(res5.statusCode === 200, 'Query for empty date returns HTTP 200');
  assert(res5.body.total === 0, 'Total is 0 for date with no calls');
  assert(res5.body.leads.length === 0, 'Leads array is empty');

  // 6. Test without date filter (returns full campaign leads)
  const res6 = await makeRequest('/api/meta-leads?campaign=SAP_Leads&limit=1');
  assert(res6.body.total > res3.body.total, `All leads (${res6.body.total}) > called on single day (${res3.body.total})`);

  console.log(`\n====================================================`);
  console.log(`TEST FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
