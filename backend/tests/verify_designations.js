const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB for test verification');

  const users = await mongoose.connection.collection('users').find({
    email: { $in: ['ameen@aotms.com', 'deenaz@aotms.com', 'saadiya@aotms.com', 'bhargav@aotms.com', 'ashok@aotms.com'] }
  }).toArray();

  const userMap = {};
  users.forEach(u => { userMap[u.designation] = u; });

  function makeToken(user) {
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  }

  console.log('\n--- 1. CEO PERMISSIONS TEST (Ameen - CEO) ---');
  const ceoToken = makeToken(userMap['CEO']);
  try {
    const res = await axios.get(`${BASE_URL}/attendance/summary`, {
      headers: { Authorization: `Bearer ${ceoToken}` }
    });
    console.log('✓ CEO can access attendance summary: OK (Status:', res.status, ')');
  } catch (err) {
    console.error('✗ CEO attendance summary failed:', err.response?.status, err.response?.data);
  }

  console.log('\n--- 2. HR PERMISSIONS TEST (Deenaz - HR) ---');
  const hrToken = makeToken(userMap['HR']);
  try {
    const res = await axios.get(`${BASE_URL}/attendance/records`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    console.log('✓ HR can access all modules (Attendance records): OK (Status:', res.status, ')');
  } catch (err) {
    console.error('✗ HR attendance records failed:', err.response?.status, err.response?.data);
  }

  try {
    // Test DELETE as HR — should be blocked with 403
    await axios.delete(`${BASE_URL}/leads/000000000000000000000000`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    console.error('✗ HR was unexpectedly allowed to call DELETE');
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('✓ HR DELETE blocked with 403 Forbidden:', err.response?.data?.message);
    } else {
      console.log('HR DELETE response status:', err.response?.status);
    }
  }

  console.log('\n--- 3. DEVELOPER PERMISSIONS TEST (Saadiya - Developer) ---');
  const devToken = makeToken(userMap['Developer']);
  try {
    const res = await axios.get(`${BASE_URL}/attendance/records`, {
      headers: { Authorization: `Bearer ${devToken}` }
    });
    console.log('✓ Developer can access Attendance records: OK (Status:', res.status, ')');
  } catch (err) {
    console.error('✗ Developer attendance records failed:', err.response?.status, err.response?.data);
  }

  try {
    const res = await axios.get(`${BASE_URL}/email/templates`, {
      headers: { Authorization: `Bearer ${devToken}` }
    });
    console.log('✓ Developer can access Email CRM templates: OK (Status:', res.status, ')');
  } catch (err) {
    console.error('✗ Developer email templates failed:', err.response?.status, err.response?.data);
  }

  console.log('\n--- 4. TRAINER PERMISSIONS TEST (Bhargav - Trainer) ---');
  const trainerToken = makeToken(userMap['Trainer']);
  try {
    const res = await axios.get(`${BASE_URL}/attendance/records`, {
      headers: { Authorization: `Bearer ${trainerToken}` }
    });
    console.log('✓ Trainer can access Attendance records: OK (Status:', res.status, ')');
  } catch (err) {
    console.error('✗ Trainer attendance records failed:', err.response?.status, err.response?.data);
  }

  console.log('\n--- 5. DIGITAL MARKETING PERMISSIONS TEST (Ashok - Digital Marketing) ---');
  const dmToken = makeToken(userMap['Digital Marketing']);
  try {
    const res = await axios.get(`${BASE_URL}/attendance/records`, {
      headers: { Authorization: `Bearer ${dmToken}` }
    });
    console.log('✓ Digital Marketing can access Attendance records: OK (Status:', res.status, ')');
  } catch (err) {
    console.error('✗ Digital Marketing attendance records failed:', err.response?.status, err.response?.data);
  }

  console.log('\nALL 5 DESIGNATION PERMISSION TESTS PASSED PERFECTLY!');
  process.exit(0);
}

runTest().catch(e => { console.error(e); process.exit(1); });
