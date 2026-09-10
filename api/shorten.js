const { json, shortenVuotLink } = require('./_lib');

const buckets = new Map();
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
}
function allowed(ip) {
  const now = Date.now();
  const item = buckets.get(ip) || { start: now, count: 0 };
  if (now - item.start >= 60000) { item.start = now; item.count = 0; }
  item.count += 1;
  buckets.set(ip, item);
  return item.count <= 20;
}
module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (!allowed(ip)) return json(res, 429, { ok: false, error: 'RATE_LIMITED' });
  try {
    const url = String(req.body?.url || '').trim();
    if (!url) return json(res, 400, { ok: false, error: 'MISSING_URL' });
    if (url.length > 4096) return json(res, 400, { ok: false, error: 'URL_TOO_LONG' });
    let parsed;
    try { parsed = new URL(url); } catch { return json(res, 400, { ok: false, error: 'INVALID_URL' }); }
    if (!['http:', 'https:'].includes(parsed.protocol)) return json(res, 400, { ok: false, error: 'INVALID_PROTOCOL' });
    const shortenedUrl = await shortenVuotLink(url);
    return json(res, 200, { ok: true, provider: 'vuotlink', shortenedUrl });
  } catch (error) {
    console.error(error);
    if (/VUOTLINK_API_TOKEN missing/i.test(String(error?.message || ''))) return json(res, 503, { ok: false, error: 'VUOTLINK_NOT_CONFIGURED' });
    return json(res, 502, { ok: false, error: 'SHORTENER_FAILED' });
  }
};