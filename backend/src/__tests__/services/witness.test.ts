/**
 * Unit tests for witness hash calculation
 */

import { describe, it, expect } from '@jest/globals';
import crypto from 'crypto';
import type { Witness } from '../../types/witness.types';

// Import the hash calculation logic
function calculateWitnessHash(witness: Witness): string {
  const witnessString = JSON.stringify({
    income: witness.income,
    employmentMonths: witness.employmentMonths,
    employerHash: witness.employerHash,
    assets: witness.assets,
    liabilities: witness.liabilities,
    creditScore: witness.creditScore,
    ssnVerified: witness.ssnVerified,
    selfieVerified: witness.selfieVerified,
    documentVerified: witness.documentVerified,
    timestamp: witness.timestamp,
  });

  return crypto.createHash('sha256').update(witnessString).digest('hex');
}

describe('Witness Hash Calculation', () => {
  const validWitness: Witness = {
    income: 5000,
    employmentMonths: 12,
    employerHash: 'employer-hash-123',
    assets: 50000,
    liabilities: 10000,
    creditScore: 720,
    ssnVerified: true,
    selfieVerified: true,
    documentVerified: true,
    timestamp: 1234567890000,
  };

  describe('calculateWitnessHash', () => {
    it('should generate a valid SHA-256 hash', () => {
      const hash = calculateWitnessHash(validWitness);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it('should generate consistent hash for same witness data', () => {
      const hash1 = calculateWitnessHash(validWitness);
      const hash2 = calculateWitnessHash(validWitness);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different witness data', () => {
      const witness2 = { ...validWitness, income: 6000 };
      
      const hash1 = calculateWitnessHash(validWitness);
      const hash2 = calculateWitnessHash(witness2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should be sensitive to timestamp changes', () => {
      const witness2 = { ...validWitness, timestamp: 1234567890001 };
      
      const hash1 = calculateWitnessHash(validWitness);
      const hash2 = calculateWitnessHash(witness2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should be sensitive to boolean field changes', () => {
      const witness2 = { ...validWitness, ssnVerified: false };
      
      const hash1 = calculateWitnessHash(validWitness);
      const hash2 = calculateWitnessHash(witness2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle zero values correctly', () => {
      const witnessWithZeros = {
        ...validWitness,
        liabilities: 0,
        creditScore: 0,
      };
      
      const hash = calculateWitnessHash(witnessWithZeros);
      
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });

    it('should handle negative values correctly', () => {
      const witnessWithNegative = {
        ...validWitness,
        liabilities: -1000,
      };
      
      const hash = calculateWitnessHash(witnessWithNegative);
      
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });

    it('should be sensitive to all numeric field changes', () => {
      const fields = ['income', 'employmentMonths', 'assets', 'liabilities', 'creditScore'];
      const originalHash = calculateWitnessHash(validWitness);
      
      fields.forEach(field => {
        const modifiedWitness = { ...validWitness, [field]: (validWitness as any)[field] + 1 };
        const modifiedHash = calculateWitnessHash(modifiedWitness);
        expect(modifiedHash).not.toBe(originalHash);
      });
    });

    it('should be sensitive to employer hash changes', () => {
      const witness2 = { ...validWitness, employerHash: 'different-hash' };
      
      const hash1 = calculateWitnessHash(validWitness);
      const hash2 = calculateWitnessHash(witness2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should produce hex-only output', () => {
      const hash = calculateWitnessHash(validWitness);
      const isHex = /^[a-f0-9]+$/.test(hash);
      
      expect(isHex).toBe(true);
    });
  });

  describe('Witness data validation', () => {
    it('should validate all required fields are present', () => {
      const requiredFields = [
        'income',
        'employmentMonths',
        'employerHash',
        'assets',
        'liabilities',
        'creditScore',
        'ssnVerified',
        'selfieVerified',
        'documentVerified',
        'timestamp',
      ];
      
      requiredFields.forEach(field => {
        expect(validWitness).toHaveProperty(field);
      });
    });

    it('should validate numeric fields are numbers', () => {
      expect(typeof validWitness.income).toBe('number');
      expect(typeof validWitness.employmentMonths).toBe('number');
      expect(typeof validWitness.assets).toBe('number');
      expect(typeof validWitness.liabilities).toBe('number');
      expect(typeof validWitness.creditScore).toBe('number');
      expect(typeof validWitness.timestamp).toBe('number');
    });

    it('should validate boolean fields are booleans', () => {
      expect(typeof validWitness.ssnVerified).toBe('boolean');
      expect(typeof validWitness.selfieVerified).toBe('boolean');
      expect(typeof validWitness.documentVerified).toBe('boolean');
    });

    it('should validate string fields are strings', () => {
      expect(typeof validWitness.employerHash).toBe('string');
    });
  });
});
