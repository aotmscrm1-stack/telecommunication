const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EmployeeLocation = require('../models/EmployeeLocation');
const {
  isInsideOfficeGeofence,
  getDistanceToOffice,
  calculateDistanceMeters,
  OFFICE_NAME,
  OFFICE_BUILDING,
  OFFICE_ADDRESS,
  OFFICE_AREA,
  OFFICE_CITY,
} = require('../config/officeConfig');
const { reverseGeocode } = require('./reverseGeocode');

let ioInstance = null;

// In-memory active live location cache for sub-millisecond lookups and real-time broadcasts
// Map<employeeId (string), LiveLocationObject>
const liveLocations = new Map();

// Configuration constants (Configurable via environment variables)
const OFFLINE_TIMEOUT_MS = Number(process.env.LOCATION_OFFLINE_TIMEOUT_MS) || 3 * 60 * 1000; // 3 minutes without update -> OFFLINE
const MIN_DISTANCE_FOR_HISTORY_METERS = Number(process.env.MIN_DISTANCE_FOR_HISTORY_METERS) || 8; // Save history only if moved >= 8m
const MAX_TIME_FOR_HISTORY_MS = Number(process.env.MAX_TIME_FOR_HISTORY_MS) || 30 * 1000; // Or at least once every 30s while active
const SPEED_THRESHOLD_KMH = 1.5; // Below 1.5 km/h is treated as STOPPED
const MAX_REALISTIC_SPEED_KMH = 120; // 120 km/h max for road travel in city

/**
 * Validates GPS latitude and longitude ranges
 */
