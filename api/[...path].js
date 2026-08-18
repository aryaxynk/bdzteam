import {json,clearAuth,ipOf,banned,autoBanned,getSession} from '../src/db.js';
import {products,startGetKey,claimKey,keyMeta,siteData,publicStats} from '../src/public_api.js';
import {verifyKeyByIp} from '../src/ip_verify.js';
import {adminLogin,adminAuthCode,requireAdmin,dashboard,adminAction} from '../src/admin_api.js';

function toRequest(req,url){
  const headers=new Headers();
  for(const [k,v] of Object.entries(req.headers||{})) if(v!=null) headers.set(k,Array.isArray(v)?v.join(','):String(v));
  let body;
  if(!['GET','HEAD'].includes(req.method)){
    if(typeof req.body==='string') body=req.body;
    else if(req.body!==undefined) body=JSON.stringify(req.body);
  }
  return new Request(url,{method:req.method,headers,body});
}
function send(res,r){
  res.statusCode=r.status;
  r.headers.forEach((v,k)=>res.setHeader(k,v));
  return r.arrayBuffer().then(b=>res.end(Buffer.from(b)));
}
async function sessionCheck(request,env){
  const ip=ipOf(request);
  if(await banned(env,ip)) return json({ok:false,action:'ip_banned',message:'IP của bạn đã bị Quản trị viên khóa vĩnh viễn khỏi hệ thống.'},403,clearAuth());
  if(await autoBanned(env,ip)) return json({ok:false,action:'ip_banned',message:'IP của bạn đã bị tạm khóa do có hành vi bất thường.'},403,clearAuth());
  const s=await getSession(request,env);
  if(!s) return json({ok:true,action:'none'});
  if(s.r==='sub'){
    const k=env.SUPABASE_SECRET_KEY;
    if(!k) return json({ok:false,action:'server_error',message:'SUPABASE_SECRET_KEY chưa được cấu hình.'},503);
    const r=await fetch(env.SUPABASE_URL+'/rest/v1/sub_admins?select=status&id=eq.'+Number(s.id)+'&limit=1',{headers:{apikey:k,Authorization:'Bearer '+k,Accept:'application/json'}}).catch(()=>null);
    const rows=r?.ok?await r.json():[];
    if(!rows?.[0]) return json({ok:false,action:'account_deleted',message:'Tài khoản của bạn đã bị Admin chính xóa quyền truy cập.'},401,clearAuth());
    if(rows[0].status!=='ACTIVE') return json({ok:false,action:'account_locked',message:'Tài khoản của bạn đã bị Admin chính khóa.'},401,clearAuth());
  }
  return json({ok:true,action:'none'});
}

function requestPath(req){
  const raw=String(req.url||'/api');
  try{
    const u=new URL(raw.startsWith('http')?raw:`https://${req.headers.host||'localhost'}${raw}`);
    return (u.pathname.replace(/\/+/g,'/').replace(/\/$/,'')||'/');
  }catch{return raw.split('?')[0]||'/';}
}

export default async function handler(req,res){
  const host=String(req.headers.host||'localhost');
  const base=`https://${host}`;
  const path=requestPath(req);
  const u=new URL(String(req.url||'/api'),base);
  const request=toRequest(req,u.toString());
  const env=process.env;
  try{
    if(req.method==='OPTIONS') return send(res,new Response(null,{status:204,headers:{'access-control-allow-origin':req.headers.origin||base,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,accept','access-control-allow-credentials':'true','cache-control':'no-store'}}));
    if(path==='/api/health') return send(res,json({ok:true,service:'bdzteam-vercel',target:base,storage:'supabase'}));
    if(path==='/api/session-check'&&req.method==='GET') return send(res,await sessionCheck(request,env));
    if(path==='/api/site'&&req.method==='GET') return send(res,json(await siteData(env)));
    if(path==='/api/stats'&&req.method==='GET') return send(res,json(await publicStats(env)));
    if(path==='/api/key-meta'&&req.method==='GET') return send(res,await keyMeta(request,env));
    if(path==='/api/products'&&req.method==='GET') return send(res,await products(env));
    if(path==='/api/start-get-key'&&req.method==='POST') return send(res,await startGetKey(request,env));
    if(['/api/v1/verify','/api/check-key','/api/verify'].includes(path)&&['GET','POST'].includes(req.method)) return send(res,await verifyKeyByIp(request,env));
    if(path==='/api/claim-key'&&req.method==='POST') return send(res,await claimKey(request,env));
    if(path==='/api/admin/login'&&req.method==='POST') return send(res,await adminLogin(request,env));
    if(path==='/api/admin/auth-code'&&req.method==='POST') return send(res,await adminAuthCode(request,env));
    if(path==='/api/admin/logout'&&req.method==='POST') return send(res,json({ok:true},200,clearAuth()));
    if(path.startsWith('/api/admin/')){
      const s=await requireAdmin(request,env);
      if(!s) return send(res,json({ok:false,error:'Chưa đăng nhập quản trị.'},401));
      if(path==='/api/admin/me'&&req.method==='GET') return send(res,json({ok:true,user:s.u,role:s.r}));
      if(path==='/api/admin/dashboard'&&req.method==='GET') return send(res,json(await dashboard(env,s)));
      if(path==='/api/admin/action'&&req.method==='POST') return send(res,await adminAction(request,env,s));
    }
    return send(res,json({ok:false,error:'Not found',path},404));
  }catch(e){
    console.error('[vercel]',e);
    return send(res,json({ok:false,error:'Lỗi máy chủ. Vui lòng thử lại sau.',detail:process.env.NODE_ENV==='production'?undefined:String(e?.message||e)},500));
  }
}
