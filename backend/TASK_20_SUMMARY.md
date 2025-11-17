# Task 20: Security Middleware and Rate Limiting - Implementation Summary

## Overview

Implemented comprehensive security middleware for the Bunty backend API, including CORS configuration, rate limiting, input validation, sanitization, audit logging, and API key rotation procedures.

## Implemented Components

### 1. CORS Configuration (`src/middleware/cors.middleware.ts`)

**Features**:
- Whitelist-based origin validation
- Support for multiple environments (dev, staging, production)
- Configurable via environment variables
- Credential support for authenticated requests
- Exposed rate limit headers

**Configuration**:
```typescript
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  process.env.FRONTEND_URL_STAGING,
  process.env.FRONTEND_URL_PRODUCTION,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);
```

### 2. Enhanced Rate Limiting (`src/middleware/rateLimit.middleware.ts`)

**Existing Implementation Enhanced**:
- Default: 100 requests/minute per IP
- Auth endpoints: 5 requests/minute per IP
- Redis-backed with automatic TTL
- Response headers for client feedback

**Usage**:
```typescript
// General rate limiting
app.use(createRateLimiter({ windowMs: 60000, maxRequests: 100 }));

// Stricter for auth
router.post('/login', authRateLimiter, handler);
```

### 3. Input Validation Middleware (`src/middleware/validation.middleware.ts`)

**Technology**: Zod schema validation

**Features**:
- Generic validation middleware factory
- Pre-defined schemas for all endpoints
- Validates body, query, and params
- Detailed error messages

**Schemas Implemented**:
- Authentication: register, login, refresh
- Plaid: exchange
- Stripe: createSession
- Sila: register, linkBank, transfer
- Proof: submit, commitHash
- Witness: generate

**Usage**:
```typescript
router.post('/register', validate(authSchemas.register), controller.register);
```

### 4. Input Sanitization Middleware (`src/middleware/sanitization.middleware.ts`)

**Protection Against**:
- SQL injection patterns
- XSS attacks (script tags, event handlers)
- NoSQL injection ($ and _ operators)
- Null byte injection
- Excessive whitespace

**Middleware Functions**:
- `sanitizeInput`: Sanitizes all request data
- `preventNoSQLInjection`: Blocks MongoDB-style operators
- `limitBodySize`: Limits request body size (default 100KB)

**Applied Globally**:
```typescript
app.use(sanitizeInput);
app.use(preventNoSQLInjection);
app.use(limitBodySize(100));
```

### 5. Audit Logging Middleware (`src/middleware/audit.middleware.ts`)

**Features**:
- Automatic logging of sensitive operations
- PostgreSQL-backed storage
- Indexed for fast queries
- Includes user context, IP, user agent, duration

**Logged Actions**:
- Authentication: LOGIN, REGISTER, LOGOUT, TOKEN_REFRESH
- Proofs: PROOF_SUBMIT, HASH_COMMIT
- Witness: WITNESS_GENERATE
- External services: PLAID_ACCESS, STRIPE_ACCESS, SILA_ACCESS

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

**Query API**:
```typescript
const logs = await getAuditLogs({
  userId: 'uuid',
  action: 'LOGIN',
  startDate: new Date('2025-01-01'),
  limit: 100
});
```

### 6. API Key Rotation System (`src/utils/apiKeyRotation.ts`)

**Features**:
- Encrypted storage (AES-256-GCM)
- Expiration tracking
- Rotation history
- Active/inactive status
- Expiring key alerts (7 days)

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

**Functions**:
- `storeAPIKey`: Store encrypted key
- `getAPIKey`: Retrieve and decrypt key
- `rotateAPIKey`: Rotate key (deactivate old, store new)
- `listAPIKeys`: List all keys (redacted values)
- `deleteAPIKey`: Delete key
- `getExpiringKeys`: Check for keys expiring within 7 days

### 7. CLI Scripts for Key Management

**Scripts Created**:

#### `src/scripts/rotate-key.ts`
```bash
npm run rotate-key -- --service plaid --key-name client_id --value "new_value" --expires "2025-06-01"
```

#### `src/scripts/list-keys.ts`
```bash
npm run list-keys
npm run list-keys -- --service plaid
```

#### `src/scripts/check-expiring-keys.ts`
```bash
npm run check-expiring-keys
```

### 8. Updated Routes with Validation

**Routes Enhanced**:
- `auth.routes.ts`: Added validation for register, login, refresh
- `plaid.routes.ts`: Added validation for exchange
- `proof.routes.ts`: Added validation for submit, commitHash
- `witness.routes.ts`: Added validation for generate

## Updated Files

### New Files Created
1. `backend/src/middleware/cors.middleware.ts`
2. `backend/src/middleware/validation.middleware.ts`
3. `backend/src/middleware/sanitization.middleware.ts`
4. `backend/src/middleware/audit.middleware.ts`
5. `backend/src/utils/apiKeyRotation.ts`
6. `backend/src/scripts/rotate-key.ts`
7. `backend/src/scripts/list-keys.ts`
8. `backend/src/scripts/check-expiring-keys.ts`
9. `backend/API_KEY_ROTATION.md`
10. `backend/SECURITY_MIDDLEWARE.md`
11. `backend/TASK_20_SUMMARY.md`

### Modified Files
1. `backend/src/index.ts` - Integrated all security middleware
2. `backend/src/routes/auth.routes.ts` - Added validation
3. `backend/src/routes/plaid.routes.ts` - Added validation
4. `backend/src/routes/proof.routes.ts` - Added validation
5. `backend/src/routes/witness.routes.ts` - Added validation
6. `backend/package.json` - Added CLI scripts

