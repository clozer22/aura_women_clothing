/**
 * Meta Pixel (Facebook & Instagram Ads) Tracking Utility
 * Safely wraps window.fbq to report visitors, content views,
 * Shopee redirect intent, and inquiries back to Meta Events Manager.
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
 * @param {string} [pageName] Optional page/view descriptor
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
 * Fires 'InitiateCheckout' when a customer clicks "Buy Here" / Shopee Redirect
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
 * Fires 'Lead' when client submits contact inquiry or lead form
 * @param {string} source - Source form (e.g. 'Contact Form Inquiry')
 * @param {Object} [details] - Optional extra metadata
 */
export function trackLead(source = 'Website Inquiry', details = {}) {
  fbqSafe('track', 'Lead', {
    content_name: source,
    ...details,
  });
}

/**
 * Fires custom tracking event (e.g. OutboundShopeeClick)
 * @param {string} eventName
 * @param {Object} [params]
 */
export function trackCustomEvent(eventName, params = {}) {
  fbqSafe('trackCustom', eventName, params);
}
