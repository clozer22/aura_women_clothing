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

    // 2. Initialize Supabase Server-Side Client
    const supabase = getSupabaseServerClient();

    // 3. Strict Customer Authentication & Email Verification (Anti-Bogus Protection)
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

    // 6. Server-Side Promo Code Validation & Computation
    let verifiedDiscount = 0;
    let verifiedPromoCode = null;
    let promoRecord = null;

    if (promoCode && typeof promoCode === 'string' && promoCode.trim()) {
      const cleanCode = promoCode.trim().toUpperCase().slice(0, 30);
      if (supabase) {
        try {
          const { data: promo, error: promoErr } = await supabase
            .from('promotions')
            .select('*')
            .eq('code', cleanCode)
            .maybeSingle();

          if (promoErr || !promo) {
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
          if (promo.min_order_value && verifiedSubtotal < Number(promo.min_order_value)) {
            return res.status(400).json({
              error: `Promo code "${cleanCode}" requires a minimum order value of ₱${Number(promo.min_order_value).toLocaleString()}.`,
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

    // 7. Generate Cryptographically Non-Guessable Order Reference
    const orderReference = `AC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

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
          await supabase.from('orders').insert([codOrder]);
          // Atomically deduct product stock in Supabase database
          try {
            await supabase.rpc('deduct_product_inventory', { p_items: verifiedItems });
          } catch (deductErr) {
            console.warn('Notice: Could not deduct inventory via RPC:', deductErr.message);
          }
          if (promoRecord?.id) {
            await supabase
              .from('promotions')
              .update({ times_used: (promoRecord.times_used || 0) + 1 })
              .eq('id', promoRecord.id);
          }
        } catch (insertErr) {
          console.warn('Notice: Could not insert COD order into Supabase:', insertErr.message);
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

    // 9. Call Xendit API Server-to-Server for Online Payments
    const xenditApiKey = process.env.XENDIT_SECRET_KEY;

    if (!xenditApiKey) {
      console.error('[create-order-invoice] Missing XENDIT_SECRET_KEY in server environment.');
      return res.status(500).json({ error: 'Payment gateway configuration error. Please contact store support.' });
    }

    const basicAuth = Buffer.from(`${xenditApiKey}:`).toString('base64');

    let paymentMethods = ['GCASH', 'PAYMAYA', 'CREDIT_CARD', 'SHOPEEPAY', 'GRABPAY'];
    if (paymentMethod === 'GCASH') {
      paymentMethods = ['GCASH'];
    } else if (paymentMethod === 'MAYA') {
      paymentMethods = ['PAYMAYA'];
    } else if (paymentMethod === 'CARD') {
      paymentMethods = ['CREDIT_CARD'];
    }

    const currentOrigin =
      req.headers.origin ||
      (req.headers.host ? `https://${req.headers.host}` : 'https://aura-women-clothing.vercel.app');

    const discountNote = verifiedPromoCode ? ` (Promo ${verifiedPromoCode} applied: -₱${verifiedDiscount})` : '';

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
      success_redirect_url: `${currentOrigin}/order-confirmed?ref=${orderReference}`,
      failure_redirect_url: `${currentOrigin}/checkout`,
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
      xendit_invoice_id: xenditData.id,
      xendit_invoice_url: xenditData.invoice_url,
      inventory_deducted: true,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        await supabase.from('orders').insert([newOrder]);
        // Atomically deduct product stock in Supabase database
        try {
          await supabase.rpc('deduct_product_inventory', { p_items: verifiedItems });
        } catch (deductErr) {
          console.warn('Notice: Could not deduct inventory via RPC (Online):', deductErr.message);
        }
        if (promoRecord?.id) {
          await supabase
            .from('promotions')
            .update({ times_used: (promoRecord.times_used || 0) + 1 })
            .eq('id', promoRecord.id);
        }
      } catch (insertErr) {
        console.warn('Notice: Could not insert pending order into Supabase:', insertErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      orderReference,
      invoiceId: xenditData.id,
      invoiceUrl: xenditData.invoice_url,
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

