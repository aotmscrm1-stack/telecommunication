/**
 * Script: syncCampaignToOutpero.js
 * 
 * Purpose:
 * Sync all existing Meta Leads from a specific campaign to Outpero AI voice calling intake.
 * 
 * Usage:
 *   node scripts/syncCampaignToOutpero.js "SAP Lead Form Nov0411"
 *   node scripts/syncCampaignToOutpero.js "SAP Lead Form Nov0411" --only-new
 * 
 * Docker container usage on VPS:
 *   docker exec -it aotms-backend node scripts/syncCampaignToOutpero.js "SAP Lead Form Nov0411"
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const MetaLead = require('../src/database/models/MetaLead');
const { dispatchLeadToOutpero } = require('../src/integrations/calling/outpero');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const args = process.argv.slice(2);
  const targetCampaign = args.find(a => !a.startsWith('--'));
  const onlyNew = args.includes('--only-new');

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
  }

  const secret = (process.env.OUTPERO_LEAD_SECRET || '').trim();
  if (!secret) {
    console.error('❌ OUTPERO_LEAD_SECRET not found in .env. Please set it before syncing.');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log('✅ Connected to MongoDB.');

  // If no campaign provided, list existing campaigns
  if (!targetCampaign) {
    console.log('\n⚠️ No campaign specified! Listing available campaigns in MetaLead:');
    const campaigns = await MetaLead.aggregate([
      { $group: { _id: '$campaign', totalLeads: { $sum: 1 } } },
      { $sort: { totalLeads: -1 } }
    ]);
    console.table(campaigns.map(c => ({ Campaign: c._id || '(empty)', Leads: c.totalLeads })));
    console.log('\n👉 Usage: node scripts/syncCampaignToOutpero.js "<Campaign Name>"');
    console.log('Example: node scripts/syncCampaignToOutpero.js "SAP Lead Form Nov0411"\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`\n🎯 Target Campaign: "${targetCampaign}" (Filter only new: ${onlyNew})`);

  const query = { campaign: targetCampaign };
  if (onlyNew) {
    query.status = 'New';
  }

  const leads = await MetaLead.find(query).sort({ createdAt: -1 });
  console.log(`📊 Found ${leads.length} leads matching criteria.`);

  if (leads.length === 0) {
    console.log('ℹ️ No leads to sync. Exiting.');
    await mongoose.disconnect();
    process.exit(0);
  }

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const phone = lead.phone || lead.normalizedPhone;
    const name = lead.fullName || 'Valued Lead';

    if (!phone) {
      console.log(`[${i + 1}/${leads.length}] ⚠️ Skipped: ${name} (No phone number)`);
      skippedCount++;
      continue;
    }

    try {
      const res = await dispatchLeadToOutpero({
        name,
        phone,
        course: targetCampaign,
        campaign: targetCampaign,
        bypassCampaignFilter: true,
      });

      if (res.success) {
        successCount++;
        console.log(`[${i + 1}/${leads.length}] ✅ Dispatched to Outpero: ${name} (${phone})`);
      } else {
        failCount++;
        console.log(`[${i + 1}/${leads.length}] ❌ Failed: ${name} (${phone}) - ${res.error || res.reason}`);
      }
    } catch (err) {
      failCount++;
      console.log(`[${i + 1}/${leads.length}] ❌ Error: ${name} (${phone}) - ${err.message}`);
    }

    // 500ms delay between dispatches to avoid throttling Outpero API
    await sleep(500);
  }

  console.log('\n=======================================');
  console.log('🎉 Outpero Campaign Sync Completed!');
  console.log(`Total Found:     ${leads.length}`);
  console.log(`Successfully Sent: ${successCount}`);
  console.log(`Failed:          ${failCount}`);
  console.log(`Skipped (No Ph): ${skippedCount}`);
  console.log('=======================================\n');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});

