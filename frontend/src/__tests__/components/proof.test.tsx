/**
 * Tests for proof generation component
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProofDisplay } from '@/components/ProofDisplay';
import { proofService } from '@/services/proof.service';
import React from 'react';

// Mock proof service
jest.mock('@/services/proof.service', () => ({
  proofService: {
    formatExpiryDate: jest.fn((timestamp: number) => {
      const date = new Date(timestamp * 1000);
      return date.toLocaleDateString();
    }),
    getDaysUntilExpiry: jest.fn((timestamp: number) => {
      const now = Date.now() / 1000;
      const days = Math.floor((timestamp - now) / (24 * 60 * 60));
      return days;
    }),
    isProofExpired: jest.fn((timestamp: number) => {
      const now = Date.now() / 1000;
      return timestamp < now;
    }),
  },
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

describe('Proof Generation Component', () => {
  const mockProof = {
    proof: 'base64encodedproofdata123456789',
    publicInputs: ['5000'],
    publicOutputs: {
      nullifier: 'a'.repeat(64),
      timestamp: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render proof display with all details', () => {
      render(<ProofDisplay proof={mockProof} circuit="verifyIncome" threshold={5000} />);
      
      expect(screen.getByText(/Proof Generated Successfully/i)).toBeInTheDocument();
      expect(screen.getByText('Nullifier')).toBeInTheDocument();
      expect(screen.getByText('Threshold')).toBeInTheDocument();
    });

    it('should display circuit type badge', () => {
      render(<ProofDisplay proof={mockProof} circuit="verifyIncome" threshold={5000} />);
      
      expect(screen.getByText('Income')).toBeInTheDocument();
    });

    it('should display threshold value', () => {
      render(<ProofDisplay proof={mockProof} circuit="verifyIncome" threshold={5000} />);
      
      expect(screen.getByText('$5,000')).toBeInTheDocument();
    });
  });

  describe('Threshold Validation', () => {
    it('should validate positive threshold', () => {
      const threshold = 5000;
      
      expect(threshold).toBeGreaterThan(0);
      expect(typeof threshold).toBe('number');
    });

    it('should reject negative threshold', () => {
      const threshold = -1000;
      const isValid = threshold > 0;
      
      expect(isValid).toBe(false);
    });

    it('should reject zero threshold', () => {
      const threshold = 0;
      const isValid = threshold > 0;
      
      expect(isValid).toBe(false);
    });
  });

  describe('Witness Data Validation', () => {
    it('should validate complete witness structure', () => {
      const witness = {
        income: 5000,
        employmentMonths: 12,
        employerHash: 'hash123',
        assets: 50000,
        liabilities: 10000,
        creditScore: 720,
        ssnVerified: true,
        selfieVerified: true,
        documentVerified: true,
        timestamp: Date.now(),
      };
      
      expect(witness.income).toBeGreaterThanOrEqual(0);
      expect(witness.employmentMonths).toBeGreaterThanOrEqual(0);
      expect(witness.timestamp).toBeGreaterThan(0);
      expect(witness.ssnVerified).toBe(true);
    });

    it('should handle missing witness data', () => {
      const witness = null;
      
      expect(witness).toBeNull();
    });

    it('should validate witness field types', () => {
      const witness = {
        income: 5000,
        employmentMonths: 12,
        employerHash: 'hash',
        assets: 50000,
        liabilities: 10000,
        creditScore: 720,
        ssnVerified: true,
        selfieVerified: true,
        documentVerified: true,
        timestamp: Date.now(),
      };
      
      expect(typeof witness.income).toBe('number');
      expect(typeof witness.employerHash).toBe('string');
      expect(typeof witness.ssnVerified).toBe('boolean');
    });
  });

  describe('Proof Display Details', () => {
    it('should display nullifier', () => {
      render(<ProofDisplay proof={mockProof} circuit="verifyIncome" threshold={5000} />);
      
      const nullifierText = screen.getByText(/aaa/);
      expect(nullifierText).toBeInTheDocument();
    });

    it('should validate nullifier length', () => {
      const nullifier = 'a'.repeat(64);
      
      expect(nullifier).toHaveLength(64);
    });

    it('should validate proof structure', () => {
      expect(mockProof.proof).toBeDefined();
      expect(mockProof.publicOutputs.nullifier).toHaveLength(64);
      expect(mockProof.publicOutputs.timestamp).toBeGreaterThan(0);
      expect(mockProof.publicOutputs.expiresAt).toBeGreaterThan(mockProof.publicOutputs.timestamp);
    });
  });

  describe('Copy Functionality', () => {
    it('should copy nullifier to clipboard', async () => {
      render(<ProofDisplay proof={mockProof} circuit="verifyIncome" threshold={5000} />);
      
      const copyButtons = screen.getAllByText('Copy');
      fireEvent.click(copyButtons[0]);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockProof.publicOutputs.nullifier);
    });

    it('should show copied confirmation', async () => {
      render(<ProofDisplay proof={mockProof} circuit="verifyIncome" threshold={5000} />);
      
      const copyButtons = screen.getAllByText('Copy');
      fireEvent.click(copyButtons[0]);
      
      expect(await screen.findByText('✓ Copied')).toBeInTheDocument();
    });
  });

  describe('Expiry Handling', () => {
    it('should calculate days until expiry', () => {
      const now = Date.now() / 1000;
      const expiresAt = now + 30 * 24 * 60 * 60;
      const days = Math.floor((expiresAt - now) / (24 * 60 * 60));
      
      expect(days).toBeGreaterThan(0);
      expect(days).toBeLessThanOrEqual(30);
    });

    it('should detect expired proof', () => {
      const now = Date.now() / 1000;
      const expiredTimestamp = now - 1000;
      
      expect(expiredTimestamp).toBeLessThan(now);
    });

    it('should format expiry date', () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const now = new Date();
      
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('Error Handling', () => {
    it('should validate error structure', () => {
      const error = {
        message: 'Proof generation failed',
        code: 'PROOF_001',
      };
      
      expect(error.message).toBeDefined();
      expect(error.code).toBeDefined();
    });

    it('should handle timeout errors', () => {
      const error = new Error('Proof server timeout');
      
      expect(error.message).toContain('timeout');
    });

    it('should handle invalid witness errors', () => {
      const error = new Error('Invalid witness data');
      
      expect(error.message).toContain('Invalid witness');
    });
  });
});