function isValidCoordinates(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/**
 * Calculates compass heading/bearing in degrees (0 - 360) between two GPS points
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

/**
 * Evaluates movement status considering geofence boundaries, hysteresis, and GPS speed
 */
function determineTrackingState(lat, lng, speedKmh, distanceMovedMeters, deltaSeconds, prevLoc) {
  const now = new Date();
  const wasAtOffice = prevLoc?.trackingStatus === 'AT_OFFICE';
  const insideOffice = isInsideOfficeGeofence(lat, lng, wasAtOffice);
  const distToOffice = getDistanceToOffice(lat, lng);

  // 1. Employee is inside AOTMS Office Geofence (75m radius with 125m exit hysteresis)
  if (insideOffice) {
    return {
      trackingStatus: 'AT_OFFICE',
      speedKmh: 0,
      stoppedAt: null,
      sinceOfficeAt: prevLoc?.sinceOfficeAt || now,
      officeDistanceMeters: distToOffice,
      isInsideOffice: true,
    };
  }

  // 2. Transitional status: Leaving office boundary
  if (wasAtOffice && !insideOffice && distToOffice <= 250) {
    return {
      trackingStatus: 'LEAVING_OFFICE',
      speedKmh: Math.max(speedKmh, 5),
      stoppedAt: null,
      sinceOfficeAt: null,
      officeDistanceMeters: distToOffice,
      isInsideOffice: false,
    };
  }

  // 3. Moving outside office
  if (speedKmh >= SPEED_THRESHOLD_KMH && (distanceMovedMeters >= 2 || deltaSeconds === 0)) {
    return {
      trackingStatus: 'MOVING',
      speedKmh,
      stoppedAt: null,
      sinceOfficeAt: null,
      officeDistanceMeters: distToOffice,
      isInsideOffice: false,
    };
  }

  // 4. Stopped outside office
  return {
    trackingStatus: 'STOPPED',
    speedKmh: 0,
    stoppedAt: prevLoc?.trackingStatus === 'STOPPED' ? (prevLoc.stoppedAt || now) : now,
    sinceOfficeAt: null,
    officeDistanceMeters: distToOffice,
    isInsideOffice: false,
  };
}

/**
 * Initializes the Socket.IO Tracking server attached to the HTTP server
 */
function initTrackingSocketServer(httpServer) {
  if (ioInstance) return ioInstance;

  ioInstance = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // ── Authentication Handshake Middleware ─────────────────────────────────────
  ioInstance.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication failed: Missing token'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name email role phone avatar isActive');

      if (!user || !user.isActive) {
        return next(new Error('Authentication failed: User not found or inactive'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.warn('[TrackingSocket Auth Error]:', err.message);
      next(new Error('Authentication failed: Invalid or expired token'));
    }
  });

  // ── Connection Handler ──────────────────────────────────────────────────────
  ioInstance.on('connection', (socket) => {
    const user = socket.user;
    const userIdStr = user._id.toString();

    // Join personal user room
    socket.join(`user_${userIdStr}`);

    // Join role-specific broadcast rooms
    if (user.role === 'admin') {
      socket.join('super_admin_room');
      socket.join('manager_room');
    } else if (user.role === 'manager') {
      socket.join('manager_room');
    }

    // Send initial live state to employee
    const currentLive = liveLocations.get(userIdStr);
    if (currentLive) {
      socket.emit('employee:tracking:status', {
        active: currentLive.trackingStatus !== 'OFFLINE',
        location: currentLive,
      });
    }

    // ── EVENT: employee:tracking:start ───────────────────────────────────────
    socket.on('employee:tracking:start', async (payload = {}, ackCallback) => {
      try {
        const result = await handleStartTracking(user, payload);
        if (typeof ackCallback === 'function') ackCallback({ success: true, location: result });
      } catch (err) {
        console.error('[Socket start tracking error]:', err.message);
        if (typeof ackCallback === 'function') ackCallback({ success: false, error: err.message });
      }
    });

    // ── EVENT: employee:location:update ──────────────────────────────────────
    socket.on('employee:location:update', async (payload = {}, ackCallback) => {
      try {
        // SECURITY ENFORCEMENT: Strictly use authenticated socket.user
        const result = await handleGpsUpdate(user, payload);
        if (typeof ackCallback === 'function') ackCallback({ success: true, location: result });
      } catch (err) {
        console.error('[Socket location update error]:', err.message);
        if (typeof ackCallback === 'function') ackCallback({ success: false, error: err.message });
      }
    });

    // ── EVENT: employee:tracking:stop ────────────────────────────────────────
    socket.on('employee:tracking:stop', async (payload = {}, ackCallback) => {
      try {
        const result = await handleStopTracking(user);
        if (typeof ackCallback === 'function') ackCallback({ success: true, location: result });
      } catch (err) {
        console.error('[Socket stop tracking error]:', err.message);
        if (typeof ackCallback === 'function') ackCallback({ success: false, error: err.message });
      }
    });

    // ── EVENT: admin:subscribe (Admins requesting latest bulk live state) ─────
    socket.on('admin:subscribe', async (ackCallback) => {
      if (user.role !== 'admin' && user.role !== 'manager') {
        if (typeof ackCallback === 'function') ackCallback({ success: false, error: 'Unauthorized' });
        return;
      }
      const authorizedList = await getLiveEmployeesForUser(user);
      if (typeof ackCallback === 'function') ackCallback({ success: true, employees: authorizedList });
    });

    socket.on('disconnect', () => {
      // If employee disconnects, watchdog marks OFFLINE if no updates arrive
    });
  });

  // ── Watchdog Interval: Detect Offline Employees ─────────────────────────────
  setInterval(async () => {
    const now = Date.now();
    for (const [employeeId, loc] of liveLocations.entries()) {
      if (loc.trackingStatus !== 'OFFLINE' && now - new Date(loc.lastUpdated).getTime() > OFFLINE_TIMEOUT_MS) {
        loc.trackingStatus = 'OFFLINE';
        loc.isLive = false;
        loc.lastUpdated = new Date();

        // Broadcast OFFLINE status to admins
        broadcastToAdmins('admin:employee:status', {
          employeeId,
          trackingStatus: 'OFFLINE',
          lastUpdated: loc.lastUpdated,
          name: loc.name,
        });

        // Update MongoDB isLive flag
        try {
          await EmployeeLocation.updateMany({ employeeId, isLive: true }, { isLive: false });
        } catch (err) {
          console.warn('[Offline Watchdog DB Update Error]:', err.message);
        }
      }
    }
  }, 30000); // Check every 30 seconds

  console.log('📍 Real-time Tracking Socket Server initialized successfully');
  return ioInstance;
}

