import bcrypt from "bcryptjs";
import { requireAdmin } from "../../src/admin_api.js";
import { json, sb } from "../../src/db.js";

function reqObj(req){return new Request(`https://${req.headers.host||"localhost"}${req.url||"/api/admin/profile"}`,{method:req.method,headers:new Headers(Object.entries(req.headers||{}).reduce((o,[k,v])=>{if(v!=null)o[k]=Array.isArray(v)?v.join(","):String(v);return o},{})),body:['GET','HEAD'].includes(req.method)?undefined:(typeof req.body==='string'?req.body:JSON.stringify(req.body||{}))})}
function send(res,r){res.statusCode=r.status;r.headers.forEach((v,k)=>res.setHeader(k,v));return r.arrayBuffer().then(b=>res.end(Buffer.from(b)))}
export default async function handler(req,res){
  try{
    const request=reqObj(req),session=await requireAdmin(request,process.env);
    if(!session)return send(res,json({ok:false,error:'Chưa đăng nhập quản trị.'},401));
    const username=String(session.u||'');
    let rows=await sb(process.env,'admin_profiles?select=username,role,display_name,created_at,updated_at&username=eq.'+encodeURIComponent(username)+'&limit=1').catch(()=>[]);
    if(!rows?.length){
      await sb(process.env,'admin_profiles',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({username,role:session.r==='sub'?'sub':'main',display_name:username,password_hash:null})}).catch(()=>{});
      rows=await sb(process.env,'admin_profiles?select=username,role,display_name,created_at,updated_at&username=eq.'+encodeURIComponent(username)+'&limit=1').catch(()=>[]);
    }
    if(req.method==='GET')return send(res,json({ok:true,profile:rows?.[0]||{username,role:session.r,display_name:username}}));
    if(req.method!=='POST'&&req.method!=='PATCH')return send(res,json({ok:false,error:'Method Not Allowed.'},405,{allow:'GET,POST,PATCH'}));
    const body=await request.json().catch(()=>({}));
    const displayName=String(body.display_name??'').trim();
    if(displayName.length>40)return send(res,json({ok:false,error:'Tên hiển thị tối đa 40 ký tự.'},400));
    const next={display_name:displayName||username,updated_at:new Date().toISOString()};
    if(body.new_password!==undefined){
      const pass=String(body.new_password||'');
      if(pass.length<8)return send(res,json({ok:false,error:'Mật khẩu mới phải có ít nhất 8 ký tự.'},400));
      next.password_hash=await bcrypt.hash(pass,12);
    }
    await sb(process.env,'admin_profiles?username=eq.'+encodeURIComponent(username),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(next)});
    if(session.r==='sub'&&next.password_hash){await sb(process.env,'sub_admins?username=eq.'+encodeURIComponent(username),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({password_hash:next.password_hash})}).catch(()=>{})}
    return send(res,json({ok:true,profile:{username,role:session.r,display_name:next.display_name}}));
  }catch(e){return send(res,json({ok:false,error:String(e?.message||e||'Lỗi máy chủ.')},500))}
}
