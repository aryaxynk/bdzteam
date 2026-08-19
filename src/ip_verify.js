import {json,ipOf,consumeRateLimit,registerViolation,banned,autoBanned,isBadUserAgent} from './db.js';
const normalizeKey=v=>String(v||'').trim().toUpperCase().replace(/\s+/g,'');
const h={"content-type":"application/json; charset=utf-8","cache-control":"no-store, no-cache, must-revalidate, max-age=0"};
export async function verifyKeyByIp(request,env){
 const u=new URL(request.url); let key=u.searchParams.get('key')||u.searchParams.get('code')||'',product=u.searchParams.get('product')||u.searchParams.get('product_slug')||'';
 if(request.method==='POST'){const b=await request.json().catch(()=>({}));key=b.key||b.code||key;product=b.product_slug||b.product||product}
 key=normalizeKey(key);product=String(product||'').trim();const ip=ipOf(request);
 if(!key)return json({ok:false,status:'INVALID',code:'MISSING_KEY',message:'Thiếu Key.'},400,h);
 if(key.length>128)return json({ok:false,status:'INVALID',code:'INVALID_FORMAT',message:'Key không hợp lệ.'},400,h);
 if(isBadUserAgent(request))return json({ok:false,status:'DENIED',code:'BAD_CLIENT',message:'Ứng dụng không được hỗ trợ.'},403,h);
 if(await banned(env,ip)||await autoBanned(env,ip))return json({ok:false,status:'DENIED',code:'IP_BLOCKED',message:'IP của bạn đã bị chặn.'},403,h);
 if(!(await consumeRateLimit(env,'verify-key-legacy',ip,60,30))){await registerViolation(env,ip,'rate_limit','verify-key-legacy');return json({ok:false,status:'RATE_LIMIT',code:'TOO_MANY_REQUESTS',message:'Bạn đã kiểm tra quá nhiều lần. Vui lòng thử lại sau.'},429,h)}
 try{
  const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
  if(!base)throw Error('SUPABASE_URL chưa được cấu hình');
  const r=await fetch(base+'/functions/v1/check-key',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({key,product:product||null,client_ip:ip})});
  const text=await r.text();let d={};try{d=text?JSON.parse(text):{}}catch{d={message:text||`HTTP ${r.status}`}};
  if(!r.ok)return json({ok:false,status:String(d.status||'SERVER_ERROR').toUpperCase(),code:d.code||'VERIFY_UNAVAILABLE',message:d.message||'Hệ thống xác minh Key đang tạm thời không khả dụng.'},r.status,h);
  const status=String(d.status||d.code||'INVALID').toUpperCase();return json({...d,ok:status==='VALID',status,code:d.code||status},200,h);
 }catch(e){console.error('verifyKeyByIp legacy proxy failed',e);return json({ok:false,status:'SERVER_ERROR',code:'VERIFY_UNAVAILABLE',message:'Hệ thống xác minh Key đang tạm thời không khả dụng.'},503,h)}
}
