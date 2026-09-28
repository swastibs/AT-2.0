const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const crypto = require('crypto');

process.env.LOGIN_RATE_LIMIT_MAX = '100';

const app = require('../src/app');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Auth module', () => {
  test('register success', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password1!',
        confirmPassword: 'Password1!'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('jane@example.com');
  });

  test('register duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password2!',
        confirmPassword: 'Password2!'
      });

    expect(res.status).toBe(409);
  });

  test('register weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Weak User',
        email: 'weak@example.com',
        password: 'abc',
        confirmPassword: 'abc'
      });

    expect(res.status).toBe(400);
  });

  test('login before verify fails with 403', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'jane@example.com',
        password: 'Password1!'
      });

    expect(res.status).toBe(403);
  });

  test('verify email works', async () => {
    const user = await require('../src/models/User').findOne({ email: 'jane@example.com' }).select('+emailVerificationToken');
    const token = 'a'.repeat(64);
    user.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
    user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ email: 'jane@example.com', token });

    expect(res.status).toBe(200);
  });

  test('login success returns access token and refresh cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'jane@example.com',
        password: 'Password1!'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.headers['set-cookie'][0]).toMatch(/refreshToken=/);
  });

  test('login wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'jane@example.com',
        password: 'WrongPassword1!'
      });

    expect(res.status).toBe(401);
  });

  test('GET /me with valid token', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'jane@example.com',
        password: 'Password1!'
      });

    const accessToken = loginRes.body.data.accessToken;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('jane@example.com');
  });

  test('GET /me without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  test('refresh token rotation works and old refresh is rejected', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'jane@example.com',
        password: 'Password1!'
      });

    const oldCookie = loginRes.headers['set-cookie'][0].split(';')[0];
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [oldCookie]);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTruthy();

    const rejectRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [oldCookie]);

    expect(rejectRes.status).toBe(401);
  });

  test('logout revokes refresh token', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'jane@example.com',
        password: 'Password1!'
      });

    const cookie = loginRes.headers['set-cookie'][0].split(';')[0];

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
      .set('Cookie', [cookie]);

    expect(logoutRes.status).toBe(200);

    const refreshTry = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [cookie]);

    expect(refreshTry.status).toBe(401);
  });

  test('forgot password returns success no enumeration', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'unknown@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('reset password with valid token works', async () => {
    const user = await require('../src/models/User').findOne({ email: 'jane@example.com' });
    const resetToken = 'b'.repeat(64);
    user.passwordResetToken = require('crypto').createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, password: 'NewPassword1!', confirmPassword: 'NewPassword1!' });

    expect(res.status).toBe(200);
  });

  test('account lockout after repeated failed logins', async () => {
    const email = 'lock@example.com';
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Lock User',
        email,
        password: 'Password1!',
        confirmPassword: 'Password1!'
      });

    const user = await require('../src/models/User').findOne({ email });
    user.emailVerified = true;
    await user.save();

    for (let i = 0; i < 10; i += 1) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPass1!' });
    }

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPass1!' });

    expect(res.status).toBe(429);
  }, 15000);
});
