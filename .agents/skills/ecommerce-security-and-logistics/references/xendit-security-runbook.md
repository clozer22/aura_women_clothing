# Xendit Payment Security & Webhook Handling Runbook

This reference establishes security standards and execution patterns for online payment orchestration with Xendit Philippines (GCash, Maya, Visa/Mastercard).

---

## 1. Zero-Trust Server-Side Price Recalculation

### Principle
**Never trust client-side prices or totals passed in the checkout request body.**

```
Client Body: { items: [{ id: "aura-01", price: 1, quantity: 10 }] } ❌ REJECTED
```

### Execution Flow in `api/create-order-invoice.js`
1. The client only sends `id` and `quantity`.
2. The serverless handler looks up the official canonical price in the database or verified product catalog.
3. Subtotal and shipping fees are computed strictly server-side:
   ```javascript
   const verifiedItems = items.map((clientItem) => {
     const dbProduct = verifiedProductMap.get(clientItem.id);
     if (!dbProduct) throw new Error(`Product ${clientItem.id} no longer exists.`);
     
     const unitPrice = Number(dbProduct.price);
     return {
       id: dbProduct.id,
       name: dbProduct.name,
       price: unitPrice,
       quantity: clientItem.quantity,
       total: unitPrice * clientItem.quantity,
     };
   });
   ```
4. The calculated server-side total is passed directly to the Xendit Invoices API.

---

## 2. API Key Protection Rules

1. **Secret Key**: `XENDIT_SECRET_KEY` (format: `xnd_development_...` or `xnd_production_...`).
   * **Rule**: ONLY access within `/api/*.js` (Node.js runtime).
   * **Rule**: NEVER prefix with `VITE_` (prevents Vite from bundling it into browser assets).
   * **Rule**: NEVER provide fallback strings in code. Throw an error if missing.
2. **Public Key**: `VITE_XENDIT_PUBLIC_KEY` (format: `xnd_public_development_...` or `xnd_public_production_...`).
   * Used only if rendering Xendit.js card tokenization components on the frontend.

---

## 3. Webhook Token Verification & Idempotency

Xendit sends HTTP POST notifications to `/api/xendit-webhook` whenever an invoice is paid or expires.

### Webhook Verification
Every webhook includes the `x-callback-token` header. Verify this against `process.env.XENDIT_WEBHOOK_TOKEN`:
```javascript
const webhookToken = process.env.XENDIT_WEBHOOK_TOKEN;
const incomingToken = req.headers['x-callback-token'] || req.headers['x-webhook-token'];

if (!webhookToken || incomingToken !== webhookToken) {
  console.warn('[Security Alert] Unauthorized Xendit webhook callback attempt');
  return res.status(401).json({ error: 'Unauthorized callback token' });
}
```

### Idempotency Enforcement
Xendit can send duplicate webhooks if network retries occur. Ensure the handler is idempotent:
1. Check current order status in Supabase.
2. If already `PAID` or `TO_SHIP`, skip courier re-booking and return `200 OK` immediately:
   ```javascript
   if (existingOrder.payment_status === 'PAID') {
     return res.status(200).json({ received: true, note: 'Order already processed' });
   }
   ```
3. Update status to `PAID`, set `status = 'TO_SHIP'`, and dispatch shipment to J&T / Shipmates once.
