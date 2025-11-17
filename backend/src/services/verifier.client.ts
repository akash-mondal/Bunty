import { GraphQLClient, gql } from 'graphql-request';

/**
 * Bunty Verifier Client Library
 * 
 * This is a standalone client library that verifiers (lenders, rental platforms,
 * DeFi protocols) can use to query and validate proofs from the Bunty system.
 * 
 * The client connects directly to the Midnight GraphQL indexer and provides
 * convenient methods for proof validation without accessing raw user data.
 * 
 * Usage Example:
 * ```typescript
 * const verifier = new BuntyVerifierClient('http://localhost:8081/graphql');
 * 
 * // Verify a proof by nullifier
 * const validation = await verifier.verifyProof('0x123abc...');
 * if (validation.isValid) {
 *   console.log('Proof is valid with threshold:', validation.threshold);
 * }
 * 
 * // Get all proofs for a user
 * const userProofs = await verifier.getUserProofs('did:midnight:user123');
 * ```
 */

// GraphQL queries
const GET_PROOF_BY_NULLIFIER = gql`
  query GetProofByNullifier($nullifier: String!) {
    proofRecord(nullifier: $nullifier) {
      nullifier
      threshold
      timestamp
      expiresAt
      userDID
      isValid
      isExpired
    }
  }
`;

const GET_PROOFS_BY_USER_DID = gql`
  query GetProofsByUserDID($userDID: String!) {
    proofRecords(where: { userDID: $userDID }) {
      nullifier
      threshold
      timestamp
      expiresAt
      userDID
      isValid
      isExpired
    }
  }
`;

// GraphQL subscription for new proof submissions (for future implementation)
// const SUBSCRIBE_TO_PROOFS = gql`
//   subscription OnNewProof {
//     proofSubmitted {
//       nullifier
//       threshold
//       timestamp
//       expiresAt
//       userDID
//     }
//   }
// `;

export interface ProofRecord {
  nullifier: string;
  threshold: number;
  timestamp: number;
  expiresAt: number;
  userDID: string;
  isValid: boolean;
  isExpired: boolean;
}

export interface ProofValidation {
  isValid: boolean;
  threshold: number;
  expiresAt: number;
  timestamp: number;
  userDID: string;
}

export interface SubscriptionCallback {
  (proof: ProofRecord): void;
}

export class BuntyVerifierClient {
  private client: GraphQLClient;
  private indexerUrl: string;

  /**
   * Create a new Bunty Verifier Client
   * 
   * @param indexerUrl - The URL of the Midnight GraphQL indexer (default: http://localhost:8081/graphql)
   * @param headers - Optional custom headers for GraphQL requests
   */
  constructor(indexerUrl?: string, headers?: Record<string, string>) {
    this.indexerUrl = indexerUrl || 'http://localhost:8081/graphql';
    this.client = new GraphQLClient(this.indexerUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
  }

  /**
   * Verify a proof by its nullifier
   * 
   * This is the primary method verifiers use to check if a proof is valid.
   * It returns null if the proof doesn't exist, or a ProofValidation object
   * with the validity status and metadata.
   * 
   * @param nullifier - The unique nullifier hash for the proof
   * @returns ProofValidation object if proof exists, null otherwise
   * @throws Error if the query fails
   */
  async verifyProof(nullifier: string): Promise<ProofValidation | null> {
    try {
      const data = await this.client.request<{ proofRecord: ProofRecord | null }>(
        GET_PROOF_BY_NULLIFIER,
        { nullifier }
      );

      const proof = data.proofRecord;
      if (!proof) {
        return null;
      }

      return {
        isValid: proof.isValid && !proof.isExpired,
        threshold: proof.threshold,
        expiresAt: proof.expiresAt,
        timestamp: proof.timestamp,
        userDID: proof.userDID,
      };
    } catch (error) {
      throw new Error(
        `Failed to verify proof: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all proofs for a specific user
   * 
   * Retrieves all proofs associated with a user's decentralized identifier.
   * Useful for verifiers who want to see a user's proof history.
   * 
   * @param userDID - The user's decentralized identifier
   * @returns Array of ProofRecords
   * @throws Error if the query fails
   */
  async getUserProofs(userDID: string): Promise<ProofRecord[]> {
    try {
      const data = await this.client.request<{ proofRecords: ProofRecord[] }>(
        GET_PROOFS_BY_USER_DID,
        { userDID }
      );
      return data.proofRecords || [];
    } catch (error) {
      throw new Error(
        `Failed to get user proofs: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a specific proof by nullifier
   * 
   * Returns the full proof record including all metadata.
   * 
   * @param nullifier - The unique nullifier hash for the proof
   * @returns ProofRecord if found, null otherwise
   * @throws Error if the query fails
   */
  async getProof(nullifier: string): Promise<ProofRecord | null> {
    try {
      const data = await this.client.request<{ proofRecord: ProofRecord | null }>(
        GET_PROOF_BY_NULLIFIER,
        { nullifier }
      );
      return data.proofRecord;
    } catch (error) {
      throw new Error(
        `Failed to get proof: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a proof meets a minimum threshold
   * 
   * Convenience method to verify that a proof exists, is valid,
   * and meets or exceeds a specified threshold.
   * 
   * @param nullifier - The unique nullifier hash for the proof
   * @param minimumThreshold - The minimum threshold required
   * @returns true if proof is valid and meets threshold, false otherwise
   */
  async meetsThreshold(nullifier: string, minimumThreshold: number): Promise<boolean> {
    const validation = await this.verifyProof(nullifier);
    if (!validation || !validation.isValid) {
      return false;
    }
    return validation.threshold >= minimumThreshold;
  }

  /**
   * Check if a proof is expired
   * 
   * @param nullifier - The unique nullifier hash for the proof
   * @returns true if proof exists and is expired, false otherwise
   */
  async isExpired(nullifier: string): Promise<boolean> {
    const proof = await this.getProof(nullifier);
    if (!proof) {
      return true; // Non-existent proofs are considered expired
    }
    return proof.isExpired || proof.expiresAt < Date.now() / 1000;
  }

  /**
   * Get the indexer URL being used
   * 
   * @returns The configured indexer URL
   */
  getIndexerUrl(): string {
    return this.indexerUrl;
  }

  /**
   * Subscribe to new proof submissions (WebSocket)
   * 
   * Note: This requires WebSocket support in the GraphQL client.
   * For production use, consider using a dedicated subscription client
   * like graphql-ws or subscriptions-transport-ws.
   * 
   * @param callback - Function to call when a new proof is submitted
   * @returns Subscription object (implementation depends on GraphQL client)
   */
  subscribeToProofs(callback: SubscriptionCallback): void {
    // Note: This is a placeholder. Actual implementation would require
    // a WebSocket-enabled GraphQL client like graphql-ws
    console.warn('Subscription support requires additional setup with graphql-ws or similar');
    console.log('Callback provided:', typeof callback);
    // Future: Implement WebSocket subscription using graphql-ws
  }
}

// Export a default instance for convenience
export const verifierClient = new BuntyVerifierClient();
