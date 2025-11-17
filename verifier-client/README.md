# @bunty/verifier-client

Standalone client library for verifying Bunty ZK proofs via Midnight Network indexer.

## Overview

Bunty is a privacy-first financial identity protocol that enables users to prove income, KYC status, and creditworthiness without revealing sensitive documents. This verifier client allows third-party applications (lenders, rental platforms, DeFi protocols) to query proof validity without accessing raw user data.

## Features

- ✅ **Verify proofs by nullifier** - Check if a proof is valid and not expired
- ✅ **Query user proofs** - Get all proofs for a specific user DID
- ✅ **Filter proofs** - Query proofs with custom filters (threshold, validity)
- ✅ **Real-time subscriptions** - Subscribe to new proof submissions (WebSocket support required)
- ✅ **TypeScript support** - Full type definitions included
- ✅ **Zero dependencies** - Minimal footprint with only GraphQL client

## Installation

```bash
npm install @bunty/verifier-client
```

Or with yarn:

```bash
yarn add @bunty/verifier-client
```

## Quick Start

```typescript
import { BuntyVerifierClient } from '@bunty/verifier-client';

// Initialize the client with your indexer URL
const client = new BuntyVerifierClient({
  indexerUrl: 'http://localhost:8081/graphql'
});

// Verify a proof by nullifier
const validation = await client.verifyProof('0x1234abcd...');

if (validation.isValid) {
  console.log(`✅ Proof is valid!`);
  console.log(`Income threshold: $${validation.threshold}`);
  console.log(`Expires: ${new Date(validation.expiresAt * 1000)}`);
} else {
  console.log('❌ Proof is invalid or expired');
}
```

## API Reference

### Constructor

#### `new BuntyVerifierClient(config)`

Creates a new verifier client instance.

**Parameters:**
- `config.indexerUrl` (string, required) - GraphQL endpoint URL for Midnight indexer
- `config.timeout` (number, optional) - Request timeout in milliseconds (default: 10000)

**Example:**
```typescript
const client = new BuntyVerifierClient({
  indexerUrl: 'https://indexer.bunty.network/graphql',
  timeout: 15000
});
```

### Methods

#### `verifyProof(nullifier: string): Promise<ProofValidation>`

Verify a proof by its nullifier hash. Returns validation details including threshold and expiry.

**Parameters:**
- `nullifier` (string) - The unique nullifier hash of the proof

**Returns:** `ProofValidation` object with:
- `isValid` (boolean) - Whether proof is valid and not expired
- `threshold` (number) - The income/asset threshold proven
- `expiresAt` (number) - Unix timestamp when proof expires
- `timestamp` (number) - Unix timestamp when proof was created
- `userDID` (string) - User's decentralized identifier

**Example:**
```typescript
try {
  const validation = await client.verifyProof('0xabc123...');
  
  if (validation.isValid) {
    console.log('Proof verified successfully');
    console.log(`User proved income >= $${validation.threshold}`);
    
    const expiryDate = new Date(validation.expiresAt * 1000);
    console.log(`Valid until: ${expiryDate.toLocaleDateString()}`);
  }
} catch (error) {
  console.error('Proof verification failed:', error.message);
}
```

#### `getUserProofs(userDID: string): Promise<ProofRecord[]>`

Get all proofs for a specific user by their decentralized identifier.

**Parameters:**
- `userDID` (string) - The user's decentralized identifier

**Returns:** Array of `ProofRecord` objects

**Example:**
```typescript
const proofs = await client.getUserProofs('did:midnight:user123');

console.log(`User has ${proofs.length} total proofs`);

proofs.forEach(proof => {
  console.log(`Nullifier: ${proof.nullifier}`);
  console.log(`Threshold: $${proof.threshold}`);
  console.log(`Valid: ${proof.isValid && !proof.isExpired}`);
  console.log('---');
});
```

#### `getProofsWithFilters(filters): Promise<ProofRecord[]>`

Query proofs with custom filters.

**Parameters:**
- `filters.userDID` (string, optional) - Filter by user DID
- `filters.minThreshold` (number, optional) - Minimum threshold value
- `filters.isValid` (boolean, optional) - Filter by validity status

**Returns:** Array of `ProofRecord` objects matching the filters

**Example:**
```typescript
// Get all valid proofs with income >= $50,000
const highIncomeProofs = await client.getProofsWithFilters({
  minThreshold: 50000,
  isValid: true
});

console.log(`Found ${highIncomeProofs.length} high-income proofs`);

// Get all proofs for a specific user with minimum threshold
const userHighIncomeProofs = await client.getProofsWithFilters({
  userDID: 'did:midnight:user123',
  minThreshold: 75000
});
```

