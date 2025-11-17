'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PersonaIdentity } from '@/components/PersonaIdentity';
import { VerificationStatus as VerificationStatusComponent } from '@/components/VerificationStatus';
import { identityService } from '@/services/identity.service';
import { VerificationStatus } from '@/types/identity.types';

export default function VerificationPage() {
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Fetch verification status
  const fetchVerificationStatus = useCallback(async () => {
    try {
      const status = await identityService.getVerificationStatus();
      setVerificationStatus(status);
      setIsLoading(false);

      // Check if verification is complete
      if (
        status &&
        status.ssnVerified &&
        status.selfieVerified &&
        status.documentVerified &&
        status.completedAt
      ) {
        setIsPolling(false);
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchVerificationStatus();
  }, [fetchVerificationStatus]);

  // Polling logic - poll every 5 seconds when verification is in progress
  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(() => {
      fetchVerificationStatus();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [isPolling, fetchVerificationStatus]);

  // Handle verification completion
  const handleVerificationComplete = () => {
    setNotification({
      type: 'success',
      message:
        'Verification submitted successfully! Please wait while we process your information.',
    });

    // Start polling for status updates
    setIsPolling(true);

    // Fetch status immediately
    fetchVerificationStatus();

    // Auto-dismiss notification after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Handle verification error
  const handleVerificationError = (error: Error) => {
    setNotification({
      type: 'error',
      message: `Verification failed: ${error.message}`,
    });

    // Auto-dismiss notification after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Dismiss notification manually
  const dismissNotification = () => {
    setNotification(null);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div>
          <h1 style={styles.title}>Identity Verification</h1>
          <p style={styles.subtitle}>
            Complete KYC verification to prove your identity without sharing
            documents directly with verifiers.
          </p>

          {/* Notification Banner */}
          {notification && (
            <div
              style={{
                ...styles.notification,
                ...(notification.type === 'success'
                  ? styles.notificationSuccess
                  : styles.notificationError),
              }}
            >
              <div style={styles.notificationContent}>
                <p style={styles.notificationMessage}>{notification.message}</p>
                <button
                  onClick={dismissNotification}
                  style={styles.notificationClose}
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Main Card */}
          <div style={styles.card}>
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Start Verification</h2>
              <p style={styles.sectionDescription}>
                Click the button below to begin the identity verification
                process. You'll need a valid government-issued ID and access to
                your device's camera.
              </p>

              <PersonaIdentity
                onVerificationComplete={handleVerificationComplete}
                onError={handleVerificationError}
              />
            </div>

            {/* Verification Status Display */}
            <VerificationStatusComponent
              status={verificationStatus}
              isLoading={isLoading}
            />

            {/* Polling Indicator */}
            {isPolling && (
              <div style={styles.pollingIndicator}>
                <div style={styles.spinner}></div>
                <p style={styles.pollingText}>
                  Checking verification status...
                </p>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div style={styles.infoCard}>
            <h3 style={styles.infoTitle}>What to Expect</h3>
            <ul style={styles.infoList}>
              <li style={styles.infoItem}>
                <strong>Document Verification:</strong> You'll be asked to
                upload a photo of your government-issued ID (driver's license,
                passport, etc.)
              </li>
              <li style={styles.infoItem}>
                <strong>Selfie Verification:</strong> Take a selfie to confirm
                your identity matches your ID
              </li>
              <li style={styles.infoItem}>
                <strong>SSN Verification:</strong> Your Social Security Number
                will be verified against official records
              </li>
              <li style={styles.infoItem}>
                <strong>Privacy:</strong> Your verification data is processed
                securely and never shared with third parties
              </li>
            </ul>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

const styles = {
  title: {
    fontSize: '2rem',
    fontWeight: 'bold' as const,
    marginBottom: '0.5rem',
    color: '#1a1a1a',
  },
  subtitle: {
    color: '#666',
    marginBottom: '2rem',
    lineHeight: '1.5',
  },
  notification: {
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem',
    border: '2px solid',
  },
  notificationSuccess: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  notificationError: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  notificationContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationMessage: {
    margin: 0,
    color: '#1a1a1a',
    fontSize: '0.875rem',
  },
  notificationClose: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#666',
    padding: '0 0.5rem',
  },
  card: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    marginBottom: '1.5rem',
  },
  section: {
    marginBottom: '2rem',
    paddingBottom: '2rem',
    borderBottom: '1px solid #E0E0E0',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600' as const,
    marginBottom: '0.5rem',
    color: '#1a1a1a',
  },
  sectionDescription: {
    color: '#666',
    marginBottom: '1.5rem',
    lineHeight: '1.5',
  },
  pollingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginTop: '1.5rem',
    padding: '1rem',
    backgroundColor: '#F5F5F5',
    borderRadius: '8px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid #E0E0E0',
    borderTop: '3px solid #635BFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  pollingText: {
    margin: 0,
    color: '#666',
    fontSize: '0.875rem',
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
  },
  infoTitle: {
    fontSize: '1.125rem',
    fontWeight: '600' as const,
    marginBottom: '1rem',
    color: '#1a1a1a',
  },
  infoList: {
    margin: 0,
    paddingLeft: '1.5rem',
    color: '#666',
  },
  infoItem: {
    marginBottom: '0.75rem',
    lineHeight: '1.5',
  },
};
