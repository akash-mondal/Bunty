# Security Middleware Test Checklist

This checklist helps verify that all security middleware is working correctly.

## Prerequisites

- Backend server running on port 3001
- Redis running on port 6379
- PostgreSQL database connected
- Environment variables configured

## 1. CORS Configuration

### Test 1.1: Allowed Origin
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' \
  -v
```
**Expected**: Request succeeds, CORS headers present

### Test 1.2: Blocked Origin
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Origin: https://malicious-site.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' \
  -v
```
**Expected**: CORS error, request blocked

### Test 1.3: Preflight Request
```bash
curl -X OPTIONS http://localhost:3001/api/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v
```
**Expected**: 200 OK with CORS headers

## 2. Rate Limiting

### Test 2.1: General Rate Limit
```bash
for i in {1..101}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/health
done
```
**Expected**: First 100 return 200, 101st returns 429

### Test 2.2: Auth Rate Limit
```bash
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```
**Expected**: First 5 return 400/401, 6th returns 429

### Test 2.3: Rate Limit Headers
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}' \
  -v
```
**Expected**: Headers include X-RateLimit-Limit and X-RateLimit-Remaining

## 3. Input Validation

### Test 3.1: Invalid Email Format
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","password":"password123"}'
```
**Expected**: 400 with validation error for email

### Test 3.2: Short Password
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"short"}'
```
**Expected**: 400 with validation error for password

### Test 3.3: Missing Required Field
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'
```
**Expected**: 400 with validation error for missing password

### Test 3.4: Valid Input
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
```
**Expected**: 200 or 201 with success response

## 4. Input Sanitization

### Test 4.1: XSS Prevention
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"<script>alert(1)</script>"}'
```
**Expected**: Script tags removed or sanitized

### Test 4.2: SQL Injection Prevention
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password OR 1=1"}'
```
**Expected**: SQL keywords sanitized, login fails normally

### Test 4.3: NoSQL Injection Prevention
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":{"$ne":""}}'
```
**Expected**: 400 with injection detection error

### Test 4.4: Null Byte Injection
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com\u0000admin","password":"password123"}'
```
**Expected**: Null bytes removed

## 5. Body Size Limiting

### Test 5.1: Normal Size Request
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
```
**Expected**: 200 or 201, request succeeds

### Test 5.2: Oversized Request
```bash
# Generate large payload (>100KB)
python3 -c "import json; print(json.dumps({'email':'test@test.com','password':'x'*200000}))" | \
  curl -X POST http://localhost:3001/api/auth/register \
    -H "Content-Type: application/json" \
    -d @-
```
**Expected**: 413 Payload Too Large

## 6. Audit Logging

### Test 6.1: Login Audit
```bash
# Perform login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Check audit log
psql -U bunty_user -d bunty -c "SELECT * FROM audit_logs WHERE action='LOGIN' ORDER BY created_at DESC LIMIT 1;"
```
**Expected**: Audit log entry created with LOGIN action

### Test 6.2: Failed Login Audit
```bash
# Perform failed login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'

# Check audit log
psql -U bunty_user -d bunty -c "SELECT * FROM audit_logs WHERE action='LOGIN' AND status_code >= 400 ORDER BY created_at DESC LIMIT 1;"
```
**Expected**: Audit log entry with error status

### Test 6.3: Proof Submission Audit
```bash
# Submit proof (requires auth token)
curl -X POST http://localhost:3001/api/proof/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"proof":"test","publicInputs":[],"nullifier":"test","threshold":1000,"signedTx":"test"}'

# Check audit log
psql -U bunty_user -d bunty -c "SELECT * FROM audit_logs WHERE action='PROOF_SUBMIT' ORDER BY created_at DESC LIMIT 1;"
```
**Expected**: Audit log entry with PROOF_SUBMIT action

## 7. API Key Rotation

### Test 7.1: Store API Key
```bash
npm run rotate-key -- --service test --key-name test_key --value "secret123" --expires "2025-12-31"
```
**Expected**: Success message, key stored

### Test 7.2: List API Keys
```bash
npm run list-keys
```
**Expected**: List of all keys (values redacted)

### Test 7.3: List Keys by Service
```bash
npm run list-keys -- --service test
```
**Expected**: List of keys for 'test' service only

### Test 7.4: Check Expiring Keys
```bash
npm run check-expiring-keys
```
**Expected**: List of keys expiring within 7 days (or none)

### Test 7.5: Rotate Existing Key
```bash
npm run rotate-key -- --service test --key-name test_key --value "new_secret456"
```
**Expected**: Old key deactivated, new key stored

