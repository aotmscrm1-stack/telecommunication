const mongoose = require('../backend/node_modules/mongoose');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });
const MessageTemplate = require('../backend/src/models/MessageTemplate');
const Integration = require('../backend/src/models/Integration');
const whatsappService = require('../backend/src/services/integrations/whatsapp');
const { toIndiaE164 } = require('../backend/src/utils/phone');

async function testSendUtilityToUser() {
  await mongoose.connect(process.env.MONGODB_URI);

  const integration = await Integration.findOne({ type: 'whatsapp_cloud' });
  const phoneId = integration?.config?.phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
  const accessToken = integration?.config?.accessToken || process.env.META_WA_ACCESS_TOKEN;
  const wabaId = integration?.config?.wabaId || process.env.META_WA_WABA_ID;

  const targetNumber = toIndiaE164('7995232673');
  console.log('Sending Utility Template to:', targetNumber);

  // Send Utility Template: hello_world
  const utilTpl = await whatsappService.findOrFetchTemplate('hello_world', wabaId, accessToken);
  if (utilTpl) {
    const utilComps = whatsappService.buildTemplateComponents(utilTpl, { phone: targetNumber });
    try {
      const res = await whatsappService.sendTemplateMessage(
        phoneId, accessToken, targetNumber, utilTpl.metaTemplateName, utilTpl.language || 'en_US', utilComps
      );
      console.log('RESULT hello_world (Utility):', JSON.stringify(res, null, 2));
    } catch (err) {
      console.error('ERROR hello_world:', err.response?.data || err.message);
    }
  }

  await mongoose.disconnect();
}

testSendUtilityToUser();
