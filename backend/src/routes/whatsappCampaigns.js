const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const WhatsAppCampaign = require('../models/WhatsAppCampaign');
const MessageTemplate = require('../models/MessageTemplate');
const Integration = require('../models/Integration');
const whatsappService = require('../services/integrations/whatsapp');
const { normalizePhone10, toIndiaE164 } = require('../utils/phone');
const { protect } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const ok = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ].includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i);
    if (!ok) return cb(new Error('Only Excel (.xlsx, .xls) or CSV files are allowed'));
    cb(null, true);
  },
});

// ── Smart Header & Row Extractor ──────────────────────────────────────────────
function parseExcelToRows(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { contacts: [], totalRows: 0, validRows: 0, invalidRows: 0 };

  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!raw || raw.length === 0) return { contacts: [], totalRows: 0, validRows: 0, invalidRows: 0 };

  // 1. Detect Header Row (search first 10 rows for greatest number of column matches)
  const scanLimit = Math.min(raw.length, 10);
  let bestHeaderIdx = 0;
  let bestScore = -1;

  for (let i = 0; i < scanLimit; i++) {
    const row = (raw[i] || []).map(cell => String(cell).toLowerCase().trim());
    let score = 0;
    row.forEach(cell => {
      if (/identity|id|reg|roll|identifier|code/i.test(cell)) score += 3;
      if (/name|fullname|full_name/i.test(cell)) score += 3;
      if (/phone|mobile|contact|whatsapp/i.test(cell)) score += 3;
      if (/email|email_id|mail/i.test(cell)) score += 3;
      if (cell.length > 0) score += 1;
    });
    if (score > bestScore) {
      bestScore = score;
      bestHeaderIdx = i;
    }
  }

  const rawHeaders = (raw[bestHeaderIdx] || []).map(h => String(h).trim());

  // 2. Identify indices for identity, name, phone, email
  let identityIdx = -1;
  let nameIdx = -1;
  let phoneIdx = -1;
  let emailIdx = -1;

  rawHeaders.forEach((h, idx) => {
    const headerStr = h.toLowerCase();
    if (identityIdx === -1 && /^(identity|id|identifier|roll|student_id|customer_id|emp_id|employee_id|reg_no|registration_no|code)$/i.test(headerStr)) {
      identityIdx = idx;
    } else if (nameIdx === -1 && /^(name|full_name|fullname|student_name|customer_name|contact_name|lead_name)$/i.test(headerStr)) {
      nameIdx = idx;
    } else if (phoneIdx === -1 && /^(phone|mobile|contact|contact_no|phone_number|mobile_number|whatsapp|wa_number)$/i.test(headerStr)) {
      phoneIdx = idx;
    } else if (emailIdx === -1 && /^(email|email_id|mail|e_mail|email_address)$/i.test(headerStr)) {
      emailIdx = idx;
    }
  });

  // Secondary fuzzy header detection if exact match was not found
  rawHeaders.forEach((h, idx) => {
    const headerStr = h.toLowerCase();
    if (identityIdx === -1 && /identity|reg_no|roll_no|emp_id/i.test(headerStr)) identityIdx = idx;
    if (nameIdx === -1 && /name/i.test(headerStr)) nameIdx = idx;
    if (phoneIdx === -1 && /phone|mobile|whatsapp/i.test(headerStr)) phoneIdx = idx;
    if (emailIdx === -1 && /email|mail/i.test(headerStr)) emailIdx = idx;
  });

  // Fallback if headers are generic: col 0 = identity, col 1 = name, col 2 = phone, col 3 = email
  if (identityIdx === -1 && rawHeaders.length > 0) identityIdx = 0;
  if (nameIdx === -1 && rawHeaders.length > 1) nameIdx = 1;
  if (phoneIdx === -1 && rawHeaders.length > 2) phoneIdx = 2;
  if (emailIdx === -1 && rawHeaders.length > 3) emailIdx = 3;

  const contacts = [];
  let validRows = 0;
  let invalidRows = 0;

  for (let i = bestHeaderIdx + 1; i < raw.length; i++) {
    const r = raw[i] || [];
    if (!r.some(c => String(c).trim() !== '')) continue; // Skip completely blank lines

    let rawIdentity = identityIdx !== -1 && r[identityIdx] !== undefined ? String(r[identityIdx]).trim() : '';
    const rawName = nameIdx !== -1 && r[nameIdx] !== undefined ? String(r[nameIdx]).trim() : '';
    const rawPhone = phoneIdx !== -1 && r[phoneIdx] !== undefined ? String(r[phoneIdx]).trim() : '';
    const rawEmail = emailIdx !== -1 && r[emailIdx] !== undefined ? String(r[emailIdx]).trim().toLowerCase() : '';

    if (!rawIdentity && rawName) {
      rawIdentity = `ID-${i + 1}`;
    }

    const cleanPhone = normalizePhone10(rawPhone) || rawPhone.replace(/[^\d+]/g, '');
    const hasValidPhone = cleanPhone && cleanPhone.length >= 7;
    const isValid = Boolean(hasValidPhone && (rawName || rawIdentity));

    const customData = {};
    rawHeaders.forEach((headerName, idx) => {
      if (idx !== identityIdx && idx !== nameIdx && idx !== phoneIdx && idx !== emailIdx && headerName) {
        if (r[idx] !== undefined && String(r[idx]).trim() !== '') {
          customData[headerName] = String(r[idx]).trim();
        }
      }
    });

    if (isValid) {
      validRows++;
    } else {
      invalidRows++;
    }

    contacts.push({
      identity: rawIdentity || `ROW-${i + 1}`,
      name: rawName || 'N/A',
      phone: cleanPhone || rawPhone || 'N/A',
      email: rawEmail || '',
      status: isValid ? 'pending' : 'invalid',
      error: !isValid ? (!hasValidPhone ? 'Invalid or missing phone number' : 'Missing name or identity') : '',
      customData,
    });
  }

  return {
    contacts,
    totalRows: contacts.length,
    validRows,
    invalidRows,
  };
}

