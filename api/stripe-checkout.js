export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ error: 'Stripe key not configured' });

  // Derive origin from request so success/cancel URLs work on any deployment
  const origin = req.headers.origin || `https://${req.headers.host}`;

  const params = new URLSearchParams({
    'mode': 'payment',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][product_data][name]': 'ApplyU Pro',
    'line_items[0][price_data][product_data][description]': 'Lifetime access — AI reports, gap analysis, essay bundle & timeline',
    'line_items[0][price_data][unit_amount]': '1900',
    'line_items[0][quantity]': '1',
    'success_url': `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    'cancel_url': `${origin}/`,
  });

  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    return res.status(200).json({ url: data.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
