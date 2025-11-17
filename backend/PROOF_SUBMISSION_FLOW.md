# Proof Submission and Blockchain Integration

This document describes the implementation of proof submission to the Midnight blockchain and the transaction status tracking system.

## Overview

The proof submission system allows users to submit zero-knowledge proofs to the Midnight blockchain for on-chain verification. The system handles:

1. Transaction broadcasting to Midnight Network
2. Transaction status polling and confirmation tracking
3. Database status updates
4. Background polling service for pending transactions

## Architecture

```
┌─────────────┐
│   Client    │
│  (Frontend) │
└──────┬──────┘
       │
       │ POST /api/proof/submit
       │ { proof, walletSignature }
       ▼
┌─────────────────────────────────┐
│  Proof Controller               │
│  - Validate proof structure     │
│  - Check nullifier uniqueness   │
│  - Submit to Midnight Network   │
│  - Store in database (pending)  │
└──────┬──────────────────────────┘
       │
       │ submitTransaction()
       ▼
┌─────────────────────────────────┐
│  Midnight Service               │
│  - JSON-RPC client              │
│  - broadcast_tx_async           │
│  - Returns tx hash immediately  │
└──────┬──────────────────────────┘
       │
       │ tx_hash
       ▼
┌─────────────────────────────────┐
│  Midnight Network Node          │
│  Port: 26657                    │
│  - Receives transaction         │
│  - Processes proof              │
│  - Confirms on blockchain       │
└─────────────────────────────────┘
       │
       │ (Background polling)
       ▼
┌─────────────────────────────────┐
│  Proof Status Poller Service    │
│  - Polls every 10 seconds       │
│  - Checks pending transactions  │
│  - Updates database status      │
└─────────────────────────────────┘
```

## Components

### 1. Database Schema

The `proof_submissions` table tracks all proof submissions:

