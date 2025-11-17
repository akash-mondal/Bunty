'use client';

import { useState, useEffect, useRef } from 'react';
import { stripeService } from '@/services/stripe.service';

interface StripeIdentityProps {
  onVerificationComplete?: () => void;
  onError?: (error: Error) => void;
}

// Declare Stripe Identity types for the embedded component
declare global {
  interface Window {
    StripeIdentity?: any;
  }
}

export function StripeIdentity({
  onVerificationComplete,
  onError,
}: StripeIdentityProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load Stripe Identity script
  useEffect(() => {
    if (!showModal) return;

    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/identity.js';
    script.async = true;
    script.onload = () => {
      if (clientSecret && modalRef.current && window.StripeIdentity) {
        const stripeIdentity = window.StripeIdentity(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
        );

        const verificationFlow = stripeIdentity.create({
          clientSecret,
          onComplete: () => {
            setShowModal(false);
            onVerificationComplete?.();
          },
        });

        verificationFlow.mount(modalRef.current);
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [showModal, clientSecret, onVerificationComplete]);

  const handleStartVerification = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get the current URL for return
      const returnUrl = window.location.href;

      // Create verification session
      const { clientSecret: secret } =
        await stripeService.createIdentitySession(returnUrl);

      if (!secret) {
        throw new Error('Failed to create verification session');
      }

      setClientSecret(secret);
      setShowModal(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to start verification';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setClientSecret(null);
  };

  return (
    <div style={styles.container}>
      <button
        onClick={handleStartVerification}
        disabled={isLoading}
        style={{
          ...styles.button,
          ...(isLoading ? styles.buttonDisabled : {}),
        }}
      >
        {isLoading ? 'Starting Verification...' : 'Start Identity Verification'}
      </button>

      {error && (
        <div style={styles.error}>
          <p>{error}</p>
        </div>
      )}

      <div style={styles.info}>
        <p style={styles.infoText}>
          Click the button above to open the verification modal. You'll need a
          valid government-issued ID and access to your device's camera.
        </p>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={handleCloseModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button onClick={handleCloseModal} style={styles.closeButton}>
              ×
            </button>
            <div ref={modalRef} style={styles.modalBody}></div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  button: {
    backgroundColor: '#635BFF',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    border: 'none',
    fontSize: '1rem',
    fontWeight: '600' as const,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  buttonDisabled: {
    backgroundColor: '#9E9E9E',
    cursor: 'not-allowed',
  },
  error: {
    backgroundColor: '#FEE',
    border: '1px solid #FCC',
    borderRadius: '6px',
    padding: '1rem',
    color: '#C33',
  },
  info: {
    backgroundColor: '#F0F4FF',
    border: '1px solid #C7D7FE',
    borderRadius: '6px',
    padding: '0.75rem',
  },
  infoText: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#4338CA',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    position: 'relative' as const,
  },
  closeButton: {
    position: 'absolute' as const,
    top: '1rem',
    right: '1rem',
    background: 'none',
    border: 'none',
    fontSize: '2rem',
    cursor: 'pointer',
    color: '#666',
    lineHeight: '1',
    padding: '0',
    width: '32px',
    height: '32px',
  },
  modalBody: {
    minHeight: '400px',
  },
};
