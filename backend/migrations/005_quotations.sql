-- ===== QUOTATIONS TABLE (PART 1 of contract.md) =====
-- Run after 003_orders.sql (orders table already exists)

-- ===== ENUMS =====
CREATE TYPE quotation_status AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'EXPIRED', 'DECLINED');

-- ===== QUOTATIONS =====
CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_user_id UUID NOT NULL REFERENCES users(id),
    customer_name VARCHAR(150),
    customer_email VARCHAR(255),
    customer_user_id UUID REFERENCES users(id),
    product_id UUID NOT NULL REFERENCES products(id),
    pricing_id UUID NOT NULL REFERENCES product_pricing(id),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    rental_period_start TIMESTAMPTZ NOT NULL,
    rental_period_end TIMESTAMPTZ NOT NULL,
    delivery_type delivery_type,
    quoted_amount INT NOT NULL CHECK (quoted_amount > 0),
    status quotation_status NOT NULL DEFAULT 'DRAFT',
    valid_until TIMESTAMPTZ,
    order_id UUID REFERENCES orders(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quotations_vendor ON quotations(vendor_user_id);
CREATE INDEX idx_quotations_status ON quotations(status);