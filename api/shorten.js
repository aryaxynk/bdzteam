const { json, env, verifySession, shortenVuotLink } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  const session = verifySession(req);
  if (!session) return json(res, 401, { ok: false, error: 'UNAUTHORIZED' });

  try {
    const url = String(req.body?.url || '').trim();
    const provider = String(req.body?.provider || 'vuotlink').toLowerCase();
    if (!url) return json(res, 400, { ok: false, error: 'MISSING_URL' });
    if (url.length > 4096) return json(res, 400, { ok: false, error: 'URL_TOO_LONG' });

    let parsed;
    try { parsed = new URL(url); } catch { return json(res, 400, { ok: false, error: 'INVALID_URL' }); }
    if (!['http:', 'https:'].includes(parsed.protocol)) return json(res, 400, { ok: false, error: 'INVALID_PROTOCOL' });

    if (provider === 'vuotlink' || provider === 'default') {
      const shortenedUrl = await shortenVuotLink(url);
      return json(res, 200, { ok: true, provider: 'vuotlink', shortenedUrl });
    }

    const allowed = ['link4m', 'trafficvn', 'gtraffic'];
    if (!allowed.includes(provider)) return json(res, 400, { ok: false, error: 'INVALID_PROVIDER' });
    return json(res, 501, { ok: false, error: 'PROVIDER_ADAPTER_NOT_CONFIGURED', provider });
  } catch (error) {
    console.error(error);
    if (/VUOTLINK_API_TOKEN/.test(String(error?.message || ''))) return json(res, 503, { ok: false, error: 'VUOTLINK_NOT_CONFIGURED' });
    return json(res, 502, { ok: false, error: 'SHORTENER_FAILED' });
  }
};