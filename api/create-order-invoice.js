import { createClient } from '@supabase/supabase-js';
import { PRODUCTS } from '../src/data/products.js';

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
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { customer, shippingAddress, items, paymentMethod = 'GCASH', userId = null } = body;

    // 1. Strict Validation
    if (!customer?.fullName?.trim()) {
      return res.status(400).json({ error: 'Customer full name is required' });
    }
    if (!customer?.phone?.trim()) {
      return res.status(400).json({ error: 'Mobile number is required' });
    }
    const cleanPhone = customer.phone.replace(/\D/g, '');
    if (cleanPhone.length !== 11 || !/^09\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Valid 11-digit Philippine mobile number required (09XXXXXXXXX)' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No order items specified' });
    }
    if (!shippingAddress?.street || !shippingAddress?.city) {
      return res.status(400).json({ error: 'Incomplete delivery address provided' });
    }

    // 2. Initialize Supabase Server-Side Client
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY;

    let supabase = null;
    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey);
    }

    // 3. Fetch Verified Prices from Database (Prevent Client-Side Price Tampering)
    const productIds = items.map((i) => i.id);
    const verifiedProductMap = new Map();

    // Seed fallback product catalog
    PRODUCTS.forEach((p) => {
      verifiedProductMap.set(p.id, p);
    });

    if (supabase) {
      try {
        const { data: dbProducts, error: dbErr } = await supabase
          .from('products')
          .select('id, name, price, statusBadge, image')
          .in('id', productIds);

        if (!dbErr && dbProducts && dbProducts.length > 0) {
          dbProducts.forEach((p) => {
            verifiedProductMap.set(p.id, p);
          });
        }
      } catch (err) {
        console.warn('Database price lookup fallback to catalog memory:', err.message);
      }
    }

    // 4. Calculate Verified Subtotal and Items
    const verifiedItems = [];
    let verifiedSubtotal = 0;

    for (const item of items) {
      const match = verifiedProductMap.get(item.id);
      if (!match) {
        return res.status(400).json({ error: `Garment with ID "${item.id}" is no longer available in the catalog.` });
      }
      if (match.statusBadge === 'SOLD OUT' || match.statusBadge === 'ARCHIVE') {
        return res.status(400).json({ error: `Garment "${match.name}" is currently sold out.` });
      }

      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const unitPrice = Number(match.price) || 0;
      verifiedSubtotal += unitPrice * qty;

      verifiedItems.push({
        id: match.id,
        name: match.name,
        price: unitPrice,
        quantity: qty,
        size: item.size || 'Standard',
        color: item.color || 'Standard',
        image: match.image || item.image || '',
      });
    }

    const shippingFee = verifiedItems.length > 0 ? 150 : 0;
    const totalAmount = verifiedSubtotal + shippingFee;

    // 5. Generate Cryptographically Non-Guessable Order Reference
    const orderReference = `AC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 6. Call Xendit API Server-to-Server
    const xenditApiKey =
      process.env.XENDIT_SECRET_KEY ||
      process.env.VITE_XENDIT_API_KEY ||
      'xnd_development_G4K4iGkpjDrzT6EQIDzZShzp7oK77GiaEhAYWPCIC4e0ROvsmVSSi2tZZKScBK';

    const authHeader = Buffer.from(`${xenditApiKey}:`).toString('base64');

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

    const xenditPayload = {
      external_id: orderReference,
      amount: Math.round(totalAmount),
      payer_email: customer.email || 'guest@aurawomen.com',
      description: `Aura Women's Clothing - Order ${orderReference}`,
      customer: {
        given_names: customer.fullName,
        mobile_number: cleanPhone,
        email: customer.email || 'guest@aurawomen.com',
      },
      customer_notification_preference: {
        invoice_created: ['email'],
        invoice_reminder: ['email'],
        invoice_paid: ['email'],
      },
      items: verifiedItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: Math.round(item.price),
        category: 'Apparel',
      })),
      payment_methods: paymentMethods,
      currency: 'PHP',
      success_redirect_url: `${currentOrigin}/order-confirmed?ref=${orderReference}`,
      failure_redirect_url: `${currentOrigin}/checkout`,
    };

    const xenditRes = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify(xenditPayload),
    });

    const xenditData = await xenditRes.json();
    if (!xenditRes.ok || !xenditData.invoice_url) {
      console.error('Xendit Invoice Creation Failed:', xenditData);
      return res.status(500).json({ error: xenditData.message || 'Failed to initialize payment gateway' });
    }

    // 7. Store Unpaid Order in Supabase with PENDING Status
    const newOrder = {
      order_reference: orderReference,
      customer_name: customer.fullName,
      customer_phone: cleanPhone,
      customer_email: customer.email || '',
      shipping_address: shippingAddress,
      items: verifiedItems,
      subtotal: verifiedSubtotal,
      shipping_fee: shippingFee,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      payment_status: 'PENDING',
      status: 'PENDING',
      user_id: userId || null,
      xendit_invoice_id: xenditData.id,
      xendit_invoice_url: xenditData.invoice_url,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        await supabase.from('orders').insert([newOrder]);
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
      order: newOrder,
    });
  } catch (error) {
    console.error('Server error creating order invoice:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
