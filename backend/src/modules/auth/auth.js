const express = require('express');
const router = express.Router();
const { protect } = require('../../core/middleware/auth');
const { validate } = require('../../core/validation/validation');
const { loginSchema, registerSchema } = require('../../core/validation/schemas');
const {
  sendRegistrationOtp,
  register,
  login,
  getMe
} = require('./authController');

router.post('/send-registration-otp', sendRegistrationOtp);
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);

module.exports = router;