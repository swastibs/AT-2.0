const express = require('express');
const {
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
} = require('../controllers/auth.controller');
const {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
  resendVerificationValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
} = require('../validators/auth.validator');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { loginLimiter, registerLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', registerLimiter, registerValidator, validate, register);
router.post('/verify-email', verifyEmailValidator, validate, verifyEmail);
router.post('/resend-verification', resendVerificationValidator, validate, resendVerification);
router.post('/login', loginLimiter, loginValidator, validate, login);
router.post('/refresh', refresh);
router.post('/logout', requireAuth, logout);
router.post('/logout-all', requireAuth, logoutAll);
router.get('/me', requireAuth, me);
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordValidator, validate, forgotPassword);
router.post('/reset-password', resetPasswordValidator, validate, resetPassword);
router.post('/change-password', requireAuth, changePasswordValidator, validate, changePassword);

module.exports = router;
