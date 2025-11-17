# API Key Rotation Guide

This document provides procedures for rotating API keys for external services (Plaid, Stripe, Sila) to maintain security best practices.

## Overview

API key rotation is a critical security practice that:
- Limits the exposure window if a key is compromised
- Ensures compliance with security policies
- Reduces the impact of potential breaches
- Maintains audit trails of key usage

## Key Storage

All API keys are stored encrypted in the PostgreSQL database using AES-256-GCM encryption. The encryption key is stored in the `ENCRYPTION_KEY` environment variable.

### Database Schema

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

## Rotation Schedule

### Recommended Rotation Frequency

- **Plaid API Keys**: Every 90 days
- **Stripe API Keys**: Every 90 days
- **Sila API Keys**: Every 90 days
- **JWT Secret**: Every 180 days
- **Encryption Key**: Every 365 days (requires data re-encryption)

### Automated Monitoring

The system automatically checks for expiring keys (within 7 days) and logs warnings.

## Rotation Procedures

### 1. Plaid API Key Rotation

```bash
# Step 1: Generate new API key in Plaid Dashboard
# - Log in to https://dashboard.plaid.com
# - Navigate to Team Settings > Keys
# - Generate new API key for your environment

# Step 2: Update environment variable
export PLAID_CLIENT_ID="new_client_id"
export PLAID_SECRET="new_secret"

# Step 3: Store in database (optional, for tracking)
npm run rotate-key -- --service plaid --key-name client_id --value "new_client_id"
npm run rotate-key -- --service plaid --key-name secret --value "new_secret"

# Step 4: Restart backend service
pm2 restart backend

# Step 5: Verify functionality
curl -X POST http://localhost:3001/api/plaid/create-link-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Step 6: Revoke old key in Plaid Dashboard
```

### 2. Stripe API Key Rotation

```bash
# Step 1: Generate new API key in Stripe Dashboard
# - Log in to https://dashboard.stripe.com
# - Navigate to Developers > API keys
# - Create new secret key

# Step 2: Update environment variable
export STRIPE_SECRET_KEY="sk_test_new_key"

# Step 3: Store in database
npm run rotate-key -- --service stripe --key-name secret_key --value "sk_test_new_key"

# Step 4: Restart backend service
pm2 restart backend

# Step 5: Verify functionality
curl -X POST http://localhost:3001/api/stripe/identity-session \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Step 6: Delete old key in Stripe Dashboard
```

### 3. Sila API Key Rotation

```bash
# Step 1: Generate new API key in Sila Console
# - Log in to https://console.silamoney.com
# - Navigate to Settings > API Keys
# - Generate new key pair

# Step 2: Update environment variables
export SILA_APP_HANDLE="new_app_handle"
export SILA_PRIVATE_KEY="new_private_key"

# Step 3: Store in database
npm run rotate-key -- --service sila --key-name app_handle --value "new_app_handle"
npm run rotate-key -- --service sila --key-name private_key --value "new_private_key"

# Step 4: Restart backend service
pm2 restart backend

# Step 5: Verify functionality
curl -X POST http://localhost:3001/api/sila/register \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User",...}'

# Step 6: Revoke old key in Sila Console
```

### 4. JWT Secret Rotation

**Warning**: Rotating the JWT secret will invalidate all existing tokens. Plan for a maintenance window.

```bash
# Step 1: Generate new secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Step 2: Update environment variable
export JWT_SECRET="new_secret_here"
export JWT_REFRESH_SECRET="new_refresh_secret_here"

# Step 3: Notify users of upcoming maintenance
# Send email/notification about token invalidation

# Step 4: Restart backend service
pm2 restart backend

# Step 5: All users will need to log in again
```

### 5. Encryption Key Rotation

**Warning**: This requires re-encrypting all stored data. Use the migration script.

```bash
# Step 1: Generate new encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Step 2: Set new key as environment variable
export NEW_ENCRYPTION_KEY="new_key_here"

# Step 3: Run migration script
npm run migrate-encryption-key

# Step 4: Update environment variable
export ENCRYPTION_KEY="new_key_here"

# Step 5: Restart backend service
pm2 restart backend
```

