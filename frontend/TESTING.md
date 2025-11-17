# Frontend Testing Guide

This document describes the testing setup for the Bunty frontend.

## Test Structure

The test suite is organized into the following categories:

### Component Tests (`src/__tests__/components/`)
- `auth.test.tsx`: Authentication component tests
- `plaid.test.tsx`: Plaid Link component tests
- `stripe.test.tsx`: Stripe Identity component tests
- `proof.test.tsx`: Proof generation component tests
- `wallet.test.tsx`: Wallet connection component tests

### End-to-End Tests (`src/__tests__/e2e/`)
- `onboarding.test.tsx`: Complete user onboarding flow (registration → Plaid → Stripe → dashboard access)
- `proof-flow.test.tsx`: Proof generation and submission flow (witness construction → proof generation → wallet signing → blockchain submission)
- `verifier.test.tsx`: Verifier query flow (client initialization → proof queries → validation → subscriptions)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Test environment is configured in `jest.setup.js`

## Running Tests

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Test Configuration

- **Framework**: Jest with React Testing Library
- **Environment**: jsdom (browser-like environment)
- **Setup**: `jest.setup.js` configures test environment
- **Config**: `jest.config.js`

## Test Coverage

### Authentication Components
- Login form validation
- Registration form validation
- Password strength validation
- Auth context state management
- Token storage and refresh

### Plaid Link Component
- Link token validation
- Public token exchange
- Account display
- Connection status handling
- Error handling

### Stripe Identity Component
- Verification session creation
- Status display (verified/not verified)
- Modal handling
- Verification results processing

### Proof Generation Component
- Threshold input validation
- Witness data validation
- Proof generation progress tracking
- Proof display formatting
- Error handling

### Wallet Connection Component
- Wallet address validation
- Connection state management
- Balance display
- Transaction signing
- Network validation
- Error handling

### End-to-End Flows

#### User Onboarding Flow (95 test cases)
- Step 1: User registration with email/password validation and token management
- Step 2: Plaid bank account connection with OAuth flow and data fetching
- Step 3: Stripe Identity verification with KYC completion
- Step 4: Complete onboarding validation and dashboard access
- Error scenarios: Plaid failures, Stripe failures, network timeouts

#### Proof Generation and Submission Flow (95 test cases)
- Step 1: Witness data construction from Plaid and Stripe sources
- Step 2: Zero-knowledge proof generation via local proof server
- Step 3: Lace Wallet connection and transaction signing
- Step 4: Blockchain submission to Midnight Network
- Step 5: Proof sharing and credential display
- Error scenarios: Witness failures, proof timeouts, wallet issues, blockchain errors

#### Verifier Query Flow (95 test cases)
- Step 1: Verifier client initialization with GraphQL endpoint
- Step 2: Query proof by nullifier with validation
- Step 3: Validate proof requirements (expiry, threshold, recency)
- Step 4: Query proofs by user DID with filtering
- Step 5: Real-time proof subscriptions via WebSocket
- Step 6: Verifier client library usage patterns
- Step 7: Business logic integration (loans, rentals, credit limits)
- Error scenarios: Proof not found, expired proofs, network errors

## Test Guidelines

1. Tests focus on core functional logic
2. Minimal mocking approach
3. Validation of data structures and state
4. Error handling scenarios
5. User interaction flows

## Notes

- Tests validate component logic without full rendering
- Focus on data validation and state management
- E2E tests cover complete user workflows
- Tests are designed to be fast and reliable
