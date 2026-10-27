# J&T Express Philippines Open API Integration Reference

This technical reference provides exact specifications, signature algorithms, payload schemas, and Node.js implementation patterns for integrating the J&T Express Philippines Open API into the Aura Women's Clothing platform.

---

## 1. Authentication & Protocol Overview

J&T Express Philippines uses an Open Platform API with digital signature verification on every request.

* **HTTP Method**: `POST`
* **Content-Type**: `multipart/form-data` or `application/x-www-form-urlencoded`
* **Form Fields Required**:
  1. `logistics_interface`: Serialized JSON payload containing order, sender, receiver, and item details.
  2. `data_digest`: Base64-encoded MD5 digital signature of (`logistics_interface + API_KEY`).
  3. `msg_type`: API action type (e.g. `ORDERCREATE`, `ORDERTRACK`, `ORDERPRINT`).
  4. `eccompanyid`: Your merchant / e-commerce account code assigned by J&T Express.

---

## 2. Environment Endpoints & Credentials

When J&T Express account managers release test keys, they typically provide:
1. **`eccompanyid`**: e.g., `AURA_PH_TEST` or VIP customer ID
2. **`customerid`**: VIP account number (linked to billing & branch pickup)
3. **`key` / API Secret**: Private salt string used for digital digest calculation
4. **Endpoint URL**: Sandbox test server vs Production server

### Environment Variables (.env)
```env
# J&T Express Direct API Configuration
JT_EXPRESS_TEST_MODE=true
JT_EXPRESS_ECCOMPANY_ID=YOUR_ECCOMPANY_ID_HERE
JT_EXPRESS_CUSTOMER_ID=YOUR_CUSTOMER_ID_HERE
JT_EXPRESS_API_KEY=YOUR_JT_SECRET_API_KEY_HERE
JT_EXPRESS_BASE_URL=https://test-api.jtexpress.ph/jts-ph-openplatform-api
# Production URL (when verified by J&T):
# JT_EXPRESS_BASE_URL=https://api.jtexpress.ph/jts-ph-openplatform-api
```

---

## 3. Digital Signature Algorithm (`data_digest`)

J&T requires validating data integrity by appending the private API key to the raw JSON string, computing an MD5 hash, and converting to Base64.

### Formula
$$\text{data\_digest} = \text{base64}(\text{md5}(\text{logistics\_interface} + \text{key}))$$

### Node.js Implementation
```javascript
import crypto from 'crypto';

export function generateJtDigest(jsonString, apiKey) {
  // 1. Concatenate JSON payload string with the private key
  const combined = jsonString + apiKey;
  
  // 2. Compute MD5 in binary/raw form and encode to Base64
  return crypto.createHash('md5').update(combined, 'utf8').digest('base64');
}
```

---

## 4. Order Create Payload Schema (`msg_type: "ORDERCREATE"`)

```json
{
  "eccompanyid": "AURA_PH_TEST",
  "customerid": "YOUR_CUSTOMER_ID",
  "txlogisticid": "AC-982142",
  "ordertype": "1",
  "servicetype": "1",
  "deliverytype": "1",
  "createordertime": "2026-10-17 14:30:00",
  "sendstarttime": "2026-10-18 09:00:00",
  "sendendtime": "2026-10-18 18:00:00",
  "sender": {
    "name": "Aura Atelier Dispatch",
    "phone": "09171234567",
    "mobile": "09171234567",
    "prov": "Metro Manila",
    "city": "Makati City",
    "area": "Bel-Air",
    "address": "108 Atelier Blvd, Salcedo Village"
  },
  "receiver": {
    "name": "Maria Clarisse Santos",
    "phone": "09175548821",
    "mobile": "09175548821",
    "prov": "Metro Manila",
    "city": "Taguig",
    "area": "Bonifacio Global City",
    "address": "Unit 12B Horizon Residences"
  },
  "weight": "0.50",
  "itemsvalue": "480.00",
  "totalquantity": 1,
  "is_cod": 1,
  "collection_money": "480.00",
  "remark": "Handle with care - Aura Women Luxury Garments",
  "items": [
    {
      "itemname": "The Monogram Silk Trench (Warm Rose Taupe / S-M)",
      "number": 1,
      "itemvalue": "480.00",
      "desc": "AURA-TRENCH-ROSE-M"
    }
  ]
}
```

### Key Field Rules
* **`txlogisticid`**: Must be the unique store order reference (e.g. `AC-XXXXXX`). Idempotent—calling again with the same `txlogisticid` returns the existing tracking number.
* **`is_cod`**: `1` for Cash on Delivery; `0` for prepaid (GCash, Maya, Card).
* **`collection_money`**: The exact amount J&T rider must collect from the buyer if `is_cod = 1`. If prepaid, set to `0.00`.
* **`weight`**: Total parcel weight in kilograms (minimum `0.50` kg).
* **`prov` / `city` / `area`**: Philippine province, municipality/city, and barangay. Must align with standard Philippine PSGC geographic names.

