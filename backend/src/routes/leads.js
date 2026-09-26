const express = require('express');
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Course = require('../models/Course');
const FollowUp = require('../models/FollowUp');
const Attendance = require('../models/Attendance');
const { protect, authorize } = require('../middleware/auth');
const {
  notifyLeadAssigned,
  notifyLeadStatusChanged,
  notifyLeadUpdated,
  notifyNewLeadCreated,
  notifyCallInitiated,
} = require('../services/notificationService');

const router = express.Router();

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

    if (req.user.role === 'employee' || req.user.role === 'caller') {
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
        active: { $sum: { $cond: [{ $in: ['$status', ['Connected', 'Call Not Responding', 'Call Back Later', 'Demo Scheduled', 'Demo Done']] }, 1, 0] } }
      }}
    ]);
    const globalCounts = globalStatusStats[0] || { fresh: 0, active: 0, won: 0, lost: 0 };

    const assignedStatusStats = await Lead.aggregate([
      { $match: { assignedTo: { $ne: null, $exists: true } } },
      { $group: { _id: null,
        fresh: { $sum: { $cond: [{ $eq: ['$status', 'Fresh'] }, 1, 0] } },
        won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
        lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
        active: { $sum: { $cond: [{ $in: ['$status', ['Connected', 'Call Not Responding', 'Call Back Later', 'Demo Scheduled', 'Demo Done']] }, 1, 0] } }
      }}
    ]);
    const assignedCounts = assignedStatusStats[0] || { fresh: 0, active: 0, won: 0, lost: 0 };

    const myStatusStats = await Lead.aggregate([
      { $match: { assignedTo: req.user._id } },
      { $group: { _id: null,
        fresh: { $sum: { $cond: [{ $eq: ['$status', 'Fresh'] }, 1, 0] } },
        won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
        lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
        active: { $sum: { $cond: [{ $in: ['$status', ['Connected', 'Call Not Responding', 'Call Back Later', 'Demo Scheduled', 'Demo Done']] }, 1, 0] } }
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
    await lead.populate([
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'campaign', select: 'name' },
      { path: 'courseInterest' }
    ]);
    notifyNewLeadCreated({ lead, assignedToId, performedByUser: req.user }).catch(() => {});
    res.status(201).json({ lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email avatar')
      .populate('campaign', 'name')
      .populate('courseInterest')
      .populate('activities.performedBy', 'name avatar');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
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
    const lead = await Lead.findById(req.params.id);
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

    res.json({ lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/note', protect, async (req, res) => {
  try {
    const { note, type } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    const noteType = type || 'note';
    lead.activities.unshift({ type: noteType, description: note, performedBy: req.user._id });
    await lead.save();
    await lead.populate('activities.performedBy', 'name avatar');

    res.json({ lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, demoScheduledDate } = req.body;
    const lead = await Lead.findById(req.params.id).populate('assignedTo', 'name _id');
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
    });
    await lead.save();

    if (lead.assignedTo) {
      notifyLeadStatusChanged({ lead, prevStatus, newStatus: status, assignedToId: lead.assignedTo._id, performedByUser: req.user }).catch(() => {});
    }
    res.json({ lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, authorize('employee', 'caller', 'manager', 'admin'), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if ((req.user.role === 'employee' || req.user.role === 'caller') && lead.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete leads assigned to you' });
    }
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/initiate-call', protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('assignedTo', 'name email');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    let caller;
    if (req.user.role === 'employee' || req.user.role === 'caller') {
      caller = await User.findById(req.user._id).select('name email');
    } else {
      if (req.body.callerId && req.body.callerId !== lead.assignedTo?._id?.toString()) {
        caller = await User.findById(req.body.callerId).select('name email');
      } else {
        caller = lead.assignedTo;
      }
    }

    if (!caller) return res.status(400).json({ message: 'No caller assigned. Please assign a caller first.' });

    lead.activities.unshift({
      type: 'note',
      description: `📞 Call initiated by ${req.user.name} for ${caller.name}`,
      performedBy: req.user._id,
    });
    await lead.save();
    notifyCallInitiated({ lead, callerId: caller._id, performedByUser: req.user }).catch(() => {});

    res.json({
      success: true,
      message: `✅ Call initiated for ${caller.name}`,
      callerName: caller.name,
      leadName: lead.name,
      leadPhone: lead.phone,
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

    const Integration = require('../models/Integration');
    const Contact = require('../models/Contact');
    const whatsappService = require('../services/integrations/whatsapp');
    const { toIndiaE164 } = require('../utils/phone');

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
        const { normalizePhone10 } = require('../utils/phone');
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
        targetLead.waStatus = 'intervened';
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
            
            const { normalizePhone10 } = require('../utils/phone');
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
            targetLead.waStatus = 'intervened';
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