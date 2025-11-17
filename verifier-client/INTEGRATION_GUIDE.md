# Bunty Verifier Client - Integration Guide

This guide provides step-by-step instructions for integrating the Bunty Verifier Client into your application.

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Common Integration Patterns](#common-integration-patterns)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)
7. [Production Deployment](#production-deployment)

## Installation

### NPM

```bash
npm install @bunty/verifier-client
```

### Yarn

```bash
yarn add @bunty/verifier-client
```

### Requirements

- Node.js 18+ or modern browser
- Access to Midnight Network indexer endpoint
- TypeScript 5.0+ (optional, but recommended)

## Quick Start

### 1. Initialize the Client

```typescript
import { BuntyVerifierClient } from '@bunty/verifier-client';

const client = new BuntyVerifierClient({
  indexerUrl: 'http://localhost:8081/graphql', // or your production URL
  timeout: 10000 // optional, defaults to 10 seconds
});
```

### 2. Verify a Proof

```typescript
async function verifyUserProof(nullifier: string) {
  try {
    const validation = await client.verifyProof(nullifier);
    
    if (validation.isValid) {
      console.log('Proof is valid!');
      console.log(`Income threshold: $${validation.threshold}`);
      return true;
    } else {
      console.log('Proof is invalid or expired');
      return false;
    }
  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
}
```

### 3. Query User Proofs

```typescript
async function getUserProofHistory(userDID: string) {
  const proofs = await client.getUserProofs(userDID);
  
  return {
    total: proofs.length,
    valid: proofs.filter(p => p.isValid && !p.isExpired).length,
    proofs: proofs
  };
}
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```bash
# Development
BUNTY_INDEXER_URL=http://localhost:8081/graphql

# Staging
BUNTY_INDEXER_URL=https://staging-indexer.bunty.network/graphql

# Production
BUNTY_INDEXER_URL=https://indexer.bunty.network/graphql
```

### TypeScript Configuration

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "esModuleInterop": true,
    "strict": true
  }
}
```

## Common Integration Patterns

### Pattern 1: Loan Application Processing

```typescript
import { BuntyVerifierClient } from '@bunty/verifier-client';

class LoanProcessor {
  private verifier: BuntyVerifierClient;

  constructor() {
    this.verifier = new BuntyVerifierClient({
      indexerUrl: process.env.BUNTY_INDEXER_URL!
    });
  }

  async evaluateLoanApplication(
    proofNullifier: string,
    requestedAmount: number
  ) {
    // Verify proof
    const validation = await this.verifier.verifyProof(proofNullifier);
    
    if (!validation.isValid) {
      return { approved: false, reason: 'Invalid proof' };
    }

    // Check income requirement (3x loan payment)
    const monthlyPayment = requestedAmount / 36; // 3-year loan
    const requiredIncome = monthlyPayment * 3;

    if (validation.threshold < requiredIncome) {
      return {
        approved: false,
        reason: `Insufficient income. Required: $${requiredIncome}`
      };
    }

    return {
      approved: true,
      approvedAmount: requestedAmount,
      provenIncome: validation.threshold
    };
  }
}
```

### Pattern 2: Rental Application Verification

```typescript
class RentalVerifier {
  private verifier: BuntyVerifierClient;
  private readonly INCOME_MULTIPLIER = 3;

  constructor() {
    this.verifier = new BuntyVerifierClient({
      indexerUrl: process.env.BUNTY_INDEXER_URL!
    });
  }

  async verifyTenant(proofNullifier: string, monthlyRent: number) {
    const validation = await this.verifier.verifyProof(proofNullifier);

    if (!validation.isValid) {
      return { approved: false };
    }

    const requiredIncome = monthlyRent * this.INCOME_MULTIPLIER;
    const meetsRequirement = validation.threshold >= requiredIncome;

    return {
      approved: meetsRequirement,
      provenIncome: validation.threshold,
      incomeToRentRatio: validation.threshold / monthlyRent
    };
  }
}
```

### Pattern 3: DeFi Credit Limit Calculation

```typescript
class DeFiProtocol {
  private verifier: BuntyVerifierClient;

  constructor() {
    this.verifier = new BuntyVerifierClient({
      indexerUrl: process.env.BUNTY_INDEXER_URL!
    });
  }

  async calculateCreditLimit(userDID: string, proofNullifier: string) {
    const validation = await this.verifier.verifyProof(proofNullifier);

    if (!validation.isValid) {
      return { creditLimit: 0 };
    }

    // Get proof history for better rates
    const validProofCount = await this.verifier.getValidProofCount(userDID);

    // Base credit limit: 50% of annual income
    let multiplier = 0.5;

    // Increase for users with good history
    if (validProofCount >= 3) {
      multiplier = 0.75;
    }

    const annualIncome = validation.threshold * 12;
    const creditLimit = annualIncome * multiplier;

    return {
      creditLimit,
      provenMonthlyIncome: validation.threshold,
      proofHistory: validProofCount
    };
  }
}
```

### Pattern 4: Batch Verification

```typescript
async function verifyMultipleProofs(nullifiers: string[]) {
  const client = new BuntyVerifierClient({
    indexerUrl: process.env.BUNTY_INDEXER_URL!
  });

  const results = await Promise.allSettled(
    nullifiers.map(nullifier => client.verifyProof(nullifier))
  );

  return results.map((result, index) => ({
    nullifier: nullifiers[index],
    status: result.status,
    validation: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null
  }));
}
```

### Pattern 5: Proof Expiry Monitoring

```typescript
async function checkProofExpiry(nullifier: string, warningDays: number = 7) {
  const client = new BuntyVerifierClient({
    indexerUrl: process.env.BUNTY_INDEXER_URL!
  });

  const validation = await client.verifyProof(nullifier);

  if (!validation.isValid) {
    return { status: 'invalid' };
  }

  const now = Date.now() / 1000;
  const daysUntilExpiry = (validation.expiresAt - now) / 86400;

  if (daysUntilExpiry < 0) {
    return { status: 'expired' };
  } else if (daysUntilExpiry < warningDays) {
    return {
      status: 'expiring_soon',
      daysRemaining: Math.floor(daysUntilExpiry)
    };
  } else {
    return {
      status: 'valid',
      daysRemaining: Math.floor(daysUntilExpiry)
    };
  }
}
```

## Best Practices

### 1. Error Handling

Always wrap verifier calls in try-catch blocks:

```typescript
try {
  const validation = await client.verifyProof(nullifier);
  // Process validation
} catch (error) {
  if (error.message.includes('not found')) {
    // Handle proof not found
  } else if (error.message.includes('timeout')) {
    // Handle timeout
  } else {
    // Handle other errors
  }
}
```

### 2. Caching

Cache verification results to reduce API calls:

```typescript
class CachedVerifier {
  private cache = new Map<string, { validation: any; timestamp: number }>();
  private cacheTTL = 300000; // 5 minutes

  async verifyProof(nullifier: string) {
    const cached = this.cache.get(nullifier);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.validation;
    }

    const validation = await this.client.verifyProof(nullifier);
    this.cache.set(nullifier, { validation, timestamp: Date.now() });
    
    return validation;
  }
}
```

### 3. Retry Logic

Implement retry logic for network failures:

```typescript
async function verifyWithRetry(
  nullifier: string,
  maxRetries: number = 3
) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.verifyProof(nullifier);
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }

  throw lastError;
}
```

### 4. Logging

Log verification attempts for audit trails:

```typescript
async function verifyWithLogging(nullifier: string, userId: string) {
  console.log(`[${new Date().toISOString()}] Verifying proof for user ${userId}`);
  
  try {
    const validation = await client.verifyProof(nullifier);
    
    console.log(`[${new Date().toISOString()}] Verification successful`, {
      userId,
      nullifier,
      threshold: validation.threshold,
      isValid: validation.isValid
    });
    
    return validation;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Verification failed`, {
      userId,
      nullifier,
      error: error.message
    });
    throw error;
  }
}
```

### 5. Rate Limiting

Implement rate limiting to avoid overwhelming the indexer:

```typescript
class RateLimitedVerifier {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsPerSecond = 10;

