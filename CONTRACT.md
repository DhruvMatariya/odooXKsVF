# Rental Platform — COMPLETE End-to-End Contract & Schema (FINAL)

Single source of truth. Build only from this file. Supersedes all earlier drafts.

Stack: Postgres (Docker) + Node/Express + Zod + Stripe (test mode) + BullMQ + Socket.IO.
Roles: `customer`, `vendor`, `admin` (admin = seed data only, no admin UI needed for demo).

---

# PART 0 — CONVENTIONS

- Base path: `/api/v1`
- Auth: `Authorization: Bearer <jwt>`. Payload: `{ sub: userId, role, iat, exp }`
- Ownership rule: never trust `vendorUserId`/`customerUserId` from request body — always `jwt.sub`. Every write on a resource owned by a vendor checks `resource.vendor_user_id === jwt.sub` else `403 FORBIDDEN_NOT_OWNER`.
- Response envelope (every endpoint):
```json
// single item
{ "success": true, "message": "string", "data": {} }
// list
{ "success": true, "data": [], "meta": { "page": 1, "limit": 10, "total": 50, "totalPages": 5 } }
// error
{ "success": false, "error": { "code": "PRODUCT_NOT_FOUND", "message": "Product not found" } }
```
- Money: integers, smallest currency unit, Zod strict (no string coercion).
- Timestamps: ISO 8601 UTC.
- Status codes: `200` read/update, `201` created, `204` deleted, `400` bad input, `401` no/bad token, `403` wrong role/not owner, `404` not found, `409` conflicts with current state, `429` rate limited.
- `Idempotency-Key` header required on: `POST /orders`, `POST /orders/:id/cancel`, `POST /orders/:id/confirm-delivery`.
- Validate every body with Zod at the route boundary (`safeParse`) → map failures to `400 VALIDATION_ERROR` with a `fields` array.

---

# PART 1 — FULL DB SCHEMA (Postgres DDL, run in this order)

```sql
-- ===== ENUMS =====
CREATE TYPE user_role AS ENUM ('customer', 'vendor', 'admin');
CREATE TYPE order_channel AS ENUM ('ONLINE', 'OFFLINE');
CREATE TYPE delivery_type AS ENUM ('PICKUP', 'DELIVERY');
CREATE TYPE unit_type AS ENUM ('HOUR', 'DAY', 'WEEK');
CREATE TYPE slot_label AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');
CREATE TYPE product_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE order_status AS ENUM (
  'PENDING_PAYMENT','CONFIRMED','DISPATCHED',
  'REJECTED_AT_DELIVERY','REPLACEMENT_REQUESTED','HANDED_OVER',
  'ACTIVE_RENTAL','RETURN_SCHEDULED','RETURNED_PENDING_INSPECTION',
  'INSPECTED','DEPOSIT_REFUNDED','PENALTY_APPLIED','DISPUTED',
  'CANCELLED','COMPLETED'
);
CREATE TYPE deposit_status AS ENUM ('HELD','REFUNDED','PARTIALLY_DEDUCTED');

-- ===== AUTH =====
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE email_verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 1-to-1 extension of users where role='vendor'. Service layer enforces this pairing
-- inside one DB transaction at registration time.
CREATE TABLE vendor_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    gst_number VARCHAR(15) UNIQUE NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    product_category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    stripe_payment_intent_id TEXT,
    amount INT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('RENTAL_FEE','DEPOSIT')),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inspection_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id),
    condition_notes TEXT,
    damage_found BOOLEAN NOT NULL DEFAULT false,
    photos JSONB DEFAULT '[]',
    late_by_minutes INT NOT NULL DEFAULT 0,
    penalty_amount INT NOT NULL DEFAULT 0,
    inspected_by UUID REFERENCES users(id),
    inspected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
```

---

