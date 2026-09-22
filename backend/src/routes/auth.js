const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { uploadToCloudinary } = require('../utils/cloudinary');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// In-memory OTP storage for registration
const registrationOtpStore = new Map();

// Helper to send OTP via webhook or SMTP
async function sendOtpNotification(email, otp, firstName = 'User') {
  let sent = false;

  // 1. Try n8n OTP webhook if configured
  const webhookUrl = process.env.N8N_OTP_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL || process.env.N8N_FORGOT_PASSWORD_WORKFLOW_ID;
  if (webhookUrl) {
    try {
      await axios.post(webhookUrl, {
        event: 'registration_otp',
        email,
        name: firstName,
        otp,
        expiresInMinutes: 10,
      }, { timeout: 8000 });
      sent = true;
      console.log(`[AUTH] Sent OTP to n8n webhook: ${webhookUrl}`);
    } catch (e) {
      console.warn(`[AUTH] n8n webhook OTP delivery to ${webhookUrl} failed:`, e.message);
      // If it was webhook-test and failed, try active production URL as fallback
      if (webhookUrl.includes('/webhook-test/')) {
        const prodUrl = webhookUrl.replace('/webhook-test/', '/webhook/');
        try {
          await axios.post(prodUrl, {
            event: 'registration_otp',
            email,
            name: firstName,
            otp,
            expiresInMinutes: 10,
          }, { timeout: 8000 });
          sent = true;
          console.log(`[AUTH] Successfully sent OTP to production n8n webhook fallback: ${prodUrl}`);
        } catch (err2) {
          console.warn(`[AUTH] production n8n webhook fallback also failed:`, err2.message);
        }
      }
    }
  }

  // 2. Try SMTP if configured
  if (!sent && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"AOTMS Security" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Your AOTMS Verification Code: ${otp}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f1420; color: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #1e293b;">
            <h2 style="color: #f97316; margin-top: 0; font-size: 24px;">Welcome to AOTMS!</h2>
            <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
              Hello <strong>${firstName}</strong>,<br/>
              Use the 6-digit verification code below to complete your registration.
            </p>
            <div style="margin: 28px 0; text-align: center;">
              <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #f97316; background: rgba(249, 115, 22, 0.12); padding: 14px 28px; border-radius: 8px; border: 1px dashed #f97316;">
                ${otp}
              </span>
            </div>
            <p style="color: #94a3b8; font-size: 13px;">This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
            <hr style="border: 0; border-top: 1px solid #334155; margin: 24px 0;" />
            <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">AOTMS Telecom CRM Platform</p>
          </div>
        `,
      });
      sent = true;
    } catch (e) {
      console.warn('[AUTH] SMTP OTP delivery failed:', e.message);
    }
  }

  // Always log for transparency
  console.log(`[AUTH OTP] Registration OTP for ${email}: ${otp}`);
  return sent;
}

// POST /api/auth/send-registration-otp
router.post('/send-registration-otp', async (req, res) => {
  try {
    const { email, firstName } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ message: 'This email is already registered. Please login.' });
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    registrationOtpStore.set(cleanEmail, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      firstName: firstName || 'Colleague',
    });

    await sendOtpNotification(cleanEmail, otp, firstName);

    res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}. Please check your inbox.`,
    });
  } catch (err) {
    console.error('[AUTH OTP Error]:', err);
    res.status(500).json({ message: 'Failed to send OTP: ' + err.message });
  }
});

