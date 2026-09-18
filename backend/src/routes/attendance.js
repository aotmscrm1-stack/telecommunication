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

// ─────────────────────────────────────────────────────────────────────────────
// 1. POST /api/attendance/start — Employee Clock-in & Start Live Location
// ─────────────────────────────────────────────────────────────────────────────
router.post('/start', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { dateStr, dayStr } = getLocalDateAndDay();
    const now = new Date();

    // Check if employee already has an active ON_DUTY attendance session
    let existingActive = await Attendance.findOne({
      employeeId: userId,
      status: 'ON_DUTY',
    }).sort({ startTime: -1 });

    if (existingActive) {
      // If already on duty, ensure live tracking is running and return existing session
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
      formattedDuration: 'Active',
      status: 'ON_DUTY',
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
      message: 'Attendance started successfully. You are now On Duty.',
      attendance: attendanceRecord,
    });
  } catch (err) {
    console.error('[Attendance Start Error]:', err);
    res.status(500).json({ ok: false, message: err.message || 'Failed to start attendance' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. POST /api/attendance/stop — Employee Clock-out / Stop Leave
// ─────────────────────────────────────────────────────────────────────────────
router.post('/stop', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Find the active session for this employee
    let attendance = await Attendance.findOne({
      employeeId: userId,
      status: 'ON_DUTY',
    }).sort({ startTime: -1 });

    if (!attendance) {
      // Check if there is a recent session for today already completed
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
    attendance.calculateFormattedDuration();
    await attendance.save();

    // Stop Live GPS Tracking via Socket & In-memory cache
    try {
      await handleStopTracking(req.user);
    } catch (sErr) {
      console.warn('[Attendance Stop Live Tracking Socket]:', sErr.message);
    }

    res.json({
      ok: true,
      message: 'Attendance marked as Completed. Location sharing stopped.',
      attendance,
    });
  } catch (err) {
    console.error('[Attendance Stop Error]:', err);
    res.status(500).json({ ok: false, message: err.message || 'Failed to stop attendance' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET /api/attendance/current — Get current employee's active status
// ─────────────────────────────────────────────────────────────────────────────
router.get('/current', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { dateStr } = getLocalDateAndDay();

    // Check for active ON_DUTY session first
    const activeSession = await Attendance.findOne({
      employeeId: userId,
      status: 'ON_DUTY',
    }).sort({ startTime: -1 });

    if (activeSession) {
      return res.json({
        ok: true,
        active: true,
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
      attendance: completedToday || null,
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET /api/attendance/summary — Admin Summary Metrics for Date
// ─────────────────────────────────────────────────────────────────────────────
router.get('/summary', protect, authorize('admin'), async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || getLocalDateAndDay().dateStr;

    // Total active employees in the system
    const totalEmployees = await User.countDocuments({ isActive: true });

    // Attendance sessions for the selected date
    const records = await Attendance.find({ date: targetDate }).lean();

    // Distinct employees who clocked in today / targetDate
    const presentEmployeeIds = new Set(records.map((r) => r.employeeId.toString()));
    const presentToday = presentEmployeeIds.size;

    // Currently On Duty (active right now)
    const currentlyOnDuty = await Attendance.countDocuments({ status: 'ON_DUTY' });

    // Completed today
    const completedAttendance = records.filter((r) => r.status === 'COMPLETED').length;

    // Incomplete attendance (either status INCOMPLETE or ON_DUTY from previous dates)
    const incompleteAttendance = await Attendance.countDocuments({
      $or: [
        { status: 'INCOMPLETE' },
        { status: 'ON_DUTY', date: { $ne: getLocalDateAndDay().dateStr } },
      ],
    });

    res.json({
      ok: true,
      date: targetDate,
      summary: {
        totalEmployees,
        presentToday,
        currentlyOnDuty,
        completedAttendance,
        incompleteAttendance,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET /api/attendance/records — Admin Table of Employee Records for Date
// ─────────────────────────────────────────────────────────────────────────────
router.get('/records', protect, authorize('admin'), async (req, res) => {
  try {
    const { date, fromDate, toDate, status, search } = req.query;
    const { dateStr: todayStr, dayStr: todayDay } = getLocalDateAndDay();

    let query = {};
    let isRange = false;
    let selectedDate = date || todayStr;
    let selectedDay = todayDay;

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

    // Fetch all active employees
    const allUsers = await User.find({ isActive: true })
      .select('name email role avatar phone employeeId createdAt')
      .sort({ name: 1 })
      .lean();

    // Fetch actual attendance records matching query
    const attendanceList = await Attendance.find(query)
      .sort({ date: -1, startTime: -1 })
      .lean();

    // Build combined table rows
    let tableRows = [];

    if (!isRange) {
      // Single Date View: Merge active employees who haven't started attendance as 'NOT_STARTED'
      const attendedUserIds = new Set();

      attendanceList.forEach((att) => {
        attendedUserIds.add(att.employeeId.toString());
        const userObj = allUsers.find((u) => u._id.toString() === att.employeeId.toString());

        // Check live telemetry for active status if available
        const liveLoc = liveLocations.get(att.employeeId.toString());
        const latestLocation = att.status === 'ON_DUTY' && liveLoc ? {
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
          durationFormatted: att.status === 'ON_DUTY' ? 'Active' : (att.formattedDuration || '—'),
          startLocation: att.startLocation,
          latestLocation,
          endLocation: att.endLocation,
          lastLocationUpdate: att.lastLocationUpdate,
          status: att.status,
          isNotStarted: false,
        });
      });

      // Add employees who haven't started if status allows it
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
          durationFormatted: att.status === 'ON_DUTY' ? 'Active' : (att.formattedDuration || '—'),
          startLocation: att.startLocation,
          latestLocation: att.latestLocation,
          endLocation: att.endLocation,
          lastLocationUpdate: att.lastLocationUpdate,
          status: att.status,
          isNotStarted: false,
        };
      });
    }

    // Apply Filter by status if NOT_STARTED was specifically selected
    if (status === 'NOT_STARTED') {
      tableRows = tableRows.filter((r) => r.status === 'NOT_STARTED');
    } else if (status && status !== 'ALL') {
      tableRows = tableRows.filter((r) => r.status === status);
    }

    // Apply Search Filter (by Name, Employee ID/Code, Road, or City)
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
// 6. GET /api/attendance/employee/:employeeId/history — Full Employee History
// ─────────────────────────────────────────────────────────────────────────────
router.get('/employee/:employeeId/history', protect, authorize('admin'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { limit = 100 } = req.query;

    const user = await User.findById(employeeId).select('name email role avatar phone employeeId');
    if (!user) {
      return res.status(404).json({ ok: false, message: 'Employee not found' });
    }

    const records = await Attendance.find({ employeeId })
      .sort({ date: -1, startTime: -1 })
      .limit(Number(limit))
      .lean();

    const formattedRecords = records.map((r) => ({
      ...r,
      startTimeFormatted: formatTime12h(r.startTime),
      endTimeFormatted: formatTime12h(r.endTime),
    }));

    // Calculate total stats for this employee
    const totalDays = formattedRecords.length;
    const completedDays = formattedRecords.filter((r) => r.status === 'COMPLETED').length;
    const totalSeconds = formattedRecords.reduce((sum, r) => sum + (r.durationSeconds || 0), 0);
    const totalHours = (totalSeconds / 3600).toFixed(1);

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
      },
      records: formattedRecords,
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. GET /api/attendance/export — Export Attendance Records to CSV
// ─────────────────────────────────────────────────────────────────────────────
router.get('/export', protect, authorize('admin'), async (req, res) => {
  try {
    const { date, fromDate, toDate, status, search } = req.query;
    const { dateStr: todayStr } = getLocalDateAndDay();
    const queryDate = date || todayStr;

    let query = {};
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

    const allUsers = await User.find({ isActive: true }).lean();
    const attendanceList = await Attendance.find(query).sort({ date: -1, startTime: -1 }).lean();

    let rows = [];
    const attendedIds = new Set();

    attendanceList.forEach((att) => {
      attendedIds.add(att.employeeId.toString());
      const u = allUsers.find((x) => x._id.toString() === att.employeeId.toString());
      rows.push({
        name: att.employeeName || u?.name || 'Employee',
        code: att.employeeCode || (u ? getEmployeeCode(u) : 'EMP-001'),
        date: att.date,
        day: att.day,
        startTime: formatTime12h(att.startTime),
        endTime: formatTime12h(att.endTime),
        duration: att.status === 'ON_DUTY' ? 'Active' : (att.formattedDuration || '—'),
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
            duration: '—',
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
      'Working Duration',
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
        escapeCsv(r.duration),
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