# PART 2 — AUTH SERVICE

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh-token
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/verify-email
GET  /api/v1/auth/profile
POST /api/v1/auth/profile
```

**`POST /register`** — Zod discriminated union on `role`:
```ts
const RegisterSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("customer"),
    fullName: z.string().min(2).max(150),
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8),
  }),
  z.object({
    role: z.literal("vendor"),
    fullName: z.string().min(2).max(150),
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8),
    companyName: z.string().min(2).max(150),
    gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/),
    productCategory: z.string(),
  }),
]);
```
Service: insert `users` → if vendor, insert `vendor_profiles` (same `user_id`) — **one transaction**. `409 EMAIL_TAKEN` on duplicate.
Response `201`: `{ success:true, data:{ id, fullName, email, role, ...vendorFields? } }` (never `passwordHash`).

**`POST /login`** — `{ email, password }` → `200 { data: { token, refreshToken, user } }`. `401 INVALID_CREDENTIALS` (same message whether email or password is wrong).

**`GET /profile`** — auth required → role-appropriate DTO, joins `vendor_profiles` if vendor.

Other auth routes (`logout`, `refresh-token`, `forgot-password`, `reset-password`, `verify-email`) — keep as already implemented, just wrap responses in the standard envelope.

---

# PART 3 — CATALOG SERVICE

### `POST /categories` *(admin — seed once via script, skip building admin UI)*
`{ "name":"3-50", "description":"max 300" }` → `201`

### `GET /categories` — public → `200 { data: [{id, name}] }`

### `POST /products` *(vendor)*
```json
{ "categoryId":"uuid","name":"3-100","description":"max 2000","brand":"string",
  "manufacturer":"string","thumbnail":"url","images":["url"] }
```
`vendor_user_id` = `jwt.sub`. Rules: category must exist (`404 CATEGORY_NOT_FOUND`); name unique per (vendor, category), case-insensitive+trimmed (`409 PRODUCT_ALREADY_EXISTS`); auto-create `inventory(available:0)`; `status:'ACTIVE'`.
Response `201`: `{ id, name, category:{id,name}, brand, manufacturer, status, thumbnail, createdAt }`

### `GET /products` — public
Query: `?page=1&limit=10&search=&category=uuid&brand=&sort=name&order=asc`
Response: list of `{ id, name, thumbnail, category, brand, vendorId, vendorName, inventory:{available}, startingPrice, status }` + `meta`.

### `GET /products/:id` — public, aggregated:
```json
{ "id","name","description","brand","manufacturer",
  "category":{"id","name"},
  "vendor":{"id","companyName"},
  "images":[{"id","url"}],
  "inventory":{"available","reserved","rented","maintenance"},
  "pricing":[{"id","period","duration","price","deposit"}],
  "lateFeeRule":{...}, "cancellationPolicy":{...} }
```

### `PATCH /products/:id` *(vendor, owner)* — partial update, same field rules. `403 FORBIDDEN_NOT_OWNER` if not owner.

### `DELETE /products/:id` *(vendor, owner)* — soft delete → `status:'INACTIVE'`; `409 PRODUCT_IN_ACTIVE_RENTAL` if any non-terminal order references it.

### `PATCH /products/:id/inventory` *(vendor, owner)*
`{ "available": int>=0, "maintenance": int>=0 }` only. `reserved`/`rented` in body → `403 FORBIDDEN` (reject explicitly).

### `GET /products/:id/inventory` — `{ total, available, reserved, rented, maintenance }`

### `POST /products/:id/pricing` *(vendor, owner)*
`{ "period":"HOUR|DAY|WEEK", "duration":int>0, "price":int>0, "deposit":int>=0 }` → `409 PRICING_ALREADY_EXISTS` on duplicate (product,period,duration).

### `GET /products/:id/pricing`, `PATCH /pricing/:id`, `DELETE /pricing/:id` — standard CRUD, ownership via parent product.

### `POST /vendor/return-slots` *(vendor)*
`{ "date":"YYYY-MM-DD", "slotLabel":"MORNING|AFTERNOON|EVENING", "capacity":int>0 }` → `201`

### `GET /vendor/return-slots?date=` — `[{id, date, slotLabel, capacity, bookedCount}]`

### `PUT /vendor/late-fee-rule`
`{ "gracePeriodHours":int>=0, "rateType":"HOURLY|DAILY", "rateAmount":int>0, "maxCap":int>0 }`

### `PUT /vendor/cancellation-policy`
`{ "fullRefundHoursBefore":int>=0, "partialRefundHoursBefore":int>=0, "partialRefundPercent":0-100 }`

**Inventory state machine (system-triggered inside Order Service transaction handlers, same DB, no cross-service HTTP call):**
```
Order → CONFIRMED                        available -= qty, reserved += qty
Order → CANCELLED / REJECTED_AT_DELIVERY  reserved  -= qty, available += qty
Order → HANDED_OVER                       reserved  -= qty, rented += qty
Order → COMPLETED                         rented    -= qty, available += qty
Order → INSPECTED (damage, unusable)      rented    -= qty, maintenance += qty
```

**Error codes:** `CATEGORY_NOT_FOUND`, `PRODUCT_NOT_FOUND`, `PRODUCT_ALREADY_EXISTS`, `PRODUCT_IN_ACTIVE_RENTAL`, `INVENTORY_INVALID`, `INVENTORY_INSUFFICIENT`, `PRICING_ALREADY_EXISTS`, `PRICING_NOT_FOUND`, `FORBIDDEN_NOT_OWNER`, `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`.

---

# PART 4 — ORDER SERVICE

### Status lifecycle (memorize this)
```
PENDING_PAYMENT → CONFIRMED → DISPATCHED →
  ├─ REJECTED_AT_DELIVERY   (auto full refund, clock never starts, inventory released)
  ├─ REPLACEMENT_REQUESTED  (loops back to DISPATCHED via resolve-replacement, or → refund)
  └─ HANDED_OVER            (actualHandoverTime set, clock starts)
       → ACTIVE_RENTAL
       → RETURN_SCHEDULED
       → RETURNED_PENDING_INSPECTION
       → INSPECTED → DEPOSIT_REFUNDED | PENALTY_APPLIED → COMPLETED
