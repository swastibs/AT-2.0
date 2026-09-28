const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const { ERROR_CODES } = require('../utils/constants');

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = {};
    errors.array({ onlyFirstError: true }).forEach((error) => {
      const field = error.path || 'unknown';
      formattedErrors[field] = error.msg;
    });

    return next(new ApiError(400, 'Validation failed', ERROR_CODES.VALIDATION_ERROR, formattedErrors));
  }

  return next();
};

module.exports = validate;
