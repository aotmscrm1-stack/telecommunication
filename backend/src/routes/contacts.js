const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// GET /api/contacts - list all contacts
router.get('/', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json({ success: true, contacts });
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch contacts', error: err.message });
  }
});

// POST /api/contacts - create single contact
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, identity, segment, source } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required.' });
    }

    const contact = await Contact.create({
      name: String(name).trim(),
      phone: String(phone).trim(),
      email: email ? String(email).trim().toLowerCase() : '',
      identity: identity ? String(identity).trim() : 'SAP FICO',
      segment: segment ? String(segment).trim() : 'New',
      source: source || 'manual'
    });

    res.status(201).json({ success: true, message: 'Contact created successfully', contact });
  } catch (err) {
    console.error('Error creating contact:', err);
    res.status(500).json({ success: false, message: 'Failed to create contact', error: err.message });
  }
});

// POST /api/contacts/save - bulk save contacts from excel/csv
router.post('/save', async (req, res) => {
  try {
    const { contacts: incomingContacts, source } = req.body;
    if (!Array.isArray(incomingContacts) || incomingContacts.length === 0) {
      return res.status(400).json({ success: false, message: 'No contacts provided.' });
    }

    const docsToInsert = incomingContacts.map(c => ({
      name: String(c.name || '').trim(),
      phone: String(c.phone || '').trim(),
      email: c.email ? String(c.email).trim().toLowerCase() : '',
      identity: c.identity ? String(c.identity).trim() : 'SAP FICO',
      segment: c.segment ? String(c.segment).trim() : 'New',
      source: source || 'excel'
    })).filter(c => c.name && c.phone);

    if (docsToInsert.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid contacts to save.' });
    }

    const inserted = await Contact.insertMany(docsToInsert, { ordered: false });
    res.json({
      success: true,
      message: `Successfully imported ${inserted.length} contacts!`,
      count: inserted.length
    });
  } catch (err) {
    console.error('Error bulk saving contacts:', err);
    res.status(500).json({ success: false, message: 'Failed to save contacts', error: err.message });
  }
});

// PUT /api/contacts/:id - update contact
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, email, identity, segment } = req.body;
    const updated = await Contact.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name: String(name).trim() }),
        ...(phone && { phone: String(phone).trim() }),
        ...(email !== undefined && { email: String(email).trim().toLowerCase() }),
        ...(identity && { identity: String(identity).trim() }),
        ...(segment && { segment: String(segment).trim() })
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    res.json({ success: true, message: 'Contact updated successfully', contact: updated });
  } catch (err) {
    console.error('Error updating contact:', err);
    res.status(500).json({ success: false, message: 'Failed to update contact', error: err.message });
  }
});

// DELETE /api/contacts/:id - delete contact
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Contact.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }
    res.json({ success: true, message: 'Contact deleted successfully' });
  } catch (err) {
    console.error('Error deleting contact:', err);
    res.status(500).json({ success: false, message: 'Failed to delete contact', error: err.message });
  }
});

