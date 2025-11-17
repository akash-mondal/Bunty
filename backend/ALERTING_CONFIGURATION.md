# Alerting Configuration Guide

This guide explains how to configure and use the alerting system in the Bunty backend.

## Overview

The alerting system monitors critical system health metrics and sends notifications through multiple channels when issues are detected. It includes:

- **API Downtime Detection** - Monitors API error rates
- **Proof Generation Failures** - Tracks proof generation success rates
- **Database Connection Issues** - Detects database connectivity problems
- **High Error Rates** - Monitors overall system error rates
- **External Service Failures** - Tracks third-party service health (Plaid, Stripe, Sila, Midnight)

## Alert Channels

The system supports four notification channels:

1. **Email** - Send alerts via SMTP
2. **Slack** - Post alerts to Slack channels via webhooks
3. **Custom Webhook** - Send alerts to any HTTP endpoint
4. **PagerDuty** - Create incidents in PagerDuty

You can enable any combination of these channels.

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# Email Alerts
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_FROM=alerts@bunty.io
ALERT_EMAIL_TO=admin@bunty.io,ops@bunty.io
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

### Email Configuration

#### Using Gmail

1. Enable 2-factor authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password in `ALERT_EMAIL_SMTP_PASSWORD`

```bash
ALERT_EMAIL_SMTP_HOST=smtp.gmail.com
ALERT_EMAIL_SMTP_PORT=587
ALERT_EMAIL_SMTP_USER=your-email@gmail.com
ALERT_EMAIL_SMTP_PASSWORD=your-16-char-app-password
```

#### Using AWS SES

```bash
ALERT_EMAIL_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
ALERT_EMAIL_SMTP_PORT=587
ALERT_EMAIL_SMTP_USER=your-ses-smtp-username
ALERT_EMAIL_SMTP_PASSWORD=your-ses-smtp-password
```

#### Using SendGrid

```bash
ALERT_EMAIL_SMTP_HOST=smtp.sendgrid.net
ALERT_EMAIL_SMTP_PORT=587
ALERT_EMAIL_SMTP_USER=apikey
ALERT_EMAIL_SMTP_PASSWORD=your-sendgrid-api-key
```

### Slack Configuration

1. Create a Slack App: https://api.slack.com/apps
2. Enable Incoming Webhooks
3. Add webhook to your workspace
4. Copy the webhook URL

```bash
ALERT_SLACK_ENABLED=true
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

### Custom Webhook Configuration

Send alerts to any HTTP endpoint:

```bash
ALERT_WEBHOOK_ENABLED=true
ALERT_WEBHOOK_URL=https://your-monitoring-system.com/api/alerts
ALERT_WEBHOOK_AUTH_HEADER=Bearer your-secret-token
```

The webhook will receive POST requests with this payload:

```json
{
  "alert": {
    "title": "High API Error Rate",
    "message": "API error rate is 12.50%, exceeding threshold of 10%",
    "severity": "error",
    "source": "bunty-backend",
    "environment": "production",
    "timestamp": "2025-11-17T10:30:00.000Z",
    "metadata": {
      "errorRate": 12.5,
      "totalRequests": 5000
    }
  }
}
```

### PagerDuty Configuration

1. Create a PagerDuty service
2. Add an Events API v2 integration
3. Copy the Integration Key

```bash
ALERT_PAGERDUTY_ENABLED=true
ALERT_PAGERDUTY_INTEGRATION_KEY=your-32-char-integration-key
```

## Alert Types and Thresholds

### 1. API Downtime

**Trigger:** Error rate exceeds 10%  
**Cooldown:** 15 minutes  
**Metadata:** `errorRate`, `totalRequests`

### 2. Proof Generation Failures

**Trigger:** 3+ failures with >20% failure rate  
**Cooldown:** 10 minutes  
**Metadata:** `failureRate`, `totalFailed`, `totalGenerated`

### 3. Database Connection Issues

**Trigger:** Immediate on connection failure  
**Cooldown:** 5 minutes  
**Metadata:** `error`

### 4. High Error Rate

**Trigger:** System error rate exceeds 10%  
**Cooldown:** 15 minutes  
**Metadata:** `errorRate`

### 5. External Service Failures

**Trigger:** Service uptime drops below 90%  
**Cooldown:** 10 minutes  
**Metadata:** `service`, `uptime`, `avgResponseTime`

## Testing Alerts

### Test Script

Run the test script to verify your alert configuration:

```bash
# Test all alert types
npm run test:alerts -- --all

# Test specific alert type
npm run test:alerts -- --type=database
npm run test:alerts -- --type=api
npm run test:alerts -- --type=proof
npm run test:alerts -- --type=error
npm run test:alerts -- --type=service

# Test default alert
npm run test:alerts
```

### API Endpoints

Test alerts via API (requires authentication):

```bash
# Trigger a test alert
curl -X POST http://localhost:3001/api/metrics/alerts/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alertType": "test"}'

# Get alert statistics
curl http://localhost:3001/api/metrics/alerts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Monitoring the Alerting System

### Check Alert Statistics

