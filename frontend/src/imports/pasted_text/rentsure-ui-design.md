Design a complete web application UI for "Rentsure" — a B2B/B2C rental management platform (customers rent physical products for a time period with a security deposit; vendors manage products, inventory, pricing, orders, inspections, and a live dashboard). This must look like a real, manually hand-designed modern SaaS product — NOT a generic AI-generated template. Avoid centered-everything layouts, avoid overly rounded "friendly" cards everywhere, avoid generic dashboard clichés. Reference modern B2B SaaS products like Linear, Stripe Dashboard, and Notion for layout discipline — asymmetric grids, real information density, confident whitespace, sharp alignment, restrained use of shadows.

## STRICT RULE — DATA FIELD FIDELITY TO API CONTRACT
Every field, label, table column, and form input in every screen below must come EXACTLY from the API contract fields listed here — same names, same nesting, same types. Do NOT invent extra fields, rename fields, merge fields, or add placeholder data not backed by the contract. The backend is being built in parallel from this exact same contract — any mismatch causes real integration conflicts during wiring. If a screen needs a field not listed here, do not invent it — leave a labeled placeholder comment instead of fabricating a field name.

## COLOR PALETTE (use exactly these — no substitutions, no additional hues except neutral grays)
- Evergreen #344C3D — navbar background, primary headings, primary body text on light backgrounds
- Moss #738A6E — primary buttons, active nav states, links, primary icons
- Sage #8EA58C — secondary buttons, neutral status badges, chart accent color
- Sage Hint #BFCFBB — card backgrounds, subtle section backgrounds, hover states
- Mint #A9C2A4 — disabled states, secondary card backgrounds
- Warning Amber #C97B3D — ONLY for "Overdue", "Damage Detected", "Disputed", "Insufficient Inventory" states — must visually break from the green theme for instant scannability
- Neutral base — background #FAFAF8, body text #1A1A1A, borders #E4E7E2

## TYPOGRAPHY & STYLE
Modern geometric sans-serif (Inter/Manrope style), confident type-scale hierarchy. Buttons: 8px corner radius (not full pill) to avoid generic "AI SaaS" look. 1px subtle borders instead of heavy drop shadows. Status badges: pill-shaped, 15%-opacity colored background + solid text of the same hue.

---

## GLOBAL UI PATTERNS (apply to every list/table screen)
- Pagination footer styled as numbered pages (this contract uses page-based pagination, NOT cursor-based): show current page, total pages, and total count — matches response meta `{ page, limit, total, totalPages }`.
- Every list screen needs: loading skeleton state, empty state, and error state (styled from `{ success:false, error:{ code, message } }`) — design all three, not just the happy path.
- Success toast pattern: small toast reading the `message` field from the envelope (e.g. "Product created successfully").

---

## SCREENS TO DESIGN

### 1. Auth Screens

**1a. Login** — email, password fields, role toggle tab (Customer / Vendor). Include a visibly designed "Demo Credentials" info card (Sage Hint background, bordered, small info icon) showing:
  - Customer demo: demo.customer@rentsure.app / Demo@1234
  - Vendor demo: demo.vendor@rentsure.app / Demo@1234
  Add a "Forgot password?" link below the form (maps to forgot-password flow).

**1b. Register (single screen, role-switched form)** — role toggle (Customer / Vendor) at top changes visible fields:
  - Common fields (both roles): fullName, email, password
  - Vendor-only additional fields (appear when Vendor selected): companyName, gstNumber (with inline format hint text, e.g. "Format: 22AAAAA0000A1Z5"), productCategory (text/dropdown)

**1c. Forgot Password** — single email input, submit button, confirmation message state.

**1d. Reset Password** — new password + confirm password fields (token assumed to come from URL, not a visible field).

**1e. Email Verification** — simple confirmation screen with status message (verified / invalid / expired states).

**1f. Profile Page** — view/edit fullName, email (read-only), and for vendors: companyName, gstNumber, productCategory. Edit mode toggles inputs.

### 2. Customer — Product Browsing

**2a. Product Listing (Public)** — grid of product cards, each showing: name, thumbnail, category (badge, from nested `category.name`), brand, vendorName, inventory.available (as "X available", amber badge if 0), startingPrice. Filter bar: search input, category dropdown, brand filter, sort dropdown (name/price), order toggle (asc/desc). Numbered pagination footer at bottom.

