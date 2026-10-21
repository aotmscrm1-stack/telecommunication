/**
 * test_recordings_suite.js
 * Comprehensive end-to-end test verification for Call Recordings & Cloudinary Deletion
 * per frontend/implement.md specifications
 */

require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const FormData = require('form-data');

const CallRecording = require('../src/database/models/CallRecording');
const User = require('../src/database/models/User');
const { deleteFromCloudinary, cloudinary } = require('../src/core/utils/cloudinary');

const BASE_URL = 'http://localhost:5000/api';

async function runTestSuite() {
  console.log('====================================================');
  console.log('   CALL RECORDINGS & CLOUDINARY INTEGRATION TEST    ');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB');

  // 1. Find or create an admin/manager user for testing
  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    adminUser = await User.findOne({ role: 'hr' }) || await User.findOne({});
  }
  if (!adminUser) {
    throw new Error('No user found in database to execute test with.');
  }

  const token = jwt.sign(
    { id: adminUser._id, role: adminUser.role, designation: adminUser.designation, workspace: adminUser.workspace },
    process.env.JWT_SECRET || 'aotms_super_secret_jwt_key_2024',
    { expiresIn: '1h' }
  );
  console.log(`✓ Using test user: ${adminUser.name || adminUser.email} (${adminUser.role || 'user'})`);

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

  // -------------------------------------------------------------
  // Test 1: Verify Existing Active Recordings in MongoDB & Cloudinary
  // -------------------------------------------------------------
  console.log('\n--- Test 1: Active Recordings Verification ---');
  const existingRecordings = await CallRecording.find({}).sort({ recordedAt: -1 }).lean();
  console.log(`Found ${existingRecordings.length} total existing recordings in database.`);
  assert(existingRecordings.length > 0, 'Database contains call recordings');

  for (const rec of existingRecordings) {
    assert(!!rec.cloudinaryUrl, `Recording ${rec.originalName} has persistent cloudinaryUrl: ${rec.cloudinaryUrl}`);
    assert(!!rec.cloudinaryPublicId, `Recording ${rec.originalName} has valid cloudinaryPublicId: ${rec.cloudinaryPublicId}`);
    assert(rec.transcriptStatus === 'done' && !!rec.transcript, `Recording ${rec.originalName} preserves transcript`);
  }

  // -------------------------------------------------------------
  // Test 2: GET /api/recordings with Authentication
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Authenticated GET /api/recordings ---');
  const getRecordingsRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/recordings',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(getRecordingsRes.statusCode === 200, 'GET /api/recordings returns HTTP 200');
  const recData = JSON.parse(getRecordingsRes.body);
  assert(Array.isArray(recData.recordings), 'GET /api/recordings returns { recordings: [...] }');
  if (recData.recordings.length > 0) {
    const first = recData.recordings[0];
    assert(first.fileAvailable === true, 'First recording has fileAvailable: true');
    assert(first.fileExists === true, 'First recording has fileExists: true');
    assert(!!first.url && first.url.includes('cloudinary.com'), 'First recording url points directly to Cloudinary CDN');
    assert(!!first.streamUrl, 'First recording includes streamUrl');
  }

  // -------------------------------------------------------------
  // Test 3: Audio Stream Redirect (302) to Cloudinary
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Stream Route 302 Redirect ---');
  if (existingRecordings.length > 0) {
    const streamTarget = existingRecordings[0].storedName;
    const streamRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/recordings/stream/${streamTarget}`,
      method: 'GET'
    });
    assert(streamRes.statusCode === 302, `GET /api/recordings/stream/${streamTarget} returns HTTP 302 redirect`);
    assert(
      streamRes.headers.location && streamRes.headers.location.includes('res.cloudinary.com'),
      `Redirect Location points to Cloudinary CDN: ${streamRes.headers.location}`
    );
  }

  // -------------------------------------------------------------
  // Test 4: Stream Missing Audio File Returns 404 (No infinite loop)
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Non-existent Audio Stream 404 ---');
  const missingStreamRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/recordings/stream/non_existent_audio_file_9999.wav',
    method: 'GET'
  });
  assert(missingStreamRes.statusCode === 404, 'Stream route returns HTTP 404 for missing audio file');

  // -------------------------------------------------------------
  // Test 5: Upload New Recording via POST /api/recordings to Cloudinary
  // -------------------------------------------------------------
  console.log('\n--- Test 5: Upload New Recording to Cloudinary ---');
  const testWavBuffer = Buffer.from('RIFF$ \x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00 \x00\x00' + '0'.repeat(100));
  const testFileName = `test_automated_${Date.now()}.wav`;

  const form = new FormData();
  form.append('audio', testWavBuffer, { filename: testFileName, contentType: 'audio/wav' });
  form.append('phone', '9876543210');

  const uploadRes = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/recordings',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders()
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    form.pipe(req);
  });

  assert(uploadRes.statusCode === 201, 'POST /api/recordings returns HTTP 201 Created');
  const uploadJson = JSON.parse(uploadRes.body);
  assert(uploadJson.success === true, 'Upload response contains success: true');
  assert(!!uploadJson.recording, 'Upload response contains recording object');
  const createdRec = uploadJson.recording;
  assert(!!createdRec.cloudinaryUrl, `Created recording has cloudinaryUrl: ${createdRec.cloudinaryUrl}`);
  assert(!!createdRec.cloudinaryPublicId, `Created recording has cloudinaryPublicId: ${createdRec.cloudinaryPublicId}`);

  // Verify in MongoDB directly
  const savedDoc = await CallRecording.findById(createdRec._id).lean();
  assert(!!savedDoc, 'Created recording successfully persisted in MongoDB');
  assert(savedDoc.cloudinaryUrl === createdRec.cloudinaryUrl, 'MongoDB cloudinaryUrl matches upload response');
  assert(savedDoc.cloudinaryPublicId === createdRec.cloudinaryPublicId, 'MongoDB cloudinaryPublicId matches upload response');

  // Verify Cloudinary asset is live and returns HTTP 200
  const cldAssetRes = await checkHttpsStatus(createdRec.cloudinaryUrl);
  assert(cldAssetRes.statusCode === 200, `Cloudinary asset is live and returns HTTP 200 (type: ${cldAssetRes.contentType})`);

  // -------------------------------------------------------------
  // Test 6: Deduplication Check on Repeat Upload
  // -------------------------------------------------------------
  console.log('\n--- Test 6: Deduplication Handling ---');
  const repeatForm = new FormData();
  repeatForm.append('audio', testWavBuffer, { filename: testFileName, contentType: 'audio/wav' });
  repeatForm.append('phone', '9876543210');

  const repeatRes = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/recordings',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...repeatForm.getHeaders()
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    repeatForm.pipe(req);
  });

  assert(repeatRes.statusCode === 200, 'Repeat upload returns HTTP 200');
  const repeatJson = JSON.parse(repeatRes.body);
  assert(repeatJson.alreadySynced === true, 'Repeat upload returns alreadySynced: true');
  assert(repeatJson.recording._id === String(createdRec._id), 'Repeat upload returns same recording without duplicating');

  // -------------------------------------------------------------
  // Test 7: Unauthorized Deletion Attempt Rejected (401 / 403)
  // -------------------------------------------------------------
  console.log('\n--- Test 7: Unauthorized Deletion Security ---');
  const unauthDel = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/recordings/${createdRec._id}`,
    method: 'DELETE'
  });
  assert(unauthDel.statusCode === 401, 'DELETE without authorization token returns HTTP 401');

  // -------------------------------------------------------------
  // Test 8: Invalid ID Format Rejection (400)
  // -------------------------------------------------------------
  console.log('\n--- Test 8: Invalid ObjectId Validation ---');
  const invalidIdDel = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/recordings/invalid-mongo-id-12345',
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(invalidIdDel.statusCode === 400, 'DELETE with invalid ObjectId returns HTTP 400');

  // -------------------------------------------------------------
  // Test 9: Non-existent Record 404
  // -------------------------------------------------------------
  console.log('\n--- Test 9: Non-existent Record 404 ---');
  const fakeId = new mongoose.Types.ObjectId();
  const notFoundDel = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/recordings/${fakeId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(notFoundDel.statusCode === 404, 'DELETE on non-existent record returns HTTP 404');

  // -------------------------------------------------------------
  // Test 10: Authorized Deletion (Deletes Cloudinary + MongoDB)
  // -------------------------------------------------------------
  console.log('\n--- Test 10: Complete Cloudinary + MongoDB Deletion ---');
  const authDel = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/recordings/${createdRec._id}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(authDel.statusCode === 200, 'DELETE returns HTTP 200');
  const delJson = JSON.parse(authDel.body);
  assert(delJson.success === true, 'DELETE response contains success: true');
  assert(delJson.deletedAsset && delJson.deletedAsset.cloudinaryStatus === 'deleted', 'Cloudinary asset deletion confirmed');

  // Verify MongoDB document is removed
  const checkMongoAfterDel = await CallRecording.findById(createdRec._id).lean();
  assert(checkMongoAfterDel === null, 'MongoDB document successfully removed from database');

  // Verify Cloudinary asset is removed
  let cldExists = true;
  try {
    await cloudinary.api.resource(createdRec.cloudinaryPublicId, { resource_type: savedDoc.cloudinaryResourceType || 'video' });
  } catch (err) {
    if (err && (err.http_code === 404 || (err.error && err.error.http_code === 404) || String(err.message || '').includes('not found') || String(err.error?.message || '').includes('not found'))) {
      cldExists = false;
    }
  }
  assert(!cldExists, 'Cloudinary asset verified deleted via Cloudinary Admin API (404 Not Found)');

  // -------------------------------------------------------------
  // Test 11: Repeated Deletion is Safe & Idempotent (404)
  // -------------------------------------------------------------
  console.log('\n--- Test 11: Repeated Deletion Safety ---');
  const repeatDel = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/recordings/${createdRec._id}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(repeatDel.statusCode === 404, 'Repeated DELETE returns HTTP 404 safely without side effects');

  // -------------------------------------------------------------
  // Test 12: Verify Unrelated Records Remain Completely Intact
  // -------------------------------------------------------------
  console.log('\n--- Test 12: Integrity of Remaining Records ---');
  const finalCount = await CallRecording.countDocuments();
  assert(finalCount === existingRecordings.length, `Original ${existingRecordings.length} records remain completely intact`);

  console.log('\n====================================================');
  console.log(`TEST SUITE FINISHED: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('====================================================');

  process.exit(testsFailed === 0 ? 0 : 1);
}

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

function checkHttpsStatus(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      resolve({ statusCode: res.statusCode, contentType: res.headers['content-type'] });
    }).on('error', reject);
  });
}

runTestSuite().catch(err => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
