'use client';

import { VerificationStatus as VerificationStatusType } from '@/types/stripe.types';

interface VerificationStatusProps {
  status: VerificationStatusType | null;
  isLoading?: boolean;
}

export function VerificationStatus({
  status,
  isLoading,
}: VerificationStatusProps) {
  if (isLoading) {
    return (
      <div style={styles.container}>
        <p style={styles.loadingText}>Loading verification status...</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div style={styles.container}>
        <div style={styles.notStarted}>
          <p style={styles.notStartedText}>
            No verification started yet. Click the button above to begin.
          </p>
        </div>
      </div>
    );
  }

  const allVerified =
    status.ssnVerified && status.selfieVerified && status.documentVerified;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Verification Status</h3>

      <div style={styles.badgeContainer}>
        <VerificationBadge
          label="SSN Verification"
          verified={status.ssnVerified}
        />
        <VerificationBadge
          label="Selfie Verification"
          verified={status.selfieVerified}
        />
        <VerificationBadge
          label="Document Verification"
          verified={status.documentVerified}
        />
      </div>

      {allVerified && status.completedAt && (
        <div style={styles.completedBanner}>
          <svg
            style={styles.checkIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <div>
            <p style={styles.completedTitle}>Verification Complete!</p>
            <p style={styles.completedDate}>
              Completed on {new Date(status.completedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {!allVerified && (
        <div style={styles.incompleteBanner}>
          <p style={styles.incompleteText}>
            Some verification steps are still pending. Please complete the
            verification process.
          </p>
        </div>
      )}
    </div>
  );
}

interface VerificationBadgeProps {
  label: string;
  verified: boolean;
}

function VerificationBadge({ label, verified }: VerificationBadgeProps) {
  return (
    <div
      style={{
        ...styles.badge,
        ...(verified ? styles.badgeVerified : styles.badgePending),
      }}
    >
      <div style={styles.badgeIcon}>
        {verified ? (
          <svg
            style={styles.icon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            style={styles.icon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </div>
      <div>
        <p style={styles.badgeLabel}>{label}</p>
        <p style={styles.badgeStatus}>
          {verified ? 'Verified' : 'Not Verified'}
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    marginTop: '2rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600' as const,
    marginBottom: '1rem',
    color: '#1a1a1a',
  },
  loadingText: {
    color: '#666',
    textAlign: 'center' as const,
    padding: '2rem',
  },
  notStarted: {
    backgroundColor: '#F5F5F5',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
  },
  notStartedText: {
    color: '#666',
    textAlign: 'center' as const,
    margin: 0,
  },
  badgeContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    borderRadius: '8px',
    border: '2px solid',
  },
  badgeVerified: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  badgePending: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  badgeIcon: {
    flexShrink: 0,
  },
  icon: {
    width: '24px',
    height: '24px',
  },
  badgeLabel: {
    fontSize: '0.875rem',
    fontWeight: '600' as const,
    color: '#1a1a1a',
    margin: 0,
    marginBottom: '0.25rem',
  },
  badgeStatus: {
    fontSize: '0.75rem',
    color: '#666',
    margin: 0,
  },
  completedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: '#E8F5E9',
    border: '2px solid #4CAF50',
    borderRadius: '8px',
    padding: '1.5rem',
  },
  checkIcon: {
    width: '32px',
    height: '32px',
    color: '#4CAF50',
    flexShrink: 0,
  },
  completedTitle: {
    fontSize: '1.125rem',
    fontWeight: '600' as const,
    color: '#2E7D32',
    margin: 0,
    marginBottom: '0.25rem',
  },
  completedDate: {
    fontSize: '0.875rem',
    color: '#558B2F',
    margin: 0,
  },
  incompleteBanner: {
    backgroundColor: '#FFF3E0',
    border: '2px solid #FF9800',
    borderRadius: '8px',
    padding: '1rem',
  },
  incompleteText: {
    color: '#E65100',
    margin: 0,
    fontSize: '0.875rem',
  },
};
