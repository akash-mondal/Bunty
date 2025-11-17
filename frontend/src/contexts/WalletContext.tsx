'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { walletService } from '@/services/wallet.service';
import { WalletConnection, WalletContextType, TransactionData } from '@/types/wallet.types';

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if wallet was previously connected
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await walletService.isConnected();
        if (isConnected) {
          // Auto-reconnect if previously connected
          await connect();
        }
      } catch (err) {
        console.error('Failed to check wallet connection:', err);
      }
    };

    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const connection = await walletService.connect();
      setWallet(connection);
      
      // Store connection state in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('walletConnected', 'true');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect wallet';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    walletService.disconnect();
    setWallet(null);
    setError(null);
    
    // Clear connection state from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('walletConnected');
    }
  }, []);

  const signTransaction = useCallback(
    async (txData: TransactionData): Promise<string> => {
      if (!wallet) {
        throw new Error('Wallet not connected');
      }

      try {
        setError(null);
        const signedTx = await walletService.signTransaction(txData);
        return signedTx;
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to sign transaction';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [wallet]
  );

  const getBalance = useCallback(async (): Promise<number> => {
    if (!wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const balance = await walletService.getBalance();
      
      // Update wallet state with new balance
      setWallet((prev) => (prev ? { ...prev, balance } : null));
      
      return balance;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get balance';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [wallet]);

  const value: WalletContextType = {
    wallet,
    isConnecting,
    error,
    connect,
    disconnect,
    signTransaction,
    getBalance,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
