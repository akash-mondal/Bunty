'use client';

import { useState } from 'react';

interface ProofSharingProps {
  proofId: string;
  nullifier: string;
  threshold: number;
  expiresAt: string;
}

/**
 * Component for sharing proof credentials
 * Provides copy functionality for proof data
 */
export function ProofSharing({ proofId, nullifier, threshold, expiresAt }: ProofSharingProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const proofCredentials = {
    proofId,
    nullifier,
    threshold,
    expiresAt,
  };

  const credentialsJson = JSON.stringify(proofCredentials, null, 2);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Share Your Proof</h3>
      <p style={styles.description}>
        Share your proof credentials with verifiers (lenders, rental platforms, DeFi protocols) 
        to allow them to verify your financial credentials without accessing your private data.
      </p>

      {/* Individual Fields */}
      <div style={styles.fieldsContainer}>
        <div style={styles.field}>
          <label style={styles.fieldLabel}>Proof ID</label>
          <div style={styles.fieldRow}>
            <input
              type="text"
              readOnly
              value={proofId}
              style={styles.fieldInput}
            />
            <button
              onClick={() => handleCopy(proofId, 'proofId')}
              style={styles.copyButton}
            >
              {copied === 'proofId' ? '✓' : '📋'}
            </button>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.fieldLabel}>Nullifier</label>
          <div style={styles.fieldRow}>
            <input
              type="text"
              readOnly
              value={nullifier}
              style={styles.fieldInput}
            />
            <button
              onClick={() => handleCopy(nullifier, 'nullifier')}
              style={styles.copyButton}
            >
              {copied === 'nullifier' ? '✓' : '📋'}
            </button>
          </div>
        </div>
      </div>

      {/* JSON Format */}
      <div style={styles.jsonContainer}>
        <div style={styles.jsonHeader}>
          <label style={styles.jsonLabel}>Complete Credentials (JSON)</label>
          <button
            onClick={() => handleCopy(credentialsJson, 'json')}
            style={styles.copyButtonLarge}
          >
            {copied === 'json' ? '✓ Copied!' : 'Copy JSON'}
          </button>
        </div>
        <textarea
          readOnly
          value={credentialsJson}
          style={styles.jsonTextarea}
        />
      </div>

      {/* Info Box */}
      <div style={styles.infoBox}>
        <div style={styles.infoIcon}>ℹ️</div>
        <div style={styles.infoText}>
          <strong>How verifiers use this:</strong> Verifiers can query the Midnight Network 
          using your nullifier to confirm your proof is valid without learning any of your 
          private financial information. The proof expires on {new Date(expiresAt).toLocaleDateString()}.
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    color: '#1a1a1a',
  },
  description: {
    color: '#666',
    marginBottom: '1.5rem',
    lineHeight: '1.5',
    fontSize: '0.875rem',
  },
  fieldsContainer: {
    display: 'grid',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  fieldLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#666',
  },
  fieldRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  fieldInput: {
    flex: 1,
    padding: '0.75rem',
    fontSize: '0.875rem',
    fontFamily: 'monospace',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: '#f8f9fa',
  },
  copyButton: {
    backgroundColor: 'white',
    border: '1px solid #ddd',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
    minWidth: '50px',
  },
  jsonContainer: {
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  jsonHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  jsonLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#666',
  },
  copyButtonLarge: {
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  jsonTextarea: {
    width: '100%',
    minHeight: '120px',
    padding: '1rem',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    border: '1px solid #ddd',
    borderRadius: '6px',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    backgroundColor: 'white',
  },
  infoBox: {
    display: 'flex',
    gap: '1rem',
    backgroundColor: '#e3f2fd',
    padding: '1rem',
    borderRadius: '8px',
  },
  infoIcon: {
    fontSize: '1.25rem',
  },
  infoText: {
    fontSize: '0.875rem',
    color: '#1565c0',
    lineHeight: '1.5',
  },
};
