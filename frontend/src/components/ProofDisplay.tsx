'use client';

import { ZKProof } from '@/types/proof.types';
import { proofService } from '@/services/proof.service';
import { useState } from 'react';

interface ProofDisplayProps {
  proof: ZKProof;
  circuit: string;
  threshold: number;
}

/**
 * Component to display generated proof details
 * Shows nullifier, expiry, and proof data with copy functionality
 */
export function ProofDisplay({ proof, circuit, threshold }: ProofDisplayProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const expiryDate = proofService.formatExpiryDate(proof.publicOutputs.expiresAt);
  const daysUntilExpiry = proofService.getDaysUntilExpiry(proof.publicOutputs.expiresAt);
  const isExpired = proofService.isProofExpired(proof.publicOutputs.expiresAt);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateString = (str: string, maxLength: number = 20) => {
    if (str.length <= maxLength) return str;
    return `${str.substring(0, maxLength / 2)}...${str.substring(str.length - maxLength / 2)}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>✓ Proof Generated Successfully</h3>
        <div style={styles.badge}>
          {circuit.replace('verify', '')}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Nullifier</div>
        <div style={styles.valueRow}>
          <code style={styles.code}>{truncateString(proof.publicOutputs.nullifier, 40)}</code>
          <button
            onClick={() => handleCopy(proof.publicOutputs.nullifier, 'nullifier')}
            style={styles.copyButton}
          >
            {copied === 'nullifier' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div style={styles.hint}>
          Unique identifier for this proof. Share this with verifiers.
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Threshold</div>
        <div style={styles.value}>
          ${threshold.toLocaleString()}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Generated At</div>
        <div style={styles.value}>
          {formatTimestamp(proof.publicOutputs.timestamp)}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Expires</div>
        <div style={styles.value}>
          {expiryDate}
          {!isExpired && (
            <span style={styles.expiryInfo}>
              {' '}({daysUntilExpiry} days remaining)
            </span>
          )}
          {isExpired && (
            <span style={styles.expired}> (Expired)</span>
          )}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Proof Data</div>
        <div style={styles.valueRow}>
          <code style={styles.codeSmall}>
            {truncateString(proof.proof, 60)}
          </code>
          <button
            onClick={() => handleCopy(proof.proof, 'proof')}
            style={styles.copyButton}
          >
            {copied === 'proof' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div style={styles.hint}>
          BLS12-381 zero-knowledge proof blob (Base64 encoded)
        </div>
      </div>

      <div style={styles.infoBox}>
        <div style={styles.infoIcon}>ℹ️</div>
        <div style={styles.infoText}>
          This proof can be verified on-chain without revealing your private financial data.
          Share the nullifier with verifiers to allow them to check your credentials.
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#f8fdf8',
    border: '2px solid #4caf50',
    borderRadius: '12px',
    padding: '2rem',
    marginTop: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#2e7d32',
    margin: 0,
  },
  badge: {
    backgroundColor: '#4caf50',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  section: {
    marginBottom: '1.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#666',
    marginBottom: '0.5rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  value: {
    fontSize: '1rem',
    color: '#1a1a1a',
    fontWeight: '500',
  },
  valueRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  code: {
    backgroundColor: '#f5f5f5',
    padding: '0.75rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontFamily: 'monospace',
    color: '#333',
    flex: 1,
    overflowX: 'auto' as const,
  },
  codeSmall: {
    backgroundColor: '#f5f5f5',
    padding: '0.5rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    color: '#333',
    flex: 1,
    overflowX: 'auto' as const,
  },
  copyButton: {
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  hint: {
    fontSize: '0.75rem',
    color: '#999',
    marginTop: '0.5rem',
    fontStyle: 'italic' as const,
  },
  expiryInfo: {
    color: '#4caf50',
    fontSize: '0.875rem',
  },
  expired: {
    color: '#f44336',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  infoBox: {
    display: 'flex',
    gap: '1rem',
    backgroundColor: '#e3f2fd',
    padding: '1rem',
    borderRadius: '8px',
    marginTop: '1.5rem',
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