```sql
CREATE TABLE proof_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  proof_id VARCHAR(255) UNIQUE NOT NULL,
  nullifier VARCHAR(64) UNIQUE NOT NULL,
  tx_hash VARCHAR(255) NOT NULL,
  threshold INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

**Status values:**
- `pending`: Transaction submitted but not yet confirmed
- `confirmed`: Transaction confirmed on blockchain
- `failed`: Transaction failed on blockchain

### 2. Midnight Service

Located at: `backend/src/services/midnight.service.ts`

#### Key Methods:

**submitTransaction(signedTx: string, proof: any): Promise<string>**
- Submits a signed transaction with ZK proof to Midnight Network
- Uses `broadcast_tx_async` for non-blocking submission
- Returns transaction hash immediately
- Throws error if node is unavailable

**getTransactionStatus(txHash: string): Promise<TxStatus | null>**
- Queries transaction status from Midnight Network
- Returns transaction details including confirmation status
- Returns null if transaction not found (still pending)

**pollTransactionStatus(txHash: string, maxAttempts: number, intervalMs: number): Promise<TxStatus | null>**
- Polls transaction status until confirmed or timeout
- Default: 30 attempts with 2-second intervals (60 seconds total)
- Returns confirmed status or null on timeout

### 3. Proof Status Poller Service

Located at: `backend/src/services/proofStatusPoller.service.ts`

A background service that continuously monitors pending proof submissions and updates their status.

#### Features:

- **Automatic Polling**: Runs every 10 seconds
- **Batch Processing**: Checks up to 50 pending proofs per cycle
- **Status Updates**: Automatically updates database when transactions confirm or fail
- **Manual Polling**: Supports on-demand polling for specific proofs
- **Graceful Shutdown**: Stops cleanly on SIGTERM/SIGINT

#### Methods:

**start()**
- Starts the background polling service
- Runs immediately and then at 10-second intervals

**stop()**
- Stops the background polling service
- Called during graceful shutdown

**pollSpecificProof(proofId: string): Promise<boolean>**
- Manually triggers a poll for a specific proof
- Used by the status endpoint for real-time updates

### 4. API Endpoints

#### POST /api/proof/submit

Submit a proof to the Midnight blockchain.

**Request:**
```json
{
  "proof": {
    "proof": "base64_encoded_proof_blob",
    "publicInputs": ["threshold_value"],
    "publicOutputs": {
      "nullifier": "0x1234...",
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
  "txHash": "0xABCD1234...",
  "proofId": "proof_1700000000_12345678",
  "status": "pending"
}
```

**Error Responses:**
- `401`: Unauthorized (missing or invalid JWT)
- `400`: Invalid proof structure or missing fields
- `409`: Nullifier already used (replay attack prevention)
- `500`: Failed to submit transaction to Midnight Network

#### GET /api/proof/status/:proofId

Get the status of a proof submission.

**Response:**
```json
{
  "proofId": "proof_1700000000_12345678",
  "nullifier": "0x1234...",
  "txHash": "0xABCD1234...",
  "threshold": 50000,
  "status": "confirmed",
  "submittedAt": "2024-11-15T10:30:00Z",
  "confirmedAt": "2024-11-15T10:31:30Z",
  "expiresAt": "2024-12-15T10:30:00Z"
}
```

**Status Flow:**
1. User queries status endpoint
2. If status is `pending`, triggers manual poll
3. Re-queries database for updated status
4. Returns current status to user

**Error Responses:**
- `401`: Unauthorized
- `404`: Proof not found
- `500`: Failed to fetch proof status

## Transaction Flow

### 1. Proof Submission

```typescript
// Client submits proof
POST /api/proof/submit
{
  proof: ZKProof,
  walletSignature: string
}

// Controller validates and submits
1. Validate proof structure
2. Check nullifier uniqueness (prevent replay)
3. Submit to Midnight Network (broadcast_tx_async)
4. Store in database with status='pending'
5. Return tx_hash and proof_id to client
```

### 2. Status Tracking

```typescript
// Background poller (every 10 seconds)
1. Query all pending proofs from database
2. For each proof:
   - Query transaction status from Midnight Network
   - If confirmed: Update status='confirmed', set confirmed_at
   - If failed: Update status='failed'
   - If not found: Keep as pending

// Manual status check (on-demand)
GET /api/proof/status/:proofId
1. Query proof from database
2. If status='pending':
   - Trigger manual poll
   - Re-query database for updated status
3. Return current status
```

### 3. Confirmation Timeline

```
T+0s:  Transaction submitted (broadcast_tx_async)
       Status: pending
       
T+2s:  First background poll
       Status: pending (not yet in mempool)
       
T+10s: Second background poll
       Status: pending (in mempool, not confirmed)
       
T+20s: Third background poll
       Status: confirmed (included in block)
       confirmed_at timestamp set
```

## Error Handling

### Network Errors

**Midnight Node Unavailable:**
```typescript
Error: Midnight Network node is unavailable. Please ensure the node is running.
```
- Occurs when Midnight node at port 26657 is not accessible
- Check Docker container status: `docker ps | grep midnight`
- Restart node: `docker-compose up -d midnight-node`

### Transaction Errors

**Nullifier Already Used:**
```typescript
Error: Proof with this nullifier already exists
Code: NULLIFIER_ALREADY_USED
```
- Prevents replay attacks
- Each proof must have a unique nullifier
- User must generate a new proof with different data

**Transaction Failed:**
```typescript
Status: failed
tx_result.code: non-zero
tx_result.log: error message
```
- Transaction was processed but failed validation
- Check Midnight node logs for details
- Common causes: insufficient funds, invalid proof, contract error

## Configuration

### Environment Variables

```bash
# Midnight Network RPC endpoint
MIDNIGHT_NODE_URL=http://localhost:26657

# Polling configuration (optional, defaults shown)
PROOF_POLL_INTERVAL_MS=10000  # 10 seconds
PROOF_POLL_MAX_ATTEMPTS=30    # 30 attempts
PROOF_POLL_ATTEMPT_INTERVAL_MS=2000  # 2 seconds
```

### Polling Service Configuration

Edit `backend/src/services/proofStatusPoller.service.ts`:

```typescript
private pollIntervalMs: number = 10000; // Background poll interval
```

Edit `backend/src/services/midnight.service.ts`:

```typescript
async pollTransactionStatus(
  txHash: string,
  maxAttempts: number = 30,      // Max polling attempts
  intervalMs: number = 2000       // Interval between attempts
)
```

## Testing

### Manual Testing

1. **Start Midnight Node:**
```bash
docker-compose up -d midnight-node
```

2. **Submit a Proof:**
```bash
curl -X POST http://localhost:3001/api/proof/submit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "proof": {
      "proof": "base64_proof_data",
      "publicInputs": ["50000"],
      "publicOutputs": {
        "nullifier": "0x1234567890abcdef",
        "timestamp": 1700000000,
        "expiresAt": 1702592000
      }
    },
    "walletSignature": "signed_tx_data"
  }'
