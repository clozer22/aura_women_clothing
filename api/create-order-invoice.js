import crypto from 'crypto';
import { getSupabaseServerClient } from './_lib/supabaseServer.js';
import { PRODUCTS } from '../src/data/products.js';
import { calculateShippingFee } from '../src/lib/shippingCalculator.js';
import { ensureServerEnv } from './_lib/envHelper.js';


// Input sanitization against XSS and CSV/formula injection
function sanitizeText(value, maxLen = 100) {
  if (typeof value !== 'string') return '';
  let cleaned = value.replace(/<[^>]*>?/gm, '').trim();
  // Neutralize spreadsheet formula injection characters (=, +, -, @)
  if (/^[=+\-@]/.test(cleaned)) {
    cleaned = `'${cleaned}`;
  }
  return cleaned.slice(0, maxLen);
}

function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned) ? cleaned.slice(0, 100) : '';
}

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
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    ensureServerEnv();
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { customer, shippingAddress, items, paymentMethod = 'GCASH', promoCode } = body;

    // 1. Strict Input Validation & Sanitization
    if (!customer?.fullName || typeof customer.fullName !== 'string' || !customer.fullName.trim()) {
      return res.status(400).json({ error: 'Customer full name is required' });
    }
    const cleanCustomerName = sanitizeText(customer.fullName, 80);

    if (!customer?.phone || typeof customer.phone !== 'string' || !customer.phone.trim()) {
      return res.status(400).json({ error: 'Mobile number is required' });
    }
    const cleanPhone = customer.phone.replace(/\D/g, '');
    if (cleanPhone.length !== 11 || !/^09\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Valid 11-digit Philippine mobile number required (09XXXXXXXXX)' });
    }

    const cleanEmail = sanitizeEmail(customer.email || '');

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No order items specified' });
    }

    if (!shippingAddress?.street || !shippingAddress?.city) {
      return res.status(400).json({ error: 'Incomplete delivery address provided' });
    }

    const cleanShippingAddress = {
      street: sanitizeText(shippingAddress.street, 150),
      city: sanitizeText(shippingAddress.city, 80),
      province: sanitizeText(shippingAddress.province || 'Metro Manila', 80),
      region: sanitizeText(shippingAddress.region || '', 80),
      barangay: sanitizeText(shippingAddress.barangay || '', 80),
      zipCode: sanitizeText(shippingAddress.zipCode, 10),
      country: 'Philippines',
    };

    // 2. Strict Customer Authentication & Email Verification (Anti-Bogus Protection)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required: You must be signed in with a verified account to place an order.',
      });
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return res.status(401).json({ error: 'Invalid authentication bearer token.' });
    }

    // 3. Initialize Supabase Server-Side Client (forwards customer JWT if Service Role Key is not set)
    const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const supabase = getSupabaseServerClient(
      null,
      hasServiceRole ? {} : { Authorization: `Bearer ${token}` }
    );

    let verifiedUserId = null;
    let authUser = null;

    if (supabase) {
      try {
        const { data: userData, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !userData?.user) {
          return res.status(401).json({ error: 'Your session has expired or is invalid. Please sign in again.' });
        }
        authUser = userData.user;
        verifiedUserId = authUser.id;

        // Verify that the user's email is confirmed or verified via Google OAuth
        const isGoogle =
          authUser.app_metadata?.provider === 'google' ||
          authUser.raw_app_meta_data?.provider === 'google' ||
          (Array.isArray(authUser.app_metadata?.providers) && authUser.app_metadata.providers.includes('google'));
        const isEmailVerified = Boolean(authUser.email_confirmed_at || authUser.confirmed_at || isGoogle);

        if (!isEmailVerified) {
          return res.status(403).json({
            error: 'Email verification required: Please verify your email with the 6-digit OTP code before checking out.',
          });
        }

        // Anti-spoofing check: ensure order recipient email matches the authenticated account
        const authEmail = (authUser.email || '').toLowerCase().trim();
        if (authEmail && cleanEmail && cleanEmail !== authEmail) {
          return res.status(400).json({
            error: 'Security mismatch: The order email must match your verified account email address.',
          });
        }
      } catch (e) {
        return res.status(401).json({ error: 'Authentication verification failed.' });
      }
    }

    // 4. Fetch Verified Prices from Database (Prevent Client-Side Price Tampering)
    const productIds = items.map((i) => i.id);
    const verifiedProductMap = new Map();

    // Seed fallback product catalog
    PRODUCTS.forEach((p) => {
      verifiedProductMap.set(p.id, p);
      verifiedProductMap.set(String(p.id), p);
    });

    if (supabase) {
      try {
        const { data: dbProducts, error: dbErr } = await supabase
          .from('products')
          .select('id, name, price, statusBadge, image, qty')
          .in('id', productIds);

        if (!dbErr && dbProducts && dbProducts.length > 0) {
          dbProducts.forEach((p) => {
            verifiedProductMap.set(p.id, p);
            verifiedProductMap.set(String(p.id), p);
          });
        }
      } catch (err) {
        console.warn('Database price lookup fallback to catalog memory:', err.message);
      }
    }

    // 5. Calculate Verified Subtotal and Validate Item Quantities
    const verifiedItems = [];
    let verifiedSubtotal = 0;

    for (const item of items) {
      const match = verifiedProductMap.get(item.id) || verifiedProductMap.get(String(item.id));
      if (!match) {
        return res.status(400).json({ error: `Garment with ID "${item.id}" is no longer available in the catalog.` });
      }
      if (match.statusBadge === 'SOLD OUT' || match.statusBadge === 'ARCHIVE' || (match.qty !== undefined && match.qty !== null && Number(match.qty) <= 0)) {
        return res.status(400).json({ error: `Garment "${match.name}" is currently sold out.` });
      }

      // Enforce bounds: min 1, max 20 per item
      const qty = Math.min(20, Math.max(1, parseInt(item.quantity, 10) || 1));
      if (match.qty !== undefined && match.qty !== null && Number(match.qty) < qty) {
        return res.status(400).json({
          error: `Sorry, "${match.name}" only has ${match.qty} item(s) left in stock.`,
        });
      }
      const unitPrice = Number(match.price) || 0;
      verifiedSubtotal += unitPrice * qty;

      verifiedItems.push({
        id: match.id,
        name: sanitizeText(match.name, 100),
        price: unitPrice,
        quantity: qty,
        size: sanitizeText(item.size || 'Standard', 30),
        color: sanitizeText(item.color || 'Standard', 30),
        image: match.image || item.image || '',
      });
    }

    // 6. Server-Side Promo Code Validation & Computation (Strictly One-Time Use Per Customer)
    let verifiedDiscount = 0;
    let verifiedPromoCode = null;
    const orderTotalItemsCount = verifiedItems.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);

    // Official Atelier Rank Vouchers (All fixed PHP discounts, strictly one-time use per customer)
    const PRESET_VOUCHERS = {
      // Tier 1: AURA Muse (1–5 items | Entry Membership)
      MUSEBDAY50: { code: 'MUSEBDAY50', discount_type: 'fixed', discount_value: 50, min_order_value: 0, min_order_items: 1, min_historical_items: 1, is_active: true },
      MUSELOYAL30: { code: 'MUSELOYAL30', discount_type: 'fixed', discount_value: 30, min_order_value: 0, min_order_items: 3, min_historical_items: 0, is_active: true },
      MUSE50: { code: 'MUSE50', discount_type: 'fixed', discount_value: 50, min_order_value: 999, min_order_items: 1, min_historical_items: 0, is_active: true },

      // Tier 2: AURA Icon (6–14 items | VIP Membership)
      ICONBDAY100: { code: 'ICONBDAY100', discount_type: 'fixed', discount_value: 100, min_order_value: 0, min_order_items: 1, min_historical_items: 6, is_active: true },
      ICONLOYAL50: { code: 'ICONLOYAL50', discount_type: 'fixed', discount_value: 50, min_order_value: 0, min_order_items: 4, min_historical_items: 6, is_active: true },
      ICON100: { code: 'ICON100', discount_type: 'fixed', discount_value: 100, min_order_value: 1299, min_order_items: 1, min_historical_items: 6, is_active: true },
      ICON10ITEMS50: { code: 'ICON10ITEMS50', discount_type: 'fixed', discount_value: 50, min_order_value: 0, min_order_items: 1, min_historical_items: 10, is_active: true },

      // Tier 3: AURA Royal (16+ items | Elite Membership)
      ROYALBDAY200: { code: 'ROYALBDAY200', discount_type: 'fixed', discount_value: 200, min_order_value: 0, min_order_items: 1, min_historical_items: 15, is_active: true },
      ROYALLOYAL100: { code: 'ROYALLOYAL100', discount_type: 'fixed', discount_value: 100, min_order_value: 0, min_order_items: 6, min_historical_items: 15, is_active: true },
      ROYAL300: { code: 'ROYAL300', discount_type: 'fixed', discount_value: 300, min_order_value: 1999, min_order_items: 1, min_historical_items: 15, is_active: true },
      ROYAL10ITEMS100: { code: 'ROYAL10ITEMS100', discount_type: 'fixed', discount_value: 100, min_order_value: 0, min_order_items: 1, min_historical_items: 10, is_active: true },

      // General Store Vouchers
      AURA100: { code: 'AURA100', discount_type: 'fixed', discount_value: 100, min_order_value: 800, min_order_items: 1, min_historical_items: 0, is_active: true },
      WELCOME50: { code: 'WELCOME50', discount_type: 'fixed', discount_value: 50, min_order_value: 500, min_order_items: 1, min_historical_items: 0, is_active: true },
    };

    let promoRecord = null;

    if (promoCode && typeof promoCode === 'string' && promoCode.trim()) {
      const cleanCode = promoCode.trim().toUpperCase().slice(0, 30);
      try {
        // 6a. Enforce One-Time-Only Per Customer & Compute Customer's Historical Purchased Items
        let customerHistoricalItems = 0;
        if (supabase && (verifiedUserId || cleanEmail)) {
          let historyQuery = supabase
            .from('orders')
            .select('id, items, promo_code, status, payment_status');

          if (verifiedUserId && cleanEmail) {
            historyQuery = historyQuery.or(`user_id.eq.${verifiedUserId},customer_email.ilike.${cleanEmail}`);
          } else if (verifiedUserId) {
            historyQuery = historyQuery.eq('user_id', verifiedUserId);
          } else {
            historyQuery = historyQuery.ilike('customer_email', cleanEmail);
          }

          const { data: pastOrders } = await historyQuery;
          if (Array.isArray(pastOrders)) {
            const activePastOrders = pastOrders.filter(
              (o) => !['CANCELLED', 'RETURNED', 'REFUNDED'].includes((o.status || '').toUpperCase())
            );

            // Check if customer already redeemed this voucher code in any non-cancelled order
            const alreadyUsed = activePastOrders.some(
              (o) => (o.promo_code || '').trim().toUpperCase() === cleanCode
            );
            if (alreadyUsed) {
              return res.status(400).json({
                error: `Voucher "${cleanCode}" has already been used on your account. Each voucher is valid for one-time use only.`,
              });
            }

            // Sum historical items purchased by customer
            customerHistoricalItems = activePastOrders.reduce((acc, ord) => {
              if (Array.isArray(ord.items) && ord.items.length > 0) {
                return acc + ord.items.reduce((s, it) => s + (Number(it?.quantity) || 1), 0);
              }
              return acc + 1;
            }, 0);
          }
        }

        let promo = PRESET_VOUCHERS[cleanCode] ? { ...PRESET_VOUCHERS[cleanCode] } : null;

        if (supabase) {
          const { data, error: promoErr } = await supabase
            .from('promotions')
            .select('*')
            .eq('code', cleanCode)
            .maybeSingle();

          if (!promoErr && data) {
            promo = {
              ...(promo || {}),
              ...data,
              min_order_value:
                PRESET_VOUCHERS[cleanCode]?.min_order_value !== undefined
                  ? PRESET_VOUCHERS[cleanCode].min_order_value
                  : data.min_order_value,
              min_order_items: PRESET_VOUCHERS[cleanCode]?.min_order_items || 1,
              min_historical_items: PRESET_VOUCHERS[cleanCode]?.min_historical_items || 0,
              tier: PRESET_VOUCHERS[cleanCode]?.tier || null,
            };
          }
        }

        // Attach tier from PRESET_VOUCHERS if matched
        if (promo && !promo.tier && PRESET_VOUCHERS[cleanCode]) {
          const tierByPrefix = cleanCode.startsWith('ROYAL')
            ? 'AURA Royal'
            : cleanCode.startsWith('ICON')
            ? 'AURA Icon'
            : cleanCode.startsWith('MUSE')
            ? 'AURA Muse'
            : null;
          if (tierByPrefix) promo.tier = tierByPrefix;
        }

        if (!promo) {
          return res.status(400).json({ error: `Promo code "${cleanCode}" is invalid.` });
        }
        if (!promo.is_active) {
          return res.status(400).json({ error: `Promo code "${cleanCode}" is no longer active.` });
        }
        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
          return res.status(400).json({ error: `Promo code "${cleanCode}" has expired.` });
        }
        if (promo.usage_limit && (promo.times_used || 0) >= promo.usage_limit) {
          return res.status(400).json({ error: `Promo code "${cleanCode}" has reached its maximum usage limit.` });
        }

        // Enforce Tier / Rank Requirement (AURA Muse: 1+, AURA Icon: 6+, AURA Royal: 16+)
        const tierMinMap = { 'AURA Muse': 1, 'AURA Icon': 6, 'AURA Royal': 16 };
        const requiredTierItems = promo.tier ? (tierMinMap[promo.tier] || 0) : 0;
        if (requiredTierItems > 0 && customerHistoricalItems < requiredTierItems) {
          return res.status(400).json({
            error: `Voucher "${cleanCode}" is exclusive to ${promo.tier} members (${requiredTierItems}+ purchased items required; your account has ${customerHistoricalItems}).`,
          });
        }

        // Enforce Tier / Milestone Historical Item Requirement (strictly based on purchased items)
        if (
          promo.min_historical_items &&
          Number(promo.min_historical_items) > 0 &&
          customerHistoricalItems < Number(promo.min_historical_items)
        ) {
          return res.status(400).json({
            error: `Voucher "${cleanCode}" requires at least ${promo.min_historical_items} purchased items on your account (Current: ${customerHistoricalItems}).`,
          });
        }

        // Enforce Birthday Voucher Eligibility (Birthdate must be set & birth month must match)
        if (cleanCode.includes('BDAY') && supabase && verifiedUserId) {
          const { data: profData } = await supabase
            .from('user_profiles')
            .select('birthdate')
            .eq('id', verifiedUserId)
            .maybeSingle();

          const bdayStr = profData?.birthdate || authUser?.user_metadata?.birthdate || null;
          if (!bdayStr) {
            return res.status(400).json({
              error: `Please set your birthdate in your Profile first to claim Birthday Voucher "${cleanCode}".`,
            });
          }
          const birthMonth = new Date(`${bdayStr}T00:00:00`).getMonth();
          const currentMonth = new Date().getMonth();
          if (birthMonth !== currentMonth) {
            return res.status(400).json({
              error: `Birthday Voucher "${cleanCode}" can only be redeemed during your birth month.`,
            });
          }
        }

        // Enforce Loyalty Minimum Items in Current Order (e.g. 3 items for Muse, 4 for Icon, 6 for Royal)
        if (
          promo.min_order_items &&
          Number(promo.min_order_items) > 1 &&
          orderTotalItemsCount < Number(promo.min_order_items)
        ) {
          return res.status(400).json({
            error: `Loyalty voucher "${cleanCode}" requires at least ${promo.min_order_items} items in your order (Current: ${orderTotalItemsCount}).`,
          });
        }

        // Enforce Minimum Spend Requirement (e.g. ₱999 for MUSE50, ₱1,299 for ICON100, ₱1,999 for ROYAL300)
        if (promo.min_order_value && Number(promo.min_order_value) > 0 && verifiedSubtotal < Number(promo.min_order_value)) {
          return res.status(400).json({
            error: `Voucher "${cleanCode}" requires a minimum spend of ₱${Number(promo.min_order_value).toLocaleString()}.`,
          });
        }

        if (promo.discount_type === 'percentage') {
          verifiedDiscount = Math.round((verifiedSubtotal * Number(promo.discount_value)) / 100);
        } else {
          verifiedDiscount = Math.round(Number(promo.discount_value) || 0);
        }
        verifiedDiscount = Math.min(verifiedDiscount, verifiedSubtotal);
        verifiedPromoCode = cleanCode;
        promoRecord = promo;
      } catch (err) {
        console.warn('Error during server-side promo verification:', err.message);
        return res.status(400).json({ error: 'Could not verify promotion code. Please try again.' });
      }
    }

    const netSubtotal = Math.max(0, verifiedSubtotal - verifiedDiscount);
    const shippingCalc = calculateShippingFee({
      regionName: cleanShippingAddress.region,
      provinceName: cleanShippingAddress.province,
      subtotal: netSubtotal,
      itemCount: verifiedItems.length,
    });
    const shippingFee = shippingCalc.fee;
    const totalAmount = netSubtotal + shippingFee;

    // 7. Generate Cryptographically Non-Guessable Order Reference (CSPRNG)
    const orderReference = `AC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // 8. Special Handling for Cash on Delivery (COD)
    if (paymentMethod === 'COD') {
      // Enforce strict limit: 1,000 PHP and below
      if (totalAmount > 1000) {
        return res.status(400).json({
          error: 'Cash on Delivery (COD) is strictly available for orders with a total of ₱1,000 or below. Please select an e-wallet or credit/debit card.',
        });
      }

      // Store Order in Supabase with TO_SHIP Status & COD Payment Method
      const codOrder = {
        order_reference: orderReference,
        customer_name: cleanCustomerName,
        customer_phone: cleanPhone,
        customer_email: cleanEmail,
        shipping_address: cleanShippingAddress,
        items: verifiedItems,
        subtotal: verifiedSubtotal,
        discount_amount: verifiedDiscount,
        promo_code: verifiedPromoCode,
        shipping_fee: shippingFee,
        total_amount: totalAmount,
        payment_method: 'COD',
        payment_status: 'PENDING', // Payment collected upon physical delivery
        status: 'TO_SHIP',
        user_id: verifiedUserId,
        inventory_deducted: true,
        created_at: new Date().toISOString(),
      };

      if (supabase) {
        try {
          const { error: codInsertErr } = await supabase.from('orders').insert([codOrder]);
          if (codInsertErr) {
            console.error('[Create Order] Failed to insert COD order into Supabase:', codInsertErr.message);
            return res.status(500).json({ error: 'Unable to record your order right now. Please try again.' });
          }
          // Atomically deduct product stock in Supabase database
          try {
            await supabase.rpc('deduct_product_inventory', { p_items: verifiedItems });
          } catch (deductErr) {
            console.warn('Notice: Could not deduct inventory via RPC:', deductErr.message);
          }
          if (promoRecord?.id) {
            try {
              await supabase.rpc('increment_promo_usage', { p_promo_id: promoRecord.id });
            } catch (pErr) {
              console.warn('[Create Order] Atomic promo usage increment warning:', pErr.message);
            }
          }
        } catch (insertErr) {
          console.error('[Create Order] Unexpected error inserting COD order into Supabase:', insertErr.message);
          return res.status(500).json({ error: 'Unable to record your order right now. Please try again.' });
        }
      }

      // Order is placed in Awaiting Shipment (TO_SHIP) stage.
      // Courier booking to J&T Express is deliberately deferred until the store admin
      // arranges shipment (moving order to Awaiting Collection) in the seller dashboard.
      codOrder.status = 'TO_SHIP';
      codOrder.shipment_status = 'PENDING';
      codOrder.courier_name = 'J&T Express';
      codOrder.tracking_number = null;
      codOrder.waybill_url = null;

      return res.status(200).json({
        success: true,
        isCod: true,
        orderReference,
        totalAmount,
        discountAmount: verifiedDiscount,
        promoCode: verifiedPromoCode,
        order: codOrder,
        trackingNumber: null,
        courierName: 'J&T Express',
        waybillUrl: null,
        redirectUrl: `/order-confirmed?ref=${orderReference}`,
      });
    }

    // 9. Call Payment Gateway Server-to-Server for Online Payments (Maya / PayMongo / Xendit)
    const mayaPublicKey = (process.env.MAYA_PUBLIC_KEY || '').trim();
    const mayaSecretKey = (process.env.MAYA_SECRET_KEY || '').trim();
    const paymongoSecretKey = (process.env.PAYMONGO_SECRET_KEY || '').trim();
    const xenditApiKey = (process.env.XENDIT_SECRET_KEY || '').trim();
    const preferredGateway = (process.env.PAYMENT_GATEWAY || '').trim().toUpperCase();

    let activeGateway = null;
    if (preferredGateway === 'MAYA' && mayaPublicKey) {
      activeGateway = 'MAYA';
    } else if (preferredGateway === 'PAYMONGO' && paymongoSecretKey) {
      activeGateway = 'PAYMONGO';
    } else if (preferredGateway === 'XENDIT' && xenditApiKey) {
      activeGateway = 'XENDIT';
    } else if (mayaPublicKey) {
      activeGateway = 'MAYA';
    } else if (paymongoSecretKey) {
      activeGateway = 'PAYMONGO';
    } else if (xenditApiKey) {
      activeGateway = 'XENDIT';
    }

    if (!activeGateway) {
      console.error('[create-order-invoice] Missing payment gateway API keys in server environment.');
      return res.status(500).json({ error: 'Payment gateway configuration error. Please contact store support.' });
    }

    const currentOrigin =
      req.headers.origin ||
      (req.headers.host ? `https://${req.headers.host}` : 'https://aurashophere.com');

    const discountNote = verifiedPromoCode ? ` (Promo ${verifiedPromoCode} applied: -₱${verifiedDiscount})` : '';
    const successUrl = `${currentOrigin}/order-confirmed?ref=${orderReference}`;
    const cancelUrl = `${currentOrigin}/checkout?payment=cancelled`;

    let gatewayInvoiceId = null;
    let gatewayInvoiceUrl = null;

    if (activeGateway === 'MAYA') {
      const isMayaSandbox = String(process.env.MAYA_SANDBOX_MODE || 'true').toLowerCase() !== 'false';
      const mayaBaseUrl = isMayaSandbox
        ? 'https://pg-sandbox.paymaya.com'
        : 'https://pg.paymaya.com';

      // Maya Checkout POST /checkout/v1/checkouts authenticates using Basic base64(MAYA_PUBLIC_KEY + ':')
      const mayaBasicAuth = Buffer.from(`${mayaPublicKey}:`).toString('base64');

      const nameParts = cleanCustomerName.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || 'Valued';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Client';

      const mayaItems = verifiedItems.map((item) => {
        const discountedUnitPrice =
          verifiedDiscount > 0
            ? Number((item.price * (1 - verifiedDiscount / verifiedSubtotal)).toFixed(2))
            : Number(item.price);
        const lineTotal = Number((discountedUnitPrice * item.quantity).toFixed(2));
        return {
          name: `${item.name} (${item.size})`,
          quantity: item.quantity,
          code: String(item.id),
          description: verifiedPromoCode ? `Promo ${verifiedPromoCode} applied` : 'Apparel',
          amount: {
            value: discountedUnitPrice,
            details: {
              discount: verifiedDiscount > 0 ? Number((item.price - discountedUnitPrice).toFixed(2)) : 0,
              subtotal: Number(item.price),
            },
          },
          totalAmount: {
            value: lineTotal,
            details: {
              discount:
                verifiedDiscount > 0
                  ? Number(((item.price - discountedUnitPrice) * item.quantity).toFixed(2))
                  : 0,
              subtotal: Number((item.price * item.quantity).toFixed(2)),
            },
          },
        };
      });

      if (shippingFee > 0) {
        mayaItems.push({
          name: 'Courier Delivery (J&T Express)',
          quantity: 1,
          code: 'SHIPPING-JT',
          description: 'Standard Door-to-Door Delivery',
          amount: { value: Number(shippingFee) },
          totalAmount: { value: Number(shippingFee) },
        });
      }

      const mayaPayload = {
        totalAmount: {
          value: Number(Math.round(totalAmount)),
          currency: 'PHP',
          details: {
            discount: Number(verifiedDiscount || 0),
            shippingFee: Number(shippingFee || 0),
            subtotal: Number(verifiedSubtotal || 0),
          },
        },
        buyer: {
          firstName,
          lastName,
          contact: {
            phone: cleanPhone,
            email: cleanEmail || 'auraofficialph@gmail.com',
          },
          shippingAddress: {
            firstName,
            lastName,
            phone: cleanPhone,
            email: cleanEmail || 'auraofficialph@gmail.com',
            line1: cleanShippingAddress.street,
            line2: cleanShippingAddress.barangay || cleanShippingAddress.city,
            city: cleanShippingAddress.city,
            state: cleanShippingAddress.province,
            zipCode: cleanShippingAddress.zipCode || '1000',
            countryCode: 'PH',
            shippingType: 'ST',
          },
          billingAddress: {
            line1: cleanShippingAddress.street,
            line2: cleanShippingAddress.barangay || cleanShippingAddress.city,
            city: cleanShippingAddress.city,
            state: cleanShippingAddress.province,
            zipCode: cleanShippingAddress.zipCode || '1000',
            countryCode: 'PH',
          },
        },
        items: mayaItems,
        redirectUrl: {
          success: successUrl,
          failure: cancelUrl,
          cancel: cancelUrl,
        },
        requestReferenceNumber: orderReference,
        metadata: {
          order_reference: orderReference,
          preferred_method: paymentMethod,
        },
      };

      const mayaRes = await fetch(`${mayaBaseUrl}/checkout/v1/checkouts`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${mayaBasicAuth}`,
        },
        body: JSON.stringify(mayaPayload),
      });

      const mayaData = await mayaRes.json().catch(() => ({}));
      if (!mayaRes.ok || !mayaData.redirectUrl) {
        console.error('Maya Checkout Creation Failed:', JSON.stringify(mayaData));
        return res.status(500).json({
          error: mayaData.message || mayaData.error || 'Failed to initialize Maya Checkout session',
        });
      }

      gatewayInvoiceId = `maya_${mayaData.checkoutId}`;
      gatewayInvoiceUrl = mayaData.redirectUrl;
    } else if (activeGateway === 'PAYMONGO') {
      const basicAuth = Buffer.from(`${paymongoSecretKey}:`).toString('base64');

      let pmMethodTypes = ['gcash', 'paymaya', 'card'];
      if (paymentMethod === 'GCASH') {
        pmMethodTypes = ['gcash'];
      } else if (paymentMethod === 'MAYA') {
        pmMethodTypes = ['paymaya'];
      } else if (paymentMethod === 'CARD') {
        pmMethodTypes = ['card'];
      }

      // PayMongo requires amounts in centavos (₱1.00 = 100 centavos) and calculates the total
      // strictly as sum(line_item.amount * line_item.quantity).
      const targetNetSubtotalCentavos = Math.round(netSubtotal * 100);
      let lineItems = [];

      if (verifiedDiscount > 0) {
        // When a promo discount is applied, consolidate each garment line to quantity=1
        // so centavo allocation is 100% exact with zero per-unit multiplication rounding drift.
        let runningCentavos = 0;
        lineItems = verifiedItems.map((item, idx) => {
          const rawItemTotal = item.price * item.quantity;
          const isLast = idx === verifiedItems.length - 1;
          const discountedItemCentavos = isLast
            ? Math.max(100, targetNetSubtotalCentavos - runningCentavos)
            : Math.max(100, Math.round(rawItemTotal * (1 - verifiedDiscount / verifiedSubtotal) * 100));
          runningCentavos += discountedItemCentavos;

          const qtyLabel = item.quantity > 1 ? ` × ${item.quantity}` : '';
          return {
            currency: 'PHP',
            amount: discountedItemCentavos,
            name: `${item.name} (${item.size})${qtyLabel}`,
            quantity: 1,
            description: verifiedPromoCode ? `Promo ${verifiedPromoCode} applied` : 'Apparel',
          };
        });
      } else {
        lineItems = verifiedItems.map((item) => ({
          currency: 'PHP',
          amount: Math.round(item.price * 100),
          name: `${item.name} (${item.size})`,
          quantity: item.quantity,
          description: 'Apparel',
        }));
      }

      if (shippingFee > 0) {
        lineItems.push({
          currency: 'PHP',
          amount: Math.round(shippingFee * 100),
          name: 'Courier Delivery (J&T Express)',
          quantity: 1,
          description: 'Shipping',
        });
      }

      const buildPaymongoPayload = (methods) => ({
        data: {
          attributes: {
            billing: {
              name: cleanCustomerName,
              email: cleanEmail || 'auraofficialph@gmail.com',
              phone: cleanPhone,
              address: {
                line1: cleanShippingAddress.street,
                line2: cleanShippingAddress.barangay || '',
                city: cleanShippingAddress.city,
                state: cleanShippingAddress.province,
                postal_code: cleanShippingAddress.zipCode || '',
                country: 'PH',
              },
            },
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            description: `Aura Women's Clothing - Order ${orderReference}${discountNote}`,
            reference_number: orderReference,
            payment_method_types: methods,
            line_items: lineItems,
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
              order_reference: orderReference,
              customer_email: cleanEmail || '',
              promo_code: verifiedPromoCode || '',
            },
          },
        },
      });

      let pmRes = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify(buildPaymongoPayload(pmMethodTypes)),
      });

      let pmData = await pmRes.json().catch(() => ({}));

      // If a single payment method type is not enabled on the merchant account, retry with all standard methods
      if (!pmRes.ok && pmMethodTypes.length === 1) {
        pmRes = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Basic ${basicAuth}`,
          },
          body: JSON.stringify(buildPaymongoPayload(['gcash', 'paymaya', 'card'])),
        });
        pmData = await pmRes.json().catch(() => ({}));
      }

      const checkoutSession = pmData?.data;
      const checkoutUrl = checkoutSession?.attributes?.checkout_url;

      if (!pmRes.ok || !checkoutUrl) {
        const errDetail =
          pmData?.errors?.[0]?.detail ||
          pmData?.errors?.[0]?.code ||
          'Failed to initialize PayMongo checkout session';
        console.error('PayMongo Checkout Session Creation Failed:', JSON.stringify(pmData));
        return res.status(500).json({ error: errDetail });
      }

      gatewayInvoiceId = checkoutSession.id;
      gatewayInvoiceUrl = checkoutUrl;
    } else {
      const basicAuth = Buffer.from(`${xenditApiKey}:`).toString('base64');

      let paymentMethods = ['GCASH', 'PAYMAYA', 'CREDIT_CARD', 'SHOPEEPAY', 'GRABPAY'];
      if (paymentMethod === 'GCASH') {
        paymentMethods = ['GCASH'];
      } else if (paymentMethod === 'MAYA') {
        paymentMethods = ['PAYMAYA'];
      } else if (paymentMethod === 'CARD') {
        paymentMethods = ['CREDIT_CARD'];
      }

      const xenditPayload = {
        external_id: orderReference,
        amount: Math.round(totalAmount),
        payer_email: cleanEmail || 'auraofficialph@gmail.com',
        description: `Aura Women's Clothing - Order ${orderReference}${discountNote}`,
        customer: {
          given_names: cleanCustomerName,
          mobile_number: cleanPhone,
          email: cleanEmail || 'auraofficialph@gmail.com',
        },
        customer_notification_preference: {
          invoice_created: ['email'],
          invoice_reminder: ['email'],
          invoice_paid: ['email'],
        },
        items: [
          ...verifiedItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: Math.round(
              verifiedDiscount > 0
                ? item.price * (1 - verifiedDiscount / verifiedSubtotal)
                : item.price
            ),
            category: 'Apparel',
          })),
          ...(shippingFee > 0
            ? [
                {
                  name: 'Courier Delivery (J&T Express)',
                  quantity: 1,
                  price: shippingFee,
                  category: 'Shipping',
                },
              ]
            : []),
        ],
        payment_methods: paymentMethods,
        currency: 'PHP',
        success_redirect_url: successUrl,
        failure_redirect_url: cancelUrl,
      };

      const xenditRes = await fetch('https://api.xendit.co/v2/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify(xenditPayload),
      });

      const xenditData = await xenditRes.json();
      if (!xenditRes.ok || !xenditData.invoice_url) {
        console.error('Xendit Invoice Creation Failed:', xenditData);
        return res.status(500).json({ error: xenditData.message || 'Failed to initialize payment gateway' });
      }

      gatewayInvoiceId = xenditData.id;
      gatewayInvoiceUrl = xenditData.invoice_url;
    }

    // 10. Store Unpaid Order in Supabase with PENDING Status
    const newOrder = {
      order_reference: orderReference,
      customer_name: cleanCustomerName,
      customer_phone: cleanPhone,
      customer_email: cleanEmail,
      shipping_address: cleanShippingAddress,
      items: verifiedItems,
      subtotal: verifiedSubtotal,
      discount_amount: verifiedDiscount,
      promo_code: verifiedPromoCode,
      shipping_fee: shippingFee,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      payment_status: 'PENDING',
      status: 'PENDING',
      user_id: verifiedUserId,
      xendit_invoice_id: gatewayInvoiceId,
      xendit_invoice_url: gatewayInvoiceUrl,
      inventory_deducted: false,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { error: pendingInsertErr } = await supabase.from('orders').insert([newOrder]);
        if (pendingInsertErr) {
          console.error('[Create Order] Failed to insert pending order into Supabase:', pendingInsertErr.message);
        }
        // Inventory deduction is idempotently deferred until payment is verified as PAID via webhook or verify-payment.
        if (promoRecord?.id) {
          try {
            await supabase.rpc('increment_promo_usage', { p_promo_id: promoRecord.id });
          } catch (pErr) {
            console.warn('[Create Order] Atomic promo usage increment warning:', pErr.message);
          }
        }
      } catch (insertErr) {
        console.warn('Notice: Could not insert pending order into Supabase:', insertErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      gateway: activeGateway,
      orderReference,
      invoiceId: gatewayInvoiceId,
      invoiceUrl: gatewayInvoiceUrl,
      totalAmount,
      discountAmount: verifiedDiscount,
      promoCode: verifiedPromoCode,
      order: newOrder,
    });
  } catch (error) {
    console.error('Server error creating order invoice:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

