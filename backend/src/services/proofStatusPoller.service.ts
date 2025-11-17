import pool from '../config/database';
import midnightService from './midnight.service';
import paymentAutomationService from './paymentAutomation.service';
import metricsService from './metrics.service';
import logger from '../utils/logger';

/**
 * Background service to poll pending proof submissions and update their status
 */
class ProofStatusPollerService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private pollIntervalMs: number = 10000; // Poll every 10 seconds

  /**
   * Start the background polling service
   */
  start() {
    if (this.isPolling) {
      logger.info('Proof status poller is already running');
      return;
    }

    logger.info('Starting proof status poller service...');
    this.isPolling = true;

    // Run immediately on start
    this.pollPendingProofs();

    // Then run at regular intervals
    this.pollingInterval = setInterval(() => {
      this.pollPendingProofs();
    }, this.pollIntervalMs);
  }

  /**
   * Stop the background polling service
   */
  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    logger.info('Proof status poller service stopped');
  }

  /**
   * Poll all pending proof submissions and update their status
   */
  private async pollPendingProofs() {
    try {
      // Get all pending proof submissions
      const result = await pool.query(
        `SELECT id, proof_id, tx_hash, submitted_at 
         FROM proof_submissions 
         WHERE status = 'pending' 
         ORDER BY submitted_at ASC 
         LIMIT 50`
      );

      if (result.rows.length === 0) {
        return; // No pending proofs
      }

      logger.debug(`Polling ${result.rows.length} pending proof submissions...`);

      // Check each pending proof
      for (const proof of result.rows) {
        await this.checkProofStatus(proof.id, proof.proof_id, proof.tx_hash, proof.submitted_at);
      }
    } catch (error: any) {
      logger.error('Error polling pending proofs', { error: error.message });
    }
  }

  /**
   * Check the status of a specific proof submission
   */
  private async checkProofStatus(id: string, proofId: string, txHash: string, submittedAt?: Date) {
    try {
      // Query transaction status from Midnight Network
      const txStatus = await midnightService.getTransactionStatus(txHash);

      if (!txStatus) {
        // Transaction not found yet, still pending
        return;
      }

      if (txStatus.confirmed && txStatus.tx_result && txStatus.tx_result.code === 0) {
        // Transaction confirmed successfully
        await pool.query(
          `UPDATE proof_submissions 
           SET status = 'confirmed', confirmed_at = NOW() 
           WHERE id = $1`,
          [id]
        );
        logger.info(`Proof ${proofId} confirmed`, { txHash });

        // Track confirmation time
        if (submittedAt) {
          const confirmationTime = Date.now() - new Date(submittedAt).getTime();
          await metricsService.trackTransactionConfirmation(txHash, confirmationTime);
        }

        // Track metrics
        await metricsService.trackProofSubmission(proofId, 'confirmed');

        // Trigger automated payment after proof confirmation
        await this.triggerAutomatedPayment(proofId);
      } else if (txStatus.tx_result && txStatus.tx_result.code !== 0) {
        // Transaction failed
        await pool.query(
          `UPDATE proof_submissions 
           SET status = 'failed' 
           WHERE id = $1`,
          [id]
        );
        logger.error(`Proof ${proofId} failed`, { txHash, log: txStatus.tx_result.log });
        
        // Track metrics
        await metricsService.trackProofSubmission(proofId, 'failed');
      }
    } catch (error: any) {
      logger.error(`Error checking proof status for ${proofId}`, { error: error.message });
    }
  }

  /**
   * Trigger automated payment after proof confirmation
   */
  private async triggerAutomatedPayment(proofId: string) {
    try {
      // Get proof details
      const proofResult = await pool.query(
        `SELECT user_id, threshold FROM proof_submissions WHERE proof_id = $1`,
        [proofId]
      );

      if (proofResult.rows.length === 0) {
        logger.error(`Proof ${proofId} not found for payment automation`);
        return;
      }

      const proof = proofResult.rows[0];

      // Process automated payment
      logger.info(`Triggering automated payment for proof ${proofId}`);
      await paymentAutomationService.processAutomatedPayment({
        userId: proof.user_id,
        proofId: proofId,
        threshold: proof.threshold,
      });
    } catch (error: any) {
      logger.error(`Error triggering automated payment for proof ${proofId}`, { error: error.message });
      // Don't throw - we don't want payment failures to affect proof status updates
    }
  }

  /**
   * Manually trigger a poll for a specific proof
   */
  async pollSpecificProof(proofId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT id, proof_id, tx_hash, status 
         FROM proof_submissions 
         WHERE proof_id = $1`,
        [proofId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const proof = result.rows[0];

      if (proof.status !== 'pending') {
        return true; // Already processed
      }

      await this.checkProofStatus(proof.id, proof.proof_id, proof.tx_hash, undefined);
      return true;
    } catch (error: any) {
      logger.error(`Error polling specific proof ${proofId}`, { error: error.message });
      return false;
    }
  }
}

export default new ProofStatusPollerService();
