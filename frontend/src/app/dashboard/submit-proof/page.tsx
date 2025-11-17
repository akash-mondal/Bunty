'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useWallet } from '@/contexts/WalletContext';
import { proofService } from '@/services/proof.service';
import { ZKProof } from '@/types/proof.types';

export default function SubmitProofPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { wallet, connect, signTransaction } = useWallet();

  const [proof, setProof] = useState<ZKProof | null>(null);
  const [circuit, setCircuit] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load proof data from localStorage or URL params
  useEffect(() => {
    const loadProofData = () => {
      try {
        // Try to get proof from localStorage (set by proof generation page)
        const storedProof = localStorage.getItem('pendingProof');
        const storedCircuit = localStorage.getItem('pendingProofCircuit');
        const storedThreshold = localStorage.getItem('pendingProofThreshold');

        if (storedProof && storedCircuit && storedThreshold) {
          setProof(JSON.parse(storedProof));
          setCircuit(storedCircuit);
          setThreshold(parseInt(storedThreshold, 10));
        } else {
          // No proof data found
          setError('No proof data found. Please generate a proof first.');
        }
      } catch (err) {
        console.error('Failed to load proof data:', err);
        setError('Failed to load proof data. Please try generating a proof again.');
      }
    };

    loadProofData();
  }, []);

  const handleSubmit = async () => {
    if (!proof) {
      setError('No proof data available');
      return;
    }

    if (!wallet?.connected) {
      setError('Please connect your wallet first');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Sign the proof data with wallet
      const proofPayload = JSON.stringify({
        nullifier: proof.publicOutputs.nullifier,
        timestamp: proof.publicOutputs.timestamp,
        threshold,
      });

      const signedData = await signTransaction({
        to: 'midnight-network',
        value: '0',
        data: proofPayload,
      });

      // Submit proof to backend
      const result = await proofService.submitProof(
        proof,
        signedData,
        wallet.address
      );

      // Clear pending proof from localStorage
      localStorage.removeItem('pendingProof');
      localStorage.removeItem('pendingProofCircuit');
      localStorage.removeItem('pendingProofThreshold');

      // Navigate to confirmation page
      router.push(`/dashboard/proof-confirmation?proofId=${result.proofId}&txHash=${result.txHash}`);
    } catch (err: any) {
      console.error('Failed to submit proof:', err);
      setError(err.message || 'Failed to submit proof to blockchain');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/proofs');
  };

  if (!proof) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div style={styles.container}>
            <div style={styles.errorBox}>
              <div style={styles.errorIcon}>❌</div>
              <div>
                <div style={styles.errorTitle}>No Proof Data</div>
                <div style={styles.errorText}>
                  {error || 'Please generate a proof first before submitting.'}
                </div>
              </div>
            </div>
            <button onClick={() => router.push('/dashboard/proofs')} style={styles.backButton}>
              Back to Proof Generation
            </button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div style={styles.container}>
          <h1 style={styles.title}>Submit Proof to Blockchain</h1>
          <p style={styles.subtitle}>
            Sign and submit your zero-knowledge proof to the Midnight Network
          </p>

          {/* Proof Summary */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Proof Summary</h3>
            
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Circuit Type:</span>
              <span style={styles.summaryValue}>{circuit.replace('verify', '')}</span>
            </div>
            
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Threshold:</span>
              <span style={styles.summaryValue}>${threshold.toLocaleString()}</span>
            </div>
            
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Nullifier:</span>
              <code style={styles.code}>
                {proof.publicOutputs.nullifier.substring(0, 20)}...
              </code>
            </div>
            
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Expires:</span>
              <span style={styles.summaryValue}>
                {new Date(proof.publicOutputs.expiresAt * 1000).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Wallet Connection */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Wallet Connection</h3>
            
            {!wallet?.connected ? (
              <div>
                <div style={styles.warningBox}>
                  <div style={styles.warningIcon}>⚠️</div>
                  <div>
                    <div style={styles.warningTitle}>Wallet Not Connected</div>
                    <div style={styles.warningText}>
                      You need to connect your Lace Wallet to sign and submit the proof.
                    </div>
                  </div>
                </div>
                <button onClick={connect} style={styles.connectButton}>
                  Connect Lace Wallet
                </button>
              </div>
            ) : (
              <div style={styles.walletInfo}>
                <div style={styles.connectedBadge}>✓ Connected</div>
                <div style={styles.walletDetails}>
                  <div style={styles.walletRow}>
                    <span style={styles.walletLabel}>Address:</span>
                    <code style={styles.walletValue}>
                      {wallet.address.substring(0, 20)}...
                    </code>
                  </div>
                  <div style={styles.walletRow}>
                    <span style={styles.walletLabel}>Network:</span>
                    <span style={styles.walletValue}>{wallet.network}</span>
                  </div>
                  {wallet.balance !== undefined && (
                    <div style={styles.walletRow}>
                      <span style={styles.walletLabel}>Balance:</span>
                      <span style={styles.walletValue}>{wallet.balance.toFixed(2)} ADA</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Submission Info */}
          <div style={styles.infoBox}>
            <div style={styles.infoIcon}>ℹ️</div>
            <div style={styles.infoText}>
              <strong>What happens next:</strong>
              <ul style={styles.infoList}>
                <li>Your wallet will prompt you to sign the transaction</li>
                <li>The proof will be submitted to the Midnight Network</li>
                <li>You'll receive a transaction hash for tracking</li>
                <li>Confirmation typically takes 30-60 seconds</li>
              </ul>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div style={styles.errorBox}>
              <div style={styles.errorIcon}>❌</div>
              <div>
                <div style={styles.errorTitle}>Submission Error</div>
                <div style={styles.errorText}>{error}</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={styles.actions}>
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              style={{
                ...styles.cancelButton,
                ...(isSubmitting ? styles.buttonDisabled : {}),
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!wallet?.connected || isSubmitting}
              style={{
                ...styles.submitButton,
                ...(!wallet?.connected || isSubmitting ? styles.buttonDisabled : {}),
              }}
            >
              {isSubmitting ? (
                <>
                  <span style={styles.spinner} />
                  Submitting...
                </>
              ) : (
                'Sign & Submit to Blockchain'
              )}
            </button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
  },
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
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 0',
    borderBottom: '1px solid #f0f0f0',
  },
  summaryLabel: {
    fontWeight: '500',
    color: '#666',
  },
  summaryValue: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  code: {
    backgroundColor: '#f5f5f5',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontFamily: 'monospace',
  },
  warningBox: {
    display: 'flex',
    gap: '1rem',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
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
  connectButton: {
    width: '100%',
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '1rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  walletInfo: {
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    borderRadius: '8px',
  },
  connectedBadge: {
    display: 'inline-block',
    backgroundColor: '#4caf50',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '600',
    marginBottom: '1rem',
  },
  walletDetails: {
    marginTop: '1rem',
  },
  walletRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
  },
  walletLabel: {
    color: '#666',
    fontSize: '0.875rem',
  },
  walletValue: {
    fontWeight: '600',
    color: '#1a1a1a',
    fontSize: '0.875rem',
  },
  infoBox: {
    display: 'flex',
    gap: '1rem',
    backgroundColor: '#e3f2fd',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '2rem',
  },
  infoIcon: {
    fontSize: '1.5rem',
  },
  infoText: {
    fontSize: '0.875rem',
    color: '#1565c0',
    lineHeight: '1.5',
  },
  infoList: {
    margin: '0.5rem 0 0 1.5rem',
    paddingLeft: 0,
  },
  errorBox: {
    display: 'flex',
    gap: '1rem',
    backgroundColor: '#ffebee',
    border: '1px solid #f44336',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '2rem',
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
  actions: {
    display: 'flex',
    gap: '1rem',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'white',
    color: '#666',
    border: '2px solid #ddd',
    padding: '1rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    padding: '1rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #ffffff',
    borderTop: '2px solid transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    display: 'inline-block',
  },
  backButton: {
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '1rem 2rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '1rem',
  },
};
