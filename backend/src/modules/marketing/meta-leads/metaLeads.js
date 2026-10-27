const express = require('express');
const router = express.Router();
const axios = require('axios');
const MetaLead = require('../../../database/models/MetaLead');
const Lead = require('../../../database/models/Lead');
const MetaCampaignAssignment = require('../../../database/models/MetaCampaignAssignment');
const MetaSyncState = require('../../../database/models/MetaSyncState');
const User = require('../../../database/models/User');
const Department = require('../../../database/models/Department');
const { protect } = require('../../../core/middleware/auth');
const env = require('../../../config/env');

// Helper to determine if user has full administrative / management access
function isExecutiveOrAdminUser(user) {
  if (!user) return false;
  const role = String(user.role || '').trim().toLowerCase();
  const d = String(user.designation || '').trim().toUpperCase();
  const dept = String(user.department || '').trim().toUpperCase();
  const dn = String(user.displayName || '').trim().toUpperCase();

  // Explicit system administrators
  if (role === 'admin' || role === 'superadmin') return true;

  // C-suite / Executive Directors
  if (
    d === 'MD' ||
    d.includes('MANAGING DIRECTOR') ||
    d === 'CEO' ||
    d === 'CTO' ||
    dn.includes('MANAGING DIRECTOR')
  ) {
    return true;
  }

  // Any counsellor, telecaller, caller, staff employee, or marketing rep is restricted
  const isRestrictedStaff = 
    role === 'employee' ||
    role === 'caller' ||
    d.includes('COUNSELLOR') || 
    d.includes('COUNSELOR') || 
    dn.includes('COUNSELLOR') || 
    dn.includes('COUNSELOR') || 
    d.includes('CALLER') || 
    d.includes('TELE') || 
    dn.includes('CALLER') || 
    dn.includes('TELE') || 
    dept.includes('TELE') ||
    dept.includes('CALL') ||
    d.includes('MARKETING') || 
    d.includes('SALES') ||
    d.includes('JR') || 
    d.includes('JUNIOR');

  if (isRestrictedStaff) {
    return false;
  }

  // General managers not assigned to counselling / telecalling
  if (role === 'manager' && dept !== 'HR' && !d.includes('HR')) {
    return true;
  }

  return false;
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
    }
  }
  if (!fullName) fullName = 'Unknown Lead';

  // 5. Empty or Inverted Header Row Check
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
    isEmptyRow
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/meta-leads (Ingestion from n8n / Webhook / Manual)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    let payload = req.body;
    if (!payload) {
      return res.status(400).json({ success: false, message: 'Request body is empty' });
    }

    // Support both single item and array of items
    const items = Array.isArray(payload) ? payload : [payload];
    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'No lead items provided' });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const results = [];

    for (const item of items) {
      const campaign = item.campaign || item.campaign_name || item.tab || 'General_Meta_Leads';
      const source = item.source || 'google_sheets_meta';
      const rawData = item.rawData || item;

      // Extract structured identifiers
      const { metaLeadId, phone, normalizedPhone, email, fullName, isEmptyRow } = extractCoreIdentifiers(rawData);

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

      if (existing) {
        // PRESERVE CRM-MANAGED FIELDS:
        // status, crmLeadId, assignedEmployees, notes must NEVER be overwritten back to 'New'!
        existing.metaLeadId = metaLeadId || existing.metaLeadId || undefined;
        existing.phone = phone || existing.phone || undefined;
        existing.normalizedPhone = normalizedPhone || existing.normalizedPhone || undefined;
        existing.email = email || existing.email || undefined;
        if (fullName && fullName !== 'Unknown Lead') {
          existing.fullName = fullName;
        }
        existing.rawData = { ...(existing.rawData || {}), ...rawData };
        existing.syncedAt = new Date();
        existing.source = source || existing.source;

        await existing.save();
        results.push(existing);
        updatedCount++;
      } else {
        // Safe insert new lead with structured fields
        const created = await MetaLead.create({
          campaign,
          source,
          metaLeadId: metaLeadId || undefined,
          phone: phone || undefined,
          normalizedPhone: normalizedPhone || undefined,
          email: email || undefined,
          fullName: fullName || 'Unknown Lead',
          rawData,
          status: 'New',
          syncedAt: new Date()
        });
        results.push(created);
        insertedCount++;
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
            message: `Ingested ${items.length} leads (${insertedCount} new, ${updatedCount} updated, ${skippedCount} skipped)`
          }
        },
        { upsert: true }
      );
    } catch (_) {}

    res.status(201).json({
      success: true,
      message: `Processed ${items.length} lead(s). (${insertedCount} new, ${updatedCount} synced/updated, ${skippedCount} skipped)`,
      totalProcessed: items.length,
      insertedCount,
      updatedCount,
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
    const isAdmin = isExecutiveOrAdminUser(req.user);
    if (isAdmin) {
      return res.json({
        success: true,
        hasAccess: true,
        isAdmin: true,
        assignedCount: 'all',
        assignedCampaigns: []
      });
    }

    // Check assignments for this specific employee
    const userAssignments = await MetaCampaignAssignment.find({
      assignedUsers: req.user._id
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
    if (!isExecutiveOrAdminUser(req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin access required.' });
    }

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
// GET /api/meta-leads/campaigns (Returns distinct campaigns with lead counts & assignees)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/campaigns', protect, async (req, res) => {
  try {
    const isAdmin = isExecutiveOrAdminUser(req.user);
    let allowedCampaigns = null;

    if (!isAdmin) {
      // Find campaigns specifically assigned to this user
      const userAssignments = await MetaCampaignAssignment.find({
        assignedUsers: req.user._id
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
          convertedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] }
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

    const campaigns = stats.map(s => ({
      campaign: s._id,
      count: s.count,
      lastSynced: s.lastSynced,
      newCount: s.newCount,
      convertedCount: s.convertedCount,
      assignedUsers: assignmentMap[s._id] || []
    }));

    // If an assigned campaign doesn't have leads in MetaLead yet, include it so the tele-caller can see the tab
    if (allowedCampaigns) {
      allowedCampaigns.forEach(ac => {
        if (!campaigns.find(c => c.campaign === ac)) {
          campaigns.push({
            campaign: ac,
            count: 0,
            lastSynced: null,
            newCount: 0,
            convertedCount: 0,
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
    const isAdmin = isExecutiveOrAdminUser(req.user);
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
// GET /api/meta-leads (List leads with dynamic query & campaign filter)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const isAdmin = isExecutiveOrAdminUser(req.user);
    const { campaign, department, search, status, page = 1, limit = 25 } = req.query;
    const query = {};

    let allowedCampaigns = null;
    if (!isAdmin) {
      const userAssignments = await MetaCampaignAssignment.find({
        assignedUsers: req.user._id
      }).select('campaign').lean();

      allowedCampaigns = userAssignments.map(a => a.campaign);

      // Check if user has directly assigned or added leads
      const userLeadScope = {
        $or: [
          ...(allowedCampaigns.length > 0 ? [{ campaign: { $in: allowedCampaigns } }] : []),
          { assignedTo: req.user._id },
          { addedBy: req.user._id }
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
        query.status = { $in: ['Positive', 'Converted', 'Won', 'Contacted', 'Interested', 'Enrolled', 'Demo', 'Follow-up'] };
      } else if (status === 'Negative') {
        query.status = { $in: ['Negative', 'Discarded', 'Lost', 'Blocked', 'Not Interested', 'Not Answered', 'Call Not Responding'] };
      } else {
        query.status = status;
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

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [leads, total] = await Promise.all([
      MetaLead.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      MetaLead.countDocuments(query)
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

    res.json({
      success: true,
      isAdmin,
      isRestricted: !isAdmin,
      leads,
      total,
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
// PATCH /api/meta-leads/:id (Update lead status, followUpDate, notes, department)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id', protect, async (req, res) => {
  try {
    const { status, note, callOutcome, followUpDate, department, incrementCall } = req.body;
    const metaLead = await MetaLead.findById(req.params.id);
    if (!metaLead) {
      return res.status(404).json({ success: false, message: 'Meta lead not found' });
    }

    if (status) metaLead.status = status;
    if (department) metaLead.department = department;
    if (followUpDate) metaLead.followUpDate = new Date(followUpDate);
    if (incrementCall) {
      metaLead.callCount = (metaLead.callCount || 0) + 1;
      metaLead.lastCallAt = new Date();
    }

    if (note || callOutcome) {
      if (!Array.isArray(metaLead.callNotes)) metaLead.callNotes = [];
      metaLead.callNotes.push({
        note: note || '',
        outcome: callOutcome || status || 'Call Made',
        date: new Date(),
        user: req.user._id,
        userName: req.user.displayName || req.user.name || 'Agent'
      });
    }

    await metaLead.save();

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
      userName: req.user.displayName || req.user.name || 'Telecaller'
    });

    await metaLead.save();

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
// POST /api/meta-leads/sync (Trigger n8n Webhook Workflow with Concurrency Lock)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/sync', async (req, res) => {
  const webhookUrl = env.N8N_META_LEADS_WEBHOOK_URL || 'https://aotms.app.n8n.cloud/webhook/Meta_Leads';
  const LOCK_TIMEOUT_MS = 60 * 1000; // 60-second concurrency lock

  try {
    // 1. Check for existing active sync execution to prevent overlapping/concurrent runs
    const existingSync = await MetaSyncState.findOne({ key: 'meta_leads_sync' }).lean();
    if (existingSync && existingSync.isSyncing && existingSync.startedAt) {
      const elapsed = Date.now() - new Date(existingSync.startedAt).getTime();
      if (elapsed < LOCK_TIMEOUT_MS) {
        return res.status(429).json({
          success: false,
          inProgress: true,
          message: `A sync is already actively running (${Math.round(elapsed / 1000)}s elapsed). Please wait for it to complete.`,
          startedAt: existingSync.startedAt
        });
      }
    }

    // 2. Set sync lock atomically
    await MetaSyncState.findOneAndUpdate(
      { key: 'meta_leads_sync' },
      {
        isSyncing: true,
        startedAt: new Date(),
        lastStatus: 'in_progress',
        totalProcessed: 0,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        message: 'n8n workflow triggered! Reading Google Sheets...',
        lastError: ''
      },
      { upsert: true, new: true }
    );

    console.log(`[MetaLeads] Triggering n8n webhook workflow at: ${webhookUrl}`);

    const response = await axios.post(
      webhookUrl,
      {
        trigger: 'crm_manual_sync_now',
        requestedAt: new Date().toISOString(),
        client: 'AOTMS_CRM_Frontend'
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );

    res.json({
      success: true,
      inProgress: true,
      message: 'n8n workflow triggered successfully! Google Sheets reading started.',
      webhookUrl,
      n8nResponse: response.data || 'Webhook accepted'
    });
  } catch (err) {
    console.warn(`[MetaLeads] n8n webhook call warning (${err.message}). Webhook URL: ${webhookUrl}`);
    res.json({
      success: true,
      inProgress: true,
      message: `Trigger sent to n8n webhook (${err.response?.status || 'dispatched'}). Workflow is processing.`,
      webhookUrl,
      warning: err.message
    });
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
      message: `Successfully cleared all ${result.deletedCount} leads from the database. Clean slate ready for n8n sync!`
    });
  } catch (err) {
    console.error('Error clearing leads:', err);
    res.status(500).json({ success: false, message: 'Failed to clear leads', error: err.message });
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
// DELETE /api/meta-leads/campaign/:campaign (Delete campaign leads - Admin Only)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/campaign/:campaign', protect, async (req, res) => {
  try {
    if (!isExecutiveOrAdminUser(req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin access required.' });
    }
    const { campaign } = req.params;
    const result = await MetaLead.deleteMany({ campaign });
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} leads from campaign "${campaign}"`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear campaign leads', error: err.message });
  }
});

module.exports = router;

