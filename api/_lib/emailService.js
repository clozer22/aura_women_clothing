import tls from 'tls';
import { ensureServerEnv } from './envHelper.js';

/**
 * Native, zero-dependency SMTP email delivery over TLS (Port 465).
 * Built for Vercel Serverless Functions using Aura Official Gmail credentials.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = null,
}) {
  ensureServerEnv();

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER || 'auraofficialph@gmail.com';
  const pass = (process.env.SMTP_PASS || 'ouqovyjoevrlqvvo').replace(/\s+/g, '');
  const sender = from || process.env.EMAIL_FROM || `"Aura Women's Clothing" <${user}>`;

  if (!to || !to.includes('@')) {
    throw new Error(`Invalid recipient email address: "${to}"`);
  }

  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host,
        port,
        servername: host,
        timeout: 15000,
      },
      () => {
        // Connected
      }
    );

    socket.setEncoding('utf8');

    let step = 0;
    let buffer = '';

    const sendCmd = (cmd) => {
      socket.write(cmd + '\r\n');
    };

    socket.on('data', (data) => {
      buffer += data;
      const lines = buffer.split('\r\n');
      buffer = lines.pop(); // Retain incomplete line

      for (const line of lines) {
        const code = line.slice(0, 3);
        const isCompleteReply = line.charAt(3) !== '-';

        if (!isCompleteReply) continue;

        // SMTP error codes
        if (code.startsWith('4') || code.startsWith('5')) {
          socket.end();
          return reject(new Error(`SMTP Error [${code}]: ${line}`));
        }

        if (step === 0 && code === '220') {
          step = 1;
          sendCmd('EHLO gmail.com');
        } else if (step === 1 && code === '250') {
          step = 2;
          sendCmd('AUTH LOGIN');
        } else if (step === 2 && code === '334') {
          step = 3;
          sendCmd(Buffer.from(user).toString('base64'));
        } else if (step === 3 && code === '334') {
          step = 4;
          sendCmd(Buffer.from(pass).toString('base64'));
        } else if (step === 4 && code === '235') {
          step = 5;
          sendCmd(`MAIL FROM:<${user}>`);
        } else if (step === 5 && code === '250') {
          step = 6;
          sendCmd(`RCPT TO:<${to}>`);
        } else if (step === 6 && code === '250') {
          step = 7;
          sendCmd('DATA');
        } else if (step === 7 && code === '354') {
          step = 8;
          const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@gmail.com>`;
          const dateHeader = new Date().toUTCString();

          const plainTextContent = text || (html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '');
          const htmlContent = html || `<p>${(text || '').replace(/\n/g, '<br/>')}</p>`;

          const mime = [
            `From: ${sender}`,
            `To: ${to}`,
            `Reply-To: ${sender}`,
            `Date: ${dateHeader}`,
            `Message-ID: ${messageId}`,
            `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
            'MIME-Version: 1.0',
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            'Auto-Submitted: auto-generated',
            'X-Auto-Response-Suppress: All',
            'X-Mailer: Aura Atelier Notification Engine',
            '',
            `--${boundary}`,
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            '',
            Buffer.from(plainTextContent).toString('base64'),
            '',
            `--${boundary}`,
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            '',
            Buffer.from(htmlContent).toString('base64'),
            '',
            `--${boundary}--`,
            '',
            '.',
          ].join('\r\n');
          socket.write(mime + '\r\n');
        } else if (step === 8 && code === '250') {
          step = 9;
          sendCmd('QUIT');
          resolve({ success: true, messageId: line });
        }
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('SMTP connection timed out after 15 seconds'));
    });

    socket.on('end', () => {
      if (step < 8) {
        reject(new Error('SMTP connection closed before message completion'));
      }
    });
  });
}

/**
 * Formats and dispatches a customer notification when an order is Out for Delivery.
 *
 * @param {object} order - Supabase order record
 * @returns {Promise<{ success: boolean, skipped?: boolean, error?: string }>}
 */
