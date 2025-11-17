import pool from '../config/database';
import { silaService } from './sila.service';
import { AutomatedPaymentRequest, PaymentRecord } from '../types/sila.types';

/**
 * Service for automated payment processing after proof verification
 */
class PaymentAutomationService {
  /**
   * Calculate payment amount based on proof threshold
   * Formula: Base amount + (threshold * multiplier)
   * This is a simplified calculation - adjust based on business logic
   */
  private calculatePaymentAmount(threshold: number): number {
    const baseAmount = 100; // Base payment of $100
    const multiplier = 0.01; // $0.01 per threshold unit
    
    // Calculate total amount
    const amount = baseAmount + (threshold * multiplier);
    
    // Cap at maximum payment amount
    const maxAmount = 10000;
    return Math.min(amount, maxAmount);
  }

  /**
   * Process automated payment after proof confirmation
   */
  async processAutomatedPayment(request: AutomatedPaymentRequest): Promise<PaymentRecord> {
    const { userId, proofId, threshold } = request;

    try {
      console.log(`Processing automated payment for proof ${proofId}, user ${userId}`);

      // Calculate payment amount
      const amount = this.calculatePaymentAmount(threshold);

      // Check if payment already exists for this proof
      const existingPayment = await pool.query(
        'SELECT id FROM payment_history WHERE proof_id = $1',
        [proofId]
      );

      if (existingPayment.rows.length > 0) {
        console.log(`Payment already exists for proof ${proofId}`);
        return existingPayment.rows[0];
      }

      // Create payment record
      const paymentResult = await pool.query(
        `INSERT INTO payment_history (user_id, proof_id, amount, status)
         VALUES ($1, $2, $3, $4)
         RETURNING id, user_id, proof_id, amount, transaction_id, status, triggered_at, completed_at, error_message`,
        [userId, proofId, amount, 'pending']
      );

      const paymentRecord = paymentResult.rows[0];

      // Check if user has Sila wallet configured
      const walletResult = await pool.query(
        'SELECT wallet_address, bank_account_linked FROM sila_wallets WHERE user_id = $1',
        [userId]
      );

      if (walletResult.rows.length === 0) {
        // No wallet configured - mark payment as failed
        await pool.query(
          `UPDATE payment_history 
           SET status = 'failed', error_message = $1 
           WHERE id = $2`,
          ['User has not configured Sila wallet', paymentRecord.id]
        );

        console.warn(`User ${userId} has no Sila wallet configured`);
        return paymentRecord;
      }

      const wallet = walletResult.rows[0];

      if (!wallet.bank_account_linked) {
        // No bank account linked - mark payment as failed
        await pool.query(
          `UPDATE payment_history 
           SET status = 'failed', error_message = $1 
           WHERE id = $2`,
          ['User has not linked a bank account', paymentRecord.id]
        );

        console.warn(`User ${userId} has no bank account linked`);
        return paymentRecord;
      }

      // Initiate transfer via Sila
      try {
        // In a real implementation, you would transfer from a company wallet to user wallet
        // For now, we'll simulate the transfer by issuing funds to the user's wallet
        const transferResponse = await silaService.issueWallet(userId, amount);

        if (transferResponse.success) {
          // Update payment record with success
          await pool.query(
            `UPDATE payment_history 
             SET status = 'completed', completed_at = NOW(), transaction_id = $1 
             WHERE id = $2`,
            [transferResponse.walletAddress, paymentRecord.id]
          );

          console.log(`Payment completed for proof ${proofId}: $${amount}`);
        } else {
          throw new Error('Transfer failed');
        }
      } catch (transferError: any) {
        // Update payment record with failure
        await pool.query(
          `UPDATE payment_history 
           SET status = 'failed', error_message = $1 
           WHERE id = $2`,
          [transferError.message, paymentRecord.id]
        );

        console.error(`Payment failed for proof ${proofId}:`, transferError.message);
      }

      // Fetch updated payment record
      const updatedResult = await pool.query(
        `SELECT id, user_id, proof_id, amount, transaction_id, status, triggered_at, completed_at, error_message
         FROM payment_history WHERE id = $1`,
        [paymentRecord.id]
      );

      return updatedResult.rows[0];
    } catch (error: any) {
      console.error('Error processing automated payment:', error);
      throw new Error(`Failed to process automated payment: ${error.message}`);
    }
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(userId: string): Promise<PaymentRecord[]> {
    try {
      const result = await pool.query(
        `SELECT 
          ph.id, 
          ph.user_id, 
          ph.proof_id, 
          ph.amount, 
          ph.transaction_id, 
          ph.status, 
          ph.triggered_at, 
          ph.completed_at, 
          ph.error_message,
          ps.threshold,
          ps.nullifier
         FROM payment_history ph
         LEFT JOIN proof_submissions ps ON ph.proof_id = ps.proof_id
         WHERE ph.user_id = $1
         ORDER BY ph.triggered_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error: any) {
      console.error('Error fetching payment history:', error);
      throw new Error('Failed to fetch payment history');
    }
  }

  /**
   * Get payment details by proof ID
   */
  async getPaymentByProofId(proofId: string): Promise<PaymentRecord | null> {
    try {
      const result = await pool.query(
        `SELECT id, user_id, proof_id, amount, transaction_id, status, triggered_at, completed_at, error_message
         FROM payment_history WHERE proof_id = $1`,
        [proofId]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error: any) {
      console.error('Error fetching payment by proof ID:', error);
      throw new Error('Failed to fetch payment details');
    }
  }

  /**
   * Retry failed payment
   */
  async retryPayment(paymentId: string): Promise<PaymentRecord> {
    try {
      // Get payment record
      const paymentResult = await pool.query(
        `SELECT ph.id, ph.user_id, ph.proof_id, ph.amount, ph.status, ps.threshold
         FROM payment_history ph
         LEFT JOIN proof_submissions ps ON ph.proof_id = ps.proof_id
         WHERE ph.id = $1`,
        [paymentId]
      );

      if (paymentResult.rows.length === 0) {
        throw new Error('Payment not found');
      }

      const payment = paymentResult.rows[0];

      if (payment.status !== 'failed') {
        throw new Error('Can only retry failed payments');
      }

      // Reset payment status
      await pool.query(
        `UPDATE payment_history 
         SET status = 'pending', error_message = NULL, triggered_at = NOW() 
         WHERE id = $1`,
        [paymentId]
      );

      // Process payment again
      return await this.processAutomatedPayment({
        userId: payment.user_id,
        proofId: payment.proof_id,
        threshold: payment.threshold,
      });
    } catch (error: any) {
      console.error('Error retrying payment:', error);
      throw new Error(`Failed to retry payment: ${error.message}`);
    }
  }
}

export default new PaymentAutomationService();