---

## 5. API Dispatcher Implementation Pattern

```javascript
import fetch from 'node-fetch';
import { generateJtDigest } from './jt-crypto.js';

export async function bookJtExpressOrder(order) {
  const isTest = process.env.JT_EXPRESS_TEST_MODE !== 'false';
  const eccompanyid = process.env.JT_EXPRESS_ECCOMPANY_ID;
  const customerid = process.env.JT_EXPRESS_CUSTOMER_ID;
  const apiKey = process.env.JT_EXPRESS_API_KEY;
  const baseUrl = process.env.JT_EXPRESS_BASE_URL;

  if (!apiKey || !eccompanyid) {
    throw new Error('J&T Express API credentials missing from environment.');
  }

  const isCod = order.payment_method === 'COD';
  const orderTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const payload = {
    eccompanyid,
    customerid,
    txlogisticid: order.order_reference,
    ordertype: "1",
    servicetype: "1",
    deliverytype: "1",
    createordertime: orderTime,
    sender: {
      name: process.env.SHIPMATES_SENDER_NAME || 'Aura Atelier Dispatch',
      phone: process.env.SHIPMATES_SENDER_PHONE || '09171234567',
      mobile: process.env.SHIPMATES_SENDER_PHONE || '09171234567',
      prov: 'Metro Manila',
      city: 'Makati City',
      area: 'Bel-Air',
      address: '108 Atelier Blvd, Salcedo Village'
    },
    receiver: {
      name: order.customer_name,
      phone: order.customer_phone,
      mobile: order.customer_phone,
      prov: order.shipping_address?.province || 'Metro Manila',
      city: order.shipping_address?.city || 'Makati City',
      area: order.shipping_address?.barangay || 'San Lorenzo',
      address: order.shipping_address?.street || 'Customer Address'
    },
    weight: "0.50",
    itemsvalue: String(order.total_amount),
    totalquantity: Array.isArray(order.items) ? order.items.reduce((s, i) => s + (i.quantity || 1), 0) : 1,
    is_cod: isCod ? 1 : 0,
    collection_money: isCod ? String(order.total_amount) : "0.00",
    remark: "Aura Luxury Apparel",
    items: (order.items || []).map(i => ({
      itemname: `${i.name || i.product_name} (${i.size || i.variation || 'Standard'})`,
      number: i.quantity || 1,
      itemvalue: String(i.price || 0),
      desc: i.id || ''
    }))
  };

  const jsonString = JSON.stringify(payload);
  const dataDigest = generateJtDigest(jsonString, apiKey);

  const formData = new URLSearchParams();
  formData.append('logistics_interface', jsonString);
  formData.append('data_digest', dataDigest);
  formData.append('msg_type', 'ORDERCREATE');
  formData.append('eccompanyid', eccompanyid);

  const res = await fetch(`${baseUrl}/order/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString()
  });

  const responseData = await res.json();
  
  // Parse response item
  const itemResult = responseData?.responseitems?.[0];
  if (!itemResult || itemResult.success !== 'true') {
    throw new Error(itemResult?.reason || responseData?.reason || 'Failed to book with J&T Express');
  }

  return {
    success: true,
    trackingNumber: itemResult.billcode, // e.g. JT1234567890
    sortingCode: itemResult.code,       // e.g. MNL-01
    dispatchSite: itemResult.dispatchSite,
    waybillUrl: `${baseUrl}/order/print?billcode=${itemResult.billcode}&eccompanyid=${eccompanyid}`
  };
}
```

---

## 6. Waybill Printing & Status Webhooks

### Thermal Waybill (100x150mm Label)
J&T provides a direct PDF / HTML rendering endpoint or printable template via `msg_type: "ORDERPRINT"`. The returned `billcode` (tracking number) barcode is Code128 format and can also be rendered directly in the Aura Admin Order modal.

### Status Milestones
When receiving tracking updates from J&T Express Webhooks:
* `GOT`: Courier has picked up parcel from Salcedo atelier -> Set status to `SHIPPED`
* `DEPARTURE` / `ARRIVAL`: In sorting hub transit -> Status remains `SHIPPED`
* `SENDING`: Rider is out for delivery -> Set status to `TO_DELIVER`
* `SIGN`: Buyer has received item -> Set status to `DELIVERED`, payment collected if COD
* `REJECTION` / `ABNORMAL`: Failed delivery / RTS -> Set status to `FAILED_TO_DELIVER` or `RETURNED`
