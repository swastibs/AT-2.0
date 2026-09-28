const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const LocalStrategy = require('passport-local').Strategy;
const config = require('./index');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { ERROR_CODES } = require('../utils/constants');

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    (req) => req && req.cookies ? req.cookies.accessToken : null,
  ]),
  secretOrKey: config.JWT_SECRET,
  issuer: config.PROJECT_NAME,
  passReqToCallback: true,
};

passport.use(
  new JwtStrategy(jwtOptions, async (req, payload, done) => {
    try {
      if (payload.type !== 'access') {
        return done(new ApiError(401, 'Invalid access token', ERROR_CODES.INVALID_TOKEN), false);
      }

      const user = await User.findById(payload.sub).select('+emailVerified +role');
      if (!user) {
        return done(new ApiError(401, 'User not found', ERROR_CODES.NOT_FOUND), false);
      }

      if (user.isDeleted) {
        return done(new ApiError(403, 'Account no longer active', ERROR_CODES.FORBIDDEN), false);
      }

      req.user = user;
      return done(null, user);
    } catch (error) {
      logger.error('JWT auth failure', { error: error.message });
      return done(error, false);
    }
  })
);

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      try {
        const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password +failedLoginAttempts +lockedUntil');

        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return done(new ApiError(429, 'Account temporarily locked', ERROR_CODES.ACCOUNT_LOCKED), false);
        }

        if (!user.emailVerified) {
          return done(new ApiError(403, 'Email must be verified before login', ERROR_CODES.EMAIL_NOT_VERIFIED), false);
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
          if (user.failedLoginAttempts >= 10) {
            user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
          }
          await user.save({ validateBeforeSave: false });
          return done(null, false, { message: 'Invalid email or password' });
        }

        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        user.lastLoginAt = new Date();
        await user.save({ validateBeforeSave: false });

        return done(null, user);
      } catch (error) {
        logger.error('Local auth failure', { error: error.message });
        return done(error, false);
      }
    }
  )
);

module.exports = passport;
