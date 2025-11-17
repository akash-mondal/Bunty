import { Request, Response } from 'express';
import { silaService } from '../services/sila.service';
import paymentAutomationService from '../services/paymentAutomation.service';
import {
  RegisterUserRequest,
  LinkBankRequest,
  IssueWalletRequest,
  TransferRequest,
  SilaWebhookEvent,
} from '../types/sila.types';
import { auditExternalService, auditSensitiveOperation } from '../middleware/logging.middleware';
import logger from '../utils/logger';

export class SilaController {
  /**
   * POST /api/sila/register
   * Register a new user with Sila
   */
  async registerUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_001',
            message: 'User not authenticated',
            timestamp: Date.now(),
          },
        });
        return;
      }

      const userData = req.body as RegisterUserRequest;

      // Validate required fields
      if (
        !userData.firstName ||
        !userData.lastName ||
        !userData.address ||
        !userData.city ||
        !userData.state ||
        !userData.zipCode ||
        !userData.phone ||
        !userData.email ||
        !userData.dateOfBirth ||
        !userData.ssn
      ) {
        res.status(400).json({
          error: {
            code: 'SILA_001',
            message: 'Missing required fields',
            timestamp: Date.now(),
          },
        });
        return;
      }

      const result = await silaService.registerUser(userId, userData);

      auditExternalService('sila', 'register_user', userId, true);
      auditSensitiveOperation('sila_user_registration', userId, true, { email: userData.email });
      logger.info('Sila user registered', { userId, email: userData.email });

      res.status(200).json(result);
    } catch (error) {
      auditExternalService('sila', 'register_user', req.user?.userId || 'unknown', false, { error: error instanceof Error ? error.message : 'Unknown error' });
      logger.error('Error in registerUser', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'SILA_002',
          message: error instanceof Error ? error.message : 'Failed to register user',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * POST /api/sila/link-bank
   * Link a bank account for ACH transfers
   */
  async linkBankAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_001',
            message: 'User not authenticated',
            timestamp: Date.now(),
          },
        });
        return;
      }

      const bankData = req.body as LinkBankRequest;

      // Validate required fields
      if (
        !bankData.accountNumber ||
        !bankData.routingNumber ||
        !bankData.accountName ||
        !bankData.accountType
      ) {
        res.status(400).json({
          error: {
            code: 'SILA_003',
            message: 'Missing required bank account fields',
            timestamp: Date.now(),
          },
        });
        return;
      }

      const result = await silaService.linkBankAccount(userId, bankData);

      auditExternalService('sila', 'link_bank_account', userId, true);
      auditSensitiveOperation('sila_bank_link', userId, true, { accountName: bankData.accountName, accountType: bankData.accountType });
      logger.info('Sila bank account linked', { userId, accountName: bankData.accountName });

      res.status(200).json(result);
    } catch (error) {
      auditExternalService('sila', 'link_bank_account', req.user?.userId || 'unknown', false, { error: error instanceof Error ? error.message : 'Unknown error' });
      logger.error('Error in linkBankAccount', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'SILA_004',
          message: error instanceof Error ? error.message : 'Failed to link bank account',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * POST /api/sila/issue-wallet
   * Issue digital wallet (fund wallet from linked bank account)
   */
  async issueWallet(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_001',
            message: 'User not authenticated',
            timestamp: Date.now(),
          },
        });
        return;
      }

      const { amount } = req.body as IssueWalletRequest;

      const result = await silaService.issueWallet(userId, amount || 0);

      auditExternalService('sila', 'issue_wallet', userId, true, { amount: amount || 0 });
      logger.info('Sila wallet issued', { userId, amount: amount || 0 });

      res.status(200).json(result);
    } catch (error) {
      auditExternalService('sila', 'issue_wallet', req.user?.userId || 'unknown', false, { error: error instanceof Error ? error.message : 'Unknown error' });
      logger.error('Error in issueWallet', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'SILA_005',
          message: error instanceof Error ? error.message : 'Failed to issue wallet',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * POST /api/sila/transfer
   * Initiate instant ACH transfer
   */
  async transfer(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_001',
            message: 'User not authenticated',
            timestamp: Date.now(),
          },
        });
        return;
      }

      const transferData = req.body as TransferRequest;

      // Validate required fields
      if (!transferData.destination || !transferData.amount) {
        res.status(400).json({
          error: {
            code: 'SILA_006',
            message: 'Missing required transfer fields',
            timestamp: Date.now(),
          },
        });
        return;
      }

      if (transferData.amount <= 0) {
        res.status(400).json({
          error: {
            code: 'SILA_007',
            message: 'Transfer amount must be greater than zero',
            timestamp: Date.now(),
          },
        });
        return;
      }

      const result = await silaService.transfer(userId, transferData);

      auditExternalService('sila', 'transfer', userId, true, { amount: transferData.amount, destination: transferData.destination });
      auditSensitiveOperation('sila_transfer', userId, true, { amount: transferData.amount });
      logger.info('Sila transfer initiated', { userId, amount: transferData.amount, destination: transferData.destination });

      res.status(200).json(result);
    } catch (error) {
      auditExternalService('sila', 'transfer', req.user?.userId || 'unknown', false, { error: error instanceof Error ? error.message : 'Unknown error' });
      logger.error('Error in transfer', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'SILA_008',
          message: error instanceof Error ? error.message : 'Failed to initiate transfer',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * GET /api/sila/balance
   * Get wallet balance
   */
  async getBalance(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_001',
            message: 'User not authenticated',
            timestamp: Date.now(),
          },
        });
        return;
      }

      const result = await silaService.getBalance(userId);

      logger.info('Sila balance fetched', { userId });

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in getBalance', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'SILA_009',
          message: error instanceof Error ? error.message : 'Failed to fetch balance',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * POST /api/sila/webhook
   * Handle Sila webhook events
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const event = req.body as SilaWebhookEvent;

      // Validate webhook event
      if (!event.eventType || !event.transactionId) {
        res.status(400).json({
          error: {
            code: 'SILA_010',
            message: 'Invalid webhook event',
            timestamp: Date.now(),
          },
        });
        return;
      }

      logger.info('Sila webhook received', { eventType: event.eventType, transactionId: event.transactionId });

      // Process webhook event
      await silaService.handleWebhookEvent(event);

      auditExternalService('sila', 'webhook_received', 'system', true, { eventType: event.eventType, transactionId: event.transactionId });
      logger.info('Sila webhook processed successfully', { eventType: event.eventType, transactionId: event.transactionId });

      res.status(200).json({ received: true });
    } catch (error) {
      auditExternalService('sila', 'webhook_received', 'system', false, { error: error instanceof Error ? error.message : 'Unknown error' });
      logger.error('Error in handleWebhook', { error });
      res.status(400).json({
        error: {
          code: 'SILA_011',
          message: error instanceof Error ? error.message : 'Webhook processing failed',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * GET /api/sila/payment-history
   * Get payment history for authenticated user
   */
  async getPaymentHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_001',
            message: 'User not authenticated',
            timestamp: Date.now(),
          },
        });
        return;
      }

      const payments = await paymentAutomationService.getPaymentHistory(userId);

      logger.info('Payment history fetched', { userId, count: payments.length });

      res.status(200).json({
        success: true,
        payments,
      });
    } catch (error) {
      logger.error('Error in getPaymentHistory', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'SILA_012',
          message: error instanceof Error ? error.message : 'Failed to fetch payment history',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * GET /api/sila/payment/:proofId
   * Get payment details for a specific proof
   */
  async getPaymentByProof(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { proofId } = req.params;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_001',
            message: 'User not authenticated',
            timestamp: Date.now(),
          },
        });
        return;
      }

      const payment = await paymentAutomationService.getPaymentByProofId(proofId);

      if (!payment) {
        res.status(404).json({
          error: {
            code: 'SILA_013',
            message: 'Payment not found',
            timestamp: Date.now(),
          },
        });
        return;
      }

      // Verify payment belongs to user
      if (payment.user_id !== userId) {
        res.status(403).json({
          error: {
            code: 'SILA_014',
            message: 'Access denied',
            timestamp: Date.now(),
          },
        });
        return;
      }

      logger.info('Payment details fetched', { userId, proofId });

      res.status(200).json({
        success: true,
        payment,
      });
    } catch (error) {
      logger.error('Error in getPaymentByProof', { error, userId: req.user?.userId, proofId: req.params.proofId });
      res.status(500).json({
        error: {
          code: 'SILA_015',
          message: error instanceof Error ? error.message : 'Failed to fetch payment details',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * POST /api/sila/payment/:paymentId/retry
   * Retry a failed payment
   */
  async retryPayment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { paymentId } = req.params;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_001',
            message: 'User not authenticated',
            timestamp: Date.now(),
          },
        });
        return;
      }

      const payment = await paymentAutomationService.retryPayment(paymentId);

      auditSensitiveOperation('payment_retry', userId, true, { paymentId });
      logger.info('Payment retry initiated', { userId, paymentId });

      res.status(200).json({
        success: true,
        payment,
      });
    } catch (error) {
      logger.error('Error in retryPayment', { error, userId: req.user?.userId, paymentId: req.params.paymentId });
      res.status(500).json({
        error: {
          code: 'SILA_016',
          message: error instanceof Error ? error.message : 'Failed to retry payment',
          timestamp: Date.now(),
        },
      });
    }
  }
}

export const silaController = new SilaController();
