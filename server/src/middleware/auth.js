const passport = require('passport');
const ApiError = require('../utils/ApiError');
const { ERROR_CODES } = require('../utils/constants');

const requireAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, _info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return next(new ApiError(401, 'Authentication required', ERROR_CODES.UNAUTHORIZED));
    }

    req.user = user;
    return next();
  })(req, res, next);
};

const requireRole = (role) => (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required', ERROR_CODES.UNAUTHORIZED));
  }

  if (req.user.role !== role) {
    return next(new ApiError(403, 'Forbidden: insufficient role', ERROR_CODES.FORBIDDEN));
  }

  return next();
};

const optionalAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) {
      return next(err);
    }

    if (user) {
      req.user = user;
    }

    return next();
  })(req, res, next);
};

module.exports = {
  requireAuth,
  requireRole,
  optionalAuth,
};
