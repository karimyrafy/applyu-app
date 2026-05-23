const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function supabaseHeaders(useServiceKey = false) {
  return {
    'Content-Type': 'application/json',
    'apikey': useServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${useServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY}`,
  };
}

async function getProfile(userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=id,email,is_pro,stripe_customer_id,created_at`,
    { headers: supabaseHeaders(true) }
  );
  const rows = await res.json();
  return rows[0] || null;
}

async function handleSignup(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) { console.error('Signup error:', data); return { error: data.error_description || data.msg || 'Signup failed' }; }

  const user = data.user;
  const session = data.session;
  const profile = user ? await getProfile(user.id) : null;
  return { user: { ...user, ...profile }, session };
}

async function handleLogin(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error_description || data.msg || 'Login failed' };

  const user = data.user;
  const session = { access_token: data.access_token, refresh_token: data.refresh_token, expires_in: data.expires_in };
  const profile = user ? await getProfile(user.id) : null;
  return { user: { ...user, ...profile }, session };
}

async function handleLogout(accessToken) {
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: { ...supabaseHeaders(), 'Authorization': `Bearer ${accessToken}` },
  });
  return { success: true };
}

async function handleGetUser(accessToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { ...supabaseHeaders(), 'Authorization': `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error_description || data.msg || 'Not authenticated' };

  const profile = await getProfile(data.id);
  return { user: { ...data, ...profile } };
}

async function handleSetPro(accessToken) {
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { ...supabaseHeaders(), 'Authorization': `Bearer ${accessToken}` },
  });
  const userData = await userRes.json();
  if (!userRes.ok) return { error: userData.error_description || userData.msg || 'Not authenticated' };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userData.id}`, {
    method: 'PATCH',
    headers: { ...supabaseHeaders(true), 'Prefer': 'return=minimal' },
    body: JSON.stringify({ is_pro: true }),
  });
  if (!res.ok) return { error: 'Failed to update pro status' };
  return { success: true };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, email, password } = req.body || {};
  const accessToken = (req.headers.authorization || '').replace('Bearer ', '');

  try {
    let result;
    switch (action) {
      case 'signup':
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
        result = await handleSignup(email, password);
        break;
      case 'login':
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
        result = await handleLogin(email, password);
        break;
      case 'logout':
        if (!accessToken) return res.status(400).json({ error: 'Access token required' });
        result = await handleLogout(accessToken);
        break;
      case 'getUser':
        if (!accessToken) return res.status(400).json({ error: 'Access token required' });
        result = await handleGetUser(accessToken);
        break;
      case 'setPro':
        if (!accessToken) return res.status(400).json({ error: 'Access token required' });
        result = await handleSetPro(accessToken);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    if (result.error) return res.status(401).json({ error: result.error });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
