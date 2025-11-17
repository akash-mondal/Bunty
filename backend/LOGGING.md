# Application Logging Documentation

## Overview

The Bunty backend implements comprehensive structured JSON logging with request/response tracking, error logging with stack traces, and audit trails for sensitive operations. All logs are sanitized to prevent exposure of sensitive data.

## Logging Architecture

### Components

1. **Logger Utility** (`src/utils/logger.ts`)
   - Winston-based structured JSON logging
   - Automatic sanitization of sensitive fields
   - Multiple transports (console, file)
   - Log rotation with size limits

2. **Logging Middleware** (`src/middleware/logging.middleware.ts`)
   - Request/response logging
   - Error logging with stack traces
   - Audit trail functions for specific operations

3. **Audit Middleware** (`src/middleware/audit.middleware.ts`)
   - Database-backed audit logs
   - Tracks sensitive operations
   - Queryable audit history

## Log Levels

The system uses the following log levels (in order of severity):

- **error** (0): Error conditions requiring immediate attention
- **warn** (1): Warning conditions that should be reviewed
- **info** (2): Informational messages about normal operations
- **http** (3): HTTP request/response logs
- **debug** (4): Detailed debugging information (development only)

## Log Output

### Console Output (Development)
```
2024-01-15 10:30:45:123 info: User registered successfully {"userId":"123e4567-e89b-12d3-a456-426614174000","email":"user@example.com"}
```

### JSON Output (Production)
```json
{
  "timestamp": "2024-01-15 10:30:45:123",
  "level": "info",
  "message": "User registered successfully",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com"
}
```

## Log Files

Logs are written to the following files in the `backend/logs/` directory:

- **error.log**: Contains only error-level logs
  - Max size: 5MB
  - Max files: 5 (rotated)
  
- **combined.log**: Contains all log levels
  - Max size: 5MB
  - Max files: 5 (rotated)

## Sensitive Data Sanitization

The logger automatically redacts the following sensitive fields:

- `password`
- `token`
- `accessToken`
- `refreshToken`
- `apiKey`
- `secret`
- `authorization`
- `ssn`
- `accountNumber`
- `routingNumber`

Example:
```javascript
logger.info('User login', { 
  email: 'user@example.com', 
  password: 'secret123' 
});
// Output: { email: 'user@example.com', password: '[REDACTED]' }
```

## Request/Response Logging

All HTTP requests and responses are automatically logged with the following information:

