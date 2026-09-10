import {json,ipOf,sha256,rpc,setting,banned,autoBanned,securityLog,ensureProducts,sb,consumeRateLimit,registerViolation,isBadUserAgent} from "./db.js";

const VUOTLINK_ENDPOINT = "https://vuotlink.xyz/api";

export async function siteData(env){
  const defaults={site_name:"BDZTEAM",site_slogan:"Nền tảng quản lý và xác thực Key tự động",contact_info:"",maintenance_enabled:false,maintenance_message:"Website đang bảo trì. Vui lòng quay lại sau."};
  const vals=await Promise.all([
    setting(env,"site_name",defaults.site_name).catch(()=>defaults.site_name),
    setting(env,"site_slogan",defaults.site_slogan).catch(()=>defaults.site_slogan),
    setting(env,"contact_info",defaults.contact_info).catch(()=>defaults.contact_info),
    setting(env,"maintenance_enabled","false").catch(()=>"false"),
    setting(env,"maintenance_message",defaults.maintenance_message).catch(()=>defaults.maintenance_message)
  ]);
  return{site_name:vals[0],site_slogan:vals[1],contact_info:vals[2],maintenance_enabled:vals[3]==='true',maintenance_message:vals[4],logo_url:"https://files.catbox.moe/hvagjt.jpg"};
}

export async function publicStats(env){
  const now=encodeURIComponent(new Date().toISOString());
  const[a,b,c,d]=await Promise.all([
    sb(env,"keys?select=id&limit=10000").catch(()=>[]),
    sb(env,"keys?select=id&status=eq.ACTIVE&or=(expires_at.gt."+now+",expires_at.is.null)&limit=10000").catch(()=>[]),
    sb(env,"logs?select=id&limit=10000").catch(()=>[]),
    sb(env,"products?select=id&limit=10000").catch(()=>[])
  ]);
  return{total_keys:a.length,active_keys:b.length,verifications:c.length,products:d.length};
}

export async function keyMeta(request,env){
  const ip=ipOf(request),start=new Date();start.setUTCHours(0,0,0,0);
  const rows=await sb(env,"logs?select=id&ip_address=eq."+encodeURIComponent(ip)+"&result=eq.VALID&created_at=gte."+encodeURIComponent(start.toISOString())+"&limit=10000").catch(()=>[]);
  return json({ip,today_gets:rows.length});
}

export async function products(env){return {products:await ensureProducts(env)};}

function validUrl(value){
  try{
    const u=new URL(String(value||"").trim());
    return u.protocol==='http:'||u.protocol==='https:'?u.href:"";
  }catch{return "";}
}

async function shortenWithVuotlink(destination,env){
  const apiToken=String(env.VUOTLINK_API_TOKEN||"").trim();
  const target=validUrl(destination);
  if(!apiToken)throw new Error("VUOTLINK_API_TOKEN chưa được cấu hình trên server");
  if(!target)throw new Error("URL cần rút gọn không hợp lệ");
  const u=new URL(VUOTLINK_ENDPOINT);
  u.searchParams.set("api",apiToken);
  u.searchParams.set("url",target);
  const r=await fetch(u.toString(),{method:"GET",headers:{Accept:"application/json, text/plain, */*"},redirect:"follow",cache:"no-store"});
  const text=await r.text();
  let data=null;
  try{data=text?JSON.parse(text):null}catch{}
  const shortened=validUrl(data?.shortenedUrl||data?.shortened_url||text);
  if(!r.ok||String(data?.status||"").toLowerCase()==='error'||!shortened){
    throw new Error(String(data?.message||"Vuotlink không tạo được link rút gọn").trim());
  }
  return shortened;
}

