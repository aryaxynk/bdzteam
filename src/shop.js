import { json, setting, saveSetting } from './db.js';

const KEY = 'shop_items';
const clean = (v, max = 500) => String(v ?? '').trim().slice(0, max);

export async function getShop(env) {
  const raw = await setting(env, KEY, '[]').catch(() => '[]');
  let items = [];
  try { items = JSON.parse(raw || '[]'); } catch { items = []; }
  if (!Array.isArray(items)) items = [];
  return items.map((x, i) => ({
    id: clean(x?.id || `shop-${i + 1}`, 80),
    name: clean(x?.name, 120),
    description: clean(x?.description, 500),
    price: clean(x?.price, 80),
    image_url: clean(x?.image_url, 500),
    action_url: clean(x?.action_url, 500),
    enabled: x?.enabled !== false
  })).filter(x => x.name && x.enabled);
}

export async function shopPublicHandler(req, res) {
  const env = process.env;
  return res.status(200).json({ ok: true, items: await getShop(env) });
}

export async function shopAdminHandler(req, res) {
  const { requireAdmin } = await import('./admin_api.js');
  const request = new Request(`https://${String(req.headers.host || 'localhost')}/api/admin/shop`, {
    method: req.method,
    headers: new Headers(Object.entries(req.headers || {}).filter(([, v]) => v != null).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : String(v)])),
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body || {})
  });
  const session = await requireAdmin(request, env);
  if (!session) return res.status(401).json({ ok: false, error: 'Chưa đăng nhập quản trị.' });
  if (session.r !== 'main') return res.status(403).json({ ok: false, error: 'Chỉ Admin chính được quản lý Shop.' });
  if (req.method === 'GET') return res.status(200).json({ ok: true, items: await getShop(env) });
  const b = await request.json().catch(() => ({}));
  if (String(b.action || '') !== 'save') return res.status(400).json({ ok: false, error: 'Action không hợp lệ.' });
  const items = Array.isArray(b.items) ? b.items : [];
  if (items.length > 100) return res.status(400).json({ ok: false, error: 'Shop tối đa 100 sản phẩm.' });
  const normalized = items.map((x, i) => ({
    id: clean(x?.id || `shop-${Date.now()}-${i}`, 80),
    name: clean(x?.name, 120),
    description: clean(x?.description, 500),
    price: clean(x?.price, 80),
    image_url: clean(x?.image_url, 500),
    action_url: clean(x?.action_url, 500),
    enabled: x?.enabled !== false
  })).filter(x => x.name);
  await saveSetting(env, KEY, JSON.stringify(normalized));
  return res.status(200).json({ ok: true, items: normalized });
}