(pre-DISPATCHED)              → CANCELLED
(post-HANDED_OVER, in window) → DISPUTED → ACTIVE_RENTAL | CANCELLED(refunded)
```

### `POST /orders` *(customer)*
```json
{ "productId":"uuid","pricingId":"uuid","quantity":1,"channel":"ONLINE",
  "deliveryType":"PICKUP|DELIVERY",
  "rentalPeriodStart":"iso","rentalPeriodEnd":"iso" }
```
Rules: product `ACTIVE`; `inventory.available >= quantity` (row-locked check — your concurrency-safety point, `409 INVENTORY_INSUFFICIENT` otherwise); `rentalPeriodStart` in future.
Response `201`: order DTO (`status:PENDING_PAYMENT`) + `{ stripeClientSecretRental, stripeClientSecretDeposit }`.

### `POST /vendor/orders` *(vendor, offline)*
Same + `customerEmail` (vendor enters client manually), `channel:"OFFLINE"` → straight to `CONFIRMED` after `POST /orders/:id/mark-paid-offline`.

### `GET /orders/:id` — owner only (`403` otherwise) → full DTO incl. `product`, `deposit`, `payment`, `inspectionReport?`, `orderEvents[]`.

### `GET /orders?status=&page=&limit=` — auto-scoped to caller (customer → own orders; vendor → orders on their products).

### `POST /orders/:id/dispatch` *(vendor, owner)* — guard `status==CONFIRMED` → `DISPATCHED`. `409 INVALID_STATE_TRANSITION` otherwise. Enqueue `dispatch-notification-email`.

### `POST /orders/:id/confirm-delivery` *(customer, owner)* — guard `status==DISPATCHED`
```json
{ "decision":"ACCEPT" }
// or
{ "decision":"REJECT","resolution":"REFUND|REPLACE","reason":"string","photos":["url"] }
```
- `ACCEPT` → `HANDED_OVER`, `actualHandoverTime=now`, inventory `reserved→rented`. Enqueue email.
- `REJECT`+`REFUND` → `REJECTED_AT_DELIVERY`, full Stripe refund (rental fee + deposit), inventory `reserved→available`. Enqueue email.
- `REJECT`+`REPLACE` → `REPLACEMENT_REQUESTED`, no refund yet, notify vendor.

### `POST /orders/:id/resolve-replacement` *(vendor)*
`{ "resolution":"REDISPATCH|REFUND" }` → `REDISPATCH`: back to `DISPATCHED` (checks `inventory.available>0` for new unit first, else forces `REFUND`); `REFUND`: same as reject/refund path.

### `POST /orders/:id/return-slot` *(customer, owner)* — guard `status==ACTIVE_RENTAL`
`{ "returnSlotId":"uuid" }` — row-locked capacity check (`409 SLOT_FULL`) → `RETURN_SCHEDULED`, `booked_count += 1`.

### `POST /orders/:id/mark-returned` *(vendor, owner)* — guard `RETURN_SCHEDULED` → `RETURNED_PENDING_INSPECTION`, `actualReturnTime = now` (or supplied).

### `POST /orders/:id/inspect` *(vendor, owner)*
```json
{ "damageFound":false,"conditionNotes":"string","photos":["url"],"damageDeductionAmount":0 }
```
Server computes `lateByMinutes = max(0, actualReturnTime - rentalPeriodEnd)`, applies vendor's `LateFeeRule`, sums with `damageDeductionAmount` (capped at deposit amount) → `penaltyAmount`, `refundAmount`. → `INSPECTED` → `DEPOSIT_REFUNDED`|`PENALTY_APPLIED` → `COMPLETED`. Stripe refund issued (full or partial). Inventory `rented→available` (or `→maintenance` if `damageFound`).

### `POST /orders/:id/report-issue` *(customer, owner)* — guard `ACTIVE_RENTAL`/`HANDED_OVER`, within report window (e.g. 24h of handover)
`{ "description":"string","photos":["url"] }` → `DISPUTED`. Notify vendor.

### `POST /orders/:id/resolve-dispute` *(vendor)*
`{ "resolution":"ACCEPT|REJECT","note":"string" }` — `ACCEPT`: full refund, → `CANCELLED`, inventory released; `REJECT`: → `ACTIVE_RENTAL`.

### `POST /orders/:id/cancel` *(customer or vendor, owner)* — guard `status in {PENDING_PAYMENT, CONFIRMED}`
Server computes refund % from `CancellationPolicy` vs time-until-`rentalPeriodStart` → `CANCELLED`. **Must release inventory (`reserved→available`) — test explicitly, most common bug source.**

### `POST /orders/:id/mark-paid-offline` *(vendor, offline only)* — no Stripe → `CONFIRMED`, `Deposit(status:HELD, method:OFFLINE)`.

### `POST /webhooks/stripe` — no JWT, verify `Stripe-Signature`. `payment_intent.succeeded` → `CONFIRMED` + create `Deposit(HELD)`. `charge.refunded` → update `Payment`/`Deposit`.

### `GET /vendor/dashboard` *(vendor)*
```json
{ "activeRentals","dueToday","overdue","upcomingPickups","upcomingReturns",
  "revenue","depositsHeld","lateFeesCollected" }
