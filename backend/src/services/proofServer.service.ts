import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  ProofGenerationRequest,
  ProofGenerationResponse,
  ZKProof,
  ProofServerError,
  CircuitType,
  ProofPublicInputs,
} from '../types/proof.types';
import { Witness } from '../types/witness.types';

/**
 * Proof Server Client for generating zero-knowledge proofs
 * Communicates with the local Midnight proof server running on port 6300
 */
class ProofServerService {
  private client: AxiosInstance;
  private proofServerUrl: string;
  private timeout: number;
  private maxRetries: number;

  constructor() {
    this.proofServerUrl = process.env.PROOF_SERVER_URL || 'http://localhost:6300';
    this.timeout = parseInt(process.env.PROOF_SERVER_TIMEOUT || '30000', 10); // 30 seconds default
    this.maxRetries = parseInt(process.env.PROOF_SERVER_MAX_RETRIES || '3', 10);

    this.client = axios.create({
      baseURL: this.proofServerUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generate a zero-knowledge proof using the proof server
   * @param circuit - The circuit type to use for proof generation
   * @param witness - The private witness data
   * @param publicInputs - The public inputs (e.g., threshold)
   * @returns ZKProof object containing the proof and public outputs
   * @throws Error if proof generation fails
   */
  async generateProof(
    circuit: CircuitType,
    witness: Witness,
    publicInputs: ProofPublicInputs
  ): Promise<ZKProof> {
    const request: ProofGenerationRequest = {
      circuit,
      witness,
      publicInputs,
    };

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < this.maxRetries) {
      attempt++;

      try {
        console.log(
          `Proof generation attempt ${attempt}/${this.maxRetries} for circuit: ${circuit}`
        );

        const response = await this.client.post<ProofGenerationResponse>(
          '/prove',
          request
        );

        // Validate response structure
        if (!this.isValidProofResponse(response.data)) {
          throw new Error('Invalid proof response structure from proof server');
        }

        // Convert to ZKProof format
        const zkProof: ZKProof = {
          proof: response.data.proof,
          publicInputs: [publicInputs.threshold.toString()],
          publicOutputs: response.data.publicOutputs,
        };

        console.log(
          `Proof generated successfully. Nullifier: ${zkProof.publicOutputs.nullifier}`
        );

        return zkProof;
      } catch (error) {
        lastError = this.handleProofServerError(error, attempt);

        // If this is not the last attempt and error is retryable, wait before retry
        if (attempt < this.maxRetries && this.isRetryableError(error)) {
          const backoffDelay = this.calculateBackoffDelay(attempt);
          console.log(`Retrying in ${backoffDelay}ms...`);
          await this.sleep(backoffDelay);
        } else {
          // Non-retryable error or last attempt, throw immediately
          throw lastError;
        }
      }
    }

    // All retries exhausted
    throw lastError || new Error('Proof generation failed after all retries');
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
  private handleProofServerError(error: unknown, attempt: number): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ProofServerError>;

      // Timeout error
      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        return new Error(
          `Proof server timeout after ${this.timeout}ms (attempt ${attempt}/${this.maxRetries})`
        );
      }

      // Connection refused - proof server not running
      if (axiosError.code === 'ECONNREFUSED') {
        return new Error(
          'Proof server is not available. Please ensure the proof server Docker container is running on port 6300.'
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
            `Proof server error (${status}): ${errorData.error.message} [${errorData.error.code}]`
          );
        }

        return new Error(`Proof server returned error status: ${status}`);
      }

      // Request was made but no response received
      if (axiosError.request) {
        return new Error(
          'No response received from proof server. The server may be overloaded or unreachable.'
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
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Retry on timeout
      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        return true;
      }

      // Retry on network errors
      if (axiosError.code === 'ENETUNREACH') {
        return true;
      }

      // Retry on 5xx server errors
      if (axiosError.response && axiosError.response.status >= 500) {
        return true;
      }

      // Don't retry on connection refused (server not running)
      if (axiosError.code === 'ECONNREFUSED') {
        return false;
      }

      // Don't retry on 4xx client errors
      if (axiosError.response && axiosError.response.status >= 400 && axiosError.response.status < 500) {
        return false;
      }
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
      throw new Error('Could not retrieve proof server information');
    }
  }
}

export default new ProofServerService();
