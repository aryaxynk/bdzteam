const { json, hash, fetchKeyByCode, supabaseFetch, recordCheck } = require('./_lib');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function requestData(req) {
  const q = req.query || {};
  const b = req.body || {};
  return {
    key: b.key ?? q.key ?? '',
    scope: b.scope ?? q.scope ?? 'quick',
    device_id: b.device_id ?? q.device_id ?? '',
    app_version: b.app_version ?? q.app_version ?? ''
  };
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });

  try {
    const { key, scope = 'quick', device_id, app_version } = requestData(req);
    const requestedScope = String(scope).toLowerCase() === 'dev_ys' ? 'dev_ys' : 'quick';
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) return json(res, 400, { ok: false, valid: false, result: 'INVALID', reason: 'MISSING_KEY' });
    if (!device_id) return json(res, 400, { ok: false, valid: false, result: 'INVALID', reason: 'MISSING_DEVICE_ID' });

    const item = await fetchKeyByCode(normalizedKey);
    if (!item) return json(res, 200, { ok: false, valid: false, result: 'INVALID', reason: 'KEY_NOT_FOUND', scope: requestedScope, expires_at: null });

    const now = new Date();
    const deviceHash = hash(device_id);
    let result = 'INVALID';
    let reason = 'KEY_NOT_FOUND';
    let shouldCount = false;

    if (item.status === 'DISABLED') {
      result = 'DISABLED';
      reason = 'KEY_DISABLED';
    } else if (item.expires_at && new Date(item.expires_at) <= now) {
      result = 'EXPIRED';
      reason = 'KEY_EXPIRED';
    } else if (String(item.key_scope).toLowerCase() !== requestedScope) {
      result = 'SCOPE_MISMATCH';
      reason = 'KEY_SCOPE_MISMATCH';
    } else {
      const bound = item.activated_device_id_hash || item.device_id_hash || null;
      const maxDevices = Math.max(1, Number(item.max_devices || 1));
      if (!bound) {
        await supabaseFetch(`app_keys?id=eq.${Number(item.id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ activated_device_id_hash: deviceHash, device_id_hash: deviceHash, activated_at: now.toISOString(), last_checked_at: now.toISOString(), check_count: Number(item.check_count || 0) + 1, max_devices: maxDevices })
        });
        result = 'VALID';
        reason = 'KEY_ACTIVATED';
        shouldCount = true;
      } else if (bound !== deviceHash) {
        result = 'DEVICE_MISMATCH';
        reason = 'DEVICE_MISMATCH';
      } else {
        await supabaseFetch(`app_keys?id=eq.${Number(item.id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ last_checked_at: now.toISOString(), check_count: Number(item.check_count || 0) + 1 })
        });
        result = 'VALID';
        reason = 'KEY_VALID';
        shouldCount = true;
      }
    }

    await recordCheck(item, result, deviceHash, req, app_version);

    if (result === 'EXPIRED' && item.status === 'ACTIVE') {
      try {
        await supabaseFetch(`app_keys?id=eq.${Number(item.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'EXPIRED' }) });
      } catch (e) {
        console.error(e);
      }
    }

    return json(res, 200, {
      ok: result === 'VALID',
      valid: result === 'VALID',
      result,
      reason,
      key: normalizedKey,
      scope: requestedScope,
      expires_at: item.expires_at || null,
      activated: Boolean(item.activated_device_id_hash || item.device_id_hash),
      check_count: Number(item.check_count || 0) + (shouldCount ? 1 : 0)
    });
  } catch (error) {
    console.error(error);
    return json(res, 500, { ok: false, valid: false, result: 'ERROR', error: 'SERVER_ERROR' });
  }
};