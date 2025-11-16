import { Request, Response } from 'express';
import { silaService } from '../services/sila.service';
import {
  RegisterUserRequest,
  LinkBankRequest,
  IssueWalletRequest,
  TransferRequest,
  SilaWebhookEvent,
} from '../types/sila.types';

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

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in registerUser:', error);
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

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in linkBankAccount:', error);
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

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in issueWallet:', error);
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

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in transfer:', error);
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

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getBalance:', error);
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

      // Process webhook event
      await silaService.handleWebhookEvent(event);

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Error in handleWebhook:', error);
      res.status(400).json({
        error: {
          code: 'SILA_011',
          message: error instanceof Error ? error.message : 'Webhook processing failed',
          timestamp: Date.now(),
        },
      });
    }
  }
}

export const silaController = new SilaController();
