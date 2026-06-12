export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const supabaseHeaders = () => ({
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  });
  let event;
  try {
    event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch(e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  // Counselor (or any recurring) subscription canceled/expired — revoke counselor access
  if (event.type === 'customer.subscription.deleted' ||
      (event.type === 'customer.subscription.updated' && ['canceled', 'unpaid', 'incomplete_expired'].includes(event.data.object.status))) {
    const customerId = event.data.object.customer;
    if (customerId) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?stripe_customer_id=eq.${customerId}`, {
        method: 'PATCH',
        headers: { ...supabaseHeaders(), 'Prefer': 'return=minimal' },
        body: JSON.stringify({ is_counselor: false }),
      });
      console.log('Set is_counselor=false for customer', customerId);
    }
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.payment_status === 'paid' && session.customer_email) {
      const email = session.customer_email;
      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        }
      });
      const userData = await userRes.json();
      const userId = userData.users && userData.users[0] && userData.users[0].id;
      if (userId) {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
          method: 'PATCH',
          headers: { ...supabaseHeaders(), 'Prefer': 'return=minimal' },
          body: JSON.stringify({ is_pro: true }),
        });
        console.log('Set is_pro=true for', email);
      }
    }
  }
  return res.status(200).json({ received: true });
}
