/**
 * Proof record stored on Midnight Network
 */
export interface ProofRecord {
  /** Unique nullifier preventing proof replay */
  nullifier: string;
  /** Income/asset threshold proven */
  threshold: number;
  /** Unix timestamp when proof was created */
  timestamp: number;
  /** Unix timestamp when proof expires */
  expiresAt: number;
  /** User's decentralized identifier */
  userDID: string;
  /** Whether proof is valid and not expired */
  isValid: boolean;
  /** Whether proof has expired */
  isExpired: boolean;
}

/**
 * Proof validation result
 */
export interface ProofValidation {
  /** Whether proof is valid and not expired */
  isValid: boolean;
  /** Threshold value proven */
  threshold: number;
  /** Expiration timestamp */
  expiresAt: number;
  /** Creation timestamp */
  timestamp: number;
  /** User DID */
  userDID?: string;
}

/**
 * Configuration for BuntyVerifierClient
 */
export interface VerifierConfig {
  /** GraphQL endpoint URL for Midnight indexer */
  indexerUrl: string;
  /** Optional timeout in milliseconds (default: 10000) */
  timeout?: number;
}

/**
 * Subscription callback for new proofs
 */
export type ProofSubscriptionCallback = (proof: ProofRecord) => void;

/**
 * Subscription handle for unsubscribing
 */
export interface Subscription {
  unsubscribe: () => void;
}
