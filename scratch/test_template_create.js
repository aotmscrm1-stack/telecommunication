const axios = require('axios');
const token = 'EAARKMMGqXuUBSbXwBAtdjoz4qv7JJWpsVhzpZABXJokhbZCIoJpqhre0ZCiQj5aFAuzZBa5BmnG1twOdZCI7kVO4YQAgcrTI0rIqvtqQL8w4fk3K7yp5mwKQ4OPIGJ65Q1rZAffI2R8bHitwTpeJB61sGlTm9WvKBoFNzjQolbCgEHyUhKH6Radr8ZBRZCZB1qsZC3ZCgZDZD';
const wabaId = '1026026910332703';

async function testCreateTemplate(testCase) {
  console.log('\n--- Testing Case:', testCase.label);
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v22.0/${wabaId}/message_templates`,
      testCase.payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Status:', err.response?.status);
    console.error('Error Data:', JSON.stringify(err.response?.data, null, 2));
  }
}

async function runAllTests() {
  // Test 1: Simple body text
  await testCreateTemplate({
    label: 'Simple Body',
    payload: {
      name: 'test_body_' + Date.now().toString().slice(-4),
      category: 'UTILITY',
      language: 'en_US',
      components: [{ type: 'BODY', text: 'Hello welcome to our service' }]
    }
  });

  // Test 2: Body with variable {{1}} without example
  await testCreateTemplate({
    label: 'Body with {{1}} without example',
    payload: {
      name: 'test_var_no_ex_' + Date.now().toString().slice(-4),
      category: 'UTILITY',
      language: 'en_US',
      components: [{ type: 'BODY', text: 'Hello {{1}}, welcome!' }]
    }
  });

  // Test 3: Body with variable {{1}} WITH example
  await testCreateTemplate({
    label: 'Body with {{1}} WITH example',
    payload: {
      name: 'test_var_with_ex_' + Date.now().toString().slice(-4),
      category: 'UTILITY',
      language: 'en_US',
      components: [
        {
          type: 'BODY',
          text: 'Hello {{1}}, welcome!',
          example: { body_text: [["Rahul"]] }
        }
      ]
    }
  });

  // Test 4: MEDIA Header (IMAGE) without example vs WITH example
  await testCreateTemplate({
    label: 'Media IMAGE Header without example',
    payload: {
      name: 'test_img_no_ex_' + Date.now().toString().slice(-4),
      category: 'MARKETING',
      language: 'en_US',
      components: [
        { type: 'HEADER', format: 'IMAGE' },
        { type: 'BODY', text: 'Check out our special offer' }
      ]
    }
  });
}

runAllTests();
