const express = require('express');
const Lead = require('../models/Lead');
const Integration = require('../models/Integration');
const whatsappService = require('../services/integrations/whatsapp');
const { protect } = require('../middleware/auth');

const router = express.Router();

// A lead has been "reached" by WhatsApp if it has at least one whatsapp
// activity (broadcast, inbound, or agent reply) OR a non-'none' waStatus.
function baseWhatsappQuery() {
  return {
    $or: [
      { waStatus: { $in: ['pending', 'intervened'] } },
      { 'activities.type': 'whatsapp' },
    ],
  };
}

// ── GET /api/whatsapp-inbox?tab=all|pending|intervened&search= ─────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { tab = 'all', search = '', page = 1, limit = 30 } = req.query;

    const query = baseWhatsappQuery();
    if (tab === 'pending') query.waStatus = 'pending';
    if (tab === 'intervened') query.waStatus = 'intervened';
    // tab === 'all' -> no extra status filter, everyone who's ever been part
    // of a WhatsApp broadcast or conversation shows up here.

    if (search) {
      query.$and = [{ $or: [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ] }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [leads, total, allCount, pendingCount, intervenedCount] = await Promise.all([
      Lead.find(query)
        .select('name phone status waStatus lastWaMessageAt lastWaMessagePreview rating')
        .sort({ lastWaMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Lead.countDocuments(query),
      Lead.countDocuments(baseWhatsappQuery()),
      Lead.countDocuments({ ...baseWhatsappQuery(), waStatus: 'pending' }),
      Lead.countDocuments({ ...baseWhatsappQuery(), waStatus: 'intervened' }),
    ]);

    res.json({
      leads,
      total,
      page: Number(page),
      limit: Number(limit),
      counts: { all: allCount, pending: pendingCount, intervened: intervenedCount },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/whatsapp-inbox/:leadId — full whatsapp thread for the chat panel ──
router.get('/:leadId', protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.leadId).select('name phone status waStatus activities');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const thread = (lead.activities || [])
      .filter(a => a.type === 'whatsapp')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // 24-hour customer service window: only free-form text is allowed if the
    // lead's last inbound message was within the last 24 hours.
    const lastInbound = [...thread].reverse().find(a => a.direction === 'inbound');
    const withinWindow = !!lastInbound && (Date.now() - new Date(lastInbound.createdAt).getTime()) < 24 * 60 * 60 * 1000;

    res.json({
      lead: { id: lead._id, name: lead.name, phone: lead.phone, status: lead.status, waStatus: lead.waStatus },
      thread,
      withinWindow,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/whatsapp-inbox/:leadId/reply — agent sends a reply ───────────────
// This is what flips the lead into "Intervened".
router.post('/:leadId/reply', protect, async (req, res) => {
  try {
    const { text, templateName, languageCode, components } = req.body;
    const lead = await Lead.findById(req.params.leadId);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const integration = await Integration.findOne({ type: 'whatsapp_cloud', status: 'active' });
    if (!integration) {
      return res.status(400).json({ message: 'No active WhatsApp integration found. Connect WhatsApp Cloud API first.' });
    }

    let sendResult;
    let description;
    if (templateName) {
      // Used once the 24h window has passed — same banner/flow as broadcasts.
      const phoneId = integration.config?.phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
      const dbWabaId = integration.config?.wabaId;
      const wabaId = (dbWabaId && dbWabaId !== phoneId) ? dbWabaId : (process.env.META_WA_WABA_ID || dbWabaId || phoneId);
      const token = integration.config?.accessToken || process.env.META_WA_ACCESS_TOKEN;

      const template = await whatsappService.findOrFetchTemplate(templateName, wabaId, token);
      const sendComponents = whatsappService.buildTemplateComponents(template, lead, components);
      const metaTName = template?.metaTemplateName || String(templateName).trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
      const lang = languageCode || template?.language || 'en_US';

      sendResult = await whatsappService.sendTemplateMessage(
        phoneId, token,
        lead.phone, metaTName, lang, sendComponents
      );
      description = `[Template: ${templateName}]`;
    } else {
      if (!text || !text.trim()) return res.status(400).json({ message: 'text is required' });
      sendResult = await whatsappService.sendTextMessage(
        integration.config.phoneNumberId, integration.config.accessToken, lead.phone, text
      );
      description = text;
    }

    lead.activities = lead.activities || [];
    lead.activities.push({
      type: 'whatsapp',
      description,
      direction: 'outbound_agent',
      metaMessageId: sendResult?.messages?.[0]?.id || '',
      deliveryStatus: 'sent',
      performedBy: req.user._id,
    });
    // THIS IS THE KEY TRANSITION: an agent reply moves the lead to "Intervened".
    lead.waStatus = 'intervened';
    lead.lastWaMessageAt = new Date();
    lead.lastWaMessagePreview = description;
    await lead.save();

    res.json({
      lead: { id: lead._id, name: lead.name, phone: lead.phone, waStatus: lead.waStatus },
      activity: lead.activities[lead.activities.length - 1],
    });
  } catch (err) {
    const message = err.response?.data?.error?.message || err.message;
    res.status(500).json({ message });
  }
});

module.exports = router;