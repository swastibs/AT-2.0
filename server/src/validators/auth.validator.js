const { body } = require('express-validator');

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const rejectUnknown = (fieldName) => body(fieldName).custom((value, { req }) => {
  const allowed = ['email', 'name', 'password', 'confirmPassword', 'token', 'currentPassword', 'newPassword'];
  const unknown = Object.keys(req.body || {}).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    throw new Error('Unexpected fields are not allowed');
  }
  return true;
});

const registerValidator = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters'),
  body('email').trim().toLowerCase().isEmail().withMessage('Please provide a valid email'),
  body('password').isString().matches(strongPassword).withMessage('Password must contain at least 8 chars, one uppercase, one lowercase, one number, and one symbol'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  rejectUnknown('name'),
];

const loginValidator = [
  body('email').trim().toLowerCase().isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  rejectUnknown('email'),
];

const verifyEmailValidator = [
  body('email').trim().toLowerCase().isEmail().withMessage('Please provide a valid email'),
  body('token').matches(/^[a-fA-F0-9]{64}$/).withMessage('Verification token must be a 64-char hexadecimal token'),
  rejectUnknown('email'),
];

const resendVerificationValidator = [
  body('email').trim().toLowerCase().isEmail().withMessage('Please provide a valid email'),
  rejectUnknown('email'),
];

const forgotPasswordValidator = [
  body('email').trim().toLowerCase().isEmail().withMessage('Please provide a valid email'),
  rejectUnknown('email'),
];

const resetPasswordValidator = [
  body('token').matches(/^[a-fA-F0-9]{64}$/).withMessage('Reset token must be a 64-char hexadecimal token'),
  body('password').matches(strongPassword).withMessage('Password must contain at least 8 chars, one uppercase, one lowercase, one number, and one symbol'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  rejectUnknown('token'),
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').matches(strongPassword).withMessage('Password must contain at least 8 chars, one uppercase, one lowercase, one number, and one symbol'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  body('newPassword').custom((value, { req }) => {
    if (value === req.body.currentPassword) {
      throw new Error('New password must be different from current password');
    }
    return true;
  }),
  rejectUnknown('currentPassword'),
];

module.exports = {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
  resendVerificationValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
};
