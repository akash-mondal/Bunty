import { Router } from 'express';
import plaidController from '../controllers/plaid.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All Plaid routes require authentication
router.use(authenticateToken);

// Create link token for Plaid Link
router.post('/create-link-token', plaidController.createLinkToken.bind(plaidController));

// Exchange public token for access token
router.post('/exchange', plaidController.exchangeToken.bind(plaidController));

// Get financial data
router.get('/income', plaidController.getIncome.bind(plaidController));
router.get('/assets', plaidController.getAssets.bind(plaidController));
router.get('/liabilities', plaidController.getLiabilities.bind(plaidController));
router.get('/signal', plaidController.getSignal.bind(plaidController));
router.get('/investments', plaidController.getInvestments.bind(plaidController));
router.get('/transactions', plaidController.getTransactions.bind(plaidController));

export default router;
