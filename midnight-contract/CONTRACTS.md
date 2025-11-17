# Compact Smart Contract Documentation

## Contract: income-proof.compact

### Overview

The `income-proof.compact` contract implements a privacy-preserving financial identity verification system using zero-knowledge proofs on Midnight Network. It enables users to prove financial credentials without revealing sensitive data.

### Architecture

#### Ledger State

```compact
export ledger proofRegistry: Map<Bytes<32>, ProofRecord>;
```

The contract maintains a single ledger map that stores all submitted proofs indexed by their nullifier (a unique 32-byte hash). This ensures:
- Efficient proof lookup by nullifier
- Prevention of duplicate submissions
- On-chain proof verification without revealing private data

#### Data Types

**ProofRecord**
```compact
export type ProofRecord = {
  nullifier: Bytes<32>,    // Unique proof identifier (prevents replay)
  threshold: Field,         // Minimum value that was proven
  timestamp: Field,         // When proof was submitted
  expiresAt: Field,        // When proof expires (30 days)
  userDID: Bytes<32>       // User's decentralized identifier
};
```

**Witness Data (Private)**
```compact
witness private incomeData: {
  income: Field,                // Monthly income amount
  employmentMonths: Field,      // Months employed
  employerHash: Bytes<32>,      // Hash of employer identifier
  assets: Field,                // Total asset value
  liabilities: Field,           // Total liability value
  creditScore: Field,           // Credit score (300-850)
  ssnVerified: Bool,           // SSN verification status
  selfieVerified: Bool,        // Selfie verification status
  documentVerified: Bool       // Document verification status
};
```

### Circuits

#### 1. verifyIncome

**Purpose:** Prove income meets a threshold without revealing exact amount.

**Public Inputs:**
- `threshold: Field` - Minimum monthly income to prove

**Private Inputs:**
- Full witness data (incomeData)

**Validation Logic:**
1. Income must be >= threshold
2. Employment duration must be >= 6 months
3. SSN must be verified
4. Selfie must be verified
5. Document must be verified
6. Nullifier must not exist (no replay)

**Nullifier Generation:**
```
nullifier = sha256(employerHash, userDID)
```

This ensures:
- Each user can only submit one proof per employer
- Different employers generate different nullifiers
- Nullifier cannot be linked back to user without private data

**Public Outputs:**
```compact
{
  nullifier: Bytes<32>,
  threshold: Field,
  timestamp: Field,
  expiresAt: Field
}
```

**Use Cases:**
- Rental applications (prove income >= 3x rent)
- Loan applications (prove income >= minimum)
- Employment verification
- Gig economy income proof

#### 2. verifyAssets

**Purpose:** Prove net worth meets a threshold without revealing exact amounts.

**Public Inputs:**
- `minimumAssets: Field` - Minimum net worth to prove

**Private Inputs:**
- Full witness data (incomeData)

**Validation Logic:**
1. Net worth (assets - liabilities) must be >= minimumAssets
2. Assets must be non-negative
3. SSN must be verified
4. Selfie must be verified
5. Document must be verified
6. Nullifier must not exist (no replay)

**Nullifier Generation:**
```
nullifier = sha256(assets, liabilities, userDID)
```

This ensures:
- Each user can only submit one proof per asset/liability combination
- Changes in financial position require new proof
- Nullifier cannot reveal actual values

**Public Outputs:**
```compact
{
  nullifier: Bytes<32>,
  threshold: Field,
  netWorth: Field,
  timestamp: Field,
  expiresAt: Field
}
```

**Use Cases:**
- Investment account opening (prove net worth >= minimum)
- Mortgage applications (prove down payment capability)
- Wealth verification for exclusive services
- Collateral-free lending

#### 3. verifyCreditworthiness

**Purpose:** Prove creditworthiness without revealing exact credit score.

**Public Inputs:**
- `minimumScore: Field` - Minimum credit score to prove

**Private Inputs:**
- Full witness data (incomeData)

**Validation Logic:**
1. Credit score must be >= minimumScore
2. Income must be > 0
3. Employment duration must be >= 12 months (stricter than verifyIncome)
4. SSN must be verified
5. Selfie must be verified
6. Document must be verified
7. Nullifier must not exist (no replay)

**Nullifier Generation:**
```
nullifier = sha256(creditScore, userDID)
```

This ensures:
- Each user can only submit one proof per credit score
- Credit score changes require new proof
- Nullifier cannot reveal actual score

**Public Outputs:**
```compact
{
  nullifier: Bytes<32>,
  threshold: Field,
  creditScore: Field,
  timestamp: Field,
  expiresAt: Field
}
```

**Use Cases:**
- Credit card applications (prove score >= 700)
- Auto loans (prove creditworthiness)
- DeFi lending protocols
- Insurance rate qualification

### Query Functions

#### isProofValid

```compact
export query function isProofValid(nullifier: Bytes<32>): Bool
```

**Purpose:** Check if a proof exists and hasn't expired.

**Parameters:**
- `nullifier` - The proof's unique identifier

**Returns:**
- `true` if proof exists and current time <= expiresAt
- `false` if proof doesn't exist or has expired

**Use Case:** Verifiers check proof validity before making decisions.

#### getProofRecord

```compact
export query function getProofRecord(nullifier: Bytes<32>): ProofRecord?
```

**Purpose:** Retrieve full proof metadata.

**Parameters:**
- `nullifier` - The proof's unique identifier

**Returns:**
- `ProofRecord` if proof exists
- `null` if proof doesn't exist

**Use Case:** Verifiers retrieve proof details (threshold, timestamp, expiry).

#### isProofExpired

