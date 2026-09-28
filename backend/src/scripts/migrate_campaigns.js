const mongoose = require('mongoose');

async function run() {
  try {
    const Lead = mongoose.model('Lead');
    const WhatsAppCampaign = mongoose.model('WhatsAppCampaign');

    const campaigns = await WhatsAppCampaign.find({}).lean();
    let totalMigrated = 0;

    for (const cmp of campaigns) {
      const msgText = cmp.customMessage || 'WhatsApp Campaign Broadcast';
      for (const contact of (cmp.contacts || [])) {
        if (!contact.phone) continue;
        const clean10 = String(contact.phone).replace(/[^\d]/g, '').slice(-10);
        if (!clean10) continue;

        let lead = await Lead.findOne({
          $or: [
            { phone: clean10 },
            { phone: new RegExp(clean10 + '$') }
          ]
        });

        if (!lead) {
          lead = await Lead.create({
            name: contact.name || 'WhatsApp Contact',
            phone: clean10,
            status: 'Contact',
            leadSource: 'Whatsapp Broadcast Campaign',
            customFields: { identity: contact.identity || 'General' },
          });
        }

        lead.activities = lead.activities || [];
        const exists = lead.activities.some(a => a.metaMessageId === String(contact._id));
        if (!exists) {
          lead.activities.push({
            type: 'whatsapp',
            description: `[Campaign: ${cmp.name || 'Broadcast'}] ${msgText}`,
            direction: 'outbound_broadcast',
            metaMessageId: String(contact._id),
            deliveryStatus: contact.status === 'sent' ? 'sent' : 'failed',
            createdAt: cmp.createdAt || new Date(),
          });
          lead.waStatus = 'intervened';
          lead.lastWaMessageAt = cmp.createdAt || new Date();
          lead.lastWaMessagePreview = `[Campaign: ${cmp.name || 'Broadcast'}] ${msgText}`;
          await lead.save();
          totalMigrated++;
        }
      }
    }
    if (totalMigrated > 0) {
      console.log(`[WhatsApp Sync] Synced ${totalMigrated} past campaign contacts into Lead activities for /whatsapp display.`);
    }
  } catch (err) {
    console.warn('[WhatsApp Sync Warning]:', err.message);
  }
}

module.exports = { run };
