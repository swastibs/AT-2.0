const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { ERROR_CODES, ROLES } = require('../utils/constants');
const { sendVerificationEmail, sendPasswordResetEmail } = require('./email.service');
const { issueTokens, revokeAllUserTokens, verifyRefreshToken, revokeRefreshToken } = require('./token.service');

const validatePasswordStrength = (password) => {
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  return strongRegex.test(password);
};

const sanitizeUser = (user) => {
  if (!user) return user;
  const obj = user.toJSON ? user.toJSON() : { ...user };
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.failedLoginAttempts;
  delete obj.lockedUntil;
  return obj;
};

const registerUser = async ({ name, email, password, confirmPassword }) => {
  if (!name || name.trim().length < 2 || name.trim().length > 80) {
    throw new ApiError(400, 'Name must be between 2 and 80 characters', ERROR_CODES.VALIDATION_ERROR);
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'Valid email is required', ERROR_CODES.VALIDATION_ERROR);
  }

  if (!password || !validatePasswordStrength(password)) {
    throw new ApiError(400, 'Password must contain at least 8 chars, one uppercase, one lowercase, one number, and one symbol', ERROR_CODES.VALIDATION_ERROR);
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, 'Passwords do not match', ERROR_CODES.VALIDATION_ERROR);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new ApiError(409, 'User already exists', ERROR_CODES.CONFLICT);
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: ROLES.USER,
  });

  const rawToken = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });
  await sendVerificationEmail({ email: user.email, token: rawToken });

  return { user: sanitizeUser(user), message: 'Registration successful. Please verify your email.' };
};

const verifyEmail = async ({ email, token }) => {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'Valid email is required', ERROR_CODES.VALIDATION_ERROR);
  }

  if (!token || token.length !== 64) {
    throw new ApiError(400, 'Verification token is required', ERROR_CODES.VALIDATION_ERROR);
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ email: email.toLowerCase().trim(), emailVerificationToken: hashedToken }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) {
    throw new ApiError(400, 'Invalid or expired verification token', ERROR_CODES.INVALID_TOKEN);
  }

  if (new Date(user.emailVerificationExpires) < new Date()) {
    throw new ApiError(401, 'Verification token expired', ERROR_CODES.TOKEN_EXPIRED);
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  return { user: sanitizeUser(user), message: 'Email verified successfully' };
};

const resendVerificationEmail = async ({ email }) => {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'Valid email is required', ERROR_CODES.VALIDATION_ERROR);
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return { message: 'If the email exists, a verification link has been sent.' };
  }

  if (user.emailVerified) {
    return { message: 'Email is already verified.' };
  }

  const rawToken = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });
  await sendVerificationEmail({ email: user.email, token: rawToken });

  return { message: 'Verification email sent successfully.' };
};

const loginUser = async ({ email, password }, metadata = {}) => {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'Valid email is required', ERROR_CODES.VALIDATION_ERROR);
  }

  if (!password) {
    throw new ApiError(400, 'Password is required', ERROR_CODES.VALIDATION_ERROR);
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password +failedLoginAttempts +lockedUntil');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password', ERROR_CODES.UNAUTHORIZED);
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    throw new ApiError(429, 'Account temporarily locked due to multiple failed login attempts', ERROR_CODES.ACCOUNT_LOCKED);
  }

  if (!user.emailVerified) {
    throw new ApiError(403, 'Please verify your email before logging in', ERROR_CODES.EMAIL_NOT_VERIFIED);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= 10) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await user.save({ validateBeforeSave: false });
    throw new ApiError(401, 'Invalid email or password', ERROR_CODES.UNAUTHORIZED);
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const tokens = await issueTokens(user, metadata);
  return {
    user: sanitizeUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
};

const logoutUser = async (userId, refreshToken) => {
  if (refreshToken) {
    try {
      const payload = jwt.decode(refreshToken);
      if (payload && payload.jti) {
        await revokeRefreshToken(payload.jti);
      }
    } catch (error) {
      // ignore invalid refresh token on logout
    }
  }

  return { message: 'Logged out successfully' };
};

const logoutAllUserSessions = async (userId) => {
  await revokeAllUserTokens(userId);
  return { message: 'All sessions revoked successfully' };
};

const refreshAccessToken = async (refreshToken, metadata = {}) => {
  const { user, jti } = await verifyRefreshToken(refreshToken);
  await revokeRefreshToken(jti);

  const newTokens = await issueTokens(user, metadata);
  return {
    user: sanitizeUser(user),
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,
  };
};

const forgotPassword = async ({ email }) => {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'Valid email is required', ERROR_CODES.VALIDATION_ERROR);
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return { message: 'If a matching account exists, a reset link has been sent.' };
  }

  const rawToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });
  await sendPasswordResetEmail({ email: user.email, token: rawToken });

  return { message: 'Password reset link sent successfully.' };
};

const resetPassword = async ({ token, password, confirmPassword }) => {
  if (!token || token.length !== 64) {
    throw new ApiError(400, 'Reset token is required', ERROR_CODES.VALIDATION_ERROR);
  }

  if (!password || !validatePasswordStrength(password)) {
    throw new ApiError(400, 'Password must contain at least 8 chars, one uppercase, one lowercase, one number, and one symbol', ERROR_CODES.VALIDATION_ERROR);
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, 'Passwords do not match', ERROR_CODES.VALIDATION_ERROR);
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ passwordResetToken: hashedToken }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token', ERROR_CODES.RESET_TOKEN_INVALID);
  }

  if (new Date(user.passwordResetExpires) < new Date()) {
    throw new ApiError(401, 'Reset token expired', ERROR_CODES.TOKEN_EXPIRED);
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await revokeAllUserTokens(user._id);
  await user.save();

  return { message: 'Password reset successfully' };
};

const changePassword = async ({ userId, currentPassword, newPassword, confirmPassword }) => {
  if (!currentPassword) {
    throw new ApiError(400, 'Current password is required', ERROR_CODES.VALIDATION_ERROR);
  }

  if (!newPassword || !validatePasswordStrength(newPassword)) {
    throw new ApiError(400, 'Password must contain at least 8 chars, one uppercase, one lowercase, one number, and one symbol', ERROR_CODES.VALIDATION_ERROR);
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, 'Passwords do not match', ERROR_CODES.VALIDATION_ERROR);
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found', ERROR_CODES.NOT_FOUND);
  }

  const matches = await user.comparePassword(currentPassword);
  if (!matches) {
    throw new ApiError(401, 'Current password is incorrect', ERROR_CODES.UNAUTHORIZED);
  }

  if (newPassword === currentPassword) {
    throw new ApiError(400, 'New password must be different from current password', ERROR_CODES.VALIDATION_ERROR);
  }

  user.password = newPassword;
  await revokeAllUserTokens(user._id);
  await user.save();

  return { message: 'Password changed successfully' };
};

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found', ERROR_CODES.NOT_FOUND);
  }
  return { user: sanitizeUser(user) };
};

module.exports = {
  registerUser,
  verifyEmail,
  resendVerificationEmail,
  loginUser,
  logoutUser,
  logoutAllUserSessions,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  changePassword,
  getCurrentUser,
  validatePasswordStrength,
  sanitizeUser,
};
