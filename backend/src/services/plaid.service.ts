import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import pool from '../config/database';
import { encrypt, decrypt } from '../utils/encryption';
import crypto from 'crypto';
import metricsService from './metrics.service';
import type {
  IncomeData,
  AssetsData,
  LiabilitiesData,
  SignalData,
  InvestmentsData,
  TransactionsData,
  PlaidConnection,
  PlaidConnectionResponse
} from '../types/plaid.types';

class PlaidService {
  private client: PlaidApi;

  constructor() {
    const configuration = new Configuration({
      basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
      },
    });

    this.client = new PlaidApi(configuration);
  }

  /**
   * Create a link token for Plaid Link initialization
   */
  async createLinkToken(userId: string): Promise<string> {
    const startTime = Date.now();
    try {
      const response = await this.client.linkTokenCreate({
        user: {
          client_user_id: userId,
        },
        client_name: 'Bunty',
        products: [
          Products.Auth,
          Products.Transactions,
          Products.Income,
          Products.Assets,
          Products.Liabilities,
          Products.Investments,
          Products.Signal,
        ],
        country_codes: [CountryCode.Us],
        language: 'en',
      });

      const duration = Date.now() - startTime;
      await metricsService.trackExternalService('plaid', true, duration);

      return response.data.link_token;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      await metricsService.trackExternalService('plaid', false, duration);
      console.error('Error creating link token:', error.response?.data || error.message);
      throw new Error('Failed to create Plaid link token');
    }
  }

  /**
   * Exchange public token for access token and store encrypted
   */
  async exchangePublicToken(userId: string, publicToken: string): Promise<void> {
    try {
      const response = await this.client.itemPublicTokenExchange({
        public_token: publicToken,
      });

      const accessToken = response.data.access_token;
      const itemId = response.data.item_id;

      // Get institution name
      const itemResponse = await this.client.itemGet({
        access_token: accessToken,
      });

      const institutionId = itemResponse.data.item.institution_id;
      let institutionName = null;

      if (institutionId) {
        const institutionResponse = await this.client.institutionsGetById({
          institution_id: institutionId,
          country_codes: [CountryCode.Us],
        });
        institutionName = institutionResponse.data.institution.name;
      }

      // Encrypt access token
      const encryptedToken = encrypt(accessToken);

      // Store in database
      await pool.query(
        `INSERT INTO plaid_connections (user_id, access_token_encrypted, item_id, institution_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE
         SET access_token_encrypted = $2, item_id = $3, institution_name = $4, created_at = NOW()`,
        [userId, encryptedToken, itemId, institutionName]
      );
    } catch (error: any) {
      console.error('Error exchanging public token:', error.response?.data || error.message);
      throw new Error('Failed to exchange Plaid public token');
    }
  }

  /**
   * Get all Plaid connections for a user with account details
   */
  async getConnections(userId: string): Promise<PlaidConnectionResponse[]> {
    try {
      const result = await pool.query(
        `SELECT id, user_id, item_id, institution_name, created_at, access_token_encrypted
         FROM plaid_connections 
         WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return [];
      }

      // Fetch account details for each connection
      const connections = await Promise.all(
        result.rows.map(async (row) => {
          try {
            const accessToken = decrypt(row.access_token_encrypted);
            
            // Get accounts for this connection
            const accountsResponse = await this.client.accountsGet({
              access_token: accessToken,
            });

            const accounts = accountsResponse.data.accounts.map((account) => ({
              id: account.account_id,
              name: account.name,
              mask: account.mask || '',
              type: account.type,
              subtype: account.subtype || '',
              institutionName: row.institution_name,
            }));

            return {
              id: row.id,
              userId: row.user_id,
              itemId: row.item_id,
              institutionName: row.institution_name || 'Unknown Institution',
              accounts,
              createdAt: row.created_at,
              status: 'connected' as const,
            };
          } catch (error) {
            console.error('Error fetching accounts for connection:', error);
            // Return connection with error status if account fetch fails
            return {
              id: row.id,
              userId: row.user_id,
              itemId: row.item_id,
              institutionName: row.institution_name || 'Unknown Institution',
              accounts: [],
              createdAt: row.created_at,
              status: 'error' as const,
            };
          }
        })
      );

      return connections;
    } catch (error: any) {
      console.error('Error fetching connections:', error);
      throw new Error('Failed to fetch Plaid connections');
    }
  }

  /**
   * Get decrypted access token for a user
   */
  private async getAccessToken(userId: string): Promise<string> {
    const result = await pool.query<PlaidConnection>(
      'SELECT access_token_encrypted FROM plaid_connections WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('No Plaid connection found for user');
    }

    return decrypt(result.rows[0].access_token_encrypted);
  }

  /**
   * Fetch income data from Plaid
   */
  async getIncome(userId: string): Promise<IncomeData> {
    try {
      const accessToken = await this.getAccessToken(userId);

      const response = await this.client.incomeVerificationPaystubsGet({
        access_token: accessToken,
      });

      const paystubs = response.data.paystubs;
      
      // Calculate monthly income and employment duration
      let monthlyIncome = 0;
      let employmentMonths = 0;
      let employerName = '';

      if (paystubs && paystubs.length > 0) {
        const recentPaystub = paystubs[0];
        
        // Estimate monthly income from paystub
        if (recentPaystub.earnings?.total?.current_amount) {
          monthlyIncome = recentPaystub.earnings.total.current_amount;
        }
        
        employerName = recentPaystub.employer?.name || 'Unknown';

        // Calculate employment months from pay period start
        if (recentPaystub.pay_period_details?.start_date) {
          const startDate = new Date(recentPaystub.pay_period_details.start_date);
          const now = new Date();
          employmentMonths = Math.floor(
            (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
          );
        }
      }

      // Generate employer hash
      const employerHash = crypto
        .createHash('sha256')
        .update(employerName)
        .digest('hex');

      return {
        monthlyIncome,
        employmentMonths,
        employerName,
        employerHash,
      };
    } catch (error: any) {
      console.error('Error fetching income:', error.response?.data || error.message);
      throw new Error('Failed to fetch income data from Plaid');
    }
  }

  /**
   * Fetch assets data from Plaid
   */
  async getAssets(userId: string): Promise<AssetsData> {
    try {
      const accessToken = await this.getAccessToken(userId);

      const response = await this.client.accountsBalanceGet({
        access_token: accessToken,
      });

      const accounts = response.data.accounts || [];
      let totalAssets = 0;

      const accountsData = accounts.map((account: any) => {
        const balance = account.balances.current || 0;
        totalAssets += balance;

        return {
          accountId: account.account_id,
          balance,
          type: account.type,
        };
      });

      return {
        totalAssets,
        accounts: accountsData,
      };
    } catch (error: any) {
      console.error('Error fetching assets:', error.response?.data || error.message);
      throw new Error('Failed to fetch assets data from Plaid');
    }
  }

  /**
   * Fetch liabilities data from Plaid
   */
  async getLiabilities(userId: string): Promise<LiabilitiesData> {
    try {
      const accessToken = await this.getAccessToken(userId);

      const response = await this.client.liabilitiesGet({
        access_token: accessToken,
      });

      const liabilities = response.data.liabilities;
      let totalLiabilities = 0;
      const accountsData: Array<{ accountId: string; balance: number; type: string }> = [];

      // Credit cards
      if (liabilities.credit) {
        liabilities.credit.forEach((card: any) => {
          const balance = card.balances?.current || 0;
          totalLiabilities += balance;
          accountsData.push({
            accountId: card.account_id || 'unknown',
            balance,
            type: 'credit',
          });
        });
      }

      // Student loans
      if (liabilities.student) {
        liabilities.student.forEach((loan: any) => {
          const balance = loan.balances?.current || 0;
          totalLiabilities += balance;
          accountsData.push({
            accountId: loan.account_id || 'unknown',
            balance,
            type: 'student',
          });
        });
      }

      // Mortgages
      if (liabilities.mortgage) {
        liabilities.mortgage.forEach((mortgage: any) => {
          const balance = mortgage.balances?.current || 0;
          totalLiabilities += balance;
          accountsData.push({
            accountId: mortgage.account_id || 'unknown',
            balance,
            type: 'mortgage',
          });
        });
      }

      return {
        totalLiabilities,
        accounts: accountsData,
      };
    } catch (error: any) {
      console.error('Error fetching liabilities:', error.response?.data || error.message);
      throw new Error('Failed to fetch liabilities data from Plaid');
    }
  }

  /**
   * Fetch signal data (credit score) from Plaid
   */
  async getSignal(userId: string): Promise<SignalData> {
    try {
      const accessToken = await this.getAccessToken(userId);

      // Get accounts first to get an account_id
      const accountsResponse = await this.client.accountsGet({
        access_token: accessToken,
      });

      const accounts = accountsResponse.data.accounts;
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found for signal evaluation');
      }

      const response = await this.client.signalEvaluate({
        access_token: accessToken,
        account_id: accounts[0].account_id,
        client_transaction_id: `txn_${Date.now()}`,
        amount: 100.0, // Sample amount for evaluation
      });

      const scores = response.data.scores;

      return {
        creditScore: (scores as any).customer_insight_score || 0,
        riskScore: (scores as any).risk_score || 0,
      };
    } catch (error: any) {
      console.error('Error fetching signal:', error.response?.data || error.message);
      throw new Error('Failed to fetch signal data from Plaid');
    }
  }

  /**
   * Fetch investments data from Plaid
   */
  async getInvestments(userId: string): Promise<InvestmentsData> {
    try {
      const accessToken = await this.getAccessToken(userId);

      const response = await this.client.investmentsHoldingsGet({
        access_token: accessToken,
      });

      const holdings = response.data.holdings || [];
      let totalValue = 0;

      const holdingsData = holdings.map((holding) => {
        const value = holding.institution_value || 0;
        totalValue += value;

        return {
          securityId: holding.security_id,
          quantity: holding.quantity,
          value,
        };
      });

      return {
        totalValue,
        holdings: holdingsData,
      };
    } catch (error: any) {
      console.error('Error fetching investments:', error.response?.data || error.message);
      throw new Error('Failed to fetch investments data from Plaid');
    }
  }

  /**
   * Fetch transactions data from Plaid
   */
  async getTransactions(userId: string, startDate?: string, endDate?: string): Promise<TransactionsData> {
    try {
      const accessToken = await this.getAccessToken(userId);

      // Default to last 30 days
      const end = endDate || new Date().toISOString().split('T')[0];
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await this.client.transactionsGet({
        access_token: accessToken,
        start_date: start,
        end_date: end,
      });

      const transactions = response.data.transactions || [];

      const transactionsData = transactions.map((txn) => ({
        transactionId: txn.transaction_id,
        amount: txn.amount,
        date: txn.date,
        merchantName: txn.merchant_name || txn.name || 'Unknown',
        category: txn.category || [],
      }));

      return {
        transactions: transactionsData,
        totalCount: response.data.total_transactions,
      };
    } catch (error: any) {
      console.error('Error fetching transactions:', error.response?.data || error.message);
      throw new Error('Failed to fetch transactions data from Plaid');
    }
  }
}

export default new PlaidService();