/**
 * Handle Start Location Sharing
 */
async function handleStartTracking(user, payload = {}) {
  const employeeId = user._id.toString();
  const lat = Number(payload.latitude);
  const lng = Number(payload.longitude);
  const accuracy = Number(payload.accuracy) || 0;
  const speed = Number(payload.speed) || 0;
  const heading = Number(payload.heading) || 0;
  const battery = payload.battery != null ? Number(payload.battery) : null;

  const validGps = isValidCoordinates(lat, lng);
  const now = new Date();

  // Evaluate office geofence & reverse geocoding
  let trackingStatus = 'STOPPED';
  let addressInfo = { road: '', area: '', city: 'Vijayawada', formattedAddress: '' };
  let officeDistanceMeters = null;
  let sinceOfficeAt = null;
  let stoppedAt = now;

  if (validGps) {
    const state = determineTrackingState(lat, lng, speed, 0, 0, null);
    trackingStatus = state.trackingStatus;
    sinceOfficeAt = state.sinceOfficeAt;
    stoppedAt = state.stoppedAt;
    officeDistanceMeters = state.officeDistanceMeters;
    addressInfo = await reverseGeocode(lat, lng);
  }

  const liveData = {
    employeeId,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar || '',
    phone: user.phone || '',
    latitude: validGps ? lat : 0,
    longitude: validGps ? lng : 0,
    accuracy: Math.round(accuracy * 10) / 10,
    speed,
    heading,
    battery,
    trackingStatus,
    road: addressInfo.road,
    area: addressInfo.area,
    city: addressInfo.city,
    formattedAddress: addressInfo.formattedAddress,
    officeDistanceMeters,
    stoppedAt,
    sinceOfficeAt,
    isLive: true,
    breadcrumbs: validGps ? [[lng, lat]] : [],
    lastUpdated: now,
    lastDbWriteTime: validGps ? now : null,
    lastDbLocation: validGps ? { latitude: lat, longitude: lng } : null,
  };

  liveLocations.set(employeeId, liveData);

  if (validGps) {
    // Record start in MongoDB
    try {
      await EmployeeLocation.updateMany({ employeeId, isLive: true }, { isLive: false });
      await EmployeeLocation.create({
        employeeId,
        latitude: lat,
        longitude: lng,
        accuracy,
        speed,
        heading,
        battery,
        trackingStatus,
        road: addressInfo.road,
        area: addressInfo.area,
        city: addressInfo.city,
        formattedAddress: addressInfo.formattedAddress,
        officeDistanceMeters,
        stoppedAt,
        sinceOfficeAt,
        isLive: true,
        timestamp: now,
      });
    } catch (dbErr) {
      console.error('[DB Start Tracking Error]:', dbErr.message);
    }
  }

  // Notify employee socket
  if (ioInstance) {
    ioInstance.to(`user_${employeeId}`).emit('employee:tracking:status', {
      active: true,
      location: liveData,
    });
  }

  // Broadcast to Admins
  broadcastToAdmins('admin:employee:location', liveData);
  broadcastToAdmins('admin:employee:status', {
    employeeId,
    trackingStatus,
    lastUpdated: now,
    name: user.name,
  });

  return liveData;
}

/**
 * Handle GPS Coordinate Update
 */
