const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const DigitalCalendar = require('../../../database/models/DigitalCalendar');
const User = require('../../../database/models/User');
const Department = require('../../../database/models/Department');
const { protect, authorize } = require('../../../core/middleware/auth');

const router = express.Router();

// Supported preset Google Calendar IDs
const PRESET_GOOGLE_CALENDARS = {
  indian_holidays: {
    id: 'en.indian#holiday@group.v.calendar.google.com',
    name: 'Holidays & Observances in India',
    badge: '🇮🇳 India'
  },
  indian_official: {
    id: 'en.indian.official#holiday@group.v.calendar.google.com',
    name: 'Indian Gazetted & Public Holidays',
    badge: '🏛️ Gazetted'
  },
  usa_holidays: {
    id: 'en.usa#holiday@group.v.calendar.google.com',
    name: 'US & Global Holidays',
    badge: '🌐 Global / US'
  },
  uk_holidays: {
    id: 'en.uk#holiday@group.v.calendar.google.com',
    name: 'UK Public Holidays',
    badge: '🇬🇧 UK'
  },
  islamic_holidays: {
    id: 'en.islamic#holiday@group.v.calendar.google.com',
    name: 'Islamic Holidays & Festivals',
    badge: '🌙 Islamic'
  }
};

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function isStrictAdminOrCEO(user) {
  if (!user) return false;
  const role = String(user.role || '').trim().toLowerCase();
  const desig = String(user.designation || '').trim().toUpperCase();
  const dept = String(user.department || '').trim().toUpperCase();

  // Marketing team members are NOT admins for delete/approval actions
  const isMarketing = desig.includes('MARKETING') || dept.includes('MARKETING') || dept === 'MKT';
  if (isMarketing && role !== 'admin' && role !== 'superadmin') {
    return false;
  }

  if (role === 'admin' || role === 'superadmin') return true;
  return (
    desig.includes('MD') ||
    desig.includes('MANAGING DIRECTOR') ||
    desig.includes('CEO') ||
    desig.includes('CTO') ||
    dept.includes('ADMIN') ||
    dept.includes('MANAGEMENT')
  );
}

