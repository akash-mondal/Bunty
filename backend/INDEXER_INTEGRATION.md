# Midnight GraphQL Indexer Integration

This document describes the integration with the Midnight Network GraphQL indexer for querying and validating zero-knowledge proofs.

## Overview

The Midnight indexer captures on-chain proof submission events and makes them queryable via GraphQL. This allows verifiers (lenders, rental platforms, DeFi protocols) to validate proofs without accessing raw user data.

## Architecture

```
┌─────────────────┐
│   Verifier App  │
│  (Lender, etc)  │
└────────┬────────┘
         │ GraphQL Query
         ▼
┌─────────────────┐
│  Midnight       │
│  Indexer        │
│  Port 8081      │
└────────┬────────┘
         │ Listens to
         ▼
┌─────────────────┐
│  Midnight       │
│  Network Node   │
│  Port 26657     │
└─────────────────┘
```

## Configuration

### Docker Compose Setup

The indexer is configured in `docker-compose.yml`:

```yaml
indexer:
  image: midnightnetwork/indexer:latest
  ports:
    - "8081:8081"
  environment:
    - NODE_URL=http://midnight-node:26657
    - POSTGRES_URL=postgresql://bunty_user:bunty_password@postgres:5432/bunty_indexer
  depends_on:
    - midnight-node
    - postgres
```

### Environment Variables

- `INDEXER_URL`: GraphQL endpoint URL (default: `http://localhost:8081/graphql`)

## API Endpoints

### REST API (Backend)

The backend provides REST endpoints that wrap the GraphQL queries:

#### 1. Get Proof by Nullifier

```http
GET /api/indexer/proof/:nullifier
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nullifier": "0x123abc...",
    "threshold": 50000,
    "timestamp": 1234567890,
    "expiresAt": 1237159890,
    "userDID": "did:midnight:user123",
    "isValid": true,
    "isExpired": false
  }
}
```

#### 2. Get Proofs by User DID

```http
GET /api/indexer/proofs/user/:userDID
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "nullifier": "0x123abc...",
      "threshold": 50000,
      "timestamp": 1234567890,
      "expiresAt": 1237159890,
      "userDID": "did:midnight:user123",
      "isValid": true,
      "isExpired": false
    }
  ],
  "count": 1
}
```

#### 3. Get All Proofs (Paginated)

```http
GET /api/indexer/proofs?limit=50&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 50,
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

#### 4. Verify Proof

```http
POST /api/indexer/verify
Content-Type: application/json

{
  "nullifier": "0x123abc..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "threshold": 50000,
    "expiresAt": 1237159890,
    "timestamp": 1234567890,
    "userDID": "did:midnight:user123"
  }
}
```

#### 5. Health Check

```http
GET /api/indexer/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "indexerUrl": "http://localhost:8081/graphql",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## GraphQL Queries

### Direct GraphQL Access

You can query the indexer directly at `http://localhost:8081/graphql`:

#### Query Proof by Nullifier

```graphql
query GetProofByNullifier($nullifier: String!) {
  proofRecord(nullifier: $nullifier) {
    nullifier
    threshold
    timestamp
    expiresAt
    userDID
    isValid
    isExpired
  }
}
```

#### Query Proofs by User DID

```graphql
query GetProofsByUserDID($userDID: String!) {
  proofRecords(where: { userDID: $userDID }) {
    nullifier
    threshold
    timestamp
    expiresAt
    userDID
    isValid
    isExpired
  }
}
```

#### Subscribe to New Proofs

```graphql
subscription OnNewProof {
  proofSubmitted {
    nullifier
    threshold
    timestamp
    expiresAt
    userDID
  }
}
```

## Verifier Client Library

The `BuntyVerifierClient` provides a convenient TypeScript interface for verifiers:

### Installation

```typescript
import { BuntyVerifierClient } from './services/verifier.client';
```

### Usage Examples

#### Basic Proof Verification

```typescript
const verifier = new BuntyVerifierClient('http://localhost:8081/graphql');

// Verify a proof
const validation = await verifier.verifyProof('0x123abc...');

if (validation && validation.isValid) {
  console.log('Proof is valid!');
  console.log('Threshold:', validation.threshold);
  console.log('Expires at:', new Date(validation.expiresAt * 1000));
} else {
  console.log('Proof is invalid or not found');
}
```

#### Check Threshold

```typescript
// Check if proof meets minimum threshold
const meetsThreshold = await verifier.meetsThreshold('0x123abc...', 50000);

if (meetsThreshold) {
  console.log('User meets income threshold of $50,000');
}
```

#### Get User Proof History

```typescript
// Get all proofs for a user
const userProofs = await verifier.getUserProofs('did:midnight:user123');

console.log(`User has ${userProofs.length} proofs`);
userProofs.forEach(proof => {
  console.log(`- Threshold: ${proof.threshold}, Valid: ${proof.isValid}`);
});
```

