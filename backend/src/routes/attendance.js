const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { protect, authorize } = require('../middleware/auth');
const {
  handleStartTracking,
  handleStopTracking,
  liveLocations,
} = require('../services/trackingSocket');
const { reverseGeocode } = require('../services/reverseGeocode');

/**
 * Format local date YYYY-MM-DD and day name (IST / local)
 */
function getLocalDateAndDay(dateObj = new Date()) {
  // Using Asia/Kolkata timezone standard for AOTMS Vijayawada
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA gives YYYY-MM-DD
  const dateStr = formatter.format(dateObj);

  const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });
  const dayStr = dayFormatter.format(dateObj);

  return { dateStr, dayStr };
}

/**
 * Format employee code (e.g. EMP001 or fallback EMP-XXXX)
 */
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

/**
 * Format timestamp into 12-hour time (e.g. 09:15 AM) in IST
 */
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
  if (diffSec == null || isNaN(diffSec) || diffSec <= 0) return '0m';
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. POST /api/attendance/start — Employee Clock-in & Start Live Location
// ─────────────────────────────────────────────────────────────────────────────
router.post('/start', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { dateStr, dayStr } = getLocalDateAndDay();
    const now = new Date();

    // Check if employee already has an active ON_DUTY or ON_BREAK session
    let existingActive = await Attendance.findOne({
      employeeId: userId,
      status: { $in: ['ON_DUTY', 'ON_BREAK'] },
    }).sort({ startTime: -1 });

    if (existingActive) {
      existingActive.calculateAttendanceDurations(now);
      await existingActive.save();
      handleStartTracking(req.user, req.body).catch(() => {});
      return res.json({
        ok: true,
        message: 'Attendance is already active',
        attendance: existingActive,
      });
    }

    const lat = Number(req.body.latitude);
    const lng = Number(req.body.longitude);
    const accuracy = Number(req.body.accuracy) || 0;
    const speed = Number(req.body.speed) || 0;
    const heading = Number(req.body.heading) || 0;
    const battery = req.body.battery != null ? Number(req.body.battery) : null;

    let addressInfo = { road: '', area: '', city: 'Vijayawada', formattedAddress: '' };
    const hasValidGps = !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0);

    if (hasValidGps) {
      try {
        addressInfo = await reverseGeocode(lat, lng);
      } catch (geoErr) {
        console.warn('[Attendance Start Geocode Error]:', geoErr.message);
      }
    }

    const empCode = getEmployeeCode(req.user);

    const locationData = {
      latitude: hasValidGps ? lat : null,
      longitude: hasValidGps ? lng : null,
      accuracy,
      speed,
      heading,
      road: addressInfo.road || (hasValidGps ? 'Vijayawada' : ''),
      area: addressInfo.area || '',
      city: addressInfo.city || 'Vijayawada',
      formattedAddress: addressInfo.formattedAddress || '',
      timestamp: now,
    };

    const attendanceRecord = await Attendance.create({
      employeeId: userId,
      employeeName: req.user.name,
      employeeCode: empCode,
      date: dateStr,
      day: dayStr,
      startTime: now,
      endTime: null,
      durationSeconds: 0,
      formattedDuration: '0s',
      status: 'ON_DUTY',
      breaks: [],
      breakCount: 0,
      totalBreakSeconds: 0,
      formattedBreakDuration: '0m',
      actualWorkSeconds: 0,
      formattedActualWork: '0s',
      startLocation: locationData,
      latestLocation: locationData,
      lastLocationUpdate: now,
      deviceInfo: {
        battery,
        userAgent: req.headers['user-agent'] || '',
        platform: req.body.platform || '',
      },
    });

    // Start Live GPS Tracking via Socket & In-memory cache
    try {
      await handleStartTracking(req.user, {
        latitude: lat,
        longitude: lng,
        accuracy,
        speed,
        heading,
        battery,
      });
    } catch (sErr) {
      console.warn('[Attendance Start Live Tracking Socket]:', sErr.message);
    }

    res.status(201).json({
      ok: true,
      message: 'Attendance started successfully. Live working timer active.',
      attendance: attendanceRecord,
    });
  } catch (err) {
    console.error('[Attendance Start Error]:', err);
    res.status(500).json({ ok: false, message: err.message || 'Failed to start attendance' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. POST /api/attendance/break/start — Employee Starts a Break
// ─────────────────────────────────────────────────────────────────────────────
router.post('/break/start', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    const attendance = await Attendance.findOne({
      employeeId: userId,
      status: { $in: ['ON_DUTY', 'ON_BREAK'] },
    }).sort({ startTime: -1 });

    if (!attendance) {
      return res.status(400).json({ ok: false, message: 'No active attendance session found to take a break' });
    }

    if (attendance.status === 'ON_BREAK') {
      return res.json({
        ok: true,
        message: 'Employee is already on break',
        attendance,
      });
    }

    const breakNumber = (attendance.breaks?.length || 0) + 1;
    const newBreak = {
      breakNumber,
      startTime: now,
      endTime: null,
      durationSeconds: 0,
      formattedDuration: '0s',
      status: 'ACTIVE',
      notes: req.body.notes || '',
    };

    if (!Array.isArray(attendance.breaks)) {
      attendance.breaks = [];
    }
    attendance.breaks.push(newBreak);
    attendance.status = 'ON_BREAK';
    attendance.calculateAttendanceDurations(now);
    await attendance.save();

    res.json({
      ok: true,
      message: `Break #${breakNumber} started. Working timer paused.`,
      attendance,
      activeBreak: newBreak,
    });
  } catch (err) {
    console.error('[Attendance Break Start Error]:', err);
    res.status(500).json({ ok: false, message: err.message || 'Failed to start break' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/attendance/break/resume — Employee Resumes Work After Break
// ─────────────────────────────────────────────────────────────────────────────
router.post('/break/resume', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    const attendance = await Attendance.findOne({
      employeeId: userId,
      status: { $in: ['ON_DUTY', 'ON_BREAK'] },
    }).sort({ startTime: -1 });

    if (!attendance) {
      return res.status(400).json({ ok: false, message: 'No active attendance session found' });
    }

    if (attendance.status !== 'ON_BREAK') {
      return res.json({
        ok: true,
        message: 'Employee is already on duty',
        attendance,
      });
    }

    // Find the active break
    const activeBreakIndex = attendance.breaks.findIndex((b) => b.status === 'ACTIVE');
    if (activeBreakIndex !== -1) {
      const b = attendance.breaks[activeBreakIndex];
      b.endTime = now;
      b.status = 'COMPLETED';
      const bStart = new Date(b.startTime).getTime();
      const diffSec = Math.max(0, Math.floor((now.getTime() - bStart) / 1000));
      b.durationSeconds = diffSec;
      b.formattedDuration = formatSecToText(diffSec);
    }

    attendance.status = 'ON_DUTY';
    attendance.calculateAttendanceDurations(now);
    await attendance.save();

    res.json({
      ok: true,
      message: 'Work resumed successfully. Working timer active.',
      attendance,
    });
  } catch (err) {
    console.error('[Attendance Break Resume Error]:', err);
    res.status(500).json({ ok: false, message: err.message || 'Failed to resume work' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. POST /api/attendance/stop — Employee Clock-out / Stop Leave
// ─────────────────────────────────────────────────────────────────────────────
router.post('/stop', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Find the active session for this employee
    let attendance = await Attendance.findOne({
      employeeId: userId,
      status: { $in: ['ON_DUTY', 'ON_BREAK'] },
    }).sort({ startTime: -1 });

    if (!attendance) {
      const latestToday = await Attendance.findOne({ employeeId: userId }).sort({ createdAt: -1 });
      if (latestToday && latestToday.status === 'COMPLETED') {
        return res.json({
          ok: true,
          message: 'Attendance is already completed',
          attendance: latestToday,
        });
      }
      return res.status(400).json({ ok: false, message: 'No active attendance session found to stop' });
    }

    // If employee was currently on break when stopping, automatically close the active break
    if (attendance.status === 'ON_BREAK' && Array.isArray(attendance.breaks)) {
      attendance.breaks.forEach((b) => {
        if (b.status === 'ACTIVE') {
          b.endTime = now;
          b.status = 'COMPLETED';
          const bStart = new Date(b.startTime).getTime();
          const diffSec = Math.max(0, Math.floor((now.getTime() - bStart) / 1000));
          b.durationSeconds = diffSec;
          b.formattedDuration = formatSecToText(diffSec);
        }
      });
    }

    const lat = Number(req.body.latitude);
    const lng = Number(req.body.longitude);
    const accuracy = Number(req.body.accuracy) || 0;

    let addressInfo = {
      road: attendance.latestLocation?.road || '',
      area: attendance.latestLocation?.area || '',
      city: attendance.latestLocation?.city || 'Vijayawada',
      formattedAddress: attendance.latestLocation?.formattedAddress || '',
    };

    const hasValidGps = !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0);
    if (hasValidGps) {
      try {
        addressInfo = await reverseGeocode(lat, lng);
      } catch (geoErr) {
        console.warn('[Attendance Stop Geocode Error]:', geoErr.message);
      }
    }

    const finalLat = hasValidGps ? lat : attendance.latestLocation?.latitude;
    const finalLng = hasValidGps ? lng : attendance.latestLocation?.longitude;

    const endLocationData = {
      latitude: finalLat,
      longitude: finalLng,
      accuracy: hasValidGps ? accuracy : (attendance.latestLocation?.accuracy || 0),
      speed: 0,
      heading: attendance.latestLocation?.heading || 0,
      road: addressInfo.road || attendance.latestLocation?.road || '',
      area: addressInfo.area || attendance.latestLocation?.area || '',
      city: addressInfo.city || attendance.latestLocation?.city || 'Vijayawada',
      formattedAddress: addressInfo.formattedAddress || attendance.latestLocation?.formattedAddress || '',
      timestamp: now,
    };

    attendance.endTime = now;
    attendance.endLocation = endLocationData;
    attendance.latestLocation = endLocationData;
    attendance.status = 'COMPLETED';
    attendance.calculateAttendanceDurations(now);
    await attendance.save();

    // Stop Live GPS Tracking via Socket & In-memory cache
    try {
      await handleStopTracking(req.user);
    } catch (sErr) {
      console.warn('[Attendance Stop Live Tracking Socket]:', sErr.message);
    }

    res.json({
      ok: true,
      message: 'Attendance completed successfully. Total working hours recorded.',
      attendance,
    });
  } catch (err) {
    console.error('[Attendance Stop Error]:', err);
    res.status(500).json({ ok: false, message: err.message || 'Failed to stop attendance' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET /api/attendance/current — Get current employee's active status & timers
// ─────────────────────────────────────────────────────────────────────────────
router.get('/current', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { dateStr } = getLocalDateAndDay();
    const now = new Date();

    // Check for active ON_DUTY or ON_BREAK session first
    const activeSession = await Attendance.findOne({
      employeeId: userId,
      status: { $in: ['ON_DUTY', 'ON_BREAK'] },
    }).sort({ startTime: -1 });

    if (activeSession) {
      activeSession.calculateAttendanceDurations(now);
      return res.json({
        ok: true,
        active: true,
        status: activeSession.status,
        attendance: activeSession,
      });
    }

    // Check if employee completed an attendance session today
    const completedToday = await Attendance.findOne({
      employeeId: userId,
      date: dateStr,
    }).sort({ startTime: -1 });

    res.json({
      ok: true,
      active: false,
      status: completedToday ? completedToday.status : 'NOT_STARTED',
      attendance: completedToday || null,
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. GET /api/attendance/summary — Admin / Staff Summary Metrics for Date
// ─────────────────────────────────────────────────────────────────────────────
router.get('/summary', protect, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || getLocalDateAndDay().dateStr;
    const now = new Date();

    const userDesig = String(req.user?.designation || '').trim().toUpperCase();
    const isMD = userDesig === 'MANAGING DIRECTOR' || userDesig === 'MD' || userDesig === 'CEO';

    // Staff view: only return personal day metrics for Developer, Trainer, Digital Marketing
    if (!isMD) {
      const userRecord = await Attendance.findOne({ employeeId: req.user._id, date: targetDate });
      if (userRecord) userRecord.calculateAttendanceDurations(now);

      return res.json({
        ok: true,
        date: targetDate,
        summary: {
          totalEmployees: 1,
          presentToday: userRecord ? 1 : 0,
          currentlyOnDuty: userRecord?.status === 'ON_DUTY' ? 1 : 0,
          currentlyOnBreak: userRecord?.status === 'ON_BREAK' ? 1 : 0,
          completedAttendance: userRecord?.status === 'COMPLETED' ? 1 : 0,
          totalBreakTimeToday: userRecord?.formattedBreakDuration || '00h 00m',
          incompleteAttendance: 0,
        },
      });
    }

    // Managing Director View: Total active employees in the system
    const totalEmployees = await User.countDocuments({ isActive: true });

    // Attendance sessions for the selected date
    const records = await Attendance.find({ date: targetDate });

    // Distinct employees who clocked in today / targetDate
    const presentEmployeeIds = new Set(records.map((r) => r.employeeId.toString()));
    const presentToday = presentEmployeeIds.size;

    // Currently On Duty & On Break
    const currentlyOnDuty = await Attendance.countDocuments({ status: 'ON_DUTY' });
    const currentlyOnBreak = await Attendance.countDocuments({ status: 'ON_BREAK' });

    // Completed on target date
    const completedAttendance = records.filter((r) => r.status === 'COMPLETED').length;

    // Total break duration across all records for the day
    let totalBreakSecsToday = 0;
    records.forEach((r) => {
      r.calculateAttendanceDurations(now);
      totalBreakSecsToday += r.totalBreakSeconds || 0;
    });

    const totalBreakTimeToday = formatSecToText(totalBreakSecsToday);

    // Incomplete attendance (open sessions from previous dates)
    const incompleteAttendance = await Attendance.countDocuments({
      $or: [
        { status: 'INCOMPLETE' },
        { status: { $in: ['ON_DUTY', 'ON_BREAK'] }, date: { $ne: getLocalDateAndDay().dateStr } },
      ],
    });

    res.json({
      ok: true,
      date: targetDate,
      summary: {
        totalEmployees,
        presentToday,
        currentlyOnDuty,
        currentlyOnBreak,
        completedAttendance,
        totalBreakTimeToday,
        incompleteAttendance,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. GET /api/attendance/records — Table of Employee Records for Date
// ─────────────────────────────────────────────────────────────────────────────
router.get('/records', protect, async (req, res) => {
  try {
    const { date, fromDate, toDate, status, search } = req.query;
    const { dateStr: todayStr, dayStr: todayDay } = getLocalDateAndDay();
    const now = new Date();

    const userDesig = String(req.user?.designation || '').trim().toUpperCase();
    const isMD = userDesig === 'MANAGING DIRECTOR' || userDesig === 'MD' || userDesig === 'CEO';

    let query = {};
    let isRange = false;
    let selectedDate = date || todayStr;
    let selectedDay = todayDay;

    // Strict Scope: Only Managing Director can view all users. Developers, Trainers, Digital Marketing view only own.
    if (!isMD) {
      query.employeeId = req.user._id;
    }

    if (fromDate && toDate) {
      isRange = true;
      query.date = { $gte: fromDate, $lte: toDate };
    } else if (date) {
      query.date = date;
      const parsedD = new Date(date + 'T00:00:00Z');
      if (!isNaN(parsedD.getTime())) {
        selectedDay = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long' }).format(parsedD);
      }
    } else {
      query.date = todayStr;
    }

    if (status && status !== 'ALL' && status !== 'NOT_STARTED') {
      query.status = status;
    }

    // Fetch active employees (All users for Managing Director, only self for staff)
    const allUsers = await User.find(isMD ? { isActive: true } : { _id: req.user._id })
      .select('name email role avatar phone employeeId createdAt')
      .sort({ name: 1 })
      .lean();

    // Fetch actual attendance records matching query
    const attendanceList = await Attendance.find(query)
      .sort({ date: -1, startTime: -1 });

    // Build combined table rows
    let tableRows = [];

    if (!isRange) {
      // Single Date View
      const attendedUserIds = new Set();

      attendanceList.forEach((att) => {
        attendedUserIds.add(att.employeeId.toString());
        const userObj = allUsers.find((u) => u._id.toString() === att.employeeId.toString());

        // Live calculate durations
        att.calculateAttendanceDurations(now);

        const liveLoc = liveLocations.get(att.employeeId.toString());
        const latestLocation = (att.status === 'ON_DUTY' || att.status === 'ON_BREAK') && liveLoc ? {
          latitude: liveLoc.latitude,
          longitude: liveLoc.longitude,
          accuracy: liveLoc.accuracy,
          speed: liveLoc.speed,
          road: liveLoc.road || att.latestLocation?.road || '',
          area: liveLoc.area || att.latestLocation?.area || '',
          city: liveLoc.city || att.latestLocation?.city || 'Vijayawada',
          formattedAddress: liveLoc.formattedAddress || att.latestLocation?.formattedAddress || '',
          timestamp: liveLoc.lastUpdated || att.lastLocationUpdate,
        } : att.latestLocation;

        tableRows.push({
          _id: att._id.toString(),
          attendanceId: att._id.toString(),
          employeeId: att.employeeId.toString(),
          employeeName: att.employeeName || userObj?.name || 'Employee',
          employeeCode: att.employeeCode || (userObj ? getEmployeeCode(userObj) : 'EMP-001'),
          avatar: userObj?.avatar || '',
          email: userObj?.email || '',
          role: userObj?.role || 'employee',
          phone: userObj?.phone || '',
          date: att.date,
          day: att.day,
          startTime: att.startTime,
          endTime: att.endTime,
          startTimeFormatted: formatTime12h(att.startTime),
          endTimeFormatted: formatTime12h(att.endTime),
          durationSeconds: att.durationSeconds,
          durationFormatted: att.formattedDuration || '0m',
          breakCount: att.breakCount || (att.breaks?.length || 0),
          totalBreakSeconds: att.totalBreakSeconds || 0,
          formattedBreakDuration: att.formattedBreakDuration || '0m',
          actualWorkSeconds: att.actualWorkSeconds || 0,
          formattedActualWork: att.formattedActualWork || '0m',
          breaks: att.breaks || [],
          startLocation: att.startLocation,
          latestLocation,
          endLocation: att.endLocation,
          lastLocationUpdate: att.lastLocationUpdate,
          status: att.status,
          isNotStarted: false,
        });
      });

      // Add employees who haven't started if filter allows
      if (!status || status === 'ALL' || status === 'NOT_STARTED') {
        allUsers.forEach((user, idx) => {
          if (!attendedUserIds.has(user._id.toString())) {
            tableRows.push({
              _id: `not_started_${user._id}`,
              attendanceId: null,
              employeeId: user._id.toString(),
              employeeName: user.name,
              employeeCode: getEmployeeCode(user, idx),
              avatar: user.avatar || '',
              email: user.email || '',
              role: user.role || 'employee',
              phone: user.phone || '',
              date: selectedDate,
              day: selectedDay,
              startTime: null,
              endTime: null,
              startTimeFormatted: '—',
              endTimeFormatted: '—',
              durationSeconds: 0,
              durationFormatted: '—',
              breakCount: 0,
              totalBreakSeconds: 0,
              formattedBreakDuration: '—',
              actualWorkSeconds: 0,
              formattedActualWork: '—',
              breaks: [],
              startLocation: null,
              latestLocation: null,
              endLocation: null,
              lastLocationUpdate: null,
              status: 'NOT_STARTED',
              isNotStarted: true,
            });
          }
        });
      }
    } else {
      // Date Range View
      tableRows = attendanceList.map((att) => {
        att.calculateAttendanceDurations(now);
        const userObj = allUsers.find((u) => u._id.toString() === att.employeeId.toString());
        return {
          _id: att._id.toString(),
          attendanceId: att._id.toString(),
          employeeId: att.employeeId.toString(),
          employeeName: att.employeeName || userObj?.name || 'Employee',
          employeeCode: att.employeeCode || (userObj ? getEmployeeCode(userObj) : 'EMP-001'),
          avatar: userObj?.avatar || '',
          email: userObj?.email || '',
          role: userObj?.role || 'employee',
          phone: userObj?.phone || '',
          date: att.date,
          day: att.day,
          startTime: att.startTime,
          endTime: att.endTime,
          startTimeFormatted: formatTime12h(att.startTime),
          endTimeFormatted: formatTime12h(att.endTime),
          durationSeconds: att.durationSeconds,
          durationFormatted: att.formattedDuration || '0m',
          breakCount: att.breakCount || (att.breaks?.length || 0),
          totalBreakSeconds: att.totalBreakSeconds || 0,
          formattedBreakDuration: att.formattedBreakDuration || '0m',
          actualWorkSeconds: att.actualWorkSeconds || 0,
          formattedActualWork: att.formattedActualWork || '0m',
          breaks: att.breaks || [],
          startLocation: att.startLocation,
          latestLocation: att.latestLocation,
          endLocation: att.endLocation,
          lastLocationUpdate: att.lastLocationUpdate,
          status: att.status,
          isNotStarted: false,
        };
      });
    }

    // Apply Filter by status
    if (status === 'NOT_STARTED') {
      tableRows = tableRows.filter((r) => r.status === 'NOT_STARTED');
    } else if (status && status !== 'ALL') {
      tableRows = tableRows.filter((r) => r.status === status);
    }

    // Apply Search Filter
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      tableRows = tableRows.filter((r) => {
        const nameMatch = (r.employeeName || '').toLowerCase().includes(q);
        const codeMatch = (r.employeeCode || '').toLowerCase().includes(q);
        const emailMatch = (r.email || '').toLowerCase().includes(q);
        const roadMatch = (r.latestLocation?.road || r.startLocation?.road || '').toLowerCase().includes(q);
        const areaMatch = (r.latestLocation?.area || r.startLocation?.area || '').toLowerCase().includes(q);
        return nameMatch || codeMatch || emailMatch || roadMatch || areaMatch;
      });
    }

    res.json({
      ok: true,
      date: selectedDate,
      day: selectedDay,
      totalRecords: tableRows.length,
      records: tableRows,
    });
  } catch (err) {
    console.error('[Attendance Records Fetch Error]:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. GET /api/attendance/employee/:employeeId/history — Full Employee History
// ─────────────────────────────────────────────────────────────────────────────
router.get('/employee/:employeeId/history', protect, async (req, res) => {
  try {
    const userDesig = String(req.user?.designation || '').trim().toUpperCase();
    const isMD = userDesig === 'MANAGING DIRECTOR' || userDesig === 'MD' || userDesig === 'CEO';
    const targetEmployeeId = isMD ? req.params.employeeId : req.user._id;
    const { limit = 100 } = req.query;
    const now = new Date();

    const user = await User.findById(targetEmployeeId).select('name email role avatar phone employeeId');
    if (!user) {
      return res.status(404).json({ ok: false, message: 'Employee not found' });
    }

    const records = await Attendance.find({ employeeId: targetEmployeeId })
      .sort({ date: -1, startTime: -1 })
      .limit(Number(limit));

    const formattedRecords = records.map((r) => {
      r.calculateAttendanceDurations(now);
      return {
        ...r.toObject(),
        startTimeFormatted: formatTime12h(r.startTime),
        endTimeFormatted: formatTime12h(r.endTime),
      };
    });

    // Calculate total stats for this employee
    const totalDays = formattedRecords.length;
    const completedDays = formattedRecords.filter((r) => r.status === 'COMPLETED').length;
    const totalWorkSeconds = formattedRecords.reduce((sum, r) => sum + (r.actualWorkSeconds || 0), 0);
    const totalBreakSeconds = formattedRecords.reduce((sum, r) => sum + (r.totalBreakSeconds || 0), 0);
    const totalHours = (totalWorkSeconds / 3600).toFixed(1);
    const totalBreakHours = (totalBreakSeconds / 3600).toFixed(1);

    res.json({
      ok: true,
      employee: {
        _id: user._id,
        name: user.name,
        email: user.email,
        employeeCode: getEmployeeCode(user),
        avatar: user.avatar || '',
        phone: user.phone || '',
      },
      stats: {
        totalDays,
        completedDays,
        totalHours: `${totalHours} hrs`,
        totalBreakHours: `${totalBreakHours} hrs`,
      },
      records: formattedRecords,
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. GET /api/attendance/export — Export Attendance & Breaks to CSV
// ─────────────────────────────────────────────────────────────────────────────
router.get('/export', protect, async (req, res) => {
  try {
    const { date, fromDate, toDate, status, search } = req.query;
    const { dateStr: todayStr } = getLocalDateAndDay();
    const queryDate = date || todayStr;
    const now = new Date();

    const userDesig = String(req.user?.designation || '').trim().toUpperCase();
    const isMD = userDesig === 'MANAGING DIRECTOR' || userDesig === 'MD' || userDesig === 'CEO';

    let query = {};
    if (!isMD) {
      query.employeeId = req.user._id;
    }
    if (fromDate && toDate) {
      query.date = { $gte: fromDate, $lte: toDate };
    } else if (date) {
      query.date = date;
    } else {
      query.date = todayStr;
    }

    if (status && status !== 'ALL' && status !== 'NOT_STARTED') {
      query.status = status;
    }

    const allUsers = await User.find(isMD ? { isActive: true } : { _id: req.user._id }).lean();
    const attendanceList = await Attendance.find(query).sort({ date: -1, startTime: -1 });

    let rows = [];
    const attendedIds = new Set();

    attendanceList.forEach((att) => {
      attendedIds.add(att.employeeId.toString());
      att.calculateAttendanceDurations(now);
      const u = allUsers.find((x) => x._id.toString() === att.employeeId.toString());
      rows.push({
        name: att.employeeName || u?.name || 'Employee',
        code: att.employeeCode || (u ? getEmployeeCode(u) : 'EMP-001'),
        date: att.date,
        day: att.day,
        startTime: formatTime12h(att.startTime),
        endTime: formatTime12h(att.endTime),
        totalAttendance: att.formattedDuration || '—',
        breakCount: att.breakCount || 0,
        totalBreakTime: att.formattedBreakDuration || '0m',
        actualWork: att.formattedActualWork || '0m',
        startLocation: att.startLocation?.road ? `${att.startLocation.road}, ${att.startLocation.city}` : (att.startLocation?.latitude ? `${att.startLocation.latitude.toFixed(4)}, ${att.startLocation.longitude.toFixed(4)}` : '—'),
        latestLocation: att.latestLocation?.road ? `${att.latestLocation.road}, ${att.latestLocation.city}` : (att.latestLocation?.latitude ? `${att.latestLocation.latitude.toFixed(4)}, ${att.latestLocation.longitude.toFixed(4)}` : '—'),
        status: att.status,
      });
    });

    if (!fromDate && (!status || status === 'ALL' || status === 'NOT_STARTED')) {
      allUsers.forEach((u, idx) => {
        if (!attendedIds.has(u._id.toString())) {
          rows.push({
            name: u.name,
            code: getEmployeeCode(u, idx),
            date: queryDate,
            day: getLocalDateAndDay().dayStr,
            startTime: '—',
            endTime: '—',
            totalAttendance: '—',
            breakCount: 0,
            totalBreakTime: '—',
            actualWork: '—',
            startLocation: '—',
            latestLocation: '—',
            status: 'NOT_STARTED',
          });
        }
      });
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
    }

    // CSV building
    const headers = [
      'Employee Name',
      'Employee ID',
      'Attendance Date',
      'Day',
      'Start Time',
      'End Time',
      'Total Attendance',
      'Break Count',
      'Total Break Time',
      'Actual Working Hours',
      'Start Location',
      'Latest / End Location',
      'Attendance Status',
    ];

    const escapeCsv = (val) => {
      const s = String(val == null ? '' : val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvLines = [headers.map(escapeCsv).join(',')];
    rows.forEach((r) => {
      csvLines.push([
        escapeCsv(r.name),
        escapeCsv(r.code),
        escapeCsv(r.date),
        escapeCsv(r.day),
        escapeCsv(r.startTime),
        escapeCsv(r.endTime),
        escapeCsv(r.totalAttendance),
        escapeCsv(r.breakCount),
        escapeCsv(r.totalBreakTime),
        escapeCsv(r.actualWork),
        escapeCsv(r.startLocation),
        escapeCsv(r.latestLocation),
        escapeCsv(r.status),
      ].join(','));
    });

    const csvContent = csvLines.join('\r\n');
    const filename = `AOTMS_Attendance_${queryDate}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
