import { getSupabaseServerClient } from './_lib/supabaseServer.js';
import { createJtOrder } from './_lib/jtExpress.js';
import { ensureServerEnv } from './_lib/envHelper.js';

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

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    ensureServerEnv();
    const url = new URL(req.url, 'http://localhost');
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const orderRef =
      req.query?.ref ||
      url.searchParams.get('ref') ||
      body.orderReference ||
      body.ref ||
      body.orderId;

    if (!orderRef) {
      return res.status(400).json({
        error: 'Order reference required (e.g. ?ref=AC-XXXXXX or { orderReference: "AC-XXXXXX" })',
      });
    }

    const cleanRef = String(orderRef).trim().toUpperCase();

    // 1. Initialize Supabase
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database configuration missing' });
    }

    // 2. Fetch Order from Supabase (with secure RPC fallback)
    let order = null;
    try {
      const { data: rpcOrder } = await supabase.rpc('get_order_by_reference', { p_order_ref: cleanRef });
      order = rpcOrder;
    } catch (e) {}

    if (!order) {
      const { data: directOrder, error: fetchErr } = await supabase
        .from('orders')
        .select('*')
        .eq('order_reference', cleanRef)
        .maybeSingle();
      if (fetchErr) {
        return res.status(500).json({ error: `Failed to query order: ${fetchErr.message}` });
      }
      order = directOrder;
    }

    if (!order) {
      return res.status(404).json({ error: `Order with reference "${cleanRef}" not found.` });
    }

    // 3. Dispatch booking to J&T Express
    const bookingResult = await createJtOrder(order, {
      weightKg: body.weightKg || req.query?.weight,
      notes: body.notes || 'Handle with care - Aura Women Luxury Garments',
    });

    const targetStatus = body.status || 'AWAITING_COLLECTION';

    // 4. Update Order record in Supabase (persists tracking & waybill via secure RPC)
    try {
      await supabase.rpc('sync_order_fulfillment', {
        p_order_ref: cleanRef,
        p_tracking_number: bookingResult.trackingNumber,
        p_courier_name: 'J&T Express',
        p_waybill_url: bookingResult.waybillUrl,
        p_status: targetStatus,
        p_shipment_status: 'BOOKED',
      });
    } catch (rpcErr) {
      console.warn(`[J&T Dispatch] RPC sync warning:`, rpcErr.message);
    }

    // Also attempt direct update if authenticated
    try {
      await supabase
        .from('orders')
        .update({
          tracking_number: bookingResult.trackingNumber,
          courier_name: 'J&T Express',
          waybill_url: bookingResult.waybillUrl,
          shipment_status: 'BOOKED',
          status: targetStatus,
          arranged_for_collection: true,
          updated_at: new Date().toISOString(),
        })
        .eq('order_reference', cleanRef);
    } catch (directErr) {}

    return res.status(200).json({
      success: true,
      orderReference: cleanRef,
      ...bookingResult,
    });
  } catch (err) {
    console.error('J&T Dispatch error:', err);
    return res.status(500).json({ error: err.message || 'J&T Express dispatch failed' });
  }
}