#### Check Expiry

```typescript
// Check if a proof is expired
const isExpired = await verifier.isExpired('0x123abc...');

if (isExpired) {
  console.log('Proof has expired, user needs to submit a new one');
}
```

## Testing

### Run Indexer Integration Test

```bash
cd backend
npx tsx src/scripts/test-indexer.ts
```

This test script will:
1. Check indexer health
2. Query non-existent proofs (should return null)
3. Query proofs by user DID
4. Query all proofs with pagination
5. Test proof verification
6. Test the verifier client library

### Expected Output

```
=== Midnight Indexer Integration Test ===

Test 1: Indexer Health Check
✓ Indexer URL: http://localhost:8081/graphql
✓ Indexer Status: Healthy

Test 2: Query Non-Existent Proof by Nullifier
✓ Correctly returned null for non-existent proof

Test 3: Query Proofs by User DID
✓ Found 0 proofs for user did:midnight:test123

Test 4: Query All Proofs (Paginated)
✓ Retrieved 0 proofs (limit: 10, offset: 0)
  No proofs found in indexer (this is expected for a fresh deployment)

Test 5: Verify Proof
✓ Correctly returned null for non-existent proof

Test 6: Verifier Client Library
✓ Verifier client initialized with URL: http://localhost:8081/graphql
✓ Verifier client correctly returned null for non-existent proof
✓ Threshold check (50000): false
✓ Expiry check: expired

=== Test Complete ===
```

## Integration with Proof Submission Flow

When a user submits a proof:

1. **Frontend** generates proof locally using proof server
2. **Frontend** signs transaction with Lace Wallet
3. **Backend** receives signed transaction via `/api/proof/submit`
4. **Backend** broadcasts transaction to Midnight Network
5. **Midnight Network** processes transaction and emits events
6. **Indexer** captures proof submission event
7. **Indexer** stores proof record in PostgreSQL
8. **Verifiers** can now query the proof via GraphQL

## Proof Record Schema

```typescript
interface ProofRecord {
  nullifier: string;      // Unique identifier preventing replay attacks
  threshold: number;      // Income/asset threshold proven
  timestamp: number;      // Unix timestamp of submission
  expiresAt: number;      // Unix timestamp of expiry (30 days)
  userDID: string;        // User's decentralized identifier
  isValid: boolean;       // Whether proof is currently valid
  isExpired: boolean;     // Whether proof has expired
}
```

## Error Handling

### Common Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| INDEXER_001 | Nullifier parameter missing | Provide nullifier in request |
| INDEXER_002 | Proof not found | Proof doesn't exist or hasn't been indexed yet |
| INDEXER_003 | Query failed | Check indexer connection and logs |
| INDEXER_004 | User DID parameter missing | Provide userDID in request |
| INDEXER_012 | Health check failed | Ensure indexer container is running |

### Troubleshooting

#### Indexer Not Responding

```bash
# Check if indexer container is running
docker ps | grep indexer

# Check indexer logs
docker logs bunty-indexer

# Restart indexer
docker-compose restart indexer
```

#### Proof Not Appearing in Indexer

1. Check if transaction was confirmed on Midnight Network
2. Check indexer logs for errors
3. Verify indexer is connected to correct node
4. Wait a few seconds for indexer to process events

#### GraphQL Query Errors

1. Verify indexer URL is correct
2. Check network connectivity
3. Ensure PostgreSQL database is accessible
4. Review indexer logs for schema issues

## Production Considerations

### Security

- **Public Endpoints**: Indexer queries are public by design (no authentication required)
- **Rate Limiting**: Consider adding rate limiting for production deployments
- **CORS**: Configure CORS appropriately for your verifier domains

### Performance

- **Caching**: Consider caching frequently accessed proofs
- **Pagination**: Always use pagination for large result sets
- **Indexing**: Ensure PostgreSQL indexes are optimized for query patterns

### Monitoring

Monitor these metrics:
- Indexer response times
- Query success/failure rates
- Number of proofs indexed
- Indexer lag behind blockchain head

### High Availability

For production:
- Run multiple indexer instances behind a load balancer
- Use managed PostgreSQL with replication
- Implement health checks and automatic failover
- Set up alerting for indexer downtime

## Next Steps

1. **Start Docker containers**: `docker-compose up -d`
2. **Run test script**: `npx tsx src/scripts/test-indexer.ts`
3. **Submit a test proof**: Use the proof submission flow
4. **Query the proof**: Use the verifier client or REST API
5. **Integrate into your application**: Use the verifier client library

## References

- [Midnight Network Documentation](https://docs.midnight.network)
- [GraphQL Documentation](https://graphql.org/learn/)
- [Compact Smart Contracts](../midnight-contract/CONTRACTS.md)
- [Proof Submission Flow](./PROOF_SUBMISSION_FLOW.md)
