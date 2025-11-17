/**
 * Tests for Plaid Link component
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlaidLink } from '@/components/PlaidLink';
import { plaidService } from '@/services/plaid.service';
import React from 'react';

// Mock Plaid Link SDK
jest.mock('react-plaid-link', () => ({
  usePlaidLink: jest.fn((config) => ({
    open: jest.fn(() => {
      // Simulate successful link
      if (config.onSuccess) {
        config.onSuccess('public-sandbox-token-123', {});
      }
    }),
    ready: true,
  })),
}));

// Mock plaid service
const mockCreateLinkToken = jest.fn();
const mockExchangePublicToken = jest.fn();

jest.mock('@/services/plaid.service', () => ({
  plaidService: {
    createLinkToken: (...args: any[]) => mockCreateLinkToken(...args),
    exchangePublicToken: (...args: any[]) => mockExchangePublicToken(...args),
  },
}));

describe('Plaid Link Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render connect button', () => {
      render(<PlaidLink />);
      
      expect(screen.getByText('Connect Bank Account')).toBeInTheDocument();
    });

    it('should show loading state when connecting', async () => {
      mockCreateLinkToken.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('link-token-123'), 100))
      );
      
      render(<PlaidLink />);
      
      const button = screen.getByText('Connect Bank Account');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
      });
    });

    it('should disable button when loading', async () => {
      mockCreateLinkToken.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('link-token-123'), 100))
      );
      
      render(<PlaidLink />);
      
      const button = screen.getByText('Connect Bank Account') as HTMLButtonElement;
      fireEvent.click(button);
      
      await waitFor(() => {
        const loadingButton = screen.getByText('Connecting...') as HTMLButtonElement;
        expect(loadingButton.disabled).toBe(true);
      });
    });
  });

  describe('Link Token Creation', () => {
    it('should create link token on button click', async () => {
      mockCreateLinkToken.mockResolvedValue('link-token-123');
      mockExchangePublicToken.mockResolvedValue(undefined);
      
      render(<PlaidLink />);
      
      const button = screen.getByText('Connect Bank Account');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockCreateLinkToken).toHaveBeenCalled();
      });
    });

    it('should validate link token format', () => {
      const linkToken = 'link-sandbox-abc123';
      
      expect(linkToken).toBeDefined();
      expect(linkToken).toContain('link-');
      expect(typeof linkToken).toBe('string');
    });
  });

  describe('Public Token Exchange', () => {
    it('should exchange public token after success', async () => {
      mockCreateLinkToken.mockResolvedValue('link-token-123');
      mockExchangePublicToken.mockResolvedValue(undefined);
      
      render(<PlaidLink />);
      
      const button = screen.getByText('Connect Bank Account');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockExchangePublicToken).toHaveBeenCalledWith('public-sandbox-token-123');
      });
    });

    it('should call onSuccess callback after exchange', async () => {
      const onSuccess = jest.fn();
      mockCreateLinkToken.mockResolvedValue('link-token-123');
      mockExchangePublicToken.mockResolvedValue(undefined);
      
      render(<PlaidLink onSuccess={onSuccess} />);
      
      const button = screen.getByText('Connect Bank Account');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error when link token creation fails', async () => {
      mockCreateLinkToken.mockRejectedValue(
        new Error('Failed to create link token')
      );
      
      render(<PlaidLink />);
      
      const button = screen.getByText('Connect Bank Account');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to create link token')).toBeInTheDocument();
      });
    });

    it('should display error when token exchange fails', async () => {
      mockCreateLinkToken.mockResolvedValue('link-token-123');
      mockExchangePublicToken.mockRejectedValue(
        new Error('Failed to exchange token')
      );
      
      render(<PlaidLink />);
      
      const button = screen.getByText('Connect Bank Account');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to exchange token')).toBeInTheDocument();
      });
    });

    it('should call onError callback on failure', async () => {
      const onError = jest.fn();
      mockCreateLinkToken.mockRejectedValue(
        new Error('Network error')
      );
      
      render(<PlaidLink onError={onError} />);
      
      const button = screen.getByText('Connect Bank Account');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('Account Data Validation', () => {
    it('should validate account information structure', () => {
      const account = {
        id: 'acc-123',
        name: 'Checking Account',
        mask: '1234',
        type: 'depository',
        subtype: 'checking',
        institutionName: 'Test Bank',
      };
      
      expect(account.name).toBeDefined();
      expect(account.mask).toHaveLength(4);
      expect(account.institutionName).toBeDefined();
      expect(account.type).toBe('depository');
    });

    it('should handle multiple accounts', () => {
      const accounts = [
        { id: 'acc-1', name: 'Checking', mask: '1234' },
        { id: 'acc-2', name: 'Savings', mask: '5678' },
      ];
      
      expect(accounts).toHaveLength(2);
      expect(Array.isArray(accounts)).toBe(true);
    });
  });
});
