const express = require('express');
const router = express.Router();
const User = require('../models/User');
const EmployeeLocation = require('../models/EmployeeLocation');
const { protect, authorize } = require('../middleware/auth');
const {
  handleStartTracking,
  handleGpsUpdate,
  handleStopTracking,
  getLiveEmployeesForUser,
  liveLocations,
} = require('../services/trackingSocket');
const { getOfficeConfig } = require('../config/officeConfig');

/**
 * Helper to calculate total distance in kilometers from an array of coordinates
 */
function calculateRouteDistanceKm(points = []) {
  if (!points || points.length < 2) return 0;
  let totalMeters = 0;
  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];
    const R = 6371000;
    const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
    const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.latitude * Math.PI) / 180) *
        Math.cos((p2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalMeters += R * c;
  }
  return Math.round((totalMeters / 1000) * 100) / 100;
}

// ── GET /api/tracking/config (Public Office Geofence & Location Config) ─────────
router.get('/config', (req, res) => {
  try {
    const office = getOfficeConfig();
    res.json({ ok: true, office });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── GET /api/tracking/employees (List all authorized employees + live telemetry) ──
router.get('/employees', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const employees = await getLiveEmployeesForUser(req.user);
    res.json({ ok: true, employees });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── GET /api/tracking/employees/:employeeId/history (Historical route trail) ──────
router.get('/employees/:employeeId/history', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { from, to, limit = 1000 } = req.query;

    const targetUser = await User.findById(employeeId).select('name email role avatar phone');
    if (!targetUser) {
      return res.status(404).json({ ok: false, message: 'Employee not found' });
    }

    // Role-based authorization check: Manager can only view Callers
    if (req.user.role === 'manager' && targetUser.role !== 'caller') {
      return res.status(403).json({ ok: false, message: 'Managers can only view caller location history' });
    }

    const query = { employeeId };

    if (from || to) {
      query.timestamp = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) query.timestamp.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) query.timestamp.$lte = toDate;
      }
    } else {
      // Default: Last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      query.timestamp = { $gte: yesterday };
    }

    const historyPoints = await EmployeeLocation.find(query)
      .sort({ timestamp: 1 })
      .limit(Math.min(2000, Number(limit) || 1000))
      .select('latitude longitude accuracy speed heading trackingStatus road area city formattedAddress timestamp')
      .lean();

    const distanceKm = calculateRouteDistanceKm(historyPoints);

    // Calculate bounds for auto-fit on map
    let bounds = null;
    if (historyPoints.length > 0) {
      const lats = historyPoints.map((p) => p.latitude);
      const lngs = historyPoints.map((p) => p.longitude);
      bounds = {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs),
      };
    }

    res.json({
      ok: true,
      employee: targetUser,
      points: historyPoints,
      totalPoints: historyPoints.length,
      distanceKm,
      bounds,
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── GET /api/tracking/status (Check current user's tracking state) ───────────────
router.get('/status', protect, async (req, res) => {
  try {
    const uId = req.user._id.toString();
    const live = liveLocations.get(uId);
    res.json({
      ok: true,
      active: live ? live.trackingStatus !== 'OFFLINE' : false,
      location: live || null,
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── POST /api/tracking/start (Explicit start location sharing) ───────────────────
router.post('/start', protect, async (req, res) => {
  try {
    const liveData = await handleStartTracking(req.user, req.body);
    res.json({ ok: true, message: 'Location sharing started', location: liveData });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

// ── POST /api/tracking/stop (Explicit stop location sharing) ─────────────────────
router.post('/stop', protect, async (req, res) => {
  try {
    const offlineData = await handleStopTracking(req.user);
    res.json({ ok: true, message: 'Location sharing stopped', location: offlineData });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

// ── POST /api/tracking/ping (REST GPS ping fallback) ────────────────────────────
router.post('/ping', protect, async (req, res) => {
  try {
    // SECURITY: strictly uses req.user
    const updated = await handleGpsUpdate(req.user, req.body);
    res.json({ ok: true, location: updated });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

// ── POST /api/tracking/dev-simulate (Development GPS simulation tool) ────────────
router.post('/dev-simulate', protect, async (req, res) => {
  try {
    const { targetUserId, latitude, longitude, speed = 25, heading = 45 } = req.body;

    // Only Admin can simulate for others; employees can simulate for themselves
    let targetUser = req.user;
    if (targetUserId && req.user.role === 'admin') {
      targetUser = await User.findById(targetUserId);
      if (!targetUser) return res.status(404).json({ message: 'Target user not found' });
    }

    const payload = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      speedKmh: Number(speed),
      heading: Number(heading),
      accuracy: 5,
    };

    const result = await handleGpsUpdate(targetUser, payload);
    res.json({ ok: true, message: 'Simulated GPS packet applied', location: result });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

module.exports = router;
