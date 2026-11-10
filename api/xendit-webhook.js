import crypto from 'crypto';
import { getSupabaseServerClient } from './_lib/supabaseServer.js';
import { ensureServerEnv } from './_lib/envHelper.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    ensureServerEnv();

    // 1. Verify Xendit Webhook Callback Token (Fail Closed)
    const webhookToken = process.env.XENDIT_WEBHOOK_TOKEN;
    if (!webhookToken) {
      console.error('[Xendit Webhook] Configuration error: XENDIT_WEBHOOK_TOKEN is not configured.');
      return res.status(500).json({ error: 'Payment gateway webhook configuration missing' });
    }

    const incomingToken = String(req.headers['x-callback-token'] || req.headers['x-webhook-token'] || '');

    // Constant-time token comparison to prevent timing side-channel leaks
    const incomingBuf = Buffer.from(incomingToken);
    const expectedBuf = Buffer.from(webhookToken);
    const tokensMatch =
      incomingBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(incomingBuf, expectedBuf);

    if (!tokensMatch) {
      console.warn('Unauthorized Xendit Webhook attempt: Invalid callback token');
      return res.status(401).json({ error: 'Unauthorized callback token' });
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { status, external_id, paid_amount, id } = payload;

    console.log(`Received Xendit Webhook for Order: ${external_id}, Status: ${status}`);

    if (!external_id) {
      return res.status(400).json({ error: 'Missing external_id' });
    }

    // 2. Initialize Supabase Server-Side Client
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      console.error('Supabase credentials missing on serverless webhook handler');
      return res.status(500).json({ error: 'Database configuration missing' });
    }

    // 3. Fetch Existing Order from Database for Reconciliation
    const { data: existingOrder, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('order_reference', external_id)
      .maybeSingle();

    if (fetchErr || !existingOrder) {
      console.warn(`[Xendit Webhook] Order ${external_id} not found in database.`);
      return res.status(404).json({ error: 'Order not found' });
    }

    // 4. Update Order Status in Database based on Payment Outcome
    if (status === 'PAID' || status === 'SETTLED') {
      // Reconcile paid amount against total_amount to prevent partial payment bypass
      const orderTotal = Math.round(Number(existingOrder.total_amount) || 0);
      const reportedPaid = Math.round(Number(paid_amount) || 0);

      if (reportedPaid > 0 && orderTotal > 0 && reportedPaid < orderTotal) {
        console.error(`[Xendit Webhook] Payment amount mismatch for ${external_id}: expected ₱${orderTotal}, got ₱${reportedPaid}`);
        return res.status(400).json({ error: 'Reported payment amount is less than order total' });
      }

      // Verify invoice ID if stored on order
      if (id && existingOrder.xendit_invoice_id && existingOrder.xendit_invoice_id !== id) {
        console.error(`[Xendit Webhook] Invoice ID mismatch for ${external_id}: expected ${existingOrder.xendit_invoice_id}, got ${id}`);
        return res.status(400).json({ error: 'Invoice ID does not match order record' });
      }

      const { error: updateErr } = await supabase
        .from('orders')
        .update({
          payment_status: 'PAID',
          status: 'TO_SHIP',
          updated_at: new Date().toISOString(),
        })
        .eq('order_reference', external_id);

      if (updateErr) {
        console.error(`Failed to update order ${external_id} to PAID:`, updateErr.message);
        return res.status(500).json({ error: updateErr.message });
      }

      console.log(`Order ${external_id} successfully verified and updated to PAID.`);

      // 5. Idempotent inventory deduction check upon confirmed payment
      if (!existingOrder.inventory_deducted && Array.isArray(existingOrder.items)) {
        try {
          await supabase.rpc('deduct_product_inventory', { p_items: existingOrder.items });
          await supabase.from('orders').update({ inventory_deducted: true }).eq('order_reference', external_id);
          existingOrder.inventory_deducted = true;
        } catch (dErr) {
          console.warn('[Xendit Webhook] Inventory deduction notice:', dErr.message);
        }
      }
    } else if (status === 'EXPIRED') {
      await supabase
        .from('orders')
        .update({
          payment_status: 'EXPIRED',
          status: 'CANCELLED',
          updated_at: new Date().toISOString(),
        })
        .eq('order_reference', external_id);
    }

    return res.status(200).json({ received: true, external_id, status });
  } catch (err) {
    console.error('Xendit webhook error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
