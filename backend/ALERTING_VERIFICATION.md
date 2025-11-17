# Alerting System Verification Checklist

Use this checklist to verify that the alerting system is properly configured and operational.

## Pre-Verification Setup

- [ ] Backend server is running (`npm run dev`)
- [ ] PostgreSQL is connected
- [ ] Redis is connected
- [ ] At least one alert channel is configured in `.env`

## Configuration Verification

### Environment Variables

```bash
# Check if alert variables are set
env | grep ALERT_
```

Expected output should show your configured channels:
```
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_FROM=alerts@bunty.io
ALERT_EMAIL_TO=admin@bunty.io
...
```

### Service Status

```bash
# Check if alerting service started
tail -f backend/logs/combined.log | grep "Alerting service"
```

Expected output:
```
{"level":"info","message":"Alerting service started"}
```

## Functional Testing

### 1. Test Script Execution

```bash
# Run test script
npm run test:alerts

# Expected output:
# - Configuration display
# - Service connections
# - Test alert triggered
# - Alert statistics
```

**Verification Points:**
- [ ] Script runs without errors
- [ ] Configuration is displayed correctly
- [ ] Redis and PostgreSQL connections succeed
- [ ] Alerting service starts
- [ ] Test alert is triggered
- [ ] Alert statistics are shown

### 2. API Endpoint Testing

```bash
# Get JWT token first
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.accessToken')

# Test alert endpoint
curl -X POST http://localhost:3001/api/metrics/alerts/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alertType": "test"}'

# Expected: {"message":"Test alert triggered for test"}
```

**Verification Points:**
- [ ] Endpoint returns success message
- [ ] No errors in server logs
- [ ] Alert appears in logs

### 3. Alert Statistics

```bash
# Get alert statistics
curl http://localhost:3001/api/metrics/alerts \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected: JSON object with alert counts and timestamps
```

**Verification Points:**
- [ ] Returns valid JSON
- [ ] Shows test alerts in statistics
- [ ] Includes timestamps and counts

### 4. Individual Alert Type Tests

```bash
# Test each alert type
npm run test:alerts -- --type=database
npm run test:alerts -- --type=api
npm run test:alerts -- --type=proof
npm run test:alerts -- --type=error
npm run test:alerts -- --type=service
```

**Verification Points:**
- [ ] Each test runs successfully
- [ ] Alerts appear in logs
- [ ] No errors or crashes

## Channel-Specific Verification

### Email Alerts

If `ALERT_EMAIL_ENABLED=true`:

**Verification Points:**
- [ ] Check inbox for test email
- [ ] Email has proper formatting (HTML)
- [ ] Subject line includes "[BUNTY ALERT]"
- [ ] Email includes alert details and metadata
- [ ] No SMTP errors in logs

**Troubleshooting:**
```bash
# Check for email errors
grep "Failed to send email" backend/logs/error.log
```

### Slack Alerts

If `ALERT_SLACK_ENABLED=true`:

**Verification Points:**
- [ ] Message appears in Slack channel
- [ ] Message has rich formatting (blocks)
- [ ] Alert icon (🚨) is visible
- [ ] Metadata is displayed in code block
- [ ] No webhook errors in logs

**Troubleshooting:**
```bash
# Test webhook directly
curl -X POST $ALERT_SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Direct webhook test"}'
```

### Custom Webhook

If `ALERT_WEBHOOK_ENABLED=true`:

**Verification Points:**
- [ ] Webhook endpoint receives POST request
- [ ] Payload includes all required fields
- [ ] Authentication header is present (if configured)
- [ ] No webhook errors in logs

**Troubleshooting:**
```bash
# Check webhook logs
grep "Webhook alert" backend/logs/combined.log
grep "Failed to send webhook" backend/logs/error.log
```

### PagerDuty

If `ALERT_PAGERDUTY_ENABLED=true`:

**Verification Points:**
- [ ] Incident created in PagerDuty
- [ ] Incident has correct title and description
- [ ] Custom details include metadata
- [ ] Severity is set to "error"
- [ ] No PagerDuty API errors in logs

**Troubleshooting:**
```bash
# Check PagerDuty logs
grep "PagerDuty alert" backend/logs/combined.log
grep "Failed to send PagerDuty" backend/logs/error.log
```

## Health Check Verification

### Automatic Health Checks

The alerting service runs health checks every 60 seconds. Verify they're working:

```bash
# Monitor health checks
tail -f backend/logs/combined.log | grep "health check"
```

**Verification Points:**
- [ ] Health checks run every minute
- [ ] No errors during health checks
- [ ] Metrics are being collected

### Trigger Real Alerts

Test that real conditions trigger alerts:

#### 1. Database Alert

