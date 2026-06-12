export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ error: 'Stripe key not configured' });
  const origin = req.headers.origin || `https://${req.headers.host}`;
  const email = req.body.email || undefined;
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{
        // Product: "ApplyU for Counselors", $29/month, recurring
        price: 'price_1ThYT5DFWfd6FvgQMV9ksz19',
        quantity: 1,
      }],
      success_url: `${origin}/?counselor=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      metadata: { plan: 'counselor_monthly' },
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe counselor checkout error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
