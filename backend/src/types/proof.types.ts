import { Witness } from './witness.types';

/**
 * Circuit types supported by the proof server
 */
export type CircuitType = 'verifyIncome' | 'verifyAssets' | 'verifyCreditworthiness';

/**
 * Public inputs for proof generation
 */
export interface ProofPublicInputs {
  threshold: number;
}

/**
 * Proof generation request to proof server
 */
export interface ProofGenerationRequest {
  circuit: CircuitType;
  witness: Witness;
  publicInputs: ProofPublicInputs;
}

/**
 * Public outputs from proof generation
 */
export interface ProofPublicOutputs {
  nullifier: string;
  timestamp: number;
  expiresAt: number;
}

/**
 * Zero-knowledge proof structure
 */
export interface ZKProof {
  proof: string; // Base64 encoded BLS12-381 proof blob
  publicInputs: string[];
  publicOutputs: ProofPublicOutputs;
}

/**
 * Proof generation response from proof server
 */
export interface ProofGenerationResponse {
  proof: string; // Base64 encoded proof
  publicOutputs: ProofPublicOutputs;
}

/**
 * Proof server error response
 */
export interface ProofServerError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Proof submission status
 */
export type ProofStatus = 'pending' | 'confirmed' | 'failed';

/**
 * Proof submission record
 */
export interface ProofSubmission {
  id: string;
  user_id: string;
  proof_id: string;
  nullifier: string;
  tx_hash: string;
  threshold: number;
  status: ProofStatus;
  submitted_at: Date;
  confirmed_at?: Date;
  expires_at: Date;
}

/**
 * Proof submission request
 */
export interface SubmitProofRequest {
  proof: ZKProof;
  walletSignature: string;
}

/**
 * Proof submission response
 */
export interface SubmitProofResponse {
  txHash: string;
  proofId: string;
  status: ProofStatus;
}

/**
 * Proof status query response
 */
export interface ProofStatusResponse {
  proofId: string;
  nullifier: string;
  txHash: string;
  threshold: number;
  status: ProofStatus;
  submittedAt: Date;
  confirmedAt?: Date;
  expiresAt: Date;
}
