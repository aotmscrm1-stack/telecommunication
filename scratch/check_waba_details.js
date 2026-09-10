const axios = require('../backend/node_modules/axios');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const token = process.env.META_WA_ACCESS_TOKEN;
const phoneId = process.env.META_WA_PHONE_NUMBER_ID;
const wabaId = process.env.META_WA_WABA_ID;

async function checkMetaWabaDetails() {
  console.log('--- 1. Phone Number Info ---');
  try {
    const res1 = await axios.get(`https://graph.facebook.com/v22.0/${phoneId}`, {
      params: { access_token: token, fields: 'display_phone_number,verified_name,code_verification_status,quality_rating,status,messaging_limit_tier' }
    });
    console.log(JSON.stringify(res1.data, null, 2));
  } catch (err1) {
    console.error('Phone info error:', err1.response?.data || err1.message);
  }

  console.log('\n--- 2. WABA Info ---');
  try {
    const res2 = await axios.get(`https://graph.facebook.com/v22.0/${wabaId}`, {
      params: { access_token: token, fields: 'id,name,currency,account_review_status,business_verification_status' }
    });
    console.log(JSON.stringify(res2.data, null, 2));
  } catch (err2) {
    console.error('WABA info error:', err2.response?.data || err2.message);
  }
}

checkMetaWabaDetails();
