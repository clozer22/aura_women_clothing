import { getSupabaseServerClient } from './lib/supabaseServer.js';
import { trackJtOrder } from './lib/jtExpress.js';
import { ensureServerEnv } from './lib/envHelper.js';

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
    const url = new URL(req.url, 'http://localhost');
    const tracking =
      req.query?.tracking ||
      url.searchParams.get('tracking') ||
      req.query?.billcode ||
      url.searchParams.get('billcode');

    const ref =
      req.query?.ref ||
      url.searchParams.get('ref') ||
      req.query?.orderReference ||
      url.searchParams.get('orderReference');

    let trackingNumber = tracking ? String(tracking).trim().toUpperCase() : null;
    let orderRecord = null;

    // If only order reference is passed, lookup tracking number in Supabase
    if (!trackingNumber && ref) {
      const cleanRef = String(ref).trim().toUpperCase();
      const supabase = getSupabaseServerClient();
      if (supabase) {
        let foundOrder = null;
        try {
          const { data: rpcOrder } = await supabase.rpc('get_order_by_reference', { p_order_ref: cleanRef });
          foundOrder = rpcOrder;
        } catch (e) {}

        if (!foundOrder) {
          const { data: dbOrder } = await supabase
            .from('orders')
            .select('*')
            .eq('order_reference', cleanRef)
            .maybeSingle();
          foundOrder = dbOrder;
        }

        if (foundOrder) {
          orderRecord = foundOrder;
          trackingNumber = foundOrder.tracking_number;
        }
      }
    }

    if (!trackingNumber) {
      return res.status(400).json({
        error: 'Tracking number or valid order reference required (e.g. ?tracking=JT1234567890 or ?ref=AC-XXXXXX)',
      });
    }

    // Call J&T Tracking Service
    const trackingData = await trackJtOrder(trackingNumber, ref || orderRecord?.order_reference || '', orderRecord);

    // Map order status
    let currentFulfillmentStatus = orderRecord?.status || 'SHIPPED';
    if (trackingData.status === 'DELIVERED') {
      currentFulfillmentStatus = 'DELIVERED';
    } else if (trackingData.status === 'OUT_FOR_DELIVERY') {
      currentFulfillmentStatus = 'TO_DELIVER';
    }

    return res.status(200).json({
      success: true,
      ...trackingData,
      orderStatus: currentFulfillmentStatus,
      order: orderRecord
        ? {
            order_reference: orderRecord.order_reference,
            customer_name: orderRecord.customer_name,
            shipping_address: orderRecord.shipping_address,
            total_amount: orderRecord.total_amount,
            status: orderRecord.status,
            payment_method: orderRecord.payment_method,
            payment_status: orderRecord.payment_status,
          }
        : null,
    });
  } catch (err) {
    console.error('J&T Track error:', err);
    return res.status(500).json({ error: err.message || 'Tracking query failed' });
  }
}
