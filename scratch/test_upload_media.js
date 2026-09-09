const axios = require('axios');
const token = 'EAARKMMGqXuUBSbXwBAtdjoz4qv7JJWpsVhzpZABXJokhbZCIoJpqhre0ZCiQj5aFAuzZBa5BmnG1twOdZCI7kVO4YQAgcrTI0rIqvtqQL8w4fk3K7yp5mwKQ4OPIGJ65Q1rZAffI2R8bHitwTpeJB61sGlTm9WvKBoFNzjQolbCgEHyUhKH6Radr8ZBRZCZB1qsZC3ZCgZDZD';
const WA_API = 'https://graph.facebook.com/v22.0';

async function testUploadMedia() {
  console.log('Testing Meta Media Upload...');
  const defaultPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  
  try {
    const appId = '1207473174896357';
    const sessionRes = await axios.post(`${WA_API}/${appId}/uploads`, null, {
      params: {
        file_length: defaultPng.length,
        file_type: 'image/png',
        access_token: token
      }
    });

    console.log('Session Created:', sessionRes.data);
    const uploadSessionId = sessionRes.data?.id;

    const uploadRes = await axios.post(`${WA_API}/${uploadSessionId}`, defaultPng, {
      headers: {
        'Authorization': `OAuth ${token}`,
        'file_offset': 0,
        'Content-Type': 'image/png'
      }
    });

    console.log('Upload Result:', uploadRes.data);
    console.log('header_handle:', uploadRes.data?.h);
  } catch (err) {
    console.error('Upload Error Status:', err.response?.status);
    console.error('Upload Error Data:', JSON.stringify(err.response?.data, null, 2));
  }
}

testUploadMedia();
