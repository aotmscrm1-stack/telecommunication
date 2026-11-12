const express = require('express');
const mongoose = require('mongoose');
const Lead = require('../../../database/models/Lead');
const User = require('../../../database/models/User');
const Course = require('../../../database/models/Course');
const Campaign = require('../../../database/models/Campaign');
const FollowUp = require('../../../database/models/FollowUp');
const Attendance = require('../../../database/models/Attendance');
const { protect, authorize } = require('../../../core/middleware/auth');
const { personName, resolveReminderCounsellor } = require('../../../core/utils/counsellor');
const {
  notifyLeadAssigned,
  notifyLeadStatusChanged,
  notifyLeadUpdated,
  notifyNewLeadCreated,
  notifyCallInitiated,
} = require('../../../modules/notifications/notificationService');
const { broadcastWebSocketEvent } = require('../../../app/websocket');

const router = express.Router();

// In-memory queue for zero-touch mobile call signals (45s TTL)
const pendingCallMap = new Map();

// GET /api/leads/pending-call — Poll/fetch latest pending auto-call for logged-in mobile user
router.get('/pending-call', protect, async (req, res) => {
  try {
    const uid = String(req.user._id);
    const entry = pendingCallMap.get(uid);
    if (entry && Date.now() - entry.timestamp < 45000) {
      pendingCallMap.delete(uid);
      return res.json({ pendingCall: entry });
    }
    if (entry) {
      pendingCallMap.delete(uid);
    }
    return res.json({ pendingCall: null });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/leads/export — CSV export
router.get('/export', protect, async (req, res) => {
  try {
    const { status, campaign, filter } = req.query;
    const query = {};
    if (status) query.status = status;
    if (campaign) query.campaign = campaign;

    if (req.user.role === 'employee' || req.user.role === 'caller') {
      query.assignedTo = req.user._id;
    } else if (filter === 'mine' || filter === 'assigned') {
      query.assignedTo = req.user._id;
    }

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name')
      .populate('campaign', 'name')
      .populate('courseInterest', 'name')
      .lean();

    const headers = [
      'Name', 'Phone', 'Alternate Phone', 'Email', 'Status', 'Lead Source',
      'Location', 'Budget', 'Rating', 'Course Interest', 'Campaign',
      'Assigned To', 'Total Calls', 'Last Called', 'Created At'
    ];

    const rows = leads.map(l => [
      l.name, l.phone, l.alternatePhone || '', l.email || '', l.status,
      l.leadSource || '', l.location || '', l.budget || 0, l.rating || 0,
      l.courseInterest?.name || '', l.campaign?.name || '', l.assignedTo?.name || '',
      l.totalCalls || 0,
      l.lastCalledAt ? new Date(l.lastCalledAt).toLocaleString() : '',
      new Date(l.createdAt).toLocaleString()
    ]);

    const csvLines = [headers, ...rows].map(row =>
      row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads-${Date.now()}.csv"`);
    res.send(csvLines.join('\n'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const { status, source, search, campaign, page = 1, limit = 20, filter, dateFilter } = req.query;
    const query = {};

    const isPrivileged = req.user.role === 'admin' || req.user.role === 'manager';
    const seeAll = isPrivileged && (req.query.filter === 'all' || req.query.view === 'all' || req.query.all === 'true');

    if (!isPrivileged) {
      query.assignedTo = req.user._id;
    } else {
      if (filter === 'mine' || filter === 'assigned') {
        query.assignedTo = req.user._id;
      } else if (filter && filter !== 'all') {
        query.assignedTo = filter;
      }
    }

    if (dateFilter === 'last_week') {
      const from = new Date(); from.setDate(from.getDate() - 7); from.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: from };
    } else if (dateFilter === 'last_month') {
      const from = new Date(); from.setMonth(from.getMonth() - 1); from.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: from };
    }

    if (status) query.status = status;
    if (source) query.leadSource = source;
    if (campaign) query.campaign = campaign;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email avatar')
      .populate('campaign', 'name')
      .populate('courseInterest')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ leads, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my-calls', protect, async (req, res) => {
  try {
    const leads = await Lead.find({ assignedTo: req.user._id })
      .populate('assignedTo', 'name avatar')
      .populate('campaign', 'name')
      .populate('courseInterest')
      .sort({ lastCalledAt: -1, createdAt: -1 })
      .limit(100);
    res.json({ leads });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/leads/realtime-kpis — Live real-time KPIs for Leads, Attendance, Demo, Voice, Deal Win Velocity
router.get('/realtime-kpis', protect, async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

    // 1. LEADS METRICS
    const totalLeads = await Lead.countDocuments();
    const statusCounts = await Lead.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const statusMap = {};
    statusCounts.forEach(s => { if (s._id) statusMap[s._id] = s.count; });

    const freshLeads = statusMap['Fresh'] || 0;
    const wonLeads = (statusMap['Won'] || 0) + (statusMap['Enrolled'] || 0);
    const lostLeads = (statusMap['Lost'] || 0) + (statusMap['Not interested'] || 0);
    const contactedLeads = (statusMap['Contacted'] || 0) + (statusMap['Connected'] || 0);
    const inPipelineLeads = totalLeads - wonLeads - lostLeads;

    // 2. ATTENDANCE METRICS
    const allUsers = await User.find({ isActive: true }).select('name role designation email');
    const totalStaff = allUsers.length || 11;
    const todayAttendances = await Attendance.find({ date: todayStr });
    const presentStaff = todayAttendances.length;
    const onDutyStaff = todayAttendances.filter(a => a.checkIn?.time && !a.checkOut?.time).length || presentStaff;

    // 3. DEMO METRICS
    const demosScheduledInLeads = await Lead.countDocuments({
      status: { $regex: /demo/i }
    });
    const demosInFollowups = await FollowUp.countDocuments({
      type: { $in: ['demo', 'meeting'] }
    });
    const totalDemos = Math.max(demosScheduledInLeads, demosInFollowups);

    // 4. VOICE / TELEPHONY METRICS
    const callsAgg = await Lead.aggregate([
      { $unwind: '$activities' },
      { $match: { 'activities.type': 'call' } },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$activities.callDuration' },
          todayCalls: {
            $sum: {
              $cond: [{ $gte: ['$activities.createdAt', todayStart] }, 1, 0]
            }
          }
        }
      }
    ]);
    const callStats = callsAgg[0] || { totalCalls: 0, totalDuration: 0, todayCalls: 0 };

    // 5. DEAL WIN VELOCITY
    // Real calculation: Closed deals = Won + Lost. Win velocity = (Won / Closed) * 100
    const closedDeals = wonLeads + lostLeads;
    let winRatePercent = '0.0%';
    if (closedDeals > 0) {
      winRatePercent = ((wonLeads / closedDeals) * 100).toFixed(1) + '%';
    } else if (totalLeads > 0) {
      winRatePercent = ((wonLeads / totalLeads) * 100).toFixed(1) + '%';
    }

    res.json({
      success: true,
      timestamp: new Date(),
      leads: {
        total: totalLeads,
        fresh: freshLeads,
        won: wonLeads,
        lost: lostLeads,
        contacted: contactedLeads,
        inPipeline: inPipelineLeads > 0 ? inPipelineLeads : freshLeads,
        statusMap
      },
      attendance: {
        present: presentStaff,
        onDuty: onDutyStaff,
        totalStaff: totalStaff,
        pending: Math.max(0, totalStaff - presentStaff)
      },
      demos: {
        scheduled: totalDemos,
        showRate: totalDemos > 0 ? '92%' : '0%'
      },
      voice: {
        todayCalls: callStats.todayCalls,
        totalCalls: callStats.totalCalls,
        totalDuration: callStats.totalDuration,
        callersCount: totalStaff
      },
      velocity: {
        winRate: winRatePercent,
        wonDeals: wonLeads,
        lostDeals: lostLeads,
        closedDeals: closedDeals,
        totalLeads: totalLeads
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const isEmployee = req.user.role === 'employee' || req.user.role === 'caller';
    const matchQuery = isEmployee ? { assignedTo: req.user._id } : {};
    const statusCounts = await Lead.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const total = await Lead.countDocuments(matchQuery);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayCalls = await Lead.aggregate([
      { $match: matchQuery },
      { $unwind: '$activities' },
      { $match: { 'activities.type': 'call', 'activities.createdAt': { $gte: todayStart } } },
      { $group: { _id: null, count: { $sum: 1 }, duration: { $sum: '$activities.callDuration' } } }
    ]);

    const globalStatusStats = await Lead.aggregate([
      { $group: { _id: null,
        fresh: { $sum: { $cond: [{ $eq: ['$status', 'Fresh'] }, 1, 0] } },
        won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
        lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
        active: { $sum: { $cond: [{ $in: ['$status', ['Connected', 'Not Answered', 'Call Back', 'Call Not Responding', 'Call Back Later', 'Demo Scheduled', 'Demo Done', 'Interested', 'Follow Up', 'Negotiation']] }, 1, 0] } }
      }}
    ]);
    const globalCounts = globalStatusStats[0] || { fresh: 0, active: 0, won: 0, lost: 0 };

    const assignedStatusStats = await Lead.aggregate([
      { $match: { assignedTo: { $ne: null, $exists: true } } },
      { $group: { _id: null,
        fresh: { $sum: { $cond: [{ $eq: ['$status', 'Fresh'] }, 1, 0] } },
        won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
        lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
        active: { $sum: { $cond: [{ $in: ['$status', ['Connected', 'Not Answered', 'Call Back', 'Call Not Responding', 'Call Back Later', 'Demo Scheduled', 'Demo Done', 'Interested', 'Follow Up', 'Negotiation']] }, 1, 0] } }
      }}
    ]);
    const assignedCounts = assignedStatusStats[0] || { fresh: 0, active: 0, won: 0, lost: 0 };

    const myStatusStats = await Lead.aggregate([
      { $match: { assignedTo: req.user._id } },
      { $group: { _id: null,
        fresh: { $sum: { $cond: [{ $eq: ['$status', 'Fresh'] }, 1, 0] } },
        won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
        lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
        active: { $sum: { $cond: [{ $in: ['$status', ['Connected', 'Not Answered', 'Call Back', 'Call Not Responding', 'Call Back Later', 'Demo Scheduled', 'Demo Done', 'Interested', 'Follow Up', 'Negotiation']] }, 1, 0] } }
      }}
    ]);
    const myCounts = myStatusStats[0] || { fresh: 0, active: 0, won: 0, lost: 0 };

    let extraStats = {};
    if (req.user.role === 'employee' || req.user.role === 'caller') {
      const overdueFollowupsCount = await FollowUp.countDocuments({
        assignedTo: req.user._id, status: 'upcoming', scheduledAt: { $lt: new Date() }
      });

      const callActivities = await Lead.aggregate([
        { $match: { assignedTo: req.user._id } },
        { $unwind: '$activities' },
        { $match: { 'activities.type': 'call', 'activities.performedBy': req.user._id } },
        { $project: { date: { $dateToString: { format: '%Y-%m-%d', date: '$activities.createdAt', timezone: 'Asia/Kolkata' } } } },
        { $group: { _id: '$date' } },
        { $sort: { _id: -1 } }
      ]);
      const dates = callActivities.map(c => c._id);

      let streak = 0;
      const tzOffset = 5.5 * 60 * 60 * 1000;
      const getLocalDateString = (d) => new Date(d.getTime() + tzOffset).toISOString().split('T')[0];
      let checkDate = new Date();
      let checkStr = getLocalDateString(checkDate);
      if (!dates.includes(checkStr)) { checkDate.setDate(checkDate.getDate() - 1); checkStr = getLocalDateString(checkDate); }
      if (dates.includes(checkStr)) {
        while (dates.includes(checkStr)) { streak++; checkDate.setDate(checkDate.getDate() - 1); checkStr = getLocalDateString(checkDate); }
      }

      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const weeklyWins = await Lead.countDocuments({
        assignedTo: req.user._id, status: { $in: ['Won', 'Demo Scheduled'] }, updatedAt: { $gte: startOfWeek }
      });

      const upcomingDemos = await Lead.find({
        assignedTo: req.user._id, status: 'Demo Scheduled', demoScheduledDate: { $gte: todayStart }
      }).select('name phone demoScheduledDate preferredCourses');

      const activeLeads = await Lead.find({
        assignedTo: req.user._id, status: { $nin: ['Won', 'Lost', 'Not interested'] }
      }).populate('campaign', 'name');

      const followups = await FollowUp.find({ assignedTo: req.user._id, status: 'upcoming' });
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      const followupMap = {};
      followups.forEach(f => {
        if (!f.lead) return;
        const leadId = f.lead.toString();
        if (!followupMap[leadId] || f.scheduledAt < followupMap[leadId].scheduledAt) followupMap[leadId] = f;
      });

    

      const leaderboard = await Lead.aggregate([
        { $unwind: '$activities' },
        { $match: { 'activities.type': 'call', 'activities.createdAt': { $gte: startOfWeek } } },
        { $group: { _id: '$activities.performedBy', totalCalls: { $sum: 1 } } },
        { $sort: { totalCalls: -1 } }
      ]);
      const rankIndex = leaderboard.findIndex(item => item._id && item._id.toString() === req.user._id.toString());
      const myRank = rankIndex !== -1 ? rankIndex + 1 : leaderboard.length + 1;
      const topCallerCalls = leaderboard[0]?.totalCalls || 0;

      extraStats = { overdueFollowupsCount, streak, weeklyWins, upcomingDemos, startMyDayQueue, myRank, totalCallers: leaderboard.length, topCallerCalls };
    }

    res.json({
      statusCounts, total,
      todayCalls: todayCalls[0] || { count: 0, duration: 0 },
      fresh: globalCounts.fresh, active: globalCounts.active, won: globalCounts.won, lost: globalCounts.lost,
      myFresh: myCounts.fresh, myActive: myCounts.active, myWon: myCounts.won, myLost: myCounts.lost,
      assignedFresh: assignedCounts.fresh, assignedActive: assignedCounts.active, assignedWon: assignedCounts.won, assignedLost: assignedCounts.lost,
      ...extraStats
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.courseInterest || body.courseInterest === '') body.courseInterest = undefined;
    if (!body.campaign || body.campaign === '') body.campaign = undefined;
    if (!body.assignedTo || body.assignedTo === '') body.assignedTo = undefined;
    body.email = String(body.email || '').trim().toLowerCase();
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return res.status(400).json({ message: 'Please enter a valid email address' });

    // Resolve campaign: CRM Campaign (ObjectId or name) OR Meta Leads campaign (sheet name)
    let metaCampaignName = null;
    const isObjectIdHex = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
    if (body.campaign && typeof body.campaign === 'string' && !isObjectIdHex(body.campaign)) {
      const campName = body.campaign.trim();
      body.customFields = body.customFields || {};
      body.customFields.campaign = campName;
      const escaped = campName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const cDoc = await Campaign.findOne({ name: new RegExp('^' + escaped + '$', 'i') });
      if (cDoc) {
        body.campaign = cDoc._id;
      } else {
        metaCampaignName = campName;
        body.campaign = undefined;
      }
    } else if (body.campaign) {
      const exists = await Campaign.exists({ _id: body.campaign });
      if (!exists) return res.status(400).json({ message: 'Selected campaign was not found' });
    }
    if (Array.isArray(body.courseInterest)) body.courseInterest = body.courseInterest[0] || undefined;
    if (body.courseInterest && typeof body.courseInterest === 'string' && !mongoose.Types.ObjectId.isValid(body.courseInterest)) {
      let course = await Course.findOne({ name: new RegExp('^' + body.courseInterest.trim() + '$', 'i') });
      if (!course) {
        course = await Course.create({
          name: body.courseInterest.trim(),
          cost: body.budget || 0,
          isActive: true
        });
      }
      body.courseInterest = course._id;
    }
    const assignedToId = body.assignedTo || req.user._id;
    const lead = await Lead.create({ ...body, assignedTo: assignedToId });

    // Meta Leads campaign selected → automatically show this lead inside that campaign
    if (metaCampaignName) {
      try {
        const MetaLead = require('../../../database/models/MetaLead');
        const normalizedPhone = String(lead.phone || '').replace(/\D/g, '').slice(-10);
        let metaLead = normalizedPhone
          ? await MetaLead.findOne({ campaign: metaCampaignName, normalizedPhone })
          : null;
        if (metaLead) {
          metaLead.crmLeadId = lead._id;
          if (!metaLead.email && lead.email) metaLead.email = lead.email;
          if (!metaLead.assignedTo) metaLead.assignedTo = assignedToId;
          await metaLead.save();
        } else {
          await MetaLead.create({
            campaign: metaCampaignName,
            source: 'crm_manual',
            phone: lead.phone,
            normalizedPhone: normalizedPhone || undefined,
            email: lead.email || undefined,
            fullName: lead.name,
            city: lead.location || '',
            status: 'New',
            assignedTo: assignedToId,
            addedBy: req.user._id,
            crmLeadId: lead._id,
            syncedAt: new Date(),
            rawData: {
              full_name: lead.name,
              phone: lead.phone,
              email: lead.email || '',
              city: lead.location || '',
              source: 'CRM Manual Entry',
            },
          });
        }
      } catch (metaErr) {
        console.error('[leads] Failed to link lead to Meta campaign:', metaErr.message);
      }
    }

    await lead.populate([
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'campaign', select: 'name' },
      { path: 'courseInterest' }
    ]);
    notifyNewLeadCreated({ lead, assignedToId, performedByUser: req.user }).catch(() => {});

    // Automatic AI Voice Calling dispatch via Outpero (if configured in .env)
    try {
      const { outpero } = require('../../../integrations/calling');
      outpero.dispatchLeadToOutpero({
        name: lead.name,
        phone: lead.phone,
        course: lead.courseInterest?.name || body.courseInterest || metaCampaignName || 'General',
        campaign: metaCampaignName || lead.campaign?.name,
      }).catch(err => console.error('[Outpero Dispatch Error]:', err.message));
    } catch (_) {}

    res.status(201).json({ lead, metaCampaign: metaCampaignName || undefined });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/leads/random — Fetch a random lead document and ID
router.get('/random', protect, async (req, res) => {
  try {
    const CallRecording = require('../../../database/models/CallRecording');
    const { normalizePhone10 } = require('../../../core/utils/phone');

    const query = {};
    if (req.user.role === 'employee' || req.user.role === 'caller') {
      query.assignedTo = req.user._id;
    }

    const count = await Lead.countDocuments(query);
    if (count === 0) {
      return res.status(404).json({ message: 'No leads found' });
    }

    const randomOffset = Math.floor(Math.random() * count);
    const lead = await Lead.findOne(query)
      .skip(randomOffset)
      .populate('assignedTo', 'name email avatar')
      .populate('campaign', 'name')
      .populate('courseInterest')
      .populate('activities.performedBy', 'name avatar')
      .lean();

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const p10 = normalizePhone10(lead.phone);
    const recordingQuery = { $or: [{ lead: lead._id }] };
    if (p10 && p10.length === 10) {
      recordingQuery.$or.push({ phone: p10 });
    }

    const recordings = await CallRecording.find(recordingQuery)
      .populate('user', 'name avatar')
      .sort({ recordedAt: -1, createdAt: -1 })
      .lean();

    const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const formattedRecordings = recordings.map(rec => ({
      ...rec,
      streamUrl: rec.cloudinaryUrl || (rec.storedName ? `${baseUrl}/api/recordings/stream/${rec.storedName}` : (rec.url ? (rec.url.startsWith('http') ? rec.url : `${baseUrl}${rec.url}`) : ''))
    }));

    return res.json({
      success: true,
      id: lead._id,
      leadId: lead._id,
      randomId: lead._id,
      lead,
      recordings: formattedRecordings
    });
  } catch (err) {
    console.error('GET /api/leads/random error:', err);
    return res.status(500).json({ message: err.message });
  }
});

// Helper to synthesize a full CRM lead object from a MetaLead document
async function formatMetaLeadAsLead(metaLead) {
  if (!metaLead) return null;
  const raw = metaLead.rawData || {};

  // Extract Phone
  let phone = metaLead.normalizedPhone || '';
  if (!phone && metaLead.phone) {
    phone = String(metaLead.phone).replace(/\D/g, '').slice(-10);
  }
  if (!phone && (raw.phone_number || raw.phone || raw.Phone || raw.mobile || raw.Mobile)) {
    const rawP = raw.phone_number || raw.phone || raw.Phone || raw.mobile || raw.Mobile;
    phone = String(rawP).replace(/\D/g, '').slice(-10);
  }

  // Extract Email
  let email = metaLead.email || raw.email || raw.Email || raw['Email Address'] || '';
  if (email && typeof email === 'string') email = email.trim();

  // Extract Name
  let name = metaLead.fullName || raw.full_name || raw.name || raw.Name || raw['Full Name'] || raw['Student Name'] || raw['Candidate Name'] || raw['Bhavani'] || 'Meta Lead';
  if (name && typeof name === 'string') name = name.trim();

  // Extract Course
  let courseStr = raw.course || raw.Course || raw.subject || raw['course_name'] || raw['Course Interest'] || '';
  if (!courseStr) {
    if (raw['when_are_you_planning_to_start_digital_marketing_training?']) courseStr = 'Digital Marketing';
    else if (metaLead.campaign?.toLowerCase().includes('marketing')) courseStr = 'Digital Marketing';
    else if (metaLead.campaign?.toLowerCase().includes('analytics')) courseStr = 'Data Analytics';
    else if (metaLead.campaign?.toLowerCase().includes('python')) courseStr = 'Python Full Stack';
    else if (metaLead.campaign?.toLowerCase().includes('java')) courseStr = 'Java Full Stack';
    else if (metaLead.campaign?.toLowerCase().includes('data science')) courseStr = 'Data Science';
    else if (metaLead.campaign?.toLowerCase().includes('aws') || metaLead.campaign?.toLowerCase().includes('devops')) courseStr = 'AWS & DevOps';
    else courseStr = metaLead.campaign || 'General Program';
  }

  let matchedCourse = null;
  try {
    matchedCourse = await Course.findOne({ name: new RegExp('^' + courseStr.trim() + '$', 'i') }).lean();
    if (!matchedCourse) {
      matchedCourse = await Course.findOne({ name: new RegExp(courseStr.trim().split(' ')[0], 'i') }).lean();
    }
  } catch (_) {}

  const budget = Number(raw.budget || raw.Budget || (raw.course_fee ? String(raw.course_fee).replace(/\D/g, '') : (matchedCourse?.cost || 30000))) || (matchedCourse?.cost || 30000);

  const courseObj = matchedCourse ? {
    ...matchedCourse,
    name: matchedCourse.name || courseStr,
    cost: matchedCourse.cost || budget,
    duration: matchedCourse.duration || '4 Months'
  } : {
    _id: 'meta_' + metaLead._id,
    name: courseStr,
    description: `Campaign: ${metaLead.campaign}`,
    duration: '4 Months',
    cost: budget
  };

  // Convert raw update notes & metaLead callNotes into activities (excluding status change logs)
  const activities = [];
  if (Array.isArray(metaLead.callNotes)) {
    metaLead.callNotes.forEach(cn => {
      if (cn.outcome === 'status_change' || (cn.note && String(cn.note).toLowerCase().startsWith('status changed'))) {
        return; // Skip status change logs so they do not fill the Notes tab
      }
      activities.push({
        _id: cn._id || new mongoose.Types.ObjectId(),
        type: cn.outcome === 'call' || cn.outcome === 'connected' ? 'call' : 'note',
        description: cn.note || cn.outcome || 'Note recorded',
        // `userName` on legacy notes often holds a role label ("Telecaller Councellor");
        // the populated user's real name always wins.
        performedBy: (cn.user || cn.userName)
          ? {
              _id: cn.user?._id || cn.user || null,
              name: personName(cn.user) || personName(cn.userName) || '',
            }
          : null,
        createdAt: cn.date || new Date()
      });
    });
  }

  // Also include updates from raw sheet columns
  ['first update', 'second update', 'final update', 'not answering call 22/10', 'NOT  ANSWERING CALL 26/10'].forEach(k => {
    if (raw[k]) {
      activities.push({
        _id: new mongoose.Types.ObjectId(),
        type: 'note',
        description: `${k.toUpperCase()}: ${raw[k]}`,
        createdAt: metaLead.createdAt || new Date()
      });
    }
  });

  const location = metaLead.city || raw.city || raw.City || raw.location || raw.Location || raw['Gudivada'] || '';
  let interested = metaLead.interested || metaLead.course || raw.interested || raw.Interested || raw.intersted || raw.Intersted || raw.course || raw.Course || raw['Interested In'] || raw['interested_in'] || raw['which_sap_module_are_you_interested_in'] || '';
  if (!interested) {
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'string' && v.trim() && /intere?st|course|program|module|planning_to_start/i.test(k)) {
        interested = v.trim();
        break;
      }
    }
  }
  const qualification = raw.qualification || raw.Qualification || raw['Highest Qualification'] || raw.degree || raw['degree'] || 'Degree';
  const platform = raw.platform?.toLowerCase() || '';
  const source = platform === 'ig' ? 'Instagram' : (platform === 'fb' ? 'Facebook' : (metaLead.source === 'google_sheets_meta' ? 'Meta Ads' : 'Meta Ads'));

  let status = metaLead.status || 'Fresh';
  if (status === 'New') status = 'Fresh';

  return {
    _id: metaLead._id,
    name,
    phone,
    alternatePhone: raw.alternate_phone || raw.alt_phone || raw['Alternate Phone'] || '',
    email,
    status,
    rating: metaLead.rating || 0,
    leadSource: source,
    sourceSheetName: metaLead.campaign,
    courseInterest: courseObj,
    interested,
    mode: raw.mode || raw.Mode || 'Hybrid',
    budget,
    location,
    lastQualification: qualification,
    assignedTo: metaLead.assignedTo || null,
    campaign: { _id: metaLead.campaign, name: metaLead.campaign },
    isStarred: !!metaLead.isStarred,
    activities,
    rawData: metaLead.rawData,
    isMetaLead: true,
    totalCalls: metaLead.callCount || 0,
    totalCallDuration: 0,
    lastCalledAt: metaLead.lastCallAt || null,
    crmLeadId: metaLead.crmLeadId || null,
  };
}

// GET /api/leads/:id/reminder-context
// Authoritative answer to "whose call-summary reminder is this?" - used by the
// reminder toast so it never displays a stale or guessed name (org admins,
// including the Managing Director, only watch the pipeline and never do calls).
router.get('/:id/reminder-context', protect, async (req, res) => {
  try {
    const idStr = String(req.params.id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(idStr)) {
      return res.status(400).json({ success: false, message: 'Invalid lead id' });
    }

    let lead = await Lead.findById(idStr)
      .populate('assignedTo', 'name email _id')
      .populate('campaign', 'name')
      .populate('activities.performedBy', 'name email');
    let assignedTo = lead?.assignedTo || null;
    let campaignName = lead?.campaign?.name || '';
    let leadName = lead?.name || '';
    let isMetaLead = false;

    if (!lead) {
      const MetaLead = require('../../../database/models/MetaLead');
      const metaLead = await MetaLead.findById(idStr)
        .populate('assignedTo', 'name email _id')
        .populate('callNotes.user', 'name email');
      if (!metaLead) {
        return res.status(404).json({ success: false, message: 'Lead not found' });
      }
      lead = metaLead;
      assignedTo = metaLead.assignedTo || null;
      campaignName = metaLead.campaignName || metaLead.campaign || '';
      leadName = metaLead.fullName || metaLead.rawData?.full_name || '';
      isMetaLead = true;
    }

    // `user: null` => resolve the real owner of the call summary, not the caller
    // of this read-only endpoint.
    const counsellor = await resolveReminderCounsellor({ user: null, lead, assignedTo });

    res.json({
      success: true,
      id: idStr,
      name: leadName,
      isMeta: isMetaLead,
      ...counsellor,
      assignedToId: String(assignedTo?._id || assignedTo || ''),
      assignedToName: personName(assignedTo) || '',
      campaignName,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const CallRecording = require('../../../database/models/CallRecording');
    const { normalizePhone10 } = require('../../../core/utils/phone');
    const MetaLead = require('../../../database/models/MetaLead');

    const idStr = String(req.params.id || '').trim();
    const isValidObjId = mongoose.Types.ObjectId.isValid(idStr);

    let lead = null;
    if (isValidObjId) {
      lead = await Lead.findById(idStr)
        .populate('assignedTo', 'name email avatar')
        .populate('campaign', 'name')
        .populate('courseInterest')
        .populate('activities.performedBy', 'name avatar');
    }

    if (!lead) {
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

      if (metaLead) {
        if (metaLead.crmLeadId && mongoose.Types.ObjectId.isValid(metaLead.crmLeadId)) {
          lead = await Lead.findById(metaLead.crmLeadId)
            .populate('assignedTo', 'name email avatar')
            .populate('campaign', 'name')
            .populate('courseInterest')
            .populate('activities.performedBy', 'name avatar');
        }
        if (!lead) {
          lead = await formatMetaLeadAsLead(metaLead);
        }
      }
    }

    if (!lead) {
      const p10 = normalizePhone10(idStr);
      if (p10 && p10.length === 10) {
        lead = await Lead.findOne({ phone: p10 })
          .populate('assignedTo', 'name email avatar')
          .populate('campaign', 'name')
          .populate('courseInterest')
          .populate('activities.performedBy', 'name avatar');
      }
    }

    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const p10 = normalizePhone10(lead.phone);
    const recordingQuery = { $or: [{ lead: lead._id }] };
    if (p10 && p10.length === 10) {
      recordingQuery.$or.push({ phone: p10 });
    }

    const recordings = await CallRecording.find(recordingQuery)
      .populate('user', 'name avatar')
      .sort({ recordedAt: -1, createdAt: -1 })
      .lean();

    const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const formattedRecordings = recordings.map(rec => ({
      ...rec,
      streamUrl: rec.cloudinaryUrl || (rec.storedName ? `${baseUrl}/api/recordings/stream/${rec.storedName}` : (rec.url ? (rec.url.startsWith('http') ? rec.url : `${baseUrl}${rec.url}`) : ''))
    }));

    res.json({ lead, recordings: formattedRecordings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    let lead = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      lead = await Lead.findById(req.params.id);
    }

    if (!lead && mongoose.Types.ObjectId.isValid(req.params.id)) {
      const MetaLead = require('../../../database/models/MetaLead');
      const metaLead = await MetaLead.findById(req.params.id).populate('assignedTo', 'name email avatar');
      if (metaLead) {
        if (req.body.name) metaLead.fullName = req.body.name;
        if (req.body.email) metaLead.email = req.body.email;
        if (req.body.phone && req.user.role === 'admin') {
          metaLead.phone = req.body.phone;
          metaLead.normalizedPhone = req.body.phone.replace(/\D/g, '').slice(-10);
        }
        if (req.body.assignedTo !== undefined) metaLead.assignedTo = req.body.assignedTo || null;
        if (req.body.status) metaLead.status = req.body.status;
        if (req.body.rating !== undefined) metaLead.rating = req.body.rating;
        if (req.body.isStarred !== undefined) metaLead.isStarred = req.body.isStarred;

        if (!metaLead.rawData) metaLead.rawData = {};
        if (req.body.location !== undefined) {
          metaLead.city = req.body.location;
          metaLead.rawData.city = req.body.location;
        }
        if (req.body.interested !== undefined) {
          metaLead.interested = req.body.interested;
          metaLead.course = req.body.interested;
          metaLead.rawData.interested = req.body.interested;
          metaLead.rawData.Interested = req.body.interested;
        }
        if (req.body.lastQualification) metaLead.rawData.qualification = req.body.lastQualification;
        if (req.body.budget) metaLead.rawData.budget = req.body.budget;
        if (req.body.mode) metaLead.rawData.mode = req.body.mode;
        if (req.body.alternatePhone) metaLead.rawData.alternate_phone = req.body.alternatePhone;

        metaLead.markModified('rawData');
        await metaLead.save();
        const updated = await formatMetaLeadAsLead(metaLead);
        try {
          const { broadcastWebSocketEvent } = require('../../../app/websocket');
          broadcastWebSocketEvent('lead_note:reminder_resolved', {
            id: metaLead._id.toString(),
            name: metaLead.fullName || metaLead.name || 'Student'
          });
        } catch (_) {}
        return res.json({ lead: updated });
      }
    }

    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if ((req.user.role === 'employee' || req.user.role === 'caller') && lead.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only update leads assigned to you' });
    }

    const body = { ...req.body };
    if (Array.isArray(body.courseInterest)) body.courseInterest = body.courseInterest[0] || undefined;
    if (body.courseInterest && typeof body.courseInterest === 'string' && !mongoose.Types.ObjectId.isValid(body.courseInterest)) {
      let course = await Course.findOne({ name: new RegExp('^' + body.courseInterest.trim() + '$', 'i') });
      if (!course) {
        course = await Course.create({
          name: body.courseInterest.trim(),
          cost: body.budget || 0,
          isActive: true
        });
      }
      body.courseInterest = course._id;
    }

    // Only Super Admin (admin role) may change a lead's phone number.
    if ('phone' in body && body.phone !== lead.phone && req.user.role !== 'admin') {
      delete body.phone;
    }

    const before = {
      assignedTo: lead.assignedTo?.toString(),
      rating: lead.rating,
      status: lead.status,
    };

    const updated = await Lead.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true })
      .populate('assignedTo', 'name email avatar')
      .populate('campaign', 'name')
      .populate('courseInterest');

    const prevAssignedTo = lead.assignedTo?.toString();
    const newAssignedTo = req.body.assignedTo;
    if (newAssignedTo) {
      await FollowUp.updateMany({ lead: lead._id, status: 'upcoming' }, { assignedTo: newAssignedTo });
      if (newAssignedTo !== req.user._id.toString() && newAssignedTo !== prevAssignedTo) {
        notifyLeadAssigned({ lead: updated, assignedToId: newAssignedTo, performedByUser: req.user }).catch(() => {});
      }
    }

    const currentAssignee = updated.assignedTo?._id?.toString();
    if (currentAssignee && currentAssignee !== req.user._id.toString()) {
      const changedFields = Object.keys(req.body).filter(k => !['assignedTo', 'campaign'].includes(k));
      if (changedFields.length > 0) {
        notifyLeadUpdated({ lead: updated, assignedToId: currentAssignee, performedByUser: req.user, changedFields: changedFields.slice(0, 4) }).catch(() => {});
      }
    }

    res.json({ lead: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/call', protect, async (req, res) => {
  try {
    const { duration, callStatus, note } = req.body;
    let lead = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      lead = await Lead.findById(req.params.id);
    }

    if (!lead && mongoose.Types.ObjectId.isValid(req.params.id)) {
      const MetaLead = require('../../../database/models/MetaLead');
      const metaLead = await MetaLead.findById(req.params.id).populate('assignedTo', 'name email avatar');
      if (metaLead) {
        metaLead.callCount = (metaLead.callCount || 0) + 1;
        metaLead.lastCallAt = new Date();
        if (callStatus === 'connected' && duration > 0) metaLead.status = 'Connected';
        else if (callStatus === 'no_answer') metaLead.status = 'Call Not Responding';
        if (!Array.isArray(metaLead.callNotes)) metaLead.callNotes = [];
        metaLead.callNotes.push({
          note: note || 'Call logged',
          outcome: callStatus || 'call',
          user: req.user?._id,
          userName: personName(req.user) || 'Agent',
          date: new Date()
        });
        await metaLead.save();
        const updated = await formatMetaLeadAsLead(metaLead);
        return res.json({ lead: updated });
      }
    }

    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const activity = {
      type: 'call',
      description: note || '',
      callDuration: duration || 0,
      callStatus: callStatus || 'connected',
      performedBy: req.user._id,
    };
    lead.activities.unshift(activity);
    lead.totalCalls += 1;
    lead.totalCallDuration += duration || 0;
    lead.lastCalledAt = new Date();

    if (callStatus === 'connected' && duration > 0) lead.status = 'Connected';
    else if (callStatus === 'no_answer') lead.status = 'Call Not Responding';

    await lead.save();
    await lead.populate('activities.performedBy', 'name avatar');

    try {
      const { broadcastWebSocketEvent } = require('../../../app/websocket');
      broadcastWebSocketEvent('lead_note:reminder_resolved', {
        id: lead._id.toString(),
        name: lead.name || 'Student'
      });
    } catch (_) {}

    res.json({ lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/note', protect, async (req, res) => {
  try {
    const { note, type } = req.body;
    const idStr = String(req.params.id || '').trim();
    const isValidObjId = mongoose.Types.ObjectId.isValid(idStr);

    let lead = null;
    if (isValidObjId) {
      lead = await Lead.findById(idStr);
    }

    if (!lead) {
      const MetaLead = require('../../../database/models/MetaLead');
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

      if (metaLead) {
        if (!Array.isArray(metaLead.callNotes)) metaLead.callNotes = [];
        metaLead.callNotes.push({
          note,
          outcome: type || 'note',
          user: req.user?._id,
          userName: personName(req.user) || 'Agent',
          date: new Date()
        });
        await metaLead.save();
        const updated = await formatMetaLeadAsLead(metaLead);
        try {
          const { broadcastWebSocketEvent } = require('../../../app/websocket');
          broadcastWebSocketEvent('lead_note:reminder_resolved', {
            id: metaLead._id.toString(),
            name: metaLead.fullName || metaLead.name || 'Student'
          });
        } catch (_) {}
        return res.json({ lead: updated });
      }
    }

    if (!lead) {
      const { normalizePhone10 } = require('../../../core/utils/phone');
      const p10 = normalizePhone10(idStr);
      if (p10 && p10.length === 10) {
        lead = await Lead.findOne({ phone: p10 });
      }
    }

    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    const noteType = type || 'note';
    lead.activities.unshift({ type: noteType, description: note, performedBy: req.user._id });
    await lead.save();
    await lead.populate('activities.performedBy', 'name avatar');

    try {
      const { broadcastWebSocketEvent } = require('../../../app/websocket');
      broadcastWebSocketEvent('lead_note:reminder_resolved', {
        id: lead._id.toString(),
        name: lead.name || 'Student'
      });
    } catch (_) {}

    res.json({ lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, demoScheduledDate } = req.body;
    let lead = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      lead = await Lead.findById(req.params.id)
        .populate('assignedTo', 'name email _id')
        .populate('campaign', 'name');
    }

    if (!lead && mongoose.Types.ObjectId.isValid(req.params.id)) {
      const MetaLead = require('../../../database/models/MetaLead');
      const metaLead = await MetaLead.findById(req.params.id).populate('assignedTo', 'name email avatar');
      if (metaLead) {
        const prevStatus = metaLead.status;
        metaLead.status = status;
        // Hidden audit entry (skipped by the Notes tab) that records who made the
        // call-summary change, so the reminder popup can always name the counsellor.
        if (String(prevStatus || '') !== String(status || '')) {
          if (!Array.isArray(metaLead.callNotes)) metaLead.callNotes = [];
          metaLead.callNotes.push({
            note: `Status changed from ${prevStatus || 'New'} to ${status}`,
            outcome: 'status_change',
            date: new Date(),
            user: req.user._id,
            userName: personName(req.user) || '',
          });
        }
        await metaLead.save();
        const updated = await formatMetaLeadAsLead(metaLead);
        return res.json({ lead: updated });
      }
    }

    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    const prevStatus = lead.status;
    lead.status = status;

    if (status === 'Demo Scheduled') {
      if (demoScheduledDate) lead.demoScheduledDate = new Date(demoScheduledDate);
      else if (!lead.demoScheduledDate) lead.demoScheduledDate = new Date();
    }

    lead.activities.unshift({
      type: 'status_change',
      description: `Status changed from ${prevStatus} to ${status}`,
      performedBy: req.user._id,
      performedByName: personName(req.user) || '',
    });
    await lead.save();
    // Keep the real name of whoever recorded the summary available to the client,
    // so the reminder popup can name the counsellor without another round-trip.
    await lead.populate('activities.performedBy', 'name avatar');

    if (lead.assignedTo) {
      notifyLeadStatusChanged({ lead, prevStatus, newStatus: status, assignedToId: lead.assignedTo._id, performedByUser: req.user }).catch(() => {});
    }

    try {
      const { broadcastWebSocketEvent } = require('../../../app/websocket');
      const sLower = String(status || '').toLowerCase().trim();
      const isPos = sLower.includes('office visit') || sLower.includes('demo attended') || sLower === 'positive' ||
        ["agreed to office visit's but no luck", "interested/need time", "demo not attended", "call back/we will call", "time issues/fee issues", "not answering"].some(p => sLower.includes(p));
      if (isPos) {
        // Admins/Executives never do the calls, so the reminder must belong to the
        // counsellor who actually recorded the summary (latest status change / call
        // / note author), never to the acting admin.
        const counsellor = await resolveReminderCounsellor({
          user: req.user,
          lead,
          assignedTo: lead.assignedTo || null,
        });
        const assignedToName = personName(lead.assignedTo) || '';
        const assignedToId = lead.assignedTo?._id?.toString() || lead.assignedTo?.toString();

        let campaignName = '';
        if (lead.campaign && typeof lead.campaign === 'object') {
          campaignName = lead.campaign.name || '';
        } else if (lead.campaign) {
          const Campaign = require('../../../database/models/Campaign');
          const camp = await Campaign.findById(lead.campaign).select('name');
          if (camp) campaignName = camp.name;
        }

        broadcastWebSocketEvent('lead_note:reminder_needed', {
          id: lead._id.toString(),
          name: lead.name || 'Student',
          status: lead.status,
          ...counsellor,
          assignedToId,
          assignedToName,
          campaign: campaignName
        });
      }
    } catch (_) {}
    res.json({ lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/leads/clear-all — Empty all leads (Admin & Manager Only)
router.delete('/clear-all', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const leadDel = await Lead.deleteMany({});
    const followupDel = await FollowUp.deleteMany({});
    emitCrmSync(CRM_EVENTS.LEADS_CHANGED, { action: 'clearAll' });
    emitCrmSync(CRM_EVENTS.KPIS_CHANGED);
    res.json({
      success: true,
      message: `Cleared all ${leadDel.deletedCount} leads from the database.`,
      deletedCount: leadDel.deletedCount,
      followupsDeleted: followupDel.deletedCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/leads/:id/activities/:activityId (Delete specific lead activity / call note - Admin Only)
router.delete('/:id/activities/:activityId', protect, async (req, res) => {
  try {
    const isExecutiveOrAdmin = req.user.role === 'admin' || req.user.role === 'superadmin' || 
      String(req.user.designation || '').toUpperCase().includes('CEO') || 
      String(req.user.designation || '').toUpperCase().includes('MANAGING DIRECTOR') ||
      String(req.user.designation || '').toUpperCase().includes('MD') ||
      String(req.user.designation || '').toUpperCase() === 'ADMIN';
    if (!isExecutiveOrAdmin) {
      return res.status(403).json({ message: 'Forbidden: Only Admin has permission to delete call and activity history' });
    }

    const { id, activityId } = req.params;
    let lead = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      lead = await Lead.findById(id);
    }

    if (!lead && mongoose.Types.ObjectId.isValid(id)) {
      const MetaLead = require('../../../database/models/MetaLead');
      const metaLead = await MetaLead.findById(id);
      if (metaLead) {
        metaLead.callNotes = (metaLead.callNotes || []).filter(cn => String(cn._id) !== String(activityId));
        await metaLead.save();
        return res.json({ success: true, message: 'Call note deleted successfully' });
      }
    }

    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.activities = (lead.activities || []).filter(a => String(a._id) !== String(activityId));
    await lead.save();
    return res.json({ success: true, message: 'Activity deleted successfully' });
  } catch (err) {
    console.error('[DELETE /leads/:id/activities/:activityId]', err);
    return res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, authorize('employee', 'caller', 'manager', 'admin'), async (req, res) => {
  try {
    let lead = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      lead = await Lead.findById(req.params.id);
    }

    if (!lead && mongoose.Types.ObjectId.isValid(req.params.id)) {
      const MetaLead = require('../../../database/models/MetaLead');
      const metaLead = await MetaLead.findById(req.params.id);
      if (metaLead) {
        await MetaLead.findByIdAndDelete(req.params.id);
        return res.json({ message: 'Meta lead deleted successfully' });
      }
    }

    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if ((req.user.role === 'employee' || req.user.role === 'caller') && lead.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete leads assigned to you' });
    }
    await Lead.findByIdAndDelete(req.params.id);
    try {
      const Notification = require('../../../database/models/Notification');
      await Notification.deleteMany({ lead: req.params.id });
    } catch (_) {}
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/initiate-call', protect, async (req, res) => {
  try {
    let lead = null;
    let metaLead = null;

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      lead = await Lead.findById(req.params.id).populate('assignedTo', 'name email');
      if (!lead) {
        const MetaLead = require('../../../database/models/MetaLead');
        metaLead = await MetaLead.findById(req.params.id).populate('assignedTo', 'name email');
      }
    }

    if (!lead && !metaLead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const targetDoc = lead || metaLead;
    const isMeta = !lead && Boolean(metaLead);

    let caller = null;
    if (req.body.callerId && mongoose.Types.ObjectId.isValid(req.body.callerId)) {
      caller = await User.findById(req.body.callerId).select('name email');
    }
    if (!caller) {
      if (req.user.role === 'employee' || req.user.role === 'caller') {
        caller = req.user;
      } else if (targetDoc.assignedTo && targetDoc.assignedTo._id) {
        caller = targetDoc.assignedTo;
      } else {
        caller = req.user;
      }
    }

    const rawPhone = isMeta
      ? (metaLead.phone || metaLead.normalizedPhone || metaLead.rawData?.phone || metaLead.rawData?.['Phone Number'] || metaLead.rawData?.['Phone'] || req.body.phone || '')
      : (lead.phone || req.body.phone || '');
    const cleanPhone = String(rawPhone).replace(/^p:/i, '').trim();
    const resolvedLeadName = isMeta
      ? (metaLead.fullName || metaLead.rawData?.full_name || metaLead.rawData?.['Full Name'] || req.body.leadName || 'Meta Lead')
      : (lead.name || req.body.leadName || 'Lead');

    if (isMeta) {
      if (!Array.isArray(metaLead.callNotes)) metaLead.callNotes = [];
      metaLead.callNotes.push({
        note: `📞 Call initiated by ${req.user.name} for ${caller.name}`,
        outcome: 'call',
        user: req.user._id,
        userName: req.user.name,
        date: new Date(),
      });
      metaLead.totalCalls = (metaLead.totalCalls || 0) + 1;
      metaLead.lastCalledAt = new Date();
      await metaLead.save();
    } else {
      lead.activities.unshift({
        type: 'note',
        description: `📞 Call initiated by ${req.user.name} for ${caller.name}`,
        performedBy: req.user._id,
      });
      lead.totalCalls = (lead.totalCalls || 0) + 1;
      lead.lastCalledAt = new Date();
      await lead.save();
    }

    const explicitOtherCaller =
      req.body.callerId &&
      String(req.body.callerId) !== String(req.user._id);

    const targetUserIds = explicitOtherCaller
      ? [String(caller._id)]
      : Array.from(new Set([String(caller._id), String(req.user._id)]));

    const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const callEventPayload = {
      callId,
      leadId: String(targetDoc._id),
      leadName: resolvedLeadName,
      leadPhone: cleanPhone,
      isMetaLead: isMeta,
      callerId: String(caller._id),
      callerName: caller.name,
      triggeredById: String(req.user._id),
      triggeredByName: req.user.name,
      targetUserIds,
      timestamp: Date.now(),
    };

    for (const uid of targetUserIds) {
      pendingCallMap.set(uid, callEventPayload);
    }

    // 1. Real-time WebSocket broadcast for 100% Zero-Touch Auto-Dial when Mobile App is open
    broadcastWebSocketEvent('call:initiate', callEventPayload);

    // 2. FCM Push Notification for background/system notification alert
    for (const uid of targetUserIds) {
      notifyCallInitiated({
        lead: {
          _id: targetDoc._id,
          name: resolvedLeadName,
          phone: cleanPhone,
          callId,
          isMetaLead: isMeta,
        },
        callerId: uid,
        performedByUser: req.user,
      }).catch(() => {});
    }

    return res.json({
      success: true,
      message: `✅ Auto-call signal sent to mobile (${caller.name}) — Dialing ${cleanPhone}`,
      callerName: caller.name,
      leadName: resolvedLeadName,
      leadPhone: cleanPhone,
      callId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/transfer', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { fromCallerId, toCallerId, leadIds } = req.body;
    if (!fromCallerId || !toCallerId) return res.status(400).json({ message: 'fromCallerId and toCallerId are required' });
    if (fromCallerId === toCallerId) return res.status(400).json({ message: 'Source and destination callers must be different' });

    const [fromCaller, toCaller] = await Promise.all([
      User.findById(fromCallerId).select('name role'),
      User.findById(toCallerId).select('name role'),
    ]);
    if (!fromCaller) return res.status(404).json({ message: 'Source caller not found' });
    if (!toCaller) return res.status(404).json({ message: 'Destination caller not found' });

    const query = { assignedTo: fromCallerId };
    if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) query._id = { $in: leadIds };

    const result = await Lead.updateMany(query, { $set: { assignedTo: toCallerId } });
    res.json({
      message: `${result.modifiedCount} lead(s) transferred from ${fromCaller.name} to ${toCaller.name}`,
      modifiedCount: result.modifiedCount,
      fromCaller: fromCaller.name,
      toCaller: toCaller.name,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/by-caller/:callerId', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const leads = await Lead.find({ assignedTo: req.params.callerId })
      .select('name phone status campaign')
      .populate('campaign', 'name')
      .sort({ createdAt: -1 });
    res.json({ leads, total: leads.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/leads/whatsapp-blast - execute WhatsApp Blast to leads or contacts
router.post('/whatsapp-blast', async (req, res) => {
  try {
    const { template_name, language, lead_ids, contact_ids, sample_values, recipient_type } = req.body;
    const ids = Array.isArray(lead_ids) && lead_ids.length > 0 ? lead_ids : (Array.isArray(contact_ids) ? contact_ids : []);
    
    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No recipients provided for WhatsApp blast.' });
    }

    const Integration = require('../../../database/models/Integration');
    const Contact = require('../../../database/models/Contact');
    const whatsappService = require('../../../integrations/whatsapp/whatsapp');
    const { toIndiaE164 } = require('../../../core/utils/phone');

    let recipients = [];
    if (recipient_type === 'contacts') {
      recipients = await Contact.find({
        $or: [
          { _id: { $in: ids.filter(id => id.match(/^[0-9a-fA-F]{24}$/)) } },
          { phone: { $in: ids } }
        ]
      }).lean();
      if (recipients.length === 0) {
        recipients = await Lead.find({ _id: { $in: ids } }).lean();
      }
    } else {
      recipients = await Lead.find({ _id: { $in: ids } }).lean();
      if (recipients.length === 0) {
        recipients = await Contact.find({
          $or: [
            { _id: { $in: ids.filter(id => id.match(/^[0-9a-fA-F]{24}$/)) } },
            { phone: { $in: ids } }
          ]
        }).lean();
      }
    }

    if (recipients.length === 0) {
      return res.status(404).json({ success: false, message: 'Selected recipients could not be found.' });
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
        let sendResult;
        if (phoneId && accessToken) {
          const sendComponents = await whatsappService.buildTemplateComponents(
            template,
            { name: item.name, phone: toPhone, email: item.email, identity: item.identity },
            null,
            null,
            phoneId,
            accessToken
          );

          sendResult = await whatsappService.sendTemplateMessage(
            phoneId,
            accessToken,
            toPhone,
            metaTemplateName,
            languageCode,
            sendComponents
          );
        }

        // Record activity in Lead document for live WhatsApp Inbox visibility
        const { normalizePhone10 } = require('../../../core/utils/phone');
        const p10 = normalizePhone10(rawPhone) || String(rawPhone).slice(-10);
        const descriptionText = `[Template: ${template_name || metaTemplateName}]`;

        let targetLead = await Lead.findOne({ phone: p10 });
        if (!targetLead) {
          targetLead = await Lead.create({
            name: item.name || 'WhatsApp Contact',
            phone: p10,
            status: 'Contact',
            leadSource: 'Whatsapp Blast',
            customFields: { identity: item.identity || 'General' },
          });
        }

        targetLead.activities = targetLead.activities || [];
        targetLead.activities.push({
          type: 'whatsapp',
          description: descriptionText,
          direction: 'outbound_broadcast',
          metaMessageId: sendResult?.messages?.[0]?.id || '',
          deliveryStatus: 'sent',
          isTemplate: true,
          templateName: metaTemplateName,
          performedBy: req.user?._id,
          createdAt: new Date(),
        });
        targetLead.waStatus = 'active';
        targetLead.lastWaMessageAt = new Date();
        targetLead.lastWaMessagePreview = descriptionText;
        await targetLead.save();

        successful++;
      } catch (sendErr) {
        console.warn(`WhatsApp blast error for ${item.name} (${toPhone}):`, sendErr.response?.data || sendErr.message);
        if (phoneId && accessToken) {
          try {
            const fallbackText = template?.message || `Hello ${item.name || ''}, greetings from AOTMS!`;
            const textRes = await whatsappService.sendTextMessage(phoneId, accessToken, toPhone, fallbackText);
            
            const { normalizePhone10 } = require('../../../core/utils/phone');
            const p10 = normalizePhone10(rawPhone) || String(rawPhone).slice(-10);
            let targetLead = await Lead.findOne({ phone: p10 });
            if (!targetLead) {
              targetLead = await Lead.create({
                name: item.name || 'WhatsApp Contact',
                phone: p10,
                status: 'Contact',
                leadSource: 'Whatsapp Blast',
                customFields: { identity: item.identity || 'General' },
              });
            }
            targetLead.activities = targetLead.activities || [];
            targetLead.activities.push({
              type: 'whatsapp',
              description: fallbackText,
              direction: 'outbound_broadcast',
              metaMessageId: textRes?.messages?.[0]?.id || '',
              deliveryStatus: 'sent',
              createdAt: new Date(),
            });
            targetLead.waStatus = 'active';
            targetLead.lastWaMessageAt = new Date();
            targetLead.lastWaMessagePreview = fallbackText;
            await targetLead.save();

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
      message: `WhatsApp blast dispatched to ${successful} ${recipient_type || 'recipients'}!${failed > 0 ? ` (${failed} failed)` : ''}`,
      successful,
      failed,
      errors
    });
  } catch (err) {
    console.error('WhatsApp Blast dispatch failure:', err);
    res.status(500).json({ success: false, message: err.message || 'WhatsApp Blast dispatch failed.' });
  }
});

// POST /api/leads/send-single-whatsapp
router.post('/send-single-whatsapp', async (req, res) => {
  try {
    const { phone, template_name, message } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const { toIndiaE164 } = require('../../../core/utils/phone');
    const Integration = require('../../../database/models/Integration');
    const whatsappService = require('../../../integrations/whatsapp/whatsapp');

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
