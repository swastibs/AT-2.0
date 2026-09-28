const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

const emailLogPath = path.resolve(process.cwd(), 'logs', 'email-dev.log');

const loggerEmail = (type, email, link) => {
  const line = `${new Date().toISOString()} | ${type} | ${email} | ${link}\n`;
  fs.appendFileSync(emailLogPath, line, { encoding: 'utf8' });
  logger.info(`Dev email generated for ${type} for ${email}: ${link}`);
};

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: false,
  auth: config.SMTP_USER && config.SMTP_PASS ? {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
  } : undefined,
});

const sendMail = async ({ to, subject, html, text }) => {
  if (config.NODE_ENV !== 'production' || !config.SMTP_HOST || !config.SMTP_USER) {
    logger.info(`Email dev mode: ${subject} -> ${to}`);
    return { accepted: [to] };
  }

  await transporter.sendMail({
    from: config.SMTP_FROM,
    to,
    subject,
    html,
    text,
  });

  return { accepted: [to] };
};

const sendVerificationEmail = async ({ email, token }) => {
  const verifyLink = `${config.CLIENT_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

  if (config.NODE_ENV !== 'production') {
    loggerEmail('verify-email', email, verifyLink);
  }

  await sendMail({
    to: email,
    subject: 'Verify your AtomicTask account',
    text: `Verify your account: ${verifyLink}`,
    html: `<p>Verify your account: <a href="${verifyLink}">${verifyLink}</a></p>`,
  });

  return verifyLink;
};

const sendPasswordResetEmail = async ({ email, token }) => {
  const resetLink = `${config.CLIENT_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  if (config.NODE_ENV !== 'production') {
    loggerEmail('reset-password', email, resetLink);
  }

  await sendMail({
    to: email,
    subject: 'Reset your AtomicTask password',
    text: `Reset your password: ${resetLink}`,
    html: `<p>Reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
  });

  return resetLink;
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
