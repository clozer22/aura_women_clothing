import { createClient } from '@supabase/supabase-js';
import { bookShipmentWithShipmates } from './lib/shipmates.js';

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
    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      'https://pcmlleeuxbymomjxhwlv.supabase.co';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbWxsZWV1eGJ5bW9tanhod2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzA2NzgsImV4cCI6MjEwMzk0NjY3OH0.WZCqgnt_7l88U-Yl_rAvhmXQLSKy70hT1Wjq8rf_qC0';

    if (supabaseUrl && supabaseKey) {
      try {
        const sb = createClient(supabaseUrl, supabaseKey);
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
      process.env.VITE_XENDIT_API_KEY ||
      'xnd_development_G4K4iGkpjDrzT6EQIDzZShzp7oK77GiaEhAYWPCIC4e0ROvsmVSSi2tZZKScBK';

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
      const supabaseUrl =
        process.env.VITE_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        'https://pcmlleeuxbymomjxhwlv.supabase.co';
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbWxsZWV1eGJ5bW9tanhod2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzA2NzgsImV4cCI6MjEwMzk0NjY3OH0.WZCqgnt_7l88U-Yl_rAvhmXQLSKy70hT1Wjq8rf_qC0';

      const supabase = createClient(supabaseUrl, supabaseKey);

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
