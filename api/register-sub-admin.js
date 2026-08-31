import { registerSubAdmin } from '../src/sub_admin_register.js';

export default async function handler(req, res) {
  try {
    const request = new Request(`https://${req.headers.host || 'localhost'}${req.url || '/api/register-sub-admin'}`, {
      method: req.method,
      headers: Object.entries(req.headers || {}).reduce((h, [k, v]) => {
        if (v != null) h.set(k, Array.isArray(v) ? v.join(',') : String(v));
        return h;
      }, new Headers()),
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})
    });
    const r = await registerSubAdmin(request, process.env);
    res.statusCode = r.status;
    r.headers.forEach((v, k) => res.setHeader(k, v));
    return res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: e?.message || 'Lỗi máy chủ.' }));
  }
}