```
Also pushed live via Socket.IO event `dashboard:update` (room = `vendor:{vendorUserId}`) on every order-state change.

**Error codes:** `ORDER_NOT_FOUND`, `INVALID_STATE_TRANSITION`, `INVENTORY_INSUFFICIENT`, `SLOT_FULL`, `FORBIDDEN_NOT_OWNER`, `VALIDATION_ERROR`, `PAYMENT_FAILED`.

Every mutating order endpoint inserts one row into `order_events` — this is your live "explain what happened" audit trail for judges.

---

# PART 5 — BACKGROUND JOBS (BullMQ)

```
order-confirmed-email
dispatch-notification-email
handover-confirmed-email
delivery-rejected-refund-email
replacement-requested-email
return-reminder-email        (recurring, N hours before rentalPeriodEnd)
overdue-detection-job        (recurring cron — scans ACTIVE_RENTAL past rentalPeriodEnd,
                               flags overdue, pushes dashboard:update, emails vendor)
inspection-complete-email
dispute-reported-email
order-cancelled-email
```

---

# PART 6 — BUILD ORDER

1. Auth (done) → 2. Categories (seed script, no UI) → 3. Products + Inventory + Pricing →
4. Orders create + Stripe intents → 5. dispatch → confirm-delivery (incl. inventory transitions,
this is your riskiest integration, get it working early) → 6. return-slot → mark-returned →
inspect (incl. deposit settlement) → 7. cancel + dispute + replacement → 8. dashboard +
Socket.IO + BullMQ jobs → 9. hardening pass: rate limiting, Sentry, caching on `GET /products`,
load test script.

Frontend can build against every request/response shape above immediately, in parallel,
using a mock server — these shapes are the contract, don't let them drift from this file.