  async verifyProof(nullifier: string) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await client.verifyProof(nullifier);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
      await new Promise(resolve => 
        setTimeout(resolve, 1000 / this.requestsPerSecond)
      );
    }

    this.processing = false;
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Connection Timeout

**Problem:** Requests timeout before completing

**Solution:**
```typescript
const client = new BuntyVerifierClient({
  indexerUrl: process.env.BUNTY_INDEXER_URL!,
  timeout: 30000 // Increase timeout to 30 seconds
});
```

#### 2. Proof Not Found

**Problem:** Proof with given nullifier doesn't exist

**Solution:**
```typescript
try {
  const validation = await client.verifyProof(nullifier);
} catch (error) {
  if (error.message.includes('not found')) {
    // Ask user to submit proof first
    console.log('Please submit your proof to the blockchain first');
  }
}
```

#### 3. Network Errors

**Problem:** Cannot connect to indexer

**Solution:**
- Verify indexer URL is correct
- Check network connectivity
- Ensure indexer is running (for local development)
- Check firewall settings

#### 4. Invalid GraphQL Response

**Problem:** Indexer returns unexpected data format

**Solution:**
- Verify indexer version compatibility
- Check indexer logs for errors
- Ensure blockchain is synced

## Production Deployment

### Checklist

- [ ] Use production indexer URL
- [ ] Configure appropriate timeout values
- [ ] Implement error handling and retries
- [ ] Add logging and monitoring
- [ ] Set up rate limiting
- [ ] Cache verification results
- [ ] Configure environment variables
- [ ] Test failover scenarios
- [ ] Document integration for your team

### Environment Configuration

```bash
# Production .env
BUNTY_INDEXER_URL=https://indexer.bunty.network/graphql
BUNTY_TIMEOUT=15000
BUNTY_CACHE_TTL=300000
BUNTY_MAX_RETRIES=3
```

### Monitoring

Monitor these metrics in production:

- Verification success rate
- Average response time
- Error rate by type
- Cache hit rate
- API call volume

### Security Considerations

1. **Never expose indexer credentials** in client-side code
2. **Validate nullifiers** before sending to indexer
3. **Implement rate limiting** to prevent abuse
4. **Log verification attempts** for audit trails
5. **Use HTTPS** for all indexer connections

## Support

For additional help:

- Documentation: https://docs.bunty.network
- GitHub Issues: https://github.com/bunty/verifier-client/issues
- Discord: https://discord.gg/bunty
- Email: support@bunty.network