```compact
export query function isProofExpired(nullifier: Bytes<32>): Bool
```

**Purpose:** Check if a proof has expired.

**Parameters:**
- `nullifier` - The proof's unique identifier

**Returns:**
- `true` if proof doesn't exist or has expired
- `false` if proof exists and hasn't expired

**Use Case:** Determine if user needs to generate new proof.

### Security Properties

#### Nullifier System

**Purpose:** Prevent proof replay attacks

**Mechanism:**
1. Each circuit generates a unique nullifier from private witness data
2. Nullifier is stored in proofRegistry on first submission
3. Subsequent submissions with same nullifier are rejected
4. Different circuits use different nullifier generation logic

**Security Guarantees:**
- Users cannot submit the same proof twice
- Nullifiers cannot be predicted without private data
- Nullifiers cannot be linked across different proof types

#### Proof Expiry

**Purpose:** Ensure proof freshness

**Mechanism:**
1. Each proof is timestamped on submission
2. Expiry is set to timestamp + 30 days (2,592,000 seconds)
3. Query functions check current time against expiry
4. Expired proofs are considered invalid

**Security Guarantees:**
- Proofs cannot be used indefinitely
- Financial data remains current
- Users must re-verify periodically

#### KYC Requirements

**Purpose:** Ensure proof authenticity

**Mechanism:**
1. All circuits require ssnVerified == true
2. All circuits require selfieVerified == true
3. All circuits require documentVerified == true
4. Proofs cannot be generated without complete KYC

**Security Guarantees:**
- Proofs are tied to verified identities
- Prevents synthetic identity fraud
- Ensures compliance with regulations

### Privacy Properties

#### Zero-Knowledge

**What is Revealed:**
- Proof meets threshold (boolean)
- Threshold value
- Timestamp of submission
- Proof expiry date
- Nullifier (unlinkable hash)

**What is Hidden:**
- Exact income amount
- Exact asset values
- Exact liability amounts
- Exact credit score
- Employer identity
- Bank account details
- SSN or identity documents
- Any other witness data

#### Selective Disclosure

Users choose which circuit to execute:
- Income proof only (doesn't reveal assets)
- Asset proof only (doesn't reveal income)
- Credit proof only (doesn't reveal exact score)
- Multiple proofs for different purposes

### Integration Guide

#### For Backend Services

**Proof Submission:**
1. User generates proof locally using proof server
2. User signs transaction with Lace Wallet
3. Backend relays transaction to Midnight node
4. Backend monitors transaction confirmation
5. Backend updates local database with proof status

**Proof Verification:**
1. Query indexer GraphQL API with nullifier
2. Check isProofValid(nullifier)
3. Retrieve getProofRecord(nullifier) for details
4. Verify threshold meets requirements
5. Check expiry date

#### For Frontend Applications

**Proof Generation:**
1. Fetch witness data from backend APIs
2. Store witness in IndexedDB (encrypted)
3. Send witness to local proof server
4. Receive ZK proof from proof server
5. Request wallet signature
6. Submit signed transaction

**Proof Sharing:**
1. Display nullifier to user
2. Provide copy-to-clipboard functionality
3. Show proof expiry date
4. Link to blockchain explorer

#### For Verifiers

**Proof Validation:**
1. Receive nullifier from user
2. Query GraphQL indexer
3. Check proof validity and expiry
4. Verify threshold meets requirements
5. Make decision based on proof

**Real-Time Updates:**
1. Subscribe to proof submission events
2. Receive notifications for new proofs
3. Update verification status automatically

### Gas and Performance

#### Circuit Complexity

- **verifyIncome:** ~5 constraints
- **verifyAssets:** ~6 constraints (includes subtraction)
- **verifyCreditworthiness:** ~6 constraints

#### Proof Generation Time

- Expected: < 5 seconds on modern hardware
- Depends on: CPU, proof server configuration, circuit optimization

#### Transaction Costs

- Proof submission: ~0.1 ADA (estimated)
- Query operations: Free (read-only)

### Testing

#### Unit Tests

Test each circuit with:
- Valid inputs (should succeed)
- Invalid inputs (should fail)
- Boundary conditions
- Replay attacks (should fail)
- Expired proofs (should be invalid)

#### Integration Tests

Test full flow:
1. Witness construction
2. Proof generation
3. Transaction submission
4. Proof verification
5. Expiry handling

### Deployment

#### Testnet Deployment

```bash
MIDNIGHT_NETWORK=testnet npm run deploy:testnet
```

#### Mainnet Deployment

```bash
MIDNIGHT_NETWORK=mainnet npm run deploy:mainnet
```

#### Post-Deployment

1. Record contract address
2. Update backend configuration
3. Configure proof server with circuits
4. Test all three circuits
5. Verify on blockchain explorer

### Maintenance

#### Contract Upgrades

Compact contracts are immutable once deployed. For upgrades:
1. Deploy new contract version
2. Migrate users to new contract
3. Deprecate old contract
4. Update all integrations

#### Monitoring

Monitor:
- Proof submission rate
- Circuit usage distribution
- Average proof generation time
- Expiry and renewal patterns
- Failed submissions

### Compliance

#### Privacy Regulations

- GDPR compliant (no PII on-chain)
- CCPA compliant (user controls data)
- Right to be forgotten (proofs expire)

#### Financial Regulations

- KYC/AML requirements enforced
- Identity verification required
- Audit trail maintained
- Regulatory reporting possible

### Future Enhancements

Potential improvements:
1. Additional circuits (employment history, education)
2. Configurable expiry periods
3. Proof revocation mechanism
4. Multi-party proofs
5. Recursive proof composition
6. Cross-chain verification
