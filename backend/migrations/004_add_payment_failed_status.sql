-- Migration to add PAYMENT_FAILED to order_status enum
-- This must run outside a transaction block (PostgreSQL requirement)

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED';

-- Also add payment provider column to payments table for Razorpay support
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'stripe';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_payment_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_order_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS error_message TEXT;