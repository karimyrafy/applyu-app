const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/^﻿/, '');
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').replace(/^﻿/, '');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { collegeName, studentName, studentEmail, grade, gpa, matchPct } = req.body || {};
  if (!collegeName || !studentName || !studentEmail) {
    return res.status(400).json({ error: 'collegeName, studentName and studentEmail are required' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    // Not configured — accept the request so the UI flow still works, but log it.
    console.log('Info request (no DB configured):', { collegeName, studentName, studentEmail, grade, gpa, matchPct });
    return res.status(200).json({ success: true });
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/info_requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify([{
        college_name: collegeName,
        student_name: studentName,
        student_email: studentEmail,
        grade: grade || null,
        gpa: gpa || null,
        match_pct: matchPct || null,
      }]),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Supabase insert error:', errText);
      // Still return success to the user — the lead UX shouldn't fail visibly over a logging issue
      return res.status(200).json({ success: true, warning: 'not_persisted' });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Lead handler error:', err);
    return res.status(200).json({ success: true, warning: 'not_persisted' });
  }
}
