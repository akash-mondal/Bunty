'use client';

import { useEffect, useState } from 'react';
import { plaidService } from '@/services/plaid.service';
import { PlaidConnection } from '@/types/plaid.types';

export function LinkedAccounts() {
  const [connections, setConnections] = useState<PlaidConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await plaidService.getConnections();
      setConnections(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load connections';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  if (isLoading) {
    return (
      <div style={styles.card}>
        <div style={styles.loading}>Loading accounts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.card}>
        <div style={styles.error}>{error}</div>
        <button onClick={fetchConnections} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div style={styles.card}>
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No accounts connected yet</p>
          <p style={styles.emptySubtext}>
            Click "Connect Bank Account" above to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {connections.map((connection) => (
        <div key={connection.id} style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={styles.institutionName}>{connection.institutionName}</h3>
              <div style={styles.statusBadge}>
                <StatusIndicator status={connection.status} />
              </div>
            </div>
            <div style={styles.metadata}>
              <span style={styles.metadataText}>
                Connected {new Date(connection.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div style={styles.accountsList}>
            {connection.accounts.map((account) => (
              <div key={account.id} style={styles.accountItem}>
                <div style={styles.accountInfo}>
                  <span style={styles.accountName}>{account.name}</span>
                  <span style={styles.accountType}>
                    {account.subtype || account.type}
                  </span>
                </div>
                {account.mask && (
                  <span style={styles.accountMask}>••••{account.mask}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface StatusIndicatorProps {
  status: 'connected' | 'disconnected' | 'error';
}

function StatusIndicator({ status }: StatusIndicatorProps) {
  const statusConfig = {
    connected: {
      color: '#10B981',
      backgroundColor: '#D1FAE5',
      text: 'Connected',
    },
    disconnected: {
      color: '#6B7280',
      backgroundColor: '#F3F4F6',
      text: 'Disconnected',
    },
    error: {
      color: '#EF4444',
      backgroundColor: '#FEE2E2',
      text: 'Error',
    },
  };

  const config = statusConfig[status];

  return (
    <span
      style={{
        ...styles.statusIndicator,
        color: config.color,
        backgroundColor: config.backgroundColor,
      }}
    >
      <span
        style={{
          ...styles.statusDot,
          backgroundColor: config.color,
        }}
      />
      {config.text}
    </span>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  card: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #E5E7EB',
  },
  institutionName: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.5rem',
  },
  statusBadge: {
    display: 'inline-block',
  },
  statusIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  statusDot: {
    width: '0.5rem',
    height: '0.5rem',
    borderRadius: '50%',
  },
  metadata: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
  },
  metadataText: {
    fontSize: '0.875rem',
    color: '#6B7280',
  },
  accountsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  accountItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    backgroundColor: '#F9FAFB',
    borderRadius: '6px',
  },
  accountInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  accountName: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#1a1a1a',
  },
  accountType: {
    fontSize: '0.875rem',
    color: '#6B7280',
    textTransform: 'capitalize' as const,
  },
  accountMask: {
    fontSize: '0.875rem',
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  loading: {
    textAlign: 'center' as const,
    color: '#6B7280',
    padding: '2rem',
  },
  error: {
    color: '#DC2626',
    marginBottom: '1rem',
    padding: '0.75rem',
    backgroundColor: '#FEE2E2',
    borderRadius: '6px',
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '3rem 1rem',
  },
  emptyText: {
    fontSize: '1.125rem',
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: '0.5rem',
  },
  emptySubtext: {
    fontSize: '0.875rem',
    color: '#6B7280',
  },
};
