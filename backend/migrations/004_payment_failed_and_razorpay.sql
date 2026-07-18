-- Add PAYMENT_FAILED to order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED';

-- Add Razorpay-specific columns to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS error_message TEXT;