import { getSupabaseServerClient } from './_lib/supabaseServer.js';
import { trackJtOrder } from './_lib/jtExpress.js';
import { ensureServerEnv } from './_lib/envHelper.js';
import { sendOutForDeliveryEmail } from './_lib/emailService.js';

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
    const supabase = getSupabaseServerClient();
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

    // 1. Lookup order by reference or tracking number in Supabase
    if (supabase) {
      if (ref) {
        const cleanRef = String(ref).trim().toUpperCase();
        try {
          const { data: rpcOrder } = await supabase.rpc('get_order_by_reference', { p_order_ref: cleanRef });
          orderRecord = rpcOrder;
        } catch (_) {}

        if (!orderRecord) {
          const { data: dbOrder } = await supabase
            .from('orders')
            .select('*')
            .eq('order_reference', cleanRef)
            .maybeSingle();
          orderRecord = dbOrder;
        }

        if (orderRecord && !trackingNumber) {
          trackingNumber = orderRecord.tracking_number;
        }
      } else if (trackingNumber && !orderRecord) {
        const { data: dbOrder } = await supabase
          .from('orders')
          .select('*')
          .eq('tracking_number', trackingNumber)
          .maybeSingle();
        orderRecord = dbOrder;
      }
    }

    if (!trackingNumber) {
      return res.status(400).json({
        error: 'Tracking number or valid order reference required (e.g. ?tracking=JT1234567890 or ?ref=AC-XXXXXX)',
      });
    }

    // 2. Call J&T Tracking Service
    const trackingData = await trackJtOrder(trackingNumber, ref || orderRecord?.order_reference || '', orderRecord);

    // 3. Map order status based on J&T tracking
    const jStatus = (trackingData.status || '').toUpperCase();
    let currentFulfillmentStatus = orderRecord?.status || 'SHIPPED';
    if (jStatus === 'DELIVERED') {
      currentFulfillmentStatus = 'DELIVERED';
    } else if (jStatus === 'OUT_FOR_DELIVERY' || jStatus === 'TO_DELIVER') {
      currentFulfillmentStatus = 'TO_DELIVER';
    } else if (jStatus === 'SHIPPED' || jStatus === 'IN_TRANSIT' || jStatus === 'PICKED_UP') {
      currentFulfillmentStatus = 'SHIPPED';
    }

    // 4. Synchronize status with Supabase order record
    let emailSent = false;
    if (supabase && orderRecord) {
      const statusChanged = currentFulfillmentStatus !== orderRecord.status;
      let updatedPayload = orderRecord.shipment_payload || {};

      // If parcel is Out for Delivery, notify customer via email (only once per order)
      if (currentFulfillmentStatus === 'TO_DELIVER' && !updatedPayload.out_for_delivery_notified_at) {
        try {
          const emailRes = await sendOutForDeliveryEmail(orderRecord);
          if (emailRes.success && !emailRes.skipped) {
            emailSent = true;
            updatedPayload = {
              ...updatedPayload,
              out_for_delivery_notified_at: new Date().toISOString(),
              out_for_delivery_recipient: orderRecord.customer_email,
            };
          }
        } catch (e) {
          console.error(`[J&T Track] Delivery email error for ${orderRecord.order_reference}:`, e.message);
        }
      }

      if (statusChanged || emailSent || !orderRecord.shipment_status) {
        const latestCheckpoint = trackingData.checkpoints?.[trackingData.checkpoints.length - 1];
        const updateData = {
          status: currentFulfillmentStatus,
          shipment_status: currentFulfillmentStatus,
          shipment_payload: updatedPayload,
          courier_last_scan: latestCheckpoint?.status || jStatus,
          courier_last_description: latestCheckpoint?.desc || trackingData.latestLocation,
          updated_at: new Date().toISOString(),
        };

        if (currentFulfillmentStatus === 'DELIVERED' && (orderRecord.payment_method || '').toUpperCase() === 'COD') {
          updateData.payment_status = 'PAID';
        }

        if (statusChanged) {
          const auditEntry = {
            name: 'J&T Express Courier Tracking',
            email: 'api@jtexpress.ph',
            role: 'System / Logistics',
            action: `Status updated from J&T Express trace to ${currentFulfillmentStatus} (${latestCheckpoint?.desc || jStatus})`,
            timestamp: new Date().toISOString(),
          };
          const existingAudit = Array.isArray(orderRecord.audit_trail) ? orderRecord.audit_trail : [];
          updateData.audit_trail = [auditEntry, ...existingAudit].slice(0, 50);
          updateData.last_touched_by = auditEntry;
        }

        await supabase.from('orders').update(updateData).eq('id', orderRecord.id);

        orderRecord = { ...orderRecord, ...updateData };
      }
    }

    return res.status(200).json({
      success: true,
      ...trackingData,
      orderStatus: currentFulfillmentStatus,
      statusSynced: true,
      deliveryEmailSent: emailSent,
      order: orderRecord
        ? {
            id: orderRecord.id,
            order_reference: orderRecord.order_reference,
            customer_name: orderRecord.customer_name,
            shipping_address: orderRecord.shipping_address,
            total_amount: orderRecord.total_amount,
            status: currentFulfillmentStatus,
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
