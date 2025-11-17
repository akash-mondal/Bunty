'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ProofDisplay } from '@/components/ProofDisplay';
import { useWitness } from '@/hooks/useWitness';
import { useProof } from '@/hooks/useProof';
import { CircuitType } from '@/types/proof.types';

export default function ProofsPage() {
  const router = useRouter();
  const { witness, getLatestWitness, validation, isLoading: witnessLoading } = useWitness();
  const { state: proofState, generateProof, reset, checkServerHealth } = useProof();
  
  const [circuit, setCircuit] = useState<CircuitType>('verifyIncome');
  const [threshold, setThreshold] = useState<string>('50000');
  const [serverHealthy, setServerHealthy] = useState<boolean | null>(null);
  const [showWitnessDetails, setShowWitnessDetails] = useState(false);

  // Load witness on mount
  useEffect(() => {
    getLatestWitness();
  }, [getLatestWitness]);

  // Check proof server health on mount
  useEffect(() => {
    checkServerHealth().then(setServerHealthy);
  }, [checkServerHealth]);

  const handleGenerateProof = async () => {
    if (!witness) {
      alert('No witness data found. Please construct witness data first.');
      return;
    }

    if (!validation?.isValid) {
      alert('Witness data is invalid. Please check the validation errors.');
      return;
    }

    const thresholdNum = parseInt(threshold, 10);
    if (isNaN(thresholdNum) || thresholdNum <= 0) {
      alert('Please enter a valid threshold amount.');
      return;
    }

    await generateProof(circuit, witness, thresholdNum);
  };

  const handleReset = () => {
    reset();
    setThreshold('50000');
  };

  const getCircuitDescription = (circuitType: CircuitType): string => {
    switch (circuitType) {
      case 'verifyIncome':
        return 'Prove your monthly income meets or exceeds the threshold without revealing exact amount';
      case 'verifyAssets':
        return 'Prove your net worth (assets - liabilities) meets or exceeds the threshold';
      case 'verifyCreditworthiness':
        return 'Prove your credit score meets or exceeds the threshold';
    }
  };

  const getThresholdLabel = (circuitType: CircuitType): string => {
    switch (circuitType) {
      case 'verifyIncome':
        return 'Minimum Monthly Income ($)';
      case 'verifyAssets':
        return 'Minimum Net Worth ($)';
      case 'verifyCreditworthiness':
        return 'Minimum Credit Score';
    }
  };

  const getThresholdPlaceholder = (circuitType: CircuitType): string => {
    switch (circuitType) {
      case 'verifyIncome':
        return '50000';
      case 'verifyAssets':
        return '100000';
      case 'verifyCreditworthiness':
        return '700';
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div>
          <h1 style={styles.title}>Generate Zero-Knowledge Proof</h1>
          <p style={styles.subtitle}>
            Create cryptographic proofs of your financial credentials without revealing sensitive data
          </p>

          {/* Server Health Status */}
          {serverHealthy === false && (
            <div style={styles.warningBox}>
              <div style={styles.warningIcon}>⚠️</div>
              <div>
                <div style={styles.warningTitle}>Proof Server Unavailable</div>
                <div style={styles.warningText}>
                  Cannot connect to the proof server on port 6300. Please ensure the proof server Docker container is running.
                </div>
              </div>
            </div>
          )}

          {/* Witness Status */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Witness Data Status</h3>
            
            {witnessLoading && (
              <div style={styles.loadingText}>Loading witness data...</div>
            )}

            {!witnessLoading && !witness && (
              <div style={styles.errorBox}>
                <div style={styles.errorIcon}>❌</div>
                <div>
                  <div style={styles.errorTitle}>No Witness Data Found</div>
                  <div style={styles.errorText}>
                    Please construct witness data first by linking your accounts and completing verification.
                  </div>
                </div>
              </div>
            )}

            {!witnessLoading && witness && (
              <div>
                <div style={styles.successBox}>
                  <div style={styles.successIcon}>✓</div>
                  <div>
                    <div style={styles.successTitle}>Witness Data Ready</div>
                    <div style={styles.successText}>
                      Your financial and identity data has been prepared for proof generation.
                    </div>
                  </div>
                </div>

                {validation && validation.warnings.length > 0 && (
                  <div style={styles.warningBoxSmall}>
                    <div style={styles.warningIconSmall}>⚠️</div>
                    <div>
                      <div style={styles.warningTitleSmall}>Warnings:</div>
                      <ul style={styles.warningList}>
                        {validation.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowWitnessDetails(!showWitnessDetails)}
                  style={styles.detailsButton}
                >
                  {showWitnessDetails ? 'Hide' : 'Show'} Witness Details
                </button>

                {showWitnessDetails && (
                  <div style={styles.witnessDetails}>
                    <div style={styles.witnessRow}>
                      <span style={styles.witnessLabel}>Monthly Income:</span>
                      <span style={styles.witnessValue}>${witness.income.toLocaleString()}</span>
                    </div>
                    <div style={styles.witnessRow}>
                      <span style={styles.witnessLabel}>Employment Months:</span>
                      <span style={styles.witnessValue}>{witness.employmentMonths}</span>
                    </div>
                    <div style={styles.witnessRow}>
                      <span style={styles.witnessLabel}>Total Assets:</span>
                      <span style={styles.witnessValue}>${witness.assets.toLocaleString()}</span>
                    </div>
                    <div style={styles.witnessRow}>
                      <span style={styles.witnessLabel}>Total Liabilities:</span>
                      <span style={styles.witnessValue}>${witness.liabilities.toLocaleString()}</span>
                    </div>
                    <div style={styles.witnessRow}>
                      <span style={styles.witnessLabel}>Net Worth:</span>
                      <span style={styles.witnessValue}>
                        ${(witness.assets - witness.liabilities).toLocaleString()}
                      </span>
                    </div>
                    <div style={styles.witnessRow}>
                      <span style={styles.witnessLabel}>Credit Score:</span>
                      <span style={styles.witnessValue}>{witness.creditScore}</span>
                    </div>
                    <div style={styles.witnessRow}>
                      <span style={styles.witnessLabel}>SSN Verified:</span>
                      <span style={styles.witnessValue}>
                        {witness.ssnVerified ? '✓ Yes' : '✗ No'}
                      </span>
                    </div>
                    <div style={styles.witnessRow}>
                      <span style={styles.witnessLabel}>Selfie Verified:</span>
                      <span style={styles.witnessValue}>
                        {witness.selfieVerified ? '✓ Yes' : '✗ No'}
                      </span>
                    </div>
                    <div style={styles.witnessRow}>
                      <span style={styles.witnessLabel}>Document Verified:</span>
                      <span style={styles.witnessValue}>
                        {witness.documentVerified ? '✓ Yes' : '✗ No'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Proof Generation Form */}
          {witness && validation?.isValid && proofState.status === 'idle' && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Configure Proof Parameters</h3>

              <div style={styles.formGroup}>
                <label style={styles.label}>Circuit Type</label>
                <select
                  value={circuit}
                  onChange={(e) => {
                    setCircuit(e.target.value as CircuitType);
                    setThreshold(getThresholdPlaceholder(e.target.value as CircuitType));
                  }}
                  style={styles.select}
                >
                  <option value="verifyIncome">Verify Income</option>
                  <option value="verifyAssets">Verify Assets</option>
                  <option value="verifyCreditworthiness">Verify Creditworthiness</option>
                </select>
                <div style={styles.hint}>{getCircuitDescription(circuit)}</div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>{getThresholdLabel(circuit)}</label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder={getThresholdPlaceholder(circuit)}
                  style={styles.input}
                  min="0"
                  step={circuit === 'verifyCreditworthiness' ? '1' : '1000'}
                />
                <div style={styles.hint}>
                  The proof will demonstrate that your {circuit.replace('verify', '').toLowerCase()} meets or exceeds this threshold
                </div>
              </div>

              <button
                onClick={handleGenerateProof}
                disabled={serverHealthy === false}
                style={{
                  ...styles.generateButton,
                  ...(serverHealthy === false ? styles.generateButtonDisabled : {}),
                }}
              >
                Generate Proof
              </button>
            </div>
          )}

          {/* Proof Generation Progress */}
          {proofState.status === 'generating' && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Generating Proof...</h3>
              
              <div style={styles.progressContainer}>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${proofState.progress}%`,
                    }}
                  />
                </div>
                <div style={styles.progressText}>
                  {proofState.progress}% - {proofState.message}
                </div>
              </div>

              <div style={styles.loadingSpinner}>
                <div style={styles.spinner} />
              </div>

              <div style={styles.infoBoxSmall}>
                <div style={styles.infoIconSmall}>ℹ️</div>
                <div style={styles.infoTextSmall}>
                  Proof generation may take up to 30 seconds. Your witness data is being processed locally and never leaves your device.
                </div>
              </div>
            </div>
          )}

          {/* Proof Generation Error */}
          {proofState.status === 'error' && (
            <div style={styles.card}>
              <div style={styles.errorBox}>
                <div style={styles.errorIcon}>❌</div>
                <div>
                  <div style={styles.errorTitle}>Proof Generation Failed</div>
                  <div style={styles.errorText}>{proofState.error}</div>
                </div>
              </div>

              <button onClick={handleReset} style={styles.retryButton}>
                Try Again
              </button>
            </div>
          )}

          {/* Proof Display */}
          {proofState.status === 'success' && proofState.proof && (
            <>
              <ProofDisplay
                proof={proofState.proof}
                circuit={circuit}
                threshold={parseInt(threshold, 10)}
              />

              <div style={styles.actionsContainer}>
                <button onClick={handleReset} style={styles.newProofButton}>
                  Generate Another Proof
                </button>
                <button
                  onClick={() => {
                    // Store proof data in localStorage for submission page
                    localStorage.setItem('pendingProof', JSON.stringify(proofState.proof));
                    localStorage.setItem('pendingProofCircuit', circuit);
                    localStorage.setItem('pendingProofThreshold', threshold);
                    // Navigate to submission page
                    router.push('/dashboard/submit-proof');
                  }}
                  style={styles.submitButton}
                >
                  Submit to Blockchain →
                </button>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

const styles = {
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    color: '#1a1a1a',
  },
  subtitle: {
    color: '#666',
    marginBottom: '2rem',
    lineHeight: '1.5',
  },
  card: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    marginBottom: '2rem',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '1.5rem',
    color: '#1a1a1a',
  },
  warningBox: {
    display: 'flex',
    gap: '1rem',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '2rem',
  },
  warningIcon: {
    fontSize: '1.5rem',
  },
  warningTitle: {
    fontWeight: '600',
    color: '#856404',
    marginBottom: '0.25rem',
  },
  warningText: {
    fontSize: '0.875rem',
    color: '#856404',
  },
  warningBoxSmall: {
    display: 'flex',
    gap: '0.75rem',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    padding: '0.75rem',
    borderRadius: '6px',
    marginTop: '1rem',
  },
  warningIconSmall: {
    fontSize: '1.25rem',
  },
  warningTitleSmall: {
    fontWeight: '600',
    color: '#856404',
    fontSize: '0.875rem',
    marginBottom: '0.25rem',
  },
  warningList: {
    margin: '0.5rem 0 0 1rem',
    fontSize: '0.875rem',
    color: '#856404',
  },
  errorBox: {
    display: 'flex',
    gap: '1rem',
    backgroundColor: '#ffebee',
    border: '1px solid #f44336',
    padding: '1rem',
    borderRadius: '8px',
  },
  errorIcon: {
    fontSize: '1.5rem',
  },
  errorTitle: {
    fontWeight: '600',
    color: '#c62828',
    marginBottom: '0.25rem',
  },
  errorText: {
    fontSize: '0.875rem',
    color: '#c62828',
  },
  successBox: {
    display: 'flex',
    gap: '1rem',
    backgroundColor: '#e8f5e9',
    border: '1px solid #4caf50',
    padding: '1rem',
    borderRadius: '8px',
  },
  successIcon: {
    fontSize: '1.5rem',
    color: '#4caf50',
    fontWeight: 'bold',
  },
  successTitle: {
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: '0.25rem',
  },
  successText: {
    fontSize: '0.875rem',
    color: '#2e7d32',
  },
  loadingText: {
    textAlign: 'center' as const,
    color: '#666',
    padding: '2rem',
  },
  detailsButton: {
    marginTop: '1rem',
    backgroundColor: 'transparent',
    color: '#2196f3',
    border: '1px solid #2196f3',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  witnessDetails: {
    marginTop: '1rem',
    backgroundColor: '#f5f5f5',
    padding: '1rem',
    borderRadius: '6px',
  },
  witnessRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid #e0e0e0',
  },
  witnessLabel: {
    fontWeight: '500',
    color: '#666',
  },
  witnessValue: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  formGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#333',
    marginBottom: '0.5rem',
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box' as const,
  },
  hint: {
    fontSize: '0.75rem',
    color: '#999',
    marginTop: '0.5rem',
    fontStyle: 'italic' as const,
  },
  generateButton: {
    width: '100%',
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    padding: '1rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  progressContainer: {
    marginBottom: '2rem',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '0.5rem',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '0.875rem',
    color: '#666',
    textAlign: 'center' as const,
  },
  loadingSpinner: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #4caf50',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  infoBoxSmall: {
    display: 'flex',
    gap: '0.75rem',
    backgroundColor: '#e3f2fd',
    padding: '0.75rem',
    borderRadius: '6px',
  },
  infoIconSmall: {
    fontSize: '1.25rem',
  },
  infoTextSmall: {
    fontSize: '0.875rem',
    color: '#1565c0',
    lineHeight: '1.5',
  },
  retryButton: {
    marginTop: '1rem',
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  actionsContainer: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem',
  },
  newProofButton: {
    flex: 1,
    backgroundColor: 'white',
    color: '#2196f3',
    border: '2px solid #2196f3',
    padding: '1rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '1rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
