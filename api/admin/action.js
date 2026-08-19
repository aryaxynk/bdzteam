import { adminAction, requireAdmin } from '../../src/admin_api.js';
import { json } from '../../src/db.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    }

    const env = process.env;
    const request = new Request(`https://${req.headers.host || 'localhost'}${req.url || '/api/admin/action'}`, {
      method: req.method,
      headers: Object.entries(req.headers || {}).reduce((h, [k, v]) => {
        if (v != null) h.set(k, Array.isArray(v) ? v.join(',') : String(v));
        return h;
      }, new Headers()),
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})
    });

    const session = await requireAdmin(request, env);
    if (!session) {
      const r = json({ ok: false, error: 'Chưa đăng nhập quản trị.' }, 401);
      res.statusCode = r.status;
      r.headers.forEach((v, k) => res.setHeader(k, v));
      return res.end(Buffer.from(await r.arrayBuffer()));
    }

    const r = await adminAction(request, env, session);
    res.statusCode = r.status;
    r.headers.forEach((v, k) => res.setHeader(k, v));
    return res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: e?.message || 'Lỗi máy chủ.' }));
  }
}
