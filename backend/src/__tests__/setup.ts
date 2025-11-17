/**
 * Jest setup file for backend tests
 * Configures test environment and mocks
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';
process.env.PLAID_CLIENT_ID = 'test-plaid-client-id';
process.env.PLAID_SECRET = 'test-plaid-secret';
process.env.PLAID_ENV = 'sandbox';
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
process.env.SILA_APP_HANDLE = 'test-app-handle';
process.env.SILA_PRIVATE_KEY = 'test-private-key';
process.env.SILA_ENV = 'sandbox';
process.env.MIDNIGHT_RPC_URL = 'http://localhost:26657';
process.env.PROOF_SERVER_URL = 'http://localhost:6300';
process.env.INDEXER_URL = 'http://localhost:8081';

// Mock Sila SDK
jest.mock('sila-sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      register: jest.fn(),
      linkAccount: jest.fn(),
      issueWallet: jest.fn(),
      transfer: jest.fn(),
    })),
  };
});

// Mock proof status poller to prevent it from starting
jest.mock('../services/proofStatusPoller.service', () => ({
  __esModule: true,
  default: {
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

// Increase timeout for integration tests
jest.setTimeout(10000);
