import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  ProofGenerationRequest,
  ProofGenerationResponse,
  ZKProof,
  ProofServerError,
  CircuitType,
  ProofPublicInputs,
} from '@/types/proof.types';
import { Witness } from '@/types/witness.types';

/**
 * Proof Service for client-side proof generation
 * Communicates directly with the local proof server from the browser
 */
class ProofService {
  private client: AxiosInstance;
  private proofServerUrl: string;
  private timeout: number;

  constructor() {
    // Proof server runs locally on port 6300
    this.proofServerUrl = process.env.NEXT_PUBLIC_PROOF_SERVER_URL || 'http://localhost:6300';
    this.timeout = parseInt(process.env.NEXT_PUBLIC_PROOF_SERVER_TIMEOUT || '30000', 10);

    this.client = axios.create({
      baseURL: this.proofServerUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generate a zero-knowledge proof using the local proof server
   * This runs client-side, witness data never leaves the user's device
   */
  async generateProof(
    circuit: CircuitType,
    witness: Witness,
    threshold: number,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ZKProof> {
    try {
      if (onProgress) {
        onProgress(10, 'Preparing witness data...');
      }

      const publicInputs: ProofPublicInputs = {
        threshold,
      };

      const request: ProofGenerationRequest = {
        circuit,
        witness,
        publicInputs,
      };

      if (onProgress) {
        onProgress(30, 'Connecting to proof server...');
      }

      // Send request to local proof server
      const response = await this.client.post<ProofGenerationResponse>(
        '/prove',
        request
      );

      if (onProgress) {
        onProgress(90, 'Validating proof...');
      }

      // Validate response structure
      if (!this.isValidProofResponse(response.data)) {
        throw new Error('Invalid proof response structure from proof server');
      }

      // Convert to ZKProof format
      const zkProof: ZKProof = {
        proof: response.data.proof,
        publicInputs: [threshold.toString()],
        publicOutputs: response.data.publicOutputs,
      };

      if (onProgress) {
        onProgress(100, 'Proof generated successfully!');
      }

      return zkProof;
    } catch (error) {
      throw this.handleProofServerError(error);
    }
  }

  /**
   * Validate the proof response structure
   */
  private isValidProofResponse(response: any): response is ProofGenerationResponse {
    return (
      response &&
      typeof response.proof === 'string' &&
      response.publicOutputs &&
      typeof response.publicOutputs.nullifier === 'string' &&
      typeof response.publicOutputs.timestamp === 'number' &&
      typeof response.publicOutputs.expiresAt === 'number'
    );
  }

  /**
   * Handle proof server errors and convert to meaningful error messages
   */
  private handleProofServerError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ProofServerError>;

      // Timeout error
      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        return new Error(
          `Proof generation timed out after ${this.timeout / 1000} seconds. The proof server may be overloaded.`
        );
      }

      // Connection refused - proof server not running
      if (axiosError.code === 'ECONNREFUSED' || axiosError.message.includes('ERR_CONNECTION_REFUSED')) {
        return new Error(
          'Cannot connect to proof server. Please ensure the proof server is running on port 6300.'
        );
      }

      // Network error
      if (axiosError.code === 'ENETUNREACH' || axiosError.code === 'ENOTFOUND') {
        return new Error(
          `Network error connecting to proof server at ${this.proofServerUrl}`
        );
      }

      // Server returned an error response
      if (axiosError.response) {
        const status = axiosError.response.status;
        const errorData = axiosError.response.data as ProofServerError;

        if (errorData && errorData.error) {
          return new Error(
            `Proof server error: ${errorData.error.message}`
          );
        }

        return new Error(`Proof server returned error status: ${status}`);
      }

      // Request was made but no response received
      if (axiosError.request) {
        return new Error(
          'No response from proof server. The server may be unreachable.'
        );
      }
    }

    // Unknown error
    if (error instanceof Error) {
      return new Error(`Proof generation failed: ${error.message}`);
    }

    return new Error('Unknown error occurred during proof generation');
  }

  /**
   * Health check for proof server
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.error('Proof server health check failed:', error);
      return false;
    }
  }

  /**
   * Get proof server info (circuits available, version, etc.)
   */
  async getServerInfo(): Promise<any> {
    try {
      const response = await this.client.get('/info', {
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get proof server info:', error);
      return null;
    }
  }

  /**
   * Format expiry date for display
   */
  formatExpiryDate(expiresAt: number): string {
    const date = new Date(expiresAt * 1000); // Convert from Unix timestamp
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Calculate days until expiry
   */
  getDaysUntilExpiry(expiresAt: number): number {
    const now = Date.now();
    const expiryDate = expiresAt * 1000; // Convert from Unix timestamp
    const diffMs = expiryDate - now;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if proof is expired
   */
  isProofExpired(expiresAt: number): boolean {
    const now = Date.now();
    const expiryDate = expiresAt * 1000; // Convert from Unix timestamp
    return now >= expiryDate;
  }

  /**
   * Submit proof to backend with wallet signature
   * This is called after proof generation to register the proof on-chain
   */
  async submitProof(
    proof: ZKProof,
    walletSignature: string,
    walletAddress: string
  ): Promise<{ txHash: string; proofId: string; status: string }> {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const response = await axios.post(
        `${backendUrl}/api/proof/submit`,
        {
          proof: proof.proof,
          publicInputs: proof.publicInputs,
          publicOutputs: proof.publicOutputs,
          walletSignature,
          walletAddress,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.getAccessToken()}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorMessage = error.response.data?.error?.message || 'Failed to submit proof';
        throw new Error(errorMessage);
      }
      throw new Error('Failed to submit proof to blockchain');
    }
  }

  /**
   * Get proof submission status
   */
  async getProofStatus(proofId: string): Promise<any> {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const response = await axios.get(
        `${backendUrl}/api/proof/status/${proofId}`,
        {
          headers: {
            Authorization: `Bearer ${this.getAccessToken()}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorMessage = error.response.data?.error?.message || 'Failed to get proof status';
        throw new Error(errorMessage);
      }
      throw new Error('Failed to get proof status');
    }
  }

  /**
   * Get access token from localStorage
   */
  private getAccessToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('accessToken') || '';
  }
}

export const proofService = new ProofService();
