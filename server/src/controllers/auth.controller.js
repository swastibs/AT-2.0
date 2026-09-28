const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { ERROR_CODES } = require('../utils/constants');
const authService = require('../services/auth.service');

const setRefreshCookie = (res, refreshToken) => {
  const secure = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', { path: '/', httpOnly: true, sameSite: 'strict' });
};

const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  return ApiResponse.success(res, result.message, { user: result.user }, 201);
});

const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body);
  return ApiResponse.success(res, result.message, { user: result.user });
});

const resendVerification = asyncHandler(async (req, res) => {
  const result = await authService.resendVerificationEmail(req.body);
  return ApiResponse.success(res, result.message, { user: null });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body, {
    ip: req.ip,
    userAgent: req.headers['user-agent'] || '',
  });

  setRefreshCookie(res, result.refreshToken);
  return ApiResponse.success(res, 'Login successful', {
    user: result.user,
    accessToken: result.accessToken,
  });
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || null;
  const result = await authService.logoutUser(req.user?._id, refreshToken);
  clearRefreshCookie(res);
  return ApiResponse.success(res, result.message);
});

const logoutAll = asyncHandler(async (req, res) => {
  const result = await authService.logoutAllUserSessions(req.user._id);
  clearRefreshCookie(res);
  return ApiResponse.success(res, result.message);
});

const me = asyncHandler(async (req, res) => {
  const result = await authService.getCurrentUser(req.user._id);
  return ApiResponse.success(res, 'User retrieved', { user: result.user });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token is required', ERROR_CODES.UNAUTHORIZED);
  }

  const result = await authService.refreshAccessToken(refreshToken, {
    ip: req.ip,
    userAgent: req.headers['user-agent'] || '',
  });

  setRefreshCookie(res, result.refreshToken);
  return ApiResponse.success(res, 'Token refreshed successfully', {
    user: result.user,
    accessToken: result.accessToken,
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body);
  return ApiResponse.success(res, result.message);
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  return ApiResponse.success(res, result.message);
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword({
    userId: req.user._id,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
    confirmPassword: req.body.confirmPassword,
  });

  clearRefreshCookie(res);
  return ApiResponse.success(res, result.message);
});

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  logout,
  logoutAll,
  me,
  refresh,
  forgotPassword,
  resetPassword,
  changePassword,
};
