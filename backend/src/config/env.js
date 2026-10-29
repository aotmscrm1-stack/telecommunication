require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGODB_URI || process.env.MONGO_URI,
  ALLOW_MEMORY_DB_FALLBACK: process.env.ALLOW_MEMORY_DB_FALLBACK === 'true',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_jwt_secret_key_aotms_2026',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || 'http://localhost:5000',
  META_WA_ACCESS_TOKEN: process.env.META_WA_ACCESS_TOKEN,
  META_WA_PHONE_NUMBER_ID: process.env.META_WA_PHONE_NUMBER_ID,
  META_WA_VERIFY_TOKEN: process.env.META_WA_VERIFY_TOKEN || 'zest_eat_meta_verify_8f9q2a',
};
