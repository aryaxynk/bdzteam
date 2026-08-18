import {json,ipOf,rpc,consumeRateLimit,registerViolation,banned,autoBanned,isBadUserAgent} from './db.js';
const normalizeKey=v=>String(v||'').trim().toUpperCase().replace(/\s+/g,'');
const h={"content-type":"application/json; charset=utf-8","cache-control":"no-store, no-cache, must-revalidate, max-age=0"};
export async function verifyKeyByIp(request,env){
 const u=new URL(request.url); let key=u.searchParams.get('key')||u.searchParams.get('code')||'', product=u.searchParams.get('product')||u.searchParams.get('product_slug')||'';
 if(request.method==='POST'){const b=await request.json().catch(()=>({}));key=b.key||b.code||key;product=b.product_slug||b.product||product}
 key=normalizeKey(key); product=String(product||'').trim(); const ip=ipOf(request);
 if(!key)return json({ok:false,status:'INVALID',code:'MISSING_KEY',message:'Thiếu Key.'},400,h);
 if(key.length>128)return json({ok:false,status:'INVALID',code:'INVALID_FORMAT',message:'Key không hợp lệ.'},400,h);
 if(isBadUserAgent(request))return json({ok:false,status:'DENIED',code:'BAD_CLIENT',message:'Ứng dụng không được hỗ trợ.'},403,h);
 if(await banned(env,ip)||await autoBanned(env,ip))return json({ok:false,status:'DENIED',code:'IP_BLOCKED',message:'IP của bạn đã bị chặn.'},403,h);
 if(!(await consumeRateLimit(env,'verify-key',ip,60,30))){await registerViolation(env,ip,'rate_limit','verify-key');return json({ok:false,status:'RATE_LIMIT',code:'TOO_MANY_REQUESTS',message:'Bạn đã kiểm tra quá nhiều lần. Vui lòng thử lại sau.'},429,h)}
 try{const r=await rpc(env,'verify_key_for_ip',{p_key_code:key,p_client_ip:ip});const row=Array.isArray(r)?r[0]:r;if(!row)return json({ok:false,status:'INVALID',code:'INVALID_KEY',message:'Key không tồn tại hoặc không hợp lệ.'},200,h);const status=String(row.status||'INVALID').toUpperCase();if(product&&row.product&&String(row.product).toLowerCase()!==product.toLowerCase())return json({ok:false,...row,status:'WRONG_PRODUCT',code:'WRONG_PRODUCT',message:'Key không thuộc sản phẩm này.'},200,h);const ok=status==='ACTIVE';return json({ok,status,code:status,...row,message:row.message||({ACTIVE:'Key hợp lệ.',EXPIRED:'Key đã hết hạn.',REVOKED:'Key đã bị khóa.',IP_MISMATCH:'Key thuộc thiết bị/IP khác.',PENDING:'Key đang chờ kích hoạt.',INVALID:'Key không hợp lệ.'}[status]||'')},200,h)}catch(e){console.error('verify_key_for_ip failed',e);return json({ok:false,status:'SERVER_ERROR',code:'VERIFY_UNAVAILABLE',message:'Hệ thống xác minh Key đang tạm thời không khả dụng.'},503,h)}}