// POST /api/auth/upload-avatar
router.post('/upload-avatar', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ message: 'Image data is required' });
    }

    const cloudUrl = await uploadToCloudinary(image, 'aotms_avatars');
    if (!cloudUrl) {
      return res.status(500).json({ message: 'Failed to upload image to Cloudinary' });
    }

    res.json({ url: cloudUrl });
  } catch (err) {
    console.error('[Avatar Upload Error]:', err);
    res.status(500).json({ message: 'Upload failed: ' + err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      employeeId,
      designation,
      displayName,
      role,
      bloodGroup,
      phone,
      address,
      avatar,
      password,
      otp,
    } = req.body;

    // 1. Mandatory Field Validations
    if (!avatar || !avatar.trim()) {
      return res.status(400).json({ message: 'Profile/Logo image is mandatory. Please select and crop your image.' });
    }
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ message: 'First Name is mandatory' });
    }
    if (!lastName || !lastName.trim()) {
      return res.status(400).json({ message: 'Last Name is mandatory' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email address is mandatory' });
    }
    if (!employeeId || !employeeId.trim()) {
      return res.status(400).json({ message: 'ID (Employee/Staff ID) is mandatory' });
    }
    if (!designation || !designation.trim()) {
      return res.status(400).json({ message: 'Designation is mandatory' });
    }
    if (!role || !role.trim()) {
      return res.status(400).json({ message: 'Role is mandatory' });
    }
    if (!bloodGroup || !bloodGroup.trim()) {
      return res.status(400).json({ message: 'Blood Group is mandatory' });
    }

    // Contact number validation: Strictly 10 digits
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ message: 'Contact Number must be exactly 10 digits (no more, no less)' });
    }

    if (!address || !address.trim()) {
      return res.status(400).json({ message: 'Address is mandatory' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password is mandatory and must be at least 6 characters' });
    }

    // OTP validation
    const cleanEmail = email.trim().toLowerCase();
    const storedOtpData = registrationOtpStore.get(cleanEmail);

    if (!otp || !String(otp).trim()) {
      return res.status(400).json({ message: 'OTP verification code is mandatory' });
    }

    if (!storedOtpData || Date.now() > storedOtpData.expiresAt) {
      return res.status(400).json({ message: 'OTP verification code has expired. Please request a new code.' });
    }

    if (String(storedOtpData.otp).trim() !== String(otp).trim()) {
      return res.status(400).json({ message: 'Invalid OTP code. Please check and try again.' });
    }

    // Check duplicate email
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // Check duplicate employee ID
    const existingId = await User.findOne({ employeeId: employeeId.trim() });
    if (existingId) {
      return res.status(400).json({ message: `Staff ID "${employeeId.trim()}" is already assigned to another user.` });
    }

    // 2. Upload avatar to Cloudinary if it's base64 data
    let finalAvatarUrl = avatar;
    if (avatar.startsWith('data:image')) {
      const uploadedUrl = await uploadToCloudinary(avatar, 'aotms_avatars');
      if (uploadedUrl) {
        finalAvatarUrl = uploadedUrl;
      }
    }

    // Clear the OTP store for this email
    registrationOtpStore.delete(cleanEmail);

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    // 3. Create User in MongoDB
    const user = await User.create({
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: cleanEmail,
      password,
      role: role.trim(),
      employeeId: employeeId.trim(),
      designation: designation.trim(),
      displayName: (displayName || designation).trim(),
      bloodGroup: bloodGroup.trim(),
      phone: cleanPhone,
      address: address.trim(),
      avatar: finalAvatarUrl,
      isActive: true,
      approvalStatus: role.trim() === 'admin' ? 'accepted' : 'pending',
    });

    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user,
    });
  } catch (err) {
    console.error('[Register Error]:', err);
    res.status(500).json({ message: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!user.isActive) return res.status(401).json({ message: 'Account deactivated' });
    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.displayName) updates.displayName = req.body.displayName;
    if (req.body.designation) updates.designation = req.body.designation;
    if (req.body.phone) updates.phone = req.body.phone;
    if (req.body.password) {
      const user = await User.findById(req.user._id).select('+password');
      user.password = req.body.password;
      await user.save();
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/change-password — logged-in user changes their own password,
// verifying their current password first (used by the profile menu modal).
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const resetLink = frontendUrl + '/reset-password/' + rawToken;

    try {
      const webhookUrl = process.env.N8N_FORGOT_PASSWORD_WORKFLOW_ID;
      if (!webhookUrl) throw new Error('N8N_FORGOT_PASSWORD_WORKFLOW_ID is not configured');
      await axios.post(webhookUrl, {
        event: 'password_reset',
        email: user.email,
        name: user.name,
        resetLink,
        expiresInMinutes: 30,
      }, { timeout: 15000 });
    } catch (n8nErr) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: 'Could not send reset email: ' + n8nErr.message });
    }

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const token = signToken(user._id);
    res.json({ message: 'Password reset successful', token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;