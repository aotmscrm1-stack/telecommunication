const { parse } = require('basic-auth');
const jwt = require('jsonwebtoken');
const User = require('../../database/models/User');
const env = require('../../config/env');

const ALLOWED_STAFF_DESIGNATIONS = [
  'MANAGING DIRECTOR', 'MD', 'CTO', 'CEO', 'HR', 'DEVELOPER', 'TRAINER', 'TRAINERS', 'DIGITAL MARKETING', 'DEGITAL MARKETING'
];

const protect = async (req, res, next) => {
  try {
    let user = null;

    // 1. Basic Auth using basic-auth package
    const credentials = parse(req.headers.authorization);
    if (credentials && credentials.name && credentials.pass) {
      const foundUser = await User.findOne({
        $or: [
          { email: credentials.name.toLowerCase() },
          { name: credentials.name }
        ]
      });

      if (foundUser) {
        const isMatch = await foundUser.matchPassword(credentials.pass);
        if (isMatch) {
          user = foundUser;
        }
      }
    }

    // 2. Bearer JWT Auth fallback
    if (!user && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        user = await User.findById(decoded.id).select('-password');
      }
    }

    if (!user) {
      res.setHeader('WWW-Authenticate', 'Basic realm="AOTMS CRM API"');
      return res.status(401).json({ message: 'Access denied. Invalid or missing credentials.' });
    }

    // HR designation restriction
    if (req.method === 'DELETE' && String(user.designation || '').trim().toUpperCase() === 'HR') {
      return res.status(403).json({ message: 'Delete operation is disabled for HR designation' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.setHeader('WWW-Authenticate', 'Basic realm="AOTMS CRM API"');
    return res.status(401).json({ message: 'Authentication failed: ' + err.message });
  }
};

const authorize = (...roles) => (req, res, next) => {
  const userRole = req.user?.role;
  const userDesig = String(req.user?.designation || '').trim().toUpperCase();

  // Rule 1: Managing Director, CTO, CEO have full unrestricted access
  const isExecutive = userDesig === 'MANAGING DIRECTOR' || userDesig === 'MD' || userDesig === 'CTO' || userDesig === 'CEO';
  if (isExecutive) {
    return next();
  }

  // Rule 2: HR has full access to all modules and actions except delete
  if (userDesig === 'HR') {
    if (req.method === 'DELETE') {
      return res.status(403).json({ message: 'Delete operation is disabled for HR designation' });
    }
    return next();
  }

  // Staff designations allowed for attendance, tracking, email, and tasks
  if (ALLOWED_STAFF_DESIGNATIONS.includes(userDesig)) {
    const isAttendanceOrTracking = req.baseUrl.includes('/attendance') || req.baseUrl.includes('/tracking');
    const isEmailOrTasks = req.baseUrl.includes('/email') || req.baseUrl.includes('/tasks') || req.baseUrl.includes('/followups');
    if (isAttendanceOrTracking || isEmailOrTasks) {
      return next();
    }
  }

  if (!roles.includes(userRole)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

module.exports = { protect, authorize };
