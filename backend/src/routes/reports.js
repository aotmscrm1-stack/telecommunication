const express = require('express');
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const FollowUp = require('../models/FollowUp');
const Attendance = require('../models/Attendance');
const EmployeeLocation = require('../models/EmployeeLocation');
const { liveLocations } = require('../services/trackingSocket');
const { getOfficeConfig } = require('../config/officeConfig');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

/**
 * Format local date YYYY-MM-DD and day name in Asia/Kolkata
 */
function getLocalDateAndDay(dateObj = new Date()) {
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const dateStr = formatter.format(dateObj);

  const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });
  const dayStr = dayFormatter.format(dateObj);

  return { dateStr, dayStr };
}

function getEmployeeCode(user, index = null) {
  if (user.employeeId && user.employeeId.trim()) {
    return user.employeeId.trim();
  }
  if (user._id) {
    const idStr = user._id.toString();
    return `EMP-${idStr.slice(-4).toUpperCase()}`;
  }
  return `EMP-${index != null ? String(index + 1).padStart(3, '0') : '001'}`;
}

function formatTime12h(dateObj) {
  if (!dateObj) return '—';
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatSecToText(diffSec) {
  if (diffSec == null || isNaN(diffSec) || diffSec <= 0) return '00m 00s';
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  } else if (minutes > 0) {
    return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  } else {
    return `${seconds}s`;
  }
}

// GET /api/reports/leaderboard?period=day|week|month|year|custom&startDate=&endDate=&sortBy=calls|duration|sales
router.get('/leaderboard', protect, async (req, res) => {
  try {
    const { period = 'week', startDate, endDate, sortBy = 'calls' } = req.query;
    const now = new Date();
    let start = new Date(0);
    let end = new Date();

    if (period === 'custom' && startDate && endDate) {
      start = new Date(startDate); start.setHours(0, 0, 0, 0);
      end = new Date(endDate); end.setHours(23, 59, 59, 999);
    } else if (period === 'day') {
      start = new Date(); start.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      start = new Date(); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    } else if (period === 'year') {
      start = new Date(); start.setMonth(0, 1); start.setHours(0, 0, 0, 0);
    } else {
      // 'all' and any unknown value should return the full available history.
      start = new Date(0);
      end = new Date();
    }
    

    const dateMatch = period === 'custom'
      ? { 'activities.createdAt': { $gte: start, $lte: end } }
      : { 'activities.createdAt': { $gte: start } };

    const sortField = sortBy === 'duration' ? 'totalDuration' : sortBy === 'sales' ? 'sales' : 'totalCalls';

    const stats = await Lead.aggregate([
      { $unwind: '$activities' },
      { $match: { 'activities.type': 'call', ...dateMatch } },
      {
        $group: {
          _id: '$activities.performedBy',
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$activities.callDuration' },
          connectedCalls: { $sum: { $cond: [{ $eq: ['$activities.callStatus', 'connected'] }, 1, 0] } },
          firstCall: { $min: '$activities.createdAt' },
          lastCall: { $max: '$activities.createdAt' },
        }
      },
    ]);

    const userIds = stats.map(s => s._id).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } }).select('name email avatar role').lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const salesMatchDate = period === 'custom'
      ? { status: 'Won', updatedAt: { $gte: start, $lte: end } }
      : { status: 'Won', updatedAt: { $gte: start } };
    const salesCounts = await Lead.aggregate([
      { $match: salesMatchDate },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
    ]);
    const salesMap = {};
    salesCounts.forEach(s => { salesMap[s._id?.toString()] = s.count; });

    let populated = stats.map(s => ({
      ...s,
      user: userMap[s._id?.toString()] || null,
      sales: salesMap[s._id?.toString()] || 0
    })).filter(p => p.user);

    // Sort by selected metric
    if (sortBy === 'duration') populated.sort((a, b) => b.totalDuration - a.totalDuration);
    else if (sortBy === 'sales') populated.sort((a, b) => b.sales - a.sales);
    else populated.sort((a, b) => b.totalCalls - a.totalCalls);

    res.json({ leaderboard: populated, period, from: start, to: end });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/calls-summary
