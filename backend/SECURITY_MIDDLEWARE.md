# Security Middleware Documentation

This document describes the security middleware implemented in the Bunty backend to protect against common vulnerabilities and attacks.

## Overview

The backend implements multiple layers of security middleware to ensure:
- Protection against injection attacks
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS policy enforcement
- Audit logging for compliance
- Secure API key management

## Middleware Components

### 1. CORS Configuration (`cors.middleware.ts`)

**Purpose**: Control which domains can access the API

**Features**:
- Whitelist-based origin validation
- Support for multiple environments (dev, staging, production)
- Credential support for authenticated requests
- Exposed rate limit headers

**Configuration**:
```typescript
// Environment variables
FRONTEND_URL=http://localhost:3000
FRONTEND_URL_STAGING=https://staging.bunty.app
FRONTEND_URL_PRODUCTION=https://bunty.app
```

**Allowed Methods**: GET, POST, PUT, DELETE, PATCH, OPTIONS

**Allowed Headers**: Content-Type, Authorization, X-Requested-With

**Exposed Headers**: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

### 2. Rate Limiting (`rateLimit.middleware.ts`)

**Purpose**: Prevent abuse and DDoS attacks

**Default Configuration**:
- Window: 60 seconds
- Max Requests: 100 per window per IP

**Stricter Limits for Auth Endpoints**:
- Window: 60 seconds
- Max Requests: 5 per window per IP

**Storage**: Redis (with automatic TTL)

**Response Headers**:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window

**Error Response** (429 Too Many Requests):
```json
{
  "error": {
    "code": "RATE_LIMIT_001",
    "message": "Too many requests, please try again later",
    "timestamp": 1234567890
  }
}
```

### 3. Input Validation (`validation.middleware.ts`)

**Purpose**: Validate request data against schemas

**Technology**: Zod schema validation

**Validation Sources**:
- Request body
- Query parameters
- URL parameters

**Available Schemas**:

#### Authentication
- `authSchemas.register`: Email and password validation
- `authSchemas.login`: Login credentials
- `authSchemas.refresh`: Refresh token validation

#### Plaid
- `plaidSchemas.exchange`: Public token validation

#### Stripe
- `stripeSchemas.createSession`: Session creation validation

#### Sila
- `silaSchemas.register`: User registration data
- `silaSchemas.linkBank`: Bank account linking
- `silaSchemas.transfer`: Transfer validation

#### Proof
- `proofSchemas.submit`: Proof submission validation
- `proofSchemas.commitHash`: Hash commitment validation

#### Witness
- `witnessSchemas.generate`: Witness generation options

**Error Response** (400 Bad Request):
```json
{
  "error": {
    "code": "VALIDATION_001",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "timestamp": 1234567890
  }
}
```

**Usage Example**:
```typescript
import { validate, authSchemas } from '../middleware/validation.middleware';

router.post('/register', validate(authSchemas.register), controller.register);
```

### 4. Input Sanitization (`sanitization.middleware.ts`)

**Purpose**: Remove potentially dangerous characters and patterns

**Protection Against**:
- SQL injection (basic patterns)
- XSS attacks (script tags, event handlers)
- NoSQL injection ($ and _ prefixes)
- Null byte injection
- Excessive whitespace

**Features**:
- Recursive object sanitization
- String sanitization
- Array sanitization
- Body size limiting

**Middleware Functions**:

#### `sanitizeInput`
Sanitizes request body, query, and params automatically.

#### `preventNoSQLInjection`
Blocks requests with MongoDB-style operators ($, _).

**Error Response** (400 Bad Request):
```json
{
  "error": {
    "code": "INJECTION_001",
    "message": "Potentially malicious input detected",
    "timestamp": 1234567890
  }
}
```

#### `limitBodySize`
Limits request body size (default: 100KB).

**Error Response** (413 Payload Too Large):
```json
{
  "error": {
    "code": "PAYLOAD_001",
    "message": "Request body too large. Maximum size is 100KB",
    "timestamp": 1234567890
  }
}
```

### 5. Audit Logging (`audit.middleware.ts`)

**Purpose**: Log sensitive operations for compliance and security monitoring

**Logged Actions**:
- LOGIN, REGISTER, LOGOUT, TOKEN_REFRESH
- PROOF_SUBMIT, HASH_COMMIT
- WITNESS_GENERATE
- PLAID_ACCESS, STRIPE_ACCESS, SILA_ACCESS

**Logged Information**:
- User ID (if authenticated)
- Action type
- Resource type
- HTTP method and path
- IP address
- User agent
- Status code
- Error message (if applicable)
- Request duration
- Timestamp

**Database Schema**:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(500) NOT NULL,
  ip VARCHAR(45) NOT NULL,
  user_agent TEXT,
  status_code INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Query Audit Logs**:
```typescript
import { getAuditLogs } from '../middleware/audit.middleware';

const logs = await getAuditLogs({
  userId: 'user-uuid',
  action: 'LOGIN',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  limit: 100
});
```

### 6. API Key Rotation (`apiKeyRotation.ts`)

**Purpose**: Securely manage and rotate API keys

**Features**:
- Encrypted storage (AES-256-GCM)
- Expiration tracking
- Rotation history
- Active/inactive status
- Expiring key alerts

**Database Schema**:
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  service VARCHAR(50) NOT NULL,
  key_name VARCHAR(100) NOT NULL,
  encrypted_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  rotated_at TIMESTAMP,
  UNIQUE(service, key_name)
);
```

**CLI Commands**:

```bash
# Rotate a key
npm run rotate-key -- --service plaid --key-name client_id --value "new_value" --expires "2025-06-01"

