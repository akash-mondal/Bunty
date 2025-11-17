# Midnight Contract Quick Start Guide

## Setup

1. **Install dependencies:**
```bash
cd midnight-contract
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your settings
```

## Development Workflow

### 1. Compile Contracts

```bash
# Standard compilation
npm run compile

# Optimized compilation (for production)
npm run compile:optimize
```

**Output:** Compiled circuits in `circuits/` directory

### 2. Run Tests

```bash
# Run all tests
npm test

# Watch mode (for development)
npm run test:watch

# With coverage report
npm run test:coverage
```

**Expected:** All 15 tests should pass

### 3. Deploy to Testnet

```bash
# Deploy to Midnight testnet
npm run deploy:testnet
```

**Output:** 
- Contract address
- Transaction hash
- Deployment record in `deployments/testnet.json`

### 4. Deploy to Mainnet

```bash
# Deploy to Midnight mainnet (production)
npm run deploy:mainnet
```

**⚠️ Warning:** Only deploy to mainnet after thorough testing!

## Contract Usage

### Circuit 1: verifyIncome

**Purpose:** Prove income meets threshold

**Example:**
```typescript
// User has $5000/month income, wants to prove >= $4000
const witness = {
  income: 5000,
  employmentMonths: 12,
  employerHash: "0x...",
  // ... other fields
};

const proof = await contract.verifyIncome(witness, 4000);
// Returns: { nullifier, threshold: 4000, timestamp, expiresAt }
```

**Use Cases:**
- Rental applications (3x rent requirement)
- Loan applications
- Employment verification

### Circuit 2: verifyAssets

**Purpose:** Prove net worth meets threshold

**Example:**
```typescript
// User has $50k assets, $10k liabilities = $40k net worth
const witness = {
  assets: 50000,
  liabilities: 10000,
  // ... other fields
};

const proof = await contract.verifyAssets(witness, 30000);
// Returns: { nullifier, threshold: 30000, netWorth: 40000, timestamp, expiresAt }
```

**Use Cases:**
- Investment account opening
- Mortgage applications
- Wealth verification

### Circuit 3: verifyCreditworthiness

**Purpose:** Prove credit score meets threshold

**Example:**
```typescript
// User has 720 credit score, wants to prove >= 700
const witness = {
  creditScore: 720,
  income: 5000,
  employmentMonths: 18,
  // ... other fields
};

const proof = await contract.verifyCreditworthiness(witness, 700);
// Returns: { nullifier, threshold: 700, creditScore: 720, timestamp, expiresAt }
```

**Use Cases:**
- Credit card applications
- Auto loans
- DeFi lending

## Verification (For Third Parties)

### Check Proof Validity

```typescript
// Query by nullifier
const isValid = await contract.isProofValid(nullifier);
// Returns: true if proof exists and hasn't expired
```

### Get Proof Details

```typescript
// Retrieve full proof record
const proof = await contract.getProofRecord(nullifier);
// Returns: { nullifier, threshold, timestamp, expiresAt, userDID }
```

### Check Expiry

```typescript
// Check if proof has expired
const isExpired = await contract.isProofExpired(nullifier);
// Returns: true if expired or doesn't exist
```

## Common Tasks

### Update Contract

1. Modify `contracts/income-proof.compact`
2. Run tests: `npm test`
3. Recompile: `npm run compile`
4. Deploy new version: `npm run deploy:testnet`

### Add New Circuit

1. Add circuit to `contracts/income-proof.compact`
2. Add tests to `tests/income-proof.test.ts`
3. Update documentation
4. Compile and deploy

### Debug Compilation Issues

```bash
# Check TypeScript types
npm run type-check

# Run linter
npm run lint

# View detailed compilation output
npm run compile
```

### Debug Test Failures

```bash
# Run specific test file
npm test -- income-proof.test.ts

# Run with verbose output
npm test -- --verbose

# Run single test
npm test -- -t "should generate proof for valid income"
```

## Integration Examples

### Backend Integration

```typescript
import { MidnightServiceClient } from './services/midnight.service';

const midnight = new MidnightServiceClient({
  rpcUrl: 'http://localhost:26657',
  contractAddress: '0x...'
});

// Submit proof transaction
const txHash = await midnight.submitTransaction(signedTx, proof);

// Query proof status
const status = await midnight.getTransactionStatus(txHash);
```

### Frontend Integration

```typescript
// Generate proof locally
const proof = await proofServer.generateProof({
  circuit: 'verifyIncome',
  witness: witnessData,
  threshold: 4000
});

// Sign with wallet
const signature = await laceWallet.signTransaction(proof);

// Submit to backend
const result = await api.submitProof(proof, signature);
```

### Verifier Integration

```typescript
import { BuntyVerifierClient } from '@bunty/verifier';

const verifier = new BuntyVerifierClient({
  indexerUrl: 'http://localhost:8081'
});

// Verify proof
const validation = await verifier.verifyProof(nullifier);
if (validation.isValid && validation.threshold >= 4000) {
  // Approve application
}
```

## Troubleshooting

### Compilation Fails

**Issue:** Contract syntax errors

**Solution:**
1. Check Compact syntax in `contracts/income-proof.compact`
2. Ensure all types are defined
3. Verify circuit signatures

### Tests Fail

**Issue:** Logic errors in circuits

**Solution:**
1. Review test output for specific failures
2. Check validation logic in contract
3. Verify test witness data is valid

### Deployment Fails

**Issue:** Network connectivity or configuration

**Solution:**
1. Check `MIDNIGHT_RPC_URL` in `.env`
2. Verify network is accessible
3. Ensure deployer key has funds
4. Check contract is compiled

### Proof Generation Slow

**Issue:** Circuit complexity or hardware

**Solution:**
1. Use optimized compilation: `npm run compile:optimize`
2. Upgrade hardware (more CPU cores)
3. Configure proof server for performance

## Best Practices

### Development

- ✅ Always run tests before deploying
- ✅ Use testnet for development
- ✅ Keep witness data private
- ✅ Validate inputs before proof generation
- ✅ Handle errors gracefully

### Security

- ✅ Never log witness data
- ✅ Validate nullifier uniqueness
- ✅ Check proof expiry
- ✅ Require complete KYC
- ✅ Use HTTPS for all communications

### Performance

- ✅ Use optimized compilation for production
- ✅ Cache compiled circuits
- ✅ Batch proof submissions when possible
- ✅ Monitor proof generation times
- ✅ Set appropriate timeouts

## Resources

- [Midnight Network Docs](https://docs.midnight.network)
- [Compact Language Guide](https://docs.midnight.network/compact)
- [Contract Documentation](./CONTRACTS.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)

## Support

For issues or questions:
1. Check documentation in this directory
2. Review test cases for examples
3. Consult Midnight Network documentation
4. Open issue in project repository
