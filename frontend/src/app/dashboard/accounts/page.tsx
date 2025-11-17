'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PlaidLink } from '@/components/PlaidLink';
import { LinkedAccounts } from '@/components/LinkedAccounts';

export default function AccountsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePlaidSuccess = () => {
    // Refresh the linked accounts list
    setRefreshKey((prev) => prev + 1);
  };

  const handlePlaidError = (error: Error) => {
    console.error('Plaid connection error:', error);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div>
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>Linked Accounts</h1>
              <p style={styles.subtitle}>
                Connect your bank accounts securely through Plaid
              </p>
            </div>
            <PlaidLink onSuccess={handlePlaidSuccess} onError={handlePlaidError} />
          </div>

          <div style={styles.content}>
            <LinkedAccounts key={refreshKey} />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    gap: '1rem',
    flexWrap: 'wrap' as const,
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    color: '#1a1a1a',
  },
  subtitle: {
    color: '#666',
    marginBottom: '0',
  },
  content: {
    marginTop: '1.5rem',
  },
};
