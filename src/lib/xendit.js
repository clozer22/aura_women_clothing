/**
 * Xendit Payment Gateway Integration Service
 */

const XENDIT_API_KEY =
  import.meta.env.VITE_XENDIT_API_KEY ||
  'xnd_development_G4K4iGkpjDrzT6EQIDzZShzp7oK77GiaEhAYWPCIC4e0ROvsmVSSi2tZZKScBK';

/**
 * Creates a Xendit Invoice for checkout
 * @param {Object} params
 * @param {string} params.orderNumber
 * @param {number} params.amount
 * @param {string} params.customerEmail
 * @param {string} params.customerName
 * @param {string} params.customerPhone
 * @param {Array} params.items
 * @param {string} params.paymentMethod - 'GCASH' | 'MAYA' | 'CARD'
 */
export async function createXenditInvoice({
  orderNumber,
  amount,
  customerEmail,
  customerName,
  customerPhone,
  items = [],
  paymentMethod = 'GCASH',
}) {
  // Determine allowed payment methods based on customer's choice
  let paymentMethods = ['GCASH', 'PAYMAYA', 'CREDIT_CARD', 'SHOPEEPAY', 'GRABPAY'];
  if (paymentMethod === 'GCASH') {
    paymentMethods = ['GCASH'];
  } else if (paymentMethod === 'MAYA') {
    paymentMethods = ['PAYMAYA'];
  } else if (paymentMethod === 'CARD') {
    paymentMethods = ['CREDIT_CARD'];
  }

  const stagingUrl = 'https://aura-women-clothing-mzaa2w9w2-clozer22s-projects.vercel.app';
  const currentOrigin =
    typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : stagingUrl;

  const payload = {
    external_id: orderNumber || `AC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    amount: Math.round(amount),
    payer_email: customerEmail || 'guest@aurawomen.com',
    description: `Aura Women's Clothing - Order ${orderNumber}`,
    customer: {
      given_names: customerName || 'Valued Client',
      mobile_number: customerPhone || '+639170000000',
      email: customerEmail || 'guest@aurawomen.com',
    },
    customer_notification_preference: {
      invoice_created: ['email'],
      invoice_reminder: ['email'],
      invoice_paid: ['email'],
    },
    items: items.map((item) => ({
      name: item.name || item.productName || 'Aura Clothing Item',
      quantity: item.quantity || 1,
      price: Math.round(item.price || 0),
      category: 'Apparel',
    })),
    payment_methods: paymentMethods,
    currency: 'PHP',
    success_redirect_url: `${currentOrigin}/order-confirmed?ref=${orderNumber}`,
    failure_redirect_url: `${currentOrigin}/checkout`,
  };

  const basicAuth = btoa(`${XENDIT_API_KEY}:`);

  // Direct Xendit API call (supports CORS natively with Access-Control-Allow-Origin: *)
  let response;
  try {
    response = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (directErr) {
    console.warn('Direct Xendit API call failed, attempting relative proxy:', directErr);
    response = await fetch('/api/xendit/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    console.error('Xendit Invoice Creation Failed:', errBody);
    throw new Error(errBody.message || `Xendit Error (${response.status})`);
  }

  const data = await response.json();
  if (!data.invoice_url) {
    throw new Error('Xendit did not return a valid payment invoice URL');
  }

  return {
    success: true,
    invoiceId: data.id,
    invoiceUrl: data.invoice_url,
    status: data.status,
    externalId: data.external_id,
    data,
  };
}
