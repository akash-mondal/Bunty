# Monitoring and Observability

This document describes the monitoring and observability infrastructure implemented in the Bunty backend.

## Overview

The monitoring system consists of three main components:

1. **Structured Logging** - JSON-formatted logs with automatic sanitization
2. **Metrics Collection** - Real-time tracking of system performance and health
3. **Alerting** - Automated notifications for critical issues

## Structured Logging

### Features

- **JSON Format**: All logs are structured in JSON format for easy parsing and analysis
- **Automatic Sanitization**: Sensitive fields (passwords, tokens, API keys) are automatically redacted
- **Multiple Transports**: Logs are written to console and files
- **Log Levels**: error, warn, info, http, debug
- **Stack Traces**: Errors include full stack traces
- **Request/Response Logging**: All HTTP requests and responses are logged with timing

### Log Files

Logs are stored in the `backend/logs/` directory:

- `error.log` - Error-level logs only
- `combined.log` - All logs
- Files are rotated at 5MB with 5 file retention

### Usage

```typescript
import logger from '../utils/logger';

// Basic logging
logger.info('User registered', { userId, email });
logger.error('Database connection failed', { error });

// Audit logging
import { auditAuthEvent, auditProofSubmission } from '../middleware/logging.middleware';

auditAuthEvent(userId, 'login', { email });
auditProofSubmission(userId, proofId, 'submitted', { txHash });
```

### Audit Trail

Special audit logs are created for:

- Authentication events (login, logout, register, failed attempts)
- Proof submissions (generated, submitted, confirmed, failed)
- External service calls (Plaid, Stripe, Sila, Midnight)
- Sensitive operations (API key rotation, etc.)

## Metrics Collection

### Tracked Metrics

#### API Metrics
- Total requests per endpoint
- Average response time per endpoint
- Error rate (4xx and 5xx responses)
- Request distribution by endpoint

#### Proof Metrics
- Total proofs generated
- Total proofs submitted
- Total proofs confirmed
- Total proofs failed
- Success rate
- Average generation time

#### Transaction Metrics
- Average confirmation time
- Transaction success rate

#### External Service Metrics
- Uptime percentage per service (Plaid, Stripe, Sila, Midnight)
- Average response time per service
- Success/failure counts

### Metrics Storage

Metrics are stored in Redis with:
- 7-day retention period
- Automatic expiry
- Time-series data for trending

### API Endpoints

```bash
# Get all metrics
GET /api/metrics

# Get specific metric categories
GET /api/metrics/proofs
GET /api/metrics/api
GET /api/metrics/services

# Get alert statistics
GET /api/metrics/alerts

# Reset metrics (admin only)
POST /api/metrics/reset

# Test alert (admin only)
POST /api/metrics/alerts/test
Body: { "alertType": "test" }
```

### Example Response

```json
{
  "proof": {
    "totalGenerated": 150,
    "totalSubmitted": 145,
    "totalConfirmed": 140,
    "totalFailed": 5,
    "successRate": 96.55,
    "avgGenerationTime": 3200
  },
  "api": {
    "totalRequests": 5000,
    "avgResponseTime": 250,
    "errorRate": 2.5,
    "requestsByEndpoint": {
      "POST /api/auth/login": 500,
      "GET /api/proof/status/:proofId": 1200
    }
  },
  "externalServices": {
    "plaid": { "uptime": 99.5, "avgResponseTime": 450 },
    "stripe": { "uptime": 99.8, "avgResponseTime": 320 },
    "sila": { "uptime": 98.5, "avgResponseTime": 550 },
    "midnight": { "uptime": 99.2, "avgResponseTime": 800 }
  },
  "timestamp": "2025-11-17T10:30:00.000Z"
}
```

## Alerting

### Alert Types

1. **API Downtime** - Triggered when error rate exceeds 10%
2. **Proof Generation Failures** - Triggered when 3+ failures occur
3. **Database Connection Issues** - Triggered immediately on connection failure
4. **High Error Rate** - Triggered when overall error rate exceeds 10%
5. **External Service Failures** - Triggered when service uptime drops below 90%

### Alert Configuration

Each alert type has:
- **Threshold**: Condition that triggers the alert
- **Cooldown Period**: Minimum time between alerts (prevents spam)
- **Enable/Disable**: Can be toggled per alert type

### Alert Cooldown Periods

- API Downtime: 15 minutes
- Proof Generation Failure: 10 minutes
- Database Connection: 5 minutes
- High Error Rate: 15 minutes
- External Service Failure: 10 minutes

### Alert Notifications

Alerts can be sent through multiple channels. Configure your preferred notification methods in the `.env` file:

#### Supported Notification Channels

1. **Email Alerts** - Send alerts via SMTP (Gmail, AWS SES, SendGrid)
2. **Slack Alerts** - Post alerts to Slack channels via webhooks
3. **Custom Webhook** - Send alerts to any HTTP endpoint
4. **PagerDuty** - Create incidents in PagerDuty

#### Configuration

Add these environment variables to your `.env` file:

```bash
# Email Alerts
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_FROM=alerts@bunty.io
ALERT_EMAIL_TO=admin@bunty.io
ALERT_EMAIL_SMTP_HOST=smtp.gmail.com
ALERT_EMAIL_SMTP_PORT=587
ALERT_EMAIL_SMTP_USER=your-email@gmail.com
ALERT_EMAIL_SMTP_PASSWORD=your-app-password

# Slack Alerts
ALERT_SLACK_ENABLED=true
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Custom Webhook Alerts
ALERT_WEBHOOK_ENABLED=true
ALERT_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
ALERT_WEBHOOK_AUTH_HEADER=Bearer your-auth-token

# PagerDuty Alerts
ALERT_PAGERDUTY_ENABLED=true
ALERT_PAGERDUTY_INTEGRATION_KEY=your-pagerduty-integration-key
```

See [ALERTING_CONFIGURATION.md](./ALERTING_CONFIGURATION.md) for detailed setup instructions.

### Testing Alerts

#### Using Test Script

```bash
# Test all alert types
npm run test:alerts -- --all

# Test specific alert type
npm run test:alerts -- --type=database
npm run test:alerts -- --type=api
npm run test:alerts -- --type=proof
npm run test:alerts -- --type=error
npm run test:alerts -- --type=service
```

#### Using API

```bash
# Test an alert
curl -X POST http://localhost:3001/api/metrics/alerts/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alertType": "database"}'
```

## Monitoring Dashboard

### Recommended Tools

1. **Grafana** - Visualize metrics from Redis
2. **ELK Stack** (Elasticsearch, Logstash, Kibana) - Log aggregation and analysis
3. **Datadog** - Full-stack monitoring
4. **New Relic** - Application performance monitoring
5. **Prometheus** - Metrics collection and alerting

### Grafana Setup (Example)

1. Install Grafana and Redis data source plugin
2. Configure Redis connection to your Redis instance
3. Create dashboards with queries like:

```
# API Response Time
ZRANGE metrics:api:response_time:POST /api/proof/submit 0 -1

# Proof Success Rate
GET metrics:proof:confirmed
GET metrics:proof:generated
```

### Log Analysis with ELK

1. Configure Logstash to read from `backend/logs/combined.log`
2. Parse JSON logs and index to Elasticsearch
3. Create Kibana dashboards for:
   - Request volume over time
   - Error rate trends
   - Audit trail visualization
   - User activity patterns

## Environment Variables

See the [Alerting Configuration Guide](./ALERTING_CONFIGURATION.md) for complete environment variable documentation.

Quick reference:

```bash
# Enable/disable alert channels
ALERT_EMAIL_ENABLED=true
ALERT_SLACK_ENABLED=true
ALERT_WEBHOOK_ENABLED=false
ALERT_PAGERDUTY_ENABLED=false

# Email configuration
ALERT_EMAIL_FROM=alerts@bunty.io
ALERT_EMAIL_TO=admin@bunty.io
ALERT_EMAIL_SMTP_HOST=smtp.gmail.com
ALERT_EMAIL_SMTP_PORT=587
ALERT_EMAIL_SMTP_USER=your-email@gmail.com
ALERT_EMAIL_SMTP_PASSWORD=your-app-password

# Slack configuration
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Custom webhook configuration
ALERT_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
ALERT_WEBHOOK_AUTH_HEADER=Bearer your-auth-token

# PagerDuty configuration
ALERT_PAGERDUTY_INTEGRATION_KEY=your-pagerduty-integration-key
```

## Best Practices

1. **Monitor Regularly**: Check metrics dashboard daily
2. **Review Logs**: Investigate error logs weekly
3. **Test Alerts**: Run alert tests monthly to ensure notifications work
4. **Tune Thresholds**: Adjust alert thresholds based on actual usage patterns
5. **Archive Logs**: Set up log archival for compliance (S3, CloudWatch, etc.)
6. **Set Up Dashboards**: Create visual dashboards for key metrics
7. **Document Incidents**: Keep a log of alerts and resolutions

## Troubleshooting

### Logs Not Appearing

1. Check that `backend/logs/` directory exists
2. Verify file permissions
3. Check disk space

### Metrics Not Updating

1. Verify Redis connection
2. Check that metrics middleware is enabled
3. Review Redis memory limits

### Alerts Not Firing

1. Check alert service is running (`alertingService.start()`)
2. Verify alert configurations in `alerting.service.ts`
3. Check cooldown periods haven't been triggered
4. Test with manual alert trigger

### High Memory Usage

1. Reduce metrics retention period (default: 7 days)
2. Implement log rotation more aggressively
3. Archive old logs to external storage

## Production Recommendations

1. **Use External Log Storage**: Send logs to CloudWatch, Datadog, or similar
2. **Set Up Real Alerts**: Configure email/Slack/PagerDuty notifications
3. **Monitor Infrastructure**: Add server-level monitoring (CPU, memory, disk)
4. **Create Runbooks**: Document response procedures for each alert type
5. **Set Up On-Call Rotation**: Ensure 24/7 coverage for critical alerts
6. **Regular Reviews**: Weekly review of metrics and monthly review of alert effectiveness

## Related Documentation

- [Security Middleware](./SECURITY_MIDDLEWARE.md)
- [API Key Rotation](./API_KEY_ROTATION.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [Testing Guide](./TESTING.md)