export async function startGetKey(request,env){
  const b=await request.json().catch(()=>({})),pid=Number(b.product_id),ip=ipOf(request);
  if(!Number.isSafeInteger(pid)||pid<1)return json({error:"Sản phẩm không hợp lệ."},400);
  if(isBadUserAgent(request)){
    await registerViolation(env,ip,"bad_user_agent","get-key");
    return json({error:"Trình duyệt hoặc công cụ truy cập không được hỗ trợ."},403);
  }
  if(await banned(env,ip)||await autoBanned(env,ip))return json({error:"IP của bạn đã bị chặn tạm thời hoặc vĩnh viễn khỏi hệ thống."},403);
  if(!(await consumeRateLimit(env,"get-key",ip,300,5))){
    await registerViolation(env,ip,"rate_limit","get-key");
    return json({error:"Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau vài phút."},429);
  }
  const p=await sb(env,"products?select=id&id=eq."+pid+"&limit=1");
  if(!p.length)return json({error:"Sản phẩm không tồn tại."},404);
  const client=await sha256(ip),token=crypto.randomUUID()+crypto.randomUUID();
  try{
    await rpc(env,"create_key_token",{p_token_hash:await sha256(token),p_product_id:pid,p_client_hash:client,p_ttl_seconds:900});
  }catch(e){
    await securityLog(env,"key_token_create_error",ip,String(e&&e.message||e));
    return json({error:"Không thể khởi tạo phiên lấy Key. Vui lòng thử lại."},503);
  }
  const original=new URL(request.url).origin+"/key.html?token="+encodeURIComponent(token);
  try{
    const redirect=await shortenWithVuotlink(original,env);
    return json({redirect,shortener:"vuotlink"});
  }catch(e){
    const detail=String(e&&e.message||e).slice(0,300);
    await securityLog(env,"shortener_chain_unavailable",ip,"vuotlink: "+detail);
    return json({error:"Không thể tạo link vượt. Vui lòng thử lại sau."},503);
  }
}

export async function claimKey(request,env){
  const b=await request.json().catch(()=>({})),token=String(b.token||"").trim(),ip=ipOf(request);
  if(!token)return json({error:"Token không hợp lệ."},400);
  if(isBadUserAgent(request))return json({error:"Trình duyệt hoặc công cụ truy cập không được hỗ trợ."},403);
  if(await banned(env,ip)||await autoBanned(env,ip))return json({error:"IP của bạn bị chặn."},403);
  if(!(await consumeRateLimit(env,"claim-key",ip,300,10)))return json({error:"Bạn đã thao tác quá nhanh. Vui lòng thử lại sau vài phút."},429);
  let rows;
  try{
    rows=await rpc(env,"claim_key_with_token",{p_token_hash:await sha256(token),p_client_hash:await sha256(ip),p_duration_hours:10,p_claimed_ip:ip});
  }catch(e){
    await securityLog(env,"key_claim_rpc_error",ip,String(e&&e.message||e));
    return json({error:"Không thể xác nhận Key lúc này. Vui lòng thử lại sau vài giây."},503);
  }
  const row=Array.isArray(rows)?rows[0]:rows;
  if(!row||!row.key_code)return json({error:"Token đã hết hạn hoặc đã được sử dụng. Vui lòng quay lại Bước 1 để lấy lại Key."},403);
  await sb(env,"logs",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({key_code:row.key_code,product_id:Number(row.product_id),ip_address:ip,result:"VALID"})}).catch(()=>{});
  return json(row);
}

export async function checkKey(request,env){
  const u=new URL(request.url);
  let key=u.searchParams.get("key")||"",product=u.searchParams.get("product")||"";
  if(request.method==="POST"){
    const b=await request.json().catch(()=>({}));
    key=b.key||key;
    product=b.product_slug||product;
  }
  key=String(key).trim().toUpperCase();
  if(!key)return json({error:"Thiếu Key."},400);
  const ip=ipOf(request);
  if(isBadUserAgent(request))return json({error:"Trình duyệt hoặc công cụ truy cập không được hỗ trợ."},403);
  if(await banned(env,ip)||await autoBanned(env,ip))return json({error:"IP của bạn bị chặn."},403);
  if(!(await consumeRateLimit(env,"check-key",ip,300,15)))return json({error:"Bạn đã tra cứu quá nhiều lần. Vui lòng thử lại sau vài phút."},429);
  if(product){
    const r=await rpc(env,"verify_key",{p_key_code:key,p_product_slug:String(product).toLowerCase()});
    return json(Array.isArray(r)?r[0]:r);
  }
  const r=await rpc(env,"verify_key_public",{p_key_code:key});
  return json(Array.isArray(r)?r[0]:r);
}
