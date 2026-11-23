import { getSupabaseServerClient } from './_lib/supabaseServer.js';
import { createJtOrder, printJtOrder } from './_lib/jtExpress.js';
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
    const action = (
      req.query?.action ||
      url.searchParams.get('action') ||
      body.action ||
      'dispatch'
    ).toLowerCase();

    const orderRef =
      req.query?.ref ||
      url.searchParams.get('ref') ||
      body.orderReference ||
      body.ref ||
      body.orderId ||
      '';

    const billCodeParam =
      req.query?.billCode ||
      req.query?.billcode ||
      req.query?.tracking ||
      url.searchParams.get('billCode') ||
      url.searchParams.get('billcode') ||
      url.searchParams.get('tracking') ||
      body.billCode ||
      body.billcode ||
      body.trackingNumber ||
      '';

    if (action !== 'print' && !orderRef) {
      return res.status(400).json({
        error: 'Order reference required (e.g. ?ref=AC-XXXXXX or { orderReference: "AC-XXXXXX" })',
      });
    }

    const cleanRef = String(orderRef).trim().toUpperCase();
    let cleanBillCode = String(billCodeParam).trim().toUpperCase();

    // 1. Initialize Supabase (forward admin JWT if service role key is not present)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Administrative authorization token required to book courier shipments' });
    }
    const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const customHeaders = !hasServiceRole ? { Authorization: authHeader } : {};
    const supabase = getSupabaseServerClient(null, customHeaders);
    if (!supabase) {
      return res.status(500).json({ error: 'Database configuration missing' });
    }

    // 2. Verify Administrative Privileges (Prevent unauthorized courier dispatches)
    const token = authHeader.substring(7).trim();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.email) {
      return res.status(401).json({ error: 'Invalid or expired administrative session' });
    }

    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id, is_active')
      .or(`id.eq.${userData.user.id},email.ilike.${userData.user.email.toLowerCase()}`)
      .maybeSingle();

    const isAuraAdmin = adminProfile?.is_active === true;

    if (!isAuraAdmin) {
      return res.status(403).json({ error: 'Forbidden: Active admin access required to dispatch courier shipments' });
    }

    // 3. Fetch Order from Supabase if cleanRef is provided
    let order = null;
    if (cleanRef) {
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
        if (fetchErr && action !== 'print') {
          return res.status(500).json({ error: `Failed to query order: ${fetchErr.message}` });
        }
        order = directOrder;
      }
    } else if (cleanBillCode) {
      const { data: directOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('tracking_number', cleanBillCode)
        .maybeSingle();
      order = directOrder;
    }

    // =========================================================================
    // ACTION: PRINT OFFICIAL J&T WAYBILL (/api/order/printOrder)
    // =========================================================================
    if (action === 'print') {
      if (!cleanBillCode && order?.tracking_number) {
        cleanBillCode = String(order.tracking_number).trim().toUpperCase();
      }

      // If the order doesn't have a J&T billCode yet (or needs a real J&T booking), dispatch first
      if ((!cleanBillCode || cleanBillCode === 'JT-UNASSIGNED') && order) {
        const bookingResult = await createJtOrder(order, {
          weightKg: body.weightKg || req.query?.weight,
          notes: body.notes || 'Handle with care - Aura Women Luxury Garments',
        });
        cleanBillCode = bookingResult.trackingNumber;
        if (bookingResult.officialWaybillPdfUrl) {
          try {
            await supabase
              .from('orders')
              .update({
                tracking_number: cleanBillCode,
                courier_name: 'J&T Express',
                waybill_url: bookingResult.officialWaybillPdfUrl,
                updated_at: new Date().toISOString(),
              })
              .eq('id', order.id);
          } catch (_) {}

          return res.status(200).json({
            success: true,
            billCode: cleanBillCode,
            orderReference: order.order_reference,
            waybillUrl: bookingResult.officialWaybillPdfUrl,
            sortingCode: bookingResult.sortingCode,
          });
        }
      }

      if (!cleanBillCode) {
        return res.status(400).json({
          error: 'Valid J&T tracking number (billCode) or order reference required to print official J&T waybill.',
        });
      }

      let printResult = await printJtOrder(cleanBillCode, cleanRef || order?.order_reference || null);

      // If this tracking number wasn't registered in J&T yet (e.g. simulator billcode "There is no three segment code"),
      // automatically register the order with J&T addOrder and then call printOrder!
      if (!printResult.success && order) {
        const bookingResult = await createJtOrder(order, {
          weightKg: body.weightKg || req.query?.weight,
          notes: body.notes || 'Handle with care - Aura Women Luxury Garments',
        });
        if (bookingResult?.trackingNumber) {
          cleanBillCode = bookingResult.trackingNumber;
          if (bookingResult.officialWaybillPdfUrl) {
            printResult = {
              success: true,
              billCode: cleanBillCode,
              waybillUrl: bookingResult.officialWaybillPdfUrl,
              base64EncodeContent: null,
              rawResponse: bookingResult.rawResponse,
            };
          } else {
            printResult = await printJtOrder(cleanBillCode, order.order_reference);
          }
        }
      }

      if (printResult.success && printResult.waybillUrl && order) {
        try {
          await supabase
            .from('orders')
            .update({
              tracking_number: cleanBillCode,
              courier_name: 'J&T Express',
              waybill_url: printResult.waybillUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);
        } catch (_) {}
      }

      if (!printResult.success || (!printResult.waybillUrl && !printResult.base64EncodeContent)) {
        return res.status(422).json({
          success: false,
          billCode: cleanBillCode,
          error:
            printResult.rawResponse?.msg ||
            'J&T Express printOrder endpoint did not return a waybill PDF for this tracking number.',
          rawResponse: printResult.rawResponse,
        });
      }

      return res.status(200).json({
        success: true,
        billCode: cleanBillCode,
        orderReference: cleanRef || order?.order_reference || null,
        waybillUrl: printResult.waybillUrl,
        base64EncodeContent: printResult.base64EncodeContent,
        rawResponse: printResult.rawResponse,
      });
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
