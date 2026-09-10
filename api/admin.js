const { json, env, randomKey, sign, verifySession, setCookie, clearCookie, supabaseFetch } = require('./_lib');
function body(req){return req.body||{}}
async function audit(actor,action,target,detail={}){await supabaseFetch('admin_audit',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({action,actor,target:target==null?null:String(target),detail})})}
function int(v,min,max,fallback){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):fallback}
module.exports=async function handler(req,res){try{
 if(req.method==='POST'&&body(req).action==='login'){const{username,password}=body(req);if(username!==env('ADMIN_USERNAME')||password!==env('ADMIN_PASSWORD'))return json(res,401,{ok:false,error:'INVALID_LOGIN'});setCookie(res,sign({sub:username}));return json(res,200,{ok:true,user:username})}
 if(req.method==='POST'&&body(req).action==='logout'){clearCookie(res);return json(res,200,{ok:true})}
 const session=verifySession(req);if(!session)return json(res,401,{ok:false,error:'UNAUTHORIZED'});
 if(req.method==='GET'){
  const [keys,checks,users,shorteners,auditRows,claimTokens]=await Promise.all([
   supabaseFetch('app_keys?select=id,key_code,key_scope,status,duration_hours,expires_at,telegram_user_id,telegram_username,max_devices,max_checks,activated_at,last_checked_at,check_count,created_at&order=created_at.desc&limit=500'),
   supabaseFetch('key_checks?select=id,key_id,key_scope,result,app_version,created_at&order=created_at.desc&limit=100'),
   supabaseFetch('telegram_users?select=telegram_user_id,username,first_name,last_name,last_seen_at,created_at&order=last_seen_at.desc&limit=200'),
   supabaseFetch('shortener_configs?provider=eq.vuotlink&select=id,provider,enabled,base_url,sort_order,updated_at&limit=1'),
   supabaseFetch('admin_audit?select=id,action,actor,target,detail,created_at&order=created_at.desc&limit=100'),
   supabaseFetch('key_claim_tokens?select=id,telegram_user_id,telegram_username,scope,status,expires_at,used_at,created_at&order=created_at.desc&limit=100')
  ]);
  const tokenRows=await supabaseFetch('shortener_configs?provider=eq.vuotlink&select=provider,api_token&limit=1');
  const hasToken=Boolean(tokenRows?.[0]?.api_token);
  const publishable=env('SUPABASE_PUBLISHABLE_KEY',false)||env('SUPABASE_Publishable_KEY',false)||'';
  return json(res,200,{ok:true,user:session.sub,keys:keys||[],checks:checks||[],users:users||[],shorteners:(shorteners||[]).map(s=>({...s,has_token:hasToken})),claim_tokens:claimTokens||[],audit:auditRows||[],api:{supabase_url:env('SUPABASE_URL'),publishable_key:publishable,quick:{rpc:'check_key_quick',response:'compact'},dev:{rpc:'check_key_dev',response:'full'}}})
 }
 if(req.method!=='POST')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
 const b=body(req),action=b.action;
 if(action==='create_key'){
  const scope=String(b.scope||'quick').toLowerCase()==='dev'?'dev':'quick';const hours=int(b.duration_hours,1,8760,24);const maxDevices=int(b.max_devices,1,100,1);const maxChecks=int(b.max_checks,0,1000000000,0);const length=int(b.key_length,12,20,16);let keyCode='';
  for(let i=0;i<6;i++){keyCode=randomKey(length);try{const created=await supabaseFetch('app_keys',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({key_code:keyCode,key_scope:scope,status:'ACTIVE',duration_hours:hours,expires_at:new Date(Date.now()+hours*3600000).toISOString(),max_devices:maxDevices,max_checks:maxChecks,check_count:0})});await audit(session.sub,'CREATE_KEY',keyCode,{scope,hours,maxDevices,maxChecks,length});return json(res,200,{ok:true,key:created?.[0]||null})}catch(e){if(!String(e.message||'').toLowerCase().includes('duplicate'))throw e}}
  throw new Error('KEY_GENERATION_FAILED')
 }
 if(action==='update_key'){
  const id=int(b.id,1,2147483647,0);if(!id)return json(res,400,{ok:false,error:'INVALID_ID'});const patch={};
  if(b.duration_hours!==undefined){const hours=int(b.duration_hours,1,8760,24);patch.duration_hours=hours;patch.expires_at=new Date(Date.now()+hours*3600000).toISOString()}
  if(b.max_devices!==undefined)patch.max_devices=int(b.max_devices,1,100,1);
  if(b.max_checks!==undefined)patch.max_checks=int(b.max_checks,0,1000000000,0);
  if(['ACTIVE','DISABLED','EXPIRED'].includes(b.status))patch.status=b.status;
  if(!Object.keys(patch).length)return json(res,400,{ok:false,error:'NO_CHANGES'});
  const updated=await supabaseFetch(`app_keys?id=eq.${id}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});await audit(session.sub,'UPDATE_KEY',id,{patch});return json(res,200,{ok:true,key:updated?.[0]||null})
 }
 if(action==='reset_device'){const id=int(b.id,1,2147483647,0);if(!id)return json(res,400,{ok:false,error:'INVALID_ID'});await supabaseFetch(`app_keys?id=eq.${id}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({device_id_hash:null,activated_device_id_hash:null,activated_at:null})});await audit(session.sub,'RESET_DEVICE',id);return json(res,200,{ok:true})}
 if(action==='set_status'){const id=int(b.id,1,2147483647,0);if(!id)return json(res,400,{ok:false,error:'INVALID_ID'});const status=['ACTIVE','DISABLED','EXPIRED'].includes(b.status)?b.status:'DISABLED';await supabaseFetch(`app_keys?id=eq.${id}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status})});await audit(session.sub,'SET_KEY_STATUS',id,{status});return json(res,200,{ok:true})}
 if(action==='delete_key'){const id=int(b.id,1,2147483647,0);if(!id)return json(res,400,{ok:false,error:'INVALID_ID'});await supabaseFetch(`app_keys?id=eq.${id}`,{method:'DELETE'});await audit(session.sub,'DELETE_KEY',id);return json(res,200,{ok:true})}
 if(action==='save_shortener'){const enabled=Boolean(b.enabled);const baseUrl=String(b.base_url||'https://vuotlink.xyz/api').trim()||'https://vuotlink.xyz/api';const suppliedToken=String(b.api_token||'').trim();const patch={enabled,base_url:baseUrl,sort_order:1,updated_at:new Date().toISOString()};if(suppliedToken)patch.api_token=suppliedToken;await supabaseFetch('shortener_configs?provider=eq.vuotlink',{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(patch)});await audit(session.sub,'SAVE_SHORTENER','vuotlink',{enabled,baseUrl,tokenChanged:Boolean(suppliedToken)});return json(res,200,{ok:true})}
 return json(res,400,{ok:false,error:'UNKNOWN_ACTION'})
}catch(error){console.error(error);return json(res,500,{ok:false,error:'SERVER_ERROR'})}};