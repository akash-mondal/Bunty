'use client';

import { useCallback, useState } from 'react';
import { usePlaidLink, PlaidLinkOnSuccess, PlaidLinkOptions } from 'react-plaid-link';
import { plaidService } from '@/services/plaid.service';

interface PlaidLinkProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function PlaidLink({ onSuccess, onError }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Plaid Link
  const handleOnSuccess: PlaidLinkOnSuccess = useCallback(
    async (publicToken: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // Exchange public token for access token
        await plaidService.exchangePublicToken(publicToken);
        
        // Call success callback
        if (onSuccess) {
          onSuccess();
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect account';
        setError(errorMessage);
        
        if (onError) {
          onError(err instanceof Error ? err : new Error(errorMessage));
        }
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, onError]
  );

  const config: PlaidLinkOptions = {
    token: linkToken,
    onSuccess: handleOnSuccess,
    onExit: (err) => {
      if (err) {
        const errorMessage = err.error_message || 'Plaid Link was closed';
        setError(errorMessage);
        
        if (onError) {
          onError(new Error(errorMessage));
        }
      }
    },
  };

  const { open, ready } = usePlaidLink(config);

  // Fetch link token and open Plaid Link
  const handleOpenLink = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await plaidService.createLinkToken();
      setLinkToken(token);
      
      // Wait a bit for the link to be ready, then open
      setTimeout(() => {
        if (ready) {
          open();
        }
      }, 100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Plaid Link';
      setError(errorMessage);
      
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Open link if token is set and ready
  const handleClick = () => {
    if (linkToken && ready) {
      open();
    } else {
      handleOpenLink();
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isLoading}
        style={{
          ...styles.button,
          ...(isLoading ? styles.buttonDisabled : {}),
        }}
      >
        {isLoading ? 'Connecting...' : 'Connect Bank Account'}
      </button>
      
      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}
    </div>
  );
}

const styles = {
  button: {
    backgroundColor: '#4F46E5',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    cursor: 'not-allowed',
  },
  error: {
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: '8px',
    fontSize: '0.875rem',
  },
};