```bash
curl http://localhost:3001/api/metrics/alerts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:

```json
{
  "highErrorRate": {
    "alertCount": 3,
    "lastAlertTime": "2025-11-17T10:30:00.000Z",
    "timeSinceLastAlert": 3600000
  },
  "databaseConnection": {
    "alertCount": 1,
    "lastAlertTime": "2025-11-17T09:15:00.000Z",
    "timeSinceLastAlert": 8100000
  }
}
```

### View Logs

Alerts are logged to the application logs:

```bash
# View recent alerts
tail -f backend/logs/combined.log | grep "ALERT TRIGGERED"

# Search for specific alert type
grep "highErrorRate" backend/logs/combined.log
```

## Customizing Alert Behavior

### Modify Thresholds

Edit `backend/src/services/alerting.service.ts`:

```typescript
private readonly alertConfigs = {
  apiDowntime: {
    enabled: true,
    threshold: 5,        // Change this
    cooldownMinutes: 15, // Change this
  },
  // ... other configs
};
```

### Add New Alert Types

1. Add configuration to `alertConfigs`
2. Create a check method (e.g., `checkNewMetric()`)
3. Add to `runHealthChecks()` method
4. Update documentation

Example:

```typescript
// Add to alertConfigs
customMetric: {
  enabled: true,
  threshold: 100,
  cooldownMinutes: 10,
}

// Add check method
private async checkCustomMetric() {
  try {
    const value = await getCustomMetric();
    
    if (value > this.alertConfigs.customMetric.threshold) {
      this.triggerAlert(
        'customMetric',
        'Custom Metric Threshold Exceeded',
        `Value is ${value}`,
        { value }
      );
    }
  } catch (error) {
    logger.error('Error checking custom metric', { error });
  }
}

// Add to runHealthChecks
private async runHealthChecks() {
  await Promise.all([
    // ... existing checks
    this.checkCustomMetric(),
  ]);
}
```

## Production Recommendations

### 1. Use Multiple Channels

Enable at least two notification channels for redundancy:

```bash
ALERT_EMAIL_ENABLED=true
ALERT_SLACK_ENABLED=true
```

### 2. Configure On-Call Rotation

Use PagerDuty for critical alerts with on-call rotation:

```bash
ALERT_PAGERDUTY_ENABLED=true
```

### 3. Set Up Alert Escalation

Configure escalation policies in PagerDuty:
- Level 1: Slack notification (immediate)
- Level 2: Email to on-call engineer (5 minutes)
- Level 3: PagerDuty incident (10 minutes)

### 4. Monitor Alert Frequency

Review alert statistics weekly to identify:
- Noisy alerts (too frequent)
- Missing alerts (threshold too high)
- False positives

### 5. Create Runbooks

Document response procedures for each alert type:

- **API Downtime**: Check server logs, restart services, scale infrastructure
- **Database Issues**: Check connection pool, verify credentials, check disk space
- **Proof Failures**: Check proof server logs, verify circuit files, restart proof server
- **External Services**: Check service status pages, verify API keys, contact support

### 6. Test Regularly

Schedule monthly alert tests:

```bash
# Add to cron or CI/CD
0 9 1 * * npm run test:alerts -- --all
```

### 7. Archive Alert History

Export alert statistics monthly for analysis:

```bash
curl http://localhost:3001/api/metrics/alerts \
  -H "Authorization: Bearer $JWT_TOKEN" \
  > alerts-$(date +%Y-%m).json
```

## Troubleshooting

### Alerts Not Sending

1. **Check Configuration**
   ```bash
   npm run test:alerts
   ```

2. **Verify Environment Variables**
   ```bash
   echo $ALERT_EMAIL_ENABLED
   echo $ALERT_SLACK_WEBHOOK_URL
   ```

3. **Check Logs**
   ```bash
   grep "Alert notification" backend/logs/combined.log
   grep "Failed to send" backend/logs/error.log
   ```

4. **Test Individual Channels**
   - Email: Verify SMTP credentials
   - Slack: Test webhook URL with curl
   - PagerDuty: Verify integration key

### Too Many Alerts

1. **Increase Cooldown Periods**
   ```typescript
   cooldownMinutes: 30 // Increase from 15
   ```

2. **Adjust Thresholds**
   ```typescript
   threshold: 20 // Increase from 10
   ```

3. **Disable Noisy Alerts**
   ```typescript
   enabled: false
   ```

### Missing Alerts

1. **Lower Thresholds**
2. **Reduce Cooldown Periods**
3. **Check Alert Service Status**
   ```bash
   curl http://localhost:3001/health
   ```

## Security Considerations

1. **Protect Webhook URLs**: Never commit webhook URLs to version control
2. **Use Environment Variables**: Store all credentials in `.env`
3. **Rotate Keys Regularly**: Update API keys and tokens quarterly
4. **Limit Alert Content**: Avoid including sensitive data in alert messages
5. **Secure SMTP**: Use TLS/SSL for email transmission
6. **Authenticate Webhooks**: Use authentication headers for custom webhooks

## Related Documentation

- [Monitoring and Observability](./MONITORING.md)
- [Metrics Collection](./METRICS_COLLECTION.md)
- [Logging](./LOGGING.md)
- [Deployment Guide](../DEPLOYMENT.md)

## Support

For issues or questions:
- Check logs: `backend/logs/`
- Review metrics: `GET /api/metrics`
- Test alerts: `npm run test:alerts`
- Contact: ops@bunty.io
