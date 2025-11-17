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
 * Proof generation request to proof server
 */
export interface ProofGenerationRequest {
  circuit: CircuitType;
  witness: any; // Witness data
  publicInputs: ProofPublicInputs;
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
 * Proof generation status
 */
export type ProofGenerationStatus = 'idle' | 'generating' | 'success' | 'error';

/**
 * Proof generation state
 */
export interface ProofGenerationState {
  status: ProofGenerationStatus;
  progress: number; // 0-100
  message: string;
  proof: ZKProof | null;
  error: string | null;
}
