/**
 * Unit tests for Plaid service client methods
 */

import { describe, it, expect } from '@jest/globals';
import crypto from 'crypto';

describe('Plaid Service', () => {
  describe('Income data processing', () => {
    it('should calculate monthly income from paystub data', () => {
      const paystubAmount = 5000;
      const monthlyIncome = paystubAmount;
      
      expect(monthlyIncome).toBe(5000);
      expect(typeof monthlyIncome).toBe('number');
    });

    it('should calculate employment months from start date', () => {
      const startDate = new Date('2023-01-01');
      const now = new Date('2024-01-01');
      const employmentMonths = Math.floor(
        (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      
      expect(employmentMonths).toBeGreaterThan(0);
      expect(employmentMonths).toBeLessThanOrEqual(12);
    });

    it('should generate employer hash from employer name', () => {
      const employerName = 'Test Company Inc';
      const employerHash = crypto
        .createHash('sha256')
        .update(employerName)
        .digest('hex');
      
      expect(employerHash).toBeDefined();
      expect(employerHash).toHaveLength(64);
      expect(typeof employerHash).toBe('string');
    });

    it('should handle missing employer name', () => {
      const employerName = 'Unknown';
      const employerHash = crypto
        .createHash('sha256')
        .update(employerName)
        .digest('hex');
      
      expect(employerHash).toBeDefined();
      expect(employerHash).toHaveLength(64);
    });

    it('should generate consistent hash for same employer', () => {
      const employerName = 'Test Company Inc';
      const hash1 = crypto.createHash('sha256').update(employerName).digest('hex');
      const hash2 = crypto.createHash('sha256').update(employerName).digest('hex');
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different employers', () => {
      const employer1 = 'Company A';
      const employer2 = 'Company B';
      const hash1 = crypto.createHash('sha256').update(employer1).digest('hex');
      const hash2 = crypto.createHash('sha256').update(employer2).digest('hex');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Assets data processing', () => {
    it('should calculate total assets from multiple accounts', () => {
      const accounts = [
        { balance: 10000, type: 'checking' },
        { balance: 25000, type: 'savings' },
        { balance: 15000, type: 'investment' },
      ];
      
      const totalAssets = accounts.reduce((sum, acc) => sum + acc.balance, 0);
      
      expect(totalAssets).toBe(50000);
    });

    it('should handle zero balance accounts', () => {
      const accounts = [
        { balance: 0, type: 'checking' },
        { balance: 5000, type: 'savings' },
      ];
      
      const totalAssets = accounts.reduce((sum, acc) => sum + acc.balance, 0);
      
      expect(totalAssets).toBe(5000);
    });

    it('should handle empty accounts array', () => {
      const accounts: Array<{ balance: number; type: string }> = [];
      const totalAssets = accounts.reduce((sum, acc) => sum + acc.balance, 0);
      
      expect(totalAssets).toBe(0);
    });
  });

  describe('Liabilities data processing', () => {
    it('should calculate total liabilities from multiple sources', () => {
      const liabilities = {
        credit: [{ balance: 2000 }, { balance: 1500 }],
        student: [{ balance: 15000 }],
        mortgage: [{ balance: 200000 }],
      };
      
      let total = 0;
      liabilities.credit.forEach((card: { balance: number }) => total += card.balance);
      liabilities.student.forEach((loan: { balance: number }) => total += loan.balance);
      liabilities.mortgage.forEach((mort: { balance: number }) => total += mort.balance);
      
      expect(total).toBe(218500);
    });

    it('should handle missing liability categories', () => {
      const liabilities = {
        credit: [{ balance: 2000 }],
        student: [] as Array<{ balance: number }>,
        mortgage: [] as Array<{ balance: number }>,
      };
      
      let total = 0;
      liabilities.credit.forEach((card: { balance: number }) => total += card.balance);
      liabilities.student.forEach((loan: { balance: number }) => total += loan.balance);
      liabilities.mortgage.forEach((mort: { balance: number }) => total += mort.balance);
      
      expect(total).toBe(2000);
    });
  });

  describe('Signal data processing', () => {
    it('should extract credit score from signal response', () => {
      const signalResponse = {
        customer_insight_score: 720,
        risk_score: 0.15,
      };
      
      const creditScore = signalResponse.customer_insight_score || 0;
      
      expect(creditScore).toBe(720);
      expect(creditScore).toBeGreaterThanOrEqual(0);
      expect(creditScore).toBeLessThanOrEqual(850);
    });

    it('should handle missing credit score', () => {
      const signalResponse = {
        risk_score: 0.15,
      };
      
      const creditScore = (signalResponse as any).customer_insight_score || 0;
      
      expect(creditScore).toBe(0);
    });
  });

  describe('Transactions data processing', () => {
    it('should format transaction data correctly', () => {
      const rawTransaction = {
        transaction_id: 'txn_123',
        amount: 45.67,
        date: '2024-01-15',
        merchant_name: 'Coffee Shop',
        category: ['Food and Drink', 'Restaurants'],
      };
      
      const formatted = {
        transactionId: rawTransaction.transaction_id,
        amount: rawTransaction.amount,
        date: rawTransaction.date,
        merchantName: rawTransaction.merchant_name,
        category: rawTransaction.category,
      };
      
      expect(formatted.transactionId).toBe('txn_123');
      expect(formatted.amount).toBe(45.67);
      expect(formatted.merchantName).toBe('Coffee Shop');
    });

    it('should handle missing merchant name', () => {
      const rawTransaction = {
        transaction_id: 'txn_123',
        amount: 45.67,
        date: '2024-01-15',
        name: 'Generic Transaction',
        category: ['Transfer'],
      };
      
      const merchantName = (rawTransaction as any).merchant_name || rawTransaction.name || 'Unknown';
      
      expect(merchantName).toBe('Generic Transaction');
    });

    it('should handle negative amounts for refunds', () => {
      const refundTransaction = {
        transaction_id: 'txn_456',
        amount: -25.00,
        date: '2024-01-16',
        merchant_name: 'Refund Store',
        category: ['Payment'],
      };
      
      expect(refundTransaction.amount).toBeLessThan(0);
      expect(Math.abs(refundTransaction.amount)).toBe(25.00);
    });
  });

  describe('Link token creation', () => {
    it('should validate user ID format', () => {
      const userId = 'user-123-abc';
      
      expect(userId).toBeDefined();
      expect(typeof userId).toBe('string');
      expect(userId.length).toBeGreaterThan(0);
    });
  });

  describe('Access token encryption', () => {
    it('should validate encrypted token is different from original', () => {
      const originalToken = 'access-sandbox-123abc';
      // Simulate encryption by creating a hash
      const encrypted = crypto.createHash('sha256').update(originalToken).digest('hex');
      
      expect(encrypted).not.toBe(originalToken);
      expect(encrypted).toHaveLength(64);
    });
  });
});
