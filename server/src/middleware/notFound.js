const ApiError = require('../utils/ApiError');
const { ERROR_CODES } = require('../utils/constants');

const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`, ERROR_CODES.NOT_FOUND));
};

module.exports = notFound;
