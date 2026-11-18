import crypto from 'crypto';
import { getSupabaseServerClient } from '../supabaseServer.js';
import { ensureServerEnv } from '../envHelper.js';

/**
 * Verifies PayMongo's `Paymongo-Signature` header (`t=...,te=...,li=...`)
 * using HMAC-SHA256 and constant-time comparison.
 */
function verifyPaymongoSignature(rawBody, signatureHeader, webhookSecret) {
  if (!signatureHeader || !webhookSecret) return false;

  const parts = String(signatureHeader)
    .split(',')
    .reduce((acc, part) => {
      const [k, v] = part.trim().split('=');
      if (k && v) acc[k] = v;
      return acc;
    }, {});

  const timestamp = parts.t;
  const testSig = parts.te;
  const liveSig = parts.li;
  if (!timestamp || (!testSig && !liveSig)) return false;

  const payloadToSign = `${timestamp}.${rawBody}`;
  const computedHex = crypto
    .createHmac('sha256', webhookSecret)
    .update(payloadToSign, 'utf8')
    .digest('hex');

  const computedBuf = Buffer.from(computedHex, 'utf8');

  const compareSafe = (candidate) => {
    if (!candidate) return false;
    const candBuf = Buffer.from(candidate, 'utf8');
    return candBuf.length === computedBuf.length && crypto.timingSafeEqual(candBuf, computedBuf);
  };

  return compareSafe(testSig) || compareSafe(liveSig);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    ensureServerEnv();

    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    // 1. Verify PayMongo Webhook Signature when PAYMONGO_WEBHOOK_SECRET is configured
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
    const signatureHeader = req.headers['paymongo-signature'] || req.headers['Paymongo-Signature'];

    if (webhookSecret) {
      const isValid = verifyPaymongoSignature(rawBody, signatureHeader, webhookSecret);
      if (!isValid) {
        console.warn('[PayMongo Webhook] Invalid Paymongo-Signature rejected.');
        return res.status(401).json({ error: 'Unauthorized webhook signature' });
      }
    }

    const eventAttr = payload?.data?.attributes || {};
    const eventType = eventAttr.type || '';
    const resource = eventAttr.data || {};
    const resourceId = resource.id || '';
    const resourceAttr = resource.attributes || {};

    // Extract order reference from reference_number or metadata
    const externalId =
      resourceAttr.reference_number ||
      resourceAttr.metadata?.order_reference ||
      resourceAttr.external_id ||
      '';

    console.log(`[PayMongo Webhook] Event: ${eventType}, Ref: ${externalId}, Resource: ${resourceId}`);

    if (!externalId) {
      return res.status(200).json({ received: true, skipped: 'No order reference in event payload' });
    }

    // 2. Initialize Supabase Server-Side Client
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      console.error('[PayMongo Webhook] Supabase credentials missing');
      return res.status(500).json({ error: 'Database configuration missing' });
    }

    // 3. Fetch Existing Order from Database for Reconciliation
    const { data: existingOrder, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('order_reference', externalId)
      .maybeSingle();

    if (fetchErr || !existingOrder) {
      console.warn(`[PayMongo Webhook] Order ${externalId} not found in database.`);
      return res.status(404).json({ error: 'Order not found' });
    }

    const isPaidEvent =
      eventType === 'checkout_session.payment.paid' ||
      eventType === 'payment.paid';

    if (isPaidEvent) {
      // Verify Checkout Session ID matches stored invoice ID if applicable
      if (
        resourceId.startsWith('cs_') &&
        existingOrder.xendit_invoice_id &&
        existingOrder.xendit_invoice_id !== resourceId
      ) {
        console.error(
          `[PayMongo Webhook] Checkout Session ID mismatch for ${externalId}: expected ${existingOrder.xendit_invoice_id}, got ${resourceId}`
        );
        return res.status(400).json({ error: 'Checkout Session ID does not match order record' });
      }

      // Reconcile paid amount (PayMongo amounts are in centavos)
      const payments = Array.isArray(resourceAttr.payments) ? resourceAttr.payments : [];
      const rawCentavos =
        payments[0]?.attributes?.amount ||
        resourceAttr.payment_intent?.attributes?.amount ||
        resourceAttr.amount ||
        0;
      const reportedPaidPhp = Math.round(Number(rawCentavos) / 100);
      const orderTotalPhp = Math.round(Number(existingOrder.total_amount) || 0);

      if (reportedPaidPhp > 0 && orderTotalPhp > 0 && reportedPaidPhp < orderTotalPhp) {
        console.error(
          `[PayMongo Webhook] Payment amount mismatch for ${externalId}: expected ₱${orderTotalPhp}, got ₱${reportedPaidPhp}`
        );
        return res.status(400).json({ error: 'Reported payment amount is less than order total' });
      }

      const { error: updateErr } = await supabase
        .from('orders')
        .update({
          payment_status: 'PAID',
          status: 'TO_SHIP',
          updated_at: new Date().toISOString(),
        })
        .eq('order_reference', externalId);

      if (updateErr) {
        console.error(`[PayMongo Webhook] Failed to update order ${externalId} to PAID:`, updateErr.message);
        return res.status(500).json({ error: updateErr.message });
      }

      // Idempotent inventory deduction upon confirmed payment
      if (!existingOrder.inventory_deducted && Array.isArray(existingOrder.items)) {
        try {
          await supabase.rpc('deduct_product_inventory', { p_items: existingOrder.items });
          await supabase
            .from('orders')
            .update({ inventory_deducted: true })
            .eq('order_reference', externalId);
        } catch (dErr) {
          console.warn('[PayMongo Webhook] Inventory deduction notice:', dErr.message);
        }
      }
    } else if (eventType === 'payment.failed') {
      console.warn(`[PayMongo Webhook] Payment failed for order ${externalId}`);
    }

    return res.status(200).json({ received: true, external_id: externalId, event: eventType });
  } catch (err) {
    console.error('[PayMongo Webhook] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}

