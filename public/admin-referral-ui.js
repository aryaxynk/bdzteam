(()=>{
'use strict';
const $=s=>document.querySelector(s);
const api=async(url,opts={})=>{const r=await fetch(url,{credentials:'include',cache:'no-store',...opts,headers:{accept:'application/json',...(opts.body?{'content-type':'application/json'}:{}),...(opts.headers||{})}});const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={error:t||`HTTP ${r.status}`}}if(!r.ok||d.ok===false)throw Error(d.error||d.message||`HTTP ${r.status}`);return d};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const escAttr=s=>esc(s).replace(/`/g,'&#096;');
const state=r=>{if(r.used_at)return ['used','Đã dùng'];if(new Date(r.expires_at).getTime()<=Date.now())return ['expired','Hết hạn'];return ['live','Còn hiệu lực']};
async function load(){
 const root=$('#tabContent');if(!root)return;
 try{
  const d=await api('/api/admin/referrals');
  if(d.role&&d.role!=='main')throw Error('Chỉ Admin chính được quản lý Referral Code.');
  const rows=Array.isArray(d.referrals)?d.referrals:[];
  const live=rows.filter(r=>!r.used_at&&new Date(r.expires_at).getTime()>Date.now()).length;
  root.innerHTML=`<div class="bdz-referral-grid"><section class="bdz-referral-card"><h2>Referral Code Admin phụ</h2><p class="bdz-referral-note" style="margin:6px 0 16px">Mỗi code chỉ dùng 1 lần và tự hết hạn sau 3 phút.</p><button id="makeReferral" class="nb-btn nb-btn-yellow" style="width:100%">Tạo Referral Code</button><div id="newReferral" style="margin-top:14px"></div></section><section class="bdz-referral-card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><h2 style="margin:0">Lịch sử Referral</h2><p class="bdz-referral-note" style="margin:4px 0 0">${live} code đang còn hiệu lực</p></div><button id="refreshReferral" class="bdz-referral-copy">Làm mới</button></div><div style="margin-top:10px">${rows.length?rows.map(r=>{const [cls,label]=state(r);return `<div class="bdz-referral-row"><div style="min-width:0"><div class="bdz-referral-code">${esc(r.code)}</div><div class="bdz-referral-note">Tạo: ${new Date(r.created_at).toLocaleString('vi-VN')} · Hết: ${new Date(r.expires_at).toLocaleString('vi-VN')}${r.used_username?` · Dùng cho: ${esc(r.used_username)}`:''}</div></div><div class="bdz-referral-actions"><span class="bdz-referral-state ${cls}">${label}</span><button class="bdz-referral-copy" data-copy="${escAttr(r.code)}">Copy</button></div></div>`}).join(''):`<div class="bdz-referral-note" style="padding:18px 0">Chưa có Referral Code.</div>`}</div></section></div>`;
  $('#makeReferral')?.addEventListener('click',async()=>{const b=$('#makeReferral');b.disabled=true;b.textContent='Đang tạo...';try{const n=await api('/api/admin/referrals',{method:'POST'});const box=$('#newReferral');if(box)box.innerHTML=`<div class="bdz-referral-card" style="padding:12px;background:#f8fbff;border-color:#bfd1eb"><div class="bdz-referral-code">${esc(n.code)}</div><div class="bdz-referral-note" style="margin-top:4px">Hết hạn: ${new Date(n.expires_at).toLocaleString('vi-VN')}</div><button class="bdz-referral-copy" style="margin-top:8px" data-copy="${escAttr(n.code)}">Copy code</button></div>`;wireCopy();await load()}catch(e){showError(e)}finally{b.disabled=false;b.textContent='Tạo Referral Code'}});
  $('#refreshReferral')?.addEventListener('click',load);
  wireCopy();
 }catch(e){root.innerHTML=`<div class="bdz-referral-card"><b>Không tải được Referral Manager.</b><div class="bdz-referral-note" style="margin-top:6px">${esc(e.message)}</div></div>`}
}
function wireCopy(){document.querySelectorAll('[data-copy]').forEach(b=>{if(b.dataset.bound)return;b.dataset.bound='1';b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(b.dataset.copy||'');const old=b.textContent;b.textContent='Đã copy';setTimeout(()=>b.textContent=old,1200)}catch{}})})}
function showError(e){const root=$('#tabContent');if(root)root.insertAdjacentHTML('afterbegin',`<div class="bdz-referral-card" style="margin-bottom:12px;background:#fff5f6;border-color:#efccd1"><b>Lỗi</b><div class="bdz-referral-note" style="margin-top:4px">${esc(e.message||e)}</div></div>`)}
function mount(){const b=document.querySelector('[data-tab="subadmins"]')||document.querySelector('[data-tab="subreferrals"]');if(!b)return;b.dataset.tab='subreferrals';b.innerHTML='<i class="fa-solid fa-ticket"></i><span>Referral Admin</span>';b.addEventListener('click',e=>{e.stopImmediatePropagation();document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));const h=$('#tabTitle'),s=$('#tabSub');if(h)h.textContent='Referral Admin';if(s)s.textContent='Tạo và quản lý mã đăng ký Admin phụ';load()},{capture:true})}
window.addEventListener('DOMContentLoaded',mount);
})();