// POST /api/contacts/whatsapp-blast - execute WhatsApp Blast to contacts or leads
router.post('/whatsapp-blast', async (req, res) => {
  try {
    const { template_name, language, contact_ids, lead_ids, sample_values, recipient_type } = req.body;
    const ids = Array.isArray(contact_ids) && contact_ids.length > 0 ? contact_ids : (Array.isArray(lead_ids) ? lead_ids : []);
    
    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No recipients provided for WhatsApp blast.' });
    }

    const Integration = require('../models/Integration');
    const MessageTemplate = require('../models/MessageTemplate');
    const Lead = require('../models/Lead');
    const whatsappService = require('../services/integrations/whatsapp');
    const { toIndiaE164 } = require('../utils/phone');

    // Load recipients
    let recipients = [];
    if (recipient_type === 'leads') {
      recipients = await Lead.find({ _id: { $in: ids } }).lean();
    } else {
      recipients = await Contact.find({
        $or: [
          { _id: { $in: ids.filter(id => id.match(/^[0-9a-fA-F]{24}$/)) } },
          { phone: { $in: ids } }
        ]
      }).lean();

      if (recipients.length === 0) {
        recipients = await Lead.find({ _id: { $in: ids } }).lean();
      }
    }

    if (recipients.length === 0) {
      return res.status(404).json({ success: false, message: 'Selected contacts could not be found.' });
    }

    let integration = await Integration.findOne({ type: 'whatsapp_cloud', status: 'active' });
    if (!integration) integration = await Integration.findOne({ type: 'whatsapp_cloud' });

    const phoneId = integration?.config?.phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
    const accessToken = integration?.config?.accessToken || process.env.META_WA_ACCESS_TOKEN;
    const dbWabaId = integration?.config?.wabaId;
    const wabaId = (dbWabaId && dbWabaId !== phoneId) ? dbWabaId : (process.env.META_WA_WABA_ID || dbWabaId || phoneId);

    const template = await whatsappService.findOrFetchTemplate(template_name, wabaId, accessToken);
    const metaTemplateName = template?.metaTemplateName || String(template_name || 'hello_world').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    const languageCode = language || template?.language || 'en_US';

    let successful = 0;
    let failed = 0;
    const errors = [];

    for (const item of recipients) {
      const rawPhone = item.phone || item.mobile;
      if (!rawPhone) {
        failed++;
        errors.push({ name: item.name, error: 'Missing phone number' });
        continue;
      }

      const toPhone = toIndiaE164(rawPhone);
      if (!toPhone) {
        failed++;
        errors.push({ name: item.name, phone: rawPhone, error: 'Invalid phone format' });
        continue;
      }

      try {
        if (phoneId && accessToken) {
          const sendComponents = await whatsappService.buildTemplateComponents(
            template,
            { name: item.name, phone: toPhone, email: item.email, identity: item.identity },
            null,
            null,
            phoneId,
            accessToken
          );

          await whatsappService.sendTemplateMessage(
            phoneId,
            accessToken,
            toPhone,
            metaTemplateName,
            languageCode,
            sendComponents
          );
        }
        successful++;
      } catch (sendErr) {
        console.warn(`WhatsApp blast error for ${item.name} (${toPhone}):`, sendErr.response?.data || sendErr.message);
        if (phoneId && accessToken) {
          try {
            const fallbackText = template?.message || `Hello ${item.name || ''}, greetings from AOTMS!`;
            await whatsappService.sendTextMessage(phoneId, accessToken, toPhone, fallbackText);
            successful++;
            continue;
          } catch (textErr) {
            // fallback error
          }
        }
        failed++;
        errors.push({ name: item.name, phone: toPhone, error: sendErr.response?.data?.error?.message || sendErr.message });
      }
    }

    res.json({
      success: true,
      message: `WhatsApp blast dispatched to ${successful} ${recipient_type || 'contacts'}!${failed > 0 ? ` (${failed} failed)` : ''}`,
      successful,
      failed,
      errors
    });
  } catch (err) {
    console.error('WhatsApp Blast dispatch failure:', err);
    res.status(500).json({ success: false, message: err.message || 'WhatsApp Blast dispatch failed.' });
  }
});

// POST /api/contacts/send-single-whatsapp - 1-click test sender
router.post('/send-single-whatsapp', async (req, res) => {
  try {
    const { phone, template_name, message } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const { toIndiaE164 } = require('../utils/phone');
    const Integration = require('../models/Integration');
    const whatsappService = require('../services/integrations/whatsapp');

    const toPhone = toIndiaE164(phone);
    if (!toPhone) {
      return res.status(400).json({ success: false, message: 'Invalid 10-digit mobile number.' });
    }

    let integration = await Integration.findOne({ type: 'whatsapp_cloud', status: 'active' });
    if (!integration) integration = await Integration.findOne({ type: 'whatsapp_cloud' });

    const phoneId = integration?.config?.phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
    const accessToken = integration?.config?.accessToken || process.env.META_WA_ACCESS_TOKEN;

    if (phoneId && accessToken) {
      const template = await whatsappService.findOrFetchTemplate(template_name, integration?.config?.wabaId, accessToken);
      if (template) {
        const sendComponents = await whatsappService.buildTemplateComponents(template, { phone: toPhone });
        await whatsappService.sendTemplateMessage(phoneId, accessToken, toPhone, template.metaTemplateName || template_name, template.language || 'en_US', sendComponents);
      } else {
        await whatsappService.sendTextMessage(phoneId, accessToken, toPhone, message || 'Hello from AOTMS WhatsApp Blast Studio!');
      }
    }

    res.json({ success: true, message: `Test message dispatched to +91 ${phone}!` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to send test message.' });
  }
});

module.exports = router;