## Programmatic API

### Store API Key

```typescript
import { storeAPIKey } from './utils/apiKeyRotation';

await storeAPIKey(
  'plaid',
  'client_id',
  'your_client_id_here',
  new Date('2025-03-01') // Optional expiry date
);
```

### Retrieve API Key

```typescript
import { getAPIKey } from './utils/apiKeyRotation';

const clientId = await getAPIKey('plaid', 'client_id');
```

### Rotate API Key

```typescript
import { rotateAPIKey } from './utils/apiKeyRotation';

await rotateAPIKey(
  'plaid',
  'client_id',
  'new_client_id_here',
  new Date('2025-06-01')
);
```

### List API Keys

```typescript
import { listAPIKeys } from './utils/apiKeyRotation';

const keys = await listAPIKeys('plaid'); // Or omit service for all keys
console.log(keys);
```

### Check Expiring Keys

```typescript
import { getExpiringKeys } from './utils/apiKeyRotation';

const expiringKeys = await getExpiringKeys();
if (expiringKeys.length > 0) {
  console.warn('Keys expiring soon:', expiringKeys);
}
```

## CLI Commands

### Rotate Key Command

```bash
npm run rotate-key -- --service <service> --key-name <name> --value <value> [--expires <date>]
```

### List Keys Command

```bash
npm run list-keys [--service <service>]
```

### Check Expiring Keys Command

```bash
npm run check-expiring-keys
```

## Monitoring and Alerts

### Log Monitoring

All key rotations are logged to the audit log:

```sql
SELECT * FROM audit_logs
WHERE action = 'KEY_ROTATION'
ORDER BY created_at DESC;
```

### Automated Alerts

Set up cron job to check for expiring keys daily:

```bash
# Add to crontab
0 9 * * * cd /path/to/backend && npm run check-expiring-keys
```

### Metrics to Track

- Last rotation date for each key
- Number of days until expiration
- Failed rotation attempts
- API calls using old keys after rotation

## Emergency Procedures

### If a Key is Compromised

1. **Immediately rotate the key** using the procedures above
2. **Revoke the old key** in the service provider's dashboard
3. **Review audit logs** for suspicious activity:
   ```sql
   SELECT * FROM audit_logs
   WHERE created_at > NOW() - INTERVAL '24 hours'
   AND (action LIKE '%PLAID%' OR action LIKE '%STRIPE%' OR action LIKE '%SILA%')
   ORDER BY created_at DESC;
   ```
4. **Notify security team** and document the incident
5. **Monitor for unusual activity** for the next 48 hours

### Rollback Procedure

If a rotation causes issues:

1. **Retrieve the previous key** from the database:
   ```sql
   SELECT encrypted_value FROM api_keys
   WHERE service = 'plaid' AND key_name = 'client_id'
   AND is_active = FALSE
   ORDER BY rotated_at DESC
   LIMIT 1;
   ```
2. **Decrypt and restore** the old key
3. **Update environment variables**
4. **Restart services**
5. **Investigate the issue** before attempting rotation again

## Best Practices

1. **Never commit keys to version control**
2. **Use environment variables** for all sensitive values
3. **Rotate keys regularly** according to the schedule
4. **Test in staging** before rotating production keys
5. **Keep audit logs** of all rotations
6. **Document all rotations** in your change log
7. **Use separate keys** for different environments
8. **Monitor key usage** after rotation
9. **Have a rollback plan** ready
10. **Automate where possible** to reduce human error

## Compliance

This rotation procedure helps maintain compliance with:

- **PCI DSS**: Requirement 3.6 (Key Management)
- **SOC 2**: CC6.1 (Logical and Physical Access Controls)
- **GDPR**: Article 32 (Security of Processing)
- **NIST**: SP 800-57 (Key Management)

## Support

For questions or issues with key rotation:
- Check the audit logs for error messages
- Review service provider documentation
- Contact the security team
- Create an incident ticket if keys are compromised