#### `isProofValid(nullifier: string): Promise<boolean>`

Convenience method to check if a proof is valid (exists and not expired).

**Parameters:**
- `nullifier` (string) - The unique nullifier hash of the proof

**Returns:** `true` if proof is valid and not expired, `false` otherwise

**Example:**
```typescript
const isValid = await client.isProofValid('0xabc123...');

if (isValid) {
  console.log('✅ Proof is valid - proceed with application');
} else {
  console.log('❌ Proof is invalid - request new proof');
}
```

#### `getValidProofCount(userDID: string): Promise<number>`

Get the count of valid (non-expired) proofs for a user.

**Parameters:**
- `userDID` (string) - The user's decentralized identifier

**Returns:** Number of valid proofs

**Example:**
```typescript
const count = await client.getValidProofCount('did:midnight:user123');
console.log(`User has ${count} valid proofs`);
```

#### `subscribeToProofs(callback): Subscription`

Subscribe to new proof submissions in real-time.

**Note:** Requires WebSocket support in the indexer endpoint.

**Parameters:**
- `callback` (function) - Function called when a new proof is submitted

**Returns:** `Subscription` object with `unsubscribe()` method

**Example:**
```typescript
const subscription = client.subscribeToProofs((proof) => {
  console.log('🔔 New proof submitted!');
  console.log(`Nullifier: ${proof.nullifier}`);
  console.log(`Threshold: $${proof.threshold}`);
  console.log(`User: ${proof.userDID}`);
});

// Later, to stop receiving updates:
subscription.unsubscribe();
```

#### `subscribeToUserProofs(userDID, callback): Subscription`

Subscribe to proof submissions for a specific user.

**Note:** Requires WebSocket support in the indexer endpoint.

**Parameters:**
- `userDID` (string) - The user's decentralized identifier
- `callback` (function) - Function called when the user submits a new proof

**Returns:** `Subscription` object with `unsubscribe()` method

**Example:**
```typescript
const subscription = client.subscribeToUserProofs(
  'did:midnight:user123',
  (proof) => {
    console.log('User submitted new proof');
    console.log(`Threshold: $${proof.threshold}`);
  }
);

subscription.unsubscribe();
```

## Use Cases

### Lending Platform Integration

```typescript
import { BuntyVerifierClient } from '@bunty/verifier-client';

class LoanApplicationService {
  private verifier: BuntyVerifierClient;

  constructor() {
    this.verifier = new BuntyVerifierClient({
      indexerUrl: process.env.BUNTY_INDEXER_URL!
    });
  }

  async processLoanApplication(
    applicantDID: string,
    proofNullifier: string,
    loanAmount: number
  ) {
    // Verify the proof
    const validation = await this.verifier.verifyProof(proofNullifier);

    if (!validation.isValid) {
      return {
        approved: false,
        reason: 'Invalid or expired income proof'
      };
    }

    // Check if income meets loan requirements (3x loan amount)
    const requiredIncome = loanAmount * 3;
    if (validation.threshold < requiredIncome) {
      return {
        approved: false,
        reason: `Insufficient income. Required: $${requiredIncome}, Proven: $${validation.threshold}`
      };
    }

    // Check proof expiry
    const daysUntilExpiry = (validation.expiresAt - Date.now() / 1000) / 86400;
    if (daysUntilExpiry < 7) {
      return {
        approved: false,
        reason: 'Proof expires soon. Please submit a fresh proof.'
      };
    }

    return {
      approved: true,
      provenIncome: validation.threshold,
      expiresAt: validation.expiresAt
    };
  }
}
```

### Rental Application Verification

```typescript
import { BuntyVerifierClient } from '@bunty/verifier-client';

class RentalApplicationService {
  private verifier: BuntyVerifierClient;

  constructor() {
    this.verifier = new BuntyVerifierClient({
      indexerUrl: process.env.BUNTY_INDEXER_URL!
    });
  }

  async verifyTenantIncome(proofNullifier: string, monthlyRent: number) {
    const validation = await this.verifier.verifyProof(proofNullifier);

    if (!validation.isValid) {
      throw new Error('Invalid income proof');
    }

    // Typical requirement: income should be 3x monthly rent
    const requiredMonthlyIncome = monthlyRent * 3;

    return {
      meetsRequirement: validation.threshold >= requiredMonthlyIncome,
      provenIncome: validation.threshold,
      requiredIncome: requiredMonthlyIncome,
      expiresAt: new Date(validation.expiresAt * 1000)
    };
  }

  async getTenantHistory(tenantDID: string) {
    const proofs = await this.verifier.getUserProofs(tenantDID);
    
    return {
      totalProofs: proofs.length,
      validProofs: proofs.filter(p => p.isValid && !p.isExpired).length,
      highestProvenIncome: Math.max(...proofs.map(p => p.threshold)),
      mostRecentProof: proofs.sort((a, b) => b.timestamp - a.timestamp)[0]
    };
  }
}
```

