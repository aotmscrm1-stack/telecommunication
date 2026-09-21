const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ALLOWED_STAFF_DESIGNATIONS = [
  'CEO', 'HR', 'DEVELOPER', 'TRAINER', 'TRAINERS', 'DIGITAL MARKETING', 'DEGITAL MARKETING'
];

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Not authorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });

    // Rule 2: HR designation has Delete Options Not Showing / Disabled
    if (req.method === 'DELETE' && String(req.user.designation || '').trim().toUpperCase() === 'HR') {
      return res.status(403).json({ message: 'Delete operation is disabled for HR designation' });
    }

    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalid' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  const userRole = req.user?.role;
  const userDesig = String(req.user?.designation || '').trim().toUpperCase();

  // Rule 1: CEO has full unrestricted access
  if (userDesig === 'CEO') {
    return next();
  }

  // Rule 2: HR has full access to all modules and actions except delete
  if (userDesig === 'HR') {
    if (req.method === 'DELETE') {
      return res.status(403).json({ message: 'Delete operation is disabled for HR designation' });
    }
    return next();
  }

  // Rules 3, 4, 5: Developer, Trainer, Digital Marketing enabled for Attendance, Tracking, Email, and Tasks
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

