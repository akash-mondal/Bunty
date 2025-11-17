import axios from 'axios';
import metricsService from './metrics.service';

/**
 * Midnight RPC Client for interacting with Midnight Network
 */
class MidnightService {
  private rpcUrl: string;

  constructor() {
    this.rpcUrl = process.env.MIDNIGHT_NODE_URL || 'http://localhost:26657';
  }

  /**
   * Commit a witness hash to the Midnight blockchain
   */
  async commitHash(witnessHash: string, userId: string): Promise<string | null> {
    const startTime = Date.now();
    try {
      // In a real implementation, this would:
      // 1. Create a transaction with the witness hash
      // 2. Sign it with the system's private key
      // 3. Broadcast to the Midnight network
      // 4. Return the transaction hash
      
      // For now, we'll make a simple RPC call to demonstrate the structure
      const response = await axios.post(
        this.rpcUrl,
        {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'broadcast_tx_commit',
          params: {
            tx: Buffer.from(JSON.stringify({
              type: 'witness_commitment',
              witnessHash,
              userId,
              timestamp: Date.now(),
            })).toString('base64'),
          },
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.result && response.data.result.hash) {
        const duration = Date.now() - startTime;
        await metricsService.trackExternalService('midnight', true, duration);
        return response.data.result.hash;
      }

      console.warn('Midnight RPC response did not contain transaction hash');
      const duration = Date.now() - startTime;
      await metricsService.trackExternalService('midnight', false, duration);
      return null;
    } catch (error: any) {
      // If Midnight node is not available, log but don't fail
      // This allows development without a running Midnight node
      const duration = Date.now() - startTime;
      await metricsService.trackExternalService('midnight', false, duration);
      console.error('Error committing hash to Midnight:', error.message);
      console.warn('Continuing without on-chain commitment (development mode)');
      return null;
    }
  }

  /**
   * Submit a signed transaction with ZK proof to Midnight Network
   * Uses broadcast_tx_async for non-blocking submission
   */
  async submitTransaction(signedTx: string, proof: any): Promise<string> {
    const startTime = Date.now();
    try {
      // Use broadcast_tx_async for immediate return with tx hash
      // This allows us to poll for confirmation separately
      const response = await axios.post(
        this.rpcUrl,
        {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'broadcast_tx_async',
          params: {
            tx: signedTx,
            proof,
          },
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.result && response.data.result.hash) {
        const duration = Date.now() - startTime;
        await metricsService.trackExternalService('midnight', true, duration);
        return response.data.result.hash;
      }

      const duration = Date.now() - startTime;
      await metricsService.trackExternalService('midnight', false, duration);
      throw new Error('Transaction submission failed: no hash returned');
    } catch (error: any) {
      const duration = Date.now() - startTime;
      await metricsService.trackExternalService('midnight', false, duration);
      console.error('Error submitting transaction to Midnight:', error.message);
      
      // Check if it's a network error
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('Midnight Network node is unavailable. Please ensure the node is running.');
      }
      
      throw new Error(`Failed to submit transaction to Midnight Network: ${error.message}`);
    }
  }

  /**
   * Get transaction status from Midnight Network
   * Returns transaction details including confirmation status
   */
  async getTransactionStatus(txHash: string): Promise<{
    hash: string;
    height?: number;
    tx_result?: {
      code: number;
      log?: string;
      data?: string;
    };
    confirmed: boolean;
  } | null> {
    const startTime = Date.now();
    try {
      const response = await axios.post(
        this.rpcUrl,
        {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tx',
          params: {
            hash: txHash,
            prove: false,
          },
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.result) {
        const result = response.data.result;
        const duration = Date.now() - startTime;
        await metricsService.trackExternalService('midnight', true, duration);
        return {
          hash: result.hash,
          height: result.height,
          tx_result: result.tx_result,
          confirmed: result.tx_result && result.tx_result.code === 0,
        };
      }

      const duration = Date.now() - startTime;
      await metricsService.trackExternalService('midnight', true, duration);
      return null;
    } catch (error: any) {
      // If transaction not found, it might still be pending
      if (error.response && error.response.data && error.response.data.error) {
        const errorMsg = error.response.data.error.message || '';
        if (errorMsg.includes('not found')) {
          const duration = Date.now() - startTime;
          await metricsService.trackExternalService('midnight', true, duration);
          return null; // Transaction not yet confirmed
        }
      }
      
      const duration = Date.now() - startTime;
      await metricsService.trackExternalService('midnight', false, duration);
      console.error('Error fetching transaction status:', error.message);
      throw new Error('Failed to fetch transaction status');
    }
  }

  /**
   * Poll transaction status until confirmed or timeout
   * @param txHash Transaction hash to poll
   * @param maxAttempts Maximum number of polling attempts (default: 30)
   * @param intervalMs Interval between polls in milliseconds (default: 2000)
   * @returns Transaction status or null if timeout
   */
  async pollTransactionStatus(
    txHash: string,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<{
    hash: string;
    height?: number;
    tx_result?: {
      code: number;
      log?: string;
      data?: string;
    };
    confirmed: boolean;
  } | null> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const status = await this.getTransactionStatus(txHash);
        
        if (status && status.confirmed) {
          console.log(`Transaction ${txHash} confirmed at height ${status.height}`);
          return status;
        }
        
        if (status && status.tx_result && status.tx_result.code !== 0) {
          // Transaction failed
          console.error(`Transaction ${txHash} failed with code ${status.tx_result.code}: ${status.tx_result.log}`);
          return status;
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (error: any) {
        console.error(`Error polling transaction status (attempt ${attempt + 1}/${maxAttempts}):`, error.message);
        
        // Continue polling unless it's the last attempt
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      }
    }
    
    console.warn(`Transaction ${txHash} polling timeout after ${maxAttempts} attempts`);
    return null;
  }

  /**
   * Query proof registry for a nullifier
   */
  async queryProofRegistry(nullifier: string): Promise<any | null> {
    try {
      const response = await axios.post(
        this.rpcUrl,
        {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'abci_query',
          params: {
            path: '/proof_registry',
            data: Buffer.from(nullifier).toString('hex'),
          },
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.result && response.data.result.response.value) {
        return JSON.parse(
          Buffer.from(response.data.result.response.value, 'base64').toString()
        );
      }

      return null;
    } catch (error: any) {
      console.error('Error querying proof registry:', error.message);
      return null;
    }
  }
}

export default new MidnightService();
