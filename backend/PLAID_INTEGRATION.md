# Plaid Integration Documentation

## Overview

The Plaid integration provides secure access to user financial data including income, assets, liabilities, credit signals, investments, and transactions. All access tokens are encrypted using AES-256-GCM before storage.

## Setup

### Environment Variables

Add the following to your `.env` file:

```env
# Plaid Configuration
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret-sandbox
PLAID_ENV=sandbox

# Encryption Key (64 hex characters / 32 bytes for AES-256)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

### Generate Encryption Key

To generate a secure encryption key, run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API Endpoints

All endpoints require JWT authentication via the `Authorization: Bearer <token>` header.

### 1. Create Link Token

**POST** `/api/plaid/create-link-token`

Creates a Plaid Link token for initializing the Plaid Link UI.

**Response:**
```json
{
  "linkToken": "link-sandbox-xxx"
}
```

### 2. Exchange Public Token

**POST** `/api/plaid/exchange`

Exchanges a public token from Plaid Link for an access token (stored encrypted).

**Request Body:**
```json
{
  "publicToken": "public-sandbox-xxx"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bank account linked successfully"
}
```

### 3. Get Income Data

**GET** `/api/plaid/income`

Fetches income and employment data.

**Response:**
```json
{
  "monthlyIncome": 5000,
  "employmentMonths": 24,
  "employerName": "Acme Corp",
  "employerHash": "abc123..."
}
```

### 4. Get Assets Data

**GET** `/api/plaid/assets`

Fetches account balances and total assets.

**Response:**
```json
{
  "totalAssets": 50000,
  "accounts": [
    {
      "accountId": "xxx",
      "balance": 25000,
      "type": "depository"
    }
  ]
}
```

### 5. Get Liabilities Data

**GET** `/api/plaid/liabilities`

Fetches credit cards, loans, and mortgages.

**Response:**
```json
{
  "totalLiabilities": 15000,
  "accounts": [
    {
      "accountId": "xxx",
      "balance": 5000,
      "type": "credit"
    }
  ]
}
```

### 6. Get Signal Data

**GET** `/api/plaid/signal`

Fetches credit signal scores.

**Response:**
```json
{
  "creditScore": 750,
  "riskScore": 25
}
```

### 7. Get Investments Data

**GET** `/api/plaid/investments`

Fetches investment holdings.

**Response:**
```json
{
  "totalValue": 100000,
  "holdings": [
    {
      "securityId": "xxx",
      "quantity": 10,
      "value": 50000
    }
  ]
}
```

### 8. Get Transactions Data

**GET** `/api/plaid/transactions?startDate=2024-01-01&endDate=2024-01-31`

Fetches transaction history (defaults to last 30 days).

**Query Parameters:**
- `startDate` (optional): Start date in YYYY-MM-DD format
- `endDate` (optional): End date in YYYY-MM-DD format

**Response:**
```json
{
  "transactions": [
    {
      "transactionId": "xxx",
      "amount": 50.00,
      "date": "2024-01-15",
      "merchantName": "Coffee Shop",
      "category": ["Food and Drink", "Restaurants"]
    }
  ],
  "totalCount": 45
}
```

## Security Features

### Token Encryption

All Plaid access tokens are encrypted using AES-256-GCM before storage:

- **Algorithm**: AES-256-GCM
- **Key Length**: 32 bytes (256 bits)
- **IV**: Random 16 bytes per encryption
- **Auth Tag**: 16 bytes for integrity verification

### Database Storage

The `plaid_connections` table stores:
- Encrypted access tokens (never stored in plaintext)
- Item IDs for Plaid items
- Institution names
- User associations

### Rate Limiting

All endpoints are protected by rate limiting middleware to prevent abuse.

## Error Handling

### Error Codes

- `AUTH_001`: User not authenticated
- `PLAID_001`: Plaid API error
- `PLAID_002`: Invalid request parameters

### Example Error Response

```json
{
  "error": {
    "code": "PLAID_001",
    "message": "Failed to fetch income data from Plaid",
    "timestamp": 1234567890
  }
}
```

## Testing with Sandbox

Plaid provides sandbox credentials for testing. Use the following test credentials in Plaid Link:

- **Username**: `user_good`
- **Password**: `pass_good`

This will create a test connection with sample financial data.

## Requirements Satisfied

This implementation satisfies the following requirements:

- **2.1**: Plaid link token generation via `/plaid/create-link-token`
- **2.2**: Public token exchange via `/plaid/exchange`
- **2.3**: AES-256 encryption of access tokens
- **2.4**: Financial data endpoints (income, assets, liabilities, signal, investments, transactions)
- **2.5**: Sandbox products enabled (income, assets, signal, liabilities, investments, transactions)
