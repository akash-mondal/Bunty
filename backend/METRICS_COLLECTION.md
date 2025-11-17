# Metrics Collection Implementation

## Overview

The Bunty platform implements comprehensive metrics collection to track API performance, proof generation success rates, transaction confirmation times, and external service uptime. All metrics are stored in Redis with automatic expiration and can be queried through dedicated API endpoints.

## Architecture

### Components

1. **MetricsService** (`src/services/metrics.service.ts`)
   - Core service for tracking and retrieving metrics
   - Stores data in Redis with 7-day retention
   - Provides aggregation and calculation methods

2. **MetricsMiddleware** (`src/middleware/metrics.middleware.ts`)
   - Express middleware that automatically tracks all API requests
   - Captures response times and status codes
   - Non-blocking async tracking

3. **MetricsController** (`src/controllers/metrics.controller.ts`)
   - REST API endpoints for querying metrics
   - Admin endpoints for testing and management

4. **MetricsRoutes** (`src/routes/metrics.routes.ts`)
   - Route definitions for metrics endpoints
   - Authentication required for all routes

## Tracked Metrics

### 1. API Response Times

**What's Tracked:**
- Response time for each API endpoint
- Request count per endpoint
- Error rate per endpoint

**How It's Tracked:**
- Automatically via `metricsMiddleware` on every request
- Stored in Redis sorted sets with timestamps
- 7-day retention period

**Data Structure:**
```
metrics:api:response_time:{endpoint} -> Sorted set of {duration, timestamp}
metrics:api:requests:{endpoint} -> Counter
metrics:api:errors:{endpoint} -> Counter
```

**Example:**
```typescript
// Automatically tracked by middleware
GET /api/proof/status/123 -> 245ms response time
```

### 2. Proof Generation Success Rates

**What's Tracked:**
- Total proofs generated (successful)
- Total proofs failed
- Average generation time
- Success rate percentage
- Circuit type for each generation

**How It's Tracked:**
- Manually tracked in `proof.controller.ts`
- Called after proof generation attempt
- Includes duration measurement

**Data Structure:**
```
metrics:proof:generated -> Counter
metrics:proof:failed -> Counter
metrics:proof:generation_time -> Sorted set of {duration, timestamp, circuit}
```

**Example:**
```typescript
await metricsService.trackProofGeneration(
  userId,
  'verifyIncome',
  true,  // success
  4523   // duration in ms
);
```

### 3. Transaction Confirmation Times

**What's Tracked:**
- Time from submission to confirmation
- Transaction hash
- Timestamp of confirmation

**How It's Tracked:**
- Tracked in `proofStatusPoller.service.ts`
- Calculated when transaction status changes to confirmed
- Measures blockchain confirmation latency

**Data Structure:**
```
metrics:tx:confirmation_time -> Sorted set of {duration, timestamp, txHash}
```

**Example:**
```typescript
const confirmationTime = Date.now() - new Date(submittedAt).getTime();
await metricsService.trackTransactionConfirmation(txHash, confirmationTime);
```

### 4. External Service Uptime

**What's Tracked:**
- Success/failure count for each service (Plaid, Stripe, Sila, Midnight)
- Response time for each call
- Uptime percentage calculation

**Services Monitored:**
- **Plaid**: Financial data API
- **Stripe**: Identity verification API
- **Sila**: Payment settlement API
- **Midnight**: Blockchain RPC node

**How It's Tracked:**
- Tracked in each service client
- Wraps external API calls with timing
- Records success/failure status

**Data Structure:**
```
metrics:service:{service}:success -> Counter
metrics:service:{service}:failure -> Counter
metrics:service:{service}:response_time -> Sorted set of {duration, timestamp, success}
```

**Example:**
```typescript
const startTime = Date.now();
try {
  const result = await plaidClient.getIncome(accessToken);
  const duration = Date.now() - startTime;
  await metricsService.trackExternalService('plaid', true, duration);
  return result;
} catch (error) {
  const duration = Date.now() - startTime;
  await metricsService.trackExternalService('plaid', false, duration);
  throw error;
}
```

### 5. Proof Submission Status

