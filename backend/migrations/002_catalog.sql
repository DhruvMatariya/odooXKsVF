-- ===== CATALOG TABLES (PART 1 of contract.md) =====
-- Run after 001_auth.sql (which creates users, vendor_profiles, auth tables)

-- ===== ENUMS (extend existing) =====
CREATE TYPE unit_type AS ENUM ('HOUR', 'DAY', 'WEEK');
CREATE TYPE slot_label AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');
CREATE TYPE product_status AS ENUM ('ACTIVE', 'INACTIVE');

-- ===== CATALOG =====
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(300),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_user_id UUID NOT NULL REFERENCES users(id),
    category_id UUID NOT NULL REFERENCES categories(id),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(2000),
    brand VARCHAR(100),
    manufacturer VARCHAR(100),
    thumbnail TEXT,
    images JSONB DEFAULT '[]',
    status product_status NOT NULL DEFAULT 'ACTIVE',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (vendor_user_id, category_id, name)
);
CREATE INDEX idx_products_vendor ON products(vendor_user_id);
CREATE INDEX idx_products_category ON products(category_id);

CREATE TABLE inventory (
    product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    available INT NOT NULL DEFAULT 0 CHECK (available >= 0),
    reserved INT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    rented INT NOT NULL DEFAULT 0 CHECK (rented >= 0),
    maintenance INT NOT NULL DEFAULT 0 CHECK (maintenance >= 0)
);

CREATE TABLE product_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    period unit_type NOT NULL,
    duration INT NOT NULL CHECK (duration > 0),
    price INT NOT NULL CHECK (price > 0),
    deposit INT NOT NULL DEFAULT 0 CHECK (deposit >= 0),
    UNIQUE (product_id, period, duration)
);

CREATE TABLE return_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_user_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    slot_label slot_label NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    booked_count INT NOT NULL DEFAULT 0 CHECK (booked_count >= 0),
    UNIQUE (vendor_user_id, date, slot_label)
);

CREATE TABLE late_fee_rules (
    vendor_user_id UUID PRIMARY KEY REFERENCES users(id),
    grace_period_hours INT NOT NULL DEFAULT 0,
    rate_type VARCHAR(10) NOT NULL CHECK (rate_type IN ('HOURLY','DAILY')),
    rate_amount INT NOT NULL,
    max_cap INT NOT NULL
);

CREATE TABLE cancellation_policies (
    vendor_user_id UUID PRIMARY KEY REFERENCES users(id),
    full_refund_hours_before INT NOT NULL DEFAULT 24,
    partial_refund_hours_before INT NOT NULL DEFAULT 6,
    partial_refund_percent INT NOT NULL DEFAULT 50 CHECK (partial_refund_percent BETWEEN 0 AND 100)
);