import { createClient } from '@supabase/supabase-js';
import { bookShipmentWithShipmates } from './lib/shipmates.js';

export default async function handler(req, res) {
  // CORS Headers
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
        error: 'Order reference required (pass ?ref=AC-XXXXXX or JSON { orderReference: "AC-XXXXXX" })',
      });
    }

    const cleanRef = String(orderRef).trim().toUpperCase();

    // 1. Initialize Supabase
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

    // 2. Fetch Order from Supabase
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('order_reference', cleanRef)
      .maybeSingle();

    if (fetchErr) {
      return res.status(500).json({ error: `Failed to query order: ${fetchErr.message}` });
    }

    if (!order) {
      return res.status(404).json({ error: `Order with reference "${cleanRef}" not found.` });
    }

    console.log(`[Shipmates API] Processing booking request for Order: ${cleanRef}`);

    // 3. Dispatch to Shipmates
    const result = await bookShipmentWithShipmates(order);

    return res.status(200).json({
      success: true,
      orderReference: cleanRef,
      mode: process.env.SHIPMATES_TEST_MODE !== 'false' ? 'TEST / SANDBOX' : 'LIVE',
      ...result,
    });
  } catch (err) {
    console.error('[Shipmates API] Error booking shipment:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
