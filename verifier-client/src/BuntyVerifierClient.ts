import { GraphQLClient } from 'graphql-request';
import {
  ProofRecord,
  ProofValidation,
  VerifierConfig,
  ProofSubscriptionCallback,
  Subscription,
} from './types';
import {
  GET_PROOF_BY_NULLIFIER,
  GET_PROOFS_BY_USER,
  GET_PROOFS_WITH_FILTERS,
  SUBSCRIBE_TO_PROOFS,
  SUBSCRIBE_TO_USER_PROOFS,
} from './queries';

/**
 * BuntyVerifierClient - Standalone client for verifying Bunty ZK proofs
 * 
 * This client allows third-party verifiers (lenders, rental platforms, DeFi protocols)
 * to query proof validity from the Midnight Network indexer without accessing raw user data.
 * 
 * @example
 * ```typescript
 * const client = new BuntyVerifierClient({
 *   indexerUrl: 'http://localhost:8081/graphql'
 * });
 * 
 * const validation = await client.verifyProof('nullifier-hash-here');
 * if (validation.isValid) {
 *   console.log(`User proved income >= ${validation.threshold}`);
 * }
 * ```
 */
export class BuntyVerifierClient {
  private client: GraphQLClient;
  private timeout: number;

  /**
   * Create a new BuntyVerifierClient instance
   * 
   * @param config - Configuration object with indexer URL and optional timeout
   */
  constructor(config: VerifierConfig) {
    this.timeout = config.timeout || 10000;
    this.client = new GraphQLClient(config.indexerUrl);
  }

