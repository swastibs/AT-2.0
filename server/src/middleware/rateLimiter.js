const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const config = require('../config');

const loginLimiter = rateLimit({
  windowMs: config.LOGIN_RATE_LIMIT_WINDOW_MS,
  max: config.LOGIN_RATE_LIMIT_MAX,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.body?.email || 'unknown'}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

const registerLimiter = rateLimit({
  windowMs: config.REGISTER_RATE_LIMIT_WINDOW_MS,
  max: config.REGISTER_RATE_LIMIT_MAX,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: config.FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS,
  max: config.FORGOT_PASSWORD_RATE_LIMIT_MAX,
  keyGenerator: (req) => `${req.body?.email || 'unknown'}:${ipKeyGenerator(req.ip)}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many reset-password attempts. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

module.exports = {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
};
