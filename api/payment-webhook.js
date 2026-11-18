import mayaWebhookHandler from './_lib/webhooks/maya-webhook.js';
import paymongoWebhookHandler from './_lib/webhooks/paymongo-webhook.js';
import xenditWebhookHandler from './_lib/webhooks/xendit-webhook.js';

/**
 * Unified Payment Gateway Webhook Router
 * Keeps Vercel serverless function count within Hobby plan limits (<= 12)
 * while preserving /api/maya-webhook, /api/paymongo-webhook, and /api/xendit-webhook via vercel.json rewrites.
 */
export default async function handler(req, res) {
  let gateway = '';
  try {
    const url = new URL(req.url, 'http://localhost');
    gateway = (req.query?.gateway || url.searchParams.get('gateway') || '').toLowerCase().trim();
  } catch (_) {
    gateway = String(req.query?.gateway || '').toLowerCase().trim();
  }

  // Fallback header/payload auto-detection if invoked directly at /api/payment-webhook
  if (!gateway) {
    if (req.headers['paymongo-signature']) {
      gateway = 'paymongo';
    } else if (req.headers['x-callback-token'] || req.headers['x-webhook-token']) {
      gateway = 'xendit';
    } else {
      const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
      if (body?.data?.attributes?.type || body?.data?.type === 'event') {
        gateway = 'paymongo';
      } else if (body?.requestReferenceNumber || body?.checkoutId) {
        gateway = 'maya';
      } else if (body?.external_id) {
        gateway = 'xendit';
      }
    }
  }

  if (gateway === 'maya') {
    return mayaWebhookHandler(req, res);
  }
  if (gateway === 'paymongo') {
    return paymongoWebhookHandler(req, res);
  }
  if (gateway === 'xendit') {
    return xenditWebhookHandler(req, res);
  }

  return res.status(400).json({ error: 'Unknown or missing payment gateway webhook target.' });
}
