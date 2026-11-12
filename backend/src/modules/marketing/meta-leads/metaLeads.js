const express = require('express');
const router = express.Router();
const axios = require('axios');
const MetaLead = require('../../../database/models/MetaLead');
const Lead = require('../../../database/models/Lead');
const Blocklist = require('../../../database/models/Blocklist');
const MetaCampaignAssignment = require('../../../database/models/MetaCampaignAssignment');
const MetaSyncState = require('../../../database/models/MetaSyncState');
const User = require('../../../database/models/User');
const Department = require('../../../database/models/Department');
const Integration = require('../../../database/models/Integration');
const { protect } = require('../../../core/middleware/auth');
const { personName, resolveReminderCounsellor } = require('../../../core/utils/counsellor');
const env = require('../../../config/env');
const { broadcastWebSocketEvent } = require('../../../app/websocket');
const { syncAllMetaSheets, parseTabName, deriveStatusFromRow } = require('./googleSheetsSyncService');

const POSITIVE_SUB_STATUSES = [
  "Agreed to Office visit's but no luck",
  "Interested/Need time(After few months) waiting for parents approval",
  "office visit's",
  "Demo attended",
  "Demo not attended-Call Back",
  "time issues/Fee issues",
  "Call back/We will Call"
];

// The call never connected - it gets its own bucket instead of counting as Positive.
const CALL_NOT_ANSWERING_SUB_STATUSES = [
  "Not answering-call back/whats app text"
];

const NEGATIVE_SUB_STATUSES = [
  "Not interested/Time pass",
  "WN-SO-ON",
  "joined another institute/jobs"
];

const ALL_POSITIVE_STATUSES = [
  'Positive',
  'Converted',
  'Won',
  'Contacted',
  'Interested',
  'Enrolled',
  'Demo',
  'Follow-up',
  ...POSITIVE_SUB_STATUSES
];

const ALL_CALL_NOT_ANSWERING_STATUSES = [
  'Call Not Answering',
  ...CALL_NOT_ANSWERING_SUB_STATUSES
];

const ALL_NEGATIVE_STATUSES = [
  'Negative',
  'Discarded',
  'Lost',
  'Blocked',
  'Not Interested',
  'Not Answered',
  'Call Not Responding',
  ...NEGATIVE_SUB_STATUSES
];

// Helper to determine if user has strict Global Admin access
function isExecutiveOrAdminUser(user) {
  if (!user) return false;
  const role = String(user.role || '').trim().toLowerCase();
  const d = String(user.designation || '').trim().toUpperCase();
  const dn = String(user.displayName || '').trim().toUpperCase();

  // Explicit Admin / Superadmin role
  if (role === 'admin' || role === 'superadmin') return true;

  // Explicit Admin / MD / CEO designation
  if (
    d === 'ADMIN' ||
    d === 'ADMINISTRATOR' ||
    d === 'MD' ||
    d.includes('MANAGING DIRECTOR') ||
    d === 'CEO' ||
    d === 'CTO' ||
    dn === 'ADMIN' ||
    dn.includes('MANAGING DIRECTOR')
  ) {
    return true;
  }

  return false;
}

// Scoping: Strictly Admin sees all Meta Leads; Managers & Employees see ONLY their assigned Meta Leads
function canViewAllMetaLeads(user) {
  if (!user) return false;
  return isExecutiveOrAdminUser(user);
}

function cleanLeadName(rawName) {
  if (!rawName || typeof rawName !== 'string') return '';
  let str = rawName;

  // 1. Remove mojibake sequences of ZWNJ / ZWJ / BOM that got decoded as Windows-1252
  str = str.replace(/â€Œ/g, '')
           .replace(/â€‹/g, '')
           .replace(/â€/g, '')
           .replace(/ï»¿/g, '');

  // 2. Remove leading/trailing or repeated â characters if they are artifacts of zero-width mojibake
  str = str.replace(/^[\sâ\u00e2\uFFFD\u200B-\u200F\u202A-\u202E\uFEFF\u00A0]+/, '');
  str = str.replace(/[\sâ\u00e2\uFFFD\u200B-\u200F\u202A-\u202E\uFEFF\u00A0]+$/, '');

  // 3. Remove zero-width characters (\u200B = zero width space, \uFEFF = BOM, \u200E / \u200F = directional marks)
  str = str.replace(/[\u200B\uFEFF\u200E\u200F\u2060]/g, '');

  // Remove zero-width non-joiners (\u200C) or joiners (\u200D) unless between Indic virama and Indic character
  str = str.replace(/[\u200C\u200D]+/g, (match, offset, full) => {
    const prevChar = offset > 0 ? full[offset - 1] : '';
    const nextChar = offset + match.length < full.length ? full[offset + match.length] : '';
    const isIndic = (c) => c && c.charCodeAt(0) >= 0x0900 && c.charCodeAt(0) <= 0x0D7F;
    if (isIndic(prevChar) && isIndic(nextChar)) {
      return match;
    }
    return '';
  });

  // 4. Normalize multiple spaces
  str = str.replace(/\s+/g, ' ').trim();

  // 5. If word is lowercase Latin (like "shyam"), capitalize properly ("Shyam")
  if (/^[a-z]+(\s+[a-z]+)*$/.test(str)) {
    str = str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  return str;
}

// Normalize phone numbers consistently to 10 standard digits
function normalize10DigitPhone(rawPhone) {
  if (!rawPhone) return '';
  const str = String(rawPhone).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    const last10 = digits.slice(-10);
    if (/^[6-9]\d{9}$/.test(last10)) return last10;
  }
  if (digits.length > 10) {
    const last10 = digits.slice(-10);
    if (/^[6-9]\d{9}$/.test(last10)) return last10;
  }
  return digits.length >= 7 ? digits : '';
}

