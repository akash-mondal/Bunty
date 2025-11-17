'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { proofService } from '@/services/proof.service';
import { getPaymentByProof } from '@/services/payment.service';
import { PaymentRecord } from '@/types/payment.types';

interface ProofStatus {
  proofId: string;
  nullifier: string;
  txHash: string;
  threshold: number;
  status: 'pending' | 'confirmed' | 'failed';
  submittedAt: string;
  confirmedAt?: string;
  expiresAt: string;
}

export default function ProofConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const proofId = searchParams.get('proofId');
  const txHash = searchParams.get('txHash');

  const [proofStatus, setProofStatus] = useState<ProofStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Fetch proof status
  const fetchProofStatus = useCallback(async () => {
    if (!proofId) return;

    try {
      const status = await proofService.getProofStatus(proofId);
      setProofStatus(status);
      setError(null);
      
      // Stop polling if confirmed or failed
      if (status.status === 'confirmed' || status.status === 'failed') {
        setIsLoading(false);
        
        // Fetch payment status if proof is confirmed
        if (status.status === 'confirmed' && !payment) {
          fetchPaymentStatus();
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch proof status:', err);
      setError(err.message || 'Failed to fetch proof status');
      setIsLoading(false);
    }
  }, [proofId]);

  // Fetch payment status
  const fetchPaymentStatus = async () => {
    if (!proofId || paymentLoading) return;

    try {
      setPaymentLoading(true);
      const paymentData = await getPaymentByProof(proofId);
      setPayment(paymentData);
    } catch (err: any) {
      // Payment might not exist yet, that's okay
      console.log('Payment not found yet:', err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!proofId || !txHash) {
      setError('Missing proof ID or transaction hash');
      setIsLoading(false);
      return;
    }

    fetchProofStatus();
  }, [proofId, txHash, fetchProofStatus]);

  // Poll for status updates
  useEffect(() => {
    if (!proofId || !isLoading) return;

    const interval = setInterval(() => {
      fetchProofStatus();
    }, 5000); // Poll every 5 seconds

    // Stop polling after 2 minutes (24 attempts)
    const timeout = setTimeout(() => {
      setIsLoading(false);
      if (proofStatus?.status === 'pending') {
        setError('Confirmation is taking longer than expected. Please check back later.');
      }
    }, 120000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [proofId, isLoading, fetchProofStatus, proofStatus?.status]);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getExplorerUrl = (hash: string) => {
    // Midnight Network explorer URL (update with actual explorer when available)
    return `https://explorer.midnight.network/tx/${hash}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  if (!proofId || !txHash) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div style={styles.container}>
            <div style={styles.errorBox}>
              <div style={styles.errorIcon}>❌</div>
              <div>
                <div style={styles.errorTitle}>Invalid Request</div>
                <div style={styles.errorText}>
                  Missing proof ID or transaction hash. Please submit a proof first.
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
          {/* Status Header */}
          {proofStatus?.status === 'confirmed' && (
            <div style={styles.successHeader}>
              <div style={styles.successIcon}>✓</div>
              <div>
                <h1 style={styles.successTitle}>Proof Confirmed!</h1>
                <p style={styles.successSubtitle}>
                  Your proof has been successfully registered on the Midnight Network
                </p>
              </div>
            </div>
          )}

          {proofStatus?.status === 'pending' && (
            <div style={styles.pendingHeader}>
              <div style={styles.pendingIcon}>
                <div style={styles.spinner} />
              </div>
              <div>
                <h1 style={styles.pendingTitle}>Confirming Proof...</h1>
                <p style={styles.pendingSubtitle}>
                  Your proof is being confirmed on the blockchain. This usually takes 30-60 seconds.
                </p>
              </div>
            </div>
          )}

          {proofStatus?.status === 'failed' && (
            <div style={styles.errorHeader}>
              <div style={styles.errorIconLarge}>❌</div>
              <div>
                <h1 style={styles.errorTitleLarge}>Proof Submission Failed</h1>
                <p style={styles.errorSubtitle}>
                  The proof submission failed. Please try again.
                </p>
              </div>
            </div>
          )}

          {/* Transaction Details */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Transaction Details</h3>
            
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Transaction Hash</span>
              <div style={styles.detailValueRow}>
                <code style={styles.code}>
                  {txHash.substring(0, 20)}...{txHash.substring(txHash.length - 20)}
                </code>
                <button
                  onClick={() => handleCopy(txHash, 'txHash')}
                  style={styles.copyButton}
                >
                  {copied === 'txHash' ? '✓' : '📋'}
                </button>
              </div>
            </div>

            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Blockchain Explorer</span>
              <a
                href={getExplorerUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.explorerLink}
              >
                View on Explorer →
              </a>
            </div>

            {proofStatus && (
              <>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Status</span>
                  <span style={getStatusStyle(proofStatus.status)}>
                    {proofStatus.status.toUpperCase()}
                  </span>
                </div>

                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Submitted At</span>
                  <span style={styles.detailValue}>
                    {formatDate(proofStatus.submittedAt)}
                  </span>
                </div>

                {proofStatus.confirmedAt && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Confirmed At</span>
                    <span style={styles.detailValue}>
                      {formatDate(proofStatus.confirmedAt)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Proof Details */}
          {proofStatus && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Proof Details</h3>
              
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Proof ID</span>
                <div style={styles.detailValueRow}>
                  <code style={styles.code}>{proofStatus.proofId}</code>
                  <button
                    onClick={() => handleCopy(proofStatus.proofId, 'proofId')}
                    style={styles.copyButton}
                  >
                    {copied === 'proofId' ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Nullifier</span>
                <div style={styles.detailValueRow}>
                  <code style={styles.code}>
                    {proofStatus.nullifier.substring(0, 20)}...
                  </code>
                  <button
                    onClick={() => handleCopy(proofStatus.nullifier, 'nullifier')}
                    style={styles.copyButton}
                  >
                    {copied === 'nullifier' ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Threshold</span>
                <span style={styles.detailValue}>
                  ${proofStatus.threshold.toLocaleString()}
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Expires</span>
                <span style={styles.detailValue}>
                  {formatDate(proofStatus.expiresAt)}
                  <span style={styles.expiryInfo}>
                    {' '}({getDaysUntilExpiry(proofStatus.expiresAt)} days remaining)
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Payment Status */}
          {proofStatus?.status === 'confirmed' && payment && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Automated Payment</h3>
              <p style={styles.shareText}>
                An automated payment has been triggered based on your verified proof.
              </p>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Payment Amount</span>
                <span style={{...styles.detailValue, fontSize: '1.25rem', color: '#4caf50'}}>
                  ${payment.amount.toFixed(2)}
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Payment Status</span>
                <span style={getPaymentStatusStyle(payment.status)}>
                  {payment.status.toUpperCase()}
                </span>
              </div>

              {payment.triggered_at && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Triggered At</span>
                  <span style={styles.detailValue}>
                    {formatDate(payment.triggered_at)}
                  </span>
                </div>
              )}

              {payment.completed_at && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Completed At</span>
                  <span style={styles.detailValue}>
                    {formatDate(payment.completed_at)}
                  </span>
                </div>
              )}

              {payment.error_message && (
                <div style={styles.errorBox}>
                  <div style={styles.errorIcon}>⚠️</div>
                  <div>
                    <div style={styles.errorTitle}>Payment Error</div>
                    <div style={styles.errorText}>{payment.error_message}</div>
                  </div>
                </div>
              )}

              <div style={styles.infoBox}>
                <div style={styles.infoIcon}>ℹ️</div>
                <div style={styles.infoText}>
                  View all your payment history in the{' '}
                  <a href="/dashboard/payments" style={{color: '#1565c0', fontWeight: '600'}}>
                    Payment History
                  </a>{' '}
                  page.
                </div>
              </div>
            </div>
          )}

          {/* Sharing Instructions */}
          {proofStatus?.status === 'confirmed' && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Share Your Proof</h3>
              <p style={styles.shareText}>
                Share your proof credentials with verifiers (lenders, rental platforms, DeFi protocols) 
                to allow them to verify your financial credentials without accessing your private data.
              </p>

              <div style={styles.shareBox}>
                <div style={styles.shareLabel}>Proof Credentials (JSON)</div>
                <textarea
                  readOnly
                  value={JSON.stringify({
                    proofId: proofStatus.proofId,
                    nullifier: proofStatus.nullifier,
                    threshold: proofStatus.threshold,
                    expiresAt: proofStatus.expiresAt,
                  }, null, 2)}
                  style={styles.shareTextarea}
                />
                <button
                  onClick={() => handleCopy(
                    JSON.stringify({
                      proofId: proofStatus.proofId,
                      nullifier: proofStatus.nullifier,
                      threshold: proofStatus.threshold,
                      expiresAt: proofStatus.expiresAt,
                    }),
                    'credentials'
                  )}
                  style={styles.copyButtonLarge}
                >
                  {copied === 'credentials' ? '✓ Copied!' : 'Copy Credentials'}
                </button>
              </div>

              <div style={styles.infoBox}>
                <div style={styles.infoIcon}>ℹ️</div>
                <div style={styles.infoText}>
                  Verifiers can use the nullifier to query your proof on the Midnight Network 
                  without learning any of your private financial information.
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div style={styles.errorBox}>
              <div style={styles.errorIcon}>⚠️</div>
              <div>
                <div style={styles.errorTitle}>Notice</div>
                <div style={styles.errorText}>{error}</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={styles.actions}>
            <button
              onClick={() => router.push('/dashboard/proofs')}
              style={styles.newProofButton}
            >
              Generate Another Proof
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              style={styles.dashboardButton}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function getStatusStyle(status: string) {
  const baseStyle = {
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '600' as const,
  };

  switch (status) {
    case 'confirmed':
      return { ...baseStyle, backgroundColor: '#4caf50', color: 'white' };
    case 'pending':
      return { ...baseStyle, backgroundColor: '#ff9800', color: 'white' };
    case 'failed':
      return { ...baseStyle, backgroundColor: '#f44336', color: 'white' };
    default:
      return { ...baseStyle, backgroundColor: '#9e9e9e', color: 'white' };
  }
}

function getPaymentStatusStyle(status: string) {
  const baseStyle = {
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '600' as const,
  };

  switch (status) {
    case 'completed':
      return { ...baseStyle, backgroundColor: '#4caf50', color: 'white' };
    case 'pending':
      return { ...baseStyle, backgroundColor: '#ff9800', color: 'white' };
    case 'failed':
      return { ...baseStyle, backgroundColor: '#f44336', color: 'white' };
    default:
      return { ...baseStyle, backgroundColor: '#9e9e9e', color: 'white' };
  }
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  successHeader: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    border: '2px solid #4caf50',
    padding: '2rem',
    borderRadius: '12px',
    marginBottom: '2rem',
  },
  successIcon: {
    fontSize: '3rem',
    color: '#4caf50',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#2e7d32',
    margin: 0,
  },
  successSubtitle: {
    color: '#2e7d32',
    margin: '0.5rem 0 0 0',
  },
  pendingHeader: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    border: '2px solid #ff9800',
    padding: '2rem',
    borderRadius: '12px',
    marginBottom: '2rem',
  },
  pendingIcon: {
    fontSize: '3rem',
  },
  pendingTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#e65100',
    margin: 0,
  },
  pendingSubtitle: {
    color: '#e65100',
    margin: '0.5rem 0 0 0',
  },
  errorHeader: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    border: '2px solid #f44336',
    padding: '2rem',
    borderRadius: '12px',
    marginBottom: '2rem',
  },
  errorIconLarge: {
    fontSize: '3rem',
  },
  errorTitleLarge: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#c62828',
    margin: 0,
  },
  errorSubtitle: {
    color: '#c62828',
    margin: '0.5rem 0 0 0',
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
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 0',
    borderBottom: '1px solid #f0f0f0',
  },
  detailLabel: {
    fontWeight: '500',
    color: '#666',
    fontSize: '0.875rem',
  },
  detailValue: {
    fontWeight: '600',
    color: '#1a1a1a',
    fontSize: '0.875rem',
  },
  detailValueRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  code: {
    backgroundColor: '#f5f5f5',
    padding: '0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
  },
  copyButton: {
    backgroundColor: 'transparent',
    border: '1px solid #ddd',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  explorerLink: {
    color: '#2196f3',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.875rem',
  },
  expiryInfo: {
    color: '#4caf50',
    fontSize: '0.75rem',
  },
  shareText: {
    color: '#666',
    marginBottom: '1.5rem',
    lineHeight: '1.5',
  },
  shareBox: {
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  shareLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#666',
    marginBottom: '0.5rem',
  },
  shareTextarea: {
    width: '100%',
    minHeight: '150px',
    padding: '1rem',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    border: '1px solid #ddd',
    borderRadius: '4px',
    resize: 'vertical' as const,
    marginBottom: '1rem',
    boxSizing: 'border-box' as const,
  },
  copyButtonLarge: {
    width: '100%',
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '0.75rem',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  infoBox: {
    display: 'flex',
    gap: '1rem',
    backgroundColor: '#e3f2fd',
    padding: '1rem',
    borderRadius: '8px',
  },
  infoIcon: {
    fontSize: '1.5rem',
  },
  infoText: {
    fontSize: '0.875rem',
    color: '#1565c0',
    lineHeight: '1.5',
  },
  errorBox: {
    display: 'flex',
    gap: '1rem',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '2rem',
  },
  errorIcon: {
    fontSize: '1.5rem',
  },
  errorTitle: {
    fontWeight: '600',
    color: '#856404',
    marginBottom: '0.25rem',
  },
  errorText: {
    fontSize: '0.875rem',
    color: '#856404',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
  },
  newProofButton: {
    flex: 1,
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    padding: '1rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  dashboardButton: {
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
  backButton: {
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '1rem 2rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #ff9800',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};
