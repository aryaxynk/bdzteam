const JSON_HEADERS={
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
  'x-content-type-options':'nosniff'
};
function send(res,data,status=200,extra={}){res.statusCode=status;for(const [k,v] of Object.entries({...JSON_HEADERS,...extra}))res.setHeader(k,v);res.end(JSON.stringify(data));}
function getBody(req){const b=req.body;if(b&&typeof b==='object'&&!Buffer.isBuffer(b))return b;if(typeof b==='string'){try{return b?JSON.parse(b):{}}catch{return {}}}return {};}
export default async function handler(req,res){
  if(req.method==='OPTIONS'){res.statusCode=204;res.setHeader('cache-control','no-store');return res.end();}
  if(req.method!=='POST')return send(res,{ok:false,error:'Method Not Allowed.'},405,{allow:'POST, OPTIONS'});
  try{
    const body=getBody(req),token=String(body.recaptcha_token||'').trim();
    if(!token)return send(res,{ok:false,error:'Thiếu reCAPTCHA token.'},400);
    const secret=String(process.env.RECAPTCHA_SECRET_KEY||'').trim();
    if(!secret){console.error('[site-gate] missing RECAPTCHA_SECRET_KEY');return send(res,{ok:false,error:'Hệ thống xác minh bảo mật chưa được cấu hình.'},503);}
    const form=new URLSearchParams({secret,response:token});
    const verify=await fetch('https://www.google.com/recaptcha/api/siteverify',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:form.toString(),signal:AbortSignal.timeout(8000)});
    const result=await verify.json().catch(()=>null),minScore=Math.max(0,Math.min(1,Number(process.env.RECAPTCHA_MIN_SCORE||0.5))),action=String(result?.action||'');
    const hostname=String(result?.hostname||''),allowedHost=String(process.env.RECAPTCHA_ALLOWED_HOSTNAME||'').trim();
    if(!verify.ok||result?.success!==true||Number(result?.score??0)<minScore||action!=='site_gate'||(allowedHost&&hostname!==allowedHost)){
      console.warn('[site-gate] reCAPTCHA rejected',{score:result?.score,action,hostname});
      return send(res,{ok:false,error:'Xác minh reCAPTCHA không hợp lệ. Vui lòng thử lại.'},403);
    }
    return send(res,{ok:true,message:'reCAPTCHA verified.'},200,{'set-cookie':'bdz_gate=1; Path=/; Max-Age=1800; HttpOnly; Secure; SameSite=Lax'});
  }catch(error){console.error('[site-gate]',error?.stack||error);return send(res,{ok:false,error:'Không thể xác minh bảo mật lúc này. Vui lòng thử lại sau vài giây.'},503);}
}