async function handleGpsUpdate(user, payload = {}) {
  const employeeId = user._id.toString();
  const lat = Number(payload.latitude);
  const lng = Number(payload.longitude);

  if (!isValidCoordinates(lat, lng)) {
    throw new Error('Invalid GPS coordinates');
  }

  const accuracy = Number(payload.accuracy) || 0;
  let rawSpeed = Number(payload.speed); // m/s from browser Geolocation API
  let speedKmh = isNaN(rawSpeed) || rawSpeed < 0 ? 0 : rawSpeed * 3.6; // Convert m/s to km/h
  if (payload.speedKmh != null) speedKmh = Number(payload.speedKmh);

  let heading = Number(payload.heading) || 0;
  const battery = payload.battery != null ? Number(payload.battery) : null;
  const now = new Date();

  const prev = liveLocations.get(employeeId);
  let distanceMoved = 0;
  let deltaSeconds = 0;

  if (prev && isValidCoordinates(prev.latitude, prev.longitude)) {
    distanceMoved = calculateDistanceMeters(prev.latitude, prev.longitude, lat, lng);
    deltaSeconds = Math.max(0.5, (now.getTime() - new Date(prev.lastUpdated).getTime()) / 1000);

    // Filter impossible teleportation / noise jumps
    const calculatedSpeedKmh = (distanceMoved / deltaSeconds) * 3.6;
    if (calculatedSpeedKmh > MAX_REALISTIC_SPEED_KMH && deltaSeconds < 5) {
      console.warn(`[GPS Filtering] Discarded impossible jump of ${Math.round(distanceMoved)}m in ${deltaSeconds}s for ${user.name}`);
      return prev;
    }

    // If browser didn't supply speed, calculate from distance delta
    if (speedKmh === 0 && distanceMoved >= 2 && deltaSeconds > 0) {
      speedKmh = calculatedSpeedKmh;
    }

    // Calculate heading/bearing if browser reported 0 heading while actively moving
    if ((heading === 0 || isNaN(heading)) && distanceMoved >= 2) {
      heading = calculateBearing(prev.latitude, prev.longitude, lat, lng);
    } else if (heading === 0 && prev.heading) {
      heading = prev.heading;
    }
  }

  // Under 1.5 km/h is treated as stationary
  if (speedKmh < SPEED_THRESHOLD_KMH || (distanceMoved < 2 && deltaSeconds < 4)) {
    speedKmh = 0;
  }

  // Determine status (AT_OFFICE, LEAVING_OFFICE, MOVING, STOPPED)
  const state = determineTrackingState(lat, lng, speedKmh, distanceMoved, deltaSeconds, prev);
  const trackingStatus = state.trackingStatus;
  const finalSpeed = state.speedKmh;
  const stoppedAt = state.stoppedAt;
  const sinceOfficeAt = state.sinceOfficeAt;
  const officeDistanceMeters = state.officeDistanceMeters;

  // Reverse geocode road, area, and city
  const addressInfo = await reverseGeocode(lat, lng);

  // Maintain live breadcrumbs array for real-time route polyline rendering
  const existingBreadcrumbs = Array.isArray(prev?.breadcrumbs) ? prev.breadcrumbs : [];
  let updatedBreadcrumbs = existingBreadcrumbs;
  if (distanceMoved >= 3 || existingBreadcrumbs.length === 0) {
    updatedBreadcrumbs = [...existingBreadcrumbs, [lng, lat]];
    // Keep max 500 points in memory
    if (updatedBreadcrumbs.length > 500) {
      updatedBreadcrumbs = updatedBreadcrumbs.slice(-500);
    }
  }

  const updatedLive = {
    employeeId,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar || '',
    phone: user.phone || '',
    latitude: lat,
    longitude: lng,
    accuracy: Math.round(accuracy * 10) / 10,
    isAccuracyPoor: accuracy > 45,
    speed: Math.round(finalSpeed * 10) / 10,
    heading: Math.round(heading),
    battery,
    trackingStatus,
    road: addressInfo.road,
    area: addressInfo.area,
    city: addressInfo.city,
    formattedAddress: addressInfo.formattedAddress,
    officeDistanceMeters,
    stoppedAt,
    sinceOfficeAt,
    breadcrumbs: updatedBreadcrumbs,
    isLive: true,
    lastUpdated: now,
    lastDbWriteTime: prev?.lastDbWriteTime || now,
    lastDbLocation: prev?.lastDbLocation || { latitude: lat, longitude: lng },
  };

  liveLocations.set(employeeId, updatedLive);

  // ── Smart Database Write Optimization ─────────────────────────────────────
  // Write historical breadcrumb to MongoDB only when:
  // 1. Distance moved since last DB write >= MIN_DISTANCE_FOR_HISTORY_METERS (8m), OR
  // 2. Time since last DB write >= MAX_TIME_FOR_HISTORY_MS (30s), OR
  // 3. Status changed (e.g. AT_OFFICE -> LEAVING_OFFICE -> MOVING -> STOPPED)
  const lastDbLat = prev?.lastDbLocation?.latitude;
  const lastDbLng = prev?.lastDbLocation?.longitude;
  const distSinceLastDb = lastDbLat != null ? calculateDistanceMeters(lastDbLat, lastDbLng, lat, lng) : 999;
  const timeSinceLastDb = prev?.lastDbWriteTime ? now.getTime() - new Date(prev.lastDbWriteTime).getTime() : 999999;
  const statusChanged = prev?.trackingStatus !== trackingStatus;

  const shouldWriteDb = distSinceLastDb >= MIN_DISTANCE_FOR_HISTORY_METERS || timeSinceLastDb >= MAX_TIME_FOR_HISTORY_MS || statusChanged;

  if (shouldWriteDb) {
    updatedLive.lastDbWriteTime = now;
    updatedLive.lastDbLocation = { latitude: lat, longitude: lng };
    liveLocations.set(employeeId, updatedLive);

    EmployeeLocation.create({
      employeeId,
      latitude: lat,
      longitude: lng,
      accuracy,
      speed: updatedLive.speed,
      heading,
      battery,
      trackingStatus,
      road: addressInfo.road,
      area: addressInfo.area,
      city: addressInfo.city,
      formattedAddress: addressInfo.formattedAddress,
      officeDistanceMeters,
      stoppedAt,
      sinceOfficeAt,
      isLive: true,
      timestamp: now,
    }).catch((dbErr) => {
      console.warn('[EmployeeLocation Save Error]:', dbErr.message);
    });
  }

  // Real-time broadcast to all authorized Admin/Manager clients (No page refresh needed!)
  broadcastToAdmins('admin:employee:location', updatedLive);

  // Emit acknowledgment to employee
  if (ioInstance) {
    ioInstance.to(`user_${employeeId}`).emit('employee:tracking:status', {
      active: true,
      location: updatedLive,
    });
  }

  return updatedLive;
}

