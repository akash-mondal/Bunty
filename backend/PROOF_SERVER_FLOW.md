# Proof Server Flow Diagram

## Complete Proof Generation and Submission Flow

```mermaid
sequenceDiagram
    participant Client as Frontend Client
    participant API as Backend API
    participant PS as Proof Server
    participant DB as PostgreSQL
    participant MN as Midnight Network

    Note over Client,MN: Phase 1: Proof Generation
    
    Client->>API: POST /api/proof/generate
    Note right of Client: {circuit, witness, threshold}
    
    API->>API: Validate witness structure
    API->>API: Validate circuit type
    
    API->>PS: POST /prove
    Note right of API: {circuit, witness, publicInputs}
    
    alt Proof Generation Success
        PS->>PS: Generate BLS12-381 proof
        PS-->>API: {proof, publicOutputs}
        Note left of PS: {nullifier, timestamp, expiresAt}
        
        API-->>Client: {success: true, proof}
    else Timeout or Error
        PS--xAPI: Timeout/Error
        API->>API: Retry with backoff
        
        alt Retry Success
            PS-->>API: {proof, publicOutputs}
            API-->>Client: {success: true, proof}
        else All Retries Failed
            API-->>Client: {error: "Proof generation failed"}
        end
    end

    Note over Client,MN: Phase 2: Proof Submission
    
    Client->>Client: Sign transaction with Lace Wallet
    
    Client->>API: POST /api/proof/submit
    Note right of Client: {proof, walletSignature}
    
    API->>DB: Check nullifier uniqueness
    
    alt Nullifier Already Exists
        DB-->>API: Nullifier found
        API-->>Client: {error: "NULLIFIER_ALREADY_USED"}
    else Nullifier Unique
        DB-->>API: Nullifier unique
        
        API->>MN: Submit transaction
        Note right of API: broadcast_tx_commit
        
        MN-->>API: {txHash}
        
        API->>DB: Store proof submission
        Note right of API: status: pending
        
        DB-->>API: Submission stored
        
        API-->>Client: {txHash, proofId, status: "pending"}
    end

    Note over Client,MN: Phase 3: Status Polling
    
    loop Poll for confirmation
        Client->>API: GET /api/proof/status/:proofId
        
        API->>DB: Query proof submission
        DB-->>API: Proof data
        
        alt Status is Pending
            API->>MN: Check transaction status
            
            alt Transaction Confirmed
                MN-->>API: {tx_result: {code: 0}}
                API->>DB: Update status to "confirmed"
                DB-->>API: Updated
                API-->>Client: {status: "confirmed", confirmedAt}
            else Still Pending
                MN-->>API: Transaction pending
                API-->>Client: {status: "pending"}
            end
        else Status is Confirmed
            API-->>Client: {status: "confirmed", confirmedAt}
        end
    end
```

## Error Handling Flow

```mermaid
flowchart TD
    A[Proof Generation Request] --> B{Validate Input}
    B -->|Invalid| C[Return 400 Error]
    B -->|Valid| D[Call Proof Server]
    
    D --> E{Response Status}
    
    E -->|Success| F[Parse Proof]
    F --> G[Return Proof to Client]
    
    E -->|Timeout| H{Retry Count < Max?}
    H -->|Yes| I[Wait with Backoff]
    I --> D
    H -->|No| J[Return Timeout Error]
    
    E -->|Connection Refused| K[Return Server Unavailable]
    
    E -->|Network Error| L{Retryable?}
    L -->|Yes| H
    L -->|No| M[Return Network Error]
    
    E -->|Server Error 5xx| N{Retry Count < Max?}
    N -->|Yes| I
    N -->|No| O[Return Server Error]
    
    E -->|Client Error 4xx| P[Return Client Error]
```

## Retry Logic Flow

```mermaid
flowchart TD
    A[Proof Generation Failed] --> B{Check Error Type}
    
    B -->|Timeout| C{Attempt < 3?}
    B -->|Network Error| C
    B -->|5xx Error| C
    B -->|Connection Refused| D[Don't Retry]
    B -->|4xx Error| D
    
    C -->|Yes| E[Calculate Backoff]
    E --> F[Delay = min(1000 * 2^attempt, 10000)]
    F --> G[Add Jitter ±30%]
    G --> H[Wait for Delay]
    H --> I[Retry Request]
    I --> J{Success?}
    
    J -->|Yes| K[Return Proof]
    J -->|No| C
    
    C -->|No| L[Return Final Error]
    D --> L
```

## Circuit Selection Flow