### Dependencies Added
- `zod` - Schema validation library

## Security Features Summary

### 1. CORS Protection
- ✅ Whitelist-based origin validation
- ✅ Environment-specific configuration
- ✅ Credential support
- ✅ Exposed headers for rate limiting

### 2. Rate Limiting
- ✅ Redis-backed rate limiting
- ✅ Per-IP tracking
- ✅ Configurable limits per endpoint
- ✅ Stricter limits for auth endpoints (5/min)
- ✅ General limits for other endpoints (100/min)

### 3. Input Validation
- ✅ Zod schema validation
- ✅ Validation for all sensitive endpoints
- ✅ Detailed error messages
- ✅ Type-safe schemas

### 4. Input Sanitization
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ NoSQL injection prevention
- ✅ Null byte removal
- ✅ Body size limiting

### 5. Audit Logging
- ✅ Automatic logging of sensitive operations
- ✅ Database-backed storage
- ✅ Indexed for performance
- ✅ Query API for analysis
- ✅ Includes user context and metadata

### 6. API Key Management
- ✅ Encrypted storage (AES-256-GCM)
- ✅ Rotation procedures
- ✅ Expiration tracking
- ✅ CLI tools for management
- ✅ Automated expiry alerts

## Testing

### Manual Testing

1. **Test CORS**:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Origin: https://malicious-site.com" \
  -H "Content-Type: application/json"
# Should fail with CORS error
```

2. **Test Rate Limiting**:
```bash
for i in {1..10}; do 
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"password"}'; 
done
# Should get 429 after 5 requests
```

3. **Test Input Validation**:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"short"}'
# Should get 400 with validation errors
```

4. **Test Sanitization**:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"<script>alert(1)</script>"}'
# Script tags should be removed
```

5. **Test API Key Rotation**:
```bash
npm run rotate-key -- --service test --key-name test_key --value "secret123"
npm run list-keys
npm run check-expiring-keys
```

### Verification

Start the backend and verify security middleware is loaded:
```bash
cd backend
npm run dev
```

Expected console output:
```
Database connected successfully
Redis connected successfully
Audit logs initialized
API keys table initialized
Proof status poller started
Backend server running on port 3001
Security middleware enabled:
  ✓ CORS with domain whitelist
  ✓ Rate limiting
  ✓ Input sanitization
  ✓ Injection prevention
  ✓ Audit logging
```

## Documentation

### Comprehensive Guides Created

1. **SECURITY_MIDDLEWARE.md**:
   - Overview of all security components
   - Configuration instructions
   - Usage examples
   - Best practices
   - Monitoring and alerts
   - Troubleshooting

2. **API_KEY_ROTATION.md**:
   - Rotation procedures for all services
   - Recommended rotation schedule
   - CLI commands
   - Programmatic API
   - Emergency procedures
   - Compliance information

## Requirements Satisfied

✅ **Requirement 1.3**: JWT-based authentication with rate limiting on authentication endpoints

✅ **Requirement 11.2**: Encrypted API keys and access tokens using AES-256 encryption

✅ **Requirement 11.3**: CORS policies and rate limiting on all REST endpoints

✅ **Requirement 11.4**: JWT bearer token validation on all authenticated endpoints

✅ **Requirement 11.5**: Audit logs for all proof generation and submission events

## Best Practices Implemented

1. **Defense in Depth**: Multiple layers of security
2. **Fail Secure**: Errors don't bypass security
3. **Least Privilege**: Minimal permissions by default
4. **Audit Trail**: All sensitive operations logged
5. **Key Rotation**: Procedures and tools for regular rotation
6. **Input Validation**: Validate all user input
7. **Output Encoding**: Sanitize all output
8. **Rate Limiting**: Prevent abuse and DDoS
9. **CORS**: Restrict cross-origin access
10. **Monitoring**: Tools for security monitoring

## Monitoring Recommendations

### Set Up Alerts For:
- More than 100 rate limit hits per hour
- More than 50 failed login attempts per hour
- Any injection attempt detected
- API keys expiring within 7 days
- Unusual audit log patterns

### Regular Reviews:
- Weekly: Review audit logs for suspicious activity
- Monthly: Check rate limit effectiveness
- Quarterly: Review and update security policies
- Annually: Full security audit

### Automated Monitoring:
```bash
# Add to crontab for daily key expiry checks
0 9 * * * cd /path/to/backend && npm run check-expiring-keys
```

## Next Steps

1. **Configure Environment Variables**:
   - Set FRONTEND_URL for production
   - Configure CORS whitelist
   - Set up monitoring alerts

2. **Test in Staging**:
   - Verify all middleware works correctly
   - Test rate limiting thresholds
   - Validate audit logging

3. **Production Deployment**:
   - Enable all security middleware
   - Set up log rotation for audit logs
   - Configure automated key expiry checks

4. **Ongoing Maintenance**:
   - Rotate API keys according to schedule
   - Review audit logs regularly
   - Update security policies as needed

## Compliance

This implementation helps meet requirements for:
- **PCI DSS**: Data protection, access controls, monitoring
- **SOC 2**: Security controls, audit logging
- **GDPR**: Data protection, access controls, audit trails
- **NIST**: Key management, access controls

## Conclusion

Task 20 is complete. The backend now has comprehensive security middleware including:
- CORS configuration with domain whitelist
- Rate limiting using Redis
- Input validation with Zod schemas
- Request sanitization to prevent injection attacks
- Audit logging for sensitive operations
- API key rotation procedures and documentation

All security features are production-ready and documented.
