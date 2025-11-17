/**
 * @bunty/verifier-client
 * 
 * Standalone client library for verifying Bunty ZK proofs via Midnight Network indexer.
 * 
 * This library allows third-party verifiers (lenders, rental platforms, DeFi protocols)
 * to query proof validity without accessing raw user data.
 * 
 * @packageDocumentation
 */

export { BuntyVerifierClient } from './BuntyVerifierClient';
export type {
  ProofRecord,
  ProofValidation,
  VerifierConfig,
  ProofSubscriptionCallback,
  Subscription,
} from './types';
