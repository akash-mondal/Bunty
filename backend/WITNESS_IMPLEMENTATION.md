# Witness Data Construction and Hash Commitment Implementation

## Overview

This implementation provides witness data construction and hash commitment functionality for the Bunty ZKP platform. It normalizes financial and identity data from Plaid and Stripe into a standardized witness format, calculates SHA-256 hashes, and commits them to both the database and Midnight blockchain.

## Architecture

### Components

1. **Witness Service** (`services/witness.service.ts`)
   - Generates witness data by combining Plaid and Stripe data
   - Calculates SHA-256 hashes of witness data
   - Commits hashes to database and blockchain
   - Manages witness commitments

2. **Midnight Service** (`services/midnight.service.ts`)
   - RPC client for Midnight Network
   - Commits hashes to blockchain
   - Submits transactions with ZK proofs
   - Queries proof registry

3. **Witness Controller** (`controllers/witness.controller.ts`)
   - Handles HTTP requests for witness operations
   - Validates input and authentication
   - Returns formatted responses

4. **Routes** (`routes/witness.routes.ts`, `routes/proof.routes.ts`)
   - Defines API endpoints for witness and proof operations
   - Applies authentication middleware

## API Endpoints

### POST /api/witness/generate

Generates witness data by normalizing Plaid and Stripe data sources.

**Authentication:** Required (JWT)

**Request:**
```json
// No body required - uses authenticated user's data
```

**Response:**
```json
{
  "witness": {
    "income": 5000,
    "employmentMonths": 24,
    "employerHash": "abc123...",
    "assets": 50000,
    "liabilities": 10000,
    "creditScore": 720,
    "ssnVerified": true,
    "selfieVerified": true,
    "documentVerified": true,
    "timestamp": 1700000000000
  },
  "witnessHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

**Error Codes:**
- `AUTH_001`: User not authenticated
- `WITNESS_002`: User has not completed identity verification
- `WITNESS_003`: No Plaid connection found
- `WITNESS_001`: General witness generation error

### POST /api/proof/commit-hash

Commits a witness hash to the database and optionally to the Midnight blockchain.

**Authentication:** Required (JWT)

**Request:**
```json
{
  "witnessHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

**Response:**
```json
{
  "commitmentId": "550e8400-e29b-41d4-a716-446655440000",
  "witnessHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "committedAt": "2024-01-01T00:00:00.000Z",
  "onChainTxHash": "0x123abc..."
}
```

**Error Codes:**
- `AUTH_001`: User not authenticated
- `WITNESS_004`: Witness hash is required
- `WITNESS_005`: Invalid witness hash format
- `WITNESS_006`: Failed to commit witness hash

### GET /api/witness/commitments

Retrieves all witness commitments for the authenticated user.

**Authentication:** Required (JWT)

**Response:**
```json
{
  "commitments": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "witness_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "committed_at": "2024-01-01T00:00:00.000Z",
      "on_chain_tx_hash": "0x123abc..."
    }
  ],
  "count": 1
}
```

### POST /api/witness/verify

Verifies if a witness hash exists for the authenticated user.

**Authentication:** Required (JWT)

**Request:**
```json
{
  "witnessHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

**Response:**
```json
{
  "valid": true,
  "witnessHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

## Data Flow

### Witness Generation Flow

1. User calls `/api/witness/generate`
2. Service fetches data from:
   - Plaid: income, assets, liabilities, credit signal
   - Stripe: identity verification status
3. Data is normalized into witness format
4. SHA-256 hash is calculated
5. Witness and hash are returned to client

### Hash Commitment Flow

1. User calls `/api/proof/commit-hash` with witness hash
2. Service validates hash format
3. Hash is committed to Midnight blockchain (if available)
4. Commitment is stored in database with transaction hash
5. Commitment details are returned to client

## Witness Data Structure

```typescript
interface Witness {
  income: number;                  // Monthly income in dollars
  employmentMonths: number;        // Months employed at current job
  employerHash: string;            // SHA-256 hash of employer name
  assets: number;                  // Total assets in dollars
  liabilities: number;             // Total liabilities in dollars
  creditScore: number;             // Credit score (0-850)
  ssnVerified: boolean;            // SSN verification status
  selfieVerified: boolean;         // Selfie verification status
  documentVerified: boolean;       // Document verification status
  timestamp: number;               // Unix timestamp in milliseconds
}
```

## Hash Calculation

The witness hash is calculated using SHA-256 on the deterministic JSON string representation of the witness data:

```typescript
const witnessString = JSON.stringify({
  income: witness.income,
  employmentMonths: witness.employmentMonths,
  employerHash: witness.employerHash,
  assets: witness.assets,
  liabilities: witness.liabilities,
  creditScore: witness.creditScore,
  ssnVerified: witness.ssnVerified,
  selfieVerified: witness.selfieVerified,
  documentVerified: witness.documentVerified,
  timestamp: witness.timestamp,
});

const hash = crypto.createHash('sha256').update(witnessString).digest('hex');
```

## Database Schema

The `witness_commitments` table stores hash commitments:

```sql
CREATE TABLE witness_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  witness_hash VARCHAR(64) NOT NULL,
  committed_at TIMESTAMP DEFAULT NOW(),
  on_chain_tx_hash VARCHAR(255)
);
```

## Midnight Network Integration

### RPC Methods

1. **broadcast_tx_commit**: Commits witness hash to blockchain
2. **tx**: Queries transaction status
3. **abci_query**: Queries proof registry

### Development Mode

If the Midnight node is not available (e.g., during development), the service will:
- Log a warning
- Continue without on-chain commitment
- Store `null` for `on_chain_tx_hash`

This allows development and testing without a running Midnight node.

## Environment Variables

```bash
# Midnight Network Configuration
MIDNIGHT_NODE_URL=http://localhost:26657
MIDNIGHT_PROOF_SERVER_URL=http://localhost:6300
MIDNIGHT_INDEXER_URL=http://localhost:8081
```

## Security Considerations

1. **Data Privacy**: Raw witness data is never stored on the backend
2. **Hash Integrity**: SHA-256 ensures data integrity
3. **Authentication**: All endpoints require JWT authentication
4. **Validation**: Hash format is validated (64 character hex string)
5. **Blockchain Commitment**: Optional on-chain commitment provides immutability

## Testing

### Manual Testing with cURL

1. **Generate Witness:**
```bash
curl -X POST http://localhost:3001/api/witness/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

2. **Commit Hash:**
```bash
curl -X POST http://localhost:3001/api/proof/commit-hash \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"witnessHash": "YOUR_WITNESS_HASH"}'
```

3. **Get Commitments:**
```bash
curl -X GET http://localhost:3001/api/witness/commitments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

4. **Verify Commitment:**
```bash
curl -X POST http://localhost:3001/api/witness/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"witnessHash": "YOUR_WITNESS_HASH"}'
```

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **5.1**: Normalizes Plaid and Stripe data into standardized witness JSON format
- **5.2**: Calculates SHA-256 hash of complete witness data object
- **5.3**: Stores hash commitment in PostgreSQL database
- **5.4**: Registers hash commitment on Midnight Network
- **5.5**: Never transmits raw witness data to backend after initial construction

## Future Enhancements

1. Add witness data versioning
2. Implement witness data expiration
3. Add support for multiple witness types (income, assets, creditworthiness)
4. Implement batch hash commitments
5. Add witness data encryption for client-side storage
6. Implement witness data refresh mechanism
