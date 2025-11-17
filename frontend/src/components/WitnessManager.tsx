'use client';

import React, { useEffect, useState } from 'react';
import { useWitness } from '@/hooks/useWitness';

/**
 * WitnessManager Component
 * Demonstrates witness construction, storage, and retrieval
 * This component can be used in the dashboard to manage witness data
 */
export default function WitnessManager() {
  const {
    witness,
    validation,
    isLoading,
    error,
    constructWitness,
    storeWitness,
    getLatestWitness,
    calculateHash,
    deleteAllWitnesses,
    hasWitness: checkHasWitness,
  } = useWitness();

  const [witnessHash, setWitnessHash] = useState<string | null>(null);
  const [hasStoredWitness, setHasStoredWitness] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if user has stored witness on mount
  useEffect(() => {
    const checkWitness = async () => {
      const exists = await checkHasWitness();
      setHasStoredWitness(exists);
      
      // Load latest witness if exists
      if (exists) {
        await getLatestWitness();
      }
    };
    checkWitness();
  }, [checkHasWitness, getLatestWitness]);

  // Calculate hash when witness changes
  useEffect(() => {
    if (witness) {
      calculateHash().then(setWitnessHash);
    } else {
      setWitnessHash(null);
    }
  }, [witness, calculateHash]);

  const handleConstructAndStore = async () => {
    setSuccessMessage(null);
    
    // Construct witness from backend data
    const newWitness = await constructWitness();
    
    if (newWitness) {
      // Store witness locally
      const witnessId = await storeWitness(newWitness);
      
      if (witnessId) {
        setSuccessMessage('Witness constructed and stored successfully!');
        setHasStoredWitness(true);
      }
    }
  };

  const handleLoadLatest = async () => {
    setSuccessMessage(null);
    const latestWitness = await getLatestWitness();
    
    if (latestWitness) {
      setSuccessMessage('Latest witness loaded successfully!');
    }
  };

  const handleDeleteAll = async () => {
    if (confirm('Are you sure you want to delete all stored witnesses?')) {
      await deleteAllWitnesses();
      setSuccessMessage('All witnesses deleted successfully!');
      setHasStoredWitness(false);
      setWitnessHash(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Witness Manager</h2>
      
      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleConstructAndStore}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Construct & Store Witness'}
        </button>
        
        {hasStoredWitness && (
          <>
            <button
              onClick={handleLoadLatest}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Load Latest
            </button>
            
            <button
              onClick={handleDeleteAll}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Delete All
            </button>
          </>
        )}
      </div>

      {/* Witness Data Display */}
      {witness && (
        <div className="space-y-4">
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Witness Data</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Monthly Income</p>
                <p className="font-semibold">${witness.income.toLocaleString()}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Employment Duration</p>
                <p className="font-semibold">{witness.employmentMonths} months</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Total Assets</p>
                <p className="font-semibold">${witness.assets.toLocaleString()}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Total Liabilities</p>
                <p className="font-semibold">${witness.liabilities.toLocaleString()}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Net Worth</p>
                <p className="font-semibold">
                  ${(witness.assets - witness.liabilities).toLocaleString()}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Credit Score</p>
                <p className="font-semibold">{witness.creditScore}</p>
              </div>
            </div>

            {/* Verification Status */}
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Verification Status</p>
              <div className="flex gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    witness.ssnVerified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  SSN: {witness.ssnVerified ? '✓' : '✗'}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    witness.selfieVerified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  Selfie: {witness.selfieVerified ? '✓' : '✗'}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    witness.documentVerified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  Document: {witness.documentVerified ? '✓' : '✗'}
                </span>
              </div>
            </div>

            {/* Witness Hash */}
            {witnessHash && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-1">Witness Hash (SHA-256)</p>
                <p className="font-mono text-xs bg-gray-50 p-2 rounded break-all">
                  {witnessHash}
                </p>
              </div>
            )}

            {/* Timestamp */}
            <div className="mt-4">
              <p className="text-sm text-gray-600">Created At</p>
              <p className="text-sm">
                {new Date(witness.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Validation Results */}
          {validation && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Validation</h3>
              
              <div className="mb-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    validation.isValid
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {validation.isValid ? 'Valid' : 'Invalid'}
                </span>
              </div>

              {validation.errors.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-semibold text-red-800 mb-1">Errors:</p>
                  <ul className="list-disc list-inside text-sm text-red-700">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-yellow-800 mb-1">Warnings:</p>
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!witness && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          <p>No witness data available.</p>
          <p className="text-sm mt-2">
            Click "Construct & Store Witness" to create one from your linked accounts.
          </p>
        </div>
      )}
    </div>
  );
}
