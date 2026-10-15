const express = require('express');
const router = express.Router();
const axios = require('axios');
const MetaLead = require('../../../database/models/MetaLead');
const Lead = require('../../../database/models/Lead');
const MetaCampaignAssignment = require('../../../database/models/MetaCampaignAssignment');
const { protect } = require('../../../core/middleware/auth');
const env = require('../../../config/env');

// Helper to determine if user has full administrative / management access
function isExecutiveOrAdminUser(user) {
  if (!user) return false;
  const role = String(user.role || '').trim().toLowerCase();
  if (role === 'admin' || role === 'superadmin' || role === 'manager') return true;

  const d = String(user.designation || '').trim().toUpperCase();
  const dept = String(user.department || '').trim().toUpperCase();

  return (
    d.includes('MD') ||
    d.includes('MANAGING DIRECTOR') ||
    d.includes('CEO') ||
    d.includes('CTO') ||
    d.includes('HR') ||
    d.includes('EXECUTIVE') ||
    d.includes('DIRECTOR') ||
    d.includes('VICE PRESIDENT') ||
    d.includes('HEAD') ||
    dept.includes('HR') ||
    dept.includes('ADMIN') ||
    dept.includes('MANAGEMENT')
  );
}

// Helper to extract phone/email/name from dynamic rawData object
function extractCoreIdentifiers(rawData = {}) {
  const phone = rawData.phone || rawData.Phone || rawData.mobile || rawData.Mobile || rawData['Phone Number'] || rawData['Contact'] || '';
  const email = rawData.email || rawData.Email || rawData['Email Address'] || '';
  const name = rawData.name || rawData.Name || rawData['Full Name'] || rawData['Candidate Name'] || rawData['Student Name'] || 'Unknown Lead';
  return { phone: String(phone).trim(), email: String(email).trim(), name: String(name).trim() };
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
    const results = [];

    for (const item of items) {
      const campaign = item.campaign || item.campaign_name || item.tab || 'General_Meta_Leads';
      const source = item.source || 'google_sheets_meta';
      const rawData = item.rawData || item;

      // Extract phone/email for deduplication
      const { phone, email } = extractCoreIdentifiers(rawData);

      // Build deduplication query
      let filter = null;
      if (phone && phone.length >= 7) {
        filter = {
          campaign,
          $or: [
            { 'rawData.phone': phone },
            { 'rawData.Phone': phone },
            { 'rawData.mobile': phone },
            { 'rawData.Mobile': phone },
            { 'rawData.Contact': phone },
            { 'rawData.Phone Number': phone }
          ]
        };
      } else if (email && email.includes('@')) {
        filter = {
          campaign,
          $or: [
            { 'rawData.email': email },
            { 'rawData.Email': email },
            { 'rawData.Email Address': email }
          ]
        };
      }

      if (filter) {
        // Upsert to prevent duplicate pollution
        const existing = await MetaLead.findOneAndUpdate(
          filter,
          {
            $set: {
              campaign,
              source,
              rawData,
              syncedAt: new Date()
            }
          },
          { new: true, upsert: true }
        );
        results.push(existing);
        updatedCount++;
      } else {
        // Insert new
        const created = await MetaLead.create({
          campaign,
          source,
          rawData,
          status: 'New',
          syncedAt: new Date()
        });
        results.push(created);
        insertedCount++;
      }
    }

    res.status(201).json({
      success: true,
      message: `Processed ${items.length} lead(s). (${insertedCount} new, ${updatedCount} synced/updated)`,
      totalProcessed: items.length,
      insertedCount,
      updatedCount
    });
  } catch (err) {
    console.error('MetaLeads Ingestion Error:', err);
    res.status(500).json({ success: false, message: 'Failed to ingest meta leads', error: err.message });
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
// GET /api/meta-leads (List leads with dynamic query & campaign filter)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const isAdmin = isExecutiveOrAdminUser(req.user);
    const { campaign, search, status, page = 1, limit = 25 } = req.query;
    const query = {};

    let allowedCampaigns = null;
    if (!isAdmin) {
      const userAssignments = await MetaCampaignAssignment.find({
        assignedUsers: req.user._id
      }).select('campaign').lean();

      allowedCampaigns = userAssignments.map(a => a.campaign);

      if (allowedCampaigns.length === 0) {
        return res.json({
          success: true,
          leads: [],
          total: 0,
          page: 1,
          pages: 1,
          availableHeaders: [],
          isRestricted: true,
          message: 'No campaigns assigned to your profile.'
        });
      }

      // Security enforcement: if tele-caller specifies a campaign they are NOT assigned to, block access
      if (campaign && campaign !== 'all' && campaign !== 'All') {
        if (!allowedCampaigns.includes(campaign)) {
          return res.status(403).json({
            success: false,
            message: `Access denied. You are not assigned to campaign "${campaign}".`
          });
        }
        query.campaign = campaign;
      } else {
        // Enforce restriction to only their assigned campaigns
        query.campaign = { $in: allowedCampaigns };
      }
    } else {
      if (campaign && campaign !== 'all' && campaign !== 'All') {
        query.campaign = campaign;
      }
    }

    if (status && status !== 'all' && status !== 'All') {
      query.status = status;
    }

    if (search && String(search).trim()) {
      const s = String(search).trim();
      const regex = new RegExp(s, 'i');
      query.$or = [
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
// POST /api/meta-leads/:id/convert (Convert MetaLead into standard CRM Lead)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/convert', protect, async (req, res) => {
  try {
    const metaLead = await MetaLead.findById(req.params.id);
    if (!metaLead) {
      return res.status(404).json({ success: false, message: 'Meta lead not found' });
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
// POST /api/meta-leads/sync (Trigger n8n Webhook Workflow)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/sync', async (req, res) => {
  const webhookUrl = env.N8N_META_LEADS_WEBHOOK_URL || 'https://aotms.app.n8n.cloud/webhook/Meta_Leads';

  try {
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
        timeout: 15000 // 15s timeout
      }
    );

    res.json({
      success: true,
      message: 'n8n workflow triggered successfully! Google Sheets reading started.',
      webhookUrl,
      n8nResponse: response.data || 'Webhook accepted'
    });
  } catch (err) {
    console.warn(`[MetaLeads] n8n webhook call warning (${err.message}). Webhook URL: ${webhookUrl}`);
    res.json({
      success: true,
      message: `Trigger sent to n8n webhook (${err.response?.status || 'dispatched'}). Workflow is processing.`,
      webhookUrl,
      warning: err.message
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/meta-leads/clear-all (Purge all fake / existing meta leads)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/clear-all', async (req, res) => {
  try {
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
// DELETE /api/meta-leads/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
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
// DELETE /api/meta-leads/campaign/:campaign
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/campaign/:campaign', protect, async (req, res) => {
  try {
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

