import { json } from '../src/db.js';
import { verifyTurnstileToken } from '../src/public_api.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    const out = json({ ok: false, error: 'Method Not Allowed.' }, 405, { Allow: 'POST, OPTIONS' });
    res.statusCode = out.status;
    out.headers.forEach((v, k) => res.setHeader(k, v));
    res.end();
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = body ? JSON.parse(body) : {}; } catch { body = {}; }
    }
    if (!body || typeof body !== 'object') body = {};

    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers || {})) {
      if (v != null) headers.set(k, Array.isArray(v) ? v.join(',') : String(v));
    }
    const request = new Request(`https://${String(req.headers?.host || 'localhost')}/api/site-gate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const result = await verifyTurnstileToken(
      String(body.turnstile_token || body.cf_turnstile_token || ''),
      request,
      process.env
    );

    if (!result.ok) {
      const out = json({ ok: false, error: result.message }, result.status || 403);
      res.statusCode = out.status;
      out.headers.forEach((v, k) => res.setHeader(k, v));
      res.end();
      return;
    }

    const out = json(
      { ok: true, message: 'Cloudflare verified.' },
      200,
      { 'set-cookie': 'bdz_gate=1; Path=/; Max-Age=1800; HttpOnly; Secure; SameSite=Lax' }
    );
    res.statusCode = 200;
    out.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(Buffer.from(await out.arrayBuffer()));
  } catch (error) {
    console.error('[site-gate]', error);
    const out = json({ ok: false, error: 'Không thể xác minh bảo mật lúc này. Vui lòng thử lại sau vài giây.' }, 503);
    res.statusCode = 503;
    out.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(Buffer.from(await out.arrayBuffer()));
  }
}
