import crypto from 'crypto';
import pool from '../config/database';
import plaidService from './plaid.service';
import { stripeService } from './stripe.service';
import midnightService from './midnight.service';
import type { Witness, WitnessCommitment, GenerateWitnessResponse, CommitHashResponse } from '../types/witness.types';

class WitnessService {
  /**
   * Generate witness data by combining Plaid and Stripe data
   */
  async generateWitness(userId: string): Promise<GenerateWitnessResponse> {
    try {
      // Fetch data from all sources
      const [incomeData, assetsData, liabilitiesData, signalData, verificationStatus] = await Promise.all([
        plaidService.getIncome(userId),
        plaidService.getAssets(userId),
        plaidService.getLiabilities(userId),
        plaidService.getSignal(userId),
        stripeService.getVerificationStatus(userId),
      ]);

      // Validate that verification status exists
      if (!verificationStatus) {
        throw new Error('User has not completed identity verification');
      }

      // Construct normalized witness data
      const witness: Witness = {
        income: incomeData.monthlyIncome,
        employmentMonths: incomeData.employmentMonths,
        employerHash: incomeData.employerHash,
        assets: assetsData.totalAssets,
        liabilities: liabilitiesData.totalLiabilities,
        creditScore: signalData.creditScore,
        ssnVerified: verificationStatus.ssnVerified,
        selfieVerified: verificationStatus.selfieVerified,
        documentVerified: verificationStatus.documentVerified,
        timestamp: Date.now(),
      };

      // Calculate SHA-256 hash of witness data
      const witnessHash = this.calculateWitnessHash(witness);

      return {
        witness,
        witnessHash,
      };
    } catch (error: any) {
      console.error('Error generating witness:', error);
      throw new Error(error.message || 'Failed to generate witness data');
    }
  }

  /**
   * Calculate SHA-256 hash of witness data
   */
  calculateWitnessHash(witness: Witness): string {
    // Create a deterministic string representation of the witness
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

  /**
   * Commit witness hash to database and optionally to blockchain
   */
  async commitHash(userId: string, witnessHash: string): Promise<CommitHashResponse> {
    try {
      // Attempt to commit hash to Midnight blockchain
      const onChainTxHash = await midnightService.commitHash(witnessHash, userId);

      // Store commitment in database
      const result = await pool.query<WitnessCommitment>(
        `INSERT INTO witness_commitments (user_id, witness_hash, on_chain_tx_hash)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, witness_hash, committed_at, on_chain_tx_hash`,
        [userId, witnessHash, onChainTxHash]
      );

      const commitment = result.rows[0];

      return {
        commitmentId: commitment.id,
        witnessHash: commitment.witness_hash,
        committedAt: commitment.committed_at,
        onChainTxHash: commitment.on_chain_tx_hash || undefined,
      };
    } catch (error: any) {
      console.error('Error committing hash:', error);
      throw new Error('Failed to commit witness hash');
    }
  }

  /**
   * Get witness commitments for a user
   */
  async getUserCommitments(userId: string): Promise<WitnessCommitment[]> {
    try {
      const result = await pool.query<WitnessCommitment>(
        `SELECT id, user_id, witness_hash, committed_at, on_chain_tx_hash
         FROM witness_commitments
         WHERE user_id = $1
         ORDER BY committed_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error: any) {
      console.error('Error fetching user commitments:', error);
      throw new Error('Failed to fetch witness commitments');
    }
  }

  /**
   * Verify a witness hash exists for a user
   */
  async verifyCommitment(userId: string, witnessHash: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT id FROM witness_commitments
         WHERE user_id = $1 AND witness_hash = $2`,
        [userId, witnessHash]
      );

      return result.rows.length > 0;
    } catch (error: any) {
      console.error('Error verifying commitment:', error);
      return false;
    }
  }
}

export default new WitnessService();
