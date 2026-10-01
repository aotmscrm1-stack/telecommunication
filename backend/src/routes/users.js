const express = require('express');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

const isExecutiveOrAdminUser = (user) => {
  if (!user) return false;
  const role = String(user.role || '').trim().toLowerCase();
  if (role === 'admin' || role === 'superadmin') return true;

  const d = String(user.designation || '').trim().toUpperCase();
  const dept = String(user.department || '').trim().toUpperCase();

  return (
    d.includes('MD') ||
    d.includes('MANAGING DIRECTOR') ||
    d.includes('CEO') ||
    d.includes('CTO') ||
    d.includes('HR') ||
    d.includes('EXECUTIVE') ||
    d.includes('DIRECTOR') ||
    d.includes('VICE PRESIDENT') ||
    dept.includes('HR') ||
    dept.includes('ADMIN') ||
    dept.includes('MANAGEMENT')
  );
};

const isManagerUser = (user) => {
  if (!user) return false;
  const role = String(user.role || '').trim().toLowerCase();
  if (role === 'manager') return true;

  const d = String(user.designation || '').trim().toUpperCase();
  return d.includes('MANAGER') || d.includes('HEAD') || d.includes('LEAD') || d.includes('SUPERVISOR');
};

// GET /api/users
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (isExecutiveOrAdminUser(req.user)) {
      // Admin: All departments visible
      query = {};
    } else if (isManagerUser(req.user)) {
      // Manager: Relative department details showing
      if (req.user.department) {
        query = {
          $or: [
            { department: req.user.department },
            { _id: req.user._id }
          ]
        };
      } else {
        query = { _id: req.user._id };
      }
    } else {
      // Employee panel: Only Employee details showing
      if (req.query.purpose === 'assignment') {
        // For task/todo assignment dropdowns, return self and manager/admin list
        query = {};
      } else {
        query = { _id: req.user._id };
      }
    }

    const users = await User.find(query).select('-password').sort({ name: 1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/approvals — List all registrations for admin/manager review
router.get('/approvals', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .populate('approvedBy', 'name email designation')
      .sort({ createdAt: -1 });
    res.json({ ok: true, users });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// PUT /api/users/:id/approval-status — Accept or Reject user registration
router.put('/:id/approval-status', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['accepted', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ ok: false, message: 'Invalid approval status: must be accepted, rejected, or pending' });
    }
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ ok: false, message: 'User not found' });
    if (targetUser.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Cannot modify approval status of administrator accounts' });
    }

    targetUser.approvalStatus = status;
    targetUser.approvedBy = req.user._id;
    targetUser.approvedAt = new Date();
    if (reason !== undefined) targetUser.rejectionReason = reason;

    await targetUser.save();
    res.json({
      ok: true,
      message: `User ${targetUser.name} has been ${status === 'accepted' ? 'accepted' : status === 'rejected' ? 'rejected' : 'marked as pending'}.`,
      user: targetUser.toJSON()
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// POST /api/users
router.post('/', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });
    if (req.user.role === 'manager' && role !== 'employee' && role !== 'caller')
      return res.status(403).json({ message: 'Managers can only create employees' });
    if (role === 'admin')
      return res.status(403).json({ message: 'Cannot create admin users' });
    const user = await User.create({ name, email, password, role: role || 'employee', phone: phone || '' });
    res.status(201).json({ user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/:id — Get user details by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('approvedBy', 'name email designation');
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// GET /api/users/preferences
router.get('/preferences', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('preferences');
    res.json({
      preferences: user?.preferences || {
        email: 'Send to Mobile',
        whatsapp: 'Send to Mobile',
        notifications: {
          paymentPending: true,
          paymentCompleted: true,
          paymentFailed: true,
          newLeadInCampaign: true,
          callReminder: true,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/preferences
router.put('/preferences', protect, async (req, res) => {
  try {
    const defaults = {
      email: 'Send to Mobile',
      whatsapp: 'Send to Mobile',
      notifications: {
        paymentPending: true,
        paymentCompleted: true,
        paymentFailed: true,
        newLeadInCampaign: true,
        callReminder: true,
      },
    };

    const nextPreferences = {
      ...defaults,
      ...(req.body?.preferences || req.body || {}),
      notifications: {
        ...defaults.notifications,
        ...((req.body?.preferences || req.body || {}).notifications || {}),
      },
    };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { preferences: nextPreferences },
      { new: true }
    ).select('preferences');

    res.json({ preferences: user?.preferences || nextPreferences });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ ok: false, message: 'User not found' });
    if (req.user.role === 'manager') {
      if (targetUser.role !== 'employee' && targetUser.role !== 'caller') return res.status(403).json({ ok: false, message: 'Managers can only update employees' });
      if (req.body.role && req.body.role !== 'employee' && req.body.role !== 'caller') return res.status(403).json({ ok: false, message: 'Managers cannot change user roles to non-employee' });
    }
    if (req.body.role === 'admin' && targetUser.role !== 'admin' && req.user.role !== 'admin')
      return res.status(403).json({ ok: false, message: 'Only admins can set admin role' });

    // Allow updating all profile fields
    const allowedFields = [
      'name', 'firstName', 'lastName', 'email', 'phone', 'employeeId',
      'avatar', 'designation', 'displayName', 'bloodGroup', 'address',
      'department', 'officeLocation', 'joiningDate', 'isActive',
      'approvalStatus', 'rejectionReason', 'permissionTemplate', 'preferences', 'smtpConfig'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        targetUser[field] = req.body[field];
      }
    });

    if (req.body.role && (req.user.role === 'admin' || req.user.role === 'manager')) {
      targetUser.role = req.body.role;
    }

    if (req.body.password && typeof req.body.password === 'string' && req.body.password.trim()) {
      targetUser.password = req.body.password.trim();
    }

    if (req.body.approvalStatus === 'accepted' && (!targetUser.approvedBy || targetUser.approvalStatus !== 'accepted')) {
      targetUser.approvedBy = req.user._id;
      targetUser.approvedAt = new Date();
    }

    await targetUser.save();
    const updated = await User.findById(targetUser._id)
      .select('-password')
      .populate('approvedBy', 'name email designation');
    res.json({ ok: true, user: updated });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    if (targetUser.role === 'admin') return res.status(403).json({ message: 'Admin users cannot be deleted' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users/fcm-token — deprecated (FCM removed)
router.post('/fcm-token', protect, async (req, res) => {
  res.json({ message: 'FCM token route deprecated' });
});

module.exports = router;