const { json, env, hash, supabaseFetch } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok:false, error:'METHOD_NOT_ALLOWED' });
  try {
    const { key, scope='quick', device_id='', app_version='' } = req.body || {};
    if (!key || !device_id) return json(res, 400, { ok:false, error:'MISSING_KEY_OR_DEVICE' });
    const requestedScope = String(scope).toLowerCase();
    const rows = await supabaseFetch(`app_keys?key_code=eq.${encodeURIComponent(String(key).trim())}&select=*&limit=1`);
    const item = rows?.[0];
    const now = new Date();
    let result = 'INVALID';
    let reason = 'KEY_NOT_FOUND';
    if (item) {
      if (item.status === 'DISABLED') { result='DISABLED'; reason='KEY_DISABLED'; }
      else if (item.status === 'EXPIRED' || (item.expires_at && new Date(item.expires_at) <= now)) { result='EXPIRED'; reason='KEY_EXPIRED'; }
      else if (item.key_scope !== requestedScope) { result='SCOPE_MISMATCH'; reason='KEY_SCOPE_MISMATCH'; }
      else {
        const dh = hash(device_id);
        if (!item.activated_device_id_hash) {
          await supabaseFetch(`app_keys?id=eq.${item.id}`, { method:'PATCH', headers:{ Prefer:'return=minimal' }, body:JSON.stringify({ activated_device_id_hash:dh, device_id_hash:dh, activated_at:now.toISOString(), last_checked_at:now.toISOString(), check_count:Number(item.check_count||0)+1 }) });
          result='VALID'; reason='KEY_ACTIVATED';
        } else if (item.activated_device_id_hash !== dh) {
          result='DEVICE_MISMATCH'; reason='DEVICE_MISMATCH';
        } else {
          await supabaseFetch(`app_keys?id=eq.${item.id}`, { method:'PATCH', headers:{ Prefer:'return=minimal' }, body:JSON.stringify({ last_checked_at:now.toISOString(), check_count:Number(item.check_count||0)+1 }) });
          result='VALID'; reason='KEY_VALID';
        }
      }
      await supabaseFetch('key_checks', { method:'POST', body:JSON.stringify({ key_id:item.id, key_scope:item.key_scope, device_id_hash:hash(device_id), ip_address:req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null, result, app_version:String(app_version).slice(0,80) }) });
    }
    return json(res, 200, { ok: result === 'VALID', valid: result === 'VALID', result, reason, scope: requestedScope, expires_at:item?.expires_at || null });
  } catch (error) {
    console.error(error);
    return json(res, 500, { ok:false, error:'SERVER_ERROR' });
  }
};