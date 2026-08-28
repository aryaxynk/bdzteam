const HEADERS={
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
  'x-content-type-options':'nosniff'
};
export default function handler(req,res){
  if(req.method!=='GET'){res.statusCode=405;res.setHeader('allow','GET');Object.entries(HEADERS).forEach(([k,v])=>res.setHeader(k,v));return res.end(JSON.stringify({ok:false,error:'Method Not Allowed.'}));}
  const siteKey=String(process.env.RECAPTCHA_SITE_KEY||'').trim();
  if(!siteKey){res.statusCode=503;Object.entries(HEADERS).forEach(([k,v])=>res.setHeader(k,v));return res.end(JSON.stringify({ok:false,error:'RECAPTCHA_SITE_KEY chưa được cấu hình trên Vercel.'}));}
  res.statusCode=200;Object.entries(HEADERS).forEach(([k,v])=>res.setHeader(k,v));return res.end(JSON.stringify({ok:true,site_key:siteKey}));
}
