const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { ERROR_CODES } = require('../utils/constants');

const errorHandler = (err, req, res, _next) => {
  const requestId = req.id || 'unknown';

  if (err instanceof ApiError) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
      code: err.code || 'INTERNAL_ERROR',
      errors: err.errors || undefined,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  if (err.name === 'ValidationError') {
    const fieldErrors = {};
    Object.keys(err.errors || {}).forEach((key) => {
      fieldErrors[key] = err.errors[key].message;
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: ERROR_CODES.VALIDATION_ERROR,
      errors: fieldErrors,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate resource detected',
      code: ERROR_CODES.CONFLICT,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: ERROR_CODES.INVALID_TOKEN,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      code: ERROR_CODES.TOKEN_EXPIRED,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  logger.error('Unhandled error', { requestId, error: err.stack || err.message });

  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
    requestId,
    timestamp: new Date().toISOString(),
  });
};

module.exports = errorHandler;
