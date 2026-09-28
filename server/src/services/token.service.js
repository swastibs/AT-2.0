const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { ERROR_CODES } = require('../utils/constants');

const signAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      type: 'access',
    },
    config.JWT_SECRET,
    {
      expiresIn: config.JWT_EXPIRES_IN,
      issuer: config.PROJECT_NAME,
      jwtid: uuidv4(),
    }
  );
};

const signRefreshToken = (user, jti) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      jti,
      type: 'refresh',
    },
    config.JWT_REFRESH_SECRET,
    {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN,
      issuer: config.PROJECT_NAME,
    }
  );
};

const issueTokens = async (user, metadata = {}) => {
  const jti = uuidv4();
  const refreshExpiresInMs = 30 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + refreshExpiresInMs);

  const tokenValue = signRefreshToken(user, jti);

  await RefreshToken.create({
    jti,
    userId: user._id,
    expiresAt,
    userAgent: metadata.userAgent || '',
    ip: metadata.ip || '',
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken: tokenValue,
    jti,
  };
};

const verifyRefreshToken = async (refreshToken) => {
  const payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);

  if (payload.type !== 'refresh') {
    throw new ApiError(401, 'Invalid refresh token', ERROR_CODES.INVALID_TOKEN);
  }

  const storedToken = await RefreshToken.findOne({ jti: payload.jti, revokedAt: null }).lean();
  if (!storedToken) {
    throw new ApiError(401, 'Refresh token revoked or invalid', ERROR_CODES.SESSION_REVOKED);
  }

  if (new Date(storedToken.expiresAt) < new Date()) {
    throw new ApiError(401, 'Refresh token expired', ERROR_CODES.TOKEN_EXPIRED);
  }

  const user = await User.findById(payload.sub).lean();
  if (!user) {
    throw new ApiError(401, 'User not found', ERROR_CODES.NOT_FOUND);
  }

  return { user, jti: payload.jti };
};

const revokeRefreshToken = async (jti) => {
  await RefreshToken.updateOne({ jti }, { $set: { revokedAt: new Date() } });
};

const revokeAllUserTokens = async (userId) => {
  await RefreshToken.updateMany({ userId }, { $set: { revokedAt: new Date() } });
};

module.exports = {
  issueTokens,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  signAccessToken,
  signRefreshToken,
};
