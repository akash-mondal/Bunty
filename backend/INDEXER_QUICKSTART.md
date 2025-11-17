# Midnight Indexer - Quick Start Guide

## Overview

The Midnight indexer captures on-chain proof submissions and makes them queryable via GraphQL. This allows verifiers to validate proofs without accessing raw user data.

## Quick Setup

### 1. Start Docker Containers

```bash
docker-compose up -d
```

This starts:
- Midnight Network node (port 26657)
- Proof Server (port 6300)
- Indexer (port 8081)
- PostgreSQL (port 5432)
- Redis (port 6379)

### 2. Verify Indexer is Running

```bash
# Check container status
docker ps | grep indexer

# Check indexer logs
docker logs bunty-indexer

# Test indexer health
curl http://localhost:3001/api/indexer/health
```

### 3. Run Integration Test

```bash
cd backend
npx tsx src/scripts/test-indexer.ts
```

## Usage Examples

### For Backend Developers

#### Using the Indexer Service

```typescript
import { indexerService } from './services/indexer.service';

// Query proof by nullifier
const proof = await indexerService.getProofByNullifier('0x123abc...');

// Get all proofs for a user
const userProofs = await indexerService.getProofsByUserDID('did:midnight:user123');

// Verify proof validity
const validation = await indexerService.verifyProof('0x123abc...');
if (validation && validation.isValid) {
  console.log('Proof is valid!');
}
```

### For Verifiers (Third Parties)

#### Using the Verifier Client

```typescript
import { BuntyVerifierClient } from './services/verifier.client';

const verifier = new BuntyVerifierClient('http://your-api.com:8081/graphql');

// Verify a proof
const validation = await verifier.verifyProof('0x123abc...');
if (validation && validation.isValid) {
  console.log('User meets threshold:', validation.threshold);
}

// Check if proof meets minimum threshold
const meetsThreshold = await verifier.meetsThreshold('0x123abc...', 50000);
if (meetsThreshold) {
  console.log('User qualifies for loan');
}

// Get user's proof history
const proofs = await verifier.getUserProofs('did:midnight:user123');
console.log(`User has ${proofs.length} valid proofs`);
```

#### Using REST API

```bash
# Verify a proof
curl -X POST http://localhost:3001/api/indexer/verify \
  -H "Content-Type: application/json" \
  -d '{"nullifier": "0x123abc..."}'

# Query proof by nullifier
curl http://localhost:3001/api/indexer/proof/0x123abc...

# Query user proofs
curl http://localhost:3001/api/indexer/proofs/user/did:midnight:user123

# Get all proofs (paginated)
curl "http://localhost:3001/api/indexer/proofs?limit=10&offset=0"
```

#### Using GraphQL Directly

```bash
curl -X POST http://localhost:8081/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetProof($nullifier: String!) { proofRecord(nullifier: $nullifier) { nullifier threshold timestamp expiresAt userDID isValid isExpired } }",
    "variables": {"nullifier": "0x123abc..."}
  }'
```

## Common Workflows

### 1. Lender Verifying Income Proof

```typescript
const verifier = new BuntyVerifierClient();

// User provides their proof nullifier
const nullifier = '0x123abc...';

// Verify proof exists and is valid
const validation = await verifier.verifyProof(nullifier);

if (!validation) {
  return 'Proof not found';
}

if (!validation.isValid) {
  return 'Proof is invalid or expired';
}

// Check if income meets loan requirement
if (validation.threshold >= 50000) {
  return 'Approved for loan';
} else {
  return 'Income too low for this loan product';
}
```

### 2. Rental Platform Checking Creditworthiness

```typescript
const verifier = new BuntyVerifierClient();

// Get all proofs for user
const userDID = 'did:midnight:user123';
const proofs = await verifier.getUserProofs(userDID);

// Filter for valid, non-expired proofs
const validProofs = proofs.filter(p => p.isValid && !p.isExpired);

if (validProofs.length === 0) {
  return 'No valid proofs found';
}

// Check if any proof meets rental requirement
const meetsRequirement = validProofs.some(p => p.threshold >= 3000);

if (meetsRequirement) {
  return 'Approved for rental';
} else {
  return 'Income verification required';
}
```

### 3. DeFi Protocol Checking Collateral

```typescript
const verifier = new BuntyVerifierClient();

const nullifier = '0x123abc...';

// Get full proof details
const proof = await verifier.getProof(nullifier);

if (!proof) {
  return 'Proof not found';
}

// Check expiry
const isExpired = await verifier.isExpired(nullifier);
if (isExpired) {
  return 'Proof expired, please submit new proof';
}

// Check threshold for collateral requirement
if (proof.threshold >= 100000) {
  return 'Sufficient collateral verified';
} else {
  return 'Insufficient collateral';
}
```

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/indexer/health` | GET | Check indexer health |
| `/api/indexer/proof/:nullifier` | GET | Get proof by nullifier |
| `/api/indexer/proofs/user/:userDID` | GET | Get all proofs for user |
| `/api/indexer/proofs` | GET | Get all proofs (paginated) |
| `/api/indexer/verify` | POST | Verify proof validity |

## Troubleshooting

### Indexer Not Responding

```bash
# Check if container is running
docker ps | grep indexer

# Restart indexer
docker-compose restart indexer

# Check logs for errors
docker logs bunty-indexer -f
```

### Proof Not Found

1. Verify proof was submitted to blockchain
2. Check transaction was confirmed
3. Wait a few seconds for indexer to process
4. Check indexer logs for errors

### Connection Errors

1. Verify indexer URL is correct
2. Check network connectivity
3. Ensure PostgreSQL is accessible
4. Review indexer configuration

## Environment Variables

```bash
# Backend .env
INDEXER_URL=http://localhost:8081/graphql

# Docker Compose
NODE_URL=http://midnight-node:26657
POSTGRES_URL=postgresql://bunty_user:bunty_password@postgres:5432/bunty_indexer
```

## Next Steps

1. ✅ Start Docker containers
2. ✅ Run integration test
3. ✅ Submit a test proof
4. ✅ Query the proof via indexer
5. ✅ Integrate verifier client into your app

## Documentation

- Full documentation: [INDEXER_INTEGRATION.md](./INDEXER_INTEGRATION.md)
- Implementation summary: [TASK_17_SUMMARY.md](./TASK_17_SUMMARY.md)
- Proof submission flow: [PROOF_SUBMISSION_FLOW.md](./PROOF_SUBMISSION_FLOW.md)

## Support

For issues or questions:
1. Check the logs: `docker logs bunty-indexer`
2. Review documentation: `INDEXER_INTEGRATION.md`
3. Run test script: `npx tsx src/scripts/test-indexer.ts`