### Test 7.6: Verify Rotation in Database
```bash
psql -U bunty_user -d bunty -c "SELECT service, key_name, is_active, rotated_at FROM api_keys WHERE service='test' ORDER BY created_at DESC;"
```
**Expected**: Two entries, old inactive, new active

## 8. Authentication Middleware

### Test 8.1: Protected Route Without Token
```bash
curl -X GET http://localhost:3001/api/auth/me
```
**Expected**: 401 Unauthorized

### Test 8.2: Protected Route With Invalid Token
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer invalid_token"
```
**Expected**: 403 Forbidden

### Test 8.3: Protected Route With Valid Token
```bash
# First login to get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' | \
  jq -r '.accessToken')

# Use token
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200 OK with user data

## 9. Error Handling

### Test 9.1: Validation Error Format
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"short"}'
```
**Expected**: JSON with error.code, error.message, error.details, error.timestamp

### Test 9.2: Rate Limit Error Format
```bash
# Trigger rate limit first, then:
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}'
```
**Expected**: JSON with error.code='RATE_LIMIT_001'

### Test 9.3: Injection Error Format
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":{"$ne":""}}'
```
**Expected**: JSON with error.code='INJECTION_001'

## 10. Integration Tests

### Test 10.1: Complete Registration Flow
```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@test.com","password":"password123"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@test.com","password":"password123"}'

# Check audit logs
psql -U bunty_user -d bunty -c "SELECT action, status_code FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE email='newuser@test.com') ORDER BY created_at;"
```
**Expected**: Both REGISTER and LOGIN in audit logs

### Test 10.2: Rate Limit Recovery
```bash
# Trigger rate limit
for i in {1..6}; do
  curl -s -o /dev/null http://localhost:3001/api/auth/login \
    -X POST -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done

# Wait 61 seconds
sleep 61

# Try again
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
```
**Expected**: Rate limit resets, request succeeds

## Database Verification

### Check Audit Logs Table
```sql
SELECT COUNT(*) FROM audit_logs;
SELECT action, COUNT(*) FROM audit_logs GROUP BY action;
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

### Check API Keys Table
```sql
SELECT COUNT(*) FROM api_keys;
SELECT service, key_name, is_active FROM api_keys;
SELECT * FROM api_keys WHERE is_active = TRUE;
```

## Monitoring Queries

### Failed Login Attempts (Last Hour)
```sql
SELECT COUNT(*), ip
FROM audit_logs
WHERE action = 'LOGIN'
  AND status_code >= 400
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip
ORDER BY COUNT(*) DESC;
```

### Rate Limit Hits (Last Hour)
```sql
SELECT COUNT(*)
FROM audit_logs
WHERE status_code = 429
  AND created_at > NOW() - INTERVAL '1 hour';
```

### Injection Attempts
```sql
SELECT *
FROM audit_logs
WHERE error_message LIKE '%injection%'
ORDER BY created_at DESC;
```

### API Key Expiry Status
```sql
SELECT service, key_name, expires_at,
  CASE
    WHEN expires_at < NOW() THEN 'EXPIRED'
    WHEN expires_at < NOW() + INTERVAL '7 days' THEN 'EXPIRING SOON'
    ELSE 'VALID'
  END as status
FROM api_keys
WHERE is_active = TRUE
ORDER BY expires_at;
```

## Success Criteria

All tests should pass with expected results:
- ✅ CORS blocks unauthorized origins
- ✅ Rate limiting prevents abuse
- ✅ Input validation catches invalid data
- ✅ Sanitization removes dangerous patterns
- ✅ Body size limiting prevents large payloads
- ✅ Audit logging captures sensitive operations
- ✅ API key rotation works correctly
- ✅ Authentication middleware protects routes
- ✅ Error responses follow consistent format
- ✅ Database tables created and indexed

## Troubleshooting

### CORS Issues
- Check FRONTEND_URL environment variable
- Verify origin in request headers
- Check browser console for CORS errors

### Rate Limiting Not Working
- Verify Redis is running
- Check Redis connection in logs
- Verify rate limit middleware is applied

### Validation Not Working
- Check Zod schemas are correct
- Verify validation middleware is applied to routes
- Check request Content-Type header

### Audit Logs Not Created
- Verify audit_logs table exists
- Check database connection
- Verify audit middleware is applied globally

### API Key Rotation Fails
- Check ENCRYPTION_KEY environment variable
- Verify api_keys table exists
- Check database permissions

## Notes

- Some tests require a valid user account
- Rate limit tests may need Redis cache clearing between runs
- Audit log tests require database access
- API key tests create test data that should be cleaned up
