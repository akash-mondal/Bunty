# Sila Money Integration

This document describes the Sila Money integration for payment settlement in the Bunty platform.

## Overview

Sila Money provides instant ACH payment infrastructure for the Bunty platform. Users can register, link bank accounts, create digital wallets, and initiate instant transfers.

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# Sila Configuration
SILA_APP_HANDLE=your_app_handle
SILA_PRIVATE_KEY=your_private_key
```

### Obtaining Credentials

1. Sign up for a Sila account at https://console.silamoney.com/
2. Create a new application in the Sila Console
3. Copy your App Handle and Private Key
4. For development, use sandbox mode (automatically configured)

## API Endpoints

### 1. Register User

Register a new user with Sila and create a digital wallet.

**Endpoint:** `POST /api/sila/register`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "phone": "+1234567890",
  "email": "john.doe@example.com",
  "dateOfBirth": "1990-01-01",
  "ssn": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "userHandle": "user_abc123",
  "walletAddress": "0x..."
}
```

### 2. Link Bank Account

Link a bank account for ACH transfers.

**Endpoint:** `POST /api/sila/link-bank`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "accountNumber": "1234567890",
  "routingNumber": "123456789",
  "accountName": "My Checking Account",
  "accountType": "checking"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bank account linked successfully",
  "accountName": "My Checking Account"
}
```

### 3. Issue Wallet

Fund wallet from linked bank account.

**Endpoint:** `POST /api/sila/issue-wallet`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "amount": 100.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet funded successfully",
  "walletAddress": "0x...",
  "balance": 100.00
}
```

### 4. Transfer Funds

Initiate instant ACH transfer.

**Endpoint:** `POST /api/sila/transfer`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "destination": "user_xyz789",
  "amount": 50.00,
  "descriptor": "Payment for services"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transfer initiated successfully",
  "transactionId": "txn_abc123",
  "status": "pending"
}
```

### 5. Get Balance

Get wallet balance.

**Endpoint:** `GET /api/sila/balance`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "success": true,
  "balance": 50.00,
  "walletAddress": "0x..."
}
```

### 6. Webhook Handler

Handle Sila webhook events for payment confirmations.

**Endpoint:** `POST /api/sila/webhook`

**Authentication:** None (webhook from Sila)

**Request Body:**
```json
{
  "eventType": "transaction.completed",
  "transactionId": "txn_abc123",
  "status": "success",
  "amount": 50.00,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Database Schema

### sila_wallets Table

```sql
CREATE TABLE sila_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(255) NOT NULL,
  bank_account_linked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Integration Flow

### User Onboarding Flow

1. User registers with Bunty authentication system
2. User calls `/api/sila/register` with personal information
3. System creates Sila user handle and digital wallet
4. User calls `/api/sila/link-bank` to link bank account
5. User can now fund wallet and make transfers

### Payment Flow

1. User generates and submits proof on-chain
2. Proof is verified by smart contract
3. Webhook triggers automated payment via `/api/sila/transfer`
4. Funds are transferred instantly via ACH
5. Sila webhook confirms transaction completion

## Error Codes

- `SILA_001`: Missing required fields
- `SILA_002`: Failed to register user
- `SILA_003`: Missing required bank account fields
- `SILA_004`: Failed to link bank account
- `SILA_005`: Failed to issue wallet
- `SILA_006`: Missing required transfer fields
- `SILA_007`: Transfer amount must be greater than zero
- `SILA_008`: Failed to initiate transfer
- `SILA_009`: Failed to fetch balance
- `SILA_010`: Invalid webhook event
- `SILA_011`: Webhook processing failed

## Testing

### Sandbox Mode

The integration is configured to use Sila's sandbox environment by default. In sandbox mode:

- No real money is transferred
- All API calls are simulated
- Test bank accounts can be used
- KYC verification is instant

### Test Bank Account

Use these test credentials in sandbox mode:

```
Account Number: 1234567890
Routing Number: 123456789
Account Type: checking
```

## Security Considerations

1. **Private Key Storage**: Store Sila private key securely in environment variables
2. **Webhook Validation**: Validate webhook signatures (to be implemented)
3. **User Data**: Encrypt sensitive user data before storage
4. **Rate Limiting**: Implement rate limiting on all endpoints
5. **KYC Compliance**: Ensure proper KYC verification before enabling transfers

## Automated Payment Logic

The system supports automated payment disbursement after proof verification:

1. Listen for proof confirmation events from Midnight Network
2. Validate proof meets threshold requirements
3. Calculate payment amount based on proof parameters
4. Initiate transfer via `/api/sila/transfer`
5. Track payment status via webhook events

This logic will be implemented in Task 19: "Implement Sila payment automation"

## Production Deployment

Before deploying to production:

1. Switch from sandbox to production mode in `sila.service.ts`
2. Update environment variables with production credentials
3. Implement webhook signature validation
4. Enable proper KYC verification levels
5. Set up monitoring and alerting for failed transactions
6. Configure proper error handling and retry logic

## References

- [Sila API Documentation](https://docs.silamoney.com/)
- [Sila SDK GitHub](https://github.com/Sila-Money/sila-sdk-javascript)
- [Sila Console](https://console.silamoney.com/)