function formatTime12hBackend(dateOrStr) {
  if (!dateOrStr) return '';
  if (typeof dateOrStr === 'string') {
    const s = dateOrStr.trim();
    if (!s) return '';
    if (s.toUpperCase().includes('AM') || s.toUpperCase().includes('PM')) return s;
    const parts = s.split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parts[1].slice(0, 2);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    }
  }
  const d = dateOrStr instanceof Date ? dateOrStr : new Date(dateOrStr);
  if (isNaN(d.getTime())) return '';
  // Convert UTC timestamp to Indian Standard Time (UTC+5:30)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffsetMs);
  let h = istDate.getUTCHours();
  const m = String(istDate.getUTCMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

function computeIntelligentOverallStatus(data) {
  const {
    overall_status,
    approval_status,
    instagram_status,
    facebook_status,
    youtube_status,
    linkedin_status,
    x_status
  } = data;

  if (overall_status && overall_status !== 'auto' && overall_status !== '') {
    return overall_status;
  }

  if (approval_status === 'Pending') {
    return 'Needs Approval';
  }

  const activePlatforms = [
    instagram_status,
    facebook_status,
    youtube_status,
    linkedin_status,
    x_status
  ].filter(s => s && s !== 'Not Required');

  if (activePlatforms.length === 0) {
    return 'Planned';
  }

  const allPosted = activePlatforms.every(s => s === 'Posted');
  if (allPosted) return 'Posted';

  const anyPosted = activePlatforms.some(s => s === 'Posted');
  const anyPending = activePlatforms.some(
    s => s === 'Pending' || s === 'Draft' || s === 'In Design' || s === 'Planned'
  );
  if (anyPosted && anyPending) return 'Pending Platforms';

  const allScheduled = activePlatforms.every(s => s === 'Scheduled');
  if (allScheduled) return 'Scheduled';

  const allReady = activePlatforms.every(s => s === 'Ready');
  if (allReady) return 'Ready to Post';

  const allPlanned = activePlatforms.every(s => s === 'Planned');
  if (allPlanned) return 'Planned';

  return 'Pending Platforms';
}

async function normalizeContentsList(contents, fallback = {}) {
  let list = Array.isArray(contents) && contents.length > 0 ? contents : [];
  if (list.length === 0) {
    if (fallback.content_title || fallback.content_type) {
      list = [fallback];
    }
  }

  const normalized = [];
  for (const c of list) {
    if (!c) continue;
    const title = (c.content_title || '').trim();
    if (!title && !c.notes) continue;

    let respName = c.responsible_employee_name || '';
    let respId = c.responsible_employee && mongoose.Types.ObjectId.isValid(c.responsible_employee)
      ? c.responsible_employee
      : null;

    if (respId && !respName) {
      try {
        const emp = await User.findById(respId).select('name displayName firstName lastName');
        if (emp) {
          respName = (emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.displayName).trim();
        }
      } catch (e) {
        // ignore lookup error
      }
    }

    const calculatedOverall = computeIntelligentOverallStatus({
      overall_status: c.overall_status,
      approval_status: c.approval_status || 'Pending',
      instagram_status: c.instagram_status || 'Not Required',
      facebook_status: c.facebook_status || 'Not Required',
      youtube_status: c.youtube_status || 'Not Required',
      linkedin_status: c.linkedin_status || 'Not Required',
      x_status: c.x_status || 'Not Required'
    });

    normalized.push({
      _id: c._id || new mongoose.Types.ObjectId(),
      content_title: title,
      content_type: c.content_type || 'Post',
      responsible_employee: respId,
      responsible_employee_name: respName,
      approval_status: c.approval_status || 'Pending',
      overall_status: calculatedOverall,
      live_folder_link: (c.live_folder_link || '').trim(),
      notes: (c.notes || '').trim(),
      instagram_status: c.instagram_status || 'Not Required',
      instagram_time: c.instagram_time || '',
      facebook_status: c.facebook_status || 'Not Required',
      facebook_time: c.facebook_time || '',
      youtube_status: c.youtube_status || 'Not Required',
      youtube_time: c.youtube_time || '',
      linkedin_status: c.linkedin_status || 'Not Required',
      linkedin_time: c.linkedin_time || '',
      x_status: c.x_status || 'Not Required',
      x_time: c.x_time || ''
    });
  }

  return normalized;
}

// Initial seed data from Excel specification
const INITIAL_SEED_ITEMS = [
  {
    content_title: 'Hackathon Team Reel',
    content_type: 'Reel',
    content_date: new Date('2026-09-29T12:00:00.000Z'),
    day: 'Tuesday',
    responsible_employee_name: 'Digital Marketing Assistant',
    approval_status: 'Approved',
    overall_status: 'Pending Platforms',
    instagram_status: 'Posted',
    instagram_time: '07:00 PM',
    youtube_status: 'Pending',
    youtube_time: '',
    linkedin_status: 'Posted',
    linkedin_time: '07:10 PM',
    x_status: 'Pending',
    x_time: '',
    notes: 'Instagram & LinkedIn posted; YouTube and X still pending',
    live_folder_link: ''
  },
  {
    content_title: 'Registration Closing Poster',
    content_type: 'Poster',
    content_date: new Date('2026-09-30T12:00:00.000Z'),
    day: 'Wednesday',
    responsible_employee_name: 'Digital Marketing Assistant',
    approval_status: 'Approved',
    overall_status: 'Scheduled',
    instagram_status: 'Scheduled',
    instagram_time: '06:30 PM',
    youtube_status: 'Not Required',
    youtube_time: '',
    linkedin_status: 'Scheduled',
    linkedin_time: '06:35 PM',
    x_status: 'Scheduled',
    x_time: '06:40 PM',
    notes: '',
    live_folder_link: ''
  },
  {
    content_title: 'Cyber Security Career Tips',
    content_type: 'Carousel',
    content_date: new Date('2026-10-01T12:00:00.000Z'),
    day: 'Thursday',
    responsible_employee_name: 'Graphic Designer',
    approval_status: 'Pending',
    overall_status: 'Planned',
    instagram_status: 'Planned',
    instagram_time: '11:00 AM',
    youtube_status: 'Planned',
    youtube_time: '04:30 PM',
    linkedin_status: 'Planned',
    linkedin_time: '02:00 PM',
    x_status: 'Planned',
    x_time: '06:00 PM',
    notes: 'Design under review',
    live_folder_link: ''
  },
  {
    content_title: 'Student Testimonial',
    content_type: 'Reel',
    content_date: new Date('2026-10-02T12:00:00.000Z'),
    day: 'Friday',
    responsible_employee_name: 'Video Editor',
    approval_status: 'Approved',
    overall_status: 'Ready to Post',
    instagram_status: 'Ready',
    instagram_time: '06:30 PM',
    youtube_status: 'Ready',
    youtube_time: '07:00 PM',
    linkedin_status: 'Ready',
    linkedin_time: '05:00 PM',
    x_status: 'Ready',
    x_time: '07:30 PM',
    notes: 'Upload after final check',
    live_folder_link: ''
  }
];

let isSeedingProcess = false;

async function ensureSeedData(user) {
  if (isSeedingProcess) return;
  isSeedingProcess = true;
  try {
    const count = await DigitalCalendar.countDocuments();
    if (count === 0) {
      const mktUsers = await User.find({
        $or: [
          { department: { $regex: /marketing/i } },
          { designation: { $regex: /marketing|designer|editor|content|social/i } }
        ]
      }).limit(5);

      for (let idx = 0; idx < INITIAL_SEED_ITEMS.length; idx++) {
        const item = INITIAL_SEED_ITEMS[idx];
        const assignedUser = mktUsers[idx % (mktUsers.length || 1)];
        const personName = assignedUser
          ? (assignedUser.name || `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim() || assignedUser.displayName)
          : item.responsible_employee_name;
        await DigitalCalendar.findOneAndUpdate(
          { content_title: item.content_title, content_date: item.content_date },
          {
            $setOnInsert: {
              ...item,
              responsible_employee: assignedUser ? assignedUser._id : null,
              responsible_employee_name: personName,
              createdBy: user ? user._id : (assignedUser ? assignedUser._id : null)
            }
          },
          { upsert: true, new: true }
        );
      }
    }

    // Auto-align any existing items where responsible_employee user has a real name
    const existingWithUser = await DigitalCalendar.find({ responsible_employee: { $ne: null } })
      .populate('responsible_employee', 'name firstName lastName displayName')
      .limit(50);
    for (const doc of existingWithUser) {
      if (doc.responsible_employee) {
        const actualPersonName = (doc.responsible_employee.name || `${doc.responsible_employee.firstName || ''} ${doc.responsible_employee.lastName || ''}`.trim()).trim();
        if (actualPersonName && doc.responsible_employee_name !== actualPersonName) {
          doc.responsible_employee_name = actualPersonName;
          await doc.save();
        }
      }
    }

    // Ensure seed items have all 4 platforms configured with proper times
    await DigitalCalendar.updateMany(
      { content_title: 'Student Testimonial' },
      {
        $set: {
          instagram_time: '06:30 PM',
          youtube_time: '07:00 PM',
          linkedin_time: '05:00 PM',
          x_time: '07:30 PM'
        }
      }
    );
    await DigitalCalendar.updateMany(
      { content_title: 'Cyber Security Career Tips', $or: [{ youtube_status: 'Not Required' }, { youtube_status: { $exists: false } }, { youtube_status: '' }] },
      { $set: { youtube_status: 'Planned', youtube_time: '04:30 PM' } }
    );

    // Auto-backfill posting times on any documents where platform is marked Posted but time is missing
    const postedDocsToFix = await DigitalCalendar.find({
      $or: [
        { overall_status: 'Posted' },
        { instagram_status: 'Posted', instagram_time: { $in: ['', null] } },
        { youtube_status: 'Posted', youtube_time: { $in: ['', null] } },
        { linkedin_status: 'Posted', linkedin_time: { $in: ['', null] } },
        { x_status: 'Posted', x_time: { $in: ['', null] } },
        { facebook_status: 'Posted', facebook_time: { $in: ['', null] } }
      ]
    }).limit(100);

    for (const doc of postedDocsToFix) {
      let modified = false;
      const defaultPostTime = formatTime12hBackend(doc.updatedAt || doc.createdAt || new Date());
      const pList = ['instagram', 'facebook', 'youtube', 'linkedin', 'x'];

      const repairObjTimes = (target) => {
        pList.forEach(pf => {
          if (target[`${pf}_status`] === 'Posted' && (!target[`${pf}_time`] || !String(target[`${pf}_time`]).trim())) {
            target[`${pf}_time`] = defaultPostTime;
            modified = true;
          }
        });
      };

      repairObjTimes(doc);

      if (Array.isArray(doc.contents) && doc.contents.length > 0) {
        doc.contents.forEach(sub => repairObjTimes(sub));
        pList.forEach(pf => {
          if (doc.contents[0][`${pf}_time`]) {
            doc[`${pf}_time`] = doc.contents[0][`${pf}_time`];
          }
        });
      }

      if (modified) {
        await doc.save();
      }
    }
  } catch (err) {
    console.error('Failed to seed Digital Calendar data:', err.message);
  } finally {
    isSeedingProcess = false;
  }
}

// GET /api/marketing/digital-calendar/employees — Get marketing department employees dynamically
router.get('/employees', protect, async (req, res) => {
  try {
    // Strictly find active users belonging to Marketing department or with marketing roles
    const marketingQuery = {
      isActive: true,
      $or: [
        { department: { $regex: /marketing|digital/i } },
        { designation: { $regex: /marketing|designer|editor|content|social|creative|growth|seo|copywriter|videographer/i } }
      ]
    };

    let marketingUsers = await User.find(marketingQuery)
      .select('_id name firstName lastName displayName email designation department avatar role')
      .sort({ name: 1 });

    // Fallback: if no specific marketing users found, search for any user with 'market'
    if (marketingUsers.length === 0) {
      marketingUsers = await User.find({
        isActive: true,
        $or: [
          { department: { $regex: /market/i } },
          { designation: { $regex: /market/i } }
        ]
      })
        .select('_id name firstName lastName displayName email designation department avatar role')
        .sort({ name: 1 });
    }

    // Final fallback: return active employees so dropdown doesn't break if DB hasn't set department tags
    if (marketingUsers.length === 0) {
      marketingUsers = await User.find({ isActive: true })
        .select('_id name firstName lastName displayName email designation department avatar role')
        .sort({ name: 1 });
    }

    res.json({
      ok: true,
      employees: marketingUsers.map(u => {
        const actualName = (u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Marketing Member').trim();
        const displayName = (u.displayName || u.designation || 'Marketing Executive').trim();
        return {
          _id: u._id,
          name: actualName,
          actualName,
          displayName,
          designation: u.designation || displayName || 'Marketing',
          department: u.department || 'Marketing',
          email: u.email,
          avatar: u.avatar || ''
        };
      })
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// GET /api/marketing/digital-calendar — List all content items with filtering
router.get('/', protect, async (req, res) => {
  try {
    await ensureSeedData(req.user);

    const {
      year,
      month,
      startDate,
      endDate,
      responsible,
      type,
      overall_status,
      approval_status,
      platform,
      search
    } = req.query;

    const query = {};

    // Date range filter
    if (startDate && endDate) {
      query.content_date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (year && month) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10) - 1; // 0-indexed
      const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
      const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      query.content_date = { $gte: start, $lte: end };
    }

    // Responsible filter
    if (responsible && responsible !== 'all') {
      if (mongoose.Types.ObjectId.isValid(responsible)) {
        query.$or = [
          { responsible_employee: responsible },
          { responsible_employee_name: { $regex: responsible, $options: 'i' } }
        ];
      } else {
        query.responsible_employee_name = { $regex: responsible, $options: 'i' };
      }
    }

    // Type filter
    if (type && type !== 'all') {
      query.content_type = type;
    }

    // Overall Status filter
    if (overall_status && overall_status !== 'all') {
      query.overall_status = overall_status;
    }

    // Approval Status filter
    if (approval_status && approval_status !== 'all') {
      query.approval_status = approval_status;
    }

    // Platform filter: only show where this platform is not 'Not Required'
    if (platform && platform !== 'all') {
      const p = platform.toLowerCase();
      if (p === 'instagram') {
        query.instagram_status = { $ne: 'Not Required' };
      } else if (p === 'youtube') {
        query.youtube_status = { $ne: 'Not Required' };
      } else if (p === 'linkedin') {
        query.linkedin_status = { $ne: 'Not Required' };
      } else if (p === 'x' || p === 'twitter') {
        query.x_status = { $ne: 'Not Required' };
      }
    }

    // Search filter
    if (search && search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { content_title: regex },
          { notes: regex },
          { responsible_employee_name: regex },
          { content_type: regex },
          { overall_status: regex },
          { 'contents.content_title': regex },
          { 'contents.notes': regex },
          { 'contents.responsible_employee_name': regex },
          { 'contents.content_type': regex }
        ]
      });
    }

    const items = await DigitalCalendar.find(query)
      .populate('responsible_employee', 'name firstName lastName displayName email designation avatar')
      .populate('contents.responsible_employee', 'name firstName lastName displayName email designation avatar')
      .populate('createdBy', 'name email designation avatar')
      .populate('updatedBy', 'name email designation avatar')
      .sort({ content_date: 1, createdAt: 1 });

    res.json({
      ok: true,
      count: items.length,
      data: items
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// GET /api/marketing/digital-calendar/stats — Dynamic calculation of summary cards
router.get('/stats', protect, async (req, res) => {
  try {
    await ensureSeedData(req.user);

    const { year, month } = req.query;
    const query = {};

    if (year && month) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10) - 1;
      const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
      const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      query.content_date = { $gte: start, $lte: end };
    }

    const allItems = await DigitalCalendar.find(query);

    let totalContent = 0;
    let scheduled = 0;
    let posted = 0;
    let pending = 0;
    let needsApproval = 0;

    allItems.forEach(item => {
      const subItems = (item.contents && item.contents.length > 0)
        ? item.contents
        : [item];

      totalContent += subItems.length;

      subItems.forEach(sub => {
        if (sub.approval_status === 'Pending') {
          needsApproval++;
        }

        if (sub.overall_status === 'Posted') {
          posted++;
        } else if (sub.overall_status === 'Scheduled') {
          scheduled++;
        } else if (
          sub.overall_status === 'Pending Platforms' ||
          sub.overall_status === 'Planned' ||
          sub.overall_status === 'Draft' ||
          sub.overall_status === 'In Design' ||
          sub.overall_status === 'Ready to Post'
        ) {
          pending++;
        }
      });
    });

    res.json({
      ok: true,
      stats: {
        totalContent,
        scheduled,
        posted,
        pending,
        needsApproval
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// GET /api/marketing/digital-calendar/google/config — Get Google Calendar config & presets
router.get('/google/config', protect, (req, res) => {
  const apiKey = (process.env.GOOGLE_CALENDAR_API_KEY || '').trim();
  res.json({
    ok: true,
    configured: !!apiKey,
    presets: PRESET_GOOGLE_CALENDARS,
    defaultCalendar: 'indian_holidays'
  });
});

// GET /api/marketing/digital-calendar/google/events — Fetch Google Calendar events live
router.get('/google/events', protect, async (req, res) => {
  try {
    const apiKey = (process.env.GOOGLE_CALENDAR_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(400).json({
        ok: false,
        message: 'Google Calendar API key is not configured in backend environment (GOOGLE_CALENDAR_API_KEY).'
      });
    }

    const {
      calendarId = 'indian_holidays',
      year,
      month,
      timeMin,
      timeMax,
      search
    } = req.query;

    let resolvedCalendarId = calendarId;
    let calendarName = 'Google Calendar';

    if (PRESET_GOOGLE_CALENDARS[calendarId]) {
      resolvedCalendarId = PRESET_GOOGLE_CALENDARS[calendarId].id;
      calendarName = PRESET_GOOGLE_CALENDARS[calendarId].name;
    }

    let startIso = timeMin;
    let endIso = timeMax;

    if (!startIso || !endIso) {
      if (year && month) {
        const y = parseInt(year, 10);
        const m = parseInt(month, 10) - 1;
        // Buffer by 15 days before and after so all visible grid days have data
        startIso = new Date(Date.UTC(y, m - 1, 20, 0, 0, 0)).toISOString();
        endIso = new Date(Date.UTC(y, m + 2, 10, 23, 59, 59)).toISOString();
      } else if (year) {
        const y = parseInt(year, 10);
        startIso = new Date(Date.UTC(y, 0, 1, 0, 0, 0)).toISOString();
        endIso = new Date(Date.UTC(y, 11, 31, 23, 59, 59)).toISOString();
      } else {
        const now = new Date();
        const y = now.getFullYear();
        startIso = new Date(Date.UTC(y, 0, 1, 0, 0, 0)).toISOString();
        endIso = new Date(Date.UTC(y, 11, 31, 23, 59, 59)).toISOString();
      }
    }

    const googleUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(resolvedCalendarId)}/events`;

    const gResponse = await axios.get(googleUrl, {
      params: {
        key: apiKey,
        timeMin: startIso,
        timeMax: endIso,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500,
        q: search && search.trim() ? search.trim() : undefined
      },
      timeout: 10000
    });

    const googleItems = (gResponse.data.items || []).map(item => {
      const rawStart = item.start?.dateTime || item.start?.date;
      const rawEnd = item.end?.dateTime || item.end?.date;
      const isAllDay = !item.start?.dateTime && !!item.start?.date;

      return {
        _id: `gcal_${item.id}`,
        id: item.id,
        googleEventId: item.id,
        summary: item.summary || 'Untitled Google Event',
        content_title: item.summary || 'Untitled Google Event',
        description: item.description || '',
        notes: item.description || '',
        location: item.location || '',
        content_date: rawStart,
        start: rawStart,
        end: rawEnd,
        isAllDay,
        htmlLink: item.htmlLink || '',
        status: item.status || 'confirmed',
        content_type: 'Event',
        overall_status: 'Google Calendar',
        approval_status: 'Approved',
        calendarId: resolvedCalendarId,
        calendarName: gResponse.data.summary || calendarName,
        source: 'google'
      };
    });

    res.json({
      ok: true,
      count: googleItems.length,
      calendarTitle: gResponse.data.summary || calendarName,
      calendarDescription: gResponse.data.description || '',
      calendarTimeZone: gResponse.data.timeZone || 'UTC',
      data: googleItems
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const errorDetails = err.response?.data?.error?.message || err.message;
    console.error('Google Calendar API fetch error:', errorDetails);
    res.status(status).json({
      ok: false,
      message: `Failed to fetch Google Calendar events: ${errorDetails}`,
      details: err.response?.data || null
    });
  }
});

// POST /api/marketing/digital-calendar/google/import-event — Import a Google event into Digital Calendar
router.post('/google/import-event', protect, async (req, res) => {
  try {
    const {
      summary,
      description,
      start,
      content_type = 'Post',
      responsible_employee,
      responsible_employee_name,
      notes,
      instagram_status = 'Planned',
      facebook_status = 'Planned',
      youtube_status = 'Not Required',
      linkedin_status = 'Planned',
      x_status = 'Planned'
    } = req.body;

    if (!summary || !start) {
      return res.status(400).json({
        ok: false,
        message: 'Google event summary and start date are required'
      });
    }

    const dateObj = new Date(start);
    const day = DAYS_OF_WEEK[dateObj.getDay()];

    let finalResponsibleName = responsible_employee_name || '';
    if (responsible_employee && mongoose.Types.ObjectId.isValid(responsible_employee)) {
      const emp = await User.findById(responsible_employee).select('name displayName firstName lastName');
      if (emp) {
        finalResponsibleName = emp.displayName || emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
      }
    }

    const newItem = new DigitalCalendar({
      content_title: summary.trim(),
      content_type: content_type || 'Post',
      content_date: dateObj,
      day,
      responsible_employee: responsible_employee && mongoose.Types.ObjectId.isValid(responsible_employee) ? responsible_employee : null,
      responsible_employee_name: finalResponsibleName,
      approval_status: 'Approved',
      overall_status: 'Planned',
      notes: (notes || description || `Imported from Google Calendar (${summary})`).trim(),
      instagram_status,
      facebook_status,
      youtube_status,
      linkedin_status,
      x_status,
      createdBy: req.user._id
    });

    await newItem.save();

    const populatedItem = await DigitalCalendar.findById(newItem._id)
      .populate('responsible_employee', 'name firstName lastName displayName email designation avatar')
      .populate('createdBy', 'name email designation avatar');

    res.status(201).json({
      ok: true,
      message: `Successfully imported "${summary}" into Digital Content Calendar`,
      data: populatedItem
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// GET /api/marketing/digital-calendar/:id — Get a single item
router.get('/:id', protect, async (req, res) => {
  try {
    const item = await DigitalCalendar.findById(req.params.id)
      .populate('responsible_employee', 'name firstName lastName displayName email designation avatar')
      .populate('contents.responsible_employee', 'name firstName lastName displayName email designation avatar')
      .populate('createdBy', 'name email designation avatar')
      .populate('updatedBy', 'name email designation avatar');

    if (!item) {
      return res.status(404).json({ ok: false, message: 'Content item not found' });
    }

    res.json({ ok: true, data: item });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// POST /api/marketing/digital-calendar — Add content
router.post('/', protect, async (req, res) => {
  try {
    const {
      content_title,
      content_type,
      content_date,
      contents,
      responsible_employee,
      responsible_employee_name,
      approval_status,
      overall_status,
      live_folder_link,
      notes,
      instagram_status,
      instagram_time,
      facebook_status,
      facebook_time,
      youtube_status,
      youtube_time,
      linkedin_status,
      linkedin_time,
      x_status,
      x_time
    } = req.body;

    if (!content_date) {
      return res.status(400).json({
        ok: false,
        message: 'Content date is required'
      });
    }

    const dateObj = new Date(content_date);
    const day = DAYS_OF_WEEK[dateObj.getDay()];

    const normalizedContents = await normalizeContentsList(contents, req.body);

    if (normalizedContents.length === 0) {
      return res.status(400).json({
        ok: false,
        message: 'Content title/topic is required'
      });
    }

    // First content defines top-level primary fields
    const primary = normalizedContents[0];

    const newItem = new DigitalCalendar({
      content_title: primary.content_title,
      content_type: primary.content_type,
      content_date: dateObj,
      day,
      contents: normalizedContents,
      responsible_employee: primary.responsible_employee,
      responsible_employee_name: primary.responsible_employee_name,
      approval_status: primary.approval_status,
      overall_status: primary.overall_status,
      live_folder_link: primary.live_folder_link,
      notes: primary.notes,
      instagram_status: primary.instagram_status,
      instagram_time: primary.instagram_time,
      facebook_status: primary.facebook_status,
      facebook_time: primary.facebook_time,
      youtube_status: primary.youtube_status,
      youtube_time: primary.youtube_time,
      linkedin_status: primary.linkedin_status,
      linkedin_time: primary.linkedin_time,
      x_status: primary.x_status,
      x_time: primary.x_time,
      createdBy: req.user._id
    });

    await newItem.save();

    const populatedItem = await DigitalCalendar.findById(newItem._id)
      .populate('responsible_employee', 'name firstName lastName displayName email designation avatar')
      .populate('contents.responsible_employee', 'name firstName lastName displayName email designation avatar')
      .populate('createdBy', 'name email designation avatar');

    res.status(201).json({
      ok: true,
      message: 'Content created successfully',
      data: populatedItem
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// PUT /api/marketing/digital-calendar/:id — Update content
router.put('/:id', protect, async (req, res) => {
  try {
    const item = await DigitalCalendar.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Content item not found' });
    }

    // Completed & Posted tasks are locked from editing
    const isAdmin = isStrictAdminOrCEO(req.user);
    if (!isAdmin) {
      const isAlreadyPosted =
        item.overall_status === 'Posted' &&
        (!Array.isArray(item.contents) || item.contents.length === 0 || item.contents.every(c => c.overall_status === 'Posted'));
      if (isAlreadyPosted) {
        return res.status(403).json({
          ok: false,
          message: 'Content marked as Completed & Posted is finalized and cannot be modified.'
        });
      }
    }

    const {
      contents,
      content_title,
      content_type,
      content_date,
      responsible_employee,
      responsible_employee_name,
      approval_status,
      overall_status,
      live_folder_link,
      notes,
      instagram_status,
      instagram_time,
      facebook_status,
      facebook_time,
      youtube_status,
      youtube_time,
      linkedin_status,
      linkedin_time,
      x_status,
      x_time
    } = req.body;

    if (content_date !== undefined) {
      const dateObj = new Date(content_date);
      item.content_date = dateObj;
      item.day = DAYS_OF_WEEK[dateObj.getDay()];
    }

    if (Array.isArray(contents) && contents.length > 0) {
      const normalizedContents = await normalizeContentsList(contents, req.body);
      item.contents = normalizedContents;

      if (normalizedContents.length > 0) {
        const primary = normalizedContents[0];
        item.content_title = primary.content_title;
        item.content_type = primary.content_type;
        item.responsible_employee = primary.responsible_employee;
        item.responsible_employee_name = primary.responsible_employee_name;
        item.approval_status = primary.approval_status;
        item.overall_status = primary.overall_status;
        item.live_folder_link = primary.live_folder_link;
        item.notes = primary.notes;
        item.instagram_status = primary.instagram_status;
        item.instagram_time = primary.instagram_time;
        item.facebook_status = primary.facebook_status;
        item.facebook_time = primary.facebook_time;
        item.youtube_status = primary.youtube_status;
        item.youtube_time = primary.youtube_time;
        item.linkedin_status = primary.linkedin_status;
        item.linkedin_time = primary.linkedin_time;
        item.x_status = primary.x_status;
        item.x_time = primary.x_time;
      }
    } else {
      // Legacy single content update
      if (content_title !== undefined) item.content_title = content_title.trim();
      if (content_type !== undefined) item.content_type = content_type;

      if (responsible_employee !== undefined) {
        if (responsible_employee && mongoose.Types.ObjectId.isValid(responsible_employee)) {
          item.responsible_employee = responsible_employee;
          const emp = await User.findById(responsible_employee).select('name displayName firstName lastName');
          if (emp) {
            item.responsible_employee_name = (emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.displayName).trim();
          }
        } else {
          item.responsible_employee = null;
          if (responsible_employee_name !== undefined) {
            item.responsible_employee_name = responsible_employee_name;
          }
        }
      } else if (responsible_employee_name !== undefined) {
        item.responsible_employee_name = responsible_employee_name;
      }

      if (approval_status !== undefined) item.approval_status = approval_status;
      if (live_folder_link !== undefined) item.live_folder_link = live_folder_link.trim();
      if (notes !== undefined) item.notes = notes.trim();

      if (instagram_status !== undefined) item.instagram_status = instagram_status;
      if (instagram_time !== undefined) item.instagram_time = instagram_time;

      if (facebook_status !== undefined) item.facebook_status = facebook_status;
      if (facebook_time !== undefined) item.facebook_time = facebook_time;

      if (youtube_status !== undefined) item.youtube_status = youtube_status;
      if (youtube_time !== undefined) item.youtube_time = youtube_time;

      if (linkedin_status !== undefined) item.linkedin_status = linkedin_status;
      if (linkedin_time !== undefined) item.linkedin_time = linkedin_time;

      if (x_status !== undefined) item.x_status = x_status;
      if (x_time !== undefined) item.x_time = x_time;

      item.overall_status = computeIntelligentOverallStatus({
        overall_status: overall_status !== undefined ? overall_status : item.overall_status,
        approval_status: item.approval_status,
        instagram_status: item.instagram_status,
        facebook_status: item.facebook_status,
        youtube_status: item.youtube_status,
        linkedin_status: item.linkedin_status,
        x_status: item.x_status
      });

      // Also sync into contents[0] if present
      if (item.contents && item.contents.length > 0) {
        item.contents[0].content_title = item.content_title;
        item.contents[0].content_type = item.content_type;
        item.contents[0].responsible_employee = item.responsible_employee;
        item.contents[0].responsible_employee_name = item.responsible_employee_name;
        item.contents[0].approval_status = item.approval_status;
        item.contents[0].overall_status = item.overall_status;
        item.contents[0].live_folder_link = item.live_folder_link;
        item.contents[0].notes = item.notes;
        item.contents[0].instagram_status = item.instagram_status;
        item.contents[0].instagram_time = item.instagram_time;
        item.contents[0].facebook_status = item.facebook_status;
        item.contents[0].facebook_time = item.facebook_time;
        item.contents[0].youtube_status = item.youtube_status;
        item.contents[0].youtube_time = item.youtube_time;
        item.contents[0].linkedin_status = item.linkedin_status;
        item.contents[0].linkedin_time = item.linkedin_time;
        item.contents[0].x_status = item.x_status;
        item.contents[0].x_time = item.x_time;
      }
    }

    item.updatedBy = req.user._id;

    await item.save();

    const populatedItem = await DigitalCalendar.findById(item._id)
      .populate('responsible_employee', 'name firstName lastName displayName email designation avatar')
      .populate('contents.responsible_employee', 'name firstName lastName displayName email designation avatar')
      .populate('createdBy', 'name email designation avatar')
      .populate('updatedBy', 'name email designation avatar');

    res.json({
      ok: true,
      message: 'Content updated successfully',
      data: populatedItem
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// PATCH /api/marketing/digital-calendar/:id/approve — Direct approval by admin
router.patch('/:id/approve', protect, async (req, res) => {
  try {
    const isAdmin = isStrictAdminOrCEO(req.user);
    if (!isAdmin) {
      return res.status(403).json({
        ok: false,
        message: 'Only administrators can approve content.'
      });
    }

    const item = await DigitalCalendar.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Content item not found' });
    }

    const subIndex = req.body.subIndex !== undefined && req.body.subIndex !== null ? Number(req.body.subIndex) : null;

    if (Array.isArray(item.contents) && item.contents.length > 0) {
      if (subIndex !== null && subIndex >= 0 && subIndex < item.contents.length) {
        item.contents[subIndex].approval_status = 'Approved';
        if (item.contents[subIndex].overall_status === 'Needs Approval' || item.contents[subIndex].overall_status === 'Planned') {
          item.contents[subIndex].overall_status = 'Ready to Post';
        }
      } else {
        item.contents.forEach(sub => {
          sub.approval_status = 'Approved';
          if (sub.overall_status === 'Needs Approval' || sub.overall_status === 'Planned') {
            sub.overall_status = 'Ready to Post';
          }
        });
      }
      item.approval_status = item.contents[0].approval_status;
      item.overall_status = item.contents[0].overall_status;
    } else {
      item.approval_status = 'Approved';
      if (item.overall_status === 'Needs Approval' || item.overall_status === 'Planned') {
        item.overall_status = 'Ready to Post';
      }
    }

    item.updatedBy = req.user._id;
    await item.save();

    const populatedItem = await DigitalCalendar.findById(item._id)
      .populate('responsible_employee', 'name firstName lastName displayName email designation avatar')
      .populate('contents.responsible_employee', 'name firstName lastName displayName email designation avatar')
      .populate('createdBy', 'name email designation avatar')
      .populate('updatedBy', 'name email designation avatar');

    res.json({
      ok: true,
      message: 'Content approved successfully',
      data: populatedItem
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// PATCH /api/marketing/digital-calendar/:id/complete — Mark as completed (turns into Posted)
router.patch('/:id/complete', protect, async (req, res) => {
  try {
    const item = await DigitalCalendar.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Content item not found' });
    }

    const subIndex = req.body.subIndex !== undefined && req.body.subIndex !== null ? Number(req.body.subIndex) : null;
    const platforms = ['instagram', 'facebook', 'youtube', 'linkedin', 'x'];
    const platformDisplayNames = {
      instagram: 'Instagram',
      facebook: 'Facebook',
      youtube: 'YouTube',
      linkedin: 'LinkedIn',
      x: 'X / Twitter'
    };

    // Verify that the content is approved before allowing completion
    if (Array.isArray(item.contents) && item.contents.length > 0) {
      if (subIndex !== null && subIndex >= 0 && subIndex < item.contents.length) {
        if (item.contents[subIndex].approval_status !== 'Approved') {
          return res.status(400).json({
            ok: false,
            message: 'Content cannot be marked as completed without admin approval.'
          });
        }
      } else {
        const anyUnapproved = item.contents.some(s => s.approval_status !== 'Approved');
        if (anyUnapproved) {
          return res.status(400).json({
            ok: false,
            message: 'Content cannot be marked as completed without admin approval.'
          });
        }
      }
    } else {
      if (item.approval_status !== 'Approved') {
        return res.status(400).json({
          ok: false,
          message: 'Content cannot be marked as completed without admin approval.'
        });
      }
    }

    const incomingTimes = req.body.times || req.body;

    const applyTimesAndCheckMissing = (sub) => {
      // 1. If times are provided in request, update them on the sub-item
      if (incomingTimes && typeof incomingTimes === 'object') {
        platforms.forEach(pf => {
          const val = incomingTimes[`${pf}_time`] !== undefined ? incomingTimes[`${pf}_time`] : incomingTimes[pf];
          if (typeof val === 'string' && val.trim() !== '') {
            sub[`${pf}_time`] = val.trim();
          }
        });
      }

      // 2. Validate that every active platform has a time
      const missing = [];
      platforms.forEach(pf => {
        const statusKey = `${pf}_status`;
        const timeKey = `${pf}_time`;
        const isActive = sub[statusKey] && sub[statusKey] !== 'Not Required';
        if (isActive) {
          if (!sub[timeKey] || !String(sub[timeKey]).trim()) {
            missing.push(platformDisplayNames[pf] || pf);
          }
        }
      });
      return missing;
    };

    if (Array.isArray(item.contents) && item.contents.length > 0) {
      if (subIndex !== null && subIndex >= 0 && subIndex < item.contents.length) {
        const missing = applyTimesAndCheckMissing(item.contents[subIndex]);
        if (missing.length > 0) {
          return res.status(400).json({
            ok: false,
            message: `Posting time is required for ${missing.join(', ')} before marking as completed.`,
            missingPlatforms: missing
          });
        }
      } else {
        for (const sub of item.contents) {
          const missing = applyTimesAndCheckMissing(sub);
          if (missing.length > 0) {
            return res.status(400).json({
              ok: false,
              message: `Posting time is required for ${missing.join(', ')} before marking as completed.`,
              missingPlatforms: missing
            });
          }
        }
      }
    } else {
      const missing = applyTimesAndCheckMissing(item);
      if (missing.length > 0) {
        return res.status(400).json({
          ok: false,
          message: `Posting time is required for ${missing.join(', ')} before marking as completed.`,
          missingPlatforms: missing
        });
      }
    }

    const currentPostingTimeStr = formatTime12hBackend(new Date());

    const markSubComplete = (sub) => {
      sub.overall_status = 'Posted';
      platforms.forEach(pf => {
        const key = `${pf}_status`;
        if (sub[key] && sub[key] !== 'Not Required') {
          sub[key] = 'Posted';
          // Ensure that particular time of posting is recorded
          if (!sub[`${pf}_time`] || !String(sub[`${pf}_time`]).trim()) {
            sub[`${pf}_time`] = currentPostingTimeStr;
          }
        }
      });
    };

    if (Array.isArray(item.contents) && item.contents.length > 0) {
      if (subIndex !== null && subIndex >= 0 && subIndex < item.contents.length) {
        markSubComplete(item.contents[subIndex]);
      } else {
        item.contents.forEach(sub => markSubComplete(sub));
      }
      item.overall_status = item.contents[0].overall_status;
      item.approval_status = item.contents[0].approval_status;
      platforms.forEach(pf => {
        const key = `${pf}_status`;
        item[key] = item.contents[0][key];
        item[`${pf}_time`] = item.contents[0][`${pf}_time`];
      });
    } else {
      markSubComplete(item);
    }

    item.updatedBy = req.user._id;
    await item.save();

    const populatedItem = await DigitalCalendar.findById(item._id)
      .populate('responsible_employee', 'name firstName lastName displayName email designation avatar')
      .populate('contents.responsible_employee', 'name firstName lastName displayName email designation avatar')
      .populate('createdBy', 'name email designation avatar')
      .populate('updatedBy', 'name email designation avatar');

    res.json({
      ok: true,
      message: 'Content marked as completed and posted successfully',
      data: populatedItem
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// PATCH /api/marketing/digital-calendar/:id/times — Update posting times for platforms (e.g. from Preview or Edit)
router.patch('/:id/times', protect, async (req, res) => {
  try {
    const item = await DigitalCalendar.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Content item not found' });
    }

    const { subIndex = null, times = {} } = req.body;
    const incomingTimes = times && typeof times === 'object' ? times : req.body;

    const updatePlatformTimes = (target) => {
      platforms.forEach(pf => {
        const val = incomingTimes[`${pf}_time`] !== undefined ? incomingTimes[`${pf}_time`] : incomingTimes[pf];
        if (val !== undefined && val !== null) {
          const trimmed = String(val).trim();
          target[`${pf}_time`] = trimmed ? formatTime12hBackend(trimmed) : '';
        }
      });
    };

    if (Array.isArray(item.contents) && item.contents.length > 0) {
      if (subIndex !== null && subIndex !== undefined && subIndex >= 0 && subIndex < item.contents.length) {
        updatePlatformTimes(item.contents[subIndex]);
      } else {
        item.contents.forEach(sub => updatePlatformTimes(sub));
      }
      platforms.forEach(pf => {
        item[`${pf}_time`] = item.contents[0][`${pf}_time`];
      });
    } else {
      updatePlatformTimes(item);
    }

    item.updatedBy = req.user._id;
    await item.save();

    const populatedItem = await DigitalCalendar.findById(item._id)
      .populate('responsible_employee', 'name firstName lastName displayName email designation avatar')
      .populate('contents.responsible_employee', 'name firstName lastName displayName email designation avatar')
      .populate('createdBy', 'name email designation avatar')
      .populate('updatedBy', 'name email designation avatar');

    res.json({
      ok: true,
      message: 'Posting times updated successfully',
      data: populatedItem
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// DELETE /api/marketing/digital-calendar/:id — Delete content (strictly admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await DigitalCalendar.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Content item not found' });
    }

    // Permission check: strictly admin only (marketing team members CANNOT delete)
    const isAdmin = isStrictAdminOrCEO(req.user);

    if (!isAdmin) {
      return res.status(403).json({
        ok: false,
        message: 'Marketing team members cannot delete content. Only administrators have delete permissions.'
      });
    }

    await DigitalCalendar.findByIdAndDelete(req.params.id);

    res.json({
      ok: true,
      message: 'Content item deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
