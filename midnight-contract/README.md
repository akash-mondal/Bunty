# Midnight Smart Contracts

This directory contains Compact smart contracts for the Bunty ZKP platform on Midnight Network.

## Overview

The Bunty smart contract system provides privacy-preserving financial identity verification through zero-knowledge proofs. Users can prove income, assets, and creditworthiness without revealing sensitive financial data.

## Structure

```
midnight-contract/
├── contracts/          # Compact smart contract source files
│   └── income-proof.compact
├── circuits/           # Compiled circuit definitions (generated)
├── scripts/            # Compilation and deployment scripts
│   ├── compile.ts
│   └── deploy.ts
├── tests/              # Contract test suite
│   └── income-proof.test.ts
├── deployments/        # Deployment records (generated)
└── package.json
```

## Contracts

### income-proof.compact

Main contract implementing three zero-knowledge circuits for financial verification:

**Data Structures:**
- `ProofRecord` - On-chain proof metadata (nullifier, threshold, timestamp, expiry, userDID)
- `proofRegistry` - Ledger map storing all submitted proofs indexed by nullifier

**Circuits:**

1. **verifyIncome** - Validates income threshold and employment duration
   - Checks income >= threshold
   - Validates employment >= 6 months
   - Requires complete KYC verification
   - Generates nullifier from employerHash + userDID
   - Prevents replay attacks
   - Sets 30-day expiry

2. **verifyAssets** - Validates net worth (assets - liabilities)
   - Checks net worth >= minimum threshold
   - Validates assets are non-negative
   - Requires complete KYC verification
   - Generates nullifier from assets + liabilities + userDID
   - Prevents replay attacks
   - Sets 30-day expiry

3. **verifyCreditworthiness** - Validates credit score and income stability
   - Checks credit score >= minimum
   - Validates positive income
   - Requires employment >= 12 months
   - Requires complete KYC verification
   - Generates nullifier from creditScore + userDID
   - Prevents replay attacks
   - Sets 30-day expiry

**Query Functions:**
- `isProofValid(nullifier)` - Check if proof exists and hasn't expired
- `getProofRecord(nullifier)` - Retrieve proof metadata
- `isProofExpired(nullifier)` - Check if proof has expired

## Requirements Mapping

This implementation satisfies the following requirements:

- **7.1** - Setup Compact development environment and CLI tools
- **7.2** - Implement circuits with validation logic
- **7.3** - Nullifier generation using sha256(employerHash, userDID)
- **7.4** - Proof expiry logic (30-day TTL)
- **7.5** - Nullifier replay prevention checks

## Development

### Prerequisites

- Node.js 18+
- Midnight Network CLI tools
- Compact compiler
- TypeScript

### Installation

```bash
cd midnight-contract
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:
- `MIDNIGHT_NETWORK` - testnet or mainnet
- `MIDNIGHT_RPC_URL` - JSON-RPC endpoint
- `DEPLOYER_PRIVATE_KEY` - Your deployment key

### Compilation

Compile Compact contracts to circuit definitions:

```bash
# Standard compilation
npm run compile

# Optimized compilation
npm run compile:optimize
```

Compiled artifacts are saved to `circuits/` directory.

### Testing

Run the test suite:

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### Deployment

Deploy to Midnight Network:

```bash
# Deploy to testnet (default)
npm run deploy:testnet

# Deploy to mainnet
npm run deploy:mainnet
```

Deployment records are saved to `deployments/{network}.json`.

## Privacy Guarantees

### Zero-Knowledge Properties

1. **Completeness** - Valid proofs always verify
2. **Soundness** - Invalid proofs cannot verify
3. **Zero-Knowledge** - Proofs reveal nothing beyond the threshold being met

### Security Features

1. **Nullifier System** - Prevents proof replay attacks
2. **Proof Expiry** - 30-day TTL ensures freshness
3. **KYC Requirements** - All circuits require verified identity
4. **Selective Disclosure** - Users choose which circuit to execute

### Private Witness Data

The following data never appears on-chain:
- Exact income amount
- Employer name/details
- Exact asset values
- Exact liability amounts
- Exact credit score
- SSN or identity documents

Only the proof of meeting thresholds is recorded.

## Integration

### Backend Integration

The backend service interacts with these contracts through:
- Midnight JSON-RPC node (port 26657)
- Proof server for ZK proof generation (port 6300)
- GraphQL indexer for proof queries (port 8081)

### Frontend Integration

Users interact through:
- Local proof generation (witness data never leaves browser)
- Lace Wallet for transaction signing
- Direct proof server communication

### Verifier Integration

Third parties verify proofs through:
- GraphQL queries to indexer
- Nullifier-based proof lookup
- Expiry validation
- No access to raw witness data

## Circuit Parameters

### verifyIncome
- Input: `threshold` (Field) - Minimum monthly income
- Private: Full witness data
- Output: nullifier, threshold, timestamp, expiresAt

### verifyAssets
- Input: `minimumAssets` (Field) - Minimum net worth
- Private: Full witness data
- Output: nullifier, threshold, netWorth, timestamp, expiresAt

### verifyCreditworthiness
- Input: `minimumScore` (Field) - Minimum credit score
- Private: Full witness data
- Output: nullifier, threshold, creditScore, timestamp, expiresAt

## Troubleshooting

### Compilation Issues

If compilation fails:
1. Ensure Compact compiler is installed
2. Check contract syntax
3. Verify output directory permissions

### Deployment Issues

If deployment fails:
1. Check RPC URL is accessible
2. Verify deployer key has sufficient funds
3. Ensure network is specified correctly

### Test Failures

If tests fail:
1. Run `npm install` to ensure dependencies
2. Check TypeScript compilation with `npm run type-check`
3. Review test output for specific errors

## Next Steps

After contract deployment:

1. Update backend `.env` with contract address
2. Configure proof server with circuit definitions
3. Test proof generation flow end-to-end
4. Verify contract on Midnight explorer
5. Integrate with frontend application

## Resources

- [Midnight Network Documentation](https://docs.midnight.network)
- [Compact Language Guide](https://docs.midnight.network/compact)
- [Zero-Knowledge Proofs Overview](https://docs.midnight.network/zkp)
- [BLS12-381 Curve Specification](https://docs.midnight.network/curves)
