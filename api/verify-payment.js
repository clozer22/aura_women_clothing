import { createClient } from '@supabase/supabase-js';

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

    // 1. Initialize Xendit API Authorization
    const xenditApiKey =
      process.env.XENDIT_SECRET_KEY ||
      process.env.VITE_XENDIT_API_KEY ||
      'xnd_development_G4K4iGkpjDrzT6EQIDzZShzp7oK77GiaEhAYWPCIC4e0ROvsmVSSi2tZZKScBK';

    const authHeader = Buffer.from(`${xenditApiKey}:`).toString('base64');

    // 2. Query Xendit Invoice Status Server-to-Server
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
            status: 'PROCESSING',
            paid_at: invoice.paid_at || new Date().toISOString(),
            payment_details: {
              xendit_id: invoice.id,
              payment_method: invoice.payment_method || 'ONLINE',
              payment_channel: invoice.payment_channel || '',
              paid_amount: invoice.paid_amount || invoice.amount,
            },
          })
          .eq('order_reference', cleanRef);
      } catch (dbErr) {
        console.warn('Could not update order in Supabase:', dbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      orderReference: cleanRef,
      paymentStatus: isPaid ? 'PAID' : invoice.status,
      fulfillmentStatus: isPaid ? 'PROCESSING' : 'PENDING',
      invoiceId: invoice.id,
      paidAt: invoice.paid_at,
      paymentChannel: invoice.payment_channel,
    });
  } catch (err) {
    console.error('Verify payment error:', err);
    return res.status(500).json({ error: err.message || 'Verification failed' });
  }
}