router.get('/calls-summary', protect, async (req, res) => {
  try {
    const isEmployee = req.user.role === 'employee' || req.user.role === 'caller';
    const matchQuery = isEmployee ? { 'activities.performedBy': req.user._id } : {};
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);

    const [todayStats, weekStats, statusBreakdown] = await Promise.all([
      Lead.aggregate([
        { $unwind: '$activities' },
        { $match: { 'activities.type': 'call', 'activities.createdAt': { $gte: todayStart }, ...matchQuery } },
        { $group: { _id: null, count: { $sum: 1 }, duration: { $sum: '$activities.callDuration' }, connected: { $sum: { $cond: [{ $eq: ['$activities.callStatus', 'connected'] }, 1, 0] } } } }
      ]),
      Lead.aggregate([
        { $unwind: '$activities' },
        { $match: { 'activities.type': 'call', 'activities.createdAt': { $gte: weekStart }, ...matchQuery } },
        { $group: { _id: null, count: { $sum: 1 }, duration: { $sum: '$activities.callDuration' } } }
      ]),
      Lead.aggregate([
        { $match: isEmployee ? { assignedTo: req.user._id } : {} },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      today: todayStats[0] || { count: 0, duration: 0, connected: 0 },
      week: weekStats[0] || { count: 0, duration: 0 },
      statusBreakdown
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/calls-list
router.get('/calls-list', protect, async (req, res) => {
  try {
    const isEmployee = req.user.role === 'employee' || req.user.role === 'caller';
    const matchQuery = isEmployee ? { 'activities.performedBy': new mongoose.Types.ObjectId(req.user._id) } : {};
    
    const calls = await Lead.aggregate([
      { $unwind: '$activities' },
      { $match: { 'activities.type': 'call', ...matchQuery } },
      { $sort: { 'activities.createdAt': -1 } },
      { $limit: 100 },
      {
        $project: {
          leadName: '$name',
          leadPhone: '$phone',
          date: '$activities.createdAt',
          duration: '$activities.callDuration',
          status: '$activities.callStatus',
          summary: '$activities.description'
        }
      }
    ]);
    
    res.json({ calls });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/admin-analysis
router.get('/admin-analysis', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(endOfWeek.getDate() + 6); endOfWeek.setHours(23, 59, 59, 999);
    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);

    // Run independent aggregations in parallel
    const [
      outcomes,
      callersStats,
      allDbUsers,
      dailyVolume,
      unassignedCount,
      revenueWonResult,
      demosScheduledThisMonth,
      funnelStats,
      campaignStats,
      callersList,
      lastCalls,
      callsTodayStats,
      followupsToday,
      overdueFollowupsCount,
      upcomingDemos,
      staleLeadsCount,
      staleLeadsList,
      overdue24hFollowupsCount,
      detailedOverdueFollowups,
      peakHours,
      locationStats,
      sourceStats,
    ] = await Promise.all([
      Lead.aggregate([{ $unwind: '$activities' }, { $match: { 'activities.type': 'call' } }, { $group: { _id: '$activities.callStatus', count: { $sum: 1 } } }]),
      Lead.aggregate([{ $unwind: '$activities' }, { $match: { 'activities.type': 'call' } }, { $group: { _id: '$activities.performedBy', totalCalls: { $sum: 1 }, totalDuration: { $sum: '$activities.callDuration' }, connected: { $sum: { $cond: [{ $eq: ['$activities.callStatus', 'connected'] }, 1, 0] } } } }]),
      User.find({}).select('name email avatar role').lean(),
      Lead.aggregate([{ $unwind: '$activities' }, { $match: { 'activities.type': 'call', 'activities.createdAt': { $gte: sevenDaysAgo } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$activities.createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Lead.countDocuments({ assignedTo: null }),
      Lead.aggregate([{ $match: { status: 'Won', updatedAt: { $gte: startOfMonth } } }, { $lookup: { from: 'courses', localField: 'courseInterest', foreignField: '_id', as: 'course' } }, { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } }, { $group: { _id: null, total: { $sum: { $ifNull: ['$course.cost', '$budget'] } } } }]),
      Lead.countDocuments({ $or: [{ status: { $in: ['Demo Scheduled', 'Demo Done', 'Won'] }, demoScheduledDate: { $gte: startOfMonth, $lte: endOfMonth } }, { status: { $in: ['Demo Scheduled', 'Demo Done', 'Won'] }, demoScheduledDate: null, updatedAt: { $gte: startOfMonth, $lte: endOfMonth } }] }),
      Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Lead.aggregate([{ $group: { _id: '$campaign', totalLeads: { $sum: 1 }, called: { $sum: { $cond: [{ $gt: ['$totalCalls', 0] }, 1, 0] } }, won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } }, lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } } } }]),
      User.find({ role: { $in: ['employee', 'caller'] } }).select('name email avatar phone').lean(),
      Lead.aggregate([{ $unwind: '$activities' }, { $match: { 'activities.type': 'call' } }, { $group: { _id: '$activities.performedBy', lastCall: { $max: '$activities.createdAt' } } }]),
      Lead.aggregate([{ $unwind: '$activities' }, { $match: { 'activities.type': 'call', 'activities.createdAt': { $gte: todayStart } } }, { $group: { _id: '$activities.performedBy', count: { $sum: 1 } } }]),
      FollowUp.aggregate([{ $match: { scheduledAt: { $gte: todayStart, $lte: endOfToday }, status: 'upcoming' } }, { $group: { _id: '$assignedTo', count: { $sum: 1 } } }]),
      FollowUp.countDocuments({ scheduledAt: { $lt: new Date() }, status: 'upcoming' }),
      Lead.find({ status: 'Demo Scheduled', demoScheduledDate: { $gte: todayStart, $lte: endOfWeek } }).populate('assignedTo', 'name avatar').select('name phone demoScheduledDate preferredCourses assignedTo').lean(),
      Lead.countDocuments({ status: { $nin: ['Won', 'Lost', 'Not interested'] }, $or: [{ lastCalledAt: null, createdAt: { $lt: threeDaysAgo } }, { lastCalledAt: { $lt: threeDaysAgo } }] }),
      Lead.find({ status: { $nin: ['Won', 'Lost', 'Not interested'] }, $or: [{ lastCalledAt: null, createdAt: { $lt: threeDaysAgo } }, { lastCalledAt: { $lt: threeDaysAgo } }] }).populate('assignedTo', 'name email').limit(25).lean(),
      FollowUp.countDocuments({ status: 'upcoming', scheduledAt: { $lt: twentyFourHoursAgo } }),
      FollowUp.find({ scheduledAt: { $lt: new Date() }, status: 'upcoming' }).populate('lead', 'name phone status').populate('assignedTo', 'name email avatar').sort({ scheduledAt: 1 }).lean(),
      Lead.aggregate([{ $unwind: '$activities' }, { $match: { 'activities.type': 'call' } }, { $project: { dayOfWeek: { $dayOfWeek: { date: '$activities.createdAt', timezone: 'Asia/Kolkata' } }, hour: { $hour: { date: '$activities.createdAt', timezone: 'Asia/Kolkata' } }, isConnected: { $cond: [{ $eq: ['$activities.callStatus', 'connected'] }, 1, 0] } } }, { $group: { _id: { dayOfWeek: '$dayOfWeek', hour: '$hour' }, totalCalls: { $sum: 1 }, connectedCalls: { $sum: '$isConnected' } } }]),
      Lead.aggregate([{ $match: { location: { $ne: '' } } }, { $group: { _id: '$location', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      Lead.aggregate([{ $match: { leadSource: { $ne: '' } } }, { $group: { _id: '$leadSource', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
    ]);

    // Build maps for efficient lookup
    const callerStatsMap = {};
    callersStats.forEach(c => { callerStatsMap[c._id?.toString()] = c; });
    const salesAgg = await Lead.aggregate([{ $match: { status: 'Won' } }, { $group: { _id: '$assignedTo', count: { $sum: 1 } } }]);
    const salesMap = {};
    salesAgg.forEach(s => { salesMap[s._id?.toString()] = s.count; });

    const populatedCallers = allDbUsers.map(user => {
      const match = callerStatsMap[user._id.toString()];
      return {
        _id: user._id,
        totalCalls: match?.totalCalls || 0,
        totalDuration: match?.totalDuration || 0,
        connected: match?.connected || 0,
        sales: salesMap[user._id.toString()] || 0,
        user
      };
    });

    const funnelStages = ['Fresh', 'Connected', 'Demo Scheduled', 'Demo Done', 'Won'];
    const funnelMap = {};
    funnelStats.forEach(f => { funnelMap[f._id] = f.count; });
    const conversionFunnel = funnelStages.map(stage => ({ stage, count: funnelMap[stage] || 0 }));

    // Campaign performance with batch lookup
    const campIds = campaignStats.map(c => c._id).filter(Boolean);
    const camps = await Campaign.find({ _id: { $in: campIds } }).select('name').lean();
    const campMap = {};
    camps.forEach(c => { campMap[c._id.toString()] = c.name; });
    const populatedCampaigns = campaignStats.map(c => ({
      ...c,
      name: c._id ? (campMap[c._id.toString()] || 'Unknown') : 'Unassigned'
    }));

    // Team live status
    const lastCallMap = {};
    lastCalls.forEach(l => { lastCallMap[l._id?.toString()] = l.lastCall; });
    const todayCallMap = {};
    callsTodayStats.forEach(t => { todayCallMap[t._id?.toString()] = t.count; });
    const teamStatus = callersList.map(caller => {
      const lastCallTime = lastCallMap[caller._id.toString()] || null;
      const isActive = lastCallTime && new Date(lastCallTime) >= thirtyMinsAgo;
      return {
        user: caller,
        callsToday: todayCallMap[caller._id.toString()] || 0,
        lastCallTime,
        isActive: !!isActive
      };
    });

    // Followup load with batch lookup
    const followupUserIds = followupsToday.map(f => f._id).filter(Boolean);
    const followupUsers = await User.find({ _id: { $in: followupUserIds } }).select('name email avatar').lean();
    const followupUserMap = {};
    followupUsers.forEach(u => { followupUserMap[u._id.toString()] = u; });
    const followupsLoad = followupsToday.map(f => ({
      user: followupUserMap[f._id?.toString()] || null,
      count: f.count
    })).filter(f => f.user);

    // Notifications
    const notifications = [];
    const [recentDemos, recentOverdue, recentAssigned] = await Promise.all([
      Lead.find({ status: 'Demo Scheduled', updatedAt: { $gte: twentyFourHoursAgo } }).populate('assignedTo', 'name').select('name demoScheduledDate assignedTo updatedAt').lean(),
      FollowUp.find({ scheduledAt: { $gte: twentyFourHoursAgo, $lt: new Date() }, status: 'upcoming' }).populate('lead', 'name').populate('assignedTo', 'name').lean(),
      Lead.find({ assignedTo: { $ne: null }, updatedAt: { $gte: twentyFourHoursAgo } }).populate('assignedTo', 'name').select('name assignedTo updatedAt').lean(),
    ]);
    recentDemos.forEach(d => notifications.push({ id: `demo-${d._id}`, type: 'demo', title: 'Demo Booked', message: `Demo for ${d.name} by ${d.assignedTo?.name || 'Unassigned'}`, time: d.updatedAt }));
    recentOverdue.forEach(f => notifications.push({ id: `overdue-${f._id}`, type: 'overdue', title: 'Follow-up Overdue', message: `Follow-up for ${f.lead?.name || 'Lead'} (${f.assignedTo?.name || 'Caller'}) is overdue`, time: f.scheduledAt }));
    recentAssigned.forEach(l => notifications.push({ id: `assigned-${l._id}`, type: 'assigned', title: 'Lead Assigned', message: `${l.name} assigned to ${l.assignedTo?.name}`, time: l.updatedAt }));
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    teamStatus.forEach(caller => {
      if (caller.callsToday > 0 && caller.lastCallTime && new Date(caller.lastCallTime) < twoHoursAgo) {
        notifications.push({ id: `idle-${caller.user._id}`, type: 'idle', title: 'Caller Idle Alert', message: `${caller.user.name} idle 2h+ (last call ${new Date(caller.lastCallTime).toLocaleTimeString()})`, time: new Date(caller.lastCallTime) });
      }
    });
    notifications.sort((a, b) => b.time - a.time);

    res.json({
      outcomes,
      callers: populatedCallers,
      dailyVolume,
      unassignedCount,
      revenueWon: revenueWonResult[0]?.total || 0,
      demosScheduledThisMonth,
      conversionFunnel,
      campaignPerformance: populatedCampaigns,
      teamStatus,
      followupsLoad,
      overdueFollowupsCount,
      upcomingDemos,
      staleLeadsCount,
      staleLeadsList,
      overdue24hFollowupsCount,
      detailedOverdueFollowups,
      peakHours,
      locationStats,
      sourceStats,
      notifications
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/user-analysis/:userId
router.get('/user-analysis/:userId', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('name email role phone avatar').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const matchQuery = { 'activities.performedBy': new mongoose.Types.ObjectId(userId) };
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [outcomes, stats, dailyVolume, recentActivities] = await Promise.all([
      Lead.aggregate([{ $unwind: '$activities' }, { $match: { 'activities.type': 'call', ...matchQuery } }, { $group: { _id: '$activities.callStatus', count: { $sum: 1 } } }]),
      Lead.aggregate([{ $unwind: '$activities' }, { $match: { 'activities.type': 'call', ...matchQuery } }, { $group: { _id: null, totalCalls: { $sum: 1 }, totalDuration: { $sum: '$activities.callDuration' }, connected: { $sum: { $cond: [{ $eq: ['$activities.callStatus', 'connected'] }, 1, 0] } } } }]),
      Lead.aggregate([{ $unwind: '$activities' }, { $match: { 'activities.type': 'call', 'activities.createdAt': { $gte: sevenDaysAgo }, ...matchQuery } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$activities.createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Lead.aggregate([{ $unwind: '$activities' }, { $match: matchQuery }, { $sort: { 'activities.createdAt': -1 } }, { $limit: 15 }, { $project: { leadId: '$_id', leadName: '$name', activity: '$activities' } }]),
    ]);

    const populatedActivities = recentActivities.map(act => ({ ...act, performer: { name: user.name, avatar: user.avatar } }));

    res.json({ user, stats: stats[0] || { totalCalls: 0, totalDuration: 0, connected: 0 }, outcomes, dailyVolume, recentActivities: populatedActivities });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/lead-view
router.get('/lead-view', protect, async (req, res) => {
  try {
    const { tab = 'Status', assigneeId, status, startDate, endDate } = req.query;
    const matchQuery = {};
    if (req.user.role === 'employee' || req.user.role === 'caller') matchQuery.assignedTo = req.user._id;
    if (assigneeId && assigneeId !== 'all' && assigneeId !== '') matchQuery.assignedTo = new mongoose.Types.ObjectId(assigneeId);
    if (status && status !== 'all' && status !== '') matchQuery.status = status;
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) { const end = new Date(endDate); end.setHours(23,59,59,999); matchQuery.createdAt.$lte = end; }
    }

    let pipeline = [];

    if (tab === 'Assignee') {
      pipeline = [
        { $match: matchQuery },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { name: { $ifNull: ['$user.name', 'Unassigned'] }, count: 1 } },
        { $sort: { count: -1 } }
      ];
      const data = await Lead.aggregate(pipeline);
      return res.json({ data: data.map(d => ({ name: d.name, value: d.count })), total: data.reduce((a,b)=>a+b.count,0) });
    }
    if (tab === 'Lead source') {
      const data = await Lead.aggregate([{ $match: matchQuery }, { $group: { _id: '$leadSource', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
      return res.json({ data: data.map(d=>({name: d._id||'Unknown', value: d.count})), total: data.reduce((a,b)=>a+b.count,0) });
    }
    if (tab === 'Rating') {
      const data = await Lead.aggregate([{ $match: matchQuery }, { $group: { _id: { $toString: '$rating' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
      return res.json({ data: data.map(d=>({name: `Rating ${d._id}`, value: d.count})), total: data.reduce((a,b)=>a+b.count,0) });
    }
    if (tab === 'Call status') {
      const data = await Lead.aggregate([
        { $match: matchQuery },
        { $unwind: { path: '$activities', preserveNullAndEmptyArrays: true } },
        { $match: { 'activities.type': 'call' } },
        { $sort: { 'activities.createdAt': -1 } },
        { $group: { _id: '$_id', callStatus: { $first: '$activities.callStatus' } } },
        { $group: { _id: '$callStatus', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      return res.json({ data: data.map(d=>({name: d._id||'No Call', value: d.count})), total: data.reduce((a,b)=>a+b.count,0) });
    }
    if (tab === 'Number of calls placed') {
      const data = await Lead.aggregate([
        { $match: matchQuery },
        { $project: { callBucket: { $switch: { branches: [
          { case: { $eq: ['$totalCalls', 0] }, then: '0 calls' },
          { case: { $lte: ['$totalCalls', 2] }, then: '1-2 calls' },
          { case: { $lte: ['$totalCalls', 5] }, then: '3-5 calls' },
          { case: { $lte: ['$totalCalls', 10] }, then: '6-10 calls' }
        ], default: '10+ calls' } } } },
        { $group: { _id: '$callBucket', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);
      return res.json({ data: data.map(d=>({name: d._id, value: d.count})), total: data.reduce((a,b)=>a+b.count,0) });
    }
    if (tab === 'Created on') {
      const data = await Lead.aggregate([
        { $match: matchQuery },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }, { $limit: 30 }
      ]);
      return res.json({ data: data.map(d=>({name: d._id, value: d.count})), total: data.reduce((a,b)=>a+b.count,0) });
    }
    // Default: Status
    const data = await Lead.aggregate([{ $match: matchQuery }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    res.json({ data: data.map(d=>({name: d._id||'Unknown', value: d.count})), total: data.reduce((a,b)=>a+b.count,0) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/lead-view-filters
router.get('/lead-view-filters', protect, async (req, res) => {
  try {
    const [assignees, sources] = await Promise.all([
      Lead.aggregate([
        { $match: { assignedTo: { $ne: null } } },
        { $group: { _id: '$assignedTo' } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { _id: 1, name: '$user.name' } },
        { $sort: { name: 1 } }
      ]),
      Lead.aggregate([
        { $match: { leadSource: { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$leadSource' } },
        { $sort: { _id: 1 } }
      ])
    ]);
    res.json({ assignees: assignees.map(a=>({_id: a._id, name: a.name})), sources: sources.map(s=>s._id).filter(Boolean) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/reports/employees-live-activity ──────────────────────────────────
router.get('/employees-live-activity', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const nowUtc = new Date();
    const todayDateObj = new Date(nowUtc.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    const yesterdayDateObj = new Date(todayDateObj);
    yesterdayDateObj.setDate(yesterdayDateObj.getDate() - 1);

    const tomorrowDateObj = new Date(todayDateObj);
    tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);

    const { dateStr: todayStr, dayStr: todayDay } = getLocalDateAndDay(todayDateObj);
    const { dateStr: yesterdayStr, dayStr: yesterdayDay } = getLocalDateAndDay(yesterdayDateObj);
    const { dateStr: tomorrowStr, dayStr: tomorrowDay } = getLocalDateAndDay(tomorrowDateObj);

    const todayStart = new Date(`${todayStr}T00:00:00.000+05:30`);
    const todayEnd = new Date(`${todayStr}T23:59:59.999+05:30`);

    const yesterdayStart = new Date(`${yesterdayStr}T00:00:00.000+05:30`);
    const yesterdayEnd = new Date(`${yesterdayStr}T23:59:59.999+05:30`);

    const tomorrowStart = new Date(`${tomorrowStr}T00:00:00.000+05:30`);
    const tomorrowEnd = new Date(`${tomorrowStr}T23:59:59.999+05:30`);

    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);

    // 1. Fetch all active organization members
    const allUsers = await User.find({ isActive: true })
      .select('-password')
      .sort({ name: 1 })
      .lean();

    // 2. Fetch today's and yesterday's attendance records
    const [todayAttendances, yesterdayAttendances] = await Promise.all([
      Attendance.find({ date: todayStr }),
      Attendance.find({ date: yesterdayStr }),
    ]);

    const todayAttMap = new Map();
    todayAttendances.forEach((att) => {
      att.calculateAttendanceDurations(nowUtc);
      todayAttMap.set(att.employeeId.toString(), att);
    });

    const yesterdayAttMap = new Map();
    yesterdayAttendances.forEach((att) => {
      att.calculateAttendanceDurations(yesterdayEnd);
      yesterdayAttMap.set(att.employeeId.toString(), att);
    });

    // 3. Aggregate Today's Call Activities per employee
    const todayCallsAgg = await Lead.aggregate([
      { $unwind: '$activities' },
      {
        $match: {
          'activities.type': 'call',
          'activities.createdAt': { $gte: todayStart, $lte: todayEnd },
        },
      },
      { $sort: { 'activities.createdAt': -1 } },
      {
        $group: {
          _id: '$activities.performedBy',
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$activities.callDuration' },
          lastCallTime: { $first: '$activities.createdAt' },
          lastCallDuration: { $first: '$activities.callDuration' },
          lastCallStatus: { $first: '$activities.callStatus' },
          lastCallLeadName: { $first: '$name' },
          lastCallLeadPhone: { $first: '$phone' },
        },
      },
    ]);
    const todayCallMap = new Map();
    todayCallsAgg.forEach((c) => {
      if (c._id) todayCallMap.set(c._id.toString(), c);
    });

    // 4. Aggregate Yesterday's Call Activities per employee
    const yesterdayCallsAgg = await Lead.aggregate([
      { $unwind: '$activities' },
      {
        $match: {
          'activities.type': 'call',
          'activities.createdAt': { $gte: yesterdayStart, $lte: yesterdayEnd },
        },
      },
      { $sort: { 'activities.createdAt': -1 } },
      {
        $group: {
          _id: '$activities.performedBy',
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$activities.callDuration' },
          lastCallTime: { $first: '$activities.createdAt' },
          lastCallDuration: { $first: '$activities.callDuration' },
        },
      },
    ]);
    const yesterdayCallMap = new Map();
    yesterdayCallsAgg.forEach((c) => {
      if (c._id) yesterdayCallMap.set(c._id.toString(), c);
    });

    // 5. Aggregate Tomorrow's Scheduled Follow-ups per employee
    const tomorrowFollowupsAgg = await FollowUp.aggregate([
      {
        $match: {
          scheduledAt: { $gte: tomorrowStart, $lte: tomorrowEnd },
          status: 'upcoming',
        },
      },
      {
        $group: {
          _id: '$assignedTo',
          scheduledCallsCount: { $sum: 1 },
        },
      },
    ]);
    const tomorrowFollowupMap = new Map();
    tomorrowFollowupsAgg.forEach((f) => {
      if (f._id) tomorrowFollowupMap.set(f._id.toString(), f.scheduledCallsCount);
    });

    // 6. Office Config
    const officeConfig = getOfficeConfig();

    // 7. Assemble Unified Employee Activity Payload
    const employees = await Promise.all(
      allUsers.map(async (user, idx) => {
        const userId = user._id.toString();

        // Attendance Info
        const todayAtt = todayAttMap.get(userId) || null;
        const yesterdayAtt = yesterdayAttMap.get(userId) || null;

        // GPS Location Telemetry
        let live = liveLocations.get(userId) || null;
        if (!live) {
          const latestDbLoc = await EmployeeLocation.findOne({ employeeId: user._id })
            .sort({ timestamp: -1 })
            .lean();
          if (latestDbLoc) {
            const isFresh = nowUtc.getTime() - new Date(latestDbLoc.timestamp).getTime() < 3 * 60 * 1000;
            live = {
              latitude: latestDbLoc.latitude,
              longitude: latestDbLoc.longitude,
              accuracy: latestDbLoc.accuracy,
              speed: latestDbLoc.speed,
              heading: latestDbLoc.heading,
              battery: latestDbLoc.battery,
              trackingStatus: isFresh ? latestDbLoc.trackingStatus : 'OFFLINE',
              road: latestDbLoc.road || '',
              area: latestDbLoc.area || '',
              city: latestDbLoc.city || '',
              formattedAddress: latestDbLoc.formattedAddress || '',
              officeDistanceMeters: latestDbLoc.officeDistanceMeters || null,
              isLive: isFresh && latestDbLoc.isLive,
              lastUpdated: latestDbLoc.timestamp,
            };
          }
        }

        // Call Metrics
        const todayCall = todayCallMap.get(userId) || null;
        const yesterdayCall = yesterdayCallMap.get(userId) || null;
        const tomorrowScheduledCount = tomorrowFollowupMap.get(userId) || 0;

        const isCurrentlyCalling = todayCall?.lastCallTime && new Date(todayCall.lastCallTime) >= fiveMinsAgo;

        // Determine Unified Live Status
        let liveStatus = 'OFFLINE';
        let liveStatusLabel = 'Offline';

        if (todayAtt?.status === 'ON_DUTY') {
          if (isCurrentlyCalling) {
            liveStatus = 'ON_CALL';
            liveStatusLabel = 'On Call';
          } else {
            liveStatus = 'ON_DUTY';
            liveStatusLabel = 'On Duty (Idle)';
          }
        } else if (todayAtt?.status === 'ON_BREAK') {
          liveStatus = 'ON_BREAK';
          liveStatusLabel = 'On Break';
        } else if (todayAtt?.status === 'COMPLETED') {
          liveStatus = 'COMPLETED';
          liveStatusLabel = 'Completed';
        } else if (live?.isLive && live?.trackingStatus !== 'OFFLINE') {
          liveStatus = 'ACTIVE';
          liveStatusLabel = 'Active';
        } else {
          liveStatus = 'NOT_STARTED';
          liveStatusLabel = 'Not Started';
        }

        return {
          _id: userId,
          employeeId: user.employeeId?.trim() || getEmployeeCode(user, idx),
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          role: user.role || 'employee',
          designation: user.designation || (user.role === 'admin' ? 'Administrator' : user.role === 'manager' ? 'Team Lead / Manager' : 'Telecaller / Executive'),
          department: user.department || 'Sales & Telecommunications',
          officeLocation: user.officeLocation || `${officeConfig.name}, ${officeConfig.area}, ${officeConfig.city}`,
          joiningDate: user.joiningDate || user.createdAt,
          isActive: user.isActive !== false,
          avatar: user.avatar || '',
          
          // Unified Status
          liveStatus,
          liveStatusLabel,
          callStatus: isCurrentlyCalling ? 'On Call' : todayCall?.totalCalls > 0 ? 'Idle' : 'No Calls Today',
          isLiveLocationActive: !!(live && live.isLive && live.latitude != null),

          // Today's Attendance Details
          todayAttendance: {
            hasRecord: !!todayAtt,
            date: todayStr,
            day: todayDay,
            status: todayAtt?.status || 'NOT_STARTED',
            startTime: todayAtt?.startTime || null,
            startTimeFormatted: todayAtt ? formatTime12h(todayAtt.startTime) : 'Not Started',
            endTime: todayAtt?.endTime || null,
            endTimeFormatted: todayAtt?.endTime ? formatTime12h(todayAtt.endTime) : todayAtt?.status === 'ON_DUTY' || todayAtt?.status === 'ON_BREAK' ? 'In Progress' : '—',
            durationSeconds: todayAtt?.durationSeconds || 0,
            durationFormatted: todayAtt?.formattedDuration || '00h 00m',
            totalBreakSeconds: todayAtt?.totalBreakSeconds || 0,
            formattedBreakDuration: todayAtt?.formattedBreakDuration || '00h 00m',
            actualWorkSeconds: todayAtt?.actualWorkSeconds || 0,
            formattedActualWork: todayAtt?.formattedActualWork || '00h 00m',
            breakCount: todayAtt?.breakCount || 0,
            breaks: todayAtt?.breaks || [],
          },

          // Yesterday's Attendance Details
          yesterdayAttendance: {
            hasRecord: !!yesterdayAtt,
            date: yesterdayStr,
            day: yesterdayDay,
            status: yesterdayAtt?.status || 'NO_RECORD',
            startTime: yesterdayAtt?.startTime || null,
            startTimeFormatted: yesterdayAtt ? formatTime12h(yesterdayAtt.startTime) : 'No Record',
            endTime: yesterdayAtt?.endTime || null,
            endTimeFormatted: yesterdayAtt?.endTime ? formatTime12h(yesterdayAtt.endTime) : yesterdayAtt ? 'Incomplete' : 'No Record',
            durationSeconds: yesterdayAtt?.durationSeconds || 0,
            durationFormatted: yesterdayAtt?.formattedDuration || '00h 00m',
            totalBreakSeconds: yesterdayAtt?.totalBreakSeconds || 0,
            formattedBreakDuration: yesterdayAtt?.formattedBreakDuration || '00h 00m',
            actualWorkSeconds: yesterdayAtt?.actualWorkSeconds || 0,
            formattedActualWork: yesterdayAtt?.formattedActualWork || '00h 00m',
            breakCount: yesterdayAtt?.breakCount || 0,
          },

          // Live Location Details
          location: {
            isLive: !!(live && live.isLive),
            trackingStatus: live?.trackingStatus || 'OFFLINE',
            latitude: live?.latitude || null,
            longitude: live?.longitude || null,
            accuracy: live?.accuracy || 0,
            speed: live?.speed || 0,
            heading: live?.heading || 0,
            battery: live?.battery ?? null,
            road: live?.road || '',
            area: live?.area || '',
            city: live?.city || officeConfig.city,
            formattedAddress: live?.formattedAddress || (live?.latitude ? `${live.latitude.toFixed(5)}, ${live.longitude.toFixed(5)}` : 'Location unavailable'),
            officeDistanceMeters: live?.officeDistanceMeters || null,
            lastUpdated: live?.lastUpdated || null,
          },

          // Call Statistics
          calls: {
            today: {
              date: todayStr,
              count: todayCall?.totalCalls || 0,
              totalDurationSec: todayCall?.totalDuration || 0,
              totalDurationFormatted: formatSecToText(todayCall?.totalDuration || 0),
              lastCallTime: todayCall?.lastCallTime || null,
              lastCallTimeFormatted: todayCall?.lastCallTime ? formatTime12h(todayCall.lastCallTime) : 'Never',
              lastCallDurationSec: todayCall?.lastCallDuration || 0,
              lastCallDurationFormatted: todayCall?.lastCallDuration ? formatSecToText(todayCall.lastCallDuration) : '—',
              lastCallStatus: todayCall?.lastCallStatus || '',
              lastCallLead: todayCall ? { name: todayCall.lastCallLeadName, phone: todayCall.lastCallLeadPhone } : null,
            },
            yesterday: {
              date: yesterdayStr,
              count: yesterdayCall?.totalCalls || 0,
              totalDurationSec: yesterdayCall?.totalDuration || 0,
              totalDurationFormatted: formatSecToText(yesterdayCall?.totalDuration || 0),
              lastCallTime: yesterdayCall?.lastCallTime || null,
              lastCallTimeFormatted: yesterdayCall?.lastCallTime ? formatTime12h(yesterdayCall.lastCallTime) : 'Never',
              lastCallDurationSec: yesterdayCall?.lastCallDuration || 0,
              lastCallDurationFormatted: yesterdayCall?.lastCallDuration ? formatSecToText(yesterdayCall.lastCallDuration) : '—',
            },
            tomorrow: {
              date: tomorrowStr,
              scheduledCount: tomorrowScheduledCount,
            },
          },
        };
      })
    );

    res.json({
      ok: true,
      dates: {
        today: { date: todayStr, day: todayDay },
        yesterday: { date: yesterdayStr, day: yesterdayDay },
        tomorrow: { date: tomorrowStr, day: tomorrowDay },
      },
      office: officeConfig,
      totalEmployees: employees.length,
      activeEmployees: employees.filter((e) => e.liveStatus === 'ON_DUTY' || e.liveStatus === 'ON_CALL' || e.liveStatus === 'ON_BREAK').length,
      employees,
    });
  } catch (err) {
    console.error('[Employees Live Activity Error]:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── GET /api/reports/employee-call-records/:employeeId ─────────────────────────
router.get('/employee-call-records/:employeeId', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { period = 'today', date } = req.query;

    const user = await User.findById(employeeId).select('name email role phone employeeId').lean();
    if (!user) return res.status(404).json({ ok: false, message: 'Employee not found' });

    const nowUtc = new Date();
    const todayDateObj = new Date(nowUtc.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    const yesterdayDateObj = new Date(todayDateObj);
    yesterdayDateObj.setDate(yesterdayDateObj.getDate() - 1);

    const tomorrowDateObj = new Date(todayDateObj);
    tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);

    const { dateStr: todayStr, dayStr: todayDay } = getLocalDateAndDay(todayDateObj);
    const { dateStr: yesterdayStr, dayStr: yesterdayDay } = getLocalDateAndDay(yesterdayDateObj);
    const { dateStr: tomorrowStr, dayStr: tomorrowDay } = getLocalDateAndDay(tomorrowDateObj);

    if (period === 'tomorrow') {
      const tomorrowStart = new Date(`${tomorrowStr}T00:00:00.000+05:30`);
      const tomorrowEnd = new Date(`${tomorrowStr}T23:59:59.999+05:30`);

      const followups = await FollowUp.find({
        assignedTo: employeeId,
        scheduledAt: { $gte: tomorrowStart, $lte: tomorrowEnd },
      })
        .populate('lead', 'name phone status location email budget courseInterest preferredCourses')
        .sort({ scheduledAt: 1 })
        .lean();

      const scheduledList = followups.map((f) => ({
        id: f._id.toString(),
        callDate: tomorrowStr,
        callTime: formatTime12h(f.scheduledAt),
        scheduledAt: f.scheduledAt,
        employeeName: user.name,
        contactName: f.lead?.name || 'Unknown Contact',
        contactNumber: f.lead?.phone || '—',
        leadEmail: f.lead?.email || '',
        leadStatus: f.lead?.status || 'Fresh',
        leadLocation: f.lead?.location || '',
        callStatus: f.status === 'upcoming' ? 'Scheduled' : f.status,
        callDuration: 0,
        callDurationFormatted: '00m 00s',
        callType: f.type === 'call_followup' ? 'Scheduled Call Follow-up' : 'Planned Task',
        priority: f.priority || 'medium',
        notes: f.note || f.title || 'Planned follow-up call',
      }));

      return res.json({
        ok: true,
        employee: user,
        period: 'tomorrow',
        targetDate: tomorrowStr,
        day: tomorrowDay,
        isTomorrow: true,
        totalCalls: scheduledList.length,
        totalConnectedDuration: 0,
        totalConnectedDurationFormatted: '00m 00s',
        totalConnectedCalls: 0,
        calls: scheduledList,
      });
    }

    // Today, Yesterday, All Dates, or Custom Date
    let targetDateStr = todayStr;
    let targetDayStr = todayDay;
    let rangeStart = new Date(`${todayStr}T00:00:00.000+05:30`);
    let rangeEnd = new Date(`${todayStr}T23:59:59.999+05:30`);

    if (period === 'yesterday') {
      targetDateStr = yesterdayStr;
      targetDayStr = yesterdayDay;
      rangeStart = new Date(`${yesterdayStr}T00:00:00.000+05:30`);
      rangeEnd = new Date(`${yesterdayStr}T23:59:59.999+05:30`);
    } else if (period === 'all') {
      targetDateStr = 'All Dates';
      targetDayStr = 'Full History';
      rangeStart = new Date(0);
      rangeEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      targetDateStr = date;
      const d = new Date(`${date}T00:00:00.000+05:30`);
      targetDayStr = getLocalDateAndDay(d).dayStr;
      rangeStart = new Date(`${date}T00:00:00.000+05:30`);
      rangeEnd = new Date(`${date}T23:59:59.999+05:30`);
    }

    const leads = await Lead.find({
      'activities.performedBy': employeeId,
      'activities.type': 'call',
      'activities.createdAt': { $gte: rangeStart, $lte: rangeEnd },
    })
      .select('name phone email status campaign activities')
      .populate('campaign', 'name')
      .lean();

    const callRows = [];
    let totalConnectedSec = 0;
    let totalConnectedCount = 0;

    leads.forEach((l) => {
      const matchingActs = (l.activities || []).filter(
        (a) =>
          a.type === 'call' &&
          a.performedBy?.toString() === employeeId &&
          new Date(a.createdAt) >= rangeStart &&
          new Date(a.createdAt) <= rangeEnd
      );

      matchingActs.forEach((act) => {
        const isConnected = act.callStatus === 'connected';
        if (isConnected) {
          totalConnectedSec += act.callDuration || 0;
          totalConnectedCount += 1;
        }

        const actLocalDate = getLocalDateAndDay(new Date(act.createdAt)).dateStr;

        callRows.push({
          id: act._id?.toString() || `${l._id}_${act.createdAt}`,
          leadId: l._id.toString(),
          callDate: actLocalDate,
          callTime: formatTime12h(act.createdAt),
          createdAt: act.createdAt,
          employeeName: user.name,
          contactName: l.name || 'Contact',
          contactNumber: l.phone || '—',
          contactEmail: l.email || '',
          campaignName: l.campaign?.name || '',
          callStatus: act.callStatus ? act.callStatus.charAt(0).toUpperCase() + act.callStatus.slice(1).replace(/_/g, ' ') : 'Logged',
          rawCallStatus: act.callStatus || 'connected',
          callDuration: act.callDuration || 0,
          callDurationFormatted: formatSecToText(act.callDuration || 0),
          callType: act.direction === 'inbound' ? 'Incoming Call' : 'Outgoing Call',
          notes: act.description || '',
          leadStatus: l.status,
        });
      });
    });

    // Sort by createdAt descending
    callRows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      ok: true,
      employee: user,
      period,
      targetDate: targetDateStr,
      day: targetDayStr,
      isTomorrow: false,
      totalCalls: callRows.length,
      totalConnectedDuration: totalConnectedSec,
      totalConnectedDurationFormatted: formatSecToText(totalConnectedSec),
      totalConnectedCalls: totalConnectedCount,
      calls: callRows,
    });
  } catch (err) {
    console.error('[Employee Call Records Error]:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;