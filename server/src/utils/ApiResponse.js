class ApiResponse {
  static success(res, message, data = null, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      project: process.env.PROJECT_NAME || 'AtomicTask',
      timestamp: new Date().toISOString(),
      requestId: res.req && res.req.id ? res.req.id : undefined,
    });
  }

  static error(res, error) {
    const payload = {
      success: false,
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      requestId: res.req && res.req.id ? res.req.id : undefined,
    };

    if (error.errors) {
      payload.errors = error.errors;
    }

    return res.status(error.statusCode || 500).json(payload);
  }
}

module.exports = ApiResponse;
