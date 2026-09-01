(()=>{
'use strict';
if(window.__bdzReferralUI)return;window.__bdzReferralUI=true;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const api=async(url,opts={})=>{const r=await fetch(url,{credentials:'include',cache:'no-store',...opts,headers:{accept:'application/json',...(opts.body?{'content-type':'application/json'}:{}),...(opts.headers||{})}});const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={error:t||`HTTP ${r.status}`}}if(!r.ok||d.ok===false)throw Error(d.error||d.message||`HTTP ${r.status}`);return d};
const fmt=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('vi-VN')};
const state=r=>{if(r.used_at)return['used','Đã dùng'];if(new Date(r.expires_at).getTime()<=Date.now())return['expired','Hết hạn'];return['live','Còn hiệu lực']};
async function renderReferral(){
 const root=$('#tabContent');if(!root)return;
 root.innerHTML='<div class="admin-panel p-4"><div class="font-black">Đang tải Referral Code...</div></div>';
 try{
  const d=await api('/api/admin/referrals');const rows=Array.isArray(d.referrals)?d.referrals:[];const live=rows.filter(r=>!r.used_at&&new Date(r.expires_at).getTime()>Date.now()).length;
  root.innerHTML=`<div class="grid lg:grid-cols-2 gap-4"><section class="admin-panel p-4"><h2 class="font-black text-lg">Referral Code Admin phụ</h2><p class="text-xs text-[#666] leading-5 mt-1">Mỗi code dùng 1 lần cho 1 tài khoản và tự hết hạn sau 3 phút.</p><button id="makeReferral" class="nb-btn nb-btn-yellow w-full mt-4">Tạo Referral Code</button><div id="newReferral" class="mt-3"></div></section><section class="admin-panel p-4"><div class="flex flex-wrap justify-between gap-2 items-center"><div><h2 class="font-black text-lg">Lịch sử</h2><p class="text-xs text-[#666] mt-1">${live} code còn hiệu lực</p></div><button id="refreshReferral" class="small-btn">Làm mới</button></div><div class="mt-3 space-y-2">${rows.length?rows.map(r=>{const[c,l]=state(r);return`<div class="border border-[#d8dee7] rounded-lg p-3 flex flex-wrap justify-between gap-3 items-center"><div class="min-w-0"><div class="font-black break-all">${esc(r.code)}</div><div class="text-xs text-[#6b7280] mt-1">Hết: ${fmt(r.expires_at)}${r.used_username?` · Dùng cho: ${esc(r.used_username)}`:''}</div></div><div class="flex gap-2 items-center"><span class="text-xs font-bold">${l}</span><button class="small-btn" data-copy="${esc(r.code)}">Copy</button></div></div>`}).join(''):'<div class="text-xs text-[#777] py-5 text-center">Chưa có Referral Code.</div>'}</div></section></div>`;
  $('#makeReferral')?.addEventListener('click',async()=>{const b=$('#makeReferral');b.disabled=true;b.textContent='Đang tạo...';try{const x=await api('/api/admin/referrals',{method:'POST',body:'{}'});$('#newReferral').innerHTML=`<div class="border border-[#bfd1eb] rounded-lg p-3 bg-[#f8fbff]"><div class="font-black break-all">${esc(x.code)}</div><div class="text-xs text-[#666] mt-1">Hết hạn: ${fmt(x.expires_at)}</div><button class="small-btn mt-2" data-copy="${esc(x.code)}">Copy code</button></div>`;await reload()}catch(e){alert(e.message)}finally{b.disabled=false;b.textContent='Tạo Referral Code'}});
  $('#refreshReferral')?.addEventListener('click',reload);
  root.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(b.dataset.copy||'');const old=b.textContent;b.textContent='Đã copy';setTimeout(()=>b.textContent=old,1200)}catch{alert('Không thể copy code.')}}));
 }catch(e){root.innerHTML=`<div class="admin-panel p-4"><b>Không tải được Referral Code.</b><div class="text-xs text-[#666] mt-1">${esc(e.message)}</div></div>`}
}
async function reload(){await renderReferral()}
function activate(btn){document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===btn));const h=$('#tabTitle'),s=$('#tabSub');if(h)h.textContent='Referral Code';if(s)s.textContent='Cấp mã đăng ký Admin phụ';renderReferral();}
function boot(){const btn=document.querySelector('[data-tab="subadmins"]')||document.querySelector('[data-tab="subreferrals"]');if(!btn)return;btn.dataset.tab='subadmins';const span=btn.querySelector('span');if(span)span.textContent='Referral Code';const icon=btn.querySelector('i');if(icon)icon.className='fa-solid fa-ticket';document.addEventListener('click',e=>{const target=e.target.closest?.('[data-tab="subadmins"]');if(!target)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();activate(target)},true);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