**2b. Product Detail** — image gallery (from `images[]`, each with `id`,`url`), name, description, brand, manufacturer, category, vendor.companyName. 
  - **Pricing table/selector**: since this contract supports MULTIPLE pricing options per product (`pricing: [{id, period, duration, price, deposit}]`), design this as a selectable card/table listing each pricing tier — e.g. "1 DAY — ₹500 rental + ₹1000 deposit", "1 WEEK — ₹2800 + ₹1000 deposit" — customer picks one, not a single fixed price.
  - Inventory display: available count.
  - lateFeeRule and cancellationPolicy shown as a collapsible "Rental Terms" section.
  - Quantity selector (maps to order's `quantity` field).
  - Delivery type radio (Pickup/Delivery).
  - Sticky "Rent Now" summary panel showing selected pricing × quantity + deposit total.

### 3. Customer — Order Management

**3a. My Orders (list)** — filterable by status, numbered pagination. Each row: product thumbnail+name, quantity, status badge, rentalPeriodStart, rentalPeriodEnd, channel.

**3b. Order Detail** — nested full DTO display: product info, pricing used, deposit (amountHeld, status, deductionAmount, refundAmount), payment info, quantity, a vertical **Order Timeline component** built from `orderEvents[]` (fromStatus → toStatus, actorRole, timestamp, note) with current status highlighted Moss, past states Sage, future states grayed. Contextual action buttons shown only for the matching status:
  - DISPATCHED → "Confirm Delivery" (Accept/Reject)
  - ACTIVE_RENTAL → "Schedule Return", "Report Issue"
  - HANDED_OVER → "Report Issue"

**3c. Confirm Delivery Modal** — Accept/Reject toggle; if Reject: resolution radio (Refund/Replace), reason textarea, photo upload grid.

**3d. Schedule Return Modal** — list of return slots: date, slotLabel, "capacity vs bookedCount" shown as small progress bar/text (e.g. "6/10 booked").

**3e. Report Issue Modal** — description textarea, photo upload grid.

### 4. Vendor — Dashboard
Stat-card grid (varied sizes, not all identical) from dashboard response: activeRentals, dueToday, overdue (Amber-accented, visually distinct), upcomingPickups, upcomingReturns, revenue (paise→₹ formatted), depositsHeld, lateFeesCollected. Below: recent activity feed styled as a timeline from `order_events`-style data (fromStatus → toStatus, actorRole, timestamp). Small pulsing "Live" indicator near header (implies Socket.IO `dashboard:update`).

### 5. Vendor — Product & Catalog Management

**5a. Product List (vendor's own)** — table: thumbnail, name, category.name, brand, status (ACTIVE/INACTIVE badge), inventory.available, edit/delete actions. Soft-deleted/INACTIVE items shown grayed/archived, not hidden.

**5b. Add/Edit Product Form** — categoryId (dropdown, populated from `GET /categories`), name, description (textarea), brand, manufacturer, thumbnail (single upload), images (multi-upload with preview grid).

**5c. Manage Inventory (per product)** — shows full breakdown: available, reserved, rented, maintenance (read-only display for reserved/rented — these are system-managed, NOT editable per contract). Editable fields: available, maintenance only (contract explicitly rejects vendor edits to reserved/rented). Style reserved/rented fields as visually locked/read-only (grayed input with a small lock icon) to make this restriction obvious in the design itself.

**5d. Manage Pricing (per product)** — table of existing pricing tiers (period, duration, price, deposit) with add/edit/delete row actions. Add form: period dropdown (HOUR/DAY/WEEK), duration number input, price, deposit.

### 6. Vendor — Rental Operations Config

**6a. Return Slots Calendar** — date-based view; each date shows slotLabel (MORNING/AFTERNOON/EVENING) cards with capacity vs bookedCount as a small progress bar (green low occupancy, amber near-full/full).

**6b. Late Fee Rule Settings** — gracePeriodHours, rateType (HOURLY/DAILY toggle), rateAmount, maxCap.

**6c. Cancellation Policy Settings** — fullRefundHoursBefore, partialRefundHoursBefore, partialRefundPercent (slider 0-100).

### 7. Vendor — Order Management

**7a. Orders List** — filterable table by status, numbered pagination. Columns: product name, quantity, channel (ONLINE/OFFLINE tag), status badge, rentalPeriodStart/End, deposit amount. "Add Offline Order" primary button.

**7b. Add Offline Order Form** — productId (searchable dropdown), pricingId (dependent dropdown showing that product's pricing tiers), quantity, customerEmail, rentalPeriodStart/End (date-time pickers), deliveryType.

**7c. Order Detail (vendor view)** — same Order Timeline component as 3b, vendor-side contextual actions:
  - CONFIRMED → "Dispatch"
  - RETURN_SCHEDULED → "Mark Returned"
  - REPLACEMENT_REQUESTED → "Resolve Replacement" (Redispatch/Refund)
  - DISPUTED → "Resolve Dispute" (Accept/Reject + note)

**7d. Inspection Form** — the core damage-fee screen, make it feel premium and receipt-like:
  - damageFound toggle (Yes/No)
  - conditionNotes textarea
  - photos upload grid (matches contract — no video field exists in this contract, photos only)
  - damageDeductionAmount number input
  - Read-only computed display: lateByMinutes, late fee (derived from vendor's LateFeeRule)
  - Live summary card (Sage Hint background, bordered, receipt-style): Deposit Held / Late Fee / Damage Deduction / Refund Amount (large, bold, Evergreen)

### 8. Vendor — Categories awareness
No admin UI needed (categories are seeded), but the category dropdown used in 5b and 2a's filter bar should visually indicate it's pulled from a fixed list (`GET /categories` → `{id, name}`), styled as a clean searchable dropdown, not free text.

---

## COMPONENT CONSISTENCY RULES
- One reusable "Status Badge" component, consistent color mapping everywhere: CONFIRMED/DISPATCHED = Sage, HANDED_OVER/ACTIVE_RENTAL/RETURN_SCHEDULED/RETURNED_PENDING_INSPECTION = Moss, COMPLETED/DEPOSIT_REFUNDED = Evergreen, DISPUTED/PENALTY_APPLIED/REJECTED_AT_DELIVERY = Amber, CANCELLED = neutral gray.
- One reusable "Order Timeline" component used across 3b and 7c.
- One reusable "Pricing Tier Card/Row" component used across 2b and 5d.
- Money always displayed formatted as ₹ (converted from paise, e.g. show "₹500.00" not "50000").
- Pagination component styled consistently everywhere (page-based, not cursor "load more").

Design this as one cohesive Figma file: a shared design-system page first (colors, typography, buttons, badges, inputs, pagination, timeline component), followed by all screens listed above.