const axios = require('axios');
const token = 'EAARKMMGqXuUBSbXwBAtdjoz4qv7JJWpsVhzpZABXJokhbZCIoJpqhre0ZCiQj5aFAuzZBa5BmnG1twOdZCI7kVO4YQAgcrTI0rIqvtqQL8w4fk3K7yp5mwKQ4OPIGJ65Q1rZAffI2R8bHitwTpeJB61sGlTm9WvKBoFNzjQolbCgEHyUhKH6Radr8ZBRZCZB1qsZC3ZCgZDZD';
const wabaId = '1026026910332703';

function buildBodyComponent(message) {
  const comp = { type: 'BODY', text: message };
  const matches = message.match(/\{\{(\d+|\w+)\}\}/g);
  if (matches && matches.length > 0) {
    const samples = matches.map((_, idx) => `Sample${idx + 1}`);
    comp.example = { body_text: [samples] };
  }
  return comp;
}

async function testAutoExample() {
  console.log('Testing Auto Example Generation for Variables...');
  const msg = 'Dear student, your enrollment for {{1}} has been confirmed. Please contact {{2}} for class details.';
  const bodyComp = buildBodyComponent(msg);
  console.log('Generated BODY Component:', JSON.stringify(bodyComp, null, 2));

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v22.0/${wabaId}/message_templates`,
      {
        name: 'test_auto_ex_' + Date.now().toString().slice(-4),
        category: 'UTILITY',
        language: 'en_US',
        components: [bodyComp]
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Status:', err.response?.status);
    console.error('Error Data:', JSON.stringify(err.response?.data, null, 2));
  }
}

testAutoExample();
