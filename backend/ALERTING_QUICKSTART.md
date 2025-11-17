# Alerting Quick Start Guide

Get alerts up and running in 5 minutes.

## Quick Setup

### 1. Choose Your Alert Channel

Pick at least one notification method:

#### Option A: Slack (Recommended for Development)

```bash
# In your .env file
ALERT_SLACK_ENABLED=true
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Setup Steps:**
1. Go to https://api.slack.com/apps
2. Create a new app
3. Enable "Incoming Webhooks"
4. Add webhook to your workspace
5. Copy the webhook URL

#### Option B: Email

```bash
# In your .env file
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_FROM=alerts@bunty.io
ALERT_EMAIL_TO=your-email@example.com
ALERT_EMAIL_SMTP_HOST=smtp.gmail.com
ALERT_EMAIL_SMTP_PORT=587
ALERT_EMAIL_SMTP_USER=your-email@gmail.com
ALERT_EMAIL_SMTP_PASSWORD=your-app-password
```

**Gmail Setup:**
1. Enable 2FA on your Google account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the 16-character password above

#### Option C: PagerDuty (Recommended for Production)

```bash
# In your .env file
ALERT_PAGERDUTY_ENABLED=true
ALERT_PAGERDUTY_INTEGRATION_KEY=your-integration-key
```

**Setup Steps:**
1. Create a PagerDuty service
2. Add "Events API v2" integration
3. Copy the Integration Key

### 2. Test Your Configuration

```bash
# Test all alerts
npm run test:alerts -- --all

# Test specific alert
npm run test:alerts -- --type=database
```

### 3. Verify Alerts Are Working

Check your configured channel:
- **Slack**: Look for messages in your channel
- **Email**: Check your inbox
- **PagerDuty**: Check for incidents

## What Gets Alerted

| Alert Type | Trigger | Cooldown |
|------------|---------|----------|
| API Downtime | Error rate > 10% | 15 min |
| Proof Failures | 3+ failures, >20% rate | 10 min |
| Database Issues | Connection failure | 5 min |
| High Error Rate | Error rate > 10% | 15 min |
| Service Failures | Uptime < 90% | 10 min |

## Common Issues

### Slack Not Working

```bash
# Test webhook directly
curl -X POST YOUR_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test message"}'
```

### Email Not Sending

- Verify SMTP credentials
- Check if 2FA is enabled (Gmail requires App Password)
- Verify firewall allows SMTP port (587 or 465)

### No Alerts Appearing

```bash
# Check if alerting service is running
curl http://localhost:3001/health

# Check logs
tail -f backend/logs/combined.log | grep "ALERT"

# Get alert statistics
curl http://localhost:3001/api/metrics/alerts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Production Checklist

- [ ] Enable at least 2 alert channels
- [ ] Test all alert types
- [ ] Configure PagerDuty for critical alerts
- [ ] Set up on-call rotation
- [ ] Document response procedures
- [ ] Schedule monthly alert tests

## Need More Help?

See the full documentation:
- [ALERTING_CONFIGURATION.md](./ALERTING_CONFIGURATION.md) - Complete setup guide
- [MONITORING.md](./MONITORING.md) - Monitoring overview
- [METRICS_COLLECTION.md](./METRICS_COLLECTION.md) - Metrics details

## Quick Commands

```bash
# Test alerts
npm run test:alerts -- --all

# View alert stats
curl http://localhost:3001/api/metrics/alerts \
  -H "Authorization: Bearer $TOKEN"

# Trigger test alert
curl -X POST http://localhost:3001/api/metrics/alerts/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alertType": "test"}'

# View recent alerts in logs
tail -f backend/logs/combined.log | grep "ALERT TRIGGERED"
```
