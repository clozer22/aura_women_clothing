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
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database client unavailable' });
    }

    const { orderId, orderReference, trackingNumber } = req.body || req.query || {};

    let targetOrders = [];

    if (orderId || orderReference || trackingNumber) {
      // Sync single order
      let query = supabase.from('orders').select('*');
      if (orderId) query = query.eq('id', orderId);
      else if (orderReference) query = query.eq('order_reference', String(orderReference).trim().toUpperCase());
      else if (trackingNumber) query = query.eq('tracking_number', String(trackingNumber).trim().toUpperCase());

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      targetOrders = data;
    } else {
      // Sync all active orders with tracking numbers that are in transit
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .not('tracking_number', 'is', null)
        .in('status', ['TO_SHIP', 'SHIPPED', 'TO_DELIVER'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      targetOrders = data || [];
    }

    const results = [];

    for (const order of targetOrders) {
      const tracking = order.tracking_number;
      if (!tracking) continue;

      try {
        const trackingData = await trackJtOrder(tracking, order.order_reference, order);
        const jStatus = (trackingData.status || '').toUpperCase();

        let newStatus = order.status;
        if (jStatus === 'DELIVERED') {
          newStatus = 'DELIVERED';
        } else if (jStatus === 'OUT_FOR_DELIVERY' || jStatus === 'TO_DELIVER') {
          newStatus = 'TO_DELIVER';
        } else if (jStatus === 'SHIPPED' || jStatus === 'IN_TRANSIT' || jStatus === 'PICKED_UP') {
          newStatus = 'SHIPPED';
        }

        const latestCheckpoint = trackingData.checkpoints?.[trackingData.checkpoints.length - 1];
        const statusChanged = newStatus !== order.status;

        let emailDispatched = false;
        let updatedPayload = order.shipment_payload || {};

        // If status is TO_DELIVER (Out for Delivery), check if customer needs notification email
        if (newStatus === 'TO_DELIVER' && !updatedPayload.out_for_delivery_notified_at) {
          try {
            const emailRes = await sendOutForDeliveryEmail(order);
            if (emailRes.success && !emailRes.skipped) {
              emailDispatched = true;
              updatedPayload = {
                ...updatedPayload,
                out_for_delivery_notified_at: new Date().toISOString(),
                out_for_delivery_recipient: order.customer_email,
              };
            }
          } catch (e) {
            console.error(`[Sync] Failed to send delivery email for ${order.order_reference}:`, e.message);
          }
        }

        // Update database if status changed or email dispatched
        if (statusChanged || emailDispatched || !order.shipment_status) {
          const updateData = {
            status: newStatus,
            shipment_status: newStatus,
            shipment_payload: updatedPayload,
            updated_at: new Date().toISOString(),
          };

          if (latestCheckpoint) {
            updateData.courier_last_scan = latestCheckpoint.status || jStatus;
            updateData.courier_last_description = latestCheckpoint.desc || trackingData.latestLocation;
          }

          if (newStatus === 'DELIVERED' && (order.payment_method || '').toUpperCase() === 'COD') {
            updateData.payment_status = 'PAID';
          }

          // Add to audit trail
          if (statusChanged) {
            const auditEntry = {
              name: 'J&T Express Courier Tracking',
              email: 'api@jtexpress.ph',
              role: 'System / Logistics',
              action: `Status auto-synced from J&T Express to ${newStatus} (${latestCheckpoint?.desc || jStatus})`,
              timestamp: new Date().toISOString(),
            };
            const existingAudit = Array.isArray(order.audit_trail) ? order.audit_trail : [];
            updateData.audit_trail = [auditEntry, ...existingAudit].slice(0, 50);
            updateData.last_touched_by = auditEntry;
          }

          await supabase.from('orders').update(updateData).eq('id', order.id);
        }

        results.push({
          orderReference: order.order_reference,
          trackingNumber: tracking,
          previousStatus: order.status,
          currentStatus: newStatus,
          statusChanged,
          emailDispatched,
          latestLocation: trackingData.latestLocation,
        });
      } catch (orderErr) {
        results.push({
          orderReference: order.order_reference,
          trackingNumber: tracking,
          error: orderErr.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      totalProcessed: results.length,
      syncedCount: results.filter((r) => r.statusChanged).length,
      emailsSent: results.filter((r) => r.emailDispatched).length,
      orders: results,
    });
  } catch (err) {
    console.error('[J&T Sync Orders API] Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to sync orders' });
  }
}
