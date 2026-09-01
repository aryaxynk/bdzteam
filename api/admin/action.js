import { adminAction, requireAdmin } from '../../src/admin_api.js';
import { json, sb } from '../../src/db.js';

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

    const body = await request.clone().json().catch(() => ({}));
    if (String(body.action || '') === 'create_key_with_limit') {
      let code = String(body.key_code || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      if (!code) code = 'BDZ-' + crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
      const productId = Number(body.product_id);
      const hours = Math.max(1, Math.min(720, Number(body.duration_hours || 10)));
      let maxDevices = Number(body.max_devices);
      if (!Number.isFinite(maxDevices) || maxDevices < 0) maxDevices = 1;
      maxDevices = Math.min(1000, Math.floor(maxDevices));
      const product = (await sb(env, 'products?id=eq.' + productId + '&select=id,name,slug&limit=1').catch(() => []))?.[0];
      if (!product) {
        const r = json({ ok: false, error: 'Sản phẩm không hợp lệ.' }, 400);
        res.statusCode = r.status; r.headers.forEach((v, k) => res.setHeader(k, v));
        return res.end(Buffer.from(await r.arrayBuffer()));
      }
      const exists = await sb(env, 'keys?select=id&key_code=eq.' + encodeURIComponent(code) + '&limit=1').catch(() => []);
      if (exists?.length) {
        const r = json({ ok: false, error: 'Key đã tồn tại.' }, 409);
        res.statusCode = r.status; r.headers.forEach((v, k) => res.setHeader(k, v));
        return res.end(Buffer.from(await r.arrayBuffer()));
      }
      const expires = new Date(Date.now() + hours * 3600000).toISOString();
      const created = await sb(env, 'keys', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ key_code: code, product_id: productId, duration_hours: hours, status: 'ACTIVE', expires_at: expires, key_scope: 'ADMIN', max_devices: maxDevices, claimed_ip: null, claimed_at: null }) });
      const row = Array.isArray(created) ? created[0] : null;
      if (!row) {
        const r = json({ ok: false, error: 'Không thể tạo Key.' }, 500);
        res.statusCode = r.status; r.headers.forEach((v, k) => res.setHeader(k, v));
        return res.end(Buffer.from(await r.arrayBuffer()));
      }
      const r = json({ ok: true, key_code: code, key_id: row.id, max_devices: maxDevices, product });
      res.statusCode = r.status; r.headers.forEach((v, k) => res.setHeader(k, v));
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
