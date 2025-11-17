/**
 * Test suite for income-proof.compact contract
 * Tests all three circuits: verifyIncome, verifyAssets, verifyCreditworthiness
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock witness data for testing
interface WitnessData {
  income: number;
  employmentMonths: number;
  employerHash: string;
  assets: number;
  liabilities: number;
  creditScore: number;
  ssnVerified: boolean;
  selfieVerified: boolean;
  documentVerified: boolean;
}

// Mock proof result
interface ProofResult {
  nullifier: string;
  threshold: number;
  timestamp: number;
  expiresAt: number;
}

/**
 * Mock contract interface for testing
 * In production, this would interact with actual Compact runtime
 */
class IncomeProofContract {
  private proofRegistry: Map<string, any> = new Map();
  
  verifyIncome(witness: WitnessData, threshold: number): ProofResult {
    // Validate income meets threshold
    if (witness.income < threshold) {
      throw new Error('Income does not meet threshold');
    }
    
    // Validate employment duration (minimum 6 months)
    if (witness.employmentMonths < 6) {
      throw new Error('Employment duration too short');
    }
    
    // Validate KYC completion
    if (!witness.ssnVerified || !witness.selfieVerified || !witness.documentVerified) {
      throw new Error('KYC verification incomplete');
    }
    
    // Generate nullifier
    const nullifier = this.generateNullifier(witness.employerHash, 'user-did');
    
    // Check nullifier not already used
    if (this.proofRegistry.has(nullifier)) {
      throw new Error('Proof already submitted (nullifier exists)');
    }
    
    // Calculate expiry (30 days)
    const currentTime = Date.now();
    const expiryTime = currentTime + (30 * 24 * 60 * 60 * 1000);
    
    // Store proof
    this.proofRegistry.set(nullifier, {
      nullifier,
      threshold,
      timestamp: currentTime,
      expiresAt: expiryTime
    });
    
    return {
      nullifier,
      threshold,
      timestamp: currentTime,
      expiresAt: expiryTime
    };
  }
  
  verifyAssets(witness: WitnessData, minimumAssets: number): ProofResult {
    // Validate assets are non-negative first
    if (witness.assets < 0) {
      throw new Error('Assets must be non-negative');
    }
    
    // Calculate net worth
    const netWorth = witness.assets - witness.liabilities;
    
    if (netWorth < minimumAssets) {
      throw new Error('Net worth does not meet minimum');
    }
    
    // Validate KYC
    if (!witness.ssnVerified || !witness.selfieVerified || !witness.documentVerified) {
      throw new Error('KYC verification incomplete');
    }
    
    // Generate nullifier
    const nullifier = this.generateNullifier(
      witness.assets.toString(),
      witness.liabilities.toString(),
      'user-did'
    );
    
    if (this.proofRegistry.has(nullifier)) {
      throw new Error('Proof already submitted (nullifier exists)');
    }
    
    const currentTime = Date.now();
    const expiryTime = currentTime + (30 * 24 * 60 * 60 * 1000);
    
    this.proofRegistry.set(nullifier, {
      nullifier,
      threshold: minimumAssets,
      timestamp: currentTime,
      expiresAt: expiryTime
    });
    
    return {
      nullifier,
      threshold: minimumAssets,
      timestamp: currentTime,
      expiresAt: expiryTime
    };
  }
  
  verifyCreditworthiness(witness: WitnessData, minimumScore: number): ProofResult {
    // Validate credit score
    if (witness.creditScore < minimumScore) {
      throw new Error('Credit score does not meet minimum');
    }
    
    // Validate income stability
    if (witness.income <= 0) {
      throw new Error('Income must be positive');
    }
    
    // Validate employment stability (12 months for creditworthiness)
    if (witness.employmentMonths < 12) {
      throw new Error('Employment duration too short for creditworthiness');
    }
    
    // Validate KYC
    if (!witness.ssnVerified || !witness.selfieVerified || !witness.documentVerified) {
      throw new Error('KYC verification incomplete');
    }
    
    // Generate nullifier
    const nullifier = this.generateNullifier(witness.creditScore.toString(), 'user-did');
    
    if (this.proofRegistry.has(nullifier)) {
      throw new Error('Proof already submitted (nullifier exists)');
    }
    
    const currentTime = Date.now();
    const expiryTime = currentTime + (30 * 24 * 60 * 60 * 1000);
    
    this.proofRegistry.set(nullifier, {
      nullifier,
      threshold: minimumScore,
      timestamp: currentTime,
      expiresAt: expiryTime
    });
    
    return {
      nullifier,
      threshold: minimumScore,
      timestamp: currentTime,
      expiresAt: expiryTime
    };
  }
  
  isProofValid(nullifier: string): boolean {
    if (!this.proofRegistry.has(nullifier)) {
      return false;
    }
    
    const proof = this.proofRegistry.get(nullifier);
    const currentTime = Date.now();
    
    return currentTime <= proof.expiresAt;
  }
  
