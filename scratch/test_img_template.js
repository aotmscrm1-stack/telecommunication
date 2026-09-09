const axios = require('axios');
const token = 'EAARKMMGqXuUBSbXwBAtdjoz4qv7JJWpsVhzpZABXJokhbZCIoJpqhre0ZCiQj5aFAuzZBa5BmnG1twOdZCI7kVO4YQAgcrTI0rIqvtqQL8w4fk3K7yp5mwKQ4OPIGJ65Q1rZAffI2R8bHitwTpeJB61sGlTm9WvKBoFNzjQolbCgEHyUhKH6Radr8ZBRZCZB1qsZC3ZCgZDZD';
const wabaId = '1026026910332703';
const handle = '4::aW1hZ2UvcG5n:ARaTZS4KioBKWqtsnKU6STNms0_2_aFBEgLLYIqQgfGzBU96u35YIJQbZJ4oZmZmQ3_GcfIYOGa9jc5banhkSWPp9F4-c9pnAfPE94vRWhksIw:e:1789303009:1207473174896357:61593304286211:ARY4mcDY5XGZcdtlCb0';

async function testCreateImageTemplate() {
  console.log('Testing Image Header Template creation...');
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v22.0/${wabaId}/message_templates`,
      {
        name: 'test_img_header_' + Date.now().toString().slice(-4),
        category: 'MARKETING',
        language: 'en_US',
        components: [
          {
            type: 'HEADER',
            format: 'IMAGE',
            example: { header_handle: [handle] }
          },
          { type: 'BODY', text: 'Special offer for our valued student' }
        ]
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Status:', err.response?.status);
    console.error('Error Data:', JSON.stringify(err.response?.data, null, 2));
  }
}

testCreateImageTemplate();
