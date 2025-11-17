# Lace Wallet Integration Guide

## Overview
This guide explains how to use the Lace Wallet integration in the Bunty platform for signing and submitting zero-knowledge proofs to the Midnight Network.

## Prerequisites
- Lace Wallet browser extension installed ([Download here](https://www.lace.io/))
- Wallet configured with testnet for development
- Some test ADA in wallet for transaction fees

## Using the Wallet Integration

### 1. Connecting Your Wallet

Navigate to the Wallet page in the dashboard:
```
Dashboard → Wallet
```

Click the "Connect Lace Wallet" button. The Lace Wallet extension will prompt you to:
1. Approve the connection request
2. Select which wallet to connect (if you have multiple)
3. Grant permissions to the application

Once connected, you'll see:
- Your wallet address (truncated for privacy)
- Current ADA balance
- Network status (testnet/mainnet)
- Connection status indicator (green dot)

### 2. Using Wallet in Your Components

#### Import the Hook
```typescript
import { useWallet } from '@/contexts/WalletContext';
```

#### Access Wallet State
```typescript
const { wallet, isConnecting, error, connect, disconnect, signTransaction } = useWallet();

// Check if connected
if (wallet?.connected) {
  console.log('Wallet address:', wallet.address);
  console.log('Balance:', wallet.balance, 'ADA');
  console.log('Network:', wallet.network);
}
```

#### Connect to Wallet
```typescript
const handleConnect = async () => {
  try {
    await connect();
    console.log('Wallet connected successfully!');
  } catch (error) {
    console.error('Failed to connect:', error.message);
  }
};
```

#### Sign a Transaction
```typescript
const handleSignTransaction = async () => {
  if (!wallet?.connected) {
    alert('Please connect your wallet first');
    return;
  }

  try {
    const txData = {
      to: 'recipient_address',
      value: '1000000', // Amount in lovelace
      data: 'optional_data',
    };

    const signedTx = await signTransaction(txData);
    console.log('Transaction signed:', signedTx);
    
    // Submit to backend
    // await submitToBackend(signedTx);
  } catch (error) {
    console.error('Failed to sign transaction:', error.message);
  }
};
```

#### Disconnect Wallet
```typescript
const handleDisconnect = () => {
  disconnect();
  console.log('Wallet disconnected');
};
```

### 3. Using the Wallet Connector Component

The `WalletConnector` component provides a complete UI for wallet management:

```typescript
import WalletConnector from '@/components/WalletConnector';

export default function MyPage() {
  return (
    <div>
      <h1>My Page</h1>
      <WalletConnector />
    </div>
  );
}
```

Features:
- Automatic detection of Lace Wallet installation
- Connect/disconnect buttons
- Address display (with show/hide details)
- Balance display with refresh button
- Network indicator
- Connection status indicator
- Error messages
- Installation link if wallet not found

### 4. Submitting Proofs with Wallet Signature

After generating a zero-knowledge proof, submit it to the blockchain:

```typescript
import { useWallet } from '@/contexts/WalletContext';
import { proofService } from '@/services/proof.service';

const handleSubmitProof = async (proof: ZKProof) => {
  const { wallet, signTransaction } = useWallet();
  
  if (!wallet?.connected) {
    alert('Please connect your wallet first');
    return;
  }

  try {
    // Prepare transaction data
    const txData = {
      to: 'midnight_contract_address',
      value: '0',
      data: JSON.stringify(proof),
    };

    // Sign with wallet
    const signature = await signTransaction(txData);

    // Submit to backend
    const result = await proofService.submitProof(
      proof,
      signature,
      wallet.address
    );

    console.log('Proof submitted!');
    console.log('Transaction hash:', result.txHash);
    console.log('Proof ID:', result.proofId);
    
    return result;
  } catch (error) {
    console.error('Failed to submit proof:', error.message);
    throw error;
  }
};
```

### 5. Checking Proof Status

After submission, check the status:

```typescript
import { proofService } from '@/services/proof.service';

const checkProofStatus = async (proofId: string) => {
  try {
    const status = await proofService.getProofStatus(proofId);
    
    console.log('Status:', status.status); // 'pending' | 'confirmed' | 'failed'
    console.log('Transaction hash:', status.txHash);
    console.log('Submitted at:', status.submittedAt);
    
    if (status.status === 'confirmed') {
      console.log('Confirmed at:', status.confirmedAt);
      console.log('Expires at:', status.expiresAt);
    }
    
    return status;
  } catch (error) {
    console.error('Failed to get proof status:', error.message);
    throw error;
  }
};
```

## Wallet Service API

### Methods

#### `isLaceInstalled(): boolean`
Check if Lace Wallet extension is installed.

#### `connect(): Promise<WalletConnection>`
Connect to the wallet and request permissions.

#### `disconnect(): void`
Disconnect from the wallet.

#### `getAddress(): string | null`
Get the current wallet address.

#### `getBalance(): Promise<number>`
Get the current wallet balance in ADA.

#### `signTransaction(txData: TransactionData): Promise<string>`
Sign a transaction with the wallet.

#### `submitTransaction(signedTx: string): Promise<string>`
Submit a signed transaction to the blockchain.

#### `signData(payload: string): Promise<{ signature: string; key: string }>`
Sign arbitrary data (useful for proof verification).

#### `isConnected(): Promise<boolean>`
Check if the wallet is currently connected.

## Error Handling

Common errors and how to handle them:

### Wallet Not Installed
```typescript
if (!walletService.isLaceInstalled()) {
  alert('Please install Lace Wallet from https://www.lace.io/');
  return;
}
```

### Connection Refused
```typescript
try {
  await connect();
} catch (error) {
  if (error.message.includes('User declined')) {
    alert('Connection was declined. Please approve the connection request.');
  }
}
```

### Insufficient Balance
```typescript
const balance = await getBalance();
if (balance < requiredAmount) {
  alert(`Insufficient balance. You need at least ${requiredAmount} ADA.`);
  return;
}
```

### Transaction Signing Failed
```typescript
try {
  const signedTx = await signTransaction(txData);
} catch (error) {
  if (error.message.includes('User declined')) {
    alert('Transaction signing was cancelled.');
  } else {
    alert('Failed to sign transaction: ' + error.message);
  }
}
```

## Security Best Practices

1. **Never Store Private Keys**: Private keys always remain in the wallet extension
2. **Validate Network**: Always check you're on the correct network (testnet/mainnet)
3. **Verify Addresses**: Double-check recipient addresses before signing
4. **Check Balances**: Ensure sufficient balance before attempting transactions
5. **Handle Errors**: Always wrap wallet operations in try-catch blocks
6. **User Consent**: Always get explicit user approval for transactions

## Testing

### Manual Testing Checklist
- [ ] Install Lace Wallet extension
- [ ] Configure wallet for testnet
- [ ] Add test ADA to wallet
- [ ] Navigate to Wallet page
- [ ] Click "Connect Lace Wallet"
- [ ] Approve connection in extension
- [ ] Verify address and balance display
- [ ] Test balance refresh
- [ ] Test show/hide address details
- [ ] Test disconnect functionality
- [ ] Reload page and verify auto-reconnect
- [ ] Test transaction signing (when Task 16 is complete)

### Development Mode
For development, use the Midnight testnet:
- Network ID: 0 (testnet)
- Get test ADA from faucet
- Use testnet explorer for transaction verification

## Troubleshooting

### Wallet Not Detected
- Ensure Lace Wallet extension is installed
- Refresh the page
- Check browser console for errors
- Try disabling other wallet extensions

### Connection Fails
- Check if wallet is unlocked
- Ensure you're approving the connection request
- Try disconnecting and reconnecting
- Clear browser cache and try again

### Balance Not Updating
- Click the "Refresh" button
- Check wallet extension directly
- Ensure you're on the correct network
- Wait for blockchain sync

### Transaction Signing Fails
- Ensure sufficient balance for fees
- Check transaction data is valid
- Verify you're on the correct network
- Try signing again

## Next Steps

With the wallet integration complete, you can now:
1. Generate zero-knowledge proofs (Task 14 ✓)
2. Sign transactions with your wallet (Task 15 ✓)
3. Submit proofs to the blockchain (Task 16 - Next)
4. Query proof status from the indexer (Task 17)
5. Enable verifiers to check your credentials (Task 18)

## Resources

- [Lace Wallet Website](https://www.lace.io/)
- [CIP-30 Standard](https://cips.cardano.org/cips/cip30/)
- [Cardano Documentation](https://docs.cardano.org/)
- [Midnight Network Docs](https://midnight.network/docs)

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify Lace Wallet is properly installed and configured
3. Ensure you're on the correct network (testnet for development)
4. Check that you have sufficient test ADA for transactions
5. Review the error handling section above