**What's Tracked:**
- Total proofs submitted
- Total proofs confirmed
- Total proofs failed
- Proof ID for each submission

**How It's Tracked:**
- Tracked in `proof.controller.ts` and `proofStatusPoller.service.ts`
- Updates as proof status changes

**Data Structure:**
```
metrics:proof:submitted -> Counter
metrics:proof:confirmed -> Counter
metrics:proof:failed -> Counter
```

**Example:**
```typescript
await metricsService.trackProofSubmission(proofId, 'submitted');
// Later, when confirmed:
await metricsService.trackProofSubmission(proofId, 'confirmed');
```

## API Endpoints

All endpoints require authentication via JWT token.

### Get All Metrics
```
GET /api/metrics
```

**Response:**
```json
{
  "proof": {
    "totalGenerated": 150,
    "totalSubmitted": 145,
    "totalConfirmed": 140,
    "totalFailed": 5,
    "successRate": 96.55,
    "avgGenerationTime": 4234
  },
  "api": {
    "totalRequests": 5420,
    "avgResponseTime": 245,
    "errorRate": 2.1,
    "requestsByEndpoint": {
      "GET /api/proof/status/:id": 1200,
      "POST /api/proof/submit": 145,
      "GET /api/plaid/income": 300
    }
  },
  "externalServices": {
    "plaid": {
      "uptime": 99.8,
      "avgResponseTime": 1234
    },
    "stripe": {
      "uptime": 99.9,
      "avgResponseTime": 890
    },
    "sila": {
      "uptime": 98.5,
      "avgResponseTime": 1567
    },
    "midnight": {
      "uptime": 97.2,
      "avgResponseTime": 2345
    }
  },
  "timestamp": "2025-11-17T10:30:00.000Z"
}
```

### Get Proof Metrics
```
GET /api/metrics/proofs
```

**Response:**
```json
{
  "totalGenerated": 150,
  "totalSubmitted": 145,
  "totalConfirmed": 140,
  "totalFailed": 5,
  "successRate": 96.55,
  "avgGenerationTime": 4234
}
```

### Get API Metrics
```
GET /api/metrics/api
```

**Response:**
```json
{
  "totalRequests": 5420,
  "avgResponseTime": 245,
  "errorRate": 2.1,
  "requestsByEndpoint": {
    "GET /api/proof/status/:id": 1200,
    "POST /api/proof/submit": 145
  }
}
```

### Get External Service Metrics
```
GET /api/metrics/services
```

**Response:**
```json
{
  "plaid": {
    "uptime": 99.8,
    "avgResponseTime": 1234
  },
  "stripe": {
    "uptime": 99.9,
    "avgResponseTime": 890
  },
  "sila": {
    "uptime": 98.5,
    "avgResponseTime": 1567
  },
  "midnight": {
    "uptime": 97.2,
    "avgResponseTime": 2345
  }
}
```

### Reset Metrics (Admin)
```
POST /api/metrics/reset
```

**Response:**
```json
{
  "message": "Metrics reset successfully"
}
```

### Get Alert Statistics
```
GET /api/metrics/alerts
```

**Response:**
```json
{
  "totalAlerts": 12,
  "alertsByType": {
    "api_downtime": 2,
    "proof_generation_failure": 5,
    "high_error_rate": 3,
    "database_connection": 2
  },
  "lastAlert": {
    "type": "proof_generation_failure",
    "timestamp": "2025-11-17T10:25:00.000Z",
    "message": "Proof generation failure rate exceeded threshold"
  }
}
```

### Test Alert (Admin)
```
POST /api/metrics/alerts/test
Content-Type: application/json

{
  "alertType": "api_downtime"
}
```

**Response:**
```json
{
  "message": "Test alert triggered for api_downtime"
}
```

## Integration Points

### 1. Automatic API Tracking

All API requests are automatically tracked via middleware:

```typescript
// In src/index.ts
app.use(metricsMiddleware);
```

No additional code needed in controllers.

### 2. Proof Generation Tracking

In `src/controllers/proof.controller.ts`:

