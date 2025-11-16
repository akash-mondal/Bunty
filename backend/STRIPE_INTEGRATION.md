# Stripe Identity Integration

This document describes the Stripe Identity integration for KYC verification in the Bunty platform.

## Overview

The Stripe Identity integration enables users to complete KYC (Know Your Customer) verification by:
- Uploading government-issued ID documents
- Taking a live selfie for identity verification
- Verifying SSN/ID numbers

All verification is handled securely by Stripe, and the results are stored in the Bunty database.

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

### Test Mode

The integration is configured to run in test mode using Stripe's test API keys (prefixed with `sk_test_`).

## Database Schema

The `stripe_verifications` table stores verification status:

```sql
CREATE TABLE stripe_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  ssn_verified BOOLEAN DEFAULT FALSE,
  selfie_verified BOOLEAN DEFAULT FALSE,
  document_verified BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### 1. Create Identity Session

**Endpoint:** `POST /api/stripe/identity-session`

**Authentication:** Required (JWT Bearer token)

**Request Body:**
```json
{
  "returnUrl": "https://yourapp.com/verification-complete" // Optional
}
```

**Response:**
```json
{
  "sessionId": "vs_1234567890",
  "clientSecret": "vs_1234567890_secret_abcdefg"
}
```

**Description:** Creates a new Stripe Identity verification session. The `clientSecret` should be used on the frontend to initialize the Stripe Identity modal.

### 2. Get Verification Status

**Endpoint:** `GET /api/stripe/verification-status`

**Authentication:** Required (JWT Bearer token)

**Response:**
```json
{
  "ssnVerified": true,
  "selfieVerified": true,
  "documentVerified": true,
  "completedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Response (404):**
```json
{
  "error": {
    "code": "STRIPE_002",
    "message": "No verification found for user",
    "timestamp": 1705315800000
  }
}
```

### 3. Webhook Handler

**Endpoint:** `POST /api/stripe/webhook`

**Authentication:** None (verified via Stripe signature)

**Headers:**
- `stripe-signature`: Stripe webhook signature

**Description:** Receives webhook events from Stripe when verification status changes. This endpoint automatically updates the verification status in the database.

**Supported Events:**
- `identity.verification_session.verified` - Verification completed successfully
- `identity.verification_session.requires_input` - Additional input required

## Webhook Setup

### 1. Configure Webhook in Stripe Dashboard

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-api-domain.com/api/stripe/webhook`
4. Select events to listen to:
   - `identity.verification_session.verified`
   - `identity.verification_session.requires_input`
5. Copy the webhook signing secret and add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

### 2. Test Webhooks Locally

Use Stripe CLI to forward webhooks to your local development server:

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

This will output a webhook signing secret that you can use for local testing.

## Frontend Integration

### Example Usage

```typescript
// 1. Create verification session
const response = await fetch('/api/stripe/identity-session', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    returnUrl: 'https://yourapp.com/dashboard'
  })
});

const { clientSecret } = await response.json();

// 2. Initialize Stripe Identity modal
const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
const { error } = await stripe.verifyIdentity(clientSecret);

if (error) {
  console.error('Verification failed:', error);
}

// 3. Check verification status
const statusResponse = await fetch('/api/stripe/verification-status', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const status = await statusResponse.json();
console.log('Verification status:', status);
```

## Verification Flow

1. **User initiates verification**: Frontend calls `/api/stripe/identity-session`
2. **Session created**: Backend creates Stripe verification session and stores session ID
3. **User completes verification**: User uploads ID and takes selfie in Stripe modal
4. **Webhook received**: Stripe sends webhook to `/api/stripe/webhook`
5. **Status updated**: Backend updates verification status in database
6. **Frontend polls status**: Frontend calls `/api/stripe/verification-status` to check completion

## Security Features

### Webhook Signature Verification

All webhook requests are verified using Stripe's signature verification:

```typescript
const event = stripe.webhooks.constructEvent(
  payload,
  signature,
  webhookSecret
);
```

This ensures that webhook requests are genuinely from Stripe and haven't been tampered with.

### Authentication

All user-facing endpoints require JWT authentication to ensure users can only access their own verification data.

## Error Codes

| Code | Description |
|------|-------------|
| `STRIPE_001` | General Stripe API error |
| `STRIPE_002` | No verification found for user |
| `STRIPE_003` | Missing stripe-signature header |
| `STRIPE_004` | Webhook processing failed |

## Testing

### Test Cards and Documents

Stripe provides test documents for Identity verification:

- **Test SSN**: `000-00-0000` (will verify successfully)
- **Test Documents**: Use any test document images provided by Stripe

### Manual Testing

1. Start the backend server
2. Authenticate and get a JWT token
3. Create a verification session
4. Use Stripe's test mode to complete verification
5. Check webhook logs to see status updates
6. Query verification status

## Requirements Satisfied

This implementation satisfies the following requirements:

- **3.1**: Create Stripe Identity session via `/stripe/identity-session` endpoint
- **3.2**: Webhook handlers receive verification completion events
- **3.3**: Store verification status (SSN, selfie, document verification)
- **3.4**: Operate in test mode for development
- **3.5**: Validate webhook signatures for security

## Additional Resources

- [Stripe Identity Documentation](https://stripe.com/docs/identity)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Identity React SDK](https://stripe.com/docs/identity/verify-identity-documents)
