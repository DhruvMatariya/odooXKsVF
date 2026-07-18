# Contract.md Changes for Razorpay Migration and Payment Failure Handling

## PART 1 - Schema Changes

### Migration: 004_payment_failed_and_razorpay.sql
```sql
-- Add PAYMENT_FAILED to order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED';

-- Add Razorpay-specific columns to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'stripe';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_order_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_payment_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS error_message TEXT;
```

## PART 4 - API Changes

### POST /api/v1/orders (Customer)
**Request unchanged**

**Response (Stripe):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": { ... },
    "stripeClientSecretRental": "pi_xxx_secret_yyy",
    "stripeClientSecretDeposit": "pi_aaa_secret_bbb"
  }
}
```

**Response (Razorpay):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": { ... },
    "razorpayOrderIdRental": "order_xxx",
    "razorpayOrderIdDeposit": "order_yyy",
    "razorpayKeyId": "rzp_test_xxx"
  }
}
```

### POST /api/v1/orders/:id/retry-payment (Customer, Owner)
**New endpoint** - Retry failed payment for PAYMENT_FAILED orders
- Guard: order.status === 'PAYMENT_FAILED', else 409 INVALID_STATE_TRANSITION
- Re-validates inventory availability
- Returns same response format as POST /orders

### POST /api/v1/orders/:id/verify-payment (Customer, Owner)
**New endpoint** - Verify payment completion (for Razorpay frontend callback)
```json
// Stripe
{ "provider": "stripe", "paymentIntentIdRental": "pi_xxx", "paymentIntentIdDeposit": "pi_yyy" }

// Razorpay
{ "provider": "razorpay", "razorpayOrderIdRental": "order_xxx", "razorpayPaymentIdRental": "pay_xxx", "razorpaySignatureRental": "sig_xxx", "razorpayOrderIdDeposit": "order_yyy", "razorpayPaymentIdDeposit": "pay_yyy", "razorpaySignatureDeposit": "sig_yyy" }
```

### POST /api/v1/webhooks/razorpay
**New endpoint** - Razorpay webhook (no JWT, raw body)
- Verifies X-Razorpay-Signature header
- Handles: payment.captured, payment.failed, refund.processed
- Same CONFIRMED logic as Stripe webhook

### POST /api/v1/orders (Customer) - Error Response Changes
**On payment initiation failure:**
```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_INITIATION_FAILED",
    "message": "Payment initiation failed: [provider error]"
  }
}
```
Order row exists with status='PAYMENT_FAILED', payments rows with status='failed', order_events row.

## Payment Provider Abstraction
New interface in `src/payments/PaymentProvider.js`:
- `createRentalFeePayment()`, `createDepositPayment()`
- `verifyWebhookSignature()`, `verifyPayment()`
- `refundPayment()`, `cancelPayment()`, `getPaymentStatus()`

Implemented providers:
- `StripeProvider` (existing logic)
- `RazorpayProvider` (new - Orders + Payments + Signature verification)

Configuration via `PAYMENT_PROVIDER` env var ('stripe' or 'razorpay').

## Inventory Release for PAYMENT_FAILED Orders
Background job (cron) finds orders with status='PAYMENT_FAILED' older than 30 minutes:
- Releases inventory: reserved -= qty, available += qty
- Updates order status to CANCELLED
- Adds order_events entry

## Error Codes Added
- `PAYMENT_INITIATION_FAILED` - Payment provider threw during initiation
- `PAYMENT_NOT_SUCCEEDED` - Payment not in succeeded state
- `VERIFICATION_FAILED` - Razorpay signature verification failed
- `INVALID_PROVIDER` - Unknown payment provider