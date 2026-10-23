const express = require('express');
const router = express.Router();
const { protect } = require('../../core/middleware/auth');
const { validate } = require('../../core/validation/validation');
const { loginSchema, registerSchema } = require('../../core/validation/schemas');
const {
  sendRegistrationOtp,
  getLatestOtp,
  register,
  login,
  getMe
} = require('./authController');

// Public registration is disabled: Accounts are provisioned exclusively by Admins via /api/users
router.post('/send-registration-otp', (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Public self-registration is disabled. Please contact your CRM Administrator to set up your account.'
  });
});

router.post('/register', (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Public account registration is disabled. All employees are provisioned directly by an Administrator.'
  });
});

router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);

module.exports = router;