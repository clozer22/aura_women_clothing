/**
 * Meta Pixel (Facebook & Instagram Ads) Tracking Utility
 * Safely wraps window.fbq to report high-value e-commerce conversions,
 * purchases, add to bag, page views, and user interactions back to Meta Events Manager.
 */

export const META_PIXEL_ID =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_META_PIXEL_ID) ||
  '1085691247638194';

/**
 * Safe invocation of window.fbq
 */
function fbqSafe(...args) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    try {
      window.fbq(...args);
      if (import.meta.env?.DEV) {
        console.debug('📊 [Meta Pixel]', ...args);
      }
    } catch (err) {
      console.warn('[Meta Pixel] Error executing fbq:', err);
    }
  }
}

/**
 * Fires standard 'PageView' event
 * @param {string} [pageName] Optional page descriptor
 */
export function trackPageView(pageName) {
  if (pageName) {
    fbqSafe('track', 'PageView', { page_name: pageName });
  } else {
    fbqSafe('track', 'PageView');
  }
}

/**
 * Normalizes price strings or numbers (e.g. '₱1,200', '1200', 1200) into a valid float
 */
function parseNumericPrice(val) {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Fires 'ViewContent' when a client inspects a garment / product modal
 * @param {Object} product - { id, name, price, category }
 */
export function trackViewContent(product) {
  if (!product) return;
  fbqSafe('track', 'ViewContent', {
    content_name: product.name || 'Garment',
    content_ids: [String(product.id || '')],
    content_type: 'product',
    content_category: product.category || 'Apparel',
    value: parseNumericPrice(product.price),
    currency: 'PHP',
  });
}

/**
 * Fires 'AddToCart' when a customer adds an item to bag
 * @param {Object} item - { id, name, price, quantity, size, color }
 */
export function trackAddToCart(item) {
  if (!item) return;
  const unitPrice = parseNumericPrice(item.price);
  const qty = Number(item.quantity) || 1;

  fbqSafe('track', 'AddToCart', {
    content_name: item.name || 'Garment',
    content_ids: [String(item.id || item.productId || '')],
    content_type: 'product',
    value: unitPrice * qty,
    currency: 'PHP',
    num_items: qty,
    size: item.size || 'Standard',
    color: item.color || 'Standard',
  });
}

/**
 * Fires 'InitiateCheckout' when customer enters checkout
 * @param {Array|Object} items - Product or list of products
 * @param {number|string} totalAmount - Total payable amount
 */
export function trackInitiateCheckout(items = [], totalAmount = 0) {
  const itemList = Array.isArray(items) ? items : [items];
  const contentIds = itemList.map((i) => String(i.id || i.productId || ''));
  const contents = itemList.map((i) => ({
    id: String(i.id || i.productId || ''),
    quantity: Number(i.quantity) || 1,
    item_price: parseNumericPrice(i.price),
  }));

  const parsedTotal =
    parseNumericPrice(totalAmount) ||
    contents.reduce((sum, item) => sum + item.item_price * item.quantity, 0);

  const payload = {
    content_ids: contentIds,
    contents,
    content_type: 'product',
    num_items: itemList.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0),
    value: parsedTotal,
    currency: 'PHP',
  };

  if (itemList.length === 1 && itemList[0]?.name) {
    payload.content_name = itemList[0].name;
  }

  fbqSafe('track', 'InitiateCheckout', payload);
}

/**
 * Fires 'Purchase' when an order is confirmed & placed
 * @param {Object} order - Order record { order_reference, total_amount, items, payment_method }
 */
export function trackPurchase(order) {
  if (!order) return;
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const contentIds = orderItems.map((i) => String(i.id || ''));

  fbqSafe('track', 'Purchase', {
    content_name: `Aura Order ${order.order_reference || ''}`,
    content_ids: contentIds,
    content_type: 'product',
    value: parseNumericPrice(order.total_amount || order.totalAmount),
    currency: 'PHP',
    num_items: orderItems.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0) || 1,
    order_id: order.order_reference || String(order.id || ''),
    payment_method: order.payment_method || 'Online',
  });
}

/**
 * Fires 'Lead' when client submits contact inquiry or registers
 * @param {string} source - Source form (e.g. 'Contact Form Inquiry', 'VIP Registration')
 * @param {Object} [details] - Optional extra metadata
 */
export function trackLead(source = 'Website Inquiry', details = {}) {
  fbqSafe('track', 'Lead', {
    content_name: source,
    ...details,
  });
}

/**
 * Fires custom tracking event
 * @param {string} eventName
 * @param {Object} [params]
 */
export function trackCustomEvent(eventName, params = {}) {
  fbqSafe('trackCustom', eventName, params);
}
