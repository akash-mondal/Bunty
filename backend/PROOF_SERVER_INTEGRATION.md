# Proof Server Integration

This document describes the integration with the Midnight proof server for zero-knowledge proof generation.

## Overview

The proof server is a Docker container that generates BLS12-381 zero-knowledge proofs from witness data. It runs locally on port 6300 and communicates via HTTP API.

## Architecture

```
┌─────────────────┐
│   Backend API   │
│                 │
│  ProofServer    │
│    Service      │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Proof Server   │
│  (Docker)       │
│  Port 6300      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Circuits      │
│   /circuits     │
└─────────────────┘
```

## Configuration

### Environment Variables

```bash
# Proof server URL (default: http://localhost:6300)
PROOF_SERVER_URL=http://localhost:6300

# Timeout for proof generation in milliseconds (default: 30000)
PROOF_SERVER_TIMEOUT=30000

# Maximum retry attempts (default: 3)
PROOF_SERVER_MAX_RETRIES=3
```

### Docker Setup

The proof server is configured in `docker-compose.yml`:

```yaml
proof-server:
  image: midnightnetwork/proof-server:latest
  container_name: bunty-proof-server
  ports:
    - "6300:6300"
  environment:
    - CIRCUIT_PATH=/circuits
    - LOG_LEVEL=info
  volumes:
    - ./midnight-contract/circuits:/circuits
```

## API Endpoints

### Generate Proof

**POST** `/api/proof/generate`

Generate a zero-knowledge proof using the proof server.

**Request:**
```json
{
  "circuit": "verifyIncome",
  "witness": {
    "income": 75000,
    "employmentMonths": 24,
    "employerHash": "0x1234...",
    "assets": 50000,
    "liabilities": 10000,
    "creditScore": 720,
    "ssnVerified": true,
    "selfieVerified": true,
    "documentVerified": true,
    "timestamp": 1700000000
  },
  "threshold": 60000
}
```

**Response:**
```json
{
  "success": true,
  "proof": {
    "proof": "base64_encoded_proof_blob...",
    "publicInputs": ["60000"],
    "publicOutputs": {
      "nullifier": "0xabcd...",
      "timestamp": 1700000000,
      "expiresAt": 1702592000
    }
  }
}
```

### Submit Proof

**POST** `/api/proof/submit`

Submit a generated proof to the Midnight blockchain.

**Request:**
```json
{
  "proof": {
    "proof": "base64_encoded_proof_blob...",
    "publicInputs": ["60000"],
    "publicOutputs": {
      "nullifier": "0xabcd...",
      "timestamp": 1700000000,
      "expiresAt": 1702592000
    }
  },
  "walletSignature": "signed_transaction_data"
}
```

**Response:**
```json
{
  "txHash": "0x5678...",
  "proofId": "proof_1700000000_abcd1234",
  "status": "pending"
}
```

### Get Proof Status

**GET** `/api/proof/status/:proofId`

Query the status of a submitted proof.

**Response:**
```json
{
  "proofId": "proof_1700000000_abcd1234",
  "nullifier": "0xabcd...",
  "txHash": "0x5678...",
  "threshold": 60000,
  "status": "confirmed",
  "submittedAt": "2024-11-15T10:00:00Z",
  "confirmedAt": "2024-11-15T10:05:00Z",
  "expiresAt": "2024-12-15T10:00:00Z"
}
```

### Health Check

**GET** `/api/proof/health`

Check if the proof server is available.

**Response:**
```json
{
  "status": "healthy",
  "proofServer": "available"
}
```

## Circuit Types

The proof server supports three circuit types:

1. **verifyIncome** - Validates income threshold and employment duration
2. **verifyAssets** - Validates net worth (assets - liabilities)
3. **verifyCreditworthiness** - Validates credit score and income stability

## Proof Generation Flow