```mermaid
flowchart TD
    A[Client Selects Proof Type] --> B{Circuit Type}
    
    B -->|verifyIncome| C[Income Threshold Check]
    C --> D[Constraints:<br/>- income >= threshold<br/>- employmentMonths >= 6<br/>- ssnVerified = true<br/>- selfieVerified = true]
    
    B -->|verifyAssets| E[Net Worth Check]
    E --> F[Constraints:<br/>- assets - liabilities >= threshold<br/>- ssnVerified = true]
    
    B -->|verifyCreditworthiness| G[Credit Score Check]
    G --> H[Constraints:<br/>- creditScore >= threshold<br/>- income > 0<br/>- employmentMonths >= 12]
    
    D --> I[Generate Nullifier]
    F --> I
    H --> I
    
    I --> J[Check Nullifier Uniqueness]
    J -->|Unique| K[Store in Proof Registry]
    J -->|Duplicate| L[Reject: Replay Attack]
    
    K --> M[Return Proof with:<br/>- nullifier<br/>- timestamp<br/>- expiresAt]
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Client                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Plaid    │  │   Stripe   │  │    Lace    │            │
│  │   Link     │  │  Identity  │  │   Wallet   │            │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │
│        │               │               │                     │
│        └───────────────┴───────────────┘                     │
│                        │                                     │
│                  ┌─────▼──────┐                             │
│                  │  Witness   │                             │
│                  │ Constructor│                             │
│                  └─────┬──────┘                             │
│                        │                                     │
└────────────────────────┼─────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Proof Controller                         │  │
│  │  - generateProof()                                    │  │
│  │  - submitProof()                                      │  │
│  │  - getProofStatus()                                   │  │
│  └────────────┬─────────────────────────┬─────────────────┘  │
│               │                         │                    │
│  ┌────────────▼──────────┐  ┌──────────▼────────────┐      │
│  │  ProofServerService   │  │  MidnightService      │      │
│  │  - generateProof()    │  │  - submitTransaction()│      │
│  │  - healthCheck()      │  │  - getTransactionStatus()│   │
│  │  - retry logic        │  │  - queryProofRegistry()│      │
│  └────────────┬──────────┘  └──────────┬────────────┘      │
│               │                         │                    │
└───────────────┼─────────────────────────┼────────────────────┘
                │ HTTP                    │ JSON-RPC
                ▼                         ▼
┌──────────────────────┐    ┌──────────────────────────┐
│   Proof Server       │    │   Midnight Network       │
│   (Docker)           │    │                          │
│   Port 6300          │    │  ┌────────────────────┐  │
│                      │    │  │   JSON-RPC Node    │  │
│  ┌────────────────┐  │    │  │   Port 26657       │  │
│  │   Circuits     │  │    │  └────────────────────┘  │
│  │  - verifyIncome│  │    │                          │
│  │  - verifyAssets│  │    │  ┌────────────────────┐  │
│  │  - verifyCreditw│ │    │  │  Compact Contracts │  │
│  └────────────────┘  │    │  │  Proof Registry    │  │
└──────────────────────┘    │  └────────────────────┘  │
                            │                          │
                            │  ┌────────────────────┐  │
                            │  │  GraphQL Indexer   │  │
                            │  │  Port 8081         │  │
                            │  └────────────────────┘  │
                            └──────────────────────────┘
```

## State Transitions

```mermaid
stateDiagram-v2
    [*] --> Generating: Client requests proof
    
    Generating --> Generated: Proof server success
    Generating --> Retrying: Timeout/Network error
    Generating --> Failed: Non-retryable error
    
    Retrying --> Generated: Retry success
    Retrying --> Failed: Max retries exceeded
    
    Generated --> Signing: Client signs with wallet
    
    Signing --> Submitting: Signature obtained
    Signing --> Failed: User cancels
    
    Submitting --> Pending: Transaction broadcast
    Submitting --> Failed: Nullifier exists
    
    Pending --> Confirmed: Blockchain confirms
    Pending --> Failed: Transaction fails
    
    Confirmed --> Expired: 30 days elapsed
    
    Failed --> [*]
    Expired --> [*]
```

## Performance Metrics

| Operation | Expected Time | Timeout |
|-----------|--------------|---------|
| Proof Generation | 2-5 seconds | 30 seconds |
| Transaction Submission | 1-2 seconds | 10 seconds |
| Status Check | < 500ms | 5 seconds |
| Health Check | < 100ms | 5 seconds |

## Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| ECONNABORTED | Request timeout | Yes |
| ETIMEDOUT | Connection timeout | Yes |
| ECONNREFUSED | Server not running | No |
| ENETUNREACH | Network unreachable | Yes |
| 4xx | Client error | No |
| 5xx | Server error | Yes |
| NULLIFIER_ALREADY_USED | Replay attack | No |
