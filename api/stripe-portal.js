// Creates a Stripe Billing Portal session so subscribers (e.g. Counselor plan)
// can manage or cancel their own subscription without contacting support.
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/^﻿/, '');
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').replace(/^﻿/, '');
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').replace(/^﻿/, '');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ error: 'Stripe key not configured' });

  const accessToken = (req.headers.authorization || '').replace('Bearer ', '');
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  try {
    // Look up the signed-in user's stripe_customer_id from profiles
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    const userData = await userRes.json();
    if (!userRes.ok) return res.status(401).json({ error: 'Not authenticated' });

    const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userData.id}&select=stripe_customer_id`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    const rows = await profRes.json();
    const customerId = rows[0] && rows[0].stripe_customer_id;
    if (!customerId) return res.status(400).json({ error: 'No subscription found for this account' });

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey);
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/?counselor=true`,
    });
    return res.status(200).json({ url: portal.url });
  } catch (err) {
    console.error('Stripe portal error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
