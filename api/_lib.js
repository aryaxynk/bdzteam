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
  const clean = String(scope || 'quick').toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  return `BDZ-${clean}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}
function sign(payload) {
  const secret = env('ADMIN_SESSION_SECRET');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 12 })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verifySession(req) {
  const raw = req.headers.cookie || '';
  const match = raw.match(/(?:^|; )bdz_admin=([^;]+)/);
  if (!match) return null;
  const [body, sig] = match[1].split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', env('ADMIN_SESSION_SECRET')).update(body).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  return data.exp > Date.now() ? data : null;
}
function setCookie(res, token) {
  res.setHeader('Set-Cookie', `bdz_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`);
}
function clearCookie(res) {
  res.setHeader('Set-Cookie', 'bdz_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
}
async function supabaseFetch(path, options = {}) {
  const base = env('SUPABASE_URL').replace(/\/$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.message || data?.hint || `Supabase HTTP ${response.status}`);
  return data;
}
module.exports = { json, env, hash, randomKey, sign, verifySession, setCookie, clearCookie, supabaseFetch };