/**
 * Secure Payment Gateway Client Service
 * Initiates order checkout via server-side Serverless Function.
 * Eliminates client-side secret API keys and prevents price tampering.
 */

/**
 * Creates a verified Xendit Invoice through the secure serverless API
 * @param {Object} params
 * @param {Object} params.customer - { fullName, email, phone }
 * @param {Object} params.shippingAddress - { street, region, province, city, barangay, zipCode, country }
 * @param {Array} params.items - Array of { id, quantity, size, color }
 * @param {string} params.paymentMethod - 'GCASH' | 'MAYA' | 'CARD'
 * @param {string} [params.userId] - Optional authenticated user ID
 */
export async function createSecureOrderInvoice({
  customer,
  shippingAddress,
  items = [],
  paymentMethod = 'GCASH',
  userId = null,
}) {
  const payload = {
    customer,
    shippingAddress,
    items,
    paymentMethod,
    userId,
  };

  const response = await fetch('/api/create-order-invoice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('Secure invoice creation error:', data);
    throw new Error(data.error || `Payment gateway error (${response.status})`);
  }

  if (!data.invoiceUrl) {
    throw new Error('Payment gateway did not return a valid checkout URL.');
  }

  return {
    success: true,
    invoiceId: data.invoiceId,
    invoiceUrl: data.invoiceUrl,
    orderReference: data.orderReference,
    totalAmount: data.totalAmount,
    order: data.order,
  };
}

/**
 * Backward compatibility wrapper
 */
export async function createXenditInvoice(params) {
  // If called with old parameter structure, adapt to secure signature
  const customer = params.customer || {
    fullName: params.customerName || 'Valued Client',
    email: params.customerEmail || '',
    phone: params.customerPhone || '',
  };

  const shippingAddress = params.shippingAddress || {
    street: params.street || 'Address on file',
    city: params.city || 'Metro Manila',
    country: 'Philippines',
  };

  return createSecureOrderInvoice({
    customer,
    shippingAddress,
    items: params.items || [],
    paymentMethod: params.paymentMethod || 'GCASH',
    userId: params.userId || null,
  });
}
