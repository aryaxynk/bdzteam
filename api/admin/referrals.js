import { requireAdmin } from "../../src/admin_api.js";
import { json, sb, ipOf, sameOrigin, securityLog } from "../../src/db.js";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode(){let s="";for(let i=0;i<12;i++)s+=alphabet[Math.floor(Math.random()*alphabet.length)];return `BDZ-ADM-${s}`}
function headers(req){return new Headers(Object.entries(req.headers||{}).reduce((o,[k,v])=>{if(v!=null)o[k]=Array.isArray(v)?v.join(","):String(v);return o},{}))}
function toRequest(req){const origin=`${req.headers["x-forwarded-proto"]||"https"}://${req.headers.host||"localhost"}`;return new Request(new URL(req.url||"/api/admin/referrals",origin),{method:req.method||"GET",headers:headers(req),body:["GET","HEAD"].includes(String(req.method||"GET").toUpperCase())?undefined:(typeof req.body==='string'?req.body:JSON.stringify(req.body||{}))})}
function send(res,r){res.statusCode=r.status;r.headers.forEach((v,k)=>res.setHeader(k,v));return r.arrayBuffer().then(b=>res.end(Buffer.from(b)))}
export default async function handler(req,res){
 try{
  const request=toRequest(req);if(!sameOrigin(request))return send(res,json({ok:false,error:"Origin không hợp lệ."},403));
  const session=await requireAdmin(request,process.env);if(!session)return send(res,json({ok:false,error:"Chưa đăng nhập quản trị."},401));
  if(session.r!=="main")return send(res,json({ok:false,error:"Chỉ Admin chính được quản lý Referral Code."},403));
  if(req.method==="GET"){
   const rows=await sb(process.env,"admin_referral_codes?select=id,code,created_by,created_at,expires_at,used_at,used_username&order=id.desc&limit=100");
   return send(res,json({ok:true,referrals:Array.isArray(rows)?rows:[]},200));
  }
  if(req.method==="POST"){
   const code=makeCode(),createdAt=new Date(),expiresAt=new Date(createdAt.getTime()+3*60*1000);
   let inserted=null;
   for(let i=0;i<5&&!inserted;i++){
    const candidate=i?makeCode():code;
    try{const rows=await sb(process.env,"admin_referral_codes",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({code:candidate,created_by:String(session.u),created_at:createdAt.toISOString(),expires_at:expiresAt.toISOString(),used_at:null,used_username:null})});inserted=Array.isArray(rows)?rows[0]:rows}catch(e){if(i===4)throw e}
   }
   return send(res,json({ok:true,code:inserted.code,created_at:inserted.created_at,expires_at:inserted.expires_at},201));
  }
  return send(res,json({ok:false,error:"Method Not Allowed."},405,{allow:"GET,POST"}));
 }catch(e){await securityLog(process.env,"admin_referral_api_error",ipOf(req),e?.message||String(e)).catch(()=>{});return send(res,json({ok:false,error:"Không thể xử lý Referral Code."},500))}
}