```

3. **Check Status:**
```bash
curl http://localhost:3001/api/proof/status/proof_1700000000_12345678 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

4. **Monitor Logs:**
```bash
# Backend logs
docker-compose logs -f backend

# Midnight node logs
docker-compose logs -f midnight-node
```

### Integration Testing

See `backend/tests/proof-submission.test.ts` for automated tests covering:
- Proof submission flow
- Status polling
- Error handling
- Nullifier uniqueness validation

## Monitoring

### Key Metrics

1. **Pending Proof Count:**
```sql
SELECT COUNT(*) FROM proof_submissions WHERE status = 'pending';
```

2. **Average Confirmation Time:**
```sql
SELECT AVG(EXTRACT(EPOCH FROM (confirmed_at - submitted_at))) as avg_seconds
FROM proof_submissions 
WHERE status = 'confirmed';
```

3. **Failed Proof Rate:**
```sql
SELECT 
  COUNT(CASE WHEN status = 'failed' THEN 1 END)::float / COUNT(*) * 100 as failure_rate
FROM proof_submissions;
```

### Logging

The system logs the following events:
- Proof submission attempts
- Transaction hash generation
- Status polling cycles
- Confirmation events
- Failure events with error details

## Troubleshooting

### Proofs Stuck in Pending

**Symptoms:** Proofs remain in `pending` status for extended periods

**Causes:**
1. Midnight node not running
2. Network connectivity issues
3. Transaction not included in mempool

**Solutions:**
1. Check node status: `docker ps | grep midnight`
2. Check node logs: `docker-compose logs midnight-node`
3. Manually query transaction: `curl http://localhost:26657/tx?hash=TX_HASH`
4. Restart polling service (restart backend)

### High Failure Rate

**Symptoms:** Many proofs with `status='failed'`

**Causes:**
1. Invalid proof data
2. Contract validation failures
3. Insufficient gas/fees

**Solutions:**
1. Review Midnight node logs for error details
2. Validate proof generation process
3. Check contract deployment status
4. Verify wallet has sufficient funds

## Security Considerations

### Nullifier Uniqueness

The system enforces nullifier uniqueness at the database level:
- Unique constraint on `nullifier` column
- Check before submission to prevent wasted transactions
- Returns `409 Conflict` if nullifier already exists

### Authentication

All proof endpoints require JWT authentication:
- User can only submit proofs for their own account
- User can only query status of their own proofs
- Prevents unauthorized proof submissions

### Rate Limiting

Consider implementing rate limiting on proof submission:
- Prevent spam attacks
- Limit resource consumption
- Protect Midnight Network from abuse

## Future Enhancements

1. **Webhook Notifications:** Notify users when proofs are confirmed
2. **Retry Logic:** Automatic retry for failed transactions
3. **Gas Estimation:** Estimate transaction fees before submission
4. **Batch Submissions:** Submit multiple proofs in a single transaction
5. **Proof Expiry Monitoring:** Alert users when proofs are about to expire
6. **GraphQL Subscriptions:** Real-time status updates via WebSocket

## References

- Midnight Network Documentation: https://docs.midnight.network
- Compact Language Specification: https://docs.midnight.network/compact
- JSON-RPC API Reference: https://docs.midnight.network/api/json-rpc
