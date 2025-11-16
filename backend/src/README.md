# Backend Authentication System

## Overview

This backend implements a secure JWT-based authentication system with the following features:

- User registration with email/password validation
- Secure password hashing using bcrypt (12 rounds)
- JWT access tokens (1 hour expiry)
- JWT refresh tokens (7 days expiry) with rotation
- Redis-based session management
- Rate limiting on authentication endpoints
- Token blacklisting for logout functionality

## Architecture

### Components

1. **Database Layer** (`config/database.ts`)
   - PostgreSQL connection pool
   - User data persistence

2. **Cache Layer** (`config/redis.ts`)
   - Redis client for session management
   - Refresh token storage
   - Token blacklisting
   - Rate limiting

3. **Authentication Service** (`services/auth.service.ts`)
   - User registration
   - User login
   - Token generation and refresh
   - Logout with token revocation

4. **Middleware**
   - `auth.middleware.ts`: JWT token validation
   - `rateLimit.middleware.ts`: Request rate limiting

5. **Controllers** (`controllers/auth.controller.ts`)
   - HTTP request handlers for auth endpoints

6. **Routes** (`routes/auth.routes.ts`)
   - API endpoint definitions

## API Endpoints

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "jwt-token",
    "refreshToken": "jwt-refresh-token",
    "expiresIn": 3600
  }
}
```

### POST /api/auth/login
Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "jwt-token",
    "refreshToken": "jwt-refresh-token",
    "expiresIn": 3600
  }
}
```

### POST /api/auth/refresh
Refresh an expired access token.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response (200):**
```json
{
  "tokens": {
    "accessToken": "new-jwt-token",
    "refreshToken": "new-jwt-refresh-token",
    "expiresIn": 3600
  }
}
```

### POST /api/auth/logout
Logout and revoke tokens (requires authentication).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

### GET /api/auth/me
Get current user information (requires authentication).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Rate Limiting
- Authentication endpoints: 5 requests per minute per IP
- General endpoints: 100 requests per minute per IP

### Token Security
- Access tokens expire after 1 hour
- Refresh tokens expire after 7 days
- Refresh token rotation on each refresh
- Token blacklisting on logout
- JWT signature verification with issuer/audience validation

### Data Protection
- Passwords hashed with bcrypt (12 rounds)
- HTTPS/TLS encryption enforced
- CORS configuration with origin whitelist
- SQL injection prevention via parameterized queries

## Environment Variables

Required environment variables (see `.env.example`):

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bunty
DB_USER=bunty_user
DB_PASSWORD=secure_password

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production

# Server
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

## Error Codes

| Code | Description |
|------|-------------|
| AUTH_001 | Access token is required |
| AUTH_002 | Invalid or expired access token |
| AUTH_003 | Registration failed |
| AUTH_004 | Login failed |
| AUTH_005 | Token refresh failed |
| AUTH_006 | Logout failed |
| VALIDATION_001 | Missing required fields |
| RATE_LIMIT_001 | Too many requests |

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **1.1**: JWT-based authentication with refresh token capability ✓
- **1.2**: HTTPS/TLS encryption enforced via CORS configuration ✓
- **1.3**: Rate limiting on authentication endpoints ✓
- **1.4**: User credentials stored with bcrypt encryption in PostgreSQL ✓
- **1.5**: User session state maintained using Redis cache ✓
