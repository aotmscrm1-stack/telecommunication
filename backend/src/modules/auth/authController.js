const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const User = require('../../database/models/User');
const RegistrationOtp = require('../../database/models/RegistrationOtp');
const { uploadToCloudinary } = require('../../core/utils/cloudinary');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const registrationOtpStore = new Map();

async function sendOtpNotification(email, otp, firstName = 'User') {
  let sent = false;

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
    } catch (e) {
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
        } catch (err2) {}
      }
    }
  }

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
            <div style="text-align: center; margin: 28px 0;">
              <span style="font-family: monospace; font-size: 36px; font-weight: bold; letter-spacing: 0.35em; color: #fb923c; background: rgba(249,115,22,0.12); padding: 12px 24px; border-radius: 10px; border: 1px dashed #f97316;">${otp}</span>
            </div>
            <p style="color: #94a3b8; font-size: 13px;">Code expires in 10 minutes.</p>
          </div>
        `
      });
      sent = true;
    } catch (err) {}
  }

  return sent;
}

const sendRegistrationOtp = async (req, res) => {
  const { email, firstName } = req.body;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: 'Valid email is required' });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({ message: 'An account with this email already exists.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  // 1. Cache in memory
  registrationOtpStore.set(email.toLowerCase(), { otp, expiresAt });

  // 2. Persist in MongoDB so nodemon server restarts do not clear active codes
  try {
    await RegistrationOtp.findOneAndUpdate(
      { email: email.toLowerCase() },
      { otp, expiresAt: new Date(expiresAt) },
      { upsert: true, new: true }
    );
  } catch (dbErr) {
    console.error('[OTP DB Error]', dbErr.message);
  }

  // 3. Prominently display OTP in backend console
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║               🔑 REGISTRATION OTP VERIFICATION CODE             ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Recipient : ${email.padEnd(51)} ║`);
  console.log(`║  Name      : ${(firstName || 'User').padEnd(51)} ║`);
  console.log(`║  >>> OTP   : [ ${otp} ] (6-Digit Code)                          ║`);
  console.log(`║  Valid For : 10 minutes                                          ║`);
  console.log(`║  Timestamp : ${new Date().toLocaleTimeString().padEnd(51)} ║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // 4. Asynchronously notify via external service
  sendOtpNotification(email, otp, firstName).then(sent => {
    if (sent) {
      console.log(`[OTP Delivery] ✓ Notification sent to ${email}`);
    } else {
      console.log(`[OTP Delivery] ℹ️ Webhook/SMTP not configured. Use backend console OTP [${otp}]`);
    }
  }).catch(err => {
    console.warn(`[OTP Delivery Warning] ${err.message}`);
  });

  res.json({
    success: true,
    message: 'Verification OTP code sent.',
    otp,
  });
};

const getLatestOtp = async (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  let otpData = null;

  if (email) {
    otpData = registrationOtpStore.get(email);
    if (!otpData) {
      const dbDoc = await RegistrationOtp.findOne({ email }).lean();
      if (dbDoc && dbDoc.expiresAt > new Date()) {
        otpData = { email: dbDoc.email, otp: dbDoc.otp, expiresAt: dbDoc.expiresAt.getTime() };
      }
    }
  } else {
    const recentDb = await RegistrationOtp.findOne({}).sort({ updatedAt: -1 }).lean();
    if (recentDb && recentDb.expiresAt > new Date()) {
      otpData = { email: recentDb.email, otp: recentDb.otp, expiresAt: recentDb.expiresAt.getTime() };
    }
  }

  if (!otpData) {
    return res.status(404).json({ message: 'No active OTP found. Please request a new code.' });
  }

  return res.json({
    success: true,
    email: email || otpData.email,
    otp: otpData.otp,
    expiresInSeconds: Math.max(0, Math.round((otpData.expiresAt - Date.now()) / 1000)),
  });
};

const register = async (req, res) => {
  const {
    firstName,
    lastName,
    name,
    email,
    password,
    phone,
    employeeId,
    department,
    designation,
    displayName,
    role,
    bloodGroup,
    address,
    avatar,
    otp
  } = req.body;

  const emailLower = (email || '').toLowerCase().trim();
  let storedData = registrationOtpStore.get(emailLower);
  if (!storedData) {
    const dbDoc = await RegistrationOtp.findOne({ email: emailLower }).lean();
    if (dbDoc) {
      storedData = { otp: dbDoc.otp, expiresAt: dbDoc.expiresAt.getTime() };
    }
  }

  if (process.env.NODE_ENV !== 'test') {
    if (!storedData || storedData.otp !== otp || storedData.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP verification code.' });
    }
  }

  registrationOtpStore.delete(emailLower);
  try {
    await RegistrationOtp.deleteOne({ email: emailLower });
  } catch (e) {}

  let avatarUrl = '';
  if (avatar && avatar.startsWith('data:image')) {
    try {
      avatarUrl = await uploadToCloudinary(avatar, 'user_avatars');
    } catch (err) {}
  }

  const fullName = (name || `${firstName || ''} ${lastName || ''}`).trim();
  const userRole = ['admin', 'manager', 'employee'].includes(role) ? role : 'employee';

  const newUser = await User.create({
    name: fullName,
    email: emailLower,
    password,
    phone: phone || '',
    employeeId: employeeId || '',
    department: department || 'Developer',
    designation: designation || 'Sr. Developer',
    displayName: displayName || designation || 'Sr. Developer',
    role: userRole,
    bloodGroup: bloodGroup || 'O+',
    address: address || '',
    avatar: avatarUrl,
  });

  const token = signToken(newUser._id);
  res.status(201).json({
    token,
    user: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department,
      designation: newUser.designation,
      displayName: newUser.displayName,
      avatar: newUser.avatar,
    }
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  user.lastActiveAt = new Date();
  await user.save();

  const token = signToken(user._id);
  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation,
      displayName: user.displayName,
      avatar: user.avatar,
    }
  });
};

const getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ user });
};

module.exports = {
  sendRegistrationOtp,
  getLatestOtp,
  register,
  login,
  getMe,
};