// ── GET /api/whatsapp-campaigns/template ──────────────────────────────────────
// Download sample Excel template with identity, name, phone, email headers
router.get('/template', (req, res) => {
  try {
    const templateData = [
      {
        identity: 'EMP001',
        name: 'Rahul Sharma',
        phone: '9876543210',
        email: 'rahul.sharma@example.com',
      },
      {
        identity: 'EMP002',
        name: 'Priya Patel',
        phone: '9876543211',
        email: 'priya.patel@example.com',
      },
      {
        identity: 'EMP003',
        name: 'Amit Kumar',
        phone: '9876543212',
        email: 'amit.kumar@example.com',
      },
      {
        identity: 'EMP004',
        name: 'Sneha Reddy',
        phone: '9876543213',
        email: 'sneha.reddy@example.com',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData, {
      header: ['identity', 'name', 'phone', 'email'],
    });

    // Set column widths
    ws['!cols'] = [
      { wch: 18 }, // identity
      { wch: 24 }, // name
      { wch: 18 }, // phone
      { wch: 30 }, // email
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'WhatsApp_Template');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="whatsapp_campaign_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (err) {
    console.error('Error generating template:', err);
    return res.status(500).json({ message: 'Failed to generate Excel template', error: err.message });
  }
});

// ── POST /api/whatsapp-campaigns/upload ────────────────────────────────────────
// Upload Excel, parse identity/name/phone/email, and store in MongoDB
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an Excel or CSV file' });
    }

    const {
      name,
      description = '',
      templateId = null,
      customMessage = '',
      tags = '',
    } = req.body;

    const parsed = parseExcelToRows(req.file.buffer);

    if (parsed.contacts.length === 0) {
      return res.status(400).json({ message: 'The uploaded file does not contain any valid rows or audience data.' });
    }

    const campaignName = (name || '').trim() || `${req.file.originalname.replace(/\.[^/.]+$/, '')} (${new Date().toLocaleDateString('en-GB')})`;

    const tagList = tags
      ? (Array.isArray(tags) ? tags : String(tags).split(',')).map(t => t.trim()).filter(Boolean)
      : [];

    const campaign = new WhatsAppCampaign({
      name: campaignName,
      description: (description || '').trim(),
      fileName: req.file.originalname,
      fileSize: req.file.size,
      status: 'ready',
      templateRef: templateId || null,
      customMessage: customMessage || '',
      tags: tagList,
      totalCount: parsed.totalRows,
      validCount: parsed.validRows,
      invalidCount: parsed.invalidRows,
      sentCount: 0,
      failedCount: 0,
      contacts: parsed.contacts,
      createdBy: req.user._id,
    });

    await campaign.save();

    res.status(201).json({
      message: 'WhatsApp campaign created and excel data stored in database successfully!',
      campaign: {
        _id: campaign._id,
        name: campaign.name,
        description: campaign.description,
        fileName: campaign.fileName,
        fileSize: campaign.fileSize,
        status: campaign.status,
        totalCount: campaign.totalCount,
        validCount: campaign.validCount,
        invalidCount: campaign.invalidCount,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        createdAt: campaign.createdAt,
        previewContacts: campaign.contacts.slice(0, 10),
      },
    });
  } catch (err) {
    console.error('Error in WhatsApp campaign upload:', err);
    res.status(500).json({ message: err.message || 'Server error while parsing and uploading Excel' });
  }
});

