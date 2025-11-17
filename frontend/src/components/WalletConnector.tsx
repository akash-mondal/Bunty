'use client';

import React, { useState } from 'react';
import { useWalletConnection } from '@/hooks/useWalletConnection';

export default function WalletConnector() {
  const {
    wallet,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    refreshBalance,
    isRefreshingBalance,
  } = useWalletConnection();

  const [showDetails, setShowDetails] = useState(false);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatBalance = (balance?: number) => {
    if (balance === undefined) return '0.00';
    return balance.toFixed(2);
  };

  if (!isConnected) {
    return (
      <div className="wallet-connector">
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="connect-button"
          style={{
            padding: '12px 24px',
            backgroundColor: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isConnecting ? 'not-allowed' : 'pointer',
            opacity: isConnecting ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
        >
          {isConnecting ? 'Connecting...' : 'Connect Lace Wallet'}
        </button>

        {error && (
          <div
            className="error-message"
            style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        <div
          className="wallet-info"
          style={{
            marginTop: '12px',
            fontSize: '14px',
            color: '#6b7280',
          }}
        >
          Don&apos;t have Lace Wallet?{' '}
          <a
            href="https://www.lace.io/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#6366f1', textDecoration: 'underline' }}
          >
            Install it here
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-connected">
      <div
        className="wallet-card"
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '16px',
          backgroundColor: 'white',
        }}
      >
        {/* Connection Status Indicator */}
        <div
          className="status-indicator"
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              marginRight: '8px',
            }}
          />
          <span style={{ fontSize: '14px', color: '#10b981', fontWeight: '600' }}>
            Connected
          </span>
          <span
            style={{
              marginLeft: '8px',
              fontSize: '12px',
              color: '#6b7280',
              textTransform: 'capitalize',
            }}
          >
            ({wallet?.network})
          </span>
        </div>

        {/* Wallet Address */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            Address
          </div>
          <div
            style={{
              fontSize: '14px',
              fontFamily: 'monospace',
              color: '#111827',
              wordBreak: 'break-all',
            }}
          >
            {showDetails ? wallet?.address : formatAddress(wallet?.address || '')}
          </div>
        </div>

        {/* Wallet Balance */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Balance
              </div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>
                {formatBalance(wallet?.balance)} ADA
              </div>
            </div>
            <button
              onClick={refreshBalance}
              disabled={isRefreshingBalance}
              style={{
                padding: '6px 12px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: isRefreshingBalance ? 'not-allowed' : 'pointer',
                opacity: isRefreshingBalance ? 0.6 : 1,
              }}
            >
              {isRefreshingBalance ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              flex: 1,
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
          <button
            onClick={disconnect}
            style={{
              flex: 1,
              padding: '8px 16px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Disconnect
          </button>
        </div>

        {error && (
          <div
            className="error-message"
            style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
