import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';

/**
 * Hook for managing wallet connection state and operations
 */
export function useWalletConnection() {
  const { wallet, isConnecting, error, connect, disconnect, getBalance } = useWallet();
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);

  // Refresh balance periodically when connected
  useEffect(() => {
    if (!wallet?.connected) return;

    const refreshBalance = async () => {
      try {
        await getBalance();
      } catch (err) {
        console.error('Failed to refresh balance:', err);
      }
    };

    // Refresh balance every 30 seconds
    const interval = setInterval(refreshBalance, 30000);

    return () => clearInterval(interval);
  }, [wallet?.connected, getBalance]);

  const handleConnect = useCallback(async () => {
    try {
      await connect();
    } catch (err) {
      console.error('Connection error:', err);
      // Error is already set in context
    }
  }, [connect]);

  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const refreshBalance = useCallback(async () => {
    if (!wallet?.connected) return;

    setIsRefreshingBalance(true);
    try {
      await getBalance();
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    } finally {
      setIsRefreshingBalance(false);
    }
  }, [wallet?.connected, getBalance]);

  return {
    wallet,
    isConnected: wallet?.connected || false,
    isConnecting,
    error,
    connect: handleConnect,
    disconnect: handleDisconnect,
    refreshBalance,
    isRefreshingBalance,
  };
}
