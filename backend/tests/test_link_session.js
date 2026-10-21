/**
 * test_link_session.js
 * End-to-end automated verification for Link Session (Meta Leads, Campaigns, Normal Leads)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');

const CallRecording = require('../src/database/models/CallRecording');
const User = require('../src/database/models/User');
const Lead = require('../src/database/models/Lead');
const MetaLead = require('../src/database/models/MetaLead');
const Campaign = require('../src/database/models/Campaign');

async function testLinkSession() {
  console.log('====================================================');
  console.log('   LINK SESSION (META, CAMPAIGN, LEAD) TEST         ');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB');

  // 1. Authenticate as Admin/HR
  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) adminUser = await User.findOne({ role: 'hr' }) || await User.findOne({});
  if (!adminUser) throw new Error('No user found in database');

  const token = jwt.sign(
    { id: adminUser._id, role: adminUser.role, designation: adminUser.designation, workspace: adminUser.workspace },
    process.env.JWT_SECRET || 'aotms_super_secret_jwt_key_2024',
    { expiresIn: '1h' }
  );

  let testsPassed = 0;
  let testsFailed = 0;
  function assert(cond, name) {
    if (cond) {
      console.log(`[PASS] ${name}`);
      testsPassed++;
    } else {
      console.error(`[FAIL] ${name}`);
      testsFailed++;
    }
  }

  // 2. Find or create a test recording
  let testRec = await CallRecording.findOne({}).sort({ recordedAt: -1 });
  if (!testRec) {
    testRec = await CallRecording.create({
      user: adminUser._id,
      originalName: 'test_session_link.m4a',
      storedName: 'test_session_link_stored.m4a',
      url: '/uploads/recordings/test_session_link.m4a',
      size: 1024,
      phone: '9876543210',
    });
  }
  const originalState = {
    linkType: testRec.linkType,
    lead: testRec.lead,
    metaLead: testRec.metaLead,
    metaLeadName: testRec.metaLeadName,
    metaLeadPhone: testRec.metaLeadPhone,
    campaignRef: testRec.campaignRef,
    campaignName: testRec.campaignName,
  };

  try {
    // 3. Find test entities
    let testNormalLead = await Lead.findOne({});
    if (!testNormalLead) {
      testNormalLead = await Lead.create({
        name: 'Test Normal Lead',
        phone: '9876543211',
        email: 'normal@test.com',
        workspace: adminUser.workspace,
        createdBy: adminUser._id,
      });
    }

    let testMetaLead = await MetaLead.findOne({});
    if (!testMetaLead) {
      testMetaLead = await MetaLead.create({
        metaLeadId: 'test_meta_12345',
        fullName: 'Test Meta Prospect',
        phone: '9876543212',
        email: 'meta@test.com',
        campaign: 'Digital Marketing_Leads',
        workspace: adminUser.workspace,
      });
    }

    let testCampaign = await Campaign.findOne({});
    if (!testCampaign) {
      testCampaign = await Campaign.create({
        name: 'Spring Marketing Blitz',
        description: 'Lead generation blitz campaign',
        status: 'Active',
        createdBy: adminUser._id,
      });
    }

    console.log(`\nTest recording: ${testRec._id} (${testRec.originalName})`);

    // -------------------------------------------------------------
    // Test 1: Link to Normal Lead
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Link Recording to Normal Lead ---');
    const linkLeadRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/recordings/${testRec._id}/link-lead`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    }, JSON.stringify({
      linkType: 'lead',
      leadId: testNormalLead._id,
    }));

    assert(linkLeadRes.statusCode === 200, 'POST /link-lead (Normal Lead) returns HTTP 200');
    const leadBody = JSON.parse(linkLeadRes.body);
    assert(leadBody.success === true, 'Response contains success: true');
    assert(leadBody.recording.linkType === 'lead', 'Recording linkType is "lead"');
    assert(String(leadBody.recording.leadId) === String(testNormalLead._id), 'Recording leadId matches Normal Lead _id');
    assert(leadBody.recording.leadName === testNormalLead.name, 'Recording leadName matches Normal Lead name');

    // -------------------------------------------------------------
    // Test 2: Link to Meta Lead
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Link Recording to Meta Lead ---');
    const metaName = testMetaLead.fullName || testMetaLead.rawData?.full_name || 'Meta Lead';
    const linkMetaRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/recordings/${testRec._id}/link-lead`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    }, JSON.stringify({
      linkType: 'meta_lead',
      metaLeadId: testMetaLead._id,
      metaLeadName: metaName,
      metaLeadPhone: testMetaLead.phone,
      campaignName: testMetaLead.campaign,
    }));

    assert(linkMetaRes.statusCode === 200, 'POST /link-lead (Meta Lead) returns HTTP 200');
    const metaBody = JSON.parse(linkMetaRes.body);
    assert(metaBody.success === true, 'Response contains success: true');
    assert(metaBody.recording.linkType === 'meta_lead', 'Recording linkType is "meta_lead"');
    assert(String(metaBody.recording.metaLeadId) === String(testMetaLead._id), 'Recording metaLeadId matches Meta Lead _id');
    assert(metaBody.recording.metaLeadName === metaName, 'Recording metaLeadName matches Meta Lead full name');
    assert(metaBody.recording.leadName === metaName, 'Recording leadName fallback provides Meta Lead name');
    assert(metaBody.recording.campaignName === testMetaLead.campaign, 'Recording campaignName matches Meta Lead campaign');

    // -------------------------------------------------------------
    // Test 3: Link to Campaign
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Link Recording to Campaign ---');
    const linkCampRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/recordings/${testRec._id}/link-lead`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    }, JSON.stringify({
      linkType: 'campaign',
      campaignId: testCampaign._id,
      campaignName: testCampaign.name,
    }));

    assert(linkCampRes.statusCode === 200, 'POST /link-lead (Campaign) returns HTTP 200');
    const campBody = JSON.parse(linkCampRes.body);
    assert(campBody.success === true, 'Response contains success: true');
    assert(campBody.recording.linkType === 'campaign', 'Recording linkType is "campaign"');
    assert(String(campBody.recording.campaignId) === String(testCampaign._id), 'Recording campaignId matches Campaign _id');
    assert(campBody.recording.campaignName === testCampaign.name, 'Recording campaignName matches Campaign name');
    assert(campBody.recording.leadName === testCampaign.name, 'Recording leadName fallback provides Campaign name');

    // -------------------------------------------------------------
    // Test 4: Unlink Session
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Unlink Session ---');
    const unlinkRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/recordings/${testRec._id}/link-lead`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    }, JSON.stringify({
      linkType: null,
    }));

    assert(unlinkRes.statusCode === 200, 'POST /link-lead (Unlink) returns HTTP 200');
    const unlinkBody = JSON.parse(unlinkRes.body);
    assert(unlinkBody.success === true, 'Response contains success: true');
    assert(unlinkBody.recording.linkType === null, 'Recording linkType is null after unlink');
    assert(unlinkBody.recording.leadId === null, 'Recording leadId is null after unlink');
    assert(unlinkBody.recording.metaLeadId === null, 'Recording metaLeadId is null after unlink');
    assert(unlinkBody.recording.campaignId === null, 'Recording campaignId is null after unlink');

    // -------------------------------------------------------------
    // Test 5: Verify GET /api/recordings includes link fields
    // -------------------------------------------------------------
    console.log('\n--- Test 5: GET /api/recordings Serialization ---');
    const getRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/recordings',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(getRes.statusCode === 200, 'GET /api/recordings returns HTTP 200');
    const listBody = JSON.parse(getRes.body);
    assert(Array.isArray(listBody.recordings), 'GET /api/recordings returns recordings array');
    const serializedRec = listBody.recordings.find(r => String(r._id) === String(testRec._id));
    assert(!!serializedRec, 'Test recording found in GET /api/recordings');
    assert('linkType' in serializedRec, 'Serialized recording contains linkType');
    assert('metaLeadId' in serializedRec, 'Serialized recording contains metaLeadId');
    assert('campaignId' in serializedRec, 'Serialized recording contains campaignId');

  } finally {
    // Restore original state
    await CallRecording.findByIdAndUpdate(testRec._id, originalState);
    console.log('\n✓ Restored test recording original state');
  }

  console.log('\n====================================================');
  console.log(`LINK SESSION TESTS FINISHED: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('====================================================');

  await mongoose.disconnect();
  process.exit(testsFailed === 0 ? 0 : 1);
}

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

testLinkSession().catch(err => {
  console.error('Fatal error in testLinkSession:', err);
  process.exit(1);
});