export async function sendOutForDeliveryEmail(order) {
  if (!order) return { success: false, error: 'Order not provided' };

  const recipientEmail = (order.customer_email || '').trim().toLowerCase();
  if (!recipientEmail || !recipientEmail.includes('@')) {
    console.warn(`[Email] Skipping Out for Delivery email: order ${order.order_reference} has no valid customer_email`);
    return { success: false, skipped: true, reason: 'No customer email' };
  }

  // Prevent duplicate sending if already notified
  const existingPayload = order.shipment_payload || {};
  if (existingPayload.out_for_delivery_notified_at) {
    console.log(`[Email] Skipping duplicate: order ${order.order_reference} was already notified at ${existingPayload.out_for_delivery_notified_at}`);
    return { success: true, skipped: true, reason: 'Already notified' };
  }

  const orderRef = order.order_reference || 'AURA-ORDER';
  const customerName = order.customer_name || 'Valued Client';
  const trackingNumber = order.tracking_number || '';
  const courierName = order.courier_name || 'J&T Express';
  const trackingUrl = trackingNumber
    ? `https://www.jtexpress.ph/trajectoryQuery?bills=${encodeURIComponent(trackingNumber)}`
    : `https://aurashophere.com/orders`;

  // Parse address
  let addressText = 'Your registered delivery address';
  if (typeof order.shipping_address === 'string') {
    addressText = order.shipping_address;
  } else if (order.shipping_address && typeof order.shipping_address === 'object') {
    const a = order.shipping_address;
    addressText = [a.street || a.address, a.barangay, a.city, a.province, a.postal_code || a.zip]
      .filter(Boolean)
      .join(', ');
  }

  const isCod = (order.payment_method || '').toUpperCase() === 'COD';
  const totalAmount = Number(order.total_amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const paymentNotice = isCod
    ? `Cash on Delivery (COD) — Please prepare exact amount of <strong>₱${totalAmount}</strong> for the rider.`
    : `Paid Online (Verified) — No additional payment needed upon delivery.`;

  // Parse items
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsListHtml = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #F0E8E5;">
        <td style="padding: 10px 0; font-size: 13px; color: #2C1E1B; font-weight: 600;">
          ${item.name || item.title || 'Atelier Garment'}
          <div style="font-size: 11px; color: #8A736E; font-weight: normal; margin-top: 2px;">
            Size: ${item.size || 'Standard'} ${item.color ? `· Color: ${item.color}` : ''} · Qty: ${item.quantity || 1}
          </div>
        </td>
        <td style="padding: 10px 0; text-align: right; font-size: 13px; color: #2C1E1B; font-weight: 600;">
          ₱${(Number(item.price || 0) * (item.quantity || 1)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Aura Order is Out for Delivery Today</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF5F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2C1E1B;">
  <!-- Inbox Hidden Preheader Preview -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #FAF5F2; opacity: 0; mso-hide: all;">
    Your handcrafted Aura garments for order #${orderRef} are officially out for doorstep delivery today via ${courierName}.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF5F2; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E8DCD7; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
          
          <!-- Brand Header -->
          <tr>
            <td style="background-color: #2C1E1B; padding: 28px 24px; text-align: center;">
              <span style="color: #FAF0EC; font-size: 24px; font-weight: 300; letter-spacing: 0.25em; text-transform: uppercase; font-family: Georgia, serif;">A U R A</span>
              <div style="color: #D99B91; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; margin-top: 6px;">Official Atelier · Salcedo Village</div>
            </td>
          </tr>

          <!-- Hero Delivery Announcement -->
          <tr>
            <td style="padding: 36px 32px 20px 32px; text-align: center;">
              <div style="display: inline-block; background-color: #FAF0EC; color: #B86B60; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; padding: 6px 14px; border: 1px solid #E8DCD7; margin-bottom: 16px;">
                Out for Delivery Today
              </div>
              <h1 style="font-size: 22px; line-height: 1.3; font-weight: 600; color: #2C1E1B; margin: 0 0 12px 0;">
                Your Package is with the Delivery Rider, ${customerName}
              </h1>
              <p style="font-size: 14px; line-height: 1.6; color: #705B56; margin: 0;">
                Great news! Your handcrafted Aura garments are officially out for doorstep delivery today via <strong>${courierName}</strong>.
              </p>
            </td>
          </tr>

          <!-- Tracking & Order Snapshot Box -->
          <tr>
            <td style="padding: 10px 32px 24px 32px;">
              <table role="presentation" width="100%" style="background-color: #FAF7F4; border: 1px solid #E8DCD7; padding: 18px 20px;">
                <tr>
                  <td style="font-size: 12px; color: #705B56; padding-bottom: 6px;">Order Reference:</td>
                  <td style="font-size: 12px; color: #2C1E1B; font-weight: 700; text-align: right; padding-bottom: 6px; font-family: monospace;">${orderRef}</td>
                </tr>
                ${
                  trackingNumber
                    ? `
                <tr>
                  <td style="font-size: 12px; color: #705B56; padding-bottom: 6px;">Waybill Tracking:</td>
                  <td style="font-size: 12px; color: #B86B60; font-weight: 700; text-align: right; padding-bottom: 6px; font-family: monospace;">${trackingNumber}</td>
                </tr>
                `
                    : ''
                }
                <tr>
                  <td style="font-size: 12px; color: #705B56; padding-bottom: 6px;">Delivery Destination:</td>
                  <td style="font-size: 12px; color: #2C1E1B; text-align: right; padding-bottom: 6px;">${addressText}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #705B56; padding-top: 8px; border-top: 1px dashed #E8DCD7;">Payment:</td>
                  <td style="font-size: 12px; color: #2C1E1B; font-weight: 600; text-align: right; padding-top: 8px; border-top: 1px dashed #E8DCD7;">
                    ${isCod ? `₱${totalAmount} (COD)` : `₱${totalAmount} (Paid)`}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          ${
            items.length > 0
              ? `
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #705B56; margin-bottom: 8px;">
                Items in This Package
              </div>
              <table role="presentation" width="100%" style="border-collapse: collapse;">
                ${itemsListHtml}
              </table>
            </td>
          </tr>
          `
              : ''
          }

          <!-- Delivery Rider Notice -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <div style="background-color: #FFF8F5; border-left: 3px solid #B86B60; padding: 14px 16px; font-size: 12px; line-height: 1.5; color: #705B56;">
                <strong>Rider Doorstep Notice:</strong><br />
                Please keep your phone active (${order.customer_phone || 'your contact number'}). The rider will call or send an SMS prior to arriving at your address. ${paymentNotice}
              </div>
            </td>
          </tr>

          <!-- Track Button -->
          <tr>
            <td style="padding: 0 32px 36px 32px; text-align: center;">
              <a href="${trackingUrl}" target="_blank" style="display: inline-block; background-color: #2C1E1B; color: #FFFFFF; font-size: 12px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; padding: 14px 28px; text-decoration: none; border: 1px solid #2C1E1B;">
                Track Live Delivery Rider →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF5F2; padding: 24px 32px; text-align: center; border-top: 1px solid #E8DCD7; font-size: 11px; color: #8A736E; line-height: 1.6;">
              This is an automated transactional update regarding your Aura Atelier order #${orderRef}.<br />
              Need help? Reach our Concierge team anytime via our live storefront chat or email <a href="mailto:auraofficialph@gmail.com" style="color: #B86B60; text-decoration: underline;">auraofficialph@gmail.com</a>.<br />
              Aura Women's Clothing · Salcedo Village, Makati City, Metro Manila, 1227 Philippines.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const plainText = [
    `AURA WOMEN'S CLOTHING - ORDER OUT FOR DELIVERY TODAY`,
    `====================================================`,
    ``,
    `Hello ${customerName},`,
    ``,
    `Great news! Your handcrafted Aura garments are officially out for doorstep delivery today via ${courierName}.`,
    ``,
    `ORDER SUMMARY:`,
    `- Order Reference: ${orderRef}`,
    trackingNumber ? `- Waybill Tracking: ${trackingNumber}` : null,
    `- Delivery Destination: ${addressText}`,
    `- Payment: ${isCod ? `₱${totalAmount} (Cash on Delivery)` : `₱${totalAmount} (Paid Online)`}`,
    `- Track Live: ${trackingUrl}`,
    ``,
    `RIDER DOORSTEP NOTICE:`,
    `Please keep your phone active (${order.customer_phone || 'your contact number'}). The delivery rider will call or send an SMS prior to arriving at your address.`,
    isCod ? `Please prepare the exact amount of ₱${totalAmount} for the rider.` : `No additional payment is needed upon delivery.`,
    ``,
    `Need help with your order?`,
    `Contact our Concierge team via storefront live chat or email auraofficialph@gmail.com.`,
    ``,
    `Aura Women's Clothing · Salcedo Village, Makati City, Metro Manila, 1227 Philippines`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const result = await sendEmail({
      to: recipientEmail,
      subject: `Your Aura Order #${orderRef} is out for delivery today`,
      html,
      text: plainText,
    });

    console.log(`[Email] Out for Delivery email successfully sent to ${recipientEmail} for order ${orderRef}`);
    return { success: true, ...result };
  } catch (err) {
    console.error(`[Email] Failed to send Out for Delivery email to ${recipientEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}
