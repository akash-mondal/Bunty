# Sila Payment Automation Implementation

## Overview

This document describes the automated payment system that triggers payments to users after their zero-knowledge proofs are confirmed on the Midnight blockchain. The system integrates with Sila Money for instant ACH transfers and provides a complete payment tracking and history interface.

## Architecture

### Backend Components

1. **Payment Automation Service** (`backend/src/services/paymentAutomation.service.ts`)
   - Calculates payment amounts based on proof thresholds
   - Processes automated payments after proof confirmation
   - Manages payment history and retry logic
   - Integrates with Sila service for fund transfers

2. **Proof Status Poller Enhancement** (`backend/src/services/proofStatusPoller.service.ts`)
   - Monitors proof submissions for blockchain confirmation
   - Triggers automated payments when proofs are confirmed
   - Handles payment failures gracefully without affecting proof status

3. **Payment Endpoints** (`backend/src/controllers/sila.controller.ts`)
   - `GET /api/sila/payment-history` - Fetch user's payment history
   - `GET /api/sila/payment/:proofId` - Get payment details for specific proof
   - `POST /api/sila/payment/:paymentId/retry` - Retry failed payments

4. **Database Schema** (`backend/db/init.sql`)
   - `payment_history` table tracks all payment transactions
   - Stores payment status, amounts, transaction IDs, and error messages
   - Indexed for efficient queries by user and proof

### Frontend Components

1. **Payment History Page** (`frontend/src/app/dashboard/payments/page.tsx`)
   - Displays all user payments in a table format
   - Shows payment status with color-coded badges
   - Allows retrying failed payments
   - Provides informational guidance about payment automation

2. **Payment Service** (`frontend/src/services/payment.service.ts`)
   - API client for payment-related endpoints
   - Handles payment history fetching
   - Manages payment retry requests

3. **Proof Confirmation Enhancement** (`frontend/src/app/dashboard/proof-confirmation/page.tsx`)
   - Displays payment status after proof confirmation
   - Shows payment amount and completion status
   - Links to full payment history

## Payment Calculation Logic

The payment amount is calculated using the following formula:

```typescript
amount = baseAmount + (threshold * multiplier)
```

Where:
- `baseAmount` = $100 (base payment)
- `multiplier` = $0.01 per threshold unit
- Maximum cap = $10,000

Example:
- Threshold $50,000 → Payment = $100 + ($50,000 × 0.01) = $600
- Threshold $100,000 → Payment = $100 + ($100,000 × 0.01) = $1,100

## Payment Flow

1. **Proof Submission**
   - User submits proof to blockchain
   - Proof status is set to "pending"

2. **Proof Confirmation**
   - Background poller detects blockchain confirmation
   - Proof status updated to "confirmed"
   - Payment automation is triggered

3. **Payment Processing**
   - Payment amount calculated based on threshold
   - Payment record created in database
   - System checks for Sila wallet and linked bank account
   - If configured, funds are issued to user's wallet
   - Payment status updated (completed/failed)

4. **User Notification**
   - Payment status displayed on proof confirmation page
   - Full payment history available in dedicated page
   - Failed payments can be retried manually

## Error Handling

The system handles several error scenarios:

1. **No Sila Wallet**
   - Payment marked as failed
   - Error message: "User has not configured Sila wallet"
   - User must register with Sila first

2. **No Bank Account Linked**
   - Payment marked as failed
   - Error message: "User has not linked a bank account"
   - User must link bank account in Sila settings

3. **Transfer Failure**
   - Payment marked as failed
   - Error message from Sila service stored
   - Payment can be retried manually

4. **Payment Already Exists**
   - Prevents duplicate payments for same proof
   - Returns existing payment record

## Database Schema

### payment_history Table

```sql
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  proof_id VARCHAR(255) REFERENCES proof_submissions(proof_id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  triggered_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_message TEXT
);
```

## API Endpoints

