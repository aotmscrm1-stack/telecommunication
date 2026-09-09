const express = require('express');
const crypto = require('crypto');
const Integration = require('../models/Integration');
const Lead = require('../models/Lead');
const { protect, authorize } = require('../middleware/auth');

const whatsapp = require('../services/integrations/whatsapp');
const knowlarity = require('../services/integrations/knowlarity');
const callerdesk = require('../services/integrations/callerdesk');
const maqsam = require('../services/integrations/maqsam');

const router = express.Router();

const CALL_SERVICES = { knowlarity, callerdesk, maqsam };

const CATALOG = [
  { type: 'whatsapp_cloud', name: 'Whatsapp Cloud API', category: 'webhook', description: 'Integrate WhatsApp Cloud API in your AOTMS account' },
  { type: 'justdial', name: 'JustDial', category: 'generic_webhook', description: 'Auto-import leads from JustDial' },
];

// ---------- Base CRUD ----------

router.get('/catalog', protect, (req, res) => {
  res.json(CATALOG);
});

router.get('/', protect, async (req, res) => {
  try {
    const saved = await Integration.find()
      .populate('defaultCampaign', 'name')
      .populate('defaultAssignedTo', 'name role')
      .sort({ createdAt: -1 });
    const active = saved.filter(i => i.status === 'active');
    const pending = saved.filter(i => i.status !== 'active');
    const savedTypes = new Set(saved.map(i => i.type));
    const available = CATALOG.filter(c => !savedTypes.has(c.type)).map(c => ({
      type: c.type,
      name: c.name,
      description: c.description || `Integrate ${c.name} in your AOTMS account`,
      category: c.category,
    }));
    res.json({ active, pending, available });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------- Public inbound webhook (JustDial, 99acres, Housing, IndiaMart, MagicBricks, Sulekha, TradeIndia) ----------

router.post('/webhook/:webhookKey', async (req, res) => {
  try {
    const integration = await Integration.findOne({ webhookKey: req.params.webhookKey });
    if (!integration) return res.status(404).json({ message: 'Invalid webhook key' });

    const payload = req.body || {};
    const mapping = integration.fieldMapping || {};
    const leadData = {};

    for (const [srcField, leadField] of Object.entries(mapping)) {
      if (leadField && payload[srcField] !== undefined && payload[srcField] !== '') {
        leadData[leadField] = payload[srcField];
      }
    }

    if (!leadData.name || !leadData.phone) {
      const fallbackMap = {
        name: 'name', full_name: 'name', fullName: 'name', customer_name: 'name', customername: 'name',
        phone: 'phone', mobile: 'phone', mobileno: 'phone', mobile_no: 'phone', phone_number: 'phone', contact: 'phone', contact_no: 'phone',
        email: 'email', email_id: 'email', emailid: 'email',
        city: 'location', location: 'location',
      };
      for (const [k, v] of Object.entries(payload)) {
        const key = String(k).toLowerCase();
        if (fallbackMap[key] && !leadData[fallbackMap[key]]) leadData[fallbackMap[key]] = v;
      }
    }

    if (!leadData.phone) {
      await Integration.findByIdAndUpdate(integration._id, { lastAutoSyncError: 'Webhook payload missing phone number' });
      return res.status(400).json({ message: 'Could not map a phone number from payload' });
    }
    if (!leadData.name) leadData.name = 'Unknown';

    const lead = await Lead.create({
      ...leadData,
      leadSource: integration.name,
      status: leadData.status || 'Fresh',
      campaign: integration.defaultCampaign || undefined,
      assignedTo: integration.defaultAssignedTo || undefined,
    });

    await Integration.findByIdAndUpdate(integration._id, {
      $inc: { totalLeadsImported: 1 },
      lastLeadAt: new Date(),
      lastAutoSyncError: '',
      ...(integration.status === 'pending' ? { status: 'active' } : {}),
    });

    res.json({ success: true, leadId: lead._id });
  } catch (err) {
    console.error('Integration webhook error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ---------- Single integration CRUD ----------

router.get('/:id', protect, async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id)
      .populate('defaultCampaign', 'name')
      .populate('defaultAssignedTo', 'name role');
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    res.json(integration);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.user._id };
    if (!data.webhookKey && data.type) {
      data.webhookKey = crypto.randomBytes(16).toString('hex');
    }
    const integration = await Integration.create(data);
    res.status(201).json(integration);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.config?.sheetId) {
      const m = String(body.config.sheetId).trim().match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      body.config = { ...body.config, sheetId: m ? m[1] : String(body.config.sheetId).trim() };
    }
    const integration = await Integration.findByIdAndUpdate(req.params.id, { $set: body }, { new: true })
      .populate('defaultCampaign', 'name')
      .populate('defaultAssignedTo', 'name role');
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    res.json(integration);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const integration = await Integration.findByIdAndDelete(req.params.id);
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    res.json({ message: 'Integration removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/leads', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const integration = await Integration.findById(req.params.id);
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    const query = { leadSource: integration.name };
    const leads = await Lead.find(query)
      .populate('assignedTo', 'name role')
      .populate('campaign', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Lead.countDocuments(query);
    res.json({ leads, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/test-webhook', protect, async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    if (!integration.webhookKey) return res.status(400).json({ message: 'No webhook key set for this integration' });
    const base = process.env.BACKEND_URL || '';
    res.json({ webhookUrl: `${base}/api/integrations/webhook/${integration.webhookKey}`, message: 'Send a test POST with lead fields to this URL' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------- WhatsApp actions ----------

router.post('/:id/whatsapp/send', protect, async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    const { to, message } = req.body;
    const result = await whatsapp.sendTextMessage(integration.config.phoneNumberId, integration.config.accessToken, to, message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/whatsapp/send-template', protect, async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    const { to, templateName, languageCode, components } = req.body;
    const result = await whatsapp.sendTemplateMessage(integration.config.phoneNumberId, integration.config.accessToken, to, templateName, languageCode, components);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/whatsapp/templates', protect, async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    const templates = await whatsapp.getTemplates(integration.config.wabaId, integration.config.accessToken);
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Submit a new template to Meta for approval (Global / .env fallback) ────────
router.post('/whatsapp/templates', protect, async (req, res) => {
  try {
    const MessageTemplate = require('../models/MessageTemplate');
    let integration = await Integration.findOne({ type: 'whatsapp_cloud', status: 'active' });
    if (!integration) integration = await Integration.findOne({ type: 'whatsapp_cloud' });

    const accessToken = integration?.config?.accessToken || process.env.META_WA_ACCESS_TOKEN;
    const phoneId = integration?.config?.phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
    const dbWabaId = integration?.config?.wabaId;
    const wabaId = (dbWabaId && dbWabaId !== phoneId) ? dbWabaId : (process.env.META_WA_WABA_ID || dbWabaId || phoneId);

    if (!accessToken || !wabaId) {
      return res.status(400).json({ message: 'WhatsApp Cloud API credentials (access token & phone number/WABA ID) missing in backend configuration.' });
    }

    const { name, category, language, headerType, headerText, mediaBase64, mediaMimeType, message, footer, buttons } = req.body;
    if (!name || !message) return res.status(400).json({ message: 'name and message are required' });

    const metaTemplateName = String(name).trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    const languageCode = { English: 'en_US', Hindi: 'hi', Telugu: 'te', Tamil: 'ta' }[language] || language || 'en_US';

    const components = [];
    if (headerType === 'Text' && headerText) {
      components.push({ type: 'HEADER', format: 'TEXT', text: headerText });
    } else if (headerType === 'Media') {
      let headerHandle = null;
      if (mediaBase64) {
        const base64Data = mediaBase64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        try {
          headerHandle = await whatsapp.uploadMediaToMeta(buffer, mediaMimeType || 'image/png', accessToken);
        } catch (uploadErr) {
          console.warn('Meta media upload failed:', uploadErr.message);
        }
      }
      if (!headerHandle) {
        const defaultPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        try {
          headerHandle = await whatsapp.uploadMediaToMeta(defaultPng, 'image/png', accessToken);
        } catch (e) {
          console.warn('Default media upload failed:', e.message);
        }
      }
      const headerComp = { type: 'HEADER', format: 'IMAGE' };
      if (headerHandle) {
        headerComp.example = { header_handle: [headerHandle] };
      }
      components.push(headerComp);
    }
    components.push({ type: 'BODY', text: message });
    if (footer) components.push({ type: 'FOOTER', text: footer });
    if (Array.isArray(buttons) && buttons.length) {
      components.push({
        type: 'BUTTONS',
        buttons: buttons.map(b => {
          if (b.type === 'URL') return { type: 'URL', text: b.text, url: b.value };
          if (b.type === 'Phone Number') return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.value };
          return { type: 'QUICK_REPLY', text: b.text };
        }),
      });
    }

    let metaResult;
    try {
      metaResult = await whatsapp.submitTemplate(
        wabaId,
        accessToken,
        { name: metaTemplateName, category: (category || 'MARKETING').toUpperCase(), language: languageCode, components }
      );
    } catch (metaErr) {
      return res.status(400).json({ message: metaErr.response?.data?.error?.message || metaErr.message });
    }

    const template = await MessageTemplate.create({
      type: 'whatsapp',
      shortcut: name,
      message,
      metaTemplateId: metaResult.id,
      metaTemplateName,
      category: (category || 'MARKETING').toUpperCase(),
      language: languageCode,
      components,
      waStatus: metaResult.status || 'PENDING',
      integration: integration?._id || undefined,
      createdBy: req.user._id,
    });

    res.status(201).json({ metaTemplateId: metaResult.id, status: metaResult.status || 'PENDING', template });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Pull latest approval status & import all existing templates from Meta ───
router.post('/whatsapp/templates/sync', protect, async (req, res) => {
  try {
    const MessageTemplate = require('../models/MessageTemplate');
    let integration = await Integration.findOne({ type: 'whatsapp_cloud', status: 'active' });
    if (!integration) integration = await Integration.findOne({ type: 'whatsapp_cloud' });

    const accessToken = integration?.config?.accessToken || process.env.META_WA_ACCESS_TOKEN;
    const phoneId = integration?.config?.phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
    const dbWabaId = integration?.config?.wabaId;
    const wabaId = (dbWabaId && dbWabaId !== phoneId) ? dbWabaId : (process.env.META_WA_WABA_ID || dbWabaId || phoneId);

    if (!accessToken || !wabaId) {
      return res.status(400).json({ message: 'WhatsApp API credentials missing' });
    }

    const metaTemplates = await whatsapp.getTemplates(wabaId, accessToken);
    let updated = 0;
    for (const mt of metaTemplates) {
      const bodyComp = (mt.components || []).find(c => c.type === 'BODY');
      const message = bodyComp?.text || mt.name;

      const result = await MessageTemplate.findOneAndUpdate(
        { $or: [{ metaTemplateId: String(mt.id) }, { metaTemplateName: String(mt.name) }, { shortcut: String(mt.name) }] },
        {
          $set: {
            type: 'whatsapp',
            shortcut: mt.name,
            message,
            isShared: true,
            metaTemplateId: String(mt.id),
            metaTemplateName: mt.name,
            category: mt.category || 'MARKETING',
            language: mt.language || 'en_US',
            components: mt.components || [],
            waStatus: mt.status || 'APPROVED',
            rejectedReason: mt.rejected_reason || '',
          },
          $setOnInsert: {
            createdBy: req.user._id,
          }
        },
        { upsert: true, new: true }
      );
      if (result) updated++;
    }
    res.json({ updated, total: metaTemplates.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Submit a new template to Meta for approval ─────────────────────────────────
// Called by AddTemplateForm on the WhatsApp > Templates tab.
router.post('/:id/whatsapp/templates', protect, async (req, res) => {
  try {
    const MessageTemplate = require('../models/MessageTemplate');
    const integration = await Integration.findById(req.params.id);
    if (!integration) return res.status(404).json({ message: 'Integration not found' });

    const { name, category, language, headerType, headerText, mediaBase64, mediaMimeType, message, footer, buttons } = req.body;
    if (!name || !message) return res.status(400).json({ message: 'name and message are required' });

    // Meta requires lowercase_snake_case, unique template names
    const metaTemplateName = String(name).trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    const languageCode = { English: 'en_US', Hindi: 'hi', Telugu: 'te', Tamil: 'ta' }[language] || language || 'en_US';

    const components = [];
    if (headerType === 'Text' && headerText) {
      components.push({ type: 'HEADER', format: 'TEXT', text: headerText });
    } else if (headerType === 'Media') {
      let headerHandle = null;
      if (mediaBase64) {
        const base64Data = mediaBase64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        try {
          headerHandle = await whatsapp.uploadMediaToMeta(buffer, mediaMimeType || 'image/png', integration.config?.accessToken);
        } catch (uploadErr) {
          console.warn('Meta media upload failed:', uploadErr.message);
        }
      }
      if (!headerHandle) {
        const defaultPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        try {
          headerHandle = await whatsapp.uploadMediaToMeta(defaultPng, 'image/png', integration.config?.accessToken);
        } catch (e) {
          console.warn('Default media upload failed:', e.message);
        }
      }
      const headerComp = { type: 'HEADER', format: 'IMAGE' };
      if (headerHandle) {
        headerComp.example = { header_handle: [headerHandle] };
      }
      components.push(headerComp);
    }
    components.push({ type: 'BODY', text: message });
    if (footer) components.push({ type: 'FOOTER', text: footer });
    if (Array.isArray(buttons) && buttons.length) {
      components.push({
        type: 'BUTTONS',
        buttons: buttons.map(b => {
          if (b.type === 'URL') return { type: 'URL', text: b.text, url: b.value };
          if (b.type === 'Phone Number') return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.value };
          return { type: 'QUICK_REPLY', text: b.text };
        }),
      });
    }

    const targetWabaId = (integration.config?.wabaId && integration.config?.wabaId !== integration.config?.phoneNumberId)
      ? integration.config.wabaId
      : (process.env.META_WA_WABA_ID || integration.config?.wabaId);

    let metaResult;
    try {
      metaResult = await whatsapp.submitTemplate(
        targetWabaId,
        integration.config?.accessToken,
        { name: metaTemplateName, category: (category || 'MARKETING').toUpperCase(), language: languageCode, components }
      );
    } catch (metaErr) {
      return res.status(400).json({ message: metaErr.response?.data?.error?.message || metaErr.message });
    }

    const template = await MessageTemplate.create({
      type: 'whatsapp',
      shortcut: name,
      message,
      metaTemplateId: metaResult.id,
      metaTemplateName,
      category: (category || 'MARKETING').toUpperCase(),
      language: languageCode,
      components,
      waStatus: metaResult.status || 'PENDING',
      integration: integration._id,
      createdBy: req.user._id,
    });

    res.status(201).json({ metaTemplateId: metaResult.id, status: metaResult.status || 'PENDING', template });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Pull latest approval status for all templates from Meta ────────────────────
// Fallback for when the status-update webhook isn't configured yet.
router.post('/:id/whatsapp/templates/sync', protect, async (req, res) => {
  try {
    const MessageTemplate = require('../models/MessageTemplate');
    const integration = await Integration.findById(req.params.id);
    if (!integration) return res.status(404).json({ message: 'Integration not found' });

    const wabaId = (integration.config?.wabaId && integration.config?.wabaId !== integration.config?.phoneNumberId)
      ? integration.config.wabaId
      : (process.env.META_WA_WABA_ID || integration.config?.wabaId);

    const metaTemplates = await whatsapp.getTemplates(wabaId, integration.config?.accessToken);
    let updated = 0;
    for (const mt of metaTemplates) {
      const bodyComp = (mt.components || []).find(c => c.type === 'BODY');
      const message = bodyComp?.text || mt.name;

      const result = await MessageTemplate.findOneAndUpdate(
        { $or: [{ metaTemplateId: String(mt.id) }, { metaTemplateName: String(mt.name) }, { shortcut: String(mt.name) }] },
        {
          $set: {
            type: 'whatsapp',
            shortcut: mt.name,
            message,
            isShared: true,
            metaTemplateId: String(mt.id),
            metaTemplateName: mt.name,
            category: mt.category || 'MARKETING',
            language: mt.language || 'en_US',
            components: mt.components || [],
            waStatus: mt.status || 'APPROVED',
            rejectedReason: mt.rejected_reason || '',
          },
          $setOnInsert: {
            createdBy: req.user._id,
          }
        },
        { upsert: true, new: true }
      );
      if (result) updated++;
    }
    res.json({ updated, total: metaTemplates.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Meta Cloud API webhook (public — verified by hub.verify_token / no CRM auth) ─
// Configure this URL in Meta App Dashboard > WhatsApp > Configuration:
//   Callback URL: {BACKEND_URL}/api/integrations/whatsapp/webhook
//   Verify Token: zest_eat_meta_verify_8f9q2a
router.get('/whatsapp/webhook', async (req, res) => {
  try {
    const q = req.query || {};
    const mode = q['hub.mode'] || q.hub?.mode || q.mode;
    const token = q['hub.verify_token'] || q.hub?.verify_token || q.verify_token;
    const challenge = q['hub.challenge'] || q.hub?.challenge || q.challenge;

    console.log('[WhatsApp Webhook Handshake]', { query: req.query, mode, token, challenge });

    if (challenge) {
      console.log(`[WhatsApp Webhook] Success! Responding challenge: ${challenge}`);
      return res.set('Content-Type', 'text/plain').status(200).send(String(challenge));
    }

    return res.sendStatus(403);
  } catch (err) {
    console.error('[WhatsApp Webhook GET error]:', err);
    res.sendStatus(500);
  }
});

router.post('/whatsapp/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    let integration = await Integration.findOne({ type: 'whatsapp_cloud' });
    if (!integration) {
      integration = {
        _id: 'default',
        type: 'whatsapp_cloud',
        name: 'Whatsapp Cloud API',
        config: {
          accessToken: process.env.META_WA_ACCESS_TOKEN,
          phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID,
        }
      };
    }
    await whatsapp.handleWhatsAppWebhookEvent(req.body, integration);
  } catch (err) {
    console.error('WhatsApp global webhook error:', err.message);
  }
});

router.get('/:id/whatsapp/webhook', async (req, res) => {
  try {
    const q = req.query || {};
    const challenge = q['hub.challenge'] || q.hub?.challenge || q.challenge;
    if (challenge) {
      return res.set('Content-Type', 'text/plain').status(200).send(String(challenge));
    }
    return res.sendStatus(403);
  } catch (err) {
    res.sendStatus(500);
  }
});

router.post('/:id/whatsapp/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const integration = await Integration.findById(req.params.id);
    if (!integration) return;
    await whatsapp.handleWhatsAppWebhookEvent(req.body, integration);
  } catch (err) {
    console.error('WhatsApp webhook processing error:', err.message);
  }
});

// ---------- Calling providers (Knowlarity / CallerDesk / Maqsam) ----------

router.get('/:id/:type/agents', protect, async (req, res) => {
  try {
    const svc = CALL_SERVICES[req.params.type];
    if (!svc) return res.status(400).json({ message: 'Unsupported provider' });
    const integration = await Integration.findById(req.params.id);
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    const agents = await svc.getAgents(integration);
    res.json(agents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/:type/call-logs', protect, async (req, res) => {
  try {
    const svc = CALL_SERVICES[req.params.type];
    if (!svc) return res.status(400).json({ message: 'Unsupported provider' });
    const integration = await Integration.findById(req.params.id);
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    const { startDate, endDate, page, limit } = req.query;
    const logs = req.params.type === 'callerdesk'
      ? await svc.getCallLogs(integration, page, limit)
      : await svc.getCallLogs(integration, startDate, endDate);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/:type/call', protect, async (req, res) => {
  try {
    const svc = CALL_SERVICES[req.params.type];
    if (!svc) return res.status(400).json({ message: 'Unsupported provider' });
    const integration = await Integration.findById(req.params.id);
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    const result = req.params.type === 'maqsam' || req.params.type === 'callerdesk'
      ? await svc.makeCall(integration, req.body.agentExtension, req.body.customerPhone)
      : await svc.makeCall(integration, req.body.callerPhone, req.body.customerPhone, req.body.callerId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;