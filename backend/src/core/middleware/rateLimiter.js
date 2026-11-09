const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { message: 'Too many requests. Slow down.' },
});

// OTP issuance / verification — small window, tiny budget.
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { message: 'Too many OTP requests. Please try again after 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Outbound messaging (WhatsApp blast / bulk send) — protects the Meta budget
// and stops a single account from flooding recipients.
const blastLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { message: 'Message sending limit reached for this hour. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Expensive AI / LLM backed endpoints — per-IP ceiling on model calls.
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: { message: 'AI usage limit reached for this hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  apiLimiter,
  otpLimiter,
  blastLimiter,
  aiLimiter,
};
