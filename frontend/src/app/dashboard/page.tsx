'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function DashboardPage() {

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div style={styles.container}>
          <h1 style={styles.title}>Welcome to Bunty</h1>
          <p style={styles.subtitle}>
            Privacy-first financial identity protocol
          </p>

          <div style={styles.grid}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Link Your Accounts</h3>
              <p style={styles.cardText}>
                Connect your bank accounts securely through Plaid to access your financial data.
              </p>
              <button style={styles.cardButton}>Get Started</button>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Verify Your Identity</h3>
              <p style={styles.cardText}>
                Complete KYC verification through Stripe Identity to prove your identity.
              </p>
              <button style={styles.cardButton}>Verify Now</button>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Generate Proofs</h3>
              <p style={styles.cardText}>
                Create zero-knowledge proofs of your income and creditworthiness.
              </p>
              <button style={styles.cardButton}>Create Proof</button>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Share Credentials</h3>
              <p style={styles.cardText}>
                Share your proofs with lenders and platforms without revealing sensitive data.
              </p>
              <button style={styles.cardButton}>View Proofs</button>
            </div>
          </div>

          <div style={styles.infoSection}>
            <h2 style={styles.infoTitle}>How It Works</h2>
            <div style={styles.steps}>
              <div style={styles.step}>
                <div style={styles.stepNumber}>1</div>
                <h4 style={styles.stepTitle}>Connect Accounts</h4>
                <p style={styles.stepText}>
                  Link your bank accounts and complete identity verification
                </p>
              </div>
              <div style={styles.step}>
                <div style={styles.stepNumber}>2</div>
                <h4 style={styles.stepTitle}>Generate Proofs</h4>
                <p style={styles.stepText}>
                  Create zero-knowledge proofs locally on your device
                </p>
              </div>
              <div style={styles.step}>
                <div style={styles.stepNumber}>3</div>
                <h4 style={styles.stepTitle}>Submit to Blockchain</h4>
                <p style={styles.stepText}>
                  Submit proofs to Midnight Network using your wallet
                </p>
              </div>
              <div style={styles.step}>
                <div style={styles.stepNumber}>4</div>
                <h4 style={styles.stepTitle}>Share Credentials</h4>
                <p style={styles.stepText}>
                  Verifiers can check your proofs without accessing your data
                </p>
              </div>
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
    fontSize: '1.125rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '3rem',
  },
  card: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.75rem',
    color: '#1a1a1a',
  },
  cardText: {
    color: '#666',
    marginBottom: '1rem',
    lineHeight: '1.5',
  },
  cardButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#0070f3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  infoSection: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  infoTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '2rem',
    color: '#1a1a1a',
  },
  steps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '2rem',
  },
  step: {
    textAlign: 'center' as const,
  },
  stepNumber: {
    width: '48px',
    height: '48px',
    backgroundColor: '#0070f3',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    fontWeight: 'bold',
    margin: '0 auto 1rem',
  },
  stepTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    color: '#1a1a1a',
  },
  stepText: {
    color: '#666',
    lineHeight: '1.5',
    fontSize: '0.875rem',
  },
};
