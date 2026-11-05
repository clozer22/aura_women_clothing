import { getSupabaseServerClient } from './_lib/supabaseServer.js';
import { ensureServerEnv } from './_lib/envHelper.js';
import { sendOutForDeliveryEmail } from './_lib/emailService.js';

export default async function handler(req, res) {
  // CORS Preflight & Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    ensureServerEnv();

    const { orderId, orderReference } = req.body || req.query || {};

    if (!orderId && !orderReference) {
      return res.status(400).json({
        success: false,
        error: 'Order ID or Order Reference is required to dispatch delivery notification.',
      });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database connection unavailable.' });
    }

    let query = supabase.from('orders').select('*');
    if (orderId) {
      query = query.eq('id', orderId);
    } else {
      query = query.eq('order_reference', String(orderReference).trim().toUpperCase());
    }

    const { data: order, error } = await query.maybeSingle();

    if (error || !order) {
      return res.status(404).json({
        success: false,
        error: `Order not found for ${orderId || orderReference}`,
      });
    }

    // Dispatch the Out for Delivery notification
    const emailResult = await sendOutForDeliveryEmail(order);

    if (emailResult.success && !emailResult.skipped) {
      // Mark as notified in shipment_payload to prevent duplicate sends
      const existingPayload = order.shipment_payload || {};
      const updatedPayload = {
        ...existingPayload,
        out_for_delivery_notified_at: new Date().toISOString(),
        out_for_delivery_recipient: order.customer_email,
      };

      await supabase
        .from('orders')
        .update({
          shipment_payload: updatedPayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);
    }

    return res.status(200).json({
      success: true,
      emailResult,
      recipient: order.customer_email,
      orderReference: order.order_reference,
    });
  } catch (err) {
    console.error('[Notify Delivery API] Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to dispatch delivery notification email.',
    });
  }
}
