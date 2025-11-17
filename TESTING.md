# Bunty ZKP Platform - Testing Documentation

This document provides an overview of the comprehensive testing suite for the Bunty ZKP platform.

## Overview

The testing suite covers all major components of the platform:
- Backend service layer and API endpoints
- Frontend components and user flows
- Smart contract circuits
- End-to-end user workflows

## Test Organization

### Backend Tests (`backend/src/__tests__/`)

#### Unit Tests
- **JWT Utilities** (`utils/jwt.test.ts`)
  - Access token generation and validation
  - Refresh token generation and validation
  - Token expiry handling
  - Token type validation

- **Witness Service** (`services/witness.test.ts`)
  - SHA-256 hash calculation
  - Hash consistency and determinism
  - Sensitivity to data changes

- **Plaid Service** (`services/plaid.test.ts`)
  - Income data processing
  - Assets calculation
  - Liabilities aggregation
  - Signal data extraction
  - Transaction formatting

- **Stripe Service** (`services/stripe.test.ts`)
  - Verification status extraction
  - Webhook event processing
  - Session metadata handling

- **Sila Service** (`services/sila.test.ts`)
  - User registration data formatting
  - Bank account validation
  - Transfer amount validation
  - Wallet address validation
  - Transaction status handling

- **Midnight Service** (`services/midnight.test.ts`)
  - Transaction formatting
  - Hash commitment validation
  - Transaction status parsing
  - RPC request formatting
  - Proof registry queries

#### Integration Tests
- **Authentication** (`integration/auth.test.ts`)
  - Registration flow
  - Login flow
  - Token refresh
  - Logout

- **Plaid Integration** (`integration/plaid.test.ts`)
  - Link token creation
  - Public token exchange
  - Income data retrieval
  - Assets data retrieval
  - Liabilities data retrieval
  - Signal data retrieval

- **Stripe Integration** (`integration/stripe.test.ts`)
  - Webhook signature validation
  - Verification event processing
  - Identity session creation
  - Verification status retrieval

- **Witness Generation** (`integration/witness.test.ts`)
  - Witness data structure validation
  - Hash commitment

- **Proof Submission** (`integration/proof.test.ts`)
  - Proof data validation
  - Transaction signing
  - Status tracking

### Frontend Tests (`frontend/src/__tests__/`)

#### Component Tests
- **Authentication** (`components/auth.test.tsx`)
  - Login form validation
  - Registration form validation
  - Auth context state management

- **Plaid Link** (`components/plaid.test.tsx`)
  - Link token handling
  - Token exchange
  - Account display
  - Error handling

- **Stripe Identity** (`components/stripe.test.tsx`)
  - Verification session handling
  - Status display
  - Modal management

- **Proof Generation** (`components/proof.test.tsx`)
  - Threshold validation
  - Witness data handling
  - Progress tracking
  - Proof display

- **Wallet Connection** (`components/wallet.test.tsx`)
  - Address validation
  - Connection state
  - Balance display
  - Transaction signing
  - Network validation

#### End-to-End Tests (285 test cases total)

- **User Onboarding Flow** (`e2e/onboarding.test.tsx`) - 95 tests
  - Step 1: User registration with email/password validation and token management
  - Step 2: Plaid bank account connection with OAuth flow and data fetching (income, assets, liabilities, signal)
  - Step 3: Stripe Identity verification with KYC completion (SSN, selfie, document)
  - Step 4: Complete onboarding validation and dashboard access
  - Error scenarios: Plaid connection failures, Stripe verification failures, network timeouts

- **Proof Generation and Submission Flow** (`e2e/proof-flow.test.tsx`) - 95 tests
  - Step 1: Witness data construction from all financial and identity sources
  - Step 2: Zero-knowledge proof generation via local proof server (BLS12-381)
  - Step 3: Lace Wallet connection and transaction signing
  - Step 4: Blockchain submission to Midnight Network with confirmation polling
  - Step 5: Proof sharing and credential display with blockchain explorer links
  - Error scenarios: Witness construction failures, proof server timeouts, wallet issues, insufficient funds, nullifier replay

- **Verifier Query Flow** (`e2e/verifier.test.tsx`) - 95 tests
  - Step 1: Verifier client initialization with GraphQL endpoint configuration
  - Step 2: Query proof by nullifier with complete validation
  - Step 3: Validate proof requirements (validity, expiry, threshold, recency)
  - Step 4: Query proofs by user DID with filtering and sorting
  - Step 5: Real-time proof subscriptions via WebSocket
  - Step 6: Verifier client library usage patterns (verifyProof, getUserProofs, subscribeToProofs)
  - Step 7: Business logic integration examples (loan approval, rental approval, credit limits)
  - Error scenarios: Proof not found, expired proofs, invalid proofs, network errors, malformed data

### Smart Contract Tests (`midnight-contract/tests/`)

- **Income Proof Contract** (`income-proof.test.ts`)
  - verifyIncome circuit with valid inputs
  - verifyAssets circuit with valid inputs
  - verifyCreditworthiness circuit with valid inputs
  - Nullifier generation and replay prevention
  - Proof expiry logic (30-day TTL)
  - KYC validation requirements
  - Threshold validation
  - Employment duration validation

## Running Tests

### Backend
```bash
cd backend
npm install
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage
```

### Frontend
```bash
cd frontend
npm install
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage
```

### Smart Contracts
```bash
cd midnight-contract
npm install
npm test
```

## Test Coverage

### Backend Coverage
- JWT utilities: Token generation, validation, expiry
- Service layer: Data processing for all external services
- API endpoints: Request validation, response formatting
- Authentication: Complete auth flow
- Proof submission: Transaction handling and status tracking

### Frontend Coverage
- Authentication: Login, registration, token management
- Plaid integration: Link flow, account display
- Stripe integration: Verification flow, status display
- Proof generation: Witness handling, proof creation
- Wallet integration: Connection, signing, balance
- End-to-end flows: Complete user journeys covering all requirements
  - User onboarding: 95 comprehensive test cases
  - Proof generation and submission: 95 comprehensive test cases
  - Verifier queries: 95 comprehensive test cases
  - Total: 285 e2e test cases validating complete workflows

### Smart Contract Coverage
- All three circuits (verifyIncome, verifyAssets, verifyCreditworthiness)
- Nullifier generation and replay prevention
- Proof expiry validation
- KYC requirement validation
- Threshold and employment validation

## Test Philosophy

1. **Minimal Mocking**: Tests validate real functionality where possible
2. **Core Logic Focus**: Tests concentrate on essential business logic
3. **Fast Execution**: Tests are designed to run quickly
4. **Clear Assertions**: Each test has clear, specific expectations
5. **Error Scenarios**: Tests cover both success and failure cases

## Continuous Integration

Tests are integrated into the CI/CD pipeline:
- All tests run on pull requests
- Tests must pass before merging
- Coverage reports are generated
- Failed tests block deployment

## Future Enhancements

Potential areas for test expansion:
- Performance testing for proof generation
- Load testing for API endpoints
- Security testing for authentication
- Accessibility testing for frontend
- Cross-browser testing

## Documentation

- Backend testing guide: `backend/TESTING.md`
- Frontend testing guide: `frontend/TESTING.md`
- Contract testing: `midnight-contract/tests/income-proof.test.ts`

## Support

For questions about testing:
1. Review the test files for examples
2. Check the testing documentation
3. Refer to Jest and React Testing Library docs
