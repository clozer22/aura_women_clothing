import { getSupabaseServerClient } from './lib/supabaseServer.js';


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Verify Xendit Webhook Callback Token (if configured in environment)
    const webhookToken = process.env.XENDIT_WEBHOOK_TOKEN;
    const incomingToken = req.headers['x-callback-token'] || req.headers['x-webhook-token'];

    if (webhookToken && incomingToken !== webhookToken) {
      console.warn('Unauthorized Xendit Webhook attempt: Invalid callback token');
      return res.status(401).json({ error: 'Unauthorized callback token' });
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { status, external_id, paid_amount, payment_method, payment_channel, id } = payload;

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

    // 3. Update Order Status in Database based on Payment Outcome
    if (status === 'PAID' || status === 'SETTLED') {
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

      // 4. Automatically Dispatch Shipment to J&T Express (with Shipmates fallback)
      try {
        const { data: paidOrder } = await supabase
          .from('orders')
          .select('*')
          .eq('order_reference', external_id)
          .maybeSingle();

        if (paidOrder) {
          // Idempotent inventory deduction check upon webhook confirmation
          if (!paidOrder.inventory_deducted && Array.isArray(paidOrder.items)) {
            try {
              await supabase.rpc('deduct_product_inventory', { p_items: paidOrder.items });
              await supabase.from('orders').update({ inventory_deducted: true }).eq('order_reference', external_id);
              paidOrder.inventory_deducted = true;
            } catch (dErr) {
              console.warn('[Xendit Webhook] Inventory deduction notice:', dErr.message);
            }
          }

          // Order remains in Awaiting Shipment (TO_SHIP) stage until the store admin
          // arranges shipment (moving order to Awaiting Collection) in the seller dashboard.
          console.log(`[Xendit Webhook] Order ${external_id} marked as PAID and ready for merchant fulfillment.`);
        }
      } catch (shipErr) {
        console.error(`[Xendit Webhook] Courier booking error for ${external_id}:`, shipErr.message);
      }
    } else if (status === 'EXPIRED') {
      await supabase
        .from('orders')
        .update({
          payment_status: 'EXPIRED',
          status: 'CANCELLED',
        })
        .eq('order_reference', external_id);
    }

    return res.status(200).json({ received: true, external_id, status });
  } catch (err) {
    console.error('Xendit webhook error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
