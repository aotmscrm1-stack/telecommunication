const mongoose = require('mongoose');

async function run() {
  try {
    const Lead = mongoose.model('Lead');
    const WhatsAppCampaign = mongoose.model('WhatsAppCampaign');
    const MessageTemplate = mongoose.model('MessageTemplate');

    const campaigns = await WhatsAppCampaign.find({}).lean();
    let totalMigrated = 0;

    for (const cmp of campaigns) {
      let templateObj = null;
      if (cmp.templateRef) {
        try {
          templateObj = await MessageTemplate.findById(cmp.templateRef).lean();
        } catch (e) {}
      }

      let templateShortcut = templateObj?.shortcut || templateObj?.metaTemplateName || cmp.name || 'hackathon2026';
      let fullMessageBody = templateObj?.message || templateObj?.body || cmp.customMessage || '🔥 NATIONAL-LEVEL PROBLEM STATEMENT HACKATHON 2026 🔥';

      // Ensure proper formatting for Rich Template Rendering
      const formattedText = `[Template: ${templateShortcut}] ${fullMessageBody}`;

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
        // Replace previous placeholder activity if present
        lead.activities = lead.activities.filter(a => !(a.metaMessageId === String(contact._id) && a.description?.includes('WhatsApp Campaign Broadcast')));

        const exists = lead.activities.some(a => a.metaMessageId === String(contact._id) && !a.description?.includes('WhatsApp Campaign Broadcast'));
        if (!exists) {
          lead.activities.push({
            type: 'whatsapp',
            description: formattedText,
            direction: 'outbound_broadcast',
            metaMessageId: String(contact._id),
            deliveryStatus: contact.status === 'sent' ? 'sent' : 'failed',
            createdAt: cmp.createdAt || new Date(),
          });
          lead.waStatus = 'intervened';
          lead.lastWaMessageAt = cmp.createdAt || new Date();
          lead.lastWaMessagePreview = fullMessageBody.slice(0, 100);
          await lead.save();
          totalMigrated++;
        }
      }
    }
    if (totalMigrated > 0) {
      console.log(`[WhatsApp Sync] Successfully updated ${totalMigrated} campaign contacts with FULL Template bodies in Lead activities!`);
    }
  } catch (err) {
    console.warn('[WhatsApp Sync Warning]:', err.message);
  }
}

module.exports = { run };
