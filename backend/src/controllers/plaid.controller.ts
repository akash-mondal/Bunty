import { Request, Response } from 'express';
import plaidService from '../services/plaid.service';

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

      res.json({
        linkToken,
      });
    } catch (error: any) {
      console.error('Error in createLinkToken:', error);
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

      res.json({
        success: true,
        message: 'Bank account linked successfully',
      });
    } catch (error: any) {
      console.error('Error in exchangeToken:', error);
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

      res.json(incomeData);
    } catch (error: any) {
      console.error('Error in getIncome:', error);
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

      res.json(assetsData);
    } catch (error: any) {
      console.error('Error in getAssets:', error);
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

      res.json(liabilitiesData);
    } catch (error: any) {
      console.error('Error in getLiabilities:', error);
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

      res.json(signalData);
    } catch (error: any) {
      console.error('Error in getSignal:', error);
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

      res.json(investmentsData);
    } catch (error: any) {
      console.error('Error in getInvestments:', error);
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

      res.json(transactionsData);
    } catch (error: any) {
      console.error('Error in getTransactions:', error);
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