// ── GET /api/whatsapp-campaigns ────────────────────────────────────────────────
// List all WhatsApp campaigns with summary metrics
router.get('/', protect, async (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { fileName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [campaigns, total] = await Promise.all([
      WhatsAppCampaign.find(query)
        .select('-contacts') // Exclude heavy contacts array in list view for super-fast response
        .populate('templateRef', 'name shortcut message type')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      WhatsAppCampaign.countDocuments(query),
    ]);

    // Overall aggregate stats
    const stats = await WhatsAppCampaign.aggregate([
      {
        $group: {
          _id: null,
          totalCampaigns: { $sum: 1 },
          totalContacts: { $sum: '$totalCount' },
          totalSent: { $sum: '$sentCount' },
          totalFailed: { $sum: '$failedCount' },
          totalValid: { $sum: '$validCount' },
        },
      },
    ]);

    res.json({
      campaigns,
      total,
      page: Number(page),
      limit: Number(limit),
      summary: stats[0] || { totalCampaigns: 0, totalContacts: 0, totalSent: 0, totalFailed: 0, totalValid: 0 },
    });
  } catch (err) {
    console.error('Error fetching WhatsApp campaigns:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/whatsapp-campaigns/:id ────────────────────────────────────────────
// Fetch complete campaign details including all contacts
router.get('/:id', protect, async (req, res) => {
  try {
    const campaign = await WhatsAppCampaign.findById(req.params.id)
      .populate('templateRef', 'name shortcut message type')
      .populate('createdBy', 'name email');

    if (!campaign) {
      return res.status(404).json({ message: 'WhatsApp Campaign not found' });
    }

    res.json({ campaign });
  } catch (err) {
    console.error('Error fetching campaign detail:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/whatsapp-campaigns/:id ────────────────────────────────────────────
// Update campaign metadata or custom message
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, description, templateId, customMessage, status, tags } = req.body;
    const campaign = await WhatsAppCampaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ message: 'WhatsApp Campaign not found' });
    }

    if (name !== undefined) campaign.name = name.trim();
    if (description !== undefined) campaign.description = description.trim();
    if (templateId !== undefined) campaign.templateRef = templateId || null;
    if (customMessage !== undefined) campaign.customMessage = customMessage;
    if (status !== undefined) campaign.status = status;
    if (tags !== undefined) {
      campaign.tags = Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean);
    }

    await campaign.save();

    res.json({ message: 'Campaign updated successfully', campaign });
  } catch (err) {
    console.error('Error updating campaign:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/whatsapp-campaigns/:id ─────────────────────────────────────────
// Delete campaign and its contacts
router.delete('/:id', protect, async (req, res) => {
  try {
    const campaign = await WhatsAppCampaign.findByIdAndDelete(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'WhatsApp Campaign not found' });
    }
    res.json({ message: 'WhatsApp Campaign deleted successfully' });
  } catch (err) {
    console.error('Error deleting campaign:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/whatsapp-campaigns/:id/contacts ──────────────────────────────────
// Add single contact manually to existing campaign
router.post('/:id/contacts', protect, async (req, res) => {
  try {
    const { identity, name, phone, email = '' } = req.body;
    if (!identity || !name || !phone) {
      return res.status(400).json({ message: 'Identity, Name, and Phone are required' });
    }

    const campaign = await WhatsAppCampaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'WhatsApp Campaign not found' });
    }

    const cleanPhone = normalizePhone10(phone) || phone.replace(/[^\d+]/g, '');
    const isValid = Boolean(cleanPhone && cleanPhone.length >= 7);

    const newContact = {
      identity: identity.trim(),
      name: name.trim(),
      phone: cleanPhone || phone.trim(),
      email: email.trim().toLowerCase(),
      status: isValid ? 'pending' : 'invalid',
      error: isValid ? '' : 'Invalid phone number format',
    };

    campaign.contacts.push(newContact);
    campaign.totalCount = campaign.contacts.length;
    if (isValid) {
      campaign.validCount += 1;
    } else {
      campaign.invalidCount += 1;
    }

    await campaign.save();

    res.status(201).json({
      message: 'Contact added successfully',
      contact: campaign.contacts[campaign.contacts.length - 1],
      totalCount: campaign.totalCount,
      validCount: campaign.validCount,
    });
  } catch (err) {
    console.error('Error adding contact:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/whatsapp-campaigns/:id/contacts/:contactId ─────────────────────
// Delete a single contact from campaign
router.delete('/:id/contacts/:contactId', protect, async (req, res) => {
  try {
    const campaign = await WhatsAppCampaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'WhatsApp Campaign not found' });
    }

    const contactIndex = campaign.contacts.findIndex(c => c._id.toString() === req.params.contactId);
    if (contactIndex === -1) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    const removed = campaign.contacts[contactIndex];
    campaign.contacts.splice(contactIndex, 1);
    campaign.totalCount = campaign.contacts.length;

    if (removed.status === 'sent') campaign.sentCount = Math.max(0, campaign.sentCount - 1);
    if (removed.status === 'failed') campaign.failedCount = Math.max(0, campaign.failedCount - 1);
    if (removed.status === 'invalid') campaign.invalidCount = Math.max(0, campaign.invalidCount - 1);
    if (removed.status === 'pending') campaign.validCount = Math.max(0, campaign.validCount - 1);

    await campaign.save();

    res.json({ message: 'Contact removed from campaign', totalCount: campaign.totalCount });
  } catch (err) {
    console.error('Error removing contact:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/whatsapp-campaigns/:id/send ──────────────────────────────────────
// Execute / Dispatch WhatsApp Campaign to contacts
router.post('/:id/send', protect, async (req, res) => {
  try {
    const campaign = await WhatsAppCampaign.findById(req.params.id)
      .populate('templateRef');

    if (!campaign) {
      return res.status(404).json({ message: 'WhatsApp Campaign not found' });
    }

    if (campaign.contacts.length === 0) {
      return res.status(400).json({ message: 'Campaign has no contacts to send messages to' });
    }

    // Check if Meta WhatsApp integration is configured
    const integration = await Integration.findOne({ type: 'whatsapp_cloud', status: 'active' });
    const hasIntegration = Boolean(integration && (integration.config?.accessToken || process.env.META_WA_ACCESS_TOKEN));

    campaign.status = 'sending';
    await campaign.save();

    let sent = 0;
    let failed = 0;

    const messageBody = campaign.customMessage || campaign.templateRef?.message || 'Hello {{name}}, greetings from our team!';

    // Process contacts
    for (const contact of campaign.contacts) {
      if (contact.status === 'sent' || contact.status === 'invalid') {
        continue; // Skip already sent or invalid contacts
      }

      try {
        if (hasIntegration) {
          const phoneId = integration.config?.phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
          const token = integration.config?.accessToken || process.env.META_WA_ACCESS_TOKEN;
          const toPhone = toIndiaE164(contact.phone);

          // If template exists, send template message, otherwise send text
          if (campaign.templateRef?.shortcut) {
            await whatsappService.sendTemplateMessage(
              toPhone,
              campaign.templateRef.shortcut,
              'en',
              [{ name: contact.name }],
              phoneId,
              token
            );
          } else {
            const personalized = messageBody
              .replace(/\{\{name\}\}/gi, contact.name || 'Valued Customer')
              .replace(/\{\{identity\}\}/gi, contact.identity || '')
              .replace(/\{\{email\}\}/gi, contact.email || '');

            await whatsappService.sendTextMessage(toPhone, personalized, phoneId, token);
          }
        }

        contact.status = 'sent';
        contact.sentAt = new Date();
        contact.error = '';
        sent++;
      } catch (err) {
        console.warn(`Failed to send WA message to ${contact.phone}:`, err.message);
        contact.status = 'failed';
        contact.error = err.message || 'Delivery failed';
        failed++;
      }
    }

    campaign.sentCount = (campaign.sentCount || 0) + sent;
    campaign.failedCount = (campaign.failedCount || 0) + failed;
    campaign.status = campaign.failedCount > 0 && campaign.sentCount === 0 ? 'failed' : 'completed';
    campaign.completedAt = new Date();

    await campaign.save();

    res.json({
      message: `WhatsApp campaign broadcast completed: ${sent} sent, ${failed} failed.`,
      campaign,
      hasIntegration,
    });
  } catch (err) {
    console.error('Error dispatching WhatsApp campaign:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/whatsapp-campaigns/:id/export ─────────────────────────────────────
// Export campaign audience with latest statuses to Excel
router.get('/:id/export', protect, async (req, res) => {
  try {
    const campaign = await WhatsAppCampaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'WhatsApp Campaign not found' });
    }

    const rows = campaign.contacts.map(c => ({
      Identity: c.identity,
      Name: c.name,
      Phone: c.phone,
      Email: c.email || '',
      Status: c.status,
      Error: c.error || '',
      SentAt: c.sentAt ? new Date(c.sentAt).toLocaleString('en-GB') : '',
      CreatedAt: c.createdAt ? new Date(c.createdAt).toLocaleString('en-GB') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 18 },
      { wch: 24 },
      { wch: 18 },
      { wch: 30 },
      { wch: 14 },
      { wch: 30 },
      { wch: 22 },
      { wch: 22 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Campaign_Audience');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const cleanFileName = campaign.name.replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Disposition', `attachment; filename="${cleanFileName}_audience.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (err) {
    console.error('Error exporting campaign:', err);
    res.status(500).json({ message: 'Failed to export campaign', error: err.message });
  }
});

module.exports = router;
