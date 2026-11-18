import { getSupabaseServerClient } from '../supabaseServer.js';
import { ensureServerEnv } from '../envHelper.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    ensureServerEnv();

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const checkoutId = payload.id || payload.checkoutId || '';
    const externalId = (payload.requestReferenceNumber || '').trim().toUpperCase();
    const rawStatus = (payload.status || payload.paymentStatus || '').toUpperCase();

    console.log(`[Maya Webhook] Received event for Ref: ${externalId}, CheckoutID: ${checkoutId}, Status: ${rawStatus}`);

    if (!externalId) {
      return res.status(200).json({ received: true, skipped: 'Missing requestReferenceNumber' });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database configuration missing' });
    }

    const { data: existingOrder, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('order_reference', externalId)
      .maybeSingle();

    if (fetchErr || !existingOrder) {
      console.warn(`[Maya Webhook] Order ${externalId} not found in database.`);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify status directly against Maya API using Secret Key to prevent spoofed webhooks
    const mayaSecretKey = (process.env.MAYA_SECRET_KEY || '').trim();
    const isSandbox = String(process.env.MAYA_SANDBOX_MODE || 'true').toLowerCase() !== 'false';
    const mayaBaseUrl = isSandbox
      ? 'https://pg-sandbox.paymaya.com'
      : 'https://pg.paymaya.com';

    let verifiedPaid = false;
    let verifiedAmountPhp = 0;

    if (mayaSecretKey) {
      const secretAuth = Buffer.from(`${mayaSecretKey}:`).toString('base64');
      const rrnRes = await fetch(
        `${mayaBaseUrl}/payments/v1/payment-rrns/${encodeURIComponent(externalId)}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Basic ${secretAuth}`,
          },
        }
      );

      if (rrnRes.ok) {
        const rrnData = await rrnRes.json().catch(() => []);
        const list = Array.isArray(rrnData) ? rrnData : [rrnData];
        const paidTx = list.find(
          (tx) =>
            tx &&
            (tx.isPaid === true ||
              tx.status === 'PAYMENT_SUCCESS' ||
              tx.paymentStatus === 'PAYMENT_SUCCESS' ||
              tx.status === 'CAPTURED')
        );
        if (paidTx) {
          verifiedPaid = true;
          verifiedAmountPhp = Math.round(Number(paidTx.amount || paidTx.totalAmount?.value || 0));
        }
      }
    } else {
      verifiedPaid =
         payload.isPaid === true ||
        rawStatus === 'PAYMENT_SUCCESS' ||
        rawStatus === 'CHECKOUT_SUCCESS';
      verifiedAmountPhp = Math.round(Number(payload.amount || payload.totalAmount?.value || 0));
    }

    if (verifiedPaid) {
      const orderTotalPhp = Math.round(Number(existingOrder.total_amount) || 0);
      if (verifiedAmountPhp > 0 && orderTotalPhp > 0 && verifiedAmountPhp < orderTotalPhp) {
        console.error(
          `[Maya Webhook] Amount mismatch for ${externalId}: expected ₱${orderTotalPhp}, got ₱${verifiedAmountPhp}`
        );
        return res.status(400).json({ error: 'Reported payment amount is less than order total' });
      }

      await supabase
        .from('orders')
        .update({
          payment_status: 'PAID',
          status: 'TO_SHIP',
          updated_at: new Date().toISOString(),
        })
        .eq('order_reference', externalId);

      if (!existingOrder.inventory_deducted && Array.isArray(existingOrder.items)) {
        try {
          await supabase.rpc('deduct_product_inventory', { p_items: existingOrder.items });
          await supabase
            .from('orders')
            .update({ inventory_deducted: true })
            .eq('order_reference', externalId);
        } catch (dErr) {
          console.warn('[Maya Webhook] Inventory deduction notice:', dErr.message);
        }
      }
    } else if (rawStatus === 'PAYMENT_EXPIRED' || rawStatus === 'CHECKOUT_DROPPED') {
      await supabase
        .from('orders')
        .update({
          payment_status: 'EXPIRED',
          status: 'CANCELLED',
          updated_at: new Date().toISOString(),
        })
        .eq('order_reference', externalId);
    }

    return res.status(200).json({ received: true, external_id: externalId, status: rawStatus });
  } catch (err) {
    console.error('[Maya Webhook] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}

