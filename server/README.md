# AtomicTask Authentication Module

AtomicTask is a modern task and habit tracking SaaS focused on helping people stay consistent, productive, and accountable. This backend module provides production-ready authentication and authorization for the platform, including email verification, secure login, refresh token rotation, password resets, and account protection.

## Requirements

- Node.js 20.19 or later
- MongoDB instance
- Redis is not integrated; rate limits currently use process-local memory, so multi-instance deployments need a shared rate-limit store

## Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
4. Update the values in `.env`.
5. Start the dev server:
   ```bash
   npm run dev
   ```

## Environment Variables

| Name | Required | Default | Description |
|---|---|---:|---|
| NODE_ENV | No | development | Application environment |
| PORT | No | 5000 | HTTP port |
| PROJECT_NAME | No | AtomicTask | App name used in responses |
| CLIENT_URL | No | http://localhost:3000 | Frontend origin |
| MONGODB_URI | Yes | - | MongoDB connection string |
| JWT_SECRET | Yes | - | Access token signing secret |
| JWT_REFRESH_SECRET | Yes | - | Refresh token signing secret |
| JWT_EXPIRES_IN | No | 15m | Access token expiration |
| JWT_REFRESH_EXPIRES_IN | No | 30d | Refresh token expiration |
| BCRYPT_ROUNDS | No | 12 | Password hashing cost |
| REDIS_URL | No | empty | Reserved for future Redis integration; currently unused |
| SMTP_HOST | No | localhost | SMTP host |
| SMTP_PORT | No | 1025 | SMTP port |
| SMTP_USER | No | empty | SMTP username |
| SMTP_PASS | No | empty | SMTP password |
| SMTP_FROM | No | noreply@atomictask.local | Sender email |
| LOG_LEVEL | No | info | Winston log level |
| COOKIE_SECURE | No | false | Secure cookie flag |
| TRUST_PROXY | No | 1 | Proxy trust setting |

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Tests
```bash
npm test
```

## API Reference

### Register
- Method: POST
- Path: `/api/v1/auth/register`
- Auth: None
- Rate limit: 5 requests / hour per IP

Request body:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password1!",
  "confirmPassword": "Password1!"
}
```

Success response:
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": { "user": { "_id": "...", "name": "Jane Doe", "email": "jane@example.com" } },
  "project": "AtomicTask",
  "timestamp": "2026-09-28T00:00:00.000Z"
}
```

Curl:
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"Password1!","confirmPassword":"Password1!"}'
```

### Verify Email
- Method: POST
- Path: `/api/v1/auth/verify-email`
- Auth: None

Request body:
```json
{
  "email": "jane@example.com",
  "token": "64-char-hex-token"
}
```

### Resend Verification Email
- Method: POST
- Path: `/api/v1/auth/resend-verification`
- Auth: None

### Login
- Method: POST
- Path: `/api/v1/auth/login`
- Auth: None
- Rate limit: 5 requests / 15 min per IP + email

Request body:
```json
{
  "email": "jane@example.com",
  "password": "Password1!"
}
```

Success response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "_id": "...", "name": "Jane Doe", "email": "jane@example.com" },
    "accessToken": "jwt-token"
  }
}
```

Curl:
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"jane@example.com","password":"Password1!"}'
```

### Refresh Token
- Method: POST
- Path: `/api/v1/auth/refresh`
- Auth: Refresh cookie

### Logout
- Method: POST
- Path: `/api/v1/auth/logout`
- Auth: JWT + refresh cookie

### Logout All Sessions
- Method: POST
- Path: `/api/v1/auth/logout-all`
- Auth: JWT

### Get Current User
- Method: GET
- Path: `/api/v1/auth/me`
- Auth: JWT

### Forgot Password
- Method: POST
- Path: `/api/v1/auth/forgot-password`
- Auth: None

### Reset Password
- Method: POST
- Path: `/api/v1/auth/reset-password`
- Auth: None

Request body:
```json
{
  "token": "64-char-hex-token",
  "password": "NewPassword1!",
  "confirmPassword": "NewPassword1!"
}
```

### Change Password
- Method: POST
- Path: `/api/v1/auth/change-password`
- Auth: JWT

Request body:
```json
{
  "currentPassword": "Password1!",
  "newPassword": "Password2!",
  "confirmPassword": "Password2!"
}
```

## Health Check

- Method: GET
- Path: `/api/v1/health`
- Auth: None

Example response:
```json
{
  "success": true,
  "message": "Server healthy",
  "data": {
    "uptime": 123.45,
    "environment": "development",
    "mongo": "connected",
    "redis": "not-integrated"
  },
  "project": "AtomicTask",
  "timestamp": "2026-09-28T00:00:00.000Z",
  "requestId": "..."
}
```

## Auth Flow

```text
register -> verify email -> login -> use access token -> refresh -> logout
```

## Security Notes

- Passwords are hashed with bcrypt using cost 12.
- Access tokens are JWTs with 15 minute expiry.
- Refresh tokens are JWTs with 30 day expiry and stored in MongoDB with revocation tracking.
- Refresh tokens are rotated on use and revoked on logout.
- Email verification and password reset tokens are hashed before storage.
- Rate limiting is enabled for signup, login, and password reset attempts.
- Helmet, CORS, and compression are enabled.
- The app uses a request ID on every request and logs structured events via Winston.
- Rate limits use process-local memory. Configure a shared rate-limit store before running multiple application instances.

## Project Structure

```text
server/
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── src/
│   ├── app.js                 # Express app setup and route mounting
│   ├── server.js              # HTTP server bootstrap with graceful shutdown
│   ├── config/
│   │   ├── index.js           # Central config + env validation
│   │   └── passport.js        # Passport strategy registration
│   ├── db/
│   │   └── mongoose.js        # MongoDB connection
│   ├── models/
│   │   ├── User.js            # User schema and methods
│   │   └── RefreshToken.js   # Refresh token persistence
│   ├── middleware/
│   │   ├── auth.js            # Auth and role middleware
│   │   ├── validate.js        # Express-validator runner
│   │   ├── rateLimiter.js     # Login/register/reset limiters
│   │   ├── errorHandler.js    # Central error handler
│   │   └── notFound.js        # 404 route handler
│   ├── validators/
│   │   └── auth.validator.js  # Validation chains for auth endpoints
│   ├── controllers/
│   │   └── auth.controller.js # Thin controller layer
│   ├── services/
│   │   ├── auth.service.js    # Business logic
│   │   ├── token.service.js   # Token issuance and refresh logic
│   │   └── email.service.js   # Email wrapper with dev fallback
│   ├── utils/
│   │   ├── ApiError.js        # Custom error class
│   │   ├── ApiResponse.js     # Response wrapper
│   │   ├── asyncHandler.js    # Async wrapper
│   │   ├── logger.js          # Winston logger
│   │   └── constants.js       # Roles and common codes
│   ├── routes/
│   │   ├── index.js           # API mount point
│   │   └── auth.routes.js     # Auth endpoint routes
│   └── tests/
│       └── auth.test.js      # Auth integration tests
└── logs/
    └── app.log               # Logging output
```

## Definition of Done

- [x] npm install && npm run dev starts the server with clear logs
- [x] curl register → verify → login → /me → refresh → logout works end-to-end
- [x] npm test — all tests pass
- [x] No console.log usage; logging is centralized
- [x] No secrets committed
- [x] No TypeScript, no ESM, no dead code, no TODOs
- [x] Response envelopes are consistent throughout the API
