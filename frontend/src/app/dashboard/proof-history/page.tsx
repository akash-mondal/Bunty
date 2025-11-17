'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';

interface ProofRecord {
  proofId: string;
  nullifier: string;
  txHash: string;
  threshold: number;
  status: 'pending' | 'confirmed' | 'failed';
  submittedAt: string;
  confirmedAt?: string;
  expiresAt: string;
}

export default function ProofHistoryPage() {
  const router = useRouter();
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real implementation, this would fetch from an API endpoint
    // For now, we'll show a placeholder
    setIsLoading(false);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const baseStyle = {
      padding: '0.25rem 0.75rem',
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: '600' as const,
      display: 'inline-block',
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
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div style={styles.container}>
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>Proof History</h1>
              <p style={styles.subtitle}>
                View all your submitted zero-knowledge proofs
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/proofs')}
              style={styles.newProofButton}
            >
              + Generate New Proof
            </button>
          </div>

          {isLoading && (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>Loading proof history...</p>
            </div>
          )}

          {error && (
            <div style={styles.errorBox}>
              <div style={styles.errorIcon}>❌</div>
              <div>
                <div style={styles.errorTitle}>Error Loading Proofs</div>
                <div style={styles.errorText}>{error}</div>
              </div>
            </div>
          )}

          {!isLoading && !error && proofs.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📋</div>
              <h3 style={styles.emptyTitle}>No Proofs Yet</h3>
              <p style={styles.emptyText}>
                You haven't submitted any proofs yet. Generate your first proof to get started.
              </p>
              <button
                onClick={() => router.push('/dashboard/proofs')}
                style={styles.emptyButton}
              >
                Generate Your First Proof
              </button>
            </div>
          )}

          {!isLoading && !error && proofs.length > 0 && (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Proof ID</th>
                    <th style={styles.th}>Threshold</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Submitted</th>
                    <th style={styles.th}>Expires</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proofs.map((proof) => (
                    <tr key={proof.proofId} style={styles.tableRow}>
                      <td style={styles.td}>
                        <code style={styles.code}>
                          {proof.proofId.substring(0, 15)}...
                        </code>
                      </td>
                      <td style={styles.td}>${proof.threshold.toLocaleString()}</td>
                      <td style={styles.td}>
                        <span style={getStatusBadge(proof.status)}>
                          {proof.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={styles.td}>{formatDate(proof.submittedAt)}</td>
                      <td style={styles.td}>{formatDate(proof.expiresAt)}</td>
                      <td style={styles.td}>
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/proof-confirmation?proofId=${proof.proofId}&txHash=${proof.txHash}`
                            )
                          }
                          style={styles.viewButton}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={styles.infoBox}>
            <div style={styles.infoIcon}>ℹ️</div>
            <div style={styles.infoText}>
              <strong>Note:</strong> Proofs are valid for 30 days from submission. 
              After expiration, you'll need to generate a new proof with updated data.
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    color: '#1a1a1a',
  },
  subtitle: {
    color: '#666',
    lineHeight: '1.5',
  },
  newProofButton: {
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #2196f3',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem',
  },
  loadingText: {
    color: '#666',
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
  emptyState: {
    backgroundColor: 'white',
    padding: '4rem 2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    color: '#1a1a1a',
  },
  emptyText: {
    color: '#666',
    marginBottom: '2rem',
    lineHeight: '1.5',
  },
  emptyButton: {
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    padding: '1rem 2rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    marginBottom: '2rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
  },
  th: {
    padding: '1rem',
    textAlign: 'left' as const,
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#666',
    borderBottom: '2px solid #e0e0e0',
  },
  tableRow: {
    borderBottom: '1px solid #f0f0f0',
  },
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#1a1a1a',
  },
  code: {
    backgroundColor: '#f5f5f5',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
  },
  viewButton: {
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
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
};
