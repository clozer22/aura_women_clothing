import { getSupabaseServerClient } from './lib/supabaseServer.js';
import { bookShipmentWithShipmates } from './lib/shipmates.js';

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

      // 4. Automatically Dispatch Shipment to Shipmates (Test Mode / Sandbox / Live)
      try {
        const { data: paidOrder } = await supabase
          .from('orders')
          .select('*')
          .eq('order_reference', external_id)
          .maybeSingle();

        if (paidOrder) {
          console.log(`[Xendit Webhook] Auto-dispatching Order ${external_id} to Shipmates...`);
          const shipResult = await bookShipmentWithShipmates(paidOrder);
          console.log(`[Xendit Webhook] Shipmates booking complete for ${external_id}. Tracking: ${shipResult.trackingNumber}`);
        }
      } catch (shipErr) {
        console.error(`[Xendit Webhook] Shipmates booking error for ${external_id}:`, shipErr.message);
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
