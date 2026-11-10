import { getSupabaseServerClient, verifyAdminSession } from './_lib/supabaseServer.js';
import { ensureServerEnv } from './_lib/envHelper.js';
import { sendRestockNotificationEmail } from './_lib/emailService.js';

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
      return res.status(500).json({ success: false, error: 'Database connection unavailable.' });
    }

    // Verify administrative privileges
    const adminCheck = await verifyAdminSession(req, supabase);
    if (!adminCheck.isAuthorized) {
      return res.status(401).json({ success: false, error: adminCheck.error || 'Administrative authorization required.' });
    }

    const {
      productId,
      productName,
      productImage,
      productPrice,
      newQty,
    } = req.body || req.query || {};

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required for restock notification.',
      });
    }


    // 1. Fetch all distinct users who have this product in their bag / wishlist
    const { data: cartItems, error: cartError } = await supabase
      .from('wishlists')
      .select('user_id, product_id, product_name, product_image, price, quantity')
      .eq('product_id', String(productId));

    if (cartError) {
      console.error('[Notify Restock] Error fetching cart items:', cartError.message);
      return res.status(500).json({ success: false, error: cartError.message });
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(200).json({
        success: true,
        notifiedCount: 0,
        message: 'No users currently have this item saved in their shopping bag.',
      });
    }

    // Filter down to unique authenticated user IDs
    const userIds = Array.from(new Set(cartItems.map((c) => c.user_id).filter(Boolean)));

    if (userIds.length === 0) {
      return res.status(200).json({
        success: true,
        notifiedCount: 0,
        message: 'No registered user IDs found for this cart item.',
      });
    }

    // 2. Fetch profiles/emails for these users
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    const emailMap = new Map();
    if (!profileError && Array.isArray(profiles)) {
      profiles.forEach((p) => {
        if (p.email) {
          emailMap.set(p.id, { email: p.email, name: p.full_name || 'Client' });
        }
      });
    }

    // If any user wasn't in user_profiles, fallback to auth.admin (service role)
    for (const uId of userIds) {
      if (!emailMap.has(uId) && supabase.auth?.admin?.getUserById) {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(uId);
          if (authUser?.user?.email) {
            emailMap.set(uId, {
              email: authUser.user.email,
              name: authUser.user.user_metadata?.full_name || authUser.user.user_metadata?.name || 'Client',
            });
          }
        } catch (authErr) {
          console.warn(`[Notify Restock] Could not fetch auth user ${uId}:`, authErr.message);
        }
      }
    }

    // 3. Dispatch emails
    let notifiedCount = 0;
    const errors = [];
    const siteUrl = process.env.PUBLIC_SITE_URL || 'https://auraclothingph.com';

    for (const [userId, userInfo] of emailMap.entries()) {
      try {
        const sendResult = await sendRestockNotificationEmail({
          recipientEmail: userInfo.email,
          customerName: userInfo.name,
          productId,
          productName: productName || 'Aura Atelier Garment',
          productImage: productImage || null,
          productPrice: productPrice || null,
          newQty: Number(newQty) || 1,
          siteUrl,
        });

        if (sendResult.success) {
          notifiedCount++;
        } else if (!sendResult.skipped) {
          errors.push({ email: userInfo.email, error: sendResult.error });
        }
      } catch (sendErr) {
        errors.push({ email: userInfo.email, error: sendErr.message });
      }
    }

    console.log(`[Notify Restock] Restocked item ${productId} (${productName}): sent emails to ${notifiedCount} clients.`);

    return res.status(200).json({
      success: true,
      notifiedCount,
      totalUsersWithItemInCart: userIds.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[Notify Restock Fatal Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
