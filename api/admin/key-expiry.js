import { requireAdmin } from '../../src/admin_api.js';
import { json, sb, sameOrigin } from '../../src/db.js';

export default async function handler(req, res) {
  try {
    const request = new Request(`https://${req.headers.host || 'localhost'}${req.url || '/api/admin/key-expiry'}`, {
      method: req.method,
      headers: Object.entries(req.headers || {}).reduce((h, [k, v]) => { if (v != null) h.set(k, Array.isArray(v) ? v.join(',') : String(v)); return h; }, new Headers()),
      body: ['GET','HEAD'].includes(String(req.method || '').toUpperCase()) ? undefined : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}))
    });
    if (!sameOrigin(request)) return send(res, json({ ok:false, error:'Origin không hợp lệ.' }, 403));
    const session = await requireAdmin(request, process.env);
    if (!session) return send(res, json({ ok:false, error:'Chưa đăng nhập quản trị.' }, 401));
    if (session.r !== 'main') return send(res, json({ ok:false, error:'Bạn không có quyền sửa thời gian hết hạn.' }, 403));
    if (req.method !== 'POST') return send(res, json({ ok:false, error:'Method Not Allowed.' }, 405));
    const body = await request.json().catch(() => ({}));
    const id = Number(body.key_id);
    const expiry = String(body.expires_at || '').trim();
    if (!Number.isInteger(id) || id <= 0) return send(res, json({ ok:false, error:'Key không hợp lệ.' }, 400));
    const when = new Date(expiry);
    if (Number.isNaN(when.getTime())) return send(res, json({ ok:false, error:'Thời gian hết hạn không hợp lệ.' }, 400));
    if (when.getTime() <= Date.now()) return send(res, json({ ok:false, error:'Thời gian hết hạn mới phải ở tương lai.' }, 400));
    const rows = await sb(process.env, `keys?select=id,status& id=eq.${id}&limit=1`.replace(' ','')).catch(()=>[]);
    if (!rows?.[0]) return send(res, json({ ok:false, error:'Không tìm thấy Key.' }, 404));
    await sb(process.env, `keys?id=eq.${id}`, { method:'PATCH', headers:{ Prefer:'return=minimal' }, body:JSON.stringify({ expires_at: when.toISOString(), status: rows[0].status === 'REVOKED' ? 'REVOKED' : 'ACTIVE' }) });
    return send(res, json({ ok:true, expires_at:when.toISOString() }));
  } catch (e) {
    return send(res, json({ ok:false, error:e?.message || 'Lỗi máy chủ.' }, 500));
  }
}
function send(res, r) { res.statusCode = r.status; r.headers.forEach((v,k)=>res.setHeader(k,v)); return r.arrayBuffer().then(b=>res.end(Buffer.from(b))); }
