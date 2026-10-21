/**
 * test_otp_visibility.js
 * Verify that OTP is prominently logged, returned in response, and accessible via latest-otp
 */

const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function testOtp() {
  console.log('Testing OTP Backend Visibility...');

  const testEmail = `test_otp_${Date.now()}@example.com`;

  // 1. Send OTP
  const sendRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/send-registration-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: testEmail, firstName: 'Rajasree' }));

  console.log('POST /send-registration-otp status:', sendRes.statusCode);
  const sendBody = JSON.parse(sendRes.body);
  console.log('Response body:', sendBody);

  if (!sendBody.otp) {
    console.error('FAIL: otp was not returned in send-registration-otp response');
    process.exit(1);
  }
  console.log('SUCCESS: OTP received in response:', sendBody.otp);

  // 2. Query GET /latest-otp
  const queryRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/auth/latest-otp?email=${encodeURIComponent(testEmail)}`,
    method: 'GET'
  });

  console.log('GET /latest-otp status:', queryRes.statusCode);
  const queryBody = JSON.parse(queryRes.body);
  console.log('GET /latest-otp body:', queryBody);

  if (queryBody.otp !== sendBody.otp) {
    console.error('FAIL: Query OTP does not match generated OTP');
    process.exit(1);
  }

  // 3. Query GET /latest-otp without query param (global latest)
  const globalRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/latest-otp',
    method: 'GET'
  });
  console.log('GET /latest-otp (global) body:', JSON.parse(globalRes.body));

  console.log('\n✓ ALL OTP VISIBILITY TESTS PASSED!');
  process.exit(0);
}

testOtp().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
