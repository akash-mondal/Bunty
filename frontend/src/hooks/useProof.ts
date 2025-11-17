'use client';

import { useState, useCallback } from 'react';
import { proofService } from '@/services/proof.service';
import { CircuitType, ZKProof, ProofGenerationState } from '@/types/proof.types';
import { Witness } from '@/types/witness.types';

/**
 * React hook for proof generation
 * Provides easy access to proof generation with progress tracking
 */
export function useProof() {
  const [state, setState] = useState<ProofGenerationState>({
    status: 'idle',
    progress: 0,
    message: '',
    proof: null,
    error: null,
  });

  /**
   * Generate a zero-knowledge proof
   */
  const generateProof = useCallback(
    async (circuit: CircuitType, witness: Witness, threshold: number): Promise<ZKProof | null> => {
      // Reset state
      setState({
        status: 'generating',
        progress: 0,
        message: 'Starting proof generation...',
        proof: null,
        error: null,
      });

      try {
        const proof = await proofService.generateProof(
          circuit,
          witness,
          threshold,
          (progress, message) => {
            setState((prev) => ({
              ...prev,
              progress,
              message,
            }));
          }
        );

        setState({
          status: 'success',
          progress: 100,
          message: 'Proof generated successfully!',
          proof,
          error: null,
        });

        return proof;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate proof';
        
        setState({
          status: 'error',
          progress: 0,
          message: '',
          proof: null,
          error: errorMessage,
        });

        return null;
      }
    },
    []
  );

  /**
   * Reset proof generation state
   */
  const reset = useCallback(() => {
    setState({
      status: 'idle',
      progress: 0,
      message: '',
      proof: null,
      error: null,
    });
  }, []);

  /**
   * Check proof server health
   */
  const checkServerHealth = useCallback(async (): Promise<boolean> => {
    try {
      return await proofService.healthCheck();
    } catch (error) {
      return false;
    }
  }, []);

  return {
    state,
    generateProof,
    reset,
    checkServerHealth,
  };
}
