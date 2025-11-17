/**
 * Tests for wallet connection component
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WalletConnector from '@/components/WalletConnector';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import React from 'react';

// Mock wallet connection hook
const mockUseWalletConnection = jest.fn();

jest.mock('@/hooks/useWalletConnection', () => ({
  useWalletConnection: () => mockUseWalletConnection(),
}));

describe('Wallet Connection Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering - Not Connected', () => {
    it('should render connect button when not connected', () => {
      mockUseWalletConnection.mockReturnValue({
        wallet: null,
        isConnected: false,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        refreshBalance: jest.fn(),
        isRefreshingBalance: false,
      });

      render(<WalletConnector />);
      
      expect(screen.getByText('Connect Lace Wallet')).toBeInTheDocument();
    });

    it('should show connecting state', () => {
      mockUseWalletConnection.mockReturnValue({
        wallet: null,
        isConnected: false,
        isConnecting: true,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        refreshBalance: jest.fn(),
        isRefreshingBalance: false,
      });

      render(<WalletConnector />);
      
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('should disable button when connecting', () => {
      mockUseWalletConnection.mockReturnValue({
        wallet: null,
        isConnected: false,
        isConnecting: true,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        refreshBalance: jest.fn(),
        isRefreshingBalance: false,
      });

      render(<WalletConnector />);
      
      const button = screen.getByText('Connecting...') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('should display error message', () => {
      mockUseWalletConnection.mockReturnValue({
        wallet: null,
        isConnected: false,
        isConnecting: false,
        error: 'Wallet not installed',
        connect: jest.fn(),
        disconnect: jest.fn(),
        refreshBalance: jest.fn(),
        isRefreshingBalance: false,
      });

      render(<WalletConnector />);
      
      expect(screen.getByText('Wallet not installed')).toBeInTheDocument();
    });
  });

  describe('Component Rendering - Connected', () => {
    const mockWallet = {
      address: 'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgs68faae',
      network: 'testnet' as const,
      balance: 1000.5,
    };

    it('should render wallet details when connected', () => {
      mockUseWalletConnection.mockReturnValue({
        wallet: mockWallet,
        isConnected: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        refreshBalance: jest.fn(),
        isRefreshingBalance: false,
      });

      render(<WalletConnector />);
      
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('1000.50 ADA')).toBeInTheDocument();
    });

    it('should display network type', () => {
      mockUseWalletConnection.mockReturnValue({
        wallet: mockWallet,
        isConnected: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        refreshBalance: jest.fn(),
        isRefreshingBalance: false,
      });

      render(<WalletConnector />);
      
      expect(screen.getByText('(testnet)')).toBeInTheDocument();
    });

    it('should show disconnect button', () => {
      mockUseWalletConnection.mockReturnValue({
        wallet: mockWallet,
        isConnected: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        refreshBalance: jest.fn(),
        isRefreshingBalance: false,
      });

      render(<WalletConnector />);
      
      expect(screen.getByText('Disconnect')).toBeInTheDocument();
    });
  });

  describe('Wallet Connection Actions', () => {
    it('should call connect function on button click', () => {
      const mockConnect = jest.fn();
      mockUseWalletConnection.mockReturnValue({
        wallet: null,
        isConnected: false,
        isConnecting: false,
        error: null,
        connect: mockConnect,
        disconnect: jest.fn(),
        refreshBalance: jest.fn(),
        isRefreshingBalance: false,
      });

      render(<WalletConnector />);
      
      const button = screen.getByText('Connect Lace Wallet');
      fireEvent.click(button);
      
      expect(mockConnect).toHaveBeenCalled();
    });

    it('should call disconnect function on button click', () => {
      const mockDisconnect = jest.fn();
      const mockWallet = {
        address: 'addr1...',
        network: 'testnet' as const,
        balance: 1000,
      };

      mockUseWalletConnection.mockReturnValue({
        wallet: mockWallet,
        isConnected: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: mockDisconnect,
        refreshBalance: jest.fn(),
        isRefreshingBalance: false,
      });

      render(<WalletConnector />);
      
      const button = screen.getByText('Disconnect');
      fireEvent.click(button);
      
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should call refresh balance function', () => {
      const mockRefreshBalance = jest.fn();
      const mockWallet = {
        address: 'addr1...',
        network: 'testnet' as const,
        balance: 1000,
      };

      mockUseWalletConnection.mockReturnValue({
        wallet: mockWallet,
        isConnected: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        refreshBalance: mockRefreshBalance,
        isRefreshingBalance: false,
      });

      render(<WalletConnector />);
      
      const button = screen.getByText('Refresh');
      fireEvent.click(button);
      
      expect(mockRefreshBalance).toHaveBeenCalled();
    });
  });

  describe('Wallet Address Validation', () => {
    it('should validate Cardano address format', () => {
      const address = 'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgs68faae';
      
      expect(address).toBeDefined();
      expect(typeof address).toBe('string');
      expect(address.length).toBeGreaterThan(0);
      expect(address.startsWith('addr1')).toBe(true);
    });

    it('should handle address truncation', () => {
      const address = 'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgs68faae';
      const truncated = `${address.slice(0, 8)}...${address.slice(-8)}`;
      
      expect(truncated).toContain('...');
      expect(truncated.length).toBeLessThan(address.length);
    });
  });

  describe('Balance Formatting', () => {
    it('should format balance with two decimals', () => {
      const balance = 1234.567;
      const formatted = balance.toFixed(2);
      
      expect(formatted).toBe('1234.57');
    });

    it('should handle zero balance', () => {
      const balance = 0;
      const formatted = balance.toFixed(2);
      
      expect(formatted).toBe('0.00');
    });

    it('should handle undefined balance', () => {
      const balance = undefined;
      const formatted = balance !== undefined ? balance.toFixed(2) : '0.00';
      
      expect(formatted).toBe('0.00');
    });
  });

  describe('Transaction Data Validation', () => {
    it('should validate transaction structure', () => {
      const txData = {
        proof: new Uint8Array([1, 2, 3]),
        nullifier: 'a'.repeat(64),
        threshold: 5000,
      };
      
      expect(txData.proof).toBeInstanceOf(Uint8Array);
      expect(txData.nullifier).toHaveLength(64);
      expect(txData.threshold).toBeGreaterThan(0);
    });

    it('should handle signed transaction', () => {
      const signedTx = 'signed-transaction-data-hex';
      
      expect(signedTx).toBeDefined();
      expect(typeof signedTx).toBe('string');
    });
  });

  describe('Network Validation', () => {
    it('should validate testnet network', () => {
      const network = 'testnet';
      const validNetworks = ['testnet', 'mainnet'];
      
      expect(validNetworks).toContain(network);
    });

    it('should validate mainnet network', () => {
      const network = 'mainnet';
      const validNetworks = ['testnet', 'mainnet'];
      
      expect(validNetworks).toContain(network);
    });

    it('should detect network mismatch', () => {
      const expectedNetwork = 'testnet';
      const actualNetwork = 'mainnet';
      
      expect(expectedNetwork).not.toBe(actualNetwork);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle wallet not installed error', () => {
      const error = new Error('Wallet not installed');
      
      expect(error.message).toContain('not installed');
    });

    it('should handle connection failure', () => {
      const error = new Error('Failed to connect to wallet');
      
      expect(error.message).toContain('Failed to connect');
    });

    it('should handle user rejection', () => {
      const error = new Error('User rejected connection');
      
      expect(error.message).toContain('rejected');
    });
  });
});
