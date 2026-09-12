const crypto=require('node:crypto');
const{json,supabaseFetch,createClaimToken,shortenVuotLink,randomKey,hash}=require('./_lib');

function cors(res){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');}
function ip(req){return String(req.headers['x-forwarded-for']||req.headers['x-real-ip']||'').split(',')[0].trim()||'unknown';}
function tokenValue(v){const t=String(v||'').trim();return/^[A-Za-z0-9_-]{20,128}$/.test(t)?t:'';}

async function rateLimit(clientIp){
  const bucket=`web:getkey:${hash(clientIp)}`;
  const result=await supabaseFetch('rpc/consume_rate_limit',{method:'POST',body:JSON.stringify({p_bucket:bucket,p_limit:3,p_window_seconds:60})}).catch(()=>({allowed:true}));
  return result?.allowed!==false;
}

async function start(req,res){
  if(!(await rateLimit(ip(req))))return json(res,429,{ok:false,error:'RATE_LIMITED'});
  const claim=await createClaimToken(null,15);
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'bdzteam.vercel.app').split(',')[0].trim().replace(/:\d+$/,'');
  const target=`https://${host}/token?token=${encodeURIComponent(claim.raw)}`;
  try{
    const shortenedUrl=await shortenVuotLink(target);
    return json(res,200,{ok:true,expires_in_seconds:900,shortenedUrl});
  }catch(error){
    const id=Number(claim.row?.id||0);
    if(id)await supabaseFetch(`key_claim_tokens?id=eq.${id}&status=eq.PENDING`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'CANCELLED'})}).catch(()=>{});
    console.error(error?.message||error);
    return json(res,502,{ok:false,error:'SHORTENER_FAILED'});
  }
}

async function claim(req,res){
  const raw=tokenValue(req.body?.token??req.query?.token);
  if(!raw)return json(res,400,{ok:false,error:'INVALID_TOKEN'});
  const tokenHash=hash(raw);
  const rows=await supabaseFetch(`key_claim_tokens?token_hash=eq.${encodeURIComponent(tokenHash)}&select=id,status,expires_at&limit=1`);
  const token=rows?.[0];
  if(!token)return json(res,404,{ok:false,error:'TOKEN_NOT_FOUND'});
  if(token.status==='USED')return json(res,409,{ok:false,error:'TOKEN_ALREADY_USED'});
  if(token.status!=='PENDING'||!token.expires_at||new Date(token.expires_at)<=new Date()){
    if(token.status==='PENDING')await supabaseFetch(`key_claim_tokens?id=eq.${Number(token.id)}&status=eq.PENDING`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'EXPIRED'})}).catch(()=>{});
    return json(res,410,{ok:false,error:'TOKEN_EXPIRED'});
  }

  const claimedAt=new Date().toISOString();
  const claimed=await supabaseFetch(`key_claim_tokens?id=eq.${Number(token.id)}&status=eq.PENDING&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'USED',used_at:claimedAt})});
  if(!claimed?.length)return json(res,409,{ok:false,error:'TOKEN_ALREADY_USED'});

  const keyCode=randomKey(16);
  const keyFingerprint=crypto.createHash('sha256').update(keyCode).digest('hex');
  try{
    const rows2=await supabaseFetch('app_keys',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({key_code:keyCode,key_fingerprint:keyFingerprint,status:'ACTIVE',duration_hours:24,expires_at:new Date(Date.now()+24*3600000).toISOString(),telegram_user_id:null,telegram_username:null,device_id_hash:null,max_devices:1,check_count:0,max_checks:100})});
    const key=rows2?.[0];
    if(!key)throw new Error('KEY_CREATE_FAILED');
    return json(res,200,{ok:true,key:{key_code:key.key_code,status:key.status,expires_at:key.expires_at,max_checks:key.max_checks,max_devices:key.max_devices,created_at:key.created_at}});
  }catch(error){
    await supabaseFetch(`key_claim_tokens?id=eq.${Number(token.id)}&status=eq.USED&used_at=eq.${encodeURIComponent(claimedAt)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'PENDING',used_at:null})}).catch(()=>{});
    console.error(error?.message||error);
    return json(res,503,{ok:false,error:'KEY_CREATE_FAILED'});
  }
}

module.exports=async function handler(req,res){
  cors(res);
  if(req.method==='OPTIONS')return res.status(204).end();
  if(!['GET','POST'].includes(req.method))return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const action=String(req.method==='GET'?req.query?.action:req.body?.action||'start').trim().toLowerCase();
    if(action==='start')return start(req,res);
    if(action==='claim')return claim(req,res);
    return json(res,400,{ok:false,error:'UNKNOWN_ACTION'});
  }catch(error){
    console.error(error?.message||error);
    return json(res,500,{ok:false,error:'GET_KEY_FAILED'});
  }
};
