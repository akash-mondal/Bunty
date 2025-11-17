/**
 * Rental Application Verification Example
 * 
 * This example demonstrates how a rental platform would use
 * the Bunty verifier client to verify tenant income.
 */

import { BuntyVerifierClient } from '../src';

interface RentalApplication {
  tenantDID: string;
  proofNullifier: string;
  monthlyRent: number;
  propertyAddress: string;
}

interface VerificationResult {
  approved: boolean;
  reason: string;
  provenIncome?: number;
  incomeToRentRatio?: number;
}

class RentalPlatform {
  private verifier: BuntyVerifierClient;
  private readonly INCOME_MULTIPLIER = 3; // Rent should be max 1/3 of income

  constructor(indexerUrl: string) {
    this.verifier = new BuntyVerifierClient({ indexerUrl });
  }

  /**
   * Verify tenant income for rental application
   */
  async verifyTenantIncome(application: RentalApplication): Promise<VerificationResult> {
    console.log('Verifying tenant income...');
    console.log(`Property: ${application.propertyAddress}`);
    console.log(`Monthly rent: $${application.monthlyRent.toLocaleString()}`);
    console.log(`Tenant DID: ${application.tenantDID}`);
    console.log('---');

    try {
      // Verify the proof
      const validation = await this.verifier.verifyProof(application.proofNullifier);

      if (!validation.isValid) {
        return {
          approved: false,
          reason: 'Invalid or expired income proof'
        };
      }

      console.log(`✅ Income proof verified: $${validation.threshold.toLocaleString()}/month`);

      // Calculate required income
      const requiredIncome = application.monthlyRent * this.INCOME_MULTIPLIER;
      const incomeToRentRatio = validation.threshold / application.monthlyRent;

      console.log(`Required income: $${requiredIncome.toLocaleString()}/month`);
      console.log(`Income-to-rent ratio: ${incomeToRentRatio.toFixed(2)}x`);

      // Check if income meets requirement
      if (validation.threshold < requiredIncome) {
        return {
          approved: false,
          reason: `Insufficient income. Required: $${requiredIncome.toLocaleString()}/month (${this.INCOME_MULTIPLIER}x rent)`,
          provenIncome: validation.threshold,
          incomeToRentRatio
        };
      }

      // Check proof expiry
      const now = Date.now() / 1000;
      const daysUntilExpiry = (validation.expiresAt - now) / 86400;

      if (daysUntilExpiry < 14) {
        return {
          approved: false,
          reason: `Proof expires in ${Math.floor(daysUntilExpiry)} days. Please submit a fresh proof.`
        };
      }

      // Get tenant history
      const tenantHistory = await this.getTenantHistory(application.tenantDID);
      console.log(`Tenant has ${tenantHistory.validProofs} valid proofs in history`);

      return {
        approved: true,
        reason: 'Income verification successful',
        provenIncome: validation.threshold,
        incomeToRentRatio
      };

    } catch (error) {
      console.error('Error verifying tenant:', error);
      return {
        approved: false,
        reason: 'Unable to verify income proof'
      };
    }
  }

  /**
   * Get tenant's proof history
   */
  async getTenantHistory(tenantDID: string) {
    const proofs = await this.verifier.getUserProofs(tenantDID);
    const now = Date.now() / 1000;
    const validProofs = proofs.filter(p => p.isValid && p.expiresAt >= now);

    return {
      totalProofs: proofs.length,
      validProofs: validProofs.length,
      highestIncome: Math.max(...proofs.map(p => p.threshold), 0),
      mostRecentProof: proofs.length > 0 
        ? proofs.sort((a, b) => b.timestamp - a.timestamp)[0]
        : null
    };
  }

  /**
   * Calculate maximum affordable rent for a tenant
   */
  async calculateMaxRent(tenantDID: string, proofNullifier: string): Promise<number> {
    const validation = await this.verifier.verifyProof(proofNullifier);
    
    if (!validation.isValid) {
      return 0;
    }

    // Maximum rent is 1/3 of monthly income
    return Math.floor(validation.threshold / this.INCOME_MULTIPLIER);
  }
}

// Example usage
async function main() {
  const platform = new RentalPlatform(
    process.env.BUNTY_INDEXER_URL || 'http://localhost:8081/graphql'
  );

  const application: RentalApplication = {
    tenantDID: 'did:midnight:tenant456',
    proofNullifier: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    monthlyRent: 2500,
    propertyAddress: '123 Main St, Apt 4B'
  };

  const result = await platform.verifyTenantIncome(application);

  console.log('\n=== VERIFICATION RESULT ===');
  console.log(`Status: ${result.approved ? '✅ APPROVED' : '❌ DENIED'}`);
  console.log(`Reason: ${result.reason}`);

  if (result.approved && result.provenIncome) {
    console.log(`Proven income: $${result.provenIncome.toLocaleString()}/month`);
    console.log(`Income-to-rent ratio: ${result.incomeToRentRatio!.toFixed(2)}x`);
    console.log(`Rent as % of income: ${((application.monthlyRent / result.provenIncome) * 100).toFixed(1)}%`);
  }

  // Calculate max affordable rent
  console.log('\n=== AFFORDABILITY ANALYSIS ===');
  const maxRent = await platform.calculateMaxRent(
    application.tenantDID,
    application.proofNullifier
  );
  console.log(`Maximum affordable rent: $${maxRent.toLocaleString()}/month`);
}

main();
