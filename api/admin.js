const { json, env, randomKey, sign, verifySession, setCookie, clearCookie, supabaseFetch } = require('./_lib');

function body(req) { return req.body || {}; }
async function audit(actor, action, target, detail = {}) {
  await supabaseFetch('admin_audit', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ action, actor, target: target == null ? null : String(target), detail })
  });
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'POST' && req.body?.action === 'login') {
      const { username, password } = body(req);
      if (username !== env('ADMIN_USERNAME') || password !== env('ADMIN_PASSWORD')) {
        return json(res, 401, { ok: false, error: 'INVALID_LOGIN' });
      }
      setCookie(res, sign({ sub: username }));
      return json(res, 200, { ok: true, user: username });
    }
    if (req.method === 'POST' && req.body?.action === 'logout') {
      clearCookie(res);
      return json(res, 200, { ok: true });
    }

    const session = verifySession(req);
    if (!session) return json(res, 401, { ok: false, error: 'UNAUTHORIZED' });

    if (req.method === 'GET') {
      const [keys, checks, users, shorteners, auditRows] = await Promise.all([
        supabaseFetch('app_keys?select=id,key_code,key_scope,status,duration_hours,expires_at,telegram_user_id,telegram_username,activated_at,last_checked_at,check_count,created_at&order=created_at.desc&limit=500'),
        supabaseFetch('key_checks?select=id,key_id,key_scope,result,app_version,created_at&order=created_at.desc&limit=50'),
        supabaseFetch('telegram_users?select=telegram_user_id,username,first_name,last_name,last_seen_at,created_at&order=last_seen_at.desc&limit=100'),
        supabaseFetch('shortener_configs?select=id,provider,enabled,base_url,sort_order,updated_at&order=sort_order.asc'),
        supabaseFetch('admin_audit?select=id,action,actor,target,detail,created_at&order=created_at.desc&limit=50')
      ]);
      const tokenRows = await supabaseFetch('shortener_configs?select=provider,api_token');
      const tokenMap = Object.fromEntries((tokenRows || []).map(r => [r.provider, Boolean(r.api_token)]));
      const safeShorteners = (shorteners || []).map(s => ({ ...s, has_token: !!tokenMap[s.provider] }));
      return json(res, 200, { ok: true, user: session.sub, keys, checks, users, shorteners: safeShorteners, audit: auditRows || [] });
    }

    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
    const action = body(req).action;

    if (action === 'create_key') {
      const scope = body(req).scope === 'dev_ys' ? 'dev_ys' : 'quick';
      const hours = Math.max(1, Math.min(8760, Number(body(req).duration_hours || 24)));
      const keyCode = randomKey(scope);
      const created = await supabaseFetch('app_keys', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          key_code: keyCode,
          key_scope: scope,
          duration_hours: hours,
          expires_at: new Date(Date.now() + hours * 3600000).toISOString(),
          status: 'ACTIVE',
          max_devices: 1,
          check_count: 0
        })
      });
      await audit(session.sub, 'CREATE_KEY', keyCode, { scope, hours });
      return json(res, 200, { ok: true, key: created?.[0] || null });
    }

    if (action === 'set_status') {
      const id = Number(body(req).id);
      if (!Number.isInteger(id) || id <= 0) return json(res, 400, { ok: false, error: 'INVALID_ID' });
      const status = ['ACTIVE', 'DISABLED'].includes(body(req).status) ? body(req).status : 'DISABLED';
      await supabaseFetch(`app_keys?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status })
      });
      await audit(session.sub, 'SET_KEY_STATUS', id, { status });
      return json(res, 200, { ok: true });
    }

    if (action === 'delete_key') {
      const id = Number(body(req).id);
      if (!Number.isInteger(id) || id <= 0) return json(res, 400, { ok: false, error: 'INVALID_ID' });
      await supabaseFetch(`app_keys?id=eq.${id}`, { method: 'DELETE' });
      await audit(session.sub, 'DELETE_KEY', id);
      return json(res, 200, { ok: true });
    }

    if (action === 'save_shortener') {
      const allowed = ['link4m', 'trafficvn', 'gtraffic'];
      const provider = String(body(req).provider || '').toLowerCase();
      if (!allowed.includes(provider)) return json(res, 400, { ok: false, error: 'INVALID_PROVIDER' });
      const enabled = Boolean(body(req).enabled);
      const baseUrl = String(body(req).base_url || '').trim();
      const sortOrder = Math.max(1, Math.min(3, Number(body(req).sort_order || 1)));
      const suppliedToken = String(body(req).api_token || '').trim();
      const payload = { enabled, base_url: baseUrl || null, sort_order: sortOrder, updated_at: new Date().toISOString() };
      if (suppliedToken) payload.api_token = suppliedToken;
      await supabaseFetch(`shortener_configs?provider=eq.${encodeURIComponent(provider)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(payload)
      });
      await audit(session.sub, 'SAVE_SHORTENER', provider, { enabled, baseUrl, sortOrder, tokenChanged: Boolean(suppliedToken) });
      return json(res, 200, { ok: true });
    }

    return json(res, 400, { ok: false, error: 'UNKNOWN_ACTION' });
  } catch (error) {
    console.error(error);
    return json(res, 500, { ok: false, error: 'SERVER_ERROR' });
  }
};