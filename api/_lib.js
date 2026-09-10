const crypto = require('node:crypto');

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(body));
}
function env(name, required = true) {
  const value = process.env[name];
  if (required && !value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}
function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}
function randomKey(scope) {
  const clean = String(scope || 'quick').toLowerCase() === 'dev' ? 'DEV' : 'QUICK';
  return `BDZ-${clean}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}
function randomClaimToken() {
  return crypto.randomBytes(18).toString('base64url');
}
function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function sign(payload) {
  const secret = env('ADMIN_SESSION_SECRET');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 12 })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verifySession(req) {
  try {
    const raw = req.headers.cookie || '';
    const match = raw.match(/(?:^|; )bdz_admin=([^;]+)/);
    if (!match) return null;
    const [body, sig] = match[1].split('.');
    if (!body || !sig) return null;
    const expected = crypto.createHmac('sha256', env('ADMIN_SESSION_SECRET')).update(body).digest('base64url');
    if (!safeEqual(sig, expected)) return null;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return Number(data.exp) > Date.now() ? data : null;
  } catch { return null; }
}
function setCookie(res, token) { res.setHeader('Set-Cookie', `bdz_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`); }
function clearCookie(res) { res.setHeader('Set-Cookie', 'bdz_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'); }
function firstIp(req) { return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null; }
async function supabaseFetch(path, options = {}) {
  const base = env('SUPABASE_URL').replace(/\/$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${base}/rest/v1/${path}`, { ...options, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const text = await response.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.message || data?.hint || `Supabase HTTP ${response.status}`);
  return data;
}
async function createKey(scope = 'quick', telegramUser = null, durationHours = null) {
  const cleanScope = String(scope).toLowerCase() === 'dev' ? 'dev' : 'quick';
  const fallback = 24;
  const configuredHours = cleanScope === 'dev' ? process.env.DEV_KEY_HOURS : process.env.QUICK_KEY_HOURS;
  const hours = Math.max(1, Math.min(8760, Number(durationHours || configuredHours || fallback)));
  const now = new Date();
  const payload = { key_code: randomKey(cleanScope), key_scope: cleanScope, status: 'ACTIVE', duration_hours: hours, expires_at: new Date(now.getTime() + hours * 3600000).toISOString(), max_devices: 1, check_count: 0, telegram_user_id: telegramUser?.id ?? null, telegram_username: telegramUser?.username || null };
  const rows = await supabaseFetch('app_keys', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
  if (telegramUser?.id != null) await supabaseFetch('telegram_users', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ telegram_user_id: telegramUser.id, username: telegramUser.username || null, first_name: telegramUser.first_name || null, last_name: telegramUser.last_name || null, last_seen_at: now.toISOString() }) });
  return rows?.[0] || payload;
}
async function createClaimToken(telegramUser, scope = 'quick', ttlMinutes = 15) {
  const raw = randomClaimToken();
  const cleanScope = String(scope).toLowerCase() === 'dev' ? 'dev' : 'quick';
  const expiresAt = new Date(Date.now() + Math.max(1, Math.min(60, Number(ttlMinutes) || 15)) * 60000).toISOString();
  const payload = { token_hash: hash(raw), telegram_user_id: telegramUser?.id ?? null, telegram_username: telegramUser?.username || null, scope: cleanScope, status: 'PENDING', expires_at: expiresAt };
  const rows = await supabaseFetch('key_claim_tokens', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
  return { raw, row: rows?.[0] || payload };
}
async function getClaimToken(rawToken) {
  const tokenHash = hash(String(rawToken || '').trim());
  if (!tokenHash) return null;
  const rows = await supabaseFetch(`key_claim_tokens?token_hash=eq.${encodeURIComponent(tokenHash)}&select=*&limit=1`);
  return rows?.[0] || null;
}
async function reserveClaimToken(rawToken, telegramUserId) {
  const tokenHash = hash(String(rawToken || '').trim());
  const now = new Date();
  const item = await getClaimToken(rawToken);
  if (!item) return { ok: false, reason: 'TOKEN_NOT_FOUND' };
  if (item.status !== 'PENDING') return { ok: false, reason: item.status === 'EXPIRED' ? 'TOKEN_EXPIRED' : 'TOKEN_ALREADY_USED' };
  if (item.expires_at && new Date(item.expires_at) <= now) {
    await supabaseFetch(`key_claim_tokens?id=eq.${Number(item.id)}&status=eq.PENDING`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'EXPIRED' }) });
    return { ok: false, reason: 'TOKEN_EXPIRED' };
  }
  if (item.telegram_user_id != null && String(item.telegram_user_id) !== String(telegramUserId)) return { ok: false, reason: 'TOKEN_OWNER_MISMATCH' };
  const rows = await supabaseFetch(`key_claim_tokens?id=eq.${Number(item.id)}&status=eq.PENDING&token_hash=eq.${encodeURIComponent(tokenHash)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'USED', used_at: now.toISOString() }) });
  if (!rows?.[0]) return { ok: false, reason: 'TOKEN_ALREADY_USED' };
  return { ok: true, row: rows[0] };
}
async function cancelClaimToken(id) {
  if (!Number.isInteger(Number(id)) || Number(id) <= 0) return;
  await supabaseFetch(`key_claim_tokens?id=eq.${Number(id)}&status=eq.USED`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'PENDING', used_at: null }) });
}
async function fetchKeyByCode(keyCode) {
  const code = encodeURIComponent(String(keyCode || '').trim());
  if (!code) return null;
  const rows = await supabaseFetch(`app_keys?key_code=eq.${code}&select=*&limit=1`);
  return rows?.[0] || null;
}
async function recordCheck(item, result, deviceHash, req, appVersion) {
  await supabaseFetch('key_checks', { method: 'POST', body: JSON.stringify({ key_id: item.id, key_scope: item.key_scope, device_id_hash: deviceHash, ip_address: firstIp(req), result, app_version: String(appVersion || '').slice(0, 80) || null }) });
}
async function shortenVuotLink(longUrl) {
  const config = (await supabaseFetch('shortener_configs?provider=eq.vuotlink&select=enabled,base_url,api_token&limit=1'))?.[0];
  const token = String(process.env.VUOTLINK_API_TOKEN || config?.api_token || '').trim();
  if (!token) throw new Error('VUOTLINK_API_TOKEN missing');
  if (config && config.enabled === false) throw new Error('VuotLink đang tắt');
  const base = String(process.env.VUOTLINK_BASE_URL || config?.base_url || 'https://vuotlink.xyz/api').replace(/\/$/, '');
  const endpoint = `${base}?api=${encodeURIComponent(token)}&url=${encodeURIComponent(longUrl)}`;
  const response = await fetch(endpoint, { method: 'GET', headers: { Accept: 'application/json' } });
  const text = await response.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(`VuotLink HTTP ${response.status}`);
  const shortenedUrl = data?.shortenedUrl || data?.shortened_url || data?.url || '';
  if (String(data?.status || '').toLowerCase() !== 'success' || !shortenedUrl) throw new Error('VuotLink trả về dữ liệu không hợp lệ');
  return String(shortenedUrl);
}
module.exports = { json, env, hash, randomKey, randomClaimToken, safeEqual, sign, verifySession, setCookie, clearCookie, firstIp, supabaseFetch, createKey, createClaimToken, getClaimToken, reserveClaimToken, cancelClaimToken, fetchKeyByCode, recordCheck, shortenVuotLink };