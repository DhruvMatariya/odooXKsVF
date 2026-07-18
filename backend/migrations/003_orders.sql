-- ===== ORDER TABLES (PART 1 of contract.md) =====
-- Run after 002_catalog.sql

-- ===== ENUMS (extend existing) =====
CREATE TYPE order_channel AS ENUM ('ONLINE', 'OFFLINE');
CREATE TYPE delivery_type AS ENUM ('PICKUP', 'DELIVERY');
CREATE TYPE deposit_status AS ENUM ('HELD', 'REFUNDED', 'PARTIALLY_DEDUCTED');
create type order_status AS ENUM (
    'PENDING_PAYMENT',
    'CONFIRMED',
    'DISPATCHED',
    'HANDED_OVER',
    'ACTIVE_RENTAL',
    'RETURN_SCHEDULED',
    'RETURNED',
    'CANCELLED'
);

-- ===== ORDERS =====
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_user_id UUID NOT NULL REFERENCES users(id),
    vendor_user_id UUID NOT NULL REFERENCES users(id),
    product_id UUID NOT NULL REFERENCES products(id),
    pricing_id UUID NOT NULL REFERENCES product_pricing(id),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    channel order_channel NOT NULL,
    status order_status NOT NULL DEFAULT 'PENDING_PAYMENT',
    delivery_type delivery_type,
    return_slot_id UUID REFERENCES return_slots(id),
    rental_period_start TIMESTAMPTZ NOT NULL,
    rental_period_end TIMESTAMPTZ NOT NULL,
    actual_handover_time TIMESTAMPTZ,
    actual_return_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_customer ON orders(customer_user_id);
CREATE INDEX idx_orders_vendor ON orders(vendor_user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_active_by_product ON orders(product_id, rental_period_start, rental_period_end)
  WHERE status IN ('CONFIRMED','DISPATCHED','HANDED_OVER','ACTIVE_RENTAL','RETURN_SCHEDULED');

-- ===== DEPOSITS =====
CREATE TABLE deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id),
    amount_held INT NOT NULL,
    status deposit_status NOT NULL DEFAULT 'HELD',
    deduction_amount INT DEFAULT 0,
    refund_amount INT,
    method VARCHAR(10) NOT NULL DEFAULT 'STRIPE',
    settled_at TIMESTAMPTZ
);

-- ===== PAYMENTS =====
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    stripe_payment_intent_id TEXT,
    amount INT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('RENTAL_FEE','DEPOSIT')),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== ORDER EVENTS =====
CREATE TABLE order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    from_status order_status,
    to_status order_status NOT NULL,
    actor_role VARCHAR(10) NOT NULL,
    actor_user_id UUID,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_events_order ON order_events(order_id);

-- ===== IDEMPOTENCY KEYS (for POST /orders) =====
CREATE TABLE idempotency_keys (
    key_hash VARCHAR(64) PRIMARY KEY,
    response_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);