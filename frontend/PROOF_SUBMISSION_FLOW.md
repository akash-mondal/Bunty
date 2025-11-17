# Proof Submission Flow Diagram

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PROOF GENERATION PHASE                            │
│                  (/dashboard/proofs)                                 │
│                                                                      │
│  1. User selects circuit type (Income/Assets/Creditworthiness)     │
│  2. User enters threshold amount                                    │
│  3. System validates witness data                                   │
│  4. User clicks "Generate Proof"                                    │
│  5. Proof generated locally (never leaves device)                   │
│  6. Proof displayed with nullifier and expiry                       │
│                                                                      │
│  [Generate Another Proof]  [Submit to Blockchain →]                │
│                                    │                                 │
└────────────────────────────────────┼─────────────────────────────────┘
                                     │
                                     │ Store proof in localStorage
                                     │ Navigate to submission page
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PROOF SUBMISSION PHASE                            │
│                (/dashboard/submit-proof)                             │
│                                                                      │
│  1. Load proof data from localStorage                               │
│  2. Display proof summary:                                          │
│     - Circuit Type                                                  │
│     - Threshold                                                     │
│     - Nullifier (truncated)                                         │
│     - Expiry Date                                                   │
│                                                                      │
│  3. Wallet Connection Check:                                        │
│     ┌─────────────────────────────────────┐                        │
│     │ Not Connected?                       │                        │
│     │ [Connect Lace Wallet]               │                        │
│     └─────────────────────────────────────┘                        │
│     ┌─────────────────────────────────────┐                        │
│     │ Connected ✓                          │                        │
│     │ Address: addr1...                    │                        │
│     │ Network: testnet                     │                        │
│     │ Balance: 100.00 ADA                  │                        │
│     └─────────────────────────────────────┘                        │
│                                                                      │
│  4. User clicks "Sign & Submit to Blockchain"                       │
│     │                                                                │
│     ├─► Wallet prompts for signature                               │
│     │                                                                │
│     ├─► User approves transaction                                  │
│     │                                                                │
│     ├─► POST /api/proof/submit                                     │
│     │   {                                                           │
│     │     proof: "base64...",                                       │
│     │     publicInputs: ["50000"],                                  │
│     │     publicOutputs: { nullifier, timestamp, expiresAt },      │
│     │     walletSignature: "signed_tx...",                         │
│     │     walletAddress: "addr1..."                                │
│     │   }                                                           │
│     │                                                                │
│     ├─► Backend validates and submits to Midnight Network          │
│     │                                                                │
│     └─► Returns: { txHash, proofId, status: "pending" }           │
│                                                                      │
│  5. Clear localStorage and navigate to confirmation                 │
│                                    │                                 │
└────────────────────────────────────┼─────────────────────────────────┘
                                     │
                                     │ Navigate with proofId & txHash
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  PROOF CONFIRMATION PHASE                            │
│              (/dashboard/proof-confirmation)                         │
│                                                                      │
│  1. Initial Status Display:                                         │
│     ┌─────────────────────────────────────┐                        │
│     │  ⏳ Confirming Proof...              │                        │
│     │  Your proof is being confirmed       │                        │
│     │  on the blockchain.                  │                        │
│     └─────────────────────────────────────┘                        │
│                                                                      │
│  2. Transaction Details:                                            │
│     - Transaction Hash: 0x123...abc [📋 Copy]                      │
│     - Blockchain Explorer: [View on Explorer →]                    │
│     - Status: PENDING                                               │
│     - Submitted At: Nov 17, 2025, 10:30 AM                         │
│                                                                      │
│  3. Status Polling (every 5 seconds):                               │
│     │                                                                │
│     ├─► GET /api/proof/status/:proofId                             │
│     │                                                                │
│     ├─► Backend checks Midnight Network                            │
│     │                                                                │
│     └─► Returns updated status                                     │
│                                                                      │
│  4. Status Updates:                                                 │
│     ┌─────────────────────────────────────┐                        │
│     │ Status: PENDING → CONFIRMED          │                        │
│     └─────────────────────────────────────┘                        │
│                                                                      │
│  5. Confirmed State:                                                │
│     ┌─────────────────────────────────────┐                        │
│     │  ✓ Proof Confirmed!                  │                        │
│     │  Your proof has been successfully    │                        │
│     │  registered on Midnight Network      │                        │
│     └─────────────────────────────────────┘                        │
│                                                                      │
│  6. Proof Details:                                                  │
│     - Proof ID: proof_123...abc [📋 Copy]                          │
│     - Nullifier: 0xdef...456 [📋 Copy]                             │
│     - Threshold: $50,000                                            │
│     - Expires: Dec 17, 2025 (30 days remaining)                    │
│                                                                      │
│  7. Share Your Proof:                                               │
│     ┌─────────────────────────────────────┐                        │
│     │ Proof Credentials (JSON)             │                        │
│     │ ┌─────────────────────────────────┐ │                        │
│     │ │ {                                │ │                        │
│     │ │   "proofId": "proof_123...",    │ │                        │
│     │ │   "nullifier": "0xdef...",      │ │                        │
│     │ │   "threshold": 50000,           │ │                        │
│     │ │   "expiresAt": "2025-12-17"     │ │                        │
│     │ │ }                                │ │                        │
│     │ └─────────────────────────────────┘ │                        │
│     │ [Copy Credentials]                   │                        │
│     └─────────────────────────────────────┘                        │
│                                                                      │
│  [Generate Another Proof]  [Back to Dashboard]                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Status Polling Behavior

