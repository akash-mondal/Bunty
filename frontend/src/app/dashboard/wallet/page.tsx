'use client';

import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import WalletConnector from '@/components/WalletConnector';

export default function WalletPage() {
  return (
    <DashboardLayout>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
          Wallet Connection
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '32px' }}>
          Connect your Lace Wallet to sign and submit zero-knowledge proofs to the Midnight Network.
        </p>

        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#1e40af' }}>
            Why Connect a Wallet?
          </h3>
          <ul style={{ marginLeft: '20px', color: '#1e40af', fontSize: '14px', lineHeight: '1.6' }}>
            <li>Sign transactions to submit proofs to the blockchain</li>
            <li>Maintain full control over your proof submissions</li>
            <li>Verify your identity on the Midnight Network</li>
            <li>Enable verifiers to check your credentials without accessing your data</li>
          </ul>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Lace Wallet
          </h2>
          <WalletConnector />
        </div>

        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '8px',
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#92400e' }}>
            Important Notes
          </h3>
          <ul style={{ marginLeft: '20px', color: '#92400e', fontSize: '13px', lineHeight: '1.6' }}>
            <li>Make sure you&apos;re connected to the correct network (testnet for development)</li>
            <li>Keep your wallet secure and never share your seed phrase</li>
            <li>Transaction fees will be deducted from your wallet balance</li>
            <li>You can disconnect your wallet at any time</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
