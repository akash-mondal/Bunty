import { Router } from 'express';
import { silaController } from '../controllers/sila.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/sila/register
 * Register a new user with Sila
 * Requires authentication
 */
router.post(
  '/register',
  authenticateToken,
  (req, res) => silaController.registerUser(req, res)
);

/**
 * POST /api/sila/link-bank
 * Link a bank account for ACH transfers
 * Requires authentication
 */
router.post(
  '/link-bank',
  authenticateToken,
  (req, res) => silaController.linkBankAccount(req, res)
);

/**
 * POST /api/sila/issue-wallet
 * Issue digital wallet (fund wallet from linked bank account)
 * Requires authentication
 */
router.post(
  '/issue-wallet',
  authenticateToken,
  (req, res) => silaController.issueWallet(req, res)
);

/**
 * POST /api/sila/transfer
 * Initiate instant ACH transfer
 * Requires authentication
 */
router.post(
  '/transfer',
  authenticateToken,
  (req, res) => silaController.transfer(req, res)
);

/**
 * GET /api/sila/balance
 * Get wallet balance
 * Requires authentication
 */
router.get(
  '/balance',
  authenticateToken,
  (req, res) => silaController.getBalance(req, res)
);

/**
 * POST /api/sila/webhook
 * Handle Sila webhook events
 * No authentication required (webhook from Sila)
 */
router.post(
  '/webhook',
  (req, res) => silaController.handleWebhook(req, res)
);

export default router;
