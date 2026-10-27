import { getSupabaseServerClient } from './_lib/supabaseServer.js';
import { bookShipmentWithShipmates } from './_lib/shipmates.js';

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
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    // 2. Verify Administrative Privileges (Prevent unauthorized courier dispatches)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Administrative authorization token required to book courier shipments' });
    }
    const token = authHeader.substring(7).trim();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.email) {
      return res.status(401).json({ error: 'Invalid or expired administrative session' });
    }

    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id, is_active')
      .eq('email', userData.user.email.toLowerCase())
      .eq('is_active', true)
      .maybeSingle();

    if (!adminProfile) {
      return res.status(403).json({ error: 'Forbidden: Active staff credentials required to dispatch couriers' });
    }

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

    const bookingOptions = {
      preferredCourier: body.preferredCourier || req.query?.courier || 'J&T Express',
      weightKg: body.weightKg || req.query?.weight,
      pouchSize: body.pouchSize || 'small',
      notes: body.notes,
      forceRebook: Boolean(body.forceRebook || req.query?.force),
    };

    // 3. Dispatch to Shipmates / J&T
    const result = await bookShipmentWithShipmates(order, bookingOptions);

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
