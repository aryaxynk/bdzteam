const JSON_HEADERS={
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
  'x-content-type-options':'nosniff'
};

function send(res,data,status=200,extra={}){
  res.statusCode=status;
  for(const [k,v] of Object.entries({...JSON_HEADERS,...extra})) res.setHeader(k,v);
  res.end(JSON.stringify(data));
}

function getBody(req){
  let b=req.body;
  if(b&&typeof b==='object'&&!Buffer.isBuffer(b)) return b;
  if(typeof b==='string'){try{return b?JSON.parse(b):{}}catch{return {}}}
  return {};
}

export default async function handler(req,res){
  if(req.method==='OPTIONS'){
    res.statusCode=204;
    res.setHeader('cache-control','no-store');
    res.end();
    return;
  }
  if(req.method!=='POST'){
    send(res,{ok:false,error:'Method Not Allowed.'},405,{allow:'POST, OPTIONS'});
    return;
  }

  try{
    const body=getBody(req);
    const token=String(body.turnstile_token||body.cf_turnstile_token||body['cf-turnstile-response']||'').trim();
    if(!token){send(res,{ok:false,error:'Vui lòng hoàn thành xác minh Cloudflare Turnstile.'},400);return;}

    const secret=String(process.env.TURNSTILE_SECRET_KEY||process.env.TURNSTILE_SECRET||'').trim();
    if(!secret){
      console.error('[site-gate] missing Turnstile secret environment variable');
      send(res,{ok:false,error:'Hệ thống xác minh bảo mật chưa được cấu hình.'},503);
      return;
    }

    const form=new URLSearchParams();
    form.set('secret',secret);
    form.set('response',token);

    const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',
      headers:{'content-type':'application/x-www-form-urlencoded'},
      body:form.toString(),
      signal:AbortSignal.timeout(8000)
    });

    const result=await verify.json().catch(()=>null);
    if(!verify.ok||result?.success!==true){
      const codes=Array.isArray(result?.['error-codes'])?result['error-codes'].filter(x=>typeof x==='string').slice(0,4):[];
      console.warn('[site-gate] Turnstile rejected token',codes);
      send(res,{ok:false,error:codes.length?`Xác minh Cloudflare Turnstile thất bại (${codes.join(', ')}).`:'Xác minh Cloudflare Turnstile không hợp lệ.'},403);
      return;
    }

    send(res,{ok:true,message:'Cloudflare verified.'},200,{
      'set-cookie':'bdz_gate=1; Path=/; Max-Age=1800; HttpOnly; Secure; SameSite=Lax'
    });
  }catch(error){
    console.error('[site-gate]',error?.stack||error);
    send(res,{ok:false,error:'Không thể xác minh bảo mật lúc này. Vui lòng thử lại sau vài giây.'},503);
  }
}
