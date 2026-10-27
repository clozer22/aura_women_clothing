import { getSupabaseServerClient } from './lib/supabaseServer.js';
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    ensureServerEnv();
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    console.log('[J&T Webhook] Incoming push tracking payload:', JSON.stringify(body));

    // Extract parcel tracking data from J&T push format
    // J&T push payload format contains `data` or `bizContent` or `responseitems`
    const bizContent = typeof body.bizContent === 'string' ? JSON.parse(body.bizContent) : (body.bizContent || body);
    const trackingList = Array.isArray(bizContent) ? bizContent : (bizContent.data || [bizContent]);

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }

    const updatedOrders = [];

    for (const item of trackingList) {
      const billcode = item.billcode || item.billCode || item.mailNo || item.tracking_number;
      const scanType = (item.scanType || item.status || item.scanTypeName || '').toUpperCase();
      const desc = item.desc || item.reason || item.description || '';

      if (!billcode) continue;

      // Map J&T Scan Types to Aura Order Statuses:
      // 'GOT' / 'PICKUP' -> 'SHIPPED'
      // 'DEPARTURE' / 'ARRIVAL' / 'TRANSIT' -> 'SHIPPED'
      // 'SENDING' / 'OUT_FOR_DELIVERY' -> 'TO_DELIVER'
      // 'SIGN' / 'DELIVERED' -> 'DELIVERED'
      // 'REJECT' / 'RETURN' -> 'RETURNED'
      let newStatus = null;
      if (scanType.includes('SIGN') || scanType.includes('DELIVER') || desc.toLowerCase().includes('delivered')) {
        newStatus = 'DELIVERED';
      } else if (scanType.includes('SEND') || scanType.includes('DISPATCH') || desc.toLowerCase().includes('out for delivery')) {
        newStatus = 'TO_DELIVER';
      } else if (scanType.includes('GOT') || scanType.includes('PICK') || scanType.includes('ARRIV') || scanType.includes('DEPART')) {
        newStatus = 'SHIPPED';
      }

      if (newStatus) {
        const updatePayload = {
          status: newStatus,
          courier_last_scan: scanType,
          courier_last_description: desc,
          updated_at: new Date().toISOString(),
        };

        // If delivered and COD, update payment status to PAID
        const paymentStatus = newStatus === 'DELIVERED' ? 'PAID' : null;

        try {
          await supabase.rpc('sync_order_by_tracking', {
            p_tracking_number: billcode,
            p_status: newStatus,
            p_payment_status: paymentStatus,
          });
        } catch (rpcErr) {}

        const { data, error } = await supabase
          .from('orders')
          .update(updatePayload)
          .eq('tracking_number', billcode)
          .select('order_reference, status');

        if (!error && data?.length) {
          updatedOrders.push({ billcode, newStatus, references: data.map((d) => d.order_reference) });
        } else {
          updatedOrders.push({ billcode, newStatus });
        }
      }
    }

    // J&T Open Platform expects response: { "responseitems": [{ "success": "true" }] }
    return res.status(200).json({
      responseitems: [
        {
          success: 'true',
          reason: 'Webhook processed successfully',
          updatedCount: updatedOrders.length,
          orders: updatedOrders,
        },
      ],
    });
  } catch (err) {
    console.error('J&T Webhook error:', err);
    return res.status(500).json({
      responseitems: [{ success: 'false', reason: err.message || 'Webhook processing failed' }],
    });
  }
}
