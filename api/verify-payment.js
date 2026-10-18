import { getSupabaseServerClient } from './lib/supabaseServer.js';
import { bookShipmentWithShipmates } from './lib/shipmates.js';
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
    const ref =
      req.query?.ref ||
      url.searchParams.get('ref') ||
      req.body?.orderReference ||
      req.body?.ref;

    if (!ref || typeof ref !== 'string') {
      return res.status(400).json({ error: 'Order reference required' });
    }

    const cleanRef = ref.trim().toUpperCase();

    // 1. Check if Order is Cash on Delivery (COD) in Supabase
    const sb = getSupabaseServerClient();
    if (sb) {
      try {
        const { data: existingOrder } = await sb
          .from('orders')
          .select('*')
          .eq('order_reference', cleanRef)
          .maybeSingle();

        if (existingOrder && existingOrder.payment_method === 'COD') {
          return res.status(200).json({
            success: true,
            isCod: true,
            orderReference: cleanRef,
            paymentStatus: 'COD_PENDING',
            fulfillmentStatus: existingOrder.status || 'TO_SHIP',
            trackingNumber: existingOrder.tracking_number,
            courierName: existingOrder.courier_name,
            waybillUrl: existingOrder.waybill_url,
            order: existingOrder,
          });
        }
      } catch (e) {
        console.warn('COD verification lookup error:', e.message);
      }
    }

    // 2. Initialize Xendit API Authorization
    const xenditApiKey =
      process.env.XENDIT_SECRET_KEY ||
      process.env.VITE_XENDIT_API_KEY;

    if (!xenditApiKey) {
      console.error('[verify-payment] Missing XENDIT_SECRET_KEY in server environment.');
      return res.status(500).json({ error: 'Payment gateway configuration error.' });
    }

    const authHeader = Buffer.from(`${xenditApiKey}:`).toString('base64');

    // 3. Query Xendit Invoice Status Server-to-Server
    const xenditRes = await fetch(
      `https://api.xendit.co/v2/invoices?external_id=${encodeURIComponent(cleanRef)}`,
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
        },
      }
    );

    if (!xenditRes.ok) {
      const errText = await xenditRes.text();
      console.warn('Xendit Invoice Query failed:', errText);
      return res.status(500).json({ error: 'Failed to query payment gateway' });
    }

    const invoices = await xenditRes.json();
    const invoice = Array.isArray(invoices) && invoices.length > 0 ? invoices[0] : null;

    if (!invoice) {
      return res.status(404).json({ error: 'No payment invoice found for this order reference' });
    }

    const isPaid = invoice.status === 'PAID' || invoice.status === 'SETTLED';
    let shipmentData = null;

    // 3. Update Supabase if Paid
    if (isPaid) {
      const supabase = getSupabaseServerClient();

      try {
        await supabase
          .from('orders')
          .update({
            payment_status: 'PAID',
            status: 'TO_SHIP',
            updated_at: new Date().toISOString(),
          })
          .eq('order_reference', cleanRef);

        // Fetch the order and ensure it is dispatched to Shipmates (idempotent)
        const { data: currentOrder } = await supabase
          .from('orders')
          .select('*')
          .eq('order_reference', cleanRef)
          .maybeSingle();

        if (currentOrder) {
          shipmentData = await bookShipmentWithShipmates(currentOrder);
        }
      } catch (dbErr) {
        console.warn('Could not update order or book shipment in Supabase:', dbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      orderReference: cleanRef,
      paymentStatus: isPaid ? 'PAID' : invoice.status,
      fulfillmentStatus: isPaid ? (shipmentData?.trackingNumber ? 'TO_SHIP' : 'PROCESSING') : 'PENDING',
      invoiceId: invoice.id,
      paidAt: invoice.paid_at,
      paymentChannel: invoice.payment_channel,
      trackingNumber: shipmentData?.trackingNumber || null,
      courierName: shipmentData?.courierName || null,
      waybillUrl: shipmentData?.waybillUrl || null,
    });
  } catch (err) {
    console.error('Verify payment error:', err);
    return res.status(500).json({ error: err.message || 'Verification failed' });
  }
}
