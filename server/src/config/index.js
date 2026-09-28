const dotenv = require('dotenv');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missing = requiredEnvVars.filter((name) => !process.env[name]);

if (missing.length && process.env.NODE_ENV !== 'test') {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const config = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5000),
  PROJECT_NAME: process.env.PROJECT_NAME || 'AtomicTask',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/atomictask',
  JWT_SECRET: process.env.JWT_SECRET || 'development-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'development-refresh-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS || 12),
  REDIS_URL: process.env.REDIS_URL || '',
  SMTP_HOST: process.env.SMTP_HOST || 'localhost',
  SMTP_PORT: Number(process.env.SMTP_PORT || 1025),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@atomictask.local',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  COOKIE_SECURE: String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true',
  TRUST_PROXY: Number(process.env.TRUST_PROXY || 1),
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  LOGIN_RATE_LIMIT_WINDOW_MS: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 900000),
  LOGIN_RATE_LIMIT_MAX: Number(process.env.LOGIN_RATE_LIMIT_MAX || 5),
  REGISTER_RATE_LIMIT_WINDOW_MS: Number(process.env.REGISTER_RATE_LIMIT_WINDOW_MS || 3600000),
  REGISTER_RATE_LIMIT_MAX: Number(process.env.REGISTER_RATE_LIMIT_MAX || 5),
  FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS: Number(process.env.FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS || 3600000),
  FORGOT_PASSWORD_RATE_LIMIT_MAX: Number(process.env.FORGOT_PASSWORD_RATE_LIMIT_MAX || 3),
});

module.exports = config;