### DeFi Protocol Integration

```typescript
import { BuntyVerifierClient } from '@bunty/verifier-client';

class DeFiLendingProtocol {
  private verifier: BuntyVerifierClient;

  constructor() {
    this.verifier = new BuntyVerifierClient({
      indexerUrl: process.env.BUNTY_INDEXER_URL!
    });
  }

  async calculateCreditLimit(userDID: string, proofNullifier: string) {
    // Verify the proof
    const validation = await this.verifier.verifyProof(proofNullifier);

    if (!validation.isValid) {
      return { creditLimit: 0, reason: 'No valid proof' };
    }

    // Get all user proofs to assess history
    const allProofs = await this.verifier.getUserProofs(userDID);
    const validProofCount = await this.verifier.getValidProofCount(userDID);

    // Calculate credit limit based on proven income and history
    let creditMultiplier = 0.5; // Base 50% of annual income

    // Increase multiplier for users with proof history
    if (validProofCount >= 3) {
      creditMultiplier = 0.75;
    }

    const annualIncome = validation.threshold * 12;
    const creditLimit = annualIncome * creditMultiplier;

    return {
      creditLimit,
      provenMonthlyIncome: validation.threshold,
      proofHistory: validProofCount,
      expiresAt: validation.expiresAt
    };
  }

  async monitorProofExpiry(userDID: string) {
    // Subscribe to user's proof submissions
    const subscription = this.verifier.subscribeToUserProofs(
      userDID,
      (proof) => {
        console.log(`User ${userDID} submitted new proof`);
        console.log(`New credit limit available: ${proof.threshold * 6}`);
        // Trigger credit limit update in your system
      }
    );

    return subscription;
  }
}
```

## Error Handling

The client throws errors in the following scenarios:

1. **Proof not found**: When querying a non-existent nullifier
2. **Network errors**: When the indexer is unreachable
3. **Timeout errors**: When requests exceed the configured timeout
4. **Invalid responses**: When the indexer returns malformed data

**Example error handling:**

```typescript
try {
  const validation = await client.verifyProof(nullifier);
  // Process validation
} catch (error) {
  if (error.message.includes('not found')) {
    console.error('Proof does not exist');
  } else if (error.message.includes('timeout')) {
    console.error('Indexer request timed out');
  } else {
    console.error('Verification failed:', error.message);
  }
}
```

## Configuration

### Environment Variables

```bash
# Indexer URL (required)
BUNTY_INDEXER_URL=http://localhost:8081/graphql

# For production
BUNTY_INDEXER_URL=https://indexer.bunty.network/graphql
```

### Network Endpoints

**Testnet:**
```
http://localhost:8081/graphql (local development)
```

**Mainnet (when available):**
```
https://indexer.bunty.network/graphql
```

## TypeScript Support

This library is written in TypeScript and includes full type definitions.

```typescript
import {
  BuntyVerifierClient,
  ProofRecord,
  ProofValidation,
  VerifierConfig
} from '@bunty/verifier-client';

const config: VerifierConfig = {
  indexerUrl: 'http://localhost:8081/graphql',
  timeout: 10000
};

const client = new BuntyVerifierClient(config);

const validation: ProofValidation = await client.verifyProof('0x...');
const proofs: ProofRecord[] = await client.getUserProofs('did:midnight:...');
```

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/bunty/verifier-client.git
cd verifier-client

# Install dependencies
npm install

# Build the library
npm run build

# The compiled files will be in the dist/ directory
```

### Testing with Local Indexer

```bash
# Start the Bunty development environment
docker-compose up -d

# The indexer will be available at:
# http://localhost:8081/graphql

# Test the client
node examples/verify-proof.js
```

## Requirements

- Node.js 18+ or browser environment
- Midnight Network indexer endpoint
- GraphQL support

## License

MIT

## Support

For issues, questions, or contributions:
- GitHub: https://github.com/bunty/verifier-client
- Documentation: https://docs.bunty.network
- Discord: https://discord.gg/bunty

## Related Packages

- `@bunty/sdk` - Full Bunty SDK for proof generation
- `@bunty/contracts` - Midnight smart contracts
- `@bunty/types` - Shared TypeScript types
