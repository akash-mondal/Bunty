# Backend Testing Guide

This document describes the testing setup for the Bunty backend.

## Test Structure

The test suite is organized into the following categories:

### Unit Tests (`src/__tests__/`)
- **Utils Tests** (`utils/`): Tests for utility functions
  - `jwt.test.ts`: JWT token generation and validation
  
- **Service Tests** (`services/`): Tests for service layer logic
  - `witness.test.ts`: Witness hash calculation
  - `plaid.test.ts`: Plaid data processing
  - `stripe.test.ts`: Stripe verification processing
  - `sila.test.ts`: Sila payment processing
  - `midnight.test.ts`: Midnight RPC client

### Integration Tests (`src/__tests__/integration/`)
- `auth.test.ts`: Authentication endpoint tests
- `plaid.test.ts`: Plaid integration endpoint tests
- `stripe.test.ts`: Stripe webhook handling tests
- `witness.test.ts`: Witness generation endpoint tests
- `proof.test.ts`: Proof submission endpoint tests

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up test environment variables (automatically configured in `src/__tests__/setup.ts`)

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

- **Framework**: Jest with ts-jest
- **Environment**: Node.js
- **Setup**: `src/__tests__/setup.ts` configures test environment variables
- **Config**: `jest.config.js`

## Test Guidelines

1. **Unit tests** focus on individual functions and methods
2. **Integration tests** validate API endpoint behavior
3. Tests use minimal mocking to validate real functionality
4. All tests are focused on core functional logic

## Coverage

The test suite covers:
- JWT token generation and validation
- Witness hash calculation
- Data processing for Plaid, Stripe, Sila services
- Midnight RPC transaction formatting
- API endpoint validation and error handling
- Authentication flows
- Proof generation and submission flows

## Notes

- Tests are designed to run without external dependencies
- Mock data is used for external service responses
- Database and Redis connections are not required for unit tests
- Integration tests validate request/response structures
