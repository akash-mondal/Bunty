# Bunty Verifier Client - Quick Reference

## Installation

```bash
npm install @bunty/verifier-client
```

## Basic Setup

```typescript
import { BuntyVerifierClient } from '@bunty/verifier-client';

const client = new BuntyVerifierClient({
  indexerUrl: 'http://localhost:8081/graphql'
});
```

## API Methods

### verifyProof(nullifier)
Verify a proof and get full validation details.

```typescript
const validation = await client.verifyProof('0x1234...');
// Returns: { isValid, threshold, expiresAt, timestamp, userDID }
```

### getUserProofs(userDID)
Get all proofs for a user.

```typescript
const proofs = await client.getUserProofs('did:midnight:user123');
// Returns: ProofRecord[]
```

### getProofsWithFilters(filters)
Query proofs with custom filters.

```typescript
const proofs = await client.getProofsWithFilters({
  minThreshold: 50000,
  isValid: true
});
```

### isProofValid(nullifier)
Simple boolean check for proof validity.

```typescript
const isValid = await client.isProofValid('0x1234...');
// Returns: boolean
```

### getValidProofCount(userDID)
Count valid proofs for a user.

```typescript
const count = await client.getValidProofCount('did:midnight:user123');
// Returns: number
```

## Common Patterns

### Loan Approval
```typescript
const validation = await client.verifyProof(nullifier);
const requiredIncome = loanAmount / 36 * 3;
const approved = validation.isValid && validation.threshold >= requiredIncome;
```

### Rental Verification
```typescript
const validation = await client.verifyProof(nullifier);
const requiredIncome = monthlyRent * 3;
const approved = validation.isValid && validation.threshold >= requiredIncome;
```

### Credit Limit
```typescript
const validation = await client.verifyProof(nullifier);
const creditLimit = validation.threshold * 12 * 0.5; // 50% of annual income
```

## Error Handling

```typescript
try {
  const validation = await client.verifyProof(nullifier);
} catch (error) {
  if (error.message.includes('not found')) {
    // Proof doesn't exist
  } else if (error.message.includes('timeout')) {
    // Request timed out
  }
}
```

## Types

```typescript
interface ProofValidation {
  isValid: boolean;
  threshold: number;
  expiresAt: number;
  timestamp: number;
  userDID?: string;
}

interface ProofRecord {
  nullifier: string;
  threshold: number;
  timestamp: number;
  expiresAt: number;
  userDID: string;
  isValid: boolean;
  isExpired: boolean;
}
```

## Environment Variables

```bash
BUNTY_INDEXER_URL=http://localhost:8081/graphql
```

## Links

- Full Documentation: [README.md](./README.md)
- Integration Guide: [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- Examples: [examples/](./examples/)
