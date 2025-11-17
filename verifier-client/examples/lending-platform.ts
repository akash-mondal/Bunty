/**
 * Lending Platform Integration Example
 * 
 * This example demonstrates how a lending platform would integrate
 * the Bunty verifier client to process loan applications.
 */

import { BuntyVerifierClient } from '../src';

interface LoanApplication {
  applicantDID: string;
  proofNullifier: string;
  requestedAmount: number;
  loanTerm: number; // months
}

interface LoanDecision {
  approved: boolean;
  reason: string;
  approvedAmount?: number;
  interestRate?: number;
  provenIncome?: number;
}

class LendingPlatform {
  private verifier: BuntyVerifierClient;

  constructor(indexerUrl: string) {
    this.verifier = new BuntyVerifierClient({ indexerUrl });
  }

  /**
   * Process a loan application using Bunty proof verification
   */
  async processLoanApplication(application: LoanApplication): Promise<LoanDecision> {
    console.log('Processing loan application...');
    console.log(`Applicant: ${application.applicantDID}`);
    console.log(`Requested amount: $${application.requestedAmount.toLocaleString()}`);
    console.log(`Loan term: ${application.loanTerm} months`);
    console.log('---');

    try {
      // Step 1: Verify the proof
      const validation = await this.verifier.verifyProof(application.proofNullifier);

      if (!validation.isValid) {
        return {
          approved: false,
          reason: 'Invalid or expired income proof. Please submit a current proof.'
        };
      }

      console.log(`✅ Proof verified - Income: $${validation.threshold.toLocaleString()}/month`);

      // Step 2: Check if proof expires soon
      const now = Date.now() / 1000;
      const daysUntilExpiry = (validation.expiresAt - now) / 86400;

      if (daysUntilExpiry < 7) {
        return {
          approved: false,
          reason: `Proof expires in ${Math.floor(daysUntilExpiry)} days. Please submit a fresh proof.`
        };
      }

      // Step 3: Calculate required income (3x monthly payment)
      const monthlyPayment = application.requestedAmount / application.loanTerm;
      const requiredMonthlyIncome = monthlyPayment * 3;

      console.log(`Required monthly income: $${requiredMonthlyIncome.toLocaleString()}`);
      console.log(`Proven monthly income: $${validation.threshold.toLocaleString()}`);

      if (validation.threshold < requiredMonthlyIncome) {
        return {
          approved: false,
          reason: `Insufficient income. Required: $${requiredMonthlyIncome.toLocaleString()}/month, Proven: $${validation.threshold.toLocaleString()}/month`
        };
      }

      // Step 4: Check applicant's proof history
      const proofHistory = await this.verifier.getUserProofs(application.applicantDID);
      const validProofCount = await this.verifier.getValidProofCount(application.applicantDID);

      console.log(`Applicant has ${validProofCount} valid proofs in history`);

      // Step 5: Calculate interest rate based on income and history
      let interestRate = 8.5; // Base rate

      // Lower rate for higher income
      if (validation.threshold >= requiredMonthlyIncome * 2) {
        interestRate -= 1.0;
      }

      // Lower rate for good proof history
      if (validProofCount >= 3) {
        interestRate -= 0.5;
      }

      // Step 6: Approve the loan
      return {
        approved: true,
        reason: 'Application approved based on verified income proof',
        approvedAmount: application.requestedAmount,
        interestRate: Math.max(interestRate, 5.0), // Minimum 5%
        provenIncome: validation.threshold
      };

    } catch (error) {
      console.error('Error processing application:', error);
      return {
        approved: false,
        reason: 'Unable to verify proof. Please try again later.'
      };
    }
  }
}

// Example usage
async function main() {
  const platform = new LendingPlatform(
    process.env.BUNTY_INDEXER_URL || 'http://localhost:8081/graphql'
  );

  const application: LoanApplication = {
    applicantDID: 'did:midnight:user123456789',
    proofNullifier: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    requestedAmount: 25000,
    loanTerm: 36
  };

  const decision = await platform.processLoanApplication(application);

  console.log('\n=== LOAN DECISION ===');
  console.log(`Status: ${decision.approved ? '✅ APPROVED' : '❌ DENIED'}`);
  console.log(`Reason: ${decision.reason}`);

  if (decision.approved) {
    console.log(`Approved amount: $${decision.approvedAmount!.toLocaleString()}`);
    console.log(`Interest rate: ${decision.interestRate}%`);
    console.log(`Monthly payment: $${(decision.approvedAmount! / 36).toFixed(2)}`);
  }
}

main();
