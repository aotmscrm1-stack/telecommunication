/**
 * test_meta_leads_suite.js
 * Comprehensive test verification for Meta Leads Deduplication & Concurrency Lock
 * Strictly adheres to tests specified in frontend/data.md
 */

require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');

const MetaLead = require('../src/database/models/MetaLead');
const MetaSyncState = require('../src/database/models/MetaSyncState');

const PORT = 5000;

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ statusCode: res.statusCode, headers: res.headers, body: json });
        } catch (_) {
          resolve({ statusCode: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('    META LEADS DEDUPLICATION & SYNC TEST SUITE      ');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB');

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

  const testCampaign = `Test_Campaign_${Date.now()}`;
  const lead1Id = `l:test_${Date.now()}_001`;
  const lead2Id = `l:test_${Date.now()}_002`;

  try {
    // -------------------------------------------------------------
    // Test 1: Ingest First Lead
    // -------------------------------------------------------------
    console.log('\n--- Test 1: First sync imports valid new leads ---');
    const lead1Payload = {
      campaign: testCampaign,
      source: 'google_sheets_meta',
      rawData: {
        id: lead1Id,
        full_name: 'Rahul Sharma',
        phone_number: 'p:+919876543210',
        email: 'rahul.test@example.com',
        city: 'Hyderabad'
      }
    };

    const res1 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/meta-leads',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, lead1Payload);

    assert(res1.statusCode === 201, 'POST /api/meta-leads returns HTTP 201');
    assert(res1.body.insertedCount === 1, 'First lead insertedCount === 1');
    assert(res1.body.updatedCount === 0, 'First lead updatedCount === 0');

    const lead1InDb = await MetaLead.findOne({ campaign: testCampaign, metaLeadId: lead1Id });
    assert(!!lead1InDb, 'Lead 1 persisted in MongoDB with metaLeadId');
    assert(lead1InDb.status === 'New', 'Lead 1 status is "New"');

    // -------------------------------------------------------------
    // Test 2: Repeat Sync with Identical Payload creates ZERO duplicates
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Repeat sync creates ZERO additional duplicates ---');
    const initialCount = await MetaLead.countDocuments({ campaign: testCampaign });

    const res2 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/meta-leads',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, lead1Payload);

    assert(res2.statusCode === 201, 'Repeat POST /api/meta-leads returns HTTP 201');
    assert(res2.body.insertedCount === 0, 'Repeat sync insertedCount === 0 (no duplicate created!)');
    assert(res2.body.updatedCount === 1, 'Repeat sync updatedCount === 1 (updated existing record)');

    const countAfterRepeat = await MetaLead.countDocuments({ campaign: testCampaign });
    assert(countAfterRepeat === initialCount, `Total documents in campaign unchanged (${countAfterRepeat} === ${initialCount})`);

    // -------------------------------------------------------------
    // Test 3: Existing CRM Fields (status, notes, crmLeadId) are Preserved
    // -------------------------------------------------------------
    console.log('\n--- Test 3: CRM-managed fields preserved during sync ---');
    // User changes status in CRM to 'Contacted'
    await MetaLead.findByIdAndUpdate(lead1InDb._id, { status: 'Contacted', notes: 'Interested in Python course' });

    // Sync runs again from Google Sheets
    await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/meta-leads',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, lead1Payload);

    const docAfterSync = await MetaLead.findById(lead1InDb._id);
    assert(docAfterSync.status === 'Contacted', 'Status remained "Contacted" (not overwritten to "New")');
    assert(docAfterSync.notes === 'Interested in Python course', 'CRM notes preserved');

    // -------------------------------------------------------------
    // Test 4: Mangled Headers from Google Sheets are properly extracted
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Mangled Google Sheets format deduplication ---');
    const mangledPayload = {
      campaign: testCampaign,
      source: 'google_sheets_meta',
      rawData: {
        'l:1112700817794449': lead2Id,
        'Bhavani': 'Suresh Kumar',
        'p:+919550160911': 'p:+919123456789',
        'Gudivada': 'Vijayawada'
      }
    };

    // First ingest of mangled lead
    const resMangled1 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/meta-leads',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, mangledPayload);

    assert(resMangled1.body.insertedCount === 1, 'Mangled lead first ingest insertedCount === 1');

    // Second ingest of same mangled lead
    const resMangled2 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/meta-leads',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, mangledPayload);

    assert(resMangled2.body.insertedCount === 0, 'Mangled lead repeat ingest insertedCount === 0');
    assert(resMangled2.body.updatedCount === 1, 'Mangled lead repeat ingest updatedCount === 1');

    // -------------------------------------------------------------
    // Test 5: Empty Spreadsheet Rows are Skipped
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Empty rows and accidental header rows skipped ---');
    const emptyRowPayload = {
      campaign: testCampaign,
      source: 'google_sheets_meta',
      rawData: {
        id: '',
        full_name: '',
        phone_number: '',
        email: '',
        city: ''
      }
    };

    const resEmpty = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/meta-leads',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, emptyRowPayload);

    assert(resEmpty.body.insertedCount === 0, 'Empty row insertedCount === 0 (not inserted into DB)');
    assert(resEmpty.body.skippedCount === 1, 'Empty row skippedCount === 1');

    // Inverted header row
    const headerRowPayload = {
      campaign: testCampaign,
      source: 'google_sheets_meta',
      rawData: {
        id: 'id',
        full_name: 'full_name',
        phone_number: 'phone_number',
        email: 'email'
      }
    };

    const resHeader = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/meta-leads',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, headerRowPayload);

    assert(resHeader.body.insertedCount === 0, 'Header row insertedCount === 0');
    assert(resHeader.body.skippedCount === 1, 'Header row skippedCount === 1');

    // -------------------------------------------------------------
    // Test 6: Concurrency Lock on POST /api/meta-leads/sync
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Concurrency Lock on POST /api/meta-leads/sync ---');
    // Set a running sync state in database
    await MetaSyncState.findOneAndUpdate(
      { key: 'meta_leads_sync' },
      {
        isSyncing: true,
        startedAt: new Date(),
        lastStatus: 'in_progress',
        message: 'Active sync in progress'
      },
      { upsert: true }
    );

    const concurrentSyncRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/meta-leads/sync',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    assert(concurrentSyncRes.statusCode === 429, 'Second concurrent sync request returns HTTP 429 (Too Many Requests)');
    assert(concurrentSyncRes.body.inProgress === true, 'Response indicates inProgress: true');

    // -------------------------------------------------------------
    // Test 7: GET /api/meta-leads/sync-status returns accurate state
    // -------------------------------------------------------------
    console.log('\n--- Test 7: GET /api/meta-leads/sync-status ---');
    const statusRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/meta-leads/sync-status',
      method: 'GET'
    });

    assert(statusRes.statusCode === 200, 'GET /api/meta-leads/sync-status returns HTTP 200');
    assert(statusRes.body.isSyncing === true, 'Reports current active sync state');

    // Release lock
    await MetaSyncState.findOneAndUpdate(
      { key: 'meta_leads_sync' },
      { isSyncing: false, lastStatus: 'completed', message: 'Sync complete' }
    );

    const idleStatusRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/meta-leads/sync-status',
      method: 'GET'
    });
    assert(idleStatusRes.body.isSyncing === false, 'Reports isSyncing: false after release');

  } finally {
    // Clean up only our automated test campaign documents
    await MetaLead.deleteMany({ campaign: testCampaign });
    console.log('\n✓ Cleaned up automated test campaign documents.');
  }

  console.log('\n====================================================');
  console.log(`TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  process.exit(failed === 0 ? 0 : 1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