/**
 * Handle Stop Location Sharing
 */
async function handleStopTracking(user) {
  const employeeId = user._id.toString();
  const now = new Date();
  const prev = liveLocations.get(employeeId);

  const offlineData = {
    ...(prev || {}),
    employeeId,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar || '',
    phone: user.phone || '',
    trackingStatus: 'OFFLINE',
    isLive: false,
    speed: 0,
    lastUpdated: now,
  };

  liveLocations.set(employeeId, offlineData);

  try {
    await EmployeeLocation.updateMany({ employeeId, isLive: true }, { isLive: false });
    if (prev && isValidCoordinates(prev.latitude, prev.longitude)) {
      await EmployeeLocation.create({
        employeeId,
        latitude: prev.latitude,
        longitude: prev.longitude,
        accuracy: prev.accuracy || 0,
        speed: 0,
        heading: prev.heading || 0,
        battery: prev.battery,
        trackingStatus: 'OFFLINE',
        road: prev.road || '',
        area: prev.area || '',
        city: prev.city || 'Vijayawada',
        formattedAddress: prev.formattedAddress || '',
        officeDistanceMeters: prev.officeDistanceMeters || null,
        isLive: false,
        timestamp: now,
      });
    }
  } catch (dbErr) {
    console.warn('[DB Stop Tracking Error]:', dbErr.message);
  }

  // Notify employee
  if (ioInstance) {
    ioInstance.to(`user_${employeeId}`).emit('employee:tracking:status', {
      active: false,
      location: offlineData,
    });
  }

  // Broadcast OFFLINE to admins
  broadcastToAdmins('admin:employee:status', {
    employeeId,
    trackingStatus: 'OFFLINE',
    lastUpdated: now,
    name: user.name,
  });

  return offlineData;
}