```typescript
const startTime = Date.now();
try {
  const proof = await proofServerService.generateProof(circuit, witness, publicInputs);
  const duration = Date.now() - startTime;
  
  // Track successful generation
  await metricsService.trackProofGeneration(userId, circuit, true, duration);
  
  return proof;
} catch (error) {
  const duration = Date.now() - startTime;
  
  // Track failed generation
  await metricsService.trackProofGeneration(userId, circuit, false, duration);
  
  throw error;
}
```

### 3. Transaction Confirmation Tracking

In `src/services/proofStatusPoller.service.ts`:

```typescript
if (status.confirmed) {
  const confirmationTime = Date.now() - new Date(submittedAt).getTime();
  await metricsService.trackTransactionConfirmation(txHash, confirmationTime);
  await metricsService.trackProofSubmission(proofId, 'confirmed');
}
```

### 4. External Service Tracking

In each service client (Plaid, Stripe, Sila, Midnight):

```typescript
const startTime = Date.now();
try {
  const result = await externalAPI.call();
  const duration = Date.now() - startTime;
  await metricsService.trackExternalService('service_name', true, duration);
  return result;
} catch (error) {
  const duration = Date.now() - startTime;
  await metricsService.trackExternalService('service_name', false, duration);
  throw error;
}
```

## Data Retention

- **Retention Period**: 7 days
- **Storage**: Redis
- **Automatic Cleanup**: TTL set on all keys
- **Reset**: Manual reset available via API

## Performance Considerations

1. **Non-Blocking**: All metrics tracking is async and doesn't block responses
2. **Error Handling**: Metrics failures are logged but don't affect main operations
3. **Redis Usage**: Efficient data structures (sorted sets, counters)
4. **Memory**: Automatic expiration prevents unbounded growth

## Monitoring Dashboard Integration

The metrics can be integrated with monitoring dashboards:

1. **Grafana**: Query Redis directly or use the API endpoints
2. **Custom Dashboard**: Build using the REST API
3. **Alerting**: Use the alerting service for notifications

## Example Queries

### Get Average Response Time for Last Hour

```typescript
const metrics = await metricsService.getAPIMetrics();
console.log(`Average response time: ${metrics.avgResponseTime}ms`);
```

### Check Proof Success Rate

```typescript
const proofMetrics = await metricsService.getProofMetrics();
if (proofMetrics.successRate < 95) {
  console.warn('Proof success rate below threshold!');
}
```

### Monitor External Service Health

```typescript
const serviceMetrics = await metricsService.getExternalServiceMetrics();
for (const [service, stats] of Object.entries(serviceMetrics)) {
  if (stats.uptime < 99) {
    console.warn(`${service} uptime is ${stats.uptime}%`);
  }
}
```

## Testing

To test metrics collection:

1. **Generate Test Traffic**:
```bash
# Make some API calls
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/metrics
```

2. **Check Metrics**:
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/metrics
```

3. **Reset Metrics**:
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/metrics/reset
```

## Troubleshooting

### Metrics Not Appearing

1. Check Redis connection:
```bash
redis-cli ping
```

2. Check logs for errors:
```bash
tail -f backend/logs/combined.log | grep metrics
```

3. Verify middleware is loaded:
```typescript
// Should be in src/index.ts
app.use(metricsMiddleware);
```

### High Memory Usage

1. Check Redis memory:
```bash
redis-cli info memory
```

2. Verify TTL is set:
```bash
redis-cli ttl "metrics:api:requests:GET /api/proof/status/:id"
```

3. Manually clean up if needed:
```bash
redis-cli keys "metrics:*" | xargs redis-cli del
```

## Future Enhancements

1. **Histogram Support**: Add percentile calculations (p50, p95, p99)
2. **Custom Time Windows**: Support for hourly, daily, weekly aggregations
3. **Export Functionality**: Export metrics to CSV or JSON
4. **Real-time Streaming**: WebSocket support for live metrics
5. **Anomaly Detection**: Automatic detection of unusual patterns
6. **Cost Tracking**: Track API costs for external services

## Related Documentation

- [Monitoring Guide](./MONITORING.md)
- [Alerting Configuration](./TASK_23_SUMMARY.md)
- [Logging Implementation](./LOGGING.md)
- [API Documentation](./README.md)
