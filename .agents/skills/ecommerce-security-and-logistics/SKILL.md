---
name: ecommerce-security-and-logistics
description: >-
  End-to-end e-commerce order lifecycle, payment security standards (Xendit),
  courier logistics integration (J&T Express Philippines Open API, Shipmates), and
  credential hardening rules for Aura Women's Clothing. Use when modifying checkout,
  payment processing, courier dispatch, Supabase security policies, or integrating shipping APIs.
---

# E-Commerce Security, Payment Architecture & Logistics Runbook

This skill defines the technical standards, payment security workflows, and courier integration specifications for the **Aura Women's Clothing** platform. All agents modifying checkout, serverless functions, database queries, or courier integrations must adhere to these directives.

---

## 1. Complete E-Commerce Transaction & State Machine

```
[Storefront Cart / Checkout]
         │
         ▼
[Serverless API: /api/create-order-invoice]
         ├── 1. Recalculate Subtotal from Database (Tamper Prevention)
         ├── 2. Validate 11-digit PH Phone & Address
         └── 3. Branch by Payment Method
                 │
                 ├── [A: Cash on Delivery (COD)]
                 │       ├── Validate Total <= ₱1,000 PHP Cap
                 │       ├── Insert order into Supabase with status="TO_SHIP", payment="PENDING"
                 │       └── Auto-book Dispatch with Courier (J&T Express / Shipmates)
                 │
                 └── [B: Online Payment (GCash, Maya, Card)]
                         ├── Call Xendit Invoices API Server-to-Server
                         ├── Return encrypted checkout invoice URL
                         └── Await Customer Payment on Xendit
                                 │
                                 ▼
                     [/api/xendit-webhook]
                         ├── Verify x-callback-token
                         ├── Verify Idempotency (prevent duplicate bookings)
                         ├── Update Supabase status="TO_SHIP", payment_status="PAID"
                         └── Auto-book Dispatch with Courier (J&T Express / Shipmates)
```

### Order Status Lifecycle
* **`PENDING`**: Online payment initiated, awaiting customer completion on GCash/card.
* **`TO_SHIP`**: Order confirmed and ready at Salcedo Atelier. Waiting for courier pickup.
* **`SHIPPED`**: Courier has scanned parcel into sorting hub. In transit.
* **`TO_DELIVER`**: Parcel is with local delivery rider for final doorstep delivery.
* **`DELIVERED`**: Order received by customer (and cash collected if COD).
* **`CANCELLED` / `RETURNED`**: Order cancelled or return-to-sender (RTS) processed.

---

## 2. Strict Security & Secrets Protection Framework

### A. The Zero-Leak Rule
**Never hardcode secrets, private keys, or credentials into source code—not even as fallback strings.**

```javascript
// ❌ DANGEROUS: Leaks secret to Git / client bundles
const apiKey = process.env.XENDIT_SECRET_KEY || 'xnd_development_G4K4i...';

// ✅ SECURE: Fails safely and alerts administrator
const apiKey = process.env.XENDIT_SECRET_KEY;
if (!apiKey) {
  throw new Error('XENDIT_SECRET_KEY is not configured in environment variables.');
}
```

### B. Client vs. Serverless Key Isolation
* **Client-Safe Keys (`VITE_*`)**: Bundled into the browser. Only use for truly public tokens:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY` (protected by PostgreSQL Row Level Security)
  - `VITE_WEB3FORMS_ACCESS_KEY`
* **Serverless Backend Secrets**: Must **NEVER** have the `VITE_` prefix:
  - `XENDIT_SECRET_KEY`
  - `XENDIT_WEBHOOK_TOKEN`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `JT_EXPRESS_API_KEY`
  - `SHIPMATES_API_KEY`

### C. Server-Side Price Verification
Client applications must **never** submit subtotal or total figures directly to payment gateways. The serverless function must look up unit prices in the database or canonical catalog and compute `subtotal + shipping_fee` independently.

See detailed reference: [xendit-security-runbook.md](./references/xendit-security-runbook.md)

---

## 3. J&T Express Philippines API Integration Playbook

When J&T Express releases the testing API key and VIP merchant credentials, follow this integration protocol.

### A. Required Credentials Schema
Add the following keys to `.env` (locally) and **Vercel Project Settings > Environment Variables** (production):
```env
JT_EXPRESS_TEST_MODE=true
JT_EXPRESS_ECCOMPANY_ID=YOUR_ASSIGNED_ECCOMPANY_ID
JT_EXPRESS_CUSTOMER_ID=YOUR_ASSIGNED_CUSTOMER_ID
JT_EXPRESS_API_KEY=YOUR_ASSIGNED_SECRET_SALT
JT_EXPRESS_BASE_URL=https://test-api.jtexpress.ph/jts-ph-openplatform-api
```

### B. Digital Signature Generation
J&T Express requires digital digest verification via MD5 and Base64:
$$\text{data\_digest} = \text{base64}(\text{md5}(\text{logistics\_interface} + \text{key}))$$

```javascript
import crypto from 'crypto';

export function generateJtDigest(jsonString, apiKey) {
  const combined = jsonString + apiKey;
  return crypto.createHash('md5').update(combined, 'utf8').digest('base64');
}
```

### C. Booking Workflow (`ORDERCREATE`)
1. **Order Payload**: Prepare sender (Aura Atelier Salcedo), recipient details, parcel weight, and COD collection amount.
2. **Form POST**: Send `logistics_interface`, `data_digest`, `msg_type: "ORDERCREATE"`, and `eccompanyid` via `application/x-www-form-urlencoded`.
3. **Tracking Storage**: Extract `billcode` (e.g., `JT1234567890`) and save it to the Supabase `orders` table under `tracking_number`, setting `courier_name = 'J&T Express'`.
4. **Waybill URL**: Construct printable thermal waybill label link for the Admin Orders tab.

See deep technical reference with exact schemas: [jt-express-api.md](./references/jt-express-api.md)

---

## 4. Pre-Commit Security & Quality Checklist

Before committing any change to this repository:
1. Run `git diff` to ensure no API keys or JWT strings were added as fallback literals.
2. Confirm `.env` is ignored by Git (`git status` must never show `.env`).
3. Ensure serverless functions validate required parameters and handle errors gracefully with clear HTTP status codes (`400`, `401`, `500`).
4. Validate that production builds succeed cleanly without warnings (`npm run build`).
