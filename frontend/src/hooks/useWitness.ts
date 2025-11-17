'use client';

import { useState, useCallback } from 'react';
import { witnessService } from '@/services/witness.service';
import { Witness, WitnessValidation } from '@/types/witness.types';
import { useAuth } from '@/contexts/AuthContext';

/**
 * React hook for witness management
 * Provides easy access to witness construction, storage, and retrieval
 */
export function useWitness() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [witness, setWitness] = useState<Witness | null>(null);
  const [validation, setValidation] = useState<WitnessValidation | null>(null);

  /**
   * Construct witness from backend data sources
   */
  const constructWitness = useCallback(async () => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newWitness = await witnessService.constructWitness();
      setWitness(newWitness);

      // Validate the constructed witness
      const validationResult = witnessService.validateWitness(newWitness);
      setValidation(validationResult);

      return newWitness;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to construct witness';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Store witness locally
   */
  const storeWitness = useCallback(
    async (witnessToStore: Witness) => {
      if (!user?.id || !user?.email) {
        setError('User not authenticated');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const witnessId = await witnessService.storeWitness(
          witnessToStore,
          user.id,
          user.email
        );
        return witnessId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to store witness';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  /**
   * Retrieve witness from local storage
   */
  const retrieveWitness = useCallback(
    async (witnessId: string) => {
      if (!user?.id || !user?.email) {
        setError('User not authenticated');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const retrievedWitness = await witnessService.retrieveWitness(
          witnessId,
          user.id,
          user.email
        );
        
        if (retrievedWitness) {
          setWitness(retrievedWitness);
          
          // Validate the retrieved witness
          const validationResult = witnessService.validateWitness(retrievedWitness);
          setValidation(validationResult);
        }

        return retrievedWitness;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to retrieve witness';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  /**
   * Get the latest witness for current user
   */
  const getLatestWitness = useCallback(async () => {
    if (!user?.id || !user?.email) {
      setError('User not authenticated');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const latestWitness = await witnessService.getLatestWitness(user.id, user.email);
      
      if (latestWitness) {
        setWitness(latestWitness);
        
        // Validate the witness
        const validationResult = witnessService.validateWitness(latestWitness);
        setValidation(validationResult);
      }

      return latestWitness;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get latest witness';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Calculate hash of current witness
   */
  const calculateHash = useCallback(async () => {
    if (!witness) {
      setError('No witness available');
      return null;
    }

    try {
      const hash = await witnessService.calculateHash(witness);
      return hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate hash';
      setError(errorMessage);
      return null;
    }
  }, [witness]);

  /**
   * Delete a specific witness
   */
  const deleteWitness = useCallback(async (witnessId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await witnessService.deleteWitness(witnessId);
      
      // Clear current witness if it was deleted
      if (witness) {
        setWitness(null);
        setValidation(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete witness';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [witness]);

  /**
   * Delete all witnesses for current user
   */
  const deleteAllWitnesses = useCallback(async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await witnessService.deleteAllWitnesses(user.id);
      setWitness(null);
      setValidation(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete witnesses';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Check if user has any stored witnesses
   */
  const hasWitness = useCallback(async () => {
    if (!user?.id) {
      return false;
    }

    try {
      return await witnessService.hasWitness(user.id);
    } catch (err) {
      return false;
    }
  }, [user]);

  /**
   * Validate current witness
   */
  const validateWitness = useCallback(() => {
    if (!witness) {
      setError('No witness available');
      return null;
    }

    const validationResult = witnessService.validateWitness(witness);
    setValidation(validationResult);
    return validationResult;
  }, [witness]);

  return {
    witness,
    validation,
    isLoading,
    error,
    constructWitness,
    storeWitness,
    retrieveWitness,
    getLatestWitness,
    calculateHash,
    deleteWitness,
    deleteAllWitnesses,
    hasWitness,
    validateWitness,
  };
}
