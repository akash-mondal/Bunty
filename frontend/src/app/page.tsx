'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div style={styles.loading}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <main style={styles.container}>
      <div style={styles.hero}>
        <h1 style={styles.title}>Bunty</h1>
        <p style={styles.subtitle}>Privacy-First Financial Identity Protocol</p>
        <p style={styles.description}>
          Prove your income, KYC status, and creditworthiness without revealing sensitive documents.
          Built on Cardano's Midnight Network with zero-knowledge proofs.
        </p>
        <div style={styles.buttons}>
          <Link href="/register" style={styles.primaryButton}>
            Get Started
          </Link>
          <Link href="/login" style={styles.secondaryButton}>
            Sign In
          </Link>
        </div>
      </div>

      <div style={styles.features}>
        <div style={styles.feature}>
          <h3 style={styles.featureTitle}>🔒 Privacy First</h3>
          <p style={styles.featureText}>
            Your sensitive data never leaves your device. Generate proofs locally.
          </p>
        </div>
        <div style={styles.feature}>
          <h3 style={styles.featureTitle}>⚡ Instant Verification</h3>
          <p style={styles.featureText}>
            Verifiers can check your credentials instantly without accessing your data.
          </p>
        </div>
        <div style={styles.feature}>
          <h3 style={styles.featureTitle}>🔐 Zero-Knowledge Proofs</h3>
          <p style={styles.featureText}>
            Cryptographically prove facts about your finances without revealing details.
          </p>
        </div>
      </div>
    </main>
  );
}

const styles = {
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '2rem',
  },
  hero: {
    maxWidth: '800px',
    margin: '0 auto',
    textAlign: 'center' as const,
    paddingTop: '4rem',
    paddingBottom: '4rem',
  },
  title: {
    fontSize: '3.5rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    color: '#0070f3',
  },
  subtitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '1rem',
    color: '#1a1a1a',
  },
  description: {
    fontSize: '1.125rem',
    color: '#666',
    lineHeight: '1.6',
    marginBottom: '2rem',
  },
  buttons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  },
  primaryButton: {
    padding: '0.875rem 2rem',
    backgroundColor: '#0070f3',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    padding: '0.875rem 2rem',
    backgroundColor: 'white',
    color: '#0070f3',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    border: '2px solid #0070f3',
    transition: 'all 0.2s',
  },
  features: {
    maxWidth: '1000px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
    paddingTop: '2rem',
  },
  feature: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  featureTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.75rem',
    color: '#1a1a1a',
  },
  featureText: {
    color: '#666',
    lineHeight: '1.5',
  },
};