// Helper to extract phone/email/name/metaLeadId from dynamic rawData object
function extractCoreIdentifiers(rawData = {}) {
  if (!rawData || typeof rawData !== 'object') {
    return { isEmptyRow: true, phone: '', normalizedPhone: '', email: '', fullName: '', metaLeadId: '' };
  }

  // 1. Meta Lead ID
  let metaLeadId = rawData.id || rawData.lead_id || rawData.leadgen_id || rawData.Meta_Lead_ID || rawData['Lead ID'] || rawData.leadId || '';
  if (typeof metaLeadId === 'string') metaLeadId = metaLeadId.trim();

  // If in mangled keys (e.g. key 'l:1112700817794449'), value is the lead id (e.g. 'l:1639779437607642')
  if (!metaLeadId || metaLeadId === 'id' || metaLeadId === 'lead_id') {
    const mangledIdKey = Object.keys(rawData).find(k => k.startsWith('l:') || k.toLowerCase().includes('lead_id'));
    if (mangledIdKey && rawData[mangledIdKey] && String(rawData[mangledIdKey]).trim().startsWith('l:')) {
      metaLeadId = String(rawData[mangledIdKey]).trim();
    } else {
      const foundVal = Object.values(rawData).find(v => typeof v === 'string' && /^l:\d+$/.test(v.trim()));
      if (foundVal) metaLeadId = foundVal.trim();
    }
  }

  // 2. Phone Number
  let phone = rawData.phone_number || rawData.phone || rawData.Phone || rawData.mobile || rawData.Mobile 
    || rawData['Phone Number'] || rawData.Contact || rawData['Contact Number'] || rawData.whatsapp_number || '';
  if (typeof phone === 'string') phone = phone.trim();

  // If in mangled keys (e.g. key 'p:+919550160911'), value is the actual phone
  if (!phone || phone === 'phone_number' || phone === 'phone') {
    const mangledPhoneKey = Object.keys(rawData).find(k => k.startsWith('p:') || k.toLowerCase().includes('phone'));
    if (mangledPhoneKey && rawData[mangledPhoneKey]) {
      phone = String(rawData[mangledPhoneKey]).trim();
    } else {
      const foundVal = Object.values(rawData).find(v => typeof v === 'string' && (v.trim().startsWith('p:') || normalize10DigitPhone(v).length === 10));
      if (foundVal) phone = foundVal.trim();
    }
  }

  const normalizedPhone = normalize10DigitPhone(phone);

  // 3. Email
  let email = rawData.email || rawData.Email || rawData['Email Address'] || rawData['email_address'] || '';
  if (typeof email === 'string') email = email.trim().toLowerCase();
  if (!email || email === 'email' || !email.includes('@')) {
    const foundEmail = Object.values(rawData).find(v => typeof v === 'string' && v.includes('@') && v.includes('.') && !v.includes(' '));
    if (foundEmail) email = foundEmail.trim().toLowerCase();
    else email = '';
  }

  // 4. Full Name
  let fullName = rawData.full_name || rawData.name || rawData.Name || rawData['Full Name'] || rawData['Candidate Name'] || rawData['Student Name'] || '';
  if (typeof fullName === 'string') fullName = fullName.trim();
  if (!fullName || fullName === 'full_name' || fullName === 'name') {
    if (rawData['Bhavani'] && typeof rawData['Bhavani'] === 'string' && rawData['Bhavani'] !== 'full_name') {
      fullName = rawData['Bhavani'].trim();
    } else if (rawData['Aman Shaik'] && typeof rawData['Aman Shaik'] === 'string' && rawData['Aman Shaik'] !== 'full_name') {
      fullName = rawData['Aman Shaik'].trim();
    } else {
      for (const [k, v] of Object.entries(rawData)) {
        if (typeof v === 'string' && v.trim().length >= 2 && v.trim().length <= 50) {
          const s = v.trim();
          if (!s.includes('@') && !s.startsWith('p:') && !s.startsWith('ag:') && !s.startsWith('as:') &&
              !s.startsWith('c:') && !s.startsWith('f:') && !s.startsWith('l:') && !s.startsWith('202') &&
              !s.toLowerCase().includes('call') && !s.toLowerCase().includes('lead') &&
              !s.toLowerCase().includes('workshop') && !s.toLowerCase().includes('created') &&
              !s.toLowerCase().includes('immediately') && !s.toLowerCase().includes('exploring')) {
            const lk = k.toLowerCase();
            if (lk.includes('name') || lk === 'aman shaik' || lk === 'bhavani') {
              fullName = s;
              break;
            }
          }
        }
      }
    }
  }
  fullName = cleanLeadName(fullName);
  if (!fullName) fullName = 'Unknown Lead';

  // 5. City / Location
  let city = rawData.city || rawData.City || rawData.location || rawData.Location || rawData.town || rawData.Town || '';
  if (typeof city === 'string') city = city.trim();
  if (!city || city.toLowerCase() === 'city' || city.toLowerCase() === 'location') {
    for (const [k, v] of Object.entries(rawData)) {
      if (typeof v === 'string' && v.trim()) {
        const lk = k.toLowerCase().trim();
        if (lk === 'city' || lk === 'location' || lk === 'town' || lk.includes('city') || lk.includes('location')) {
          if (v.trim().toLowerCase() !== 'city' && v.trim().toLowerCase() !== 'location') {
            city = v.trim();
            break;
          }
        }
      }
    }
  }

  // 6. Interested / Course
  let interested = rawData.interested || rawData.Interested || rawData.intersted || rawData.Intersted || rawData.course || rawData.Course || rawData['Interested In'] || rawData['interested_in'] || rawData.subject || rawData.program || rawData['which_sap_module_are_you_interested_in'] || '';
  if (typeof interested === 'string') interested = interested.trim();
  if (!interested) {
    for (const [k, v] of Object.entries(rawData)) {
      if (/intere?st|course|program|module/i.test(k) && typeof v === 'string' && v.trim()) {
        interested = v.trim();
        break;
      }
    }
  }

  // 7. Empty or Inverted Header Row Check
  const isHeaderRow = (metaLeadId === 'id' || metaLeadId === 'lead_id') 
    || (phone === 'phone_number' || phone === 'phone')
    || (fullName === 'full_name');

  const isEmptyRow = isHeaderRow || (!metaLeadId && !normalizedPhone && !email && (fullName === 'Unknown Lead' || !fullName));

  return {
    metaLeadId: metaLeadId && metaLeadId !== 'id' ? metaLeadId : '',
    phone: phone && phone !== 'phone_number' ? phone : '',
    normalizedPhone,
    email: email && email !== 'email' ? email : '',
    fullName,
    city: city || '',
    interested: interested || '',
    isEmptyRow
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/meta-leads (Ingestion from Google Sheets Apps Script / Webhook / Manual)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    let payload = req.body;
    if (!payload) {
      return res.status(400).json({ success: false, message: 'Request body is empty' });
    }

    // Support explicit delete action
    if (payload.action === 'delete') {
      const campaign = payload.campaign || payload.campaign_name || payload.tab;
      const { metaLeadId, phone, normalizedPhone, email } = extractCoreIdentifiers(payload.rawData || payload);
      const filter = {};
      if (campaign) filter.campaign = campaign;
      const orConditions = [];
      if (payload.leadId) orConditions.push({ _id: payload.leadId });
      if (metaLeadId) orConditions.push({ metaLeadId });
      if (normalizedPhone) orConditions.push({ normalizedPhone }, { phone });
      if (email) orConditions.push({ email });
      if (orConditions.length > 0) {
        filter.$or = orConditions;
        const delRes = await MetaLead.deleteMany(filter);
        const deletedCount = delRes.deletedCount || 0;
        try {
          broadcastWebSocketEvent('meta_leads:changed', {
            deletedCount,
            campaign: campaign || 'Meta Campaign',
            timestamp: Date.now()
          });
        } catch (_) {}
        return res.status(200).json({
          success: true,
          message: `Deleted ${deletedCount} lead(s) successfully`,
          deletedCount
        });
      }
    }

    // Support single item, raw array, or structured batch ({ campaign, isFullTabSync, leads: [...] })
    let items = [];
    let isFullTabSync = false;
    let campaignScope = null;

    if (Array.isArray(payload)) {
      items = payload;
    } else if (payload && Array.isArray(payload.leads)) {
      items = payload.leads;
      isFullTabSync = Boolean(payload.isFullTabSync);
      campaignScope = payload.campaign || (items[0] && items[0].campaign);
    } else if (payload && Array.isArray(payload.data)) {
      items = payload.data;
      isFullTabSync = Boolean(payload.isFullTabSync);
      campaignScope = payload.campaign || (items[0] && items[0].campaign);
    } else if (payload && typeof payload === 'object') {
      items = [payload];
      isFullTabSync = Boolean(payload.isFullTabSync);
      campaignScope = payload.campaign;
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let deletedCount = 0;
    const activeLeadIds = [];
    const results = [];

    for (const item of items) {
      const campaign = item.campaign || item.campaign_name || item.tab || campaignScope || 'General_Meta_Leads';
      const source = item.source || 'google_sheets_apps_script';
      const rawData = item.rawData || item;

      // Extract structured identifiers
      const { metaLeadId, phone, normalizedPhone, email, fullName, city, isEmptyRow } = extractCoreIdentifiers(rawData);

      // Skip blank rows or accidental header rows
      if (isEmptyRow) {
        skippedCount++;
        continue;
      }

      // Build deduplication lookup with strict campaign scope:
      // Priority 1: Meta Lead ID
      // Priority 2: Normalized Phone Number (10 digits)
      // Priority 3: Email Address
      let existing = null;

      if (metaLeadId) {
        existing = await MetaLead.findOne({
          campaign,
          $or: [
            { metaLeadId: metaLeadId },
            { 'rawData.id': metaLeadId },
            { 'rawData.lead_id': metaLeadId },
            { ['rawData.l:1112700817794449']: metaLeadId }
          ]
        });
      }

      if (!existing && normalizedPhone && normalizedPhone.length === 10) {
        existing = await MetaLead.findOne({
          campaign,
          $or: [
            { normalizedPhone: normalizedPhone },
            { phone: phone },
            { 'rawData.phone_number': phone },
            { 'rawData.phone': phone },
            { 'rawData.Phone': phone },
            { 'rawData.mobile': phone },
            { ['rawData.p:+919550160911']: phone }
          ]
        });
      }

      if (!existing && email && email.includes('@')) {
        existing = await MetaLead.findOne({
          campaign,
          $or: [
            { email: email },
            { 'rawData.email': email },
            { 'rawData.Email': email }
          ]
        });
      }

      // Strictly allow Name, Phone, Email, Location, Interested
      const allowedRawData = {
        full_name: fullName,
        email: email || '',
        phone_number: phone || normalizedPhone,
        city: city || '',
        interested: interested || '',
        course: interested || '',
        name: fullName,
        phone: phone || normalizedPhone,
        location: city || ''
      };

      const derived = deriveStatusFromRow(rawData);

      if (existing) {
        // PRESERVE CRM-MANAGED FIELDS; if currently 'New', assign derived sheet status
        if ((!existing.status || existing.status === 'New') && derived.status !== 'New') {
          existing.status = derived.status;
        }
        if (derived.text) {
          existing.notes = existing.notes || [];
          const alreadyHasNote = existing.notes.some(n => n.text && n.text.includes(derived.text));
          if (!alreadyHasNote) {
            existing.notes.push({ text: `Sheet Update: ${derived.text}`, createdAt: new Date() });
          }
        }
        existing.metaLeadId = metaLeadId || existing.metaLeadId || undefined;
        existing.phone = phone || existing.phone || undefined;
        existing.normalizedPhone = normalizedPhone || existing.normalizedPhone || undefined;
        existing.email = email || existing.email || undefined;
        if (city) existing.city = city;
        if (interested) {
          existing.interested = interested;
          existing.course = interested;
        }
        if (fullName && fullName !== 'Unknown Lead') {
          existing.fullName = fullName;
        }
        existing.rawData = allowedRawData;
        existing.syncedAt = new Date();
        existing.source = source || existing.source;

        await existing.save();
        results.push(existing);
        activeLeadIds.push(existing._id);
        updatedCount++;
      } else {
        const initialNotes = derived.text ? [{ text: `Sheet Update: ${derived.text}`, createdAt: new Date() }] : [];
        const created = await MetaLead.create({
          campaign,
          source,
          metaLeadId: metaLeadId || undefined,
          phone: phone || undefined,
          normalizedPhone: normalizedPhone || undefined,
          email: email || undefined,
          city: city || undefined,
          interested: interested || undefined,
          course: interested || undefined,
          fullName: fullName || 'Unknown Lead',
          rawData: allowedRawData,
          status: derived.status || 'New',
          notes: initialNotes,
          syncedAt: new Date()
        });
        results.push(created);
        activeLeadIds.push(created._id);
        insertedCount++;

        // Automated Outpero AI Voice Calling for new incoming lead
        try {
          const { outpero } = require('../../../integrations/calling');
          outpero.dispatchLeadToOutpero({
            name: created.fullName,
            phone: created.phone || created.normalizedPhone,
            course: campaign || 'SAP',
            campaign: campaign,
          }).catch(err => console.error('[Outpero MetaLead Dispatch Error]:', err.message));
        } catch (_) {}
      }
    }

    // Full Tab Sync: Erase any leads from this campaign in DB that were deleted from Google Sheet
    if (isFullTabSync && campaignScope) {
      if (activeLeadIds.length > 0) {
        const delRes = await MetaLead.deleteMany({
          campaign: campaignScope,
          _id: { $nin: activeLeadIds }
        });
        deletedCount = delRes.deletedCount || 0;
        if (deletedCount > 0) {
          console.log(`[MetaLeads Apps Script Sync] Erased ${deletedCount} deleted lead(s) from campaign "${campaignScope}" that were removed from Google Sheet.`);
        }
      } else if (items.length === 0) {
        // Sheet tab has 0 leads left -> delete all leads in that campaign
        const delRes = await MetaLead.deleteMany({ campaign: campaignScope });
        deletedCount = delRes.deletedCount || 0;
      }
    }

    // Update MetaSyncState tracking
    try {
      await MetaSyncState.findOneAndUpdate(
        { key: 'meta_leads_sync' },
        {
          $inc: {
            totalProcessed: items.length,
            insertedCount,
            updatedCount,
            skippedCount
          },
          $set: {
            lastFinishedAt: new Date(),
            message: `Ingested ${items.length} leads (${insertedCount} new, ${updatedCount} updated, ${deletedCount} deleted, ${skippedCount} skipped)`
          }
        },
        { upsert: true }
      );
    } catch (_) {}

    // Real-time WebSocket broadcast so live dashboard & panels update instantaneously
    try {
      broadcastWebSocketEvent('meta_leads:changed', {
        insertedCount,
        updatedCount,
        deletedCount,
        skippedCount,
        totalProcessed: items.length,
        campaign: campaignScope || items[0]?.campaign || 'Meta Campaign',
        timestamp: Date.now()
      });
      if (insertedCount > 0) {
        broadcastWebSocketEvent('lead:created', {
          source: 'meta_leads',
          insertedCount,
          timestamp: Date.now()
        });
      }
    } catch (_) {}

    res.status(201).json({
      success: true,
      message: `Processed ${items.length} lead(s). (${insertedCount} new, ${updatedCount} synced/updated, ${deletedCount} deleted, ${skippedCount} skipped)`,
      totalProcessed: items.length,
      insertedCount,
      updatedCount,
      deletedCount,
      skippedCount
    });
  } catch (err) {
    console.error('MetaLeads Ingestion Error:', err);
    res.status(500).json({ success: false, message: 'Failed to ingest meta leads', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/meta-leads/my-assignment-status (Check current user assignment & access)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my-assignment-status', protect, async (req, res) => {
  try {
    const canSeeAll = canViewAllMetaLeads(req.user);
    if (canSeeAll) {
      return res.json({
        success: true,
        hasAccess: true,
        isAdmin: true,
        assignedCount: 'all',
        assignedCampaigns: []
      });
    }

    // Check assignments for this specific employee
    let userFilter = [req.user._id];
    const userAssignments = await MetaCampaignAssignment.find({
      assignedUsers: { $in: userFilter }
    }).select('campaign').lean();

    const assignedCampaigns = userAssignments.map(a => a.campaign);
    const hasAccess = assignedCampaigns.length > 0;

    return res.json({
      success: true,
      hasAccess,
      isAdmin: false,
      assignedCount: assignedCampaigns.length,
      assignedCampaigns
    });
  } catch (err) {
    console.error('Error checking user assignment status:', err);
    res.status(500).json({ success: false, message: 'Failed to verify assignment status', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/meta-leads/assignments (List all campaign employee assignments)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/assignments', protect, async (req, res) => {
  try {
    const assignments = await MetaCampaignAssignment.find({})
      .populate('assignedUsers', 'name email designation department avatar status')
      .populate('assignedBy', 'name email')
      .sort({ campaign: 1 })
      .lean();

    res.json({
      success: true,
      assignments
    });
  } catch (err) {
    console.error('Error fetching campaign assignments:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch assignments', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/meta-leads/assignments (Assign single or multiple employees to a campaign)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/assignments', protect, async (req, res) => {
  try {
    if (!isExecutiveOrAdminUser(req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin access required to assign members.' });
    }

    const { campaign, userIds } = req.body;
    if (!campaign || !String(campaign).trim()) {
      return res.status(400).json({ success: false, message: 'Campaign name is required.' });
    }

    const trimmedCampaign = String(campaign).trim();
    const cleanUserIds = Array.isArray(userIds) ? userIds.filter(id => id && String(id).trim()) : [];

    const assignment = await MetaCampaignAssignment.findOneAndUpdate(
      { campaign: trimmedCampaign },
      {
        assignedUsers: cleanUserIds,
        assignedBy: req.user._id,
        updatedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .populate('assignedUsers', 'name email designation department avatar status')
      .populate('assignedBy', 'name email');

    res.json({
      success: true,
      message: `Successfully assigned ${cleanUserIds.length} member(s) to campaign "${trimmedCampaign}"`,
      assignment
    });
  } catch (err) {
    console.error('Error saving campaign assignment:', err);
    res.status(500).json({ success: false, message: 'Failed to save campaign assignment', error: err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// AI Calling Controls for Meta Campaigns
// ─────────────────────────────────────────────────────────────────────────────
router.get('/campaign/:campaign/ai-status', protect, async (req, res) => {
  try {
    const { campaign } = req.params;
    const assignment = await MetaCampaignAssignment.findOne({ campaign }).lean();
    const inProgress = await MetaLead.countDocuments({ campaign, status: 'In Progress' });
    const queued = await MetaLead.countDocuments({ campaign, status: 'New' });
    const completedToday = await MetaLead.countDocuments({
      campaign,
      status: { $in: ['Converted', 'Follow-up', 'Closed'] },
      updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    res.json({
      success: true,
      aiCallingEnabled: assignment?.aiCallingEnabled || false,
      aiConcurrencyLimit: assignment?.aiConcurrencyLimit || 5,
      inProgress,
      queued,
      completedToday
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/campaign/:campaign/ai-start', protect, async (req, res) => {
  try {
    const { campaign } = req.params;
    const { aiConcurrencyLimit = 5 } = req.body;
    const assignment = await MetaCampaignAssignment.findOneAndUpdate(
      { campaign },
      {
        $set: {
          aiCallingEnabled: true,
          aiConcurrencyLimit: Number(aiConcurrencyLimit) || 5,
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({
      success: true,
      message: `AI Calling started for campaign "${campaign}" with ${assignment.aiConcurrencyLimit} concurrent calls`,
      aiCallingEnabled: true,
      aiConcurrencyLimit: assignment.aiConcurrencyLimit
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/campaign/:campaign/ai-pause', protect, async (req, res) => {
  try {
    const { campaign } = req.params;
    await MetaCampaignAssignment.findOneAndUpdate(
      { campaign },
      {
        $set: {
          aiCallingEnabled: false,
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({
      success: true,
      message: `AI Calling paused for campaign "${campaign}"`,
      aiCallingEnabled: false
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/meta-leads/campaigns (Returns distinct campaigns with lead counts & assignees)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/campaigns', protect, async (req, res) => {
  try {
    const isAdmin = canViewAllMetaLeads(req.user);
    let allowedCampaigns = null;

    if (!isAdmin) {
      let userFilter = [req.user._id];
      // Find campaigns assigned to this user
      const userAssignments = await MetaCampaignAssignment.find({
        assignedUsers: { $in: userFilter }
      }).select('campaign').lean();

      allowedCampaigns = userAssignments.map(a => a.campaign);

      if (allowedCampaigns.length === 0) {
        return res.json({
          success: true,
          isAdmin: false,
          isRestricted: true,
          totalLeads: 0,
          totalCampaigns: 0,
          campaigns: [],
          allowedCampaigns: [],
          message: 'No campaigns assigned to your profile yet. Please contact your CRM Administrator.'
        });
      }
    }

    // Build aggregation match filter
    const matchStage = allowedCampaigns ? { $match: { campaign: { $in: allowedCampaigns } } } : null;
    const pipeline = [];
    if (matchStage) pipeline.push(matchStage);

    pipeline.push(
      {
        $group: {
          _id: '$campaign',
          count: { $sum: 1 },
          lastSynced: { $max: '$syncedAt' },
          newCount: {
            $sum: { $cond: [{ $eq: ['$status', 'New'] }, 1, 0] }
          },
          positiveCount: {
            $sum: { $cond: [{ $in: ['$status', ALL_POSITIVE_STATUSES] }, 1, 0] }
          },
          callNotAnsweringCount: {
            $sum: { $cond: [{ $in: ['$status', ALL_CALL_NOT_ANSWERING_STATUSES] }, 1, 0] }
          },
          negativeCount: {
            $sum: { $cond: [{ $in: ['$status', ALL_NEGATIVE_STATUSES] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    );

    const stats = await MetaLead.aggregate(pipeline);

    // Fetch all assignments to populate assignedUsers for each campaign
    const assignmentQuery = allowedCampaigns ? { campaign: { $in: allowedCampaigns } } : {};
    const assignments = await MetaCampaignAssignment.find(assignmentQuery)
      .populate('assignedUsers', 'name email designation department avatar status')
      .lean();

    const assignmentMap = {};
    assignments.forEach(a => {
      assignmentMap[a.campaign] = a.assignedUsers || [];
    });

    const campaigns = stats.map(s => {
      const pos = s.positiveCount || 0;
      const cna = s.callNotAnsweringCount || 0;
      const neg = s.negativeCount || 0;
      const pending = Math.max(0, s.count - pos - cna - neg);
      return {
        campaign: s._id,
        count: s.count,
        lastSynced: s.lastSynced,
        newCount: s.newCount,
        positiveCount: pos,
        callNotAnsweringCount: cna,
        negativeCount: neg,
        pendingCount: pending,
        assignedUsers: assignmentMap[s._id] || []
      };
    });

    // Merge all sheet sources from Google Sheets integration so newly added or 0-lead sheets are immediately visible in Meta Leads!
    const googleIntegration = await Integration.findOne({ type: 'google_sheets' }).lean();
    const sheetSources = googleIntegration?.config?.sheetSources || [];
    for (const src of sheetSources) {
      const tabName = parseTabName(src.sheetRange, src.name);
      const campName = src.campaign || src.name || tabName;
      if (campName && !campaigns.some(c => c.campaign === campName)) {
        if (!allowedCampaigns || allowedCampaigns.includes(campName)) {
          campaigns.push({
            campaign: campName,
            count: 0,
            lastSynced: null,
            newCount: 0,
            positiveCount: 0,
            callNotAnsweringCount: 0,
            negativeCount: 0,
            pendingCount: 0,
            assignedUsers: assignmentMap[campName] || []
          });
        }
      }
    }

    // If an assigned campaign doesn't have leads in MetaLead yet, include it so the tele-caller can see the tab
    if (allowedCampaigns) {
      allowedCampaigns.forEach(ac => {
        if (!campaigns.find(c => c.campaign === ac)) {
          campaigns.push({
            campaign: ac,
            count: 0,
            lastSynced: null,
            newCount: 0,
            positiveCount: 0,
            callNotAnsweringCount: 0,
            negativeCount: 0,
            pendingCount: 0,
            assignedUsers: assignmentMap[ac] || []
          });
        }
      });
    }

    const totalLeads = campaigns.reduce((acc, c) => acc + c.count, 0);

    res.json({
      success: true,
      isAdmin,
      isRestricted: !isAdmin,
      totalLeads,
      totalCampaigns: campaigns.length,
      campaigns,
      allowedCampaigns: allowedCampaigns || []
    });
  } catch (err) {
    console.error('Error fetching meta campaigns:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch campaigns', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/meta-leads/departments (Returns department-wise meta lead breakdown)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/departments', protect, async (req, res) => {
  try {
    const isAdmin = canViewAllMetaLeads(req.user);
    if (!isAdmin) {
      const userAssignments = await MetaCampaignAssignment.find({
        assignedUsers: req.user._id
      }).select('campaign').lean();
      const userCampaigns = userAssignments.map(a => a.campaign);
      
      const deptName = req.user.department || 'Telecalling';
      const userScope = {
        $or: [
          ...(userCampaigns.length > 0 ? [{ campaign: { $in: userCampaigns } }] : []),
          { assignedTo: req.user._id },
          { addedBy: req.user._id }
        ]
      };

      const [totalLeads, freshLeads, contactedLeads, convertedLeads] = await Promise.all([
        MetaLead.countDocuments(userScope.$or.length > 0 ? userScope : { _id: null }),
        MetaLead.countDocuments({ status: 'New', ...(userScope.$or.length > 0 ? userScope : { _id: null }) }),
        MetaLead.countDocuments({ status: 'Contacted', ...(userScope.$or.length > 0 ? userScope : { _id: null }) }),
        MetaLead.countDocuments({ status: 'Converted', ...(userScope.$or.length > 0 ? userScope : { _id: null }) })
      ]);

      return res.json({
        success: true,
        isAdmin: false,
        isRestricted: true,
        departments: [
          {
            name: deptName,
            campaigns: userCampaigns,
            userCount: 1,
            users: [{ id: req.user._id, name: req.user.name, displayName: req.user.displayName || req.user.name, designation: req.user.designation }],
            totalLeads,
            freshLeads,
            contactedLeads,
            convertedLeads
          }
        ]
      });
    }

    const depts = await Department.find({}).lean();
    const deptList = depts.length ? depts.map(d => d.name) : ['HR', 'Telecalling', 'Marketing', 'Trainer', 'Developer'];
    if (!deptList.includes('Telecalling')) deptList.push('Telecalling');

    const results = [];
    for (const d of deptList) {
      const isTelecalling = /telecall/i.test(d);
      const users = await User.find({
        $or: [
          { department: new RegExp('^' + d + '$', 'i') },
          { designation: new RegExp(d, 'i') },
          { displayName: new RegExp(d, 'i') },
          ...(isTelecalling ? [
            { designation: /counsellor|telecaller/i },
            { displayName: /counsellor|telecaller/i }
          ] : [])
        ]
      }).select('_id name department designation displayName').lean();

      const uIds = users.map(u => u._id);
      const asg = await MetaCampaignAssignment.find({ assignedUsers: { $in: uIds } }).select('campaign').lean();
      const camps = asg.map(a => a.campaign);

      const [totalLeads, freshLeads, contactedLeads, convertedLeads] = await Promise.all([
        MetaLead.countDocuments({
          $or: [
            { campaign: { $in: camps } },
            { department: new RegExp('^' + d + '$', 'i') }
          ]
        }),
        MetaLead.countDocuments({
          $and: [
            { $or: [{ campaign: { $in: camps } }, { department: new RegExp('^' + d + '$', 'i') }] },
            { status: 'New' }
          ]
        }),
        MetaLead.countDocuments({
          $and: [
            { $or: [{ campaign: { $in: camps } }, { department: new RegExp('^' + d + '$', 'i') }] },
            { status: 'Contacted' }
          ]
        }),
        MetaLead.countDocuments({
          $and: [
            { $or: [{ campaign: { $in: camps } }, { department: new RegExp('^' + d + '$', 'i') }] },
            { status: 'Converted' }
          ]
        })
      ]);

      results.push({
        name: d,
        campaigns: camps,
        userCount: users.length,
        users: users.map(u => ({ id: u._id, name: u.name, displayName: u.displayName || u.name, designation: u.designation })),
        totalLeads,
        freshLeads,
        contactedLeads,
        convertedLeads
      });
    }

    res.json({
      success: true,
      isAdmin: true,
      isRestricted: false,
      departments: results
    });
  } catch (err) {
    console.error('Error fetching meta departments:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch meta departments', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/meta-leads/call-dates (Returns call activity counts by date)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/call-dates', protect, async (req, res) => {
  try {
    const { campaign, tzOffset } = req.query;
    const offsetMin = tzOffset !== undefined ? parseInt(tzOffset, 10) : -330; // default IST (-330)

    const query = {
      $or: [
        { lastCallAt: { $ne: null } },
        { 'callNotes.0': { $exists: true } }
      ]
    };

    if (campaign && campaign !== 'all' && campaign !== 'All') {
      query.campaign = campaign;
    }

    const leads = await MetaLead.find(query)
      .select('campaign lastCallAt callNotes')
      .lean();

    const countsByDate = {};
    leads.forEach(l => {
      const datesSet = new Set();
      const addDate = (d) => {
        if (!d) return;
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return;
        const localTime = new Date(dt.getTime() - (offsetMin * 60 * 1000));
        const dateStr = localTime.toISOString().slice(0, 10);
        datesSet.add(dateStr);
      };

      if (l.lastCallAt) addDate(l.lastCallAt);
      if (Array.isArray(l.callNotes)) {
        l.callNotes.forEach(cn => addDate(cn.date));
      }

      datesSet.forEach(d => {
        countsByDate[d] = (countsByDate[d] || 0) + 1;
      });
    });

    res.json({
      success: true,
      campaign: campaign || 'all',
      callDates: countsByDate
    });
  } catch (err) {
    console.error('Error fetching call dates:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch call dates', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/meta-leads (List leads with dynamic query & campaign filter)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const isAdmin = canViewAllMetaLeads(req.user);
    const { campaign, department, search, status, calledDate, tzOffset, forLinking, all, page = 1, limit = 25 } = req.query;
    const isGlobalLinkView = forLinking === 'true' || all === 'true';
    const query = {};

    let allowedCampaigns = null;
    if (!isAdmin && !isGlobalLinkView) {
      let userFilter = [req.user._id];
      const userAssignments = await MetaCampaignAssignment.find({
        assignedUsers: { $in: userFilter }
      }).select('campaign').lean();

      allowedCampaigns = userAssignments.map(a => a.campaign);

      // Check if user or team has directly assigned or added leads
      const userLeadScope = {
        $or: [
          ...(allowedCampaigns.length > 0 ? [{ campaign: { $in: allowedCampaigns } }] : []),
          { assignedTo: { $in: userFilter } },
          { addedBy: { $in: userFilter } }
        ]
      };

      if (userLeadScope.$or.length === 0) {
        return res.json({
          success: true,
          leads: [],
          total: 0,
          page: 1,
          pages: 1,
          availableHeaders: [],
          isRestricted: true,
          message: 'No campaigns or leads assigned to your profile.'
        });
      }

      // Security enforcement: if telecaller specifies a campaign, verify it's assigned
      if (campaign && campaign !== 'all' && campaign !== 'All') {
        if (allowedCampaigns.length > 0 && !allowedCampaigns.includes(campaign)) {
          return res.status(403).json({
            success: false,
            message: `Access denied. You are not assigned to campaign "${campaign}".`
          });
        }
        query.campaign = campaign;
      } else {
        query.$and = query.$and || [];
        query.$and.push(userLeadScope);
      }
    } else {
      if (campaign && campaign !== 'all' && campaign !== 'All') {
        query.campaign = campaign;
      }

      // Department-wise filter (Admin global view only)
      if (department && department !== 'all' && department !== 'All') {
        const isTelecalling = /telecall/i.test(department);
        const deptUsers = await User.find({
          $or: [
            { department: new RegExp('^' + department + '$', 'i') },
            { designation: new RegExp(department, 'i') },
            { displayName: new RegExp(department, 'i') },
            ...(isTelecalling ? [
              { designation: /counsellor|telecaller/i },
              { displayName: /counsellor|telecaller/i }
            ] : [])
          ]
        }).select('_id').lean();
        const deptUserIds = deptUsers.map(u => u._id);

        const deptAssignments = await MetaCampaignAssignment.find({
          assignedUsers: { $in: deptUserIds }
        }).select('campaign').lean();
        const deptCampaigns = deptAssignments.map(a => a.campaign);

        if (!query.campaign) {
          const deptOr = [];
          if (deptCampaigns.length > 0) {
            deptOr.push({ campaign: { $in: deptCampaigns } });
          }
          deptOr.push({ department: new RegExp('^' + department + '$', 'i') });
          deptOr.push({ campaign: new RegExp(department, 'i') });
          query.$and = query.$and || [];
          query.$and.push({ $or: deptOr });
        }
      }
    }

    if (status && status !== 'all' && status !== 'All') {
      if (status === 'Positive') {
        query.status = { $in: ALL_POSITIVE_STATUSES };
      } else if (status === 'Call Not Answering') {
        query.status = { $in: ALL_CALL_NOT_ANSWERING_STATUSES };
      } else if (status === 'Negative') {
        query.status = { $in: ALL_NEGATIVE_STATUSES };
      } else if (status === 'Pending') {
        query.status = { $nin: [...ALL_POSITIVE_STATUSES, ...ALL_CALL_NOT_ANSWERING_STATUSES, ...ALL_NEGATIVE_STATUSES] };
      } else if (status === 'Blocked') {
        const blockedEntries = await Blocklist.find({}).select('phone').lean();
        const blockedPhoneSet = new Set();
        blockedEntries.forEach(entry => {
          const clean = String(entry.phone || '').replace(/\D/g, '');
          if (clean) {
            blockedPhoneSet.add(clean);
            if (clean.length >= 10) {
              const last10 = clean.slice(-10);
              blockedPhoneSet.add(last10);
              blockedPhoneSet.add(`91${last10}`);
              blockedPhoneSet.add(`+91${last10}`);
            }
          }
        });
        const blockedPhoneList = Array.from(blockedPhoneSet);
        const blockedOr = [{ status: 'Blocked' }];
        if (blockedPhoneList.length > 0) {
          blockedOr.push(
            { phone: { $in: blockedPhoneList } },
            { normalizedPhone: { $in: blockedPhoneList } }
          );
        }
        query.$and = query.$and || [];
        query.$and.push({ $or: blockedOr });
      } else {
        const escaped = String(status).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.status = new RegExp(`^\\s*${escaped}\\s*$`, 'i');
      }
    }

    if (search && String(search).trim()) {
      const s = String(search).trim();
      const regex = new RegExp(s, 'i');
      const searchOr = [
        { fullName: regex },
        { phone: regex },
        { normalizedPhone: regex },
        { email: regex },
        { campaign: regex },
        { status: regex },
        { 'rawData.name': regex },
        { 'rawData.Name': regex },
        { 'rawData.Full Name': regex },
        { 'rawData.phone': regex },
        { 'rawData.Phone': regex },
        { 'rawData.email': regex },
        { 'rawData.Email': regex },
        { 'rawData.city': regex },
        { 'rawData.City': regex }
      ];
      query.$and = query.$and || [];
      query.$and.push({ $or: searchOr });
    }

    if (calledDate) {
      const dateStr = String(calledDate).slice(0, 10);
      const offsetMin = tzOffset !== undefined ? parseInt(tzOffset, 10) : -330;
      const [y, m, d] = dateStr.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const localMidnightUtc = Date.UTC(y, m - 1, d, 0, 0, 0) + (offsetMin * 60 * 1000);
        const localEndOfDayUtc = localMidnightUtc + (24 * 60 * 60 * 1000 - 1);
        const start = new Date(localMidnightUtc);
        const end = new Date(localEndOfDayUtc);

        const dateQuery = {
          $or: [
            { lastCallAt: { $gte: start, $lte: end } },
            {
              callNotes: {
                $elemMatch: {
                  date: { $gte: start, $lte: end }
                }
              }
            }
          ]
        };
        query.$and = query.$and || [];
        query.$and.push(dateQuery);
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const maxAllowedLimit = isGlobalLinkView ? 5000 : 1000;
    const limitNum = Math.max(1, Math.min(maxAllowedLimit, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [leads, total, distinctCampaigns] = await Promise.all([
      MetaLead.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      MetaLead.countDocuments(query),
      isGlobalLinkView ? MetaLead.distinct('campaign') : Promise.resolve(null)
    ]);

    // Inspect unique dynamic headers available in these leads
    const headerSet = new Set();
    leads.forEach(l => {
      if (l.rawData && typeof l.rawData === 'object') {
        Object.keys(l.rawData).forEach(k => {
          if (!k.startsWith('_') && k !== 'campaign' && k !== 'source') {
            headerSet.add(k);
          }
        });
      }
    });

    let sentiment = null;
    if (campaign) {
      const baseCampaignQuery = { campaign };
      if (allowedCampaigns) {
        baseCampaignQuery.campaign = { $in: allowedCampaigns.filter(c => c === campaign) };
      }
      const [posCount, cnaCount, negCount, campTotal] = await Promise.all([
        MetaLead.countDocuments({ ...baseCampaignQuery, status: { $in: ALL_POSITIVE_STATUSES } }),
        MetaLead.countDocuments({ ...baseCampaignQuery, status: { $in: ALL_CALL_NOT_ANSWERING_STATUSES } }),
        MetaLead.countDocuments({ ...baseCampaignQuery, status: { $in: ALL_NEGATIVE_STATUSES } }),
        MetaLead.countDocuments(baseCampaignQuery)
      ]);
      sentiment = {
        total: campTotal,
        positive: posCount,
        callNotAnswering: cnaCount,
        negative: negCount,
        pending: Math.max(0, campTotal - posCount - cnaCount - negCount)
      };
    }

    res.json({
      success: true,
      isAdmin,
      isRestricted: !isAdmin && !isGlobalLinkView,
      leads,
      total,
      allCampaigns: Array.isArray(distinctCampaigns) ? distinctCampaigns.filter(Boolean).sort() : undefined,
      sentiment,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      availableHeaders: Array.from(headerSet)
    });
  } catch (err) {
    console.error('Error fetching meta leads:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch meta leads', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/meta-leads/:id (Get single meta lead by ID)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const idStr = String(req.params.id || '').trim();
    const isValidObjId = mongoose.Types.ObjectId.isValid(idStr);
    let metaLead = null;
    if (isValidObjId) {
      metaLead = await MetaLead.findById(idStr)
        .populate('assignedTo', 'name email avatar')
        .populate('callNotes.user', 'name email');
    }
    if (!metaLead) {
      metaLead = await MetaLead.findOne({
        $or: [
          { metaLeadId: idStr },
          { phone: idStr },
          { normalizedPhone: idStr },
        ]
      })
        .populate('assignedTo', 'name email avatar')
        .populate('callNotes.user', 'name email');
    }
    if (!metaLead) {
      return res.status(404).json({ success: false, message: 'Meta lead not found' });
    }
    const formatted = await formatMetaLeadAsLead(metaLead);
    res.json({ success: true, lead: formatted, rawLead: metaLead });
  } catch (err) {
    console.error('Error fetching meta lead by ID:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch meta lead', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/meta-leads/:id (Update lead status, rating, followUpDate, notes, department)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id', protect, async (req, res) => {
  try {
    const { status, rating, assignedTo, note, notes, callOutcome, followUpDate, department, incrementCall, fullName, name, email, phone, city, location, interested } = req.body;
    const idStr = String(req.params.id || '').trim();
    const isValidObjId = mongoose.Types.ObjectId.isValid(idStr);
    let metaLead = null;
    if (isValidObjId) {
      metaLead = await MetaLead.findById(idStr);
    }
    if (!metaLead) {
      metaLead = await MetaLead.findOne({
        $or: [
          { metaLeadId: idStr },
          { phone: idStr },
          { normalizedPhone: idStr },
        ]
      });
    }
    if (!metaLead) {
      return res.status(404).json({ success: false, message: 'Meta lead not found' });
    }

    const prevStatus = metaLead.status;
    if (status !== undefined) metaLead.status = status;
    if (rating !== undefined) metaLead.rating = rating;
    if (assignedTo !== undefined) metaLead.assignedTo = assignedTo;
    if (notes !== undefined) metaLead.notes = notes;
    if (department !== undefined) metaLead.department = department;
    if (followUpDate) metaLead.followUpDate = new Date(followUpDate);
    if (incrementCall) {
      metaLead.callCount = (metaLead.callCount || 0) + 1;
      metaLead.lastCallAt = new Date();
    }
    if (!metaLead.rawData) metaLead.rawData = {};
    if (fullName !== undefined || name !== undefined) {
      const nextName = fullName !== undefined ? fullName : name;
      metaLead.fullName = nextName;
      metaLead.rawData.full_name = nextName;
    }
    if (email !== undefined) {
      metaLead.email = email;
      metaLead.rawData.email = email;
    }
    if (phone !== undefined) {
      metaLead.phone = phone;
      metaLead.normalizedPhone = String(phone).replace(/\D/g, '').slice(-10);
      metaLead.rawData.phone_number = phone;
    }
    if (city !== undefined || location !== undefined) {
      const nextCity = city !== undefined ? city : location;
      metaLead.city = nextCity;
      metaLead.rawData.city = nextCity;
    }
    if (interested !== undefined) {
      metaLead.interested = interested;
      metaLead.course = interested;
      metaLead.rawData.interested = interested;
      metaLead.rawData.Interested = interested;
    }
    metaLead.markModified('rawData');

    if (note || callOutcome) {
      if (!Array.isArray(metaLead.callNotes)) metaLead.callNotes = [];
      metaLead.callNotes.push({
        note: note || '',
        outcome: callOutcome || status || 'Note Added',
        date: new Date(),
        user: req.user._id,
        userName: personName(req.user) || 'Agent'
      });
    }

    // Record who moved the call summary into its new status. This entry is hidden
    // from the Notes tab (outcome `status_change`) but lets the reminder popup name
    // the counsellor who did the call, even when an Admin is watching.
    if (status !== undefined && String(prevStatus || '') !== String(status || '')) {
      if (!Array.isArray(metaLead.callNotes)) metaLead.callNotes = [];
      metaLead.callNotes.push({
        note: `Status changed from ${prevStatus || 'New'} to ${status}`,
        outcome: 'status_change',
        date: new Date(),
        user: req.user._id,
        userName: personName(req.user) || ''
      });
    }

    await metaLead.save();

    if (metaLead.crmLeadId && status) {
      await Lead.findByIdAndUpdate(metaLead.crmLeadId, { status }).catch(() => {});
    }

    // Check if status requires counsellor note or resolves note
    try {
      const sLower = String(status || '').toLowerCase().trim();
      const isPos = sLower.includes('office visit') || sLower.includes('demo attended') || sLower === 'positive' ||
        ["agreed to office visit's but no luck", "interested/need time", "demo not attended", "call back/we will call", "time issues/fee issues", "not answering"].some(p => sLower.includes(p));
      if (isPos && (!note || !String(note).trim())) {
        const studentName = metaLead.fullName || metaLead.name || metaLead.rawData?.full_name || metaLead.rawData?.Name || 'Student';
        // Admin/Executive recordings hand the reminder over to the lead's counsellor,
        // so the popup never shows the acting admin's role label (e.g. "Managing Director").
        const counsellor = await resolveReminderCounsellor({
          user: req.user,
          lead: metaLead,
          assignedTo: metaLead.assignedTo || null,
        });
        const assignedToId = String(metaLead.assignedTo?._id || metaLead.assignedTo || counsellor.counsellorId || '');
        // The reminder goes to the Admin and to the counsellor resolved above, even
        // when the lead has no assignee yet.
        const assignedToName = personName(metaLead.assignedTo) || counsellor.counsellorName || '';

        const campaignName = metaLead.campaignName || metaLead.campaign || '';

        broadcastWebSocketEvent('lead_note:reminder_needed', {
          id: metaLead._id.toString(),
          name: studentName,
          status: metaLead.status,
          ...counsellor,
          assignedToId,
          assignedToName,
          campaign: campaignName,
          isMeta: true
        });
      } else if (note && String(note).trim()) {
        broadcastWebSocketEvent('lead_note:reminder_resolved', {
          id: metaLead._id.toString(),
          name: metaLead.fullName || metaLead.name || 'Student'
        });
      }
    } catch (_) {}

    res.json({
      success: true,
      message: 'Lead updated successfully',
      lead: metaLead
    });
  } catch (err) {
    console.error('Error updating meta lead:', err);
    res.status(500).json({ success: false, message: 'Failed to update lead', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/meta-leads/:id/call-log (Record telecalling session outcome)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/call-log', protect, async (req, res) => {
  try {
    const { status = 'Contacted', note, followUpDate, duration } = req.body;
    const metaLead = await MetaLead.findById(req.params.id);
    if (!metaLead) {
      return res.status(404).json({ success: false, message: 'Meta lead not found' });
    }

    metaLead.status = status;
    metaLead.callCount = (metaLead.callCount || 0) + 1;
    metaLead.lastCallAt = new Date();
    if (followUpDate) metaLead.followUpDate = new Date(followUpDate);

    if (!Array.isArray(metaLead.callNotes)) metaLead.callNotes = [];
    metaLead.callNotes.push({
      note: note || `Call outcome: ${status}`,
      outcome: status,
      duration: duration || null,
      date: new Date(),
      user: req.user._id,
      userName: personName(req.user) || 'Telecaller'
    });

    await metaLead.save();

    // Trigger positive call summary reminder if no substantive note provided
    try {
      const sLower = String(status || '').toLowerCase().trim();
      const isPos = sLower.includes('office visit') || sLower.includes('demo attended') || sLower === 'positive' ||
        ["agreed to office visit's but no luck", "interested/need time", "demo not attended", "call back/we will call", "time issues/fee issues", "not answering"].some(p => sLower.includes(p));
      const hasRealNote = Boolean(note && String(note).trim() && !String(note).startsWith('Call outcome:'));
      if (isPos && !hasRealNote) {
        const studentName = metaLead.fullName || metaLead.name || metaLead.rawData?.full_name || metaLead.rawData?.Name || 'Student';
        // Admin/Executive recordings hand the reminder over to the lead's counsellor,
        // so the popup never shows the acting admin's role label (e.g. "Managing Director").
        const counsellor = await resolveReminderCounsellor({
          user: req.user,
          lead: metaLead,
          assignedTo: metaLead.assignedTo || null,
        });
        const assignedToId = String(metaLead.assignedTo?._id || metaLead.assignedTo || counsellor.counsellorId || '');
        const assignedToName = personName(metaLead.assignedTo) || counsellor.counsellorName || '';

        const campaignName = metaLead.campaignName || metaLead.campaign || '';

        broadcastWebSocketEvent('lead_note:reminder_needed', {
          id: metaLead._id.toString(),
          name: studentName,
          status: metaLead.status,
          ...counsellor,
          assignedToId,
          assignedToName,
          campaign: campaignName,
          isMeta: true
        });
      }
    } catch (_) {}

    res.json({
      success: true,
      message: 'Call session logged successfully',
      lead: metaLead
    });
  } catch (err) {
    console.error('Error logging meta call session:', err);
    res.status(500).json({ success: false, message: 'Failed to log call session', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/meta-leads/:id/convert (Convert MetaLead into standard CRM Lead)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/convert', protect, async (req, res) => {
  try {
    const metaLead = await MetaLead.findById(req.params.id);
    if (!metaLead) {
      return res.status(404).json({ success: false, message: 'Meta lead not found' });
    }

    // Campaign-level authorization check
    if (!isExecutiveOrAdminUser(req.user)) {
      const isAssigned = await MetaCampaignAssignment.exists({
        campaign: metaLead.campaign,
        assignedUsers: req.user._id
      });
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You are not assigned to campaign "${metaLead.campaign}".`
        });
      }
    }

    const { phone, email, name } = extractCoreIdentifiers(metaLead.rawData);
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Lead has no valid phone number to convert' });
    }

    // Create or find standard Lead
    let crmLead = await Lead.findOne({ phone: phone.replace(/\D/g, '').slice(-10) });
    if (!crmLead) {
      crmLead = await Lead.create({
        name: name || 'Google Sheets Meta Lead',
        phone,
        email: email || '',
        source: `Meta / ${metaLead.campaign}`,
        status: 'Fresh',
        notes: `Imported from Google Sheet tab: ${metaLead.campaign}. Raw data: ${JSON.stringify(metaLead.rawData)}`,
        assignedTo: req.user?._id || null
      });
    }

    metaLead.status = 'Converted';
    metaLead.crmLeadId = crmLead._id;
    await metaLead.save();

    res.json({
      success: true,
      message: 'Lead successfully converted to CRM active leads pipeline',
      crmLead,
      metaLead
    });
  } catch (err) {
    console.error('Error converting meta lead:', err);
    res.status(500).json({ success: false, message: 'Failed to convert lead', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/meta-leads/sync-status (Get live execution status & progress)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/sync-status', async (req, res) => {
  try {
    let state = await MetaSyncState.findOne({ key: 'meta_leads_sync' }).lean();
    if (!state) {
      state = {
        isSyncing: false,
        lastStatus: 'idle',
        totalProcessed: 0,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        message: 'No sync in progress'
      };
    }

    // Safety timeout: auto-release lock if running for over 60 seconds
    if (state.isSyncing && state.startedAt) {
      const elapsed = Date.now() - new Date(state.startedAt).getTime();
      if (elapsed > 60000) {
        await MetaSyncState.findOneAndUpdate(
          { key: 'meta_leads_sync' },
          { isSyncing: false, lastStatus: 'completed', message: 'Sync completed.' }
        );
        state.isSyncing = false;
        state.lastStatus = 'completed';
      }
    }

    return res.json({ success: true, ...state });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/meta-leads/sync (Trigger in-build Google Sheets Sync)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/sync', async (req, res) => {
  try {
    console.log('[MetaLeads] Starting direct Google Sheets Sync across all configured tabs...');

    // 1. Mark sync as in-progress in database
    await MetaSyncState.findOneAndUpdate(
      { key: 'meta_leads_sync' },
      {
        isSyncing: true,
        lastStatus: 'syncing',
        startedAt: new Date(),
        message: 'Syncing all Google Sheets tabs directly...'
      },
      { upsert: true }
    );

    try {
      broadcastWebSocketEvent('meta_leads:sync_started', {
        startedAt: new Date(),
        timestamp: Date.now()
      });
    } catch (_) {}

    // 2. Run direct Google Sheets synchronization
    const result = await syncAllMetaSheets();

    // 3. Mark sync as completed
    await MetaSyncState.findOneAndUpdate(
      { key: 'meta_leads_sync' },
      {
        isSyncing: false,
        lastStatus: 'completed',
        lastFinishedAt: new Date(),
        message: 'Google Sheets sync completed successfully! All tabs synced.'
      }
    );

    try {
      broadcastWebSocketEvent('meta_leads:sync_completed', {
        success: true,
        finishedAt: new Date(),
        timestamp: Date.now()
      });
      broadcastWebSocketEvent('meta_leads:changed', {
        source: 'sheets_sync_completed',
        timestamp: Date.now()
      });
    } catch (_) {}

    res.json({
      success: true,
      inProgress: false,
      isSyncing: false,
      message: 'Google Sheets sync completed successfully! All tabs synced.',
      result
    });
  } catch (err) {
    console.error('[MetaLeads] Sync error: ' + err.message);
    await MetaSyncState.findOneAndUpdate(
      { key: 'meta_leads_sync' },
      { isSyncing: false, lastStatus: 'failed', message: err.message }
    );
    try {
      broadcastWebSocketEvent('meta_leads:sync_completed', {
        success: false,
        error: err.message,
        timestamp: Date.now()
      });
    } catch (_) {}
    res.status(500).json({
      success: false,
      inProgress: false,
      isSyncing: false,
      message: 'Failed to complete Google Sheets sync: ' + err.message
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/meta-leads/sync-complete (Callback endpoint if called by external workers)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/sync-complete', async (req, res) => {
  try {
    await MetaSyncState.findOneAndUpdate(
      { key: 'meta_leads_sync' },
      {
        isSyncing: false,
        lastStatus: 'completed',
        lastFinishedAt: new Date(),
        message: req.body?.message || 'Google Sheets sync completed.'
      }
    );
    try {
      broadcastWebSocketEvent('meta_leads:sync_completed', { timestamp: Date.now() });
      broadcastWebSocketEvent('meta_leads:changed', { timestamp: Date.now() });
    } catch (_) {}
    res.json({ success: true, message: 'Sync marked as completed.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/meta-leads/clear-all (Purge all fake / existing meta leads - Admin Only)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/clear-all', protect, async (req, res) => {
  try {
    if (!isExecutiveOrAdminUser(req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin access required.' });
    }
    const result = await MetaLead.deleteMany({});
    res.json({
      success: true,
      message: `Successfully cleared all ${result.deletedCount} leads from the database. Clean slate ready for Google Sheets sync!`
    });
  } catch (err) {
    console.error('Error clearing leads:', err);
    res.status(500).json({ success: false, message: 'Failed to clear leads', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/meta-leads/:id/call-notes/:noteId (Delete call note - Admin Only)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id/call-notes/:noteId', protect, async (req, res) => {
  try {
    if (!isExecutiveOrAdminUser(req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin access required.' });
    }
    const { id, noteId } = req.params;
    const metaLead = await MetaLead.findById(id);
    if (!metaLead) {
      return res.status(404).json({ success: false, message: 'Meta Lead not found' });
    }
    metaLead.callNotes = (metaLead.callNotes || []).filter(cn => String(cn._id) !== String(noteId));
    await metaLead.save();
    res.json({ success: true, message: 'Call note deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete call note', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/meta-leads/:id (Delete lead - Admin Only)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    if (!isExecutiveOrAdminUser(req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin access required.' });
    }
    const deleted = await MetaLead.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete lead', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/meta-leads/campaign/:campaign (Delete campaign leads & config - Admin & Manager Only)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/campaign/:campaign', protect, async (req, res) => {
  try {
    if (!isExecutiveOrAdminUser(req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin or Manager access required.' });
    }
    const { campaign } = req.params;
    const result = await MetaLead.deleteMany({ campaign });
    await MetaCampaignAssignment.deleteMany({ campaign });

    // Also remove from Google Sheets integration sheetSources if configured so it doesn't reappear
    try {
      const gIntegration = await Integration.findOne({ type: 'google_sheets' });
      if (gIntegration && gIntegration.config?.sheetSources?.length) {
        const initialLen = gIntegration.config.sheetSources.length;
        gIntegration.config.sheetSources = gIntegration.config.sheetSources.filter(src => {
          const tabName = parseTabName(src.sheetRange, src.name);
          const campName = src.campaign || src.name || tabName;
          return campName !== campaign;
        });
        if (gIntegration.config.sheetSources.length !== initialLen) {
          gIntegration.markModified('config');
          await gIntegration.save();
        }
      }
    } catch (e) {
      console.warn('[meta-leads] Failed to remove campaign from sheetSources:', e.message);
    }

    res.json({
      success: true,
      message: `Deleted campaign "${campaign}" and ${result.deletedCount} lead(s) successfully`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete campaign', error: err.message });
  }
});

module.exports = router;

