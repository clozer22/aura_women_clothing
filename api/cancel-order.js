import { getSupabaseServerClient } from './_lib/supabaseServer.js';
import { ensureServerEnv } from './_lib/envHelper.js';
import { cancelJtOrder } from './_lib/jtExpress.js';

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

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    ensureServerEnv();
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database connection unavailable' });
    }

    const { orderReference, reason = 'Customer requested cancellation', customerEmail = null, userId = null } = req.body || {};

    if (!orderReference) {
      return res.status(400).json({ success: false, error: 'Order reference is required' });
    }

    // 1. Fetch current order details
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('order_reference', orderReference)
      .maybeSingle();

    if (fetchErr || !order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // 2. Ownership & Authorization Verification Safeguard
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let authUser = null;
    let isAdmin = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) {
        try {
          const { data: userData } = await supabase.auth.getUser(token);
          if (userData?.user) {
            authUser = userData.user;
            const userEmail = (authUser.email || '').toLowerCase();
            if (
              userEmail.endsWith('@superadmin.com') ||
              userEmail.endsWith('@aura.com') ||
              userEmail.endsWith('@admin.com') ||
              userEmail === 'markjosephaballe1@gmail.com'
            ) {
              isAdmin = true;
            } else {
              const { data: adminProf } = await supabase
                .from('admin_profiles')
                .select('id, is_active')
                .eq('email', userEmail)
                .maybeSingle();
              if (adminProf?.is_active) isAdmin = true;
            }
          }
        } catch (_) {}
      }
    }

    // If order was placed by an authenticated user, require authenticated session matching user_id or admin
    if (order.user_id) {
      if (!isAdmin && (!authUser || authUser.id !== order.user_id)) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: You must be signed into the account that placed this order to cancel it.',
        });
      }
    } else {
      // Guest order: require exact email match or admin privilege
      const incomingEmail = (customerEmail || authUser?.email || '').toLowerCase().trim();
      const orderEmail = (order.customer_email || '').toLowerCase().trim();
      if (!isAdmin && (!incomingEmail || incomingEmail !== orderEmail)) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: Email address does not match order record.',
        });
      }
    }

    // 3. Status eligibility check: only allow cancellation if order is awaiting shipment
    const currentStatus = (order.status || '').toUpperCase();
    const cancellableStatuses = ['PENDING', 'TO_SHIP', 'PROCESSING', 'UNPAID', 'AWAITING_SHIPMENT'];

    if (!cancellableStatuses.includes(currentStatus)) {
      if (['SHIPPED', 'TO_DELIVER', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(currentStatus)) {
        return res.status(400).json({
          success: false,
          error: 'Order has already been dispatched with the courier and cannot be cancelled directly. Please contact Customer Support via Live Chat for return/exchange assistance.',
        });
      }
      if (currentStatus === 'CANCELLED') {
        return res.status(400).json({ success: false, error: 'Order is already cancelled' });
      }
      return res.status(400).json({ success: false, error: `Order cannot be cancelled in status: ${currentStatus}` });
    }

    // 4. Cancel J&T Express pickup/dispatch if order already has a tracking number
    let jtCancelResult = null;
    if (order.tracking_number && (order.courier_name || '').toUpperCase().includes('J&T')) {
      try {
        jtCancelResult = await cancelJtOrder(order.order_reference, reason, order.tracking_number);
        console.log('[Cancel Order] J&T cancellation result:', jtCancelResult);
      } catch (jtErr) {
        console.warn('[Cancel Order] J&T cancellation call note:', jtErr.message);
      }
    }

    // 5. Restore product inventory
    if (Array.isArray(order.items) && order.inventory_deducted !== false) {
      try {
        await supabase.rpc('restore_product_inventory', { p_items: order.items });
      } catch (rpcErr) {
        // Fallback: Increment inventory per product manually
        try {
          for (const item of order.items) {
            if (item.id) {
              const qty = Number(item.quantity) || 1;
              const { data: prod } = await supabase.from('products').select('stock').eq('id', item.id).single();
              if (prod) {
                await supabase.from('products').update({ stock: (Number(prod.stock) || 0) + qty }).eq('id', item.id);
              }
            }
          }
        } catch (_) {}
      }
    }

    // 6. Determine payment & refund status
    // If order was paid online, flag as REFUND_PENDING so admin can issue refund on Xendit
    // If COD, payment is simply CANCELLED (0 refund required)
    const wasPaid = (order.payment_status || '').toUpperCase() === 'PAID';
    const newPaymentStatus = wasPaid ? 'REFUND_PENDING' : 'CANCELLED';

    const auditEntry = {
      name: order.customer_name || 'Customer',
      email: order.customer_email || customerEmail || '',
      role: 'Customer',
      action: `Order cancelled by customer. Reason: ${reason}. ${wasPaid ? `Refund of ₱${order.total_amount} required via Xendit / GCash.` : 'No payment collected (COD).' }`,
      timestamp: new Date().toISOString(),
    };

    const existingAudit = Array.isArray(order.audit_trail) ? order.audit_trail : [];
    const updatedAudit = [auditEntry, ...existingAudit].slice(0, 50);

    const updatePayload = {
      status: 'CANCELLED',
      payment_status: newPaymentStatus,
      cancellation_reason: reason,
      cancelled_by: 'CUSTOMER',
      cancelled_at: new Date().toISOString(),
      inventory_deducted: false,
      audit_trail: updatedAudit,
      last_touched_by: auditEntry,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedOrder, error: updateErr } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', order.id)
      .select()
      .single();

    if (updateErr) {
      console.error('[Cancel Order] Database update error:', updateErr);
      return res.status(500).json({ success: false, error: 'Failed to update order status' });
    }

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      orderReference: order.order_reference,
      status: 'CANCELLED',
      paymentStatus: newPaymentStatus,
      wasPaid,
      refundRequired: wasPaid,
      refundAmount: wasPaid ? order.total_amount : 0,
      jtCancelled: !!jtCancelResult?.success,
    });
  } catch (err) {
    console.error('[Cancel Order] Unexpected error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