  private generateNullifier(...inputs: string[]): string {
    // Simple hash for testing (in production, use sha256)
    return Buffer.from(inputs.join('-')).toString('hex');
  }
  
  reset() {
    this.proofRegistry.clear();
  }
}

describe('Income Proof Contract', () => {
  let contract: IncomeProofContract;
  let validWitness: WitnessData;
  
  beforeEach(() => {
    contract = new IncomeProofContract();
    validWitness = {
      income: 5000,
      employmentMonths: 12,
      employerHash: 'employer-hash-123',
      assets: 50000,
      liabilities: 10000,
      creditScore: 720,
      ssnVerified: true,
      selfieVerified: true,
      documentVerified: true
    };
  });
  
  describe('verifyIncome circuit', () => {
    it('should generate proof for valid income above threshold', () => {
      const result = contract.verifyIncome(validWitness, 4000);
      
      expect(result.nullifier).toBeDefined();
      expect(result.threshold).toBe(4000);
      expect(result.timestamp).toBeDefined();
      expect(result.expiresAt).toBeGreaterThan(result.timestamp);
    });
    
    it('should reject income below threshold', () => {
      expect(() => {
        contract.verifyIncome(validWitness, 6000);
      }).toThrow('Income does not meet threshold');
    });
    
    it('should reject employment duration less than 6 months', () => {
      const witness = { ...validWitness, employmentMonths: 5 };
      
      expect(() => {
        contract.verifyIncome(witness, 4000);
      }).toThrow('Employment duration too short');
    });
    
    it('should reject incomplete KYC verification', () => {
      const witness = { ...validWitness, ssnVerified: false };
      
      expect(() => {
        contract.verifyIncome(witness, 4000);
      }).toThrow('KYC verification incomplete');
    });
    
    it('should prevent nullifier replay attacks', () => {
      contract.verifyIncome(validWitness, 4000);
      
      expect(() => {
        contract.verifyIncome(validWitness, 4000);
      }).toThrow('Proof already submitted (nullifier exists)');
    });
  });
  
  describe('verifyAssets circuit', () => {
    it('should generate proof for valid net worth', () => {
      const result = contract.verifyAssets(validWitness, 30000);
      
      expect(result.nullifier).toBeDefined();
      expect(result.threshold).toBe(30000);
      expect(result.timestamp).toBeDefined();
    });
    
    it('should reject net worth below minimum', () => {
      expect(() => {
        contract.verifyAssets(validWitness, 50000);
      }).toThrow('Net worth does not meet minimum');
    });
    
    it('should reject negative assets', () => {
      const witness = { ...validWitness, assets: -1000 };
      
      expect(() => {
        contract.verifyAssets(witness, 10000);
      }).toThrow('Assets must be non-negative');
    });
    
    it('should prevent nullifier replay attacks', () => {
      contract.verifyAssets(validWitness, 30000);
      
      expect(() => {
        contract.verifyAssets(validWitness, 30000);
      }).toThrow('Proof already submitted (nullifier exists)');
    });
  });
  
  describe('verifyCreditworthiness circuit', () => {
    it('should generate proof for valid credit score', () => {
      const result = contract.verifyCreditworthiness(validWitness, 700);
      
      expect(result.nullifier).toBeDefined();
      expect(result.threshold).toBe(700);
      expect(result.timestamp).toBeDefined();
    });
    
    it('should reject credit score below minimum', () => {
      expect(() => {
        contract.verifyCreditworthiness(validWitness, 750);
      }).toThrow('Credit score does not meet minimum');
    });
    
    it('should reject zero or negative income', () => {
      const witness = { ...validWitness, income: 0 };
      
      expect(() => {
        contract.verifyCreditworthiness(witness, 700);
      }).toThrow('Income must be positive');
    });
    
    it('should reject employment duration less than 12 months', () => {
      const witness = { ...validWitness, employmentMonths: 11 };
      
      expect(() => {
        contract.verifyCreditworthiness(witness, 700);
      }).toThrow('Employment duration too short for creditworthiness');
    });
    
    it('should prevent nullifier replay attacks', () => {
      contract.verifyCreditworthiness(validWitness, 700);
      
      expect(() => {
        contract.verifyCreditworthiness(validWitness, 700);
      }).toThrow('Proof already submitted (nullifier exists)');
    });
  });
  
  describe('Proof expiry logic', () => {
    it('should set expiry to 30 days from timestamp', () => {
      const result = contract.verifyIncome(validWitness, 4000);
      
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      const expectedExpiry = result.timestamp + thirtyDaysInMs;
      
      expect(result.expiresAt).toBe(expectedExpiry);
    });
    
    it('should validate proof as valid before expiry', () => {
      const result = contract.verifyIncome(validWitness, 4000);
      
      expect(contract.isProofValid(result.nullifier)).toBe(true);
    });
  });
});