```
Time    Action                          Status      UI State
─────────────────────────────────────────────────────────────────
0s      Initial load                    pending     🔄 Confirming...
5s      Poll #1                         pending     🔄 Confirming...
10s     Poll #2                         pending     🔄 Confirming...
15s     Poll #3                         pending     🔄 Confirming...
...
45s     Poll #9                         confirmed   ✓ Confirmed!
        Stop polling                                Display sharing UI
```

## Error Scenarios

### Wallet Not Connected
```
┌─────────────────────────────────────┐
│ ⚠️ Wallet Not Connected              │
│ You need to connect your Lace        │
│ Wallet to sign and submit the proof. │
│                                      │
│ [Connect Lace Wallet]                │
└─────────────────────────────────────┘
```

### Transaction Signing Rejected
```
┌─────────────────────────────────────┐
│ ❌ Submission Error                  │
│ Failed to sign transaction.          │
│ User rejected the signature request. │
└─────────────────────────────────────┘
```

### Network Error
```
┌─────────────────────────────────────┐
│ ❌ Submission Error                  │
│ Failed to submit proof to blockchain.│
│ Please check your connection and     │
│ try again.                           │
└─────────────────────────────────────┘
```

### Confirmation Timeout
```
┌─────────────────────────────────────┐
│ ⚠️ Notice                            │
│ Confirmation is taking longer than   │
│ expected. Please check back later.   │
│                                      │
│ Status: PENDING                      │
│ You can safely close this page.      │
└─────────────────────────────────────┘
```

## Data Storage

### localStorage Keys
- `pendingProof` - Serialized ZKProof object
- `pendingProofCircuit` - Circuit type string
- `pendingProofThreshold` - Threshold number as string

### Cleanup
- All localStorage keys are cleared after successful submission
- Prevents stale data from affecting future submissions

## API Integration

### Backend Endpoints Used

1. **POST /api/proof/submit**
   ```typescript
   Request: {
     proof: string;              // Base64 encoded proof
     publicInputs: string[];     // [threshold]
     publicOutputs: {
       nullifier: string;
       timestamp: number;
       expiresAt: number;
     };
     walletSignature: string;    // Signed transaction
     walletAddress: string;      // Wallet address
   }
   
   Response: {
     txHash: string;
     proofId: string;
     status: 'pending' | 'confirmed' | 'failed';
   }
   ```

2. **GET /api/proof/status/:proofId**
   ```typescript
   Response: {
     proofId: string;
     nullifier: string;
     txHash: string;
     threshold: number;
     status: 'pending' | 'confirmed' | 'failed';
     submittedAt: string;
     confirmedAt?: string;
     expiresAt: string;
   }
   ```

## Security Features

1. **Wallet Signature Required**: All submissions must be signed by user's wallet
2. **Nullifier Validation**: Backend checks for duplicate nullifiers (replay attack prevention)
3. **JWT Authentication**: All API calls require valid JWT token
4. **Proof Expiry**: Proofs automatically expire after 30 days
5. **Data Privacy**: Raw witness data never transmitted to backend

## User Experience Highlights

1. **Visual Feedback**: Loading spinners, status badges, progress indicators
2. **Copy Functionality**: One-click copy for all credentials
3. **Real-time Updates**: Automatic status polling every 5 seconds
4. **Error Handling**: Clear error messages with recovery options
5. **Navigation**: Seamless flow between pages with proper state management
6. **Blockchain Explorer**: Direct link to view transaction on-chain
7. **Sharing Options**: Multiple formats for sharing proof credentials
