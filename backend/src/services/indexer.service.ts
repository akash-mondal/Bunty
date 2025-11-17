import { GraphQLClient, gql } from 'graphql-request';

/**
 * Midnight GraphQL Indexer Service
 * 
 * Provides methods to query proof records from the Midnight Network indexer.
 * The indexer captures on-chain proof submission events and makes them queryable
 * via GraphQL for verifiers to validate proofs without accessing raw user data.
 */

// GraphQL query to get proof by nullifier
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

// GraphQL query to get proofs by user DID
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

// GraphQL query to get all proofs with pagination
const GET_ALL_PROOFS = gql`
  query GetAllProofs($limit: Int, $offset: Int) {
    proofRecords(limit: $limit, offset: $offset) {
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

export class IndexerService {
  private client: GraphQLClient;
  private indexerUrl: string;

  constructor() {
    // Default to localhost, can be overridden via environment variable
    this.indexerUrl = process.env.INDEXER_URL || 'http://localhost:8081/graphql';
    this.client = new GraphQLClient(this.indexerUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Query proof by nullifier
   * 
   * Verifiers use this to check if a proof with a specific nullifier exists
   * and is valid. The nullifier is a unique identifier that prevents replay attacks.
   * 
   * @param nullifier - The unique nullifier hash for the proof
   * @returns ProofRecord if found, null otherwise
   */
  async getProofByNullifier(nullifier: string): Promise<ProofRecord | null> {
    try {
      const data = await this.client.request<{ proofRecord: ProofRecord | null }>(
        GET_PROOF_BY_NULLIFIER,
        { nullifier }
      );
      return data.proofRecord;
    } catch (error) {
      console.error('Error querying proof by nullifier:', error);
      throw new Error(`Failed to query proof by nullifier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Query proofs by user DID
   * 
   * Retrieves all proofs associated with a specific user's decentralized identifier.
   * Useful for verifiers who want to see all proofs a user has submitted.
   * 
   * @param userDID - The user's decentralized identifier
   * @returns Array of ProofRecords
   */
  async getProofsByUserDID(userDID: string): Promise<ProofRecord[]> {
    try {
      const data = await this.client.request<{ proofRecords: ProofRecord[] }>(
        GET_PROOFS_BY_USER_DID,
        { userDID }
      );
      return data.proofRecords || [];
    } catch (error) {
      console.error('Error querying proofs by user DID:', error);
      throw new Error(`Failed to query proofs by user DID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all proofs with pagination
   * 
   * Retrieves a paginated list of all proofs in the system.
   * Useful for administrative dashboards or analytics.
   * 
   * @param limit - Maximum number of records to return (default: 50)
   * @param offset - Number of records to skip (default: 0)
   * @returns Array of ProofRecords
   */
  async getAllProofs(limit: number = 50, offset: number = 0): Promise<ProofRecord[]> {
    try {
      const data = await this.client.request<{ proofRecords: ProofRecord[] }>(
        GET_ALL_PROOFS,
        { limit, offset }
      );
      return data.proofRecords || [];
    } catch (error) {
      console.error('Error querying all proofs:', error);
      throw new Error(`Failed to query all proofs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify proof validity
   * 
   * Convenience method that checks if a proof exists and is still valid
   * (not expired and marked as valid by the indexer).
   * 
   * @param nullifier - The unique nullifier hash for the proof
   * @returns ProofValidation object with validity status
   */
  async verifyProof(nullifier: string): Promise<ProofValidation | null> {
    const proof = await this.getProofByNullifier(nullifier);
    
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
  }

  /**
   * Check if indexer is healthy and responding
   * 
   * @returns true if indexer is accessible, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple query to check if indexer is responding
      await this.client.request(gql`
        query HealthCheck {
          __typename
        }
      `);
      return true;
    } catch (error) {
      console.error('Indexer health check failed:', error);
      return false;
    }
  }

  /**
   * Get indexer connection URL
   * 
   * @returns The configured indexer URL
   */
  getIndexerUrl(): string {
    return this.indexerUrl;
  }
}

// Export singleton instance
export const indexerService = new IndexerService();
