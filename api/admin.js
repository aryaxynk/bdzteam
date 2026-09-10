const { json, env, randomKey, sign, verifySession, setCookie, clearCookie, supabaseFetch } = require('./_lib');

function body(req) { return req.body || {}; }
module.exports = async function handler(req, res) {
  try {
    if (req.method === 'POST' && req.body?.action === 'login') {
      const { username, password } = body(req);
      if (username !== env('ADMIN_USERNAME') || password !== env('ADMIN_PASSWORD')) return json(res, 401, {ok:false,error:'INVALID_LOGIN'});
      setCookie(res, sign({ sub: username }));
      return json(res, 200, {ok:true,user:username});
    }
    if (req.method === 'POST' && req.body?.action === 'logout') { clearCookie(res); return json(res, 200, {ok:true}); }
    const session = verifySession(req);
    if (!session) return json(res, 401, {ok:false,error:'UNAUTHORIZED'});

    if (req.method === 'GET') {
      const keys = await supabaseFetch('app_keys?select=id,key_code,key_scope,status,duration_hours,expires_at,telegram_user_id,telegram_username,activated_at,last_checked_at,check_count,created_at&order=created_at.desc&limit=500');
      const checks = await supabaseFetch('key_checks?select=id,key_id,key_scope,result,app_version,created_at&order=created_at.desc&limit=20');
      const users = await supabaseFetch('telegram_users?select=telegram_user_id,username,first_name,last_seen_at&order=last_seen_at.desc&limit=20');
      return json(res,200,{ok:true,user:session.sub,keys,checks,users});
    }
    if (req.method !== 'POST') return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
    const action = body(req).action;
    if (action === 'create_key') {
      const scope = body(req).scope === 'dev_ys' ? 'dev_ys' : 'quick';
      const hours = Math.max(1, Math.min(8760, Number(body(req).duration_hours || 24)));
      const keyCode = randomKey(scope);
      const created = await supabaseFetch('app_keys',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({key_code:keyCode,key_scope:scope,duration_hours:hours,expires_at:new Date(Date.now()+hours*3600000).toISOString(),status:'ACTIVE'})});
      await supabaseFetch('admin_audit',{method:'POST',body:JSON.stringify({action:'CREATE_KEY',actor:session.sub,target:keyCode,detail:{scope,hours}})});
      return json(res,200,{ok:true,key:created?.[0]||null});
    }
    if (action === 'set_status') {
      const status = ['ACTIVE','DISABLED'].includes(body(req).status) ? body(req).status : 'DISABLED';
      await supabaseFetch(`app_keys?id=eq.${Number(body(req).id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status})});
      return json(res,200,{ok:true});
    }
    if (action === 'delete_key') {
      await supabaseFetch(`app_keys?id=eq.${Number(body(req).id)}`,{method:'DELETE'});
      return json(res,200,{ok:true});
    }
    return json(res,400,{ok:false,error:'UNKNOWN_ACTION'});
  } catch (error) { console.error(error); return json(res,500,{ok:false,error:'SERVER_ERROR'}); }
};