### Request Log
```json
{
  "level": "http",
  "message": "Incoming request",
  "method": "POST",
  "url": "/api/auth/login",
  "path": "/api/auth/login",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Response Log
```json
{
  "level": "http",
  "message": "Outgoing response",
  "method": "POST",
  "url": "/api/auth/login",
  "path": "/api/auth/login",
  "statusCode": 200,
  "duration": "145ms",
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```

## Error Logging

Errors are logged with full stack traces for debugging:

```json
{
  "level": "error",
  "message": "Request error",
  "error": {
    "message": "Database connection failed",
    "stack": "Error: Database connection failed\n    at ...",
    "name": "DatabaseError"
  },
  "request": {
    "method": "GET",
    "url": "/api/plaid/income",
    "path": "/api/plaid/income",
    "ip": "192.168.1.1",
    "userId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

## Audit Trails

### Proof Submission Audit
Tracks all proof-related operations:

```javascript
auditProofSubmission(userId, proofId, 'submitted', {
  txHash: '0x123...',
  nullifier: 'abc123...',
  threshold: 50000
});
```

### Authentication Audit
Tracks authentication events:

```javascript
auditAuthEvent(userId, 'login', { email: 'user@example.com' });
auditAuthEvent(undefined, 'failed_login', { email: 'user@example.com' });
```

### External Service Audit
Tracks calls to external APIs:

```javascript
auditExternalService('plaid', 'get_income', userId, true);
auditExternalService('stripe', 'create_identity_session', userId, false, { 
  error: 'API rate limit exceeded' 
});
```

### Sensitive Operation Audit
Tracks sensitive operations:

```javascript
auditSensitiveOperation('witness_generation', userId, true);
auditSensitiveOperation('sila_transfer', userId, true, { amount: 1000 });
```

## Database Audit Logs

Sensitive operations are also stored in the `audit_logs` database table:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  action VARCHAR(100),
  resource VARCHAR(100),
  method VARCHAR(10),
  path VARCHAR(500),
  ip VARCHAR(45),
  user_agent TEXT,
  status_code INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP
);
```

### Querying Audit Logs

```javascript
import { getAuditLogs } from './middleware/audit.middleware';

// Get all audit logs for a user
const logs = await getAuditLogs({ userId: '123...' });

// Get audit logs for specific action
const logs = await getAuditLogs({ action: 'PROOF_SUBMIT' });

// Get audit logs within date range
const logs = await getAuditLogs({ 
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  limit: 100
});
```

## Controller Logging Examples

### Authentication Controller
```javascript
// Success
logger.info('User registered successfully', { userId, email });
auditAuthEvent(userId, 'register', { email });

// Failure
logger.error('Registration error', { error, email });
```

### Plaid Controller
```javascript
// Success
logger.info('Plaid income data fetched', { userId });
auditExternalService('plaid', 'get_income', userId, true);

// Failure
logger.error('Error in getIncome', { error, userId });
auditExternalService('plaid', 'get_income', userId, false, { error: error.message });
```

### Proof Controller
```javascript
// Proof generation
logger.info('Generating proof', { userId, circuit, threshold });
logger.info('Proof generated successfully', { userId, circuit, duration });
auditProofSubmission(userId, 'pending', 'generated', { circuit, threshold });

// Proof submission
logger.info('Submitting proof', { userId, nullifier });
logger.info('Proof submitted successfully', { userId, proofId, txHash });
auditProofSubmission(userId, proofId, 'submitted', { txHash, nullifier, threshold });
```

### Witness Controller
```javascript
// Witness generation
logger.info('Witness data generated', { userId, witnessHash });
auditSensitiveOperation('witness_generation', userId, true);

// Hash commitment
logger.info('Witness hash committed', { userId, witnessHash });
auditSensitiveOperation('witness_hash_commit', userId, true, { witnessHash });
```

## Best Practices

### 1. Always Include Context
```javascript
// Good
logger.info('Payment processed', { userId, amount, paymentId });

// Bad
logger.info('Payment processed');
```

### 2. Use Appropriate Log Levels
```javascript
// Error: Something went wrong
logger.error('Database connection failed', { error });

// Warn: Something unusual but not critical
logger.warn('API rate limit approaching', { remaining: 10 });

// Info: Normal operations
logger.info('User logged in', { userId });

// Debug: Detailed debugging info (development only)
logger.debug('Query parameters', { params });
```

### 3. Log Both Success and Failure
```javascript
try {
  const result = await someOperation();
  logger.info('Operation succeeded', { result });
} catch (error) {
  logger.error('Operation failed', { error });
  throw error;
}
```

### 4. Include User Context
```javascript
// Always include userId when available
logger.info('Action performed', { 
  userId: req.user?.userId,
  action: 'proof_submit'
});
```

### 5. Sanitize Before Logging
```javascript
// The logger automatically sanitizes, but be aware
logger.info('User data', { 
  email: 'user@example.com',
  password: 'secret' // Will be [REDACTED]
});
```

## Monitoring and Alerting

Logs can be integrated with monitoring tools:

1. **Log Aggregation**: Ship logs to services like:
   - Datadog
   - New Relic
   - Elasticsearch/Kibana
   - CloudWatch

2. **Alerting**: Set up alerts for:
   - High error rates
   - Failed authentication attempts
   - External service failures
   - Proof generation failures

3. **Metrics**: Track:
   - Request/response times
   - Error rates by endpoint
   - Authentication success/failure rates
   - Proof submission rates

## Environment Configuration

Configure logging behavior via environment variables:

```bash
# Log level (error, warn, info, http, debug)
NODE_ENV=production  # Sets level to 'info'
NODE_ENV=development # Sets level to 'debug'

# Log file paths (optional)
LOG_DIR=/var/log/bunty
```

## Troubleshooting

### Logs Not Appearing
1. Check that `logs/` directory exists
2. Verify file permissions
3. Check log level configuration

### Sensitive Data in Logs
1. Verify sanitization is working
2. Add new sensitive fields to `sensitiveFields` array in `logger.ts`
3. Review audit logs for exposed data

### Performance Issues
1. Reduce log level in production
2. Implement log sampling for high-traffic endpoints
3. Use async logging for better performance

## Security Considerations

1. **Never log**:
   - Raw passwords
   - API keys or secrets
   - Full credit card numbers
   - SSNs or other PII

2. **Always log**:
   - Authentication attempts
   - Authorization failures
   - Sensitive operations
   - External API calls

3. **Protect log files**:
   - Restrict file permissions (600 or 640)
   - Rotate logs regularly
   - Encrypt logs at rest
   - Secure log transmission

## Compliance

The logging system supports compliance requirements:

- **GDPR**: Audit trails for data access
- **SOC 2**: Security event logging
- **PCI DSS**: Access logging and monitoring
- **HIPAA**: Audit trails for PHI access (if applicable)

## Summary

The Bunty logging system provides:

✅ Structured JSON logging  
✅ Automatic sensitive data sanitization  
✅ Request/response logging  
✅ Error logging with stack traces  
✅ Database-backed audit trails  
✅ External service call tracking  
✅ Proof submission audit trail  
✅ Authentication event logging  
✅ Log rotation and management  

All logging is production-ready and follows security best practices.