# List all keys
npm run list-keys

# List keys for specific service
npm run list-keys -- --service plaid

# Check for expiring keys
npm run check-expiring-keys
```

**Programmatic API**:
```typescript
import { storeAPIKey, getAPIKey, rotateAPIKey } from '../utils/apiKeyRotation';

// Store a key
await storeAPIKey('plaid', 'client_id', 'value', new Date('2025-06-01'));

// Retrieve a key
const key = await getAPIKey('plaid', 'client_id');

// Rotate a key
await rotateAPIKey('plaid', 'client_id', 'new_value', new Date('2025-09-01'));
```

## Security Best Practices

### 1. Environment Variables

Never commit sensitive values to version control. Use environment variables:

```bash
# Required
ENCRYPTION_KEY=64_hex_characters
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Optional (for CORS)
FRONTEND_URL=http://localhost:3000
FRONTEND_URL_STAGING=https://staging.bunty.app
FRONTEND_URL_PRODUCTION=https://bunty.app

# External Services
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
STRIPE_SECRET_KEY=your_stripe_key
SILA_APP_HANDLE=your_sila_handle
SILA_PRIVATE_KEY=your_sila_key
```

### 2. HTTPS/TLS

Always use HTTPS in production:
- Prevents man-in-the-middle attacks
- Protects credentials in transit
- Required for secure cookies

### 3. Rate Limiting

Adjust rate limits based on your needs:

```typescript
// Stricter for sensitive endpoints
router.post('/login', createRateLimiter({ maxRequests: 5 }), handler);

// More lenient for read operations
router.get('/data', createRateLimiter({ maxRequests: 200 }), handler);
```

### 4. Input Validation

Always validate input before processing:

```typescript
// Define schema
const schema = z.object({
  email: z.string().email(),
  amount: z.number().positive()
});

// Apply validation
router.post('/endpoint', validate(schema), handler);
```

### 5. Audit Logging

Review audit logs regularly:

```sql
-- Check failed login attempts
SELECT * FROM audit_logs
WHERE action = 'LOGIN' AND status_code >= 400
ORDER BY created_at DESC;

-- Check proof submissions
SELECT * FROM audit_logs
WHERE action = 'PROOF_SUBMIT'
ORDER BY created_at DESC;

-- Check suspicious activity from IP
SELECT * FROM audit_logs
WHERE ip = '1.2.3.4'
ORDER BY created_at DESC;
```

### 6. Key Rotation

Rotate keys regularly:
- Plaid: Every 90 days
- Stripe: Every 90 days
- Sila: Every 90 days
- JWT Secret: Every 180 days
- Encryption Key: Every 365 days

Set up automated alerts:
```bash
# Add to crontab
0 9 * * * cd /path/to/backend && npm run check-expiring-keys
```

## Monitoring and Alerts

### Metrics to Monitor

1. **Rate Limit Hits**: Track 429 responses
2. **Validation Failures**: Track 400 responses
3. **Authentication Failures**: Track 401/403 responses
4. **Injection Attempts**: Track INJECTION_001 errors
5. **Audit Log Volume**: Unusual spikes may indicate attacks

### Alert Conditions

- More than 100 rate limit hits per hour
- More than 50 failed login attempts per hour
- Any injection attempt detected
- API key expiring within 7 days
- Unusual audit log patterns

## Compliance

This security implementation helps meet requirements for:

- **PCI DSS**: Data protection, access controls, monitoring
- **SOC 2**: Security controls, audit logging
- **GDPR**: Data protection, access controls, audit trails
- **HIPAA**: Access controls, audit logging (if handling health data)

## Testing Security

### Test Rate Limiting

```bash
# Should succeed
for i in {1..5}; do curl http://localhost:3001/api/auth/login; done

# Should fail with 429
for i in {1..10}; do curl http://localhost:3001/api/auth/login; done
```

### Test Input Validation

```bash
# Should fail with 400
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"short"}'
```

### Test CORS

```bash
# Should fail if origin not whitelisted
curl -X POST http://localhost:3001/api/auth/login \
  -H "Origin: https://malicious-site.com" \
  -H "Content-Type: application/json"
```

### Test Injection Prevention

```bash
# Should be sanitized or blocked
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"<script>alert(1)</script>"}'
```

## Troubleshooting

### CORS Errors

**Problem**: Frontend can't access API

**Solution**: Add frontend URL to whitelist
```bash
export FRONTEND_URL=http://localhost:3000
```

### Rate Limit Issues

**Problem**: Legitimate users getting rate limited

**Solution**: Increase limits or use IP whitelisting
```typescript
// Whitelist specific IPs
if (req.ip === 'trusted.ip.address') {
  return next();
}
```

### Validation Errors

**Problem**: Valid requests being rejected

**Solution**: Check schema definitions and update as needed

### Audit Log Growth

**Problem**: Database growing too large

**Solution**: Implement log rotation
```sql
-- Delete logs older than 90 days
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
```

## Support

For security issues or questions:
1. Check this documentation
2. Review audit logs for clues
3. Check application logs
4. Contact security team for incidents
5. See API_KEY_ROTATION.md for key management

## Updates

This security middleware should be reviewed and updated:
- Quarterly for general review
- Immediately for security vulnerabilities
- When adding new endpoints
- When compliance requirements change
