import Sila from 'sila-sdk';
import pool from '../config/database';
import {
  RegisterUserRequest,
  RegisterUserResponse,
  LinkBankRequest,
  LinkBankResponse,
  IssueWalletResponse,
  TransferRequest,
  TransferResponse,
  GetBalanceResponse,
  SilaWebhookEvent,
} from '../types/sila.types';

if (!process.env.SILA_APP_HANDLE) {
  throw new Error('SILA_APP_HANDLE is not configured');
}

if (!process.env.SILA_PRIVATE_KEY) {
  throw new Error('SILA_PRIVATE_KEY is not configured');
}

// Initialize Sila SDK in sandbox mode
const sila = new Sila(
  process.env.SILA_APP_HANDLE,
  process.env.SILA_PRIVATE_KEY,
  'sandbox' // Use 'production' for production environment
);

export class SilaService {
  /**
   * Register a new user with Sila
   */
  async registerUser(userId: string, userData: RegisterUserRequest): Promise<RegisterUserResponse> {
    try {
      // Generate a unique user handle
      const userHandle = `user_${userId.replace(/-/g, '').substring(0, 20)}`;

      // Register user with Sila
      const response = await sila.register({
        handle: userHandle,
        first_name: userData.firstName,
        last_name: userData.lastName,
        entity_name: `${userData.firstName} ${userData.lastName}`,
        address_alias: 'home',
        street_address_1: userData.address,
        city: userData.city,
        state: userData.state,
        postal_code: userData.zipCode,
        phone: userData.phone,
        email: userData.email,
        identity_alias: 'SSN',
        identity_value: userData.ssn,
        date_of_birth: userData.dateOfBirth,
        type: 'individual',
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to register user with Sila');
      }

      // Request KYC verification
      const kycResponse = await sila.requestKYC(userHandle, {
        kyc_level: 'INSTANT_ACH',
      });

      if (!kycResponse.success) {
        console.warn('KYC request failed:', kycResponse.message);
      }

      // Generate wallet for user
      const walletResponse = await sila.generateWallet();
      const walletAddress = walletResponse.address;

      // Link wallet to user handle
      await sila.linkAccount(userHandle, {
        account_name: 'default',
        public_token: walletAddress,
      });

      // Store wallet in database
      await pool.query(
        `INSERT INTO sila_wallets (user_id, wallet_address, bank_account_linked)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET wallet_address = $2`,
        [userId, walletAddress, false]
      );

      return {
        success: true,
        message: 'User registered successfully',
        userHandle,
        walletAddress,
      };
    } catch (error) {
      console.error('Error registering user with Sila:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to register user');
    }
  }

  /**
   * Link a bank account for ACH transfers
   */
  async linkBankAccount(userId: string, bankData: LinkBankRequest): Promise<LinkBankResponse> {
    try {
      // Get user's wallet
      const walletResult = await pool.query(
        `SELECT wallet_address FROM sila_wallets WHERE user_id = $1`,
        [userId]
      );

      if (walletResult.rows.length === 0) {
        throw new Error('User wallet not found. Please register first.');
      }

      const userHandle = `user_${userId.replace(/-/g, '').substring(0, 20)}`;

      // Link bank account with Sila
      const response = await sila.linkAccount(userHandle, {
        account_name: bankData.accountName,
        account_number: bankData.accountNumber,
        routing_number: bankData.routingNumber,
        account_type: bankData.accountType,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to link bank account');
      }

      // Update database
      await pool.query(
        `UPDATE sila_wallets SET bank_account_linked = true WHERE user_id = $1`,
        [userId]
      );

      return {
        success: true,
        message: 'Bank account linked successfully',
        accountName: bankData.accountName,
      };
    } catch (error) {
      console.error('Error linking bank account:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to link bank account');
    }
  }

  /**
   * Issue digital wallet (fund wallet from linked bank account)
   */
  async issueWallet(userId: string, amount: number = 0): Promise<IssueWalletResponse> {
    try {
      // Get user's wallet
      const walletResult = await pool.query(
        `SELECT wallet_address, bank_account_linked FROM sila_wallets WHERE user_id = $1`,
        [userId]
      );

      if (walletResult.rows.length === 0) {
        throw new Error('User wallet not found. Please register first.');
      }

      const wallet = walletResult.rows[0];

      if (!wallet.bank_account_linked) {
        throw new Error('Bank account not linked. Please link a bank account first.');
      }

      const userHandle = `user_${userId.replace(/-/g, '').substring(0, 20)}`;

      // If amount is specified, issue (deposit) funds from bank to wallet
      if (amount > 0) {
        const issueResponse = await sila.issueSila(amount, userHandle, {
          account_name: 'default',
          descriptor: 'Wallet funding',
        });

        if (!issueResponse.success) {
          throw new Error(issueResponse.message || 'Failed to issue funds to wallet');
        }
      }

      // Get wallet balance
      const balanceResponse = await sila.getSilaBalance(wallet.wallet_address);
      const balance = balanceResponse.sila_balance || 0;

      return {
        success: true,
        message: amount > 0 ? 'Wallet funded successfully' : 'Wallet retrieved successfully',
        walletAddress: wallet.wallet_address,
        balance,
      };
    } catch (error) {
      console.error('Error issuing wallet:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to issue wallet');
    }
  }

  /**
   * Transfer funds via instant ACH
   */
  async transfer(userId: string, transferData: TransferRequest): Promise<TransferResponse> {
    try {
      // Get user's wallet
      const walletResult = await pool.query(
        `SELECT wallet_address FROM sila_wallets WHERE user_id = $1`,
        [userId]
      );

      if (walletResult.rows.length === 0) {
        throw new Error('User wallet not found. Please register first.');
      }

      const userHandle = `user_${userId.replace(/-/g, '').substring(0, 20)}`;

      // Initiate transfer
      const response = await sila.transferSila(
        transferData.amount,
        userHandle,
        transferData.destination,
        {
          descriptor: transferData.descriptor || 'Payment transfer',
        }
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to initiate transfer');
      }

      return {
        success: true,
        message: 'Transfer initiated successfully',
        transactionId: response.transaction_id || '',
        status: response.status || 'pending',
      };
    } catch (error) {
      console.error('Error initiating transfer:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to initiate transfer');
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId: string): Promise<GetBalanceResponse> {
    try {
      // Get user's wallet
      const walletResult = await pool.query(
        `SELECT wallet_address FROM sila_wallets WHERE user_id = $1`,
        [userId]
      );

      if (walletResult.rows.length === 0) {
        throw new Error('User wallet not found. Please register first.');
      }

      const wallet = walletResult.rows[0];

      // Get balance from Sila
      const response = await sila.getSilaBalance(wallet.wallet_address);

      return {
        success: true,
        balance: response.sila_balance || 0,
        walletAddress: wallet.wallet_address,
      };
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch balance');
    }
  }

  /**
   * Handle webhook event from Sila
   */
  async handleWebhookEvent(event: SilaWebhookEvent): Promise<void> {
    try {
      console.log('Processing Sila webhook event:', event);

      // Handle different event types
      switch (event.eventType) {
        case 'transaction.completed':
          console.log(`Transaction ${event.transactionId} completed with status: ${event.status}`);
          // TODO: Trigger automated payment logic after proof verification
          break;

        case 'transaction.failed':
          console.log(`Transaction ${event.transactionId} failed`);
          break;

        case 'kyc.completed':
          console.log('KYC verification completed');
          break;

        case 'kyc.failed':
          console.log('KYC verification failed');
          break;

        default:
          console.log(`Unhandled event type: ${event.eventType}`);
      }
    } catch (error) {
      console.error('Error handling Sila webhook event:', error);
      throw new Error('Failed to process webhook event');
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<any> {
    try {
      const response = await sila.getTransactions({
        transaction_id: transactionId,
      });

      return response;
    } catch (error) {
      console.error('Error fetching transaction status:', error);
      throw new Error('Failed to fetch transaction status');
    }
  }
}

export const silaService = new SilaService();
