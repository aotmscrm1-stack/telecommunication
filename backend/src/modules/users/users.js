const express = require('express');
const User = require('../../database/models/User');
const { protect, authorize } = require('../../core/middleware/auth');
const router = express.Router();

const isExecutiveOrAdminUser = (user) => {
  if (!user) return false;
  const role = String(user.role || '').trim().toLowerCase();
  if (role === 'admin' || role === 'superadmin') return true;

  const d = String(user.designation || '').trim().toUpperCase();
  const dept = String(user.department || '').trim().toUpperCase();

  // Non-management staff
  const isMarketingOrSalesStaff = 
    d.includes('MARKETING') || 
    d.includes('SALES') || 
    d.includes('CALLER') || 
    d.includes('TELE') || 
    d.includes('JR') || 
    d.includes('JUNIOR');

  if (isMarketingOrSalesStaff && role !== 'admin' && role !== 'superadmin') {
    return false;
  }

  return (
    d === 'MD' ||
    d.includes('MANAGING DIRECTOR') ||
    d === 'CEO' ||
    d === 'CTO' ||
    d === 'HR' ||
    d.includes('DIRECTOR') ||
    d.includes('VICE PRESIDENT') ||
    dept === 'HR' ||
    dept === 'ADMIN' ||
    dept === 'MANAGEMENT'
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
    // Return all users for task/todo assignment and CRM operations
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

// POST /api/users - Admin / Manager Employee Provisioning
router.post('/', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const {
      name,
      firstName,
      lastName,
      email,
      password,
      role = 'employee',
      phone,
      employeeId,
      department,
      designation,
      displayName,
      bloodGroup,
      address,
      avatar,
      officeLocation,
      joiningDate
    } = req.body;

    const emailClean = (email || '').toLowerCase().trim();
    if (!emailClean) {
      return res.status(400).json({ ok: false, message: 'Valid email address is required' });
    }

    const existingEmail = await User.findOne({ email: emailClean });
    if (existingEmail) {
      return res.status(400).json({ ok: false, message: 'An employee with this email already exists' });
    }

    if (phone && phone.trim()) {
      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone) {
        return res.status(400).json({ ok: false, message: 'An employee with this phone number already exists' });
      }
    }

    // Role Escalation Protections
    const targetRole = ['admin', 'manager', 'employee', 'caller'].includes(role) ? role : 'employee';
    if (req.user.role === 'manager') {
      if (targetRole !== 'employee' && targetRole !== 'caller') {
        return res.status(403).json({ ok: false, message: 'Managers can only provision Employee or Caller accounts' });
      }
    }

    const fullName = (name || `${firstName || ''} ${lastName || ''}`).trim();
    if (!fullName) {
      return res.status(400).json({ ok: false, message: 'Employee name is required' });
    }

    const initialPassword = password && password.trim().length >= 6 ? password.trim() : 'Password@123';

    // Account created by Admin / Manager is automatically verified and accepted
    const user = await User.create({
      name: fullName,
      firstName: firstName || fullName.split(' ')[0] || '',
      lastName: lastName || fullName.split(' ').slice(1).join(' ') || '',
      email: emailClean,
      password: initialPassword,
      role: targetRole,
      phone: phone ? phone.trim() : '',
      employeeId: employeeId ? employeeId.trim() : `EMP-${Date.now().toString().slice(-4)}`,
      department: department ? department.trim() : 'Operations',
      designation: designation ? designation.trim() : 'Staff Member',
      displayName: displayName || designation || 'Staff Member',
      bloodGroup: bloodGroup ? bloodGroup.trim() : 'O+',
      address: address ? address.trim() : '',
      avatar: avatar || '',
      officeLocation: officeLocation ? officeLocation.trim() : '',
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      approvalStatus: 'accepted',
      approvedBy: req.user._id,
      approvedAt: new Date(),
      isActive: true
    });

    res.status(201).json({
      ok: true,
      message: `Employee account for ${user.name} created and activated successfully`,
      user: user.toJSON()
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
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

// POST /api/users/fcm-token — Register or update employee mobile FCM device token
router.post('/fcm-token', protect, async (req, res) => {
  try {
    const { token, platform = 'android' } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ ok: false, message: 'Valid device FCM token is required' });
    }

    // Save token on user document
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      {
        fcmToken: token.trim(),
        fcmTokenUpdatedAt: new Date()
      },
      { new: true }
    );

    console.log(`[FCM Registration] ✓ Registered FCM token for ${updated?.name || req.user._id} (${updated?.email})`);
    res.json({
      ok: true,
      message: 'FCM token registered successfully',
      user: { id: updated?._id, email: updated?.email, fcmTokenUpdatedAt: updated?.fcmTokenUpdatedAt }
    });
  } catch (err) {
    console.error('[FCM Registration Error]:', err.message);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// GET /api/users/fcm-status — Check current user's device push status
router.get('/fcm-status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('name email fcmToken fcmTokenUpdatedAt');
    res.json({
      ok: true,
      hasToken: !!(user?.fcmToken && user.fcmToken.trim().length > 0),
      tokenPrefix: user?.fcmToken ? user.fcmToken.slice(0, 15) + '...' : null,
      updatedAt: user?.fcmTokenUpdatedAt || null
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// DELETE /api/users/fcm-token — Disassociate device token on logout
router.delete('/fcm-token', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      fcmToken: '',
      fcmTokenUpdatedAt: new Date()
    });
    console.log(`[FCM Registration] Cleared FCM token for user ${req.user._id}`);
    res.json({ ok: true, message: 'FCM token cleared successfully' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;