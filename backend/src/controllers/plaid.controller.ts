import { Request, Response } from 'express';
import plaidService from '../services/plaid.service';
import { auditExternalService } from '../middleware/logging.middleware';
import logger from '../utils/logger';

export class PlaidController {
  /**
   * POST /api/plaid/create-link-token
   * Create a Plaid Link token for user
   */
  async createLinkToken(req: Request, res: Response): Promise<void> {
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

      const linkToken = await plaidService.createLinkToken(userId);

      auditExternalService('plaid', 'create_link_token', userId, true);
      logger.info('Plaid link token created', { userId });

      res.json({
        linkToken,
      });
    } catch (error: any) {
      auditExternalService('plaid', 'create_link_token', req.user?.userId || 'unknown', false, { error: error.message });
      logger.error('Error in createLinkToken', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'PLAID_001',
          message: error.message || 'Failed to create link token',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * POST /api/plaid/exchange
   * Exchange public token for access token
   */
  async exchangeToken(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { publicToken } = req.body;

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

      if (!publicToken) {
        res.status(400).json({
          error: {
            code: 'PLAID_002',
            message: 'Public token is required',
            timestamp: Date.now(),
          },
        });
        return;
      }

      await plaidService.exchangePublicToken(userId, publicToken);

      auditExternalService('plaid', 'exchange_token', userId, true);
      logger.info('Plaid token exchanged successfully', { userId });

      res.json({
        success: true,
        message: 'Bank account linked successfully',
      });
    } catch (error: any) {
      auditExternalService('plaid', 'exchange_token', req.user?.userId || 'unknown', false, { error: error.message });
      logger.error('Error in exchangeToken', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'PLAID_001',
          message: error.message || 'Failed to exchange token',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * GET /api/plaid/connections
   * Get all Plaid connections for authenticated user
   */
  async getConnections(req: Request, res: Response): Promise<void> {
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

      const connections = await plaidService.getConnections(userId);

      logger.info('Plaid connections fetched', { userId, count: connections.length });

      res.json(connections);
    } catch (error: any) {
      logger.error('Error in getConnections', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'PLAID_001',
          message: error.message || 'Failed to fetch connections',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * GET /api/plaid/income
   * Fetch income data for authenticated user
   */
  async getIncome(req: Request, res: Response): Promise<void> {
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

      const incomeData = await plaidService.getIncome(userId);

      auditExternalService('plaid', 'get_income', userId, true);
      logger.info('Plaid income data fetched', { userId });

      res.json(incomeData);
    } catch (error: any) {
      auditExternalService('plaid', 'get_income', req.user?.userId || 'unknown', false, { error: error.message });
      logger.error('Error in getIncome', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'PLAID_001',
          message: error.message || 'Failed to fetch income data',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * GET /api/plaid/assets
   * Fetch assets data for authenticated user
   */
  async getAssets(req: Request, res: Response): Promise<void> {
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

      const assetsData = await plaidService.getAssets(userId);

      auditExternalService('plaid', 'get_assets', userId, true);
      logger.info('Plaid assets data fetched', { userId });

      res.json(assetsData);
    } catch (error: any) {
      auditExternalService('plaid', 'get_assets', req.user?.userId || 'unknown', false, { error: error.message });
      logger.error('Error in getAssets', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'PLAID_001',
          message: error.message || 'Failed to fetch assets data',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * GET /api/plaid/liabilities
   * Fetch liabilities data for authenticated user
   */
  async getLiabilities(req: Request, res: Response): Promise<void> {
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

      const liabilitiesData = await plaidService.getLiabilities(userId);

      auditExternalService('plaid', 'get_liabilities', userId, true);
      logger.info('Plaid liabilities data fetched', { userId });

      res.json(liabilitiesData);
    } catch (error: any) {
      auditExternalService('plaid', 'get_liabilities', req.user?.userId || 'unknown', false, { error: error.message });
      logger.error('Error in getLiabilities', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'PLAID_001',
          message: error.message || 'Failed to fetch liabilities data',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * GET /api/plaid/signal
   * Fetch credit signal data for authenticated user
   */
  async getSignal(req: Request, res: Response): Promise<void> {
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

      const signalData = await plaidService.getSignal(userId);

      auditExternalService('plaid', 'get_signal', userId, true);
      logger.info('Plaid signal data fetched', { userId });

      res.json(signalData);
    } catch (error: any) {
      auditExternalService('plaid', 'get_signal', req.user?.userId || 'unknown', false, { error: error.message });
      logger.error('Error in getSignal', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
            code: 'PLAID_001',
          message: error.message || 'Failed to fetch signal data',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * GET /api/plaid/investments
   * Fetch investments data for authenticated user
   */
  async getInvestments(req: Request, res: Response): Promise<void> {
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

      const investmentsData = await plaidService.getInvestments(userId);

      auditExternalService('plaid', 'get_investments', userId, true);
      logger.info('Plaid investments data fetched', { userId });

      res.json(investmentsData);
    } catch (error: any) {
      auditExternalService('plaid', 'get_investments', req.user?.userId || 'unknown', false, { error: error.message });
      logger.error('Error in getInvestments', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'PLAID_001',
          message: error.message || 'Failed to fetch investments data',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * GET /api/plaid/transactions
   * Fetch transactions data for authenticated user
   */
  async getTransactions(req: Request, res: Response): Promise<void> {
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

      const { startDate, endDate } = req.query;

      const transactionsData = await plaidService.getTransactions(
        userId,
        startDate as string | undefined,
        endDate as string | undefined
      );

      auditExternalService('plaid', 'get_transactions', userId, true);
      logger.info('Plaid transactions data fetched', { userId, startDate, endDate });

      res.json(transactionsData);
    } catch (error: any) {
      auditExternalService('plaid', 'get_transactions', req.user?.userId || 'unknown', false, { error: error.message });
      logger.error('Error in getTransactions', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'PLAID_001',
          message: error.message || 'Failed to fetch transactions data',
          timestamp: Date.now(),
        },
      });
    }
  }
}

export default new PlaidController();
