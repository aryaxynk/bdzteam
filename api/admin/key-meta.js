import { requireAdmin } from '../../src/admin_api.js';
import { sb, json } from '../../src/db.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    }
    const request = new Request(`https://${req.headers.host || 'localhost'}${req.url || '/api/admin/key-meta'}`, {
      method: req.method,
      headers: Object.entries(req.headers || {}).reduce((h, [k, v]) => { if (v != null) h.set(k, Array.isArray(v) ? v.join(',') : String(v)); return h; }, new Headers())
    });
    const session = await requireAdmin(request, process.env);
    if (!session) {
      const r = json({ ok: false, error: 'Chưa đăng nhập quản trị.' }, 401);
      res.statusCode = r.status;
      r.headers.forEach((v, k) => res.setHeader(k, v));
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    const rows = await sb(process.env, 'keys?select=id,key_code,product_id,products(name,slug)&order=id.desc&limit=1000');
    const data = (rows || []).map(k => ({
      id: k.id,
      key_code: k.key_code,
      product_id: k.product_id,
      product: k.products?.name || null,
      slug: k.products?.slug || null
    }));
    const r = json({ ok: true, keys: data }, 200, { 'cache-control': 'no-store' });
    res.statusCode = r.status;
    r.headers.forEach((v, k) => res.setHeader(k, v));
    return res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: e?.message || 'Lỗi máy chủ.' }));
  }
}