### Get Payment History
```
GET /api/sila/payment-history
Authorization: Bearer <token>

Response:
{
  "success": true,
  "payments": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "proof_id": "proof_123",
      "amount": 600.00,
      "transaction_id": "tx_456",
      "status": "completed",
      "triggered_at": "2024-01-15T10:30:00Z",
      "completed_at": "2024-01-15T10:31:00Z",
      "error_message": null,
      "threshold": 50000,
      "nullifier": "0x..."
    }
  ]
}
```

### Get Payment by Proof
```
GET /api/sila/payment/:proofId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "payment": {
    "id": "uuid",
    "user_id": "uuid",
    "proof_id": "proof_123",
    "amount": 600.00,
    "status": "completed",
    ...
  }
}
```

### Retry Failed Payment
```
POST /api/sila/payment/:paymentId/retry
Authorization: Bearer <token>

Response:
{
  "success": true,
  "payment": {
    "id": "uuid",
    "status": "completed",
    ...
  }
}
```

## Testing

### Manual Testing Steps

1. **Complete Proof Flow**
   - Register and authenticate
   - Link Plaid account
   - Complete Stripe verification
   - Register with Sila and link bank account
   - Generate and submit proof
   - Wait for blockchain confirmation

2. **Verify Payment Automation**
   - Check proof confirmation page for payment status
   - Navigate to Payment History page
   - Verify payment amount matches calculation
   - Check payment status (completed/pending/failed)

3. **Test Error Scenarios**
   - Submit proof without Sila wallet configured
   - Submit proof without bank account linked
   - Verify error messages are displayed
   - Test payment retry functionality

### Integration Testing

The payment automation integrates with:
- Proof status poller service
- Sila Money API
- PostgreSQL database
- Frontend payment UI

## Configuration

### Environment Variables

No additional environment variables required. Uses existing Sila configuration:
- `SILA_APP_HANDLE`
- `SILA_PRIVATE_KEY`

### Payment Calculation Customization

To adjust payment calculation, modify `paymentAutomation.service.ts`:

```typescript
private calculatePaymentAmount(threshold: number): number {
  const baseAmount = 100;      // Adjust base payment
  const multiplier = 0.01;     // Adjust multiplier
  const maxAmount = 10000;     // Adjust maximum cap
  
  const amount = baseAmount + (threshold * multiplier);
  return Math.min(amount, maxAmount);
}
```

## Future Enhancements

1. **Tiered Payment Structure**
   - Different payment rates based on proof type
   - Volume-based bonuses

2. **Payment Notifications**
   - Email notifications for payment completion
   - SMS alerts for failed payments

3. **Payment Analytics**
   - Dashboard showing total payments
   - Payment success rate metrics
   - Average payment amounts

4. **Batch Payments**
   - Process multiple payments in batches
   - Optimize transaction costs

5. **Payment Scheduling**
   - Delayed payment options
   - Scheduled payment releases

## Security Considerations

1. **Payment Authorization**
   - All payment endpoints require authentication
   - Users can only access their own payment history
   - Payment retry requires ownership verification

2. **Duplicate Prevention**
   - Nullifier check prevents duplicate proofs
   - Payment existence check prevents duplicate payments

3. **Error Logging**
   - All payment errors logged for audit
   - Sensitive data excluded from logs

4. **Transaction Integrity**
   - Database transactions ensure consistency
   - Payment failures don't affect proof status

## Troubleshooting

### Payment Not Triggered

1. Check proof status is "confirmed"
2. Verify proof status poller is running
3. Check database for payment record
4. Review application logs for errors

### Payment Failed

1. Check error message in payment record
2. Verify Sila wallet is configured
3. Confirm bank account is linked
4. Check Sila service status
5. Retry payment manually

### Payment Stuck in Pending

1. Check Sila transaction status
2. Verify Sila webhook configuration
3. Review Sila service logs
4. Contact Sila support if needed

## Conclusion

The payment automation system provides a seamless experience for users to receive payments after proof verification. The system is designed to be reliable, secure, and easy to monitor, with comprehensive error handling and retry capabilities.