1. **Client Request**: Frontend sends witness data and threshold to backend
2. **Validation**: Backend validates witness structure and circuit type
3. **Proof Generation**: Backend calls proof server with formatted request
4. **Retry Logic**: Automatic retry with exponential backoff on failures
5. **Response**: Backend returns ZK proof to client
6. **Submission**: Client signs transaction and submits proof to blockchain

## Error Handling

### Timeout Errors

If proof generation takes longer than the configured timeout:

```json
{
  "error": "Failed to generate proof",
  "message": "Proof server timeout after 30000ms (attempt 1/3)"
}
```

### Connection Errors

If the proof server is not running:

```json
{
  "error": "Failed to generate proof",
  "message": "Proof server is not available. Please ensure the proof server Docker container is running on port 6300."
}
```

### Invalid Witness

If witness data is malformed:

```json
{
  "error": "Invalid witness structure"
}
```

### Nullifier Replay

If a proof with the same nullifier already exists:

```json
{
  "error": "Proof with this nullifier already exists",
  "code": "NULLIFIER_ALREADY_USED"
}
```

## Retry Strategy

The proof server client implements automatic retry with exponential backoff:

- **Max Retries**: 3 attempts
- **Base Delay**: 1 second
- **Max Delay**: 10 seconds
- **Backoff**: Exponential with jitter

Retryable errors:
- Timeout (ECONNABORTED, ETIMEDOUT)
- Network errors (ENETUNREACH)
- Server errors (5xx status codes)

Non-retryable errors:
- Connection refused (server not running)
- Client errors (4xx status codes)
- Invalid request format

## Performance Considerations

### Proof Generation Time

- Expected: 2-5 seconds for typical witness data
- Timeout: 30 seconds (configurable)
- Concurrent requests: Proof server handles multiple requests

### Resource Usage

- CPU: High during proof generation (BLS12-381 operations)
- Memory: ~2GB recommended for proof server container
- Network: Minimal (witness data is typically < 1KB)

## Security

### Data Privacy

- Witness data is sent directly from client to proof server (not stored on backend)
- Backend only receives the generated proof (no private data)
- Proofs are zero-knowledge (reveal no information about witness)

### Nullifier Prevention

- Each proof has a unique nullifier derived from witness data
- Database enforces uniqueness constraint on nullifiers
- Prevents proof replay attacks

### Proof Expiry

- All proofs expire after 30 days
- Expiry timestamp is part of public outputs
- Verifiers must check expiry before accepting proofs

## Troubleshooting

### Proof Server Not Starting

1. Check Docker container status:
   ```bash
   docker ps | grep proof-server
   ```

2. Check container logs:
   ```bash
   docker logs bunty-proof-server
   ```

3. Verify circuits are mounted:
   ```bash
   docker exec bunty-proof-server ls /circuits
   ```

### Proof Generation Failures

1. Check proof server health:
   ```bash
   curl http://localhost:6300/health
   ```

2. Verify witness data format matches expected structure

3. Check proof server logs for detailed error messages

### Slow Proof Generation

1. Increase timeout in environment variables
2. Check system resources (CPU, memory)
3. Reduce concurrent proof generation requests

## Development

### Testing Proof Server Integration

```typescript
import proofServerService from './services/proofServer.service';

// Health check
const isHealthy = await proofServerService.healthCheck();

// Generate proof
const proof = await proofServerService.generateProof(
  'verifyIncome',
  witnessData,
  { threshold: 60000 }
);
```

### Mock Proof Server for Testing

For unit tests without a running proof server, mock the service:

```typescript
jest.mock('./services/proofServer.service', () => ({
  generateProof: jest.fn().mockResolvedValue({
    proof: 'mock_proof_data',
    publicInputs: ['60000'],
    publicOutputs: {
      nullifier: '0xmock',
      timestamp: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    },
  }),
}));
```

## References

- [Midnight Network Documentation](https://docs.midnight.network)
- [BLS12-381 Curve Specification](https://electriccoin.co/blog/new-snark-curve/)
- [Zero-Knowledge Proofs Overview](https://z.cash/technology/zksnarks/)