```bash
# Stop PostgreSQL temporarily
docker-compose stop postgres

# Wait 1-2 minutes, check logs
tail -f backend/logs/combined.log | grep "Database Connection Failed"

# Restart PostgreSQL
docker-compose start postgres
```

**Verification Points:**
- [ ] Alert triggered within 2 minutes
- [ ] Alert sent to configured channels
- [ ] Cooldown period respected

#### 2. High Error Rate Alert

```bash
# Generate errors by calling invalid endpoint multiple times
for i in {1..20}; do
  curl http://localhost:3001/api/invalid-endpoint
done

# Wait 1-2 minutes, check logs
tail -f backend/logs/combined.log | grep "High Error Rate"
```

**Verification Points:**
- [ ] Alert triggered when threshold exceeded
- [ ] Alert includes error rate percentage
- [ ] Cooldown period respected

## Log Verification

### Alert Logs

```bash
# View all triggered alerts
grep "ALERT TRIGGERED" backend/logs/combined.log | jq

# View alert notifications
grep "Alert notification sent" backend/logs/combined.log | jq
```

**Verification Points:**
- [ ] Alerts are logged in JSON format
- [ ] Logs include all metadata
- [ ] Timestamps are present
- [ ] Alert keys are correct

### Error Logs

```bash
# Check for alert-related errors
grep -i "alert" backend/logs/error.log
```

**Verification Points:**
- [ ] No critical errors
- [ ] Failed notifications are logged (if any)
- [ ] Error messages are descriptive

## Performance Verification

### Resource Usage

```bash
# Check if alerting service impacts performance
# Monitor CPU and memory while running tests
npm run test:alerts -- --all
```

**Verification Points:**
- [ ] No significant CPU spike
- [ ] Memory usage remains stable
- [ ] No memory leaks over time

### Response Time

```bash
# Measure alert trigger time
time npm run test:alerts -- --type=test
```

**Verification Points:**
- [ ] Test completes in < 5 seconds
- [ ] No timeouts
- [ ] Notifications sent promptly

## Production Readiness Checklist

Before deploying to production:

### Configuration
- [ ] At least 2 alert channels enabled
- [ ] Production SMTP/webhook credentials configured
- [ ] Alert thresholds reviewed and adjusted
- [ ] Cooldown periods appropriate for production

### Testing
- [ ] All alert types tested successfully
- [ ] All notification channels verified
- [ ] Load testing completed
- [ ] Failover scenarios tested

### Documentation
- [ ] Runbooks created for each alert type
- [ ] On-call rotation documented
- [ ] Escalation procedures defined
- [ ] Contact information updated

### Monitoring
- [ ] Alert statistics dashboard created
- [ ] Log aggregation configured
- [ ] Alert frequency monitoring enabled
- [ ] Monthly test schedule created

### Security
- [ ] Credentials stored securely
- [ ] Webhook URLs not in version control
- [ ] Authentication enabled for webhooks
- [ ] PII excluded from alerts

## Troubleshooting Guide

### Issue: No Alerts Triggered

**Checks:**
1. Is alerting service running?
   ```bash
   grep "Alerting service started" backend/logs/combined.log
   ```

2. Are health checks running?
   ```bash
   tail -f backend/logs/combined.log | grep "health check"
   ```

3. Are thresholds being met?
   ```bash
   curl http://localhost:3001/api/metrics -H "Authorization: Bearer $TOKEN"
   ```

### Issue: Alerts Not Sending to Channels

**Checks:**
1. Are channels enabled?
   ```bash
   env | grep ALERT_.*_ENABLED
   ```

2. Are credentials correct?
   ```bash
   # Test each channel individually
   npm run test:alerts -- --type=test
   ```

3. Check error logs:
   ```bash
   grep "Failed to send" backend/logs/error.log
   ```

### Issue: Too Many Alerts

**Solutions:**
1. Increase cooldown periods in `alerting.service.ts`
2. Raise alert thresholds
3. Temporarily disable noisy alerts

### Issue: Missing Alerts

**Solutions:**
1. Lower alert thresholds
2. Reduce cooldown periods
3. Check if metrics are being collected

## Sign-Off

Once all verification steps pass:

- [ ] All tests completed successfully
- [ ] All configured channels working
- [ ] Documentation reviewed
- [ ] Production checklist completed
- [ ] Team trained on alert response

**Verified By:** _______________  
**Date:** _______________  
**Environment:** Development / Staging / Production

## Next Steps

1. Configure production alert channels
2. Set up monitoring dashboards
3. Create alert response runbooks
4. Schedule monthly alert tests
5. Review and tune thresholds based on usage

---

For questions or issues, refer to:
- [ALERTING_CONFIGURATION.md](./ALERTING_CONFIGURATION.md)
- [ALERTING_QUICKSTART.md](./ALERTING_QUICKSTART.md)
- [MONITORING.md](./MONITORING.md)
