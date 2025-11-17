'use client';

import { useState, useEffect, useRef } from 'react';
import { identityService } from '@/services/identity.service';

interface PersonaIdentityProps {
  onVerificationComplete?: () => void;
  onError?: (error: Error) => void;
}

// Declare Persona types for the embedded component
declare global {
  interface Window {
    Persona?: {
      Client: new (config: PersonaClientConfig) => PersonaClient;
    };
  }
}

interface PersonaClientConfig {
  inquiryId: string;
  sessionToken: string;
  environment: string;
  onComplete?: (data: { inquiryId: string; status: string }) => void;
  onError?: (error: { message: string; code?: string }) => void;
  onCancel?: () => void;
}

interface PersonaClient {
  open: () => void;
  close: () => void;
}

export function PersonaIdentity({
  onVerificationComplete,
  onError,
}: PersonaIdentityProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const clientRef = useRef<PersonaClient | null>(null);

  // Handle responsive design
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Load Persona Embedded Client SDK
  useEffect(() => {
    // Check if SDK is already loaded
    if (window.Persona) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.withpersona.com/dist/persona-v4.9.0.js';
    script.async = true;
    script.onload = () => {
      setSdkLoaded(true);
    };
    script.onerror = () => {
      setError('Failed to load Persona SDK');
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleStartVerification = async () => {
    if (!sdkLoaded) {
      setError('Persona SDK is not loaded yet. Please try again.');
      return;
    }

    if (!window.Persona) {
      setError('Persona SDK is not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create inquiry via backend API
      const { inquiryId, sessionToken } =
        await identityService.createVerificationSession();

      if (!inquiryId || !sessionToken) {
        throw new Error('Failed to create verification session');
      }

      // Initialize Persona client
      const client = new window.Persona.Client({
        inquiryId,
        sessionToken,
        environment: process.env.NEXT_PUBLIC_PERSONA_ENVIRONMENT || 'sandbox',
        onComplete: ({ inquiryId: completedInquiryId, status }) => {
          console.log('Verification completed:', {
            inquiryId: completedInquiryId,
            status,
          });
          clientRef.current = null;
          onVerificationComplete?.();
        },
        onError: (error) => {
          console.error('Verification error:', error);
          const errorMessage = error.message || 'Verification failed';
          setError(errorMessage);
          clientRef.current = null;
          onError?.(new Error(errorMessage));
        },
        onCancel: () => {
          console.log('Verification cancelled by user');
          clientRef.current = null;
          setError('Verification was cancelled');
        },
      });

      clientRef.current = client;
      client.open();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to start verification';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const containerStyle = {
    ...styles.container,
    ...(isMobile ? styles.containerMobile : {}),
  };

  const buttonStyle = {
    ...styles.button,
    ...(isLoading || !sdkLoaded ? styles.buttonDisabled : {}),
    ...(isMobile ? styles.buttonMobile : {}),
  };

  const errorStyle = {
    ...styles.error,
    ...(isMobile ? styles.errorMobile : {}),
  };

  const infoStyle = {
    ...styles.info,
    ...(isMobile ? styles.infoMobile : {}),
  };

  return (
    <div style={containerStyle}>
      <button
        onClick={handleStartVerification}
        disabled={isLoading || !sdkLoaded}
        style={buttonStyle}
        onMouseEnter={(e) => {
          if (!isLoading && sdkLoaded) {
            e.currentTarget.style.backgroundColor = '#5145E5';
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading && sdkLoaded) {
            e.currentTarget.style.backgroundColor = '#635BFF';
          }
        }}
      >
        {isLoading
          ? 'Starting Verification...'
          : !sdkLoaded
          ? 'Loading...'
          : 'Start Identity Verification'}
      </button>

      {error && (
        <div style={errorStyle}>
          <div style={styles.errorIcon}>⚠</div>
          <div style={styles.errorContent}>
            <p style={styles.errorText}>{error}</p>
          </div>
        </div>
      )}

      <div style={infoStyle}>
        <div style={styles.infoIcon}>ℹ</div>
        <div style={styles.infoContent}>
          <p style={styles.infoTitle}>What you'll need:</p>
          <ul style={styles.infoList}>
            <li style={styles.infoListItem}>
              A valid government-issued ID (passport, driver's license, or national ID)
            </li>
            <li style={styles.infoListItem}>
              Access to your device's camera for selfie verification
            </li>
            <li style={styles.infoListItem}>
              Your government ID number (e.g., SSN)
            </li>
          </ul>
          <p style={styles.infoFooter}>
            The verification process typically takes 2-3 minutes to complete.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
    maxWidth: '600px',
    width: '100%',
  },
  containerMobile: {
    gap: '0.75rem',
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
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    width: '100%',
  },
  buttonMobile: {
    padding: '0.875rem 1rem',
    fontSize: '0.9375rem',
  },
  buttonDisabled: {
    backgroundColor: '#9E9E9E',
    cursor: 'not-allowed',
    opacity: 0.6,
    boxShadow: 'none',
  },
  error: {
    backgroundColor: '#FEE2E2',
    border: '1px solid #FECACA',
    borderRadius: '6px',
    padding: '1rem',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
  },
  errorMobile: {
    padding: '0.75rem',
    gap: '0.5rem',
  },
  errorIcon: {
    fontSize: '1.25rem',
    color: '#DC2626',
    flexShrink: 0,
  },
  errorContent: {
    flex: 1,
  },
  errorText: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#991B1B',
    lineHeight: '1.5',
  },
  info: {
    backgroundColor: '#F0F4FF',
    border: '1px solid #C7D7FE',
    borderRadius: '6px',
    padding: '1rem',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
  },
  infoMobile: {
    padding: '0.75rem',
    gap: '0.5rem',
  },
  infoIcon: {
    fontSize: '1.25rem',
    color: '#4338CA',
    flexShrink: 0,
    fontWeight: '700' as const,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '0.875rem',
    fontWeight: '600' as const,
    color: '#312E81',
  },
  infoList: {
    margin: '0 0 0.75rem 0',
    paddingLeft: '1.25rem',
    fontSize: '0.875rem',
    color: '#4338CA',
    lineHeight: '1.6',
  },
  infoListItem: {
    marginBottom: '0.25rem',
  },
  infoFooter: {
    margin: 0,
    fontSize: '0.75rem',
    color: '#6366F1',
    fontStyle: 'italic' as const,
  },
};
