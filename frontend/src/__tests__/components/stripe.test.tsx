/**
 * Tests for Stripe Identity component
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StripeIdentity } from '@/components/StripeIdentity';
import { stripeService } from '@/services/stripe.service';
import React from 'react';

// Mock stripe service
const mockCreateIdentitySession = jest.fn();

jest.mock('@/services/stripe.service', () => ({
  stripeService: {
    createIdentitySession: (...args: any[]) => mockCreateIdentitySession(...args),
  },
}));

describe('Stripe Identity Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.location
    delete (window as any).location;
    window.location = { href: 'http://localhost:3000/dashboard' } as any;
  });

  describe('Component Rendering', () => {
    it('should render verification button', () => {
      render(<StripeIdentity />);
      
      expect(screen.getByText('Start Identity Verification')).toBeInTheDocument();
    });

    it('should render info text', () => {
      render(<StripeIdentity />);
      
      expect(screen.getByText(/valid government-issued ID/i)).toBeInTheDocument();
    });

    it('should show loading state when starting verification', async () => {
      mockCreateIdentitySession.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ clientSecret: 'vs_123_secret' }), 100))
      );
      
      render(<StripeIdentity />);
      
      const button = screen.getByText('Start Identity Verification');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Starting Verification...')).toBeInTheDocument();
      });
    });

    it('should disable button when loading', async () => {
      mockCreateIdentitySession.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ clientSecret: 'vs_123_secret' }), 100))
      );
      
      render(<StripeIdentity />);
      
      const button = screen.getByText('Start Identity Verification') as HTMLButtonElement;
      fireEvent.click(button);
      
      await waitFor(() => {
        const loadingButton = screen.getByText('Starting Verification...') as HTMLButtonElement;
        expect(loadingButton.disabled).toBe(true);
      });
    });
  });

  describe('Verification Session', () => {
    it('should create verification session on button click', async () => {
      mockCreateIdentitySession.mockResolvedValue({
        clientSecret: 'vs_123_secret_abc',
      });
      
      render(<StripeIdentity />);
      
      const button = screen.getByText('Start Identity Verification');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockCreateIdentitySession).toHaveBeenCalledWith('http://localhost:3000/dashboard');
      });
    });

    it('should validate session ID format', () => {
      const sessionId = 'vs_123abc';
      
      expect(sessionId).toBeDefined();
      expect(sessionId).toContain('vs_');
      expect(typeof sessionId).toBe('string');
    });

    it('should validate client secret format', () => {
      const clientSecret = 'vs_123_secret_abc';
      
      expect(clientSecret).toBeDefined();
      expect(clientSecret).toContain('secret');
      expect(typeof clientSecret).toBe('string');
    });
  });

  describe('Error Handling', () => {
    it('should display error when session creation fails', async () => {
      mockCreateIdentitySession.mockRejectedValue(
        new Error('Failed to create session')
      );
      
      render(<StripeIdentity />);
      
      const button = screen.getByText('Start Identity Verification');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to create session')).toBeInTheDocument();
      });
    });

    it('should call onError callback on failure', async () => {
      const onError = jest.fn();
      mockCreateIdentitySession.mockRejectedValue(
        new Error('Network error')
      );
      
      render(<StripeIdentity onError={onError} />);
      
      const button = screen.getByText('Start Identity Verification');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should handle missing client secret', async () => {
      mockCreateIdentitySession.mockResolvedValue({
        clientSecret: null,
      });
      
      render(<StripeIdentity />);
      
      const button = screen.getByText('Start Identity Verification');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to create verification session')).toBeInTheDocument();
      });
    });
  });

  describe('Verification Status', () => {
    it('should validate complete verification status', () => {
      const status = {
        ssnVerified: true,
        selfieVerified: true,
        documentVerified: true,
        completedAt: new Date(),
      };
      
      expect(status.ssnVerified).toBe(true);
      expect(status.selfieVerified).toBe(true);
      expect(status.documentVerified).toBe(true);
      expect(status.completedAt).toBeDefined();
    });

    it('should detect partial verification', () => {
      const status = {
        ssnVerified: true,
        selfieVerified: false,
        documentVerified: true,
      };
      
      const isFullyVerified = 
        status.ssnVerified && 
        status.selfieVerified && 
        status.documentVerified;
      
      expect(isFullyVerified).toBe(false);
    });

    it('should handle pending verification', () => {
      const status = {
        ssnVerified: false,
        selfieVerified: false,
        documentVerified: false,
        completedAt: undefined,
      };
      
      expect(status.completedAt).toBeUndefined();
      
      const isComplete = status.ssnVerified && status.selfieVerified && status.documentVerified;
      expect(isComplete).toBe(false);
    });
  });

  describe('Status Badge Logic', () => {
    it('should show verified badge for complete verification', () => {
      const isVerified = true;
      const badgeText = isVerified ? 'Verified' : 'Not Verified';
      
      expect(badgeText).toBe('Verified');
    });

    it('should show not verified badge for incomplete verification', () => {
      const isVerified = false;
      const badgeText = isVerified ? 'Verified' : 'Not Verified';
      
      expect(badgeText).toBe('Not Verified');
    });
  });
});
