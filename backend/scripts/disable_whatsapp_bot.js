/**
 * Script: disable_whatsapp_bot.js
 *
 * Purpose:
 * Turn OFF the WhatsApp Greeting & Courses chatbot so inbound customer
 * messages are never auto-answered by the bot. Same effect as switching the
 * "Bot Enabled" toggle off in WhatsApp -> Automation, but runnable from the CLI
 * (works without opening the CRM).
 *
 * Usage:
 *   node scripts/disable_whatsapp_bot.js
 *   node scripts/disable_whatsapp_bot.js --enable     (turn it back on)
 *
 * Docker container usage on VPS:
 *   docker exec -it aotms-backend node scripts/disable_whatsapp_bot.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Integration = require('../src/database/models/Integration');

async function run() {
  const enable = process.argv.slice(2).includes('--enable');
  const target = enable; // OFF unless --enable is passed

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log('✅ Connected to MongoDB.');

  const integration = await Integration.findOne({ type: 'whatsapp_cloud', status: 'active' })
    || await Integration.findOne({ type: 'whatsapp_cloud' });

  if (!integration) {
    console.error('❌ No whatsapp_cloud integration found. Nothing to update.');
    await mongoose.disconnect();
    process.exit(1);
  }

  integration.config = integration.config || {};
  const extra = integration.config.extraConfig || {};
  const current = extra.whatsappAutomation || {};

  integration.config.extraConfig = {
    ...extra,
    whatsappAutomation: {
      ...current,
      enabled: target,
      updatedAt: new Date().toISOString(),
    },
  };
  integration.markModified('config');
  await integration.save();

  console.log(`\n✅ Automation bot ${target ? 'ENABLED' : 'DISABLED'} for integration "${integration.name}" (${integration._id})`);
  console.log(`   previous enabled = ${current.enabled === undefined ? '(not set / default false)' : current.enabled}`);
  console.log(`   current  enabled = ${target}`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌ Script failed:', err.message);
  try { await mongoose.disconnect(); } catch (e) { /* ignore */ }
  process.exit(1);
});
