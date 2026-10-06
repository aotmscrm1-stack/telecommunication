// Redis client placeholder configuration
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  enabled: process.env.REDIS_ENABLED === 'true'
};

module.exports = redisConfig;
