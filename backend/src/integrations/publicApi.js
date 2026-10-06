const express = require('express');
const mongoose = require('mongoose');
const z = require('zod');
const router = express.Router();

const Lead = require('../database/models/Lead');
const Blocklist = require('../database/models/Blocklist');
const Campaign = require('../database/models/Campaign');
const User = require('../database/models/User');
const { protectWithAccessToken } = require('../core/middleware/accessTokenAuth');
const { broadcastWebSocketEvent } = require('../app/websocket');

/**
 * Zod validation schema for public lead ingestion
 */
const publicLeadSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).min(1, 'Name cannot be empty').trim(),
  phone: z.string({ required_error: 'Phone number is required' }).min(5, 'Valid phone number required').trim(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
  leadSource: z.string().optional().or(z.literal('')),
  campaign: z.string().optional().or(z.literal('')),
  assignedTo: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  customFields: z.record(z.any()).optional(),
});

/**
 * Helper to normalize phone numbers
 */
function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/[^\d+]/g, '').trim();
}

/**
 * Helper to safely escape regular expression inputs
 */
function escapeRegExp(str) {
  if (!str) return '';
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * POST /api/public/leads
 * Ingest a single lead via external Access Token (atms_...)
 */
router.post('/leads', protectWithAccessToken, async (req, res) => {
  try {
    const parseResult = publicLeadSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(e => e.message).join(', ');
      return res.status(400).json({ message: errorMsg, errors: parseResult.error.flatten().fieldErrors });
    }

    const tokenData = req.accessToken;
    const { name, phone: rawPhone, email, location, source, leadSource, campaign, assignedTo, notes, customFields } = parseResult.data;
    const phone = normalizePhone(rawPhone);

    // 1. Blocklist Mongoose query check
    const isBlocked = await Blocklist.findOne({ phone }).lean();
    if (isBlocked) {
      return res.status(200).json({
        message: 'Lead phone is blocklisted',
        skipped: true,
        reason: 'blocklist',
      });
    }

    // 2. Duplicate Check based on Access Token recapture preference
    const existingLead = await Lead.findOne({ phone });
    if (existingLead) {
      const pref = tokenData.recapturePreference || 'once_a_day';
      if (pref === 'never') {
        return res.status(200).json({
          message: 'Duplicate lead skipped per recapture policy (never)',
          skipped: true,
          leadId: existingLead._id,
        });
      }
      if (pref === 'once_a_day') {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (existingLead.createdAt > oneDayAgo) {
          return res.status(200).json({
            message: 'Duplicate lead skipped (recaptured within last 24h)',
            skipped: true,
            leadId: existingLead._id,
          });
        }
      }
      if (pref === 'once_a_week') {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (existingLead.createdAt > oneWeekAgo) {
          return res.status(200).json({
            message: 'Duplicate lead skipped (recaptured within last 7 days)',
            skipped: true,
            leadId: existingLead._id,
          });
        }
      }
    }

    // 3. Resolve optional Campaign reference if provided by ID or Name
    let resolvedCampaignId = undefined;
    if (campaign) {
      if (mongoose.Types.ObjectId.isValid(campaign)) {
        resolvedCampaignId = campaign;
      } else {
        const campDoc = await Campaign.findOne({ name: new RegExp('^' + escapeRegExp(campaign) + '$', 'i') }).lean();
        if (campDoc) resolvedCampaignId = campDoc._id;
      }
    }

    // 4. Resolve optional Assigned User reference
    let resolvedAssignedId = undefined;
    if (assignedTo) {
      if (mongoose.Types.ObjectId.isValid(assignedTo)) {
        resolvedAssignedId = assignedTo;
      } else {
        const userDoc = await User.findOne({ email: assignedTo.toLowerCase() }).lean();
        if (userDoc) resolvedAssignedId = userDoc._id;
      }
    }

    const newLeadData = {
      name,
      phone,
      email: email || '',
      location: location || '',
      leadSource: source || leadSource || 'API Integration',
      status: 'Fresh',
      activities: [
        {
          type: 'system',
          description: `Lead ingested via Public API Access Token (${tokenData.name || 'API'})`,
          timestamp: new Date(),
        },
      ],
    };

    if (resolvedCampaignId) newLeadData.campaign = resolvedCampaignId;
    if (resolvedAssignedId) newLeadData.assignedTo = resolvedAssignedId;
    if (notes) newLeadData.notes = notes;
    if (customFields) newLeadData.customFields = customFields;

    const lead = await Lead.create(newLeadData);

    // Broadcast real-time WebSocket update for active agent dashboards
    broadcastWebSocketEvent('lead:created', {
      leadId: lead._id,
      name: lead.name,
      phone: lead.phone,
      source: lead.leadSource,
      tokenName: tokenData.name,
      timestamp: new Date(),
    });

    if (tokenData.apiType === 'async') {
      return res.status(202).json({
        message: 'Lead accepted asynchronously',
        leadId: lead._id,
        status: 'accepted',
      });
    }

    return res.status(201).json({
      message: 'Lead created successfully',
      lead,
    });
  } catch (err) {
    console.error('[Public API Lead Ingest Error]:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

/**
 * POST /api/public/leads/batch
 * Batch ingestion endpoint for array of leads
 */
router.post('/leads/batch', protectWithAccessToken, async (req, res) => {
  try {
    const leadsArray = Array.isArray(req.body) ? req.body : req.body.leads;
    if (!Array.isArray(leadsArray) || leadsArray.length === 0) {
      return res.status(400).json({ message: 'Request body must contain an array of leads under "leads"' });
    }

    const tokenData = req.accessToken;
    let importedCount = 0;
    let skippedCount = 0;
    const results = [];

    for (const item of leadsArray) {
      const parseResult = publicLeadSchema.safeParse(item);
      if (!parseResult.success) {
        skippedCount++;
        results.push({ phone: item.phone, success: false, reason: 'validation_error' });
        continue;
      }

      const { name, phone: rawPhone, email, location, source, leadSource } = parseResult.data;
      const phone = normalizePhone(rawPhone);

      const isBlocked = await Blocklist.findOne({ phone }).lean();
      if (isBlocked) {
        skippedCount++;
        results.push({ phone, success: false, reason: 'blocklisted' });
        continue;
      }

      const existingLead = await Lead.findOne({ phone }).lean();
      if (existingLead) {
        skippedCount++;
        results.push({ phone, success: false, reason: 'duplicate', leadId: existingLead._id });
        continue;
      }

      const lead = await Lead.create({
        name,
        phone,
        email: email || '',
        location: location || '',
        leadSource: source || leadSource || 'Batch API',
        status: 'Fresh',
        activities: [{ type: 'system', description: `Batch imported via Access Token (${tokenData.name})` }],
      });

      importedCount++;
      results.push({ phone, success: true, leadId: lead._id });
    }

    return res.status(200).json({
      message: `Batch processing complete. Imported: ${importedCount}, Skipped: ${skippedCount}`,
      importedCount,
      skippedCount,
      results,
    });
  } catch (err) {
    console.error('[Public API Batch Ingest Error]:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

/**
 * GET /api/public/leads
 * Query leads with pagination and search
 */
router.get('/leads', protectWithAccessToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;
    const search = req.query.search ? String(req.query.search).trim() : '';

    const filter = {};
    if (search) {
      const safeSearch = escapeRegExp(search);
      filter.$or = [
        { name: new RegExp(safeSearch, 'i') },
        { phone: new RegExp(safeSearch, 'i') },
        { email: new RegExp(safeSearch, 'i') },
      ];
    }

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('assignedTo', 'name email')
        .populate('campaign', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    return res.json({
      leads,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/public/leads/:id
 * Fetch single lead by Mongoose ObjectId
 */
router.get('/leads/:id', protectWithAccessToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid lead ID format' });
    }

    const lead = await Lead.findById(id)
      .populate('assignedTo', 'name email')
      .populate('campaign', 'name')
      .lean();

    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    return res.json({ lead });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

/**
 * PUT /api/public/leads/:id
 * Update lead details by ID
 */
router.put('/leads/:id', protectWithAccessToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid lead ID format' });
    }

    const allowedUpdates = ['name', 'email', 'location', 'status', 'notes', 'leadSource'];
    const updateData = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    const lead = await Lead.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    return res.json({ message: 'Lead updated successfully', lead });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;