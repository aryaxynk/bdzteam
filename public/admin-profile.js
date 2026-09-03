(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmt=v=>{if(!v)return'Chưa ghi nhận';const d=new Date(v);return Number.isNaN(d.getTime())?'Chưa ghi nhận':d.toLocaleString('vi-VN',{hour12:false})};
const msg=e=>e instanceof Error?e.message:e&&typeof e==='object'?(e.error||e.message||e.detail||JSON.stringify(e)):String(e??'');
const request=async(path,options={})=>{const r=await fetch(path,{credentials:'include',cache:'no-store',...options,headers:{accept:'application/json',...(options.body?{'content-type':'application/json'}:{}),...(options.headers||{})}});const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={error:t||`HTTP ${r.status}`}}if(!r.ok||d.ok===false)throw Error(msg(d)||`HTTP ${r.status}`);return d};
const flash=(v,bad=false)=>{const e=$('#flash');if(!e)return;e.textContent=msg(v)||'Đã hoàn tất.';e.className='flash '+(bad?'bad':'');clearTimeout(e._profileTimer);e._profileTimer=setTimeout(()=>e.className='flash hidden',3200)};
function setupNav(){
 const b=$('[data-tab="settings"]');
 if(!b)return false;
 if(b.dataset.profileNav!=='1'){
  b.dataset.profileNav='1';
  b.removeAttribute('disabled');
  b.innerHTML='<i class="fa-solid fa-user"></i>Hồ sơ';
  b.onclick=e=>{e.preventDefault();openProfile()};
 }
 return true;
}
function renderProfile(p){
 const main=p.role==='main',labels=p.permission_labels||{},perms=p.permissions||{},permKeys=Object.keys(labels);
 return `<div class="profile-layout profile-layout-v2"><section class="panel profile-card"><div class="profile-head"><div class="profile-avatar"><i class="fa-solid fa-user"></i></div><div class="profile-ident"><h2>${esc(p.display_name||p.username||'Admin')}</h2><p>Tài khoản quản trị BDZTEAM</p></div><span class="profile-badge ${main?'main':'sub'}">${esc(p.role_label||'Admin')}</span></div><div class="profile-info-grid"><div class="profile-info"><span>Tên đăng nhập</span><b>${esc(p.username||'—')}</b><div class="profile-login-lock"><i class="fa-solid fa-lock"></i> Tên đăng nhập cố định, không thể sửa</div></div><div class="profile-info"><span>Vai trò</span><b>${esc(p.role_label||'—')}</b></div><div class="profile-info"><span>Trạng thái</span><b>${esc(p.status||'ACTIVE')}</b></div><div class="profile-info"><span>Ngày tạo hồ sơ</span><b>${fmt(p.created_at)}</b></div><div class="profile-info"><span>Đăng nhập gần nhất</span><b>${fmt(p.last_login)}</b></div><div class="profile-info"><span>Đổi mật khẩu lần cuối</span><b>${fmt(p.password_changed_at)}</b></div></div>${main?'<div class="profile-note">Admin chính có toàn quyền quản trị hệ thống.</div>':''}</section><section class="panel profile-card"><div class="panel-head"><div><h2>${main?'Quyền quản trị':'Quyền Admin phụ'}</h2><p>${main?'Tài khoản Admin chính có toàn quyền.':'Các quyền hiện tại của tài khoản này chỉ để xem trong Hồ sơ.'}</p></div></div><div class="profile-perms">${permKeys.map(k=>`<div class="profile-perm ${perms[k]?'on':'off'}"><i class="fa-solid ${perms[k]?'fa-circle-check':'fa-circle-xmark'}"></i><span>${esc(labels[k])}</span></div>`).join('')||'<div class="empty">Không có quyền được khai báo.</div>'}</div></section><section class="panel profile-card profile-form"><div class="panel-head"><div><h2>Đổi mật khẩu</h2><p>Nhập mật khẩu hiện tại để xác nhận trước khi đặt mật khẩu mới.</p></div></div><div class="stack"><label class="field">Mật khẩu hiện tại<input id="profileCurrentPassword" type="password" autocomplete="current-password"></label><label class="field">Mật khẩu mới<input id="profileNewPassword" type="password" minlength="8" autocomplete="new-password"></label><label class="field">Nhập lại mật khẩu mới<input id="profileConfirmPassword" type="password" minlength="8" autocomplete="new-password"></label></div><div class="profile-actions"><button id="profileChangePassword" class="btn primary">Đổi mật khẩu</button></div></section></div>`;
}
function bindProfile(){
 const btn=$('#profileChangePassword');
 if(!btn)return;
 btn.onclick=async()=>{
  const current=$('#profileCurrentPassword')?.value||'',next=$('#profileNewPassword')?.value||'',confirm=$('#profileConfirmPassword')?.value||'';
  if(!current||!next||!confirm){flash('Vui lòng nhập đủ mật khẩu.',true);return}
  if(next.length<8){flash('Mật khẩu mới phải có ít nhất 8 ký tự.',true);return}
  if(next!==confirm){flash('Mật khẩu nhập lại không khớp.',true);return}
  btn.disabled=true;btn.textContent='Đang đổi...';
  try{
   await request('/api/admin/profile',{method:'POST',body:JSON.stringify({action:'change_password',current_password:current,new_password:next,confirm_password:confirm})});
   flash('Đổi mật khẩu thành công.');
   ['#profileCurrentPassword','#profileNewPassword','#profileConfirmPassword'].forEach(s=>{const e=$(s);if(e)e.value=''})
   const d=await request('/api/admin/profile');
   const panel=$('#panel');if(panel){panel.innerHTML=renderProfile(d.profile||{});bindProfile()}
  }catch(e){flash(e,true)}
  finally{if(btn.isConnected){btn.disabled=false;btn.textContent='Đổi mật khẩu'}}
 };
}
async function openProfile(){
 if(!setupNav())return;
 $$('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.tab==='settings'));
 document.body.classList.remove('open');
 const title=$('#title'),sub=$('#sub'),panel=$('#panel');
 if(title)title.textContent='Hồ sơ';
 if(sub)sub.textContent='Thông tin tài khoản và quyền quản trị';
 if(!panel)return;
 panel.innerHTML='<section class="panel profile-loading"><div class="empty">Đang tải hồ sơ...</div></section>';
 try{const d=await request('/api/admin/profile');panel.innerHTML=renderProfile(d.profile||{});bindProfile()}
 catch(e){panel.innerHTML=`<section class="panel profile-loading"><div class="empty">${esc(msg(e)||'Không thể tải hồ sơ.')}</div></section>`}
}
function init(){
 setupNav();
 const timer=setInterval(()=>{if(setupNav())clearInterval(timer)},200);
 setTimeout(()=>setupNav(),1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.BDZProfile={open:openProfile};
})();
