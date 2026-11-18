import { getSupabaseServerClient } from './_lib/supabaseServer.js';
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
    const incomingAuthHeader = req.headers?.authorization || req.headers?.Authorization || '';
    const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const customHeaders = !hasServiceRole && incomingAuthHeader ? { Authorization: incomingAuthHeader } : {};

    // 1. Fetch Order from Supabase (to check COD status or stored Gateway Session/Invoice ID)
    const sb = getSupabaseServerClient(null, customHeaders);
    let existingOrder = null;
    if (sb) {
      try {
        try {
          const { data: rpcOrder } = await sb.rpc('get_order_by_reference', { p_order_ref: cleanRef });
          existingOrder = rpcOrder;
        } catch (e) {}

        if (!existingOrder) {
          const { data: dbOrder } = await sb
            .from('orders')
            .select('*')
            .eq('order_reference', cleanRef)
            .maybeSingle();
          existingOrder = dbOrder;
        }

        if (existingOrder && existingOrder.payment_method === 'COD') {
          return res.status(200).json({
            success: true,
            isCod: true,
            orderReference: cleanRef,
            paymentStatus: 'COD_PENDING',
            fulfillmentStatus: existingOrder.status || 'TO_SHIP',
            trackingNumber: existingOrder.tracking_number || null,
            courierName: existingOrder.courier_name || 'J&T Express',
            waybillUrl: existingOrder.waybill_url || null,
          });
        }
      } catch (e) {
        console.warn('Order verification lookup error:', e.message);
      }
    }

    // 2. Determine whether order uses Maya (maya_...), PayMongo (cs_...), or Xendit
    const mayaSecretKey = (process.env.MAYA_SECRET_KEY || '').trim();
    const mayaPublicKey = (process.env.MAYA_PUBLIC_KEY || '').trim();
    const paymongoSecretKey = (process.env.PAYMONGO_SECRET_KEY || '').trim();
    const xenditApiKey = (process.env.XENDIT_SECRET_KEY || '').trim();
    const storedInvoiceId = existingOrder?.xendit_invoice_id || '';
    const isMayaOrder =
      storedInvoiceId.startsWith('maya_') ||
      (Boolean(mayaSecretKey || mayaPublicKey) && !storedInvoiceId.startsWith('cs_') && (process.env.PAYMENT_GATEWAY || '').toUpperCase() === 'MAYA');
    const isPaymongoOrder =
      storedInvoiceId.startsWith('cs_') || (Boolean(paymongoSecretKey) && !storedInvoiceId && !isMayaOrder);

    let isPaid = false;
    let gatewayStatus = 'PENDING';
    let resolvedInvoiceId = storedInvoiceId || null;
    let paidAt = null;
    let paymentChannel = existingOrder?.payment_method || null;

    if (isMayaOrder && (mayaSecretKey || mayaPublicKey)) {
      const isMayaSandbox = String(process.env.MAYA_SANDBOX_MODE || 'true').toLowerCase() !== 'false';
      const mayaBaseUrl = isMayaSandbox
        ? 'https://pg-sandbox.paymaya.com'
        : 'https://pg.paymaya.com';
      const rawCheckoutId = storedInvoiceId.replace(/^maya_/, '');
      const secretAuth = Buffer.from(`${mayaSecretKey || mayaPublicKey}:`).toString('base64');

      let matchedPayment = null;

      // 2a. Query by Request Reference Number (RRN)
      try {
        const rrnRes = await fetch(
          `${mayaBaseUrl}/payments/v1/payment-rrns/${encodeURIComponent(cleanRef)}`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Basic ${secretAuth}`,
            },
          }
        );
        if (rrnRes.ok) {
          const rrnJson = await rrnRes.json().catch(() => []);
          const txList = Array.isArray(rrnJson) ? rrnJson : [rrnJson];
          matchedPayment =
            txList.find(
              (tx) =>
                tx &&
                (tx.isPaid === true ||
                  tx.status === 'PAYMENT_SUCCESS' ||
                  tx.paymentStatus === 'PAYMENT_SUCCESS' ||
                  tx.status === 'CAPTURED')
            ) || txList[0];
        }
      } catch (e) {}

      // 2b. Fallback: Query by Checkout/Payment ID directly if RRN lookup did not find a paid record
      if ((!matchedPayment || !matchedPayment.isPaid) && rawCheckoutId) {
        try {
          const payRes = await fetch(
            `${mayaBaseUrl}/payments/v1/payments/${encodeURIComponent(rawCheckoutId)}`,
            {
              headers: {
                Accept: 'application/json',
                Authorization: `Basic ${secretAuth}`,
              },
            }
          );
          if (payRes.ok) {
            const payJson = await payRes.json().catch(() => null);
            if (payJson) {
              matchedPayment = payJson;
            }
          }
        } catch (e) {}
      }

      const txStatus = (matchedPayment?.status || matchedPayment?.paymentStatus || 'PENDING').toUpperCase();
      isPaid =
        matchedPayment?.isPaid === true ||
        txStatus === 'PAYMENT_SUCCESS' ||
        txStatus === 'CAPTURED' ||
        txStatus === 'DONE';
      gatewayStatus = isPaid ? 'PAID' : txStatus;
      resolvedInvoiceId = matchedPayment?.id || rawCheckoutId || storedInvoiceId;
      paidAt = matchedPayment?.updatedAt || matchedPayment?.UpdatedAt || (isPaid ? new Date().toISOString() : null);
      paymentChannel = matchedPayment?.cardType || existingOrder?.payment_method || 'MAYA_CHECKOUT';
    } else if (isPaymongoOrder && paymongoSecretKey) {
      if (!storedInvoiceId) {
        return res.status(404).json({ error: 'No PayMongo checkout session ID found for this order reference' });
      }

      const pmAuth = Buffer.from(`${paymongoSecretKey}:`).toString('base64');
      const pmRes = await fetch(
        `https://api.paymongo.com/v1/checkout_sessions/${encodeURIComponent(storedInvoiceId)}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Basic ${pmAuth}`,
          },
        }
      );

      if (!pmRes.ok) {
        const errText = await pmRes.text();
        console.warn('[verify-payment] PayMongo Checkout Session Query failed:', errText);
        return res.status(500).json({ error: 'Failed to query PayMongo payment status' });
      }

      const pmJson = await pmRes.json();
      const sessionData = pmJson?.data;
      const sessionAttr = sessionData?.attributes || {};
      const payments = Array.isArray(sessionAttr.payments) ? sessionAttr.payments : [];
      const piStatus = sessionAttr.payment_intent?.attributes?.status || '';
      const firstPaidPayment = payments.find(
        (p) => p?.attributes?.status === 'paid' || p?.status === 'paid'
      );

      isPaid = Boolean(firstPaidPayment) || piStatus === 'succeeded';
      gatewayStatus = isPaid ? 'PAID' : (sessionAttr.status || 'PENDING').toUpperCase();
      resolvedInvoiceId = sessionData?.id || storedInvoiceId;
      paidAt =
        firstPaidPayment?.attributes?.paid_at
          ? new Date(firstPaidPayment.attributes.paid_at * 1000).toISOString()
          : isPaid
          ? new Date().toISOString()
          : null;
      paymentChannel =
        firstPaidPayment?.attributes?.source?.type?.toUpperCase() ||
        existingOrder?.payment_method ||
        'ONLINE';
    } else {
      if (!xenditApiKey) {
        console.error('[verify-payment] Missing XENDIT_SECRET_KEY / PAYMONGO_SECRET_KEY in server environment.');
        return res.status(500).json({ error: 'Payment gateway configuration error.' });
      }

      const authHeader = Buffer.from(`${xenditApiKey}:`).toString('base64');

      // Query Xendit Invoice Status Server-to-Server
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

      isPaid = invoice.status === 'PAID' || invoice.status === 'SETTLED';
      gatewayStatus = isPaid ? 'PAID' : invoice.status;
      resolvedInvoiceId = invoice.id;
      paidAt = invoice.paid_at;
      paymentChannel = invoice.payment_channel;
    }

    let shipmentData = null;

    // 3. Update Supabase if Paid
    if (isPaid) {
      const supabase = getSupabaseServerClient(null, customHeaders);

      try {
        // Sync payment status via secure RPC
        try {
          await supabase.rpc('sync_order_fulfillment', {
            p_order_ref: cleanRef,
            p_status: 'TO_SHIP',
            p_payment_status: 'PAID',
          });
        } catch (rpcErr) {}

        try {
          await supabase
            .from('orders')
            .update({
              payment_status: 'PAID',
              status: 'TO_SHIP',
              updated_at: new Date().toISOString(),
            })
            .eq('order_reference', cleanRef);
        } catch (dirErr) {}

        // Fetch the order and ensure it is dispatched to J&T Express (idempotent)
        let currentOrder = null;
        try {
          const { data: rpcCur } = await supabase.rpc('get_order_by_reference', { p_order_ref: cleanRef });
          currentOrder = rpcCur;
        } catch (e) {}

        if (!currentOrder) {
          const { data: dbCur } = await supabase
            .from('orders')
            .select('*')
            .eq('order_reference', cleanRef)
            .maybeSingle();
          currentOrder = dbCur;
        }

        // Idempotent inventory deduction check upon confirmed payment
        if (currentOrder && !currentOrder.inventory_deducted && Array.isArray(currentOrder.items)) {
          try {
            await supabase.rpc('deduct_product_inventory', { p_items: currentOrder.items });
            await supabase.from('orders').update({ inventory_deducted: true }).eq('order_reference', cleanRef);
            currentOrder.inventory_deducted = true;
          } catch (dedErr) {
            console.warn('Verify-payment inventory deduction notice:', dedErr.message);
          }
        }

        // Orders remain in Awaiting Shipment (TO_SHIP) stage until the admin
        // arranges shipment (moves order to Awaiting Collection) in the seller dashboard.
        if (currentOrder) {
          shipmentData = {
            trackingNumber: currentOrder.tracking_number || null,
            courierName: currentOrder.courier_name || 'J&T Express',
            waybillUrl: currentOrder.waybill_url || null,
          };
        }
      } catch (dbErr) {
        console.warn('Could not update order or book shipment in Supabase:', dbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      orderReference: cleanRef,
      paymentStatus: isPaid ? 'PAID' : gatewayStatus,
      fulfillmentStatus: isPaid ? (shipmentData?.trackingNumber ? 'TO_SHIP' : 'PROCESSING') : 'PENDING',
      invoiceId: resolvedInvoiceId,
      paidAt,
      paymentChannel,
      trackingNumber: shipmentData?.trackingNumber || null,
      courierName: shipmentData?.courierName || null,
      waybillUrl: shipmentData?.waybillUrl || null,
    });
  } catch (err) {
    console.error('Verify payment error:', err);
    return res.status(500).json({ error: err.message || 'Verification failed' });
  }
}
