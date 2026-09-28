class ApiError extends Error {
  constructor(statusCode, message, code = 'INTERNAL_ERROR', errors = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}

module.exports = ApiError;
