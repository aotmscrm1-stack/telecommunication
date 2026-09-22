const express = require('express');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// GET /api/users
router.get('/', protect, authorize('manager', 'admin', 'employee', 'caller'), async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ name: 1 });
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
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    if (req.user.role === 'manager') {
      if (targetUser.role !== 'employee' && targetUser.role !== 'caller') return res.status(403).json({ message: 'Managers can only update employees' });
      if (req.body.role && req.body.role !== 'employee' && req.body.role !== 'caller') return res.status(403).json({ message: 'Managers cannot change user roles to non-employee' });
    }
    if (req.body.role === 'admin' && targetUser.role !== 'admin')
      return res.status(403).json({ message: 'Only admins can set roles' });
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    if (req.body.role && (req.user.role === 'admin' || req.user.role === 'manager')) updates.role = req.body.role;
    if (req.body.permissionTemplate !== undefined) updates.permissionTemplate = req.body.permissionTemplate || null;
    if (req.body.password) {
      targetUser.password = req.body.password;
      if (req.body.name) targetUser.name = req.body.name;
      if (req.body.phone !== undefined) targetUser.phone = req.body.phone;
      if (req.body.isActive !== undefined) targetUser.isActive = req.body.isActive;
      if (req.body.role && (req.user.role === 'admin' || req.user.role === 'manager')) targetUser.role = req.body.role;
      if (req.body.permissionTemplate !== undefined) targetUser.permissionTemplate = req.body.permissionTemplate || null;
      await targetUser.save();
      return res.json({ user: targetUser.toJSON() });
    }
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
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