  /**
   * Verify a proof by its nullifier
   * 
   * This method queries the Midnight indexer to check if a proof with the given
   * nullifier exists, is valid, and has not expired.
   * 
   * @param nullifier - The unique nullifier hash of the proof
   * @returns ProofValidation object with validity status and metadata
   * @throws Error if the proof is not found or query fails
   * 
   * @example
   * ```typescript
   * const validation = await client.verifyProof('0x1234...');
   * if (validation.isValid) {
   *   console.log('Proof is valid and not expired');
   *   console.log(`Threshold: ${validation.threshold}`);
   *   console.log(`Expires at: ${new Date(validation.expiresAt * 1000)}`);
   * }
   * ```
   */
  async verifyProof(nullifier: string): Promise<ProofValidation> {
    try {
      const data = await this.client.request<{ proofRecord: ProofRecord }>(
        GET_PROOF_BY_NULLIFIER,
        { nullifier }
      );

      if (!data.proofRecord) {
        throw new Error(`Proof with nullifier ${nullifier} not found`);
      }

      const proof = data.proofRecord;
      const now = Math.floor(Date.now() / 1000);
      const isExpired = proof.expiresAt < now;

      return {
        isValid: proof.isValid && !isExpired,
        threshold: proof.threshold,
        expiresAt: proof.expiresAt,
        timestamp: proof.timestamp,
        userDID: proof.userDID,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to verify proof: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get all proofs for a specific user by their DID
   * 
   * This method retrieves all proof records associated with a user's decentralized
   * identifier (DID). Useful for checking a user's complete proof history.
   * 
   * @param userDID - The user's decentralized identifier
   * @returns Array of ProofRecord objects
   * 
   * @example
   * ```typescript
   * const proofs = await client.getUserProofs('did:midnight:user123');
   * console.log(`User has ${proofs.length} proofs`);
   * proofs.forEach(proof => {
   *   console.log(`Threshold: ${proof.threshold}, Valid: ${proof.isValid}`);
   * });
   * ```
   */
  async getUserProofs(userDID: string): Promise<ProofRecord[]> {
    try {
      const data = await this.client.request<{ proofRecords: ProofRecord[] }>(
        GET_PROOFS_BY_USER,
        { userDID }
      );

      return data.proofRecords || [];
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get user proofs: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get proofs with custom filters
   * 
   * This method allows querying proofs with various filters such as minimum threshold,
   * validity status, and user DID.
   * 
   * @param filters - Object with optional filter parameters
   * @returns Array of ProofRecord objects matching the filters
   * 
   * @example
   * ```typescript
   * // Get all valid proofs with threshold >= 50000
   * const proofs = await client.getProofsWithFilters({
   *   minThreshold: 50000,
   *   isValid: true
   * });
   * ```
   */
  async getProofsWithFilters(filters: {
    userDID?: string;
    minThreshold?: number;
    isValid?: boolean;
  }): Promise<ProofRecord[]> {
    try {
      const data = await this.client.request<{ proofRecords: ProofRecord[] }>(
        GET_PROOFS_WITH_FILTERS,
        filters
      );

      return data.proofRecords || [];
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get proofs with filters: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Subscribe to new proof submissions in real-time
   * 
   * This method establishes a WebSocket subscription to receive notifications
   * when new proofs are submitted to the blockchain.
   * 
   * Note: Requires WebSocket support in the indexer endpoint.
   * 
   * @param callback - Function to call when a new proof is submitted
   * @returns Subscription object with unsubscribe method
   * 
   * @example
   * ```typescript
   * const subscription = client.subscribeToProofs((proof) => {
   *   console.log('New proof submitted:', proof.nullifier);
   *   console.log('Threshold:', proof.threshold);
   * });
   * 
   * // Later, to stop receiving updates:
   * subscription.unsubscribe();
   * ```
   */
  subscribeToProofs(callback: ProofSubscriptionCallback): Subscription {
    // Note: GraphQL subscriptions require WebSocket support
    // This is a placeholder implementation that would need to be enhanced
    // with a proper WebSocket client like graphql-ws
    
    console.warn(
      'Proof subscriptions require WebSocket support. ' +
      'Please use a WebSocket-enabled GraphQL client for real-time updates.'
    );

    // Return a dummy subscription for now
    return {
      unsubscribe: () => {
        console.log('Unsubscribed from proof updates');
      },
    };
  }

  /**
   * Subscribe to proof submissions for a specific user
   * 
   * This method establishes a WebSocket subscription to receive notifications
   * when a specific user submits new proofs.
   * 
   * Note: Requires WebSocket support in the indexer endpoint.
   * 
   * @param userDID - The user's decentralized identifier
   * @param callback - Function to call when the user submits a new proof
   * @returns Subscription object with unsubscribe method
   * 
   * @example
   * ```typescript
   * const subscription = client.subscribeToUserProofs(
   *   'did:midnight:user123',
   *   (proof) => {
   *     console.log('User submitted new proof:', proof.threshold);
   *   }
   * );
   * 
   * subscription.unsubscribe();
   * ```
   */
  subscribeToUserProofs(
    userDID: string,
    callback: ProofSubscriptionCallback
  ): Subscription {
    console.warn(
      'User proof subscriptions require WebSocket support. ' +
      'Please use a WebSocket-enabled GraphQL client for real-time updates.'
    );

    return {
      unsubscribe: () => {
        console.log(`Unsubscribed from proofs for user ${userDID}`);
      },
    };
  }

  /**
   * Check if a proof is still valid (exists and not expired)
   * 
   * This is a convenience method that returns a simple boolean indicating
   * whether a proof is valid and not expired.
   * 
   * @param nullifier - The unique nullifier hash of the proof
   * @returns true if proof is valid and not expired, false otherwise
   * 
   * @example
   * ```typescript
   * if (await client.isProofValid('0x1234...')) {
   *   console.log('Proof is valid!');
   * } else {
   *   console.log('Proof is invalid or expired');
   * }
   * ```
   */
  async isProofValid(nullifier: string): Promise<boolean> {
    try {
      const validation = await this.verifyProof(nullifier);
      return validation.isValid;
    } catch {
      return false;
    }
  }

  /**
   * Get the number of valid proofs for a user
   * 
   * @param userDID - The user's decentralized identifier
   * @returns Count of valid (non-expired) proofs
   * 
   * @example
   * ```typescript
   * const count = await client.getValidProofCount('did:midnight:user123');
   * console.log(`User has ${count} valid proofs`);
   * ```
   */
  async getValidProofCount(userDID: string): Promise<number> {
    const proofs = await this.getUserProofs(userDID);
    const now = Math.floor(Date.now() / 1000);
    return proofs.filter(p => p.isValid && p.expiresAt >= now).length;
  }
}
