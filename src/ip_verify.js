import { json, ipOf, consumeRateLimit, registerViolation, banned, autoBanned, isBadUserAgent, sb } from './db.js';
const normalizeKey=v=>String(v||'').trim().toUpperCase().replace(/\s+/g,'');
const clean=v=>String(v||'').trim();
const h={"content-type":"application/json; charset=utf-8","cache-control":"no-store, no-cache, must-revalidate, max-age=0"};
export async function verifyKeyByIp(request,env){
  const u=new URL(request.url); let key=u.searchParams.get('key')||u.searchParams.get('code')||'', product=u.searchParams.get('product')||u.searchParams.get('product_slug')||'', deviceId=u.searchParams.get('device_id')||'';
  if(request.method==='POST'){const b=await request.json().catch(()=>({}));key=b.key||b.code||key;product=b.product_slug||b.product||product;deviceId=b.device_id||deviceId;}
  key=normalizeKey(key);product=clean(product);deviceId=clean(deviceId);const ip=ipOf(request);
  if(!key)return json({ok:false,status:'INVALID',code:'MISSING_KEY',message:'Thiếu Key.'},400,h);
  if(key.length>128)return json({ok:false,status:'INVALID',code:'INVALID_FORMAT',message:'Key không hợp lệ.'},400,h);
  if(deviceId.length>256)return json({ok:false,status:'INVALID',code:'INVALID_DEVICE_ID',message:'Device ID không hợp lệ.'},400,h);
  if(isBadUserAgent(request))return json({ok:false,status:'DENIED',code:'BAD_CLIENT',message:'Ứng dụng không được hỗ trợ.'},403,h);
  if(await banned(env,ip)||await autoBanned(env,ip))return json({ok:false,status:'DENIED',code:'IP_BLOCKED',message:'IP của bạn đã bị chặn.'},403,h);
  if(!(await consumeRateLimit(env,'verify-key-v2',ip+'|'+key,60,30))){await registerViolation(env,ip,'rate_limit','verify-key-v2');return json({ok:false,status:'RATE_LIMIT',code:'TOO_MANY_REQUESTS',message:'Bạn đã kiểm tra quá nhiều lần. Vui lòng thử lại sau.'},429,h)}
  try{
    const base=String(env.SUPABASE_URL||'').replace(/\/$/,''); const secret=String(env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SERVICE_ROLE||'').trim();
    if(!base||!secret)throw Error('Supabase server credentials chưa được cấu hình');
    const r=await fetch(base+'/rest/v1/rpc/verify_key_app',{method:'POST',headers:{'content-type':'application/json','accept':'application/json','apikey':secret,'authorization':'Bearer '+secret},body:JSON.stringify({p_key_code:key,p_client_ip:ip,p_product_slug:product||null,p_device_id:deviceId||null})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!Array.isArray(d)||!d[0])return json({ok:false,status:'SERVER_ERROR',code:'VERIFY_UNAVAILABLE',message:'Hệ thống xác minh Key đang tạm thời không khả dụng.'},503,h);
    const row=d[0],status=String(row.status||'INVALID').toUpperCase();
    return json({ok:status==='VALID',status,code:status,message:row.message||'',product:row.product||null,product_id:row.product_id||null,duration_hours:row.duration_hours||null,expires_at:row.expires_at||null,claimed_ip:row.claimed_ip||null,activated_ip:row.activated_ip||null,activated_at:row.activated_at||null,device_bound:!!row.device_bound},200,h);
  }catch(e){console.error('verifyKeyByIp failed',e);return json({ok:false,status:'SERVER_ERROR',code:'VERIFY_UNAVAILABLE',message:'Hệ thống xác minh Key đang tạm thời không khả dụng.'},503,h)}
}
