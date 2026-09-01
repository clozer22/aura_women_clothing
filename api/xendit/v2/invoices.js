// Vercel Serverless Function to proxy Xendit Invoice creation
// Eliminates browser CORS restrictions on both localhost and Vercel staging/production.

export default async function handler(req, res) {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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

  const apiKey =
    process.env.VITE_XENDIT_API_KEY ||
    process.env.XENDIT_API_KEY ||
    'xnd_development_G4K4iGkpjDrzT6EQIDzZShzp7oK77GiaEhAYWPCIC4e0ROvsmVSSi2tZZKScBK';

  if (!apiKey) {
    return res.status(500).json({ error: 'Xendit API key is missing' });
  }

  const auth = Buffer.from(`${apiKey}:`).toString('base64');

  try {
    const xenditRes = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    });

    const data = await xenditRes.json();
    return res.status(xenditRes.status).json(data);
  } catch (error) {
    console.error('Xendit Vercel proxy error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
