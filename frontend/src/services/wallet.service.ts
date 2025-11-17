import { WalletConnection, TransactionData, LaceAPI } from '@/types/wallet.types';

class WalletService {
  private laceAPI: LaceAPI | null = null;
  private currentAddress: string | null = null;

  /**
   * Check if Lace Wallet is installed in the browser
   */
  isLaceInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window.cardano && window.cardano.lace);
  }

  /**
   * Connect to Lace Wallet
   */
  async connect(): Promise<WalletConnection> {
    if (!this.isLaceInstalled()) {
      throw new Error('Lace Wallet is not installed. Please install it from https://www.lace.io/');
    }

    try {
      // Enable the wallet (prompts user for permission)
      this.laceAPI = await window.cardano!.lace!.enable();

      // Get network ID (0 = testnet, 1 = mainnet)
      const networkId = await this.laceAPI.getNetworkId();
      const network = networkId === 0 ? 'testnet' : 'mainnet';

      // Get the first used address or change address
      const usedAddresses = await this.laceAPI.getUsedAddresses();
      const address = usedAddresses.length > 0 
        ? usedAddresses[0] 
        : await this.laceAPI.getChangeAddress();

      this.currentAddress = address;

      // Get balance
      const balanceHex = await this.laceAPI.getBalance();
      const balance = this.parseBalance(balanceHex);

      return {
        address,
        network,
        connected: true,
        balance,
      };
    } catch (error: any) {
      console.error('Failed to connect to Lace Wallet:', error);
      throw new Error(error.message || 'Failed to connect to wallet');
    }
  }

  /**
   * Disconnect from wallet
   */
  disconnect(): void {
    this.laceAPI = null;
    this.currentAddress = null;
  }

  /**
   * Get current wallet address
   */
  getAddress(): string | null {
    return this.currentAddress;
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<number> {
    if (!this.laceAPI) {
      throw new Error('Wallet not connected');
    }

    try {
      const balanceHex = await this.laceAPI.getBalance();
      return this.parseBalance(balanceHex);
    } catch (error: any) {
      console.error('Failed to get balance:', error);
      throw new Error('Failed to get wallet balance');
    }
  }

  /**
   * Sign a transaction
   */
  async signTransaction(txData: TransactionData): Promise<string> {
    if (!this.laceAPI) {
      throw new Error('Wallet not connected');
    }

    try {
      // In a real implementation, you would construct a proper Cardano transaction
      // For now, we'll use a simplified approach
      const tx = this.constructTransaction(txData);
      const signedTx = await this.laceAPI.signTx(tx, false);
      return signedTx;
    } catch (error: any) {
      console.error('Failed to sign transaction:', error);
      throw new Error(error.message || 'Failed to sign transaction');
    }
  }

  /**
   * Submit a signed transaction to the blockchain
   */
  async submitTransaction(signedTx: string): Promise<string> {
    if (!this.laceAPI) {
      throw new Error('Wallet not connected');
    }

    try {
      const txHash = await this.laceAPI.submitTx(signedTx);
      return txHash;
    } catch (error: any) {
      console.error('Failed to submit transaction:', error);
      throw new Error(error.message || 'Failed to submit transaction');
    }
  }

  /**
   * Sign arbitrary data (for proof submission)
   */
  async signData(payload: string): Promise<{ signature: string; key: string }> {
    if (!this.laceAPI || !this.currentAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      const signedData = await this.laceAPI.signData(this.currentAddress, payload);
      return signedData;
    } catch (error: any) {
      console.error('Failed to sign data:', error);
      throw new Error(error.message || 'Failed to sign data');
    }
  }

  /**
   * Check if wallet is currently connected
   */
  async isConnected(): Promise<boolean> {
    if (!this.isLaceInstalled()) return false;
    
    try {
      const isEnabled = await window.cardano!.lace!.isEnabled();
      return isEnabled;
    } catch {
      return false;
    }
  }

  /**
   * Parse balance from hex string to lovelace (ADA * 10^6)
   */
  private parseBalance(balanceHex: string): number {
    try {
      // Balance is returned as CBOR hex string
      // For simplicity, we'll parse it as a basic hex number
      // In production, you'd use a proper CBOR decoder
      const balance = parseInt(balanceHex, 16);
      return balance / 1_000_000; // Convert lovelace to ADA
    } catch {
      return 0;
    }
  }

  /**
   * Construct a transaction (simplified for proof submission)
   */
  private constructTransaction(txData: TransactionData): string {
    // In a real implementation, you would use @emurgo/cardano-serialization-lib
    // to properly construct a Cardano transaction
    // For now, return a placeholder that includes the transaction data
    const txObject = {
      to: txData.to,
      value: txData.value,
      data: txData.data || '',
      from: this.currentAddress,
    };
    
    // Convert to hex string (in production, this would be proper CBOR encoding)
    return Buffer.from(JSON.stringify(txObject)).toString('hex');
  }
}

export const walletService = new WalletService();