/**
 * Broadcast event to authorized admin and manager rooms
 */
function broadcastToAdmins(event, payload) {
  if (!ioInstance) return;
  ioInstance.to('super_admin_room').emit(event, payload);
  ioInstance.to('manager_room').emit(event, payload);
}

/**
 * Returns authorized employee list with latest live locations for a given user
 */
async function getLiveEmployeesForUser(requestingUser) {
  let userQuery = {};

  if (requestingUser.role === 'admin') {
    // Super Admin can see ALL employees (callers and managers)
    userQuery = { _id: { $ne: requestingUser._id }, isActive: true };
  } else if (requestingUser.role === 'manager') {
    // Admin (manager) sees all Callers
    userQuery = { role: 'caller', isActive: true };
  } else {
    // Caller cannot see others
    return [];
  }

  const users = await User.find(userQuery).select('name email role phone avatar isActive createdAt').lean();

  const now = Date.now();
  const list = await Promise.all(
    users.map(async (u) => {
      const uId = u._id.toString();
      let live = liveLocations.get(uId);

      if (!live) {
        // Fallback: check latest record from MongoDB
        const latestFromDb = await EmployeeLocation.findOne({ employeeId: u._id }).sort({ timestamp: -1 }).lean();
        if (latestFromDb) {
          const isFresh = now - new Date(latestFromDb.timestamp).getTime() < OFFLINE_TIMEOUT_MS;
          live = {
            employeeId: uId,
            name: u.name,
            email: u.email,
            role: u.role,
            avatar: u.avatar || '',
            phone: u.phone || '',
            latitude: latestFromDb.latitude,
            longitude: latestFromDb.longitude,
            accuracy: latestFromDb.accuracy,
            speed: latestFromDb.speed,
            heading: latestFromDb.heading,
            battery: latestFromDb.battery,
            trackingStatus: isFresh ? latestFromDb.trackingStatus : 'OFFLINE',
            road: latestFromDb.road || '',
            area: latestFromDb.area || '',
            city: latestFromDb.city || '',
            formattedAddress: latestFromDb.formattedAddress || '',
            officeDistanceMeters: latestFromDb.officeDistanceMeters || null,
            stoppedAt: latestFromDb.stoppedAt || null,
            sinceOfficeAt: latestFromDb.sinceOfficeAt || null,
            breadcrumbs: [[latestFromDb.longitude, latestFromDb.latitude]],
            isLive: isFresh && latestFromDb.isLive,
            lastUpdated: latestFromDb.timestamp,
          };
          liveLocations.set(uId, live);
        } else {
          live = {
            employeeId: uId,
            name: u.name,
            email: u.email,
            role: u.role,
            avatar: u.avatar || '',
            phone: u.phone || '',
            latitude: null,
            longitude: null,
            accuracy: 0,
            speed: 0,
            heading: 0,
            battery: null,
            trackingStatus: 'OFFLINE',
            road: '',
            area: '',
            city: '',
            formattedAddress: '',
            officeDistanceMeters: null,
            stoppedAt: null,
            sinceOfficeAt: null,
            breadcrumbs: [],
            isLive: false,
            lastUpdated: null,
          };
        }
      }

      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatar: u.avatar || '',
        phone: u.phone || '',
        location: live,
      };
    })
  );

  return list;
}

module.exports = {
  initTrackingSocketServer,
  handleStartTracking,
  handleGpsUpdate,
  handleStopTracking,
  getLiveEmployeesForUser,
  liveLocations,
  determineTrackingState,
  calculateBearing,
};
