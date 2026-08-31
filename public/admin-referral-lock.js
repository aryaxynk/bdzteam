(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const api=async(url,opts={})=>{const r=await fetch(url,{credentials:'include',cache:'no-store',...opts,headers:{accept:'application/json',...(opts.body?{'content-type':'application/json'}:{}),...(opts.headers||{})}});const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={error:t||`HTTP ${r.status}`}}if(!r.ok||d.ok===false)throw Error(d.error||d.message||`HTTP ${r.status}`);return d};
const state=r=>r.used_at?['used','Đã dùng']:new Date(r.expires_at).getTime()<=Date.now()?['expired','Hết hạn']:['live','Còn hiệu lực'];
async function openReferral(btn){
 const root=document.querySelector('#tabContent'),title=document.querySelector('#tabTitle'),sub=document.querySelector('#tabSub');
 if(!root)return;
 document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===btn));
 if(title)title.textContent='Referral Code';if(sub)sub.textContent='Tạo mã đăng ký một lần cho Admin phụ';
 root.innerHTML='<div class="admin-panel p-4"><div class="text-sm font-bold">Đang tải Referral Code...</div></div>';
 try{
  const d=await api('/api/admin/referrals');const rows=Array.isArray(d.referrals)?d.referrals:[];
  const live=rows.filter(r=>state(r)[0]==='live').length;
  root.innerHTML=`<div class="grid lg:grid-cols-2 gap-4"><section class="admin-panel p-5 min-w-0"><div class="flex items-start justify-between gap-3"><div><h2 class="text-lg font-black">Tạo Referral Code</h2><p class="text-xs text-[#6B7280] mt-1 leading-5">Mỗi code chỉ đăng ký được 1 tài khoản Admin phụ và tự hết hạn sau 3 phút.</p></div><span class="text-xs font-black rounded-full px-2 py-1 bg-[#EEF6FF] text-[#2563EB]">${live} đang hoạt động</span></div><button id="refCreate" class="nb-btn nb-btn-yellow w-full mt-5 min-h-[46px]">Tạo Referral Code</button><div id="refNew" class="mt-3"></div></section><section class="admin-panel p-5 min-w-0"><div class="flex items-center justify-between gap-3"><div><h2 class="text-lg font-black">Lịch sử Referral</h2><p class="text-xs text-[#6B7280] mt-1">Theo dõi trạng thái và thời gian hết hạn.</p></div><button id="refRefresh" class="small-btn">Làm mới</button></div><div class="mt-4 space-y-2">${rows.length?rows.map(r=>{const [c,l]=state(r);return `<div class="border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3"><div class="min-w-0"><code class="font-black break-all">${esc(r.code)}</code><div class="text-[11px] text-[#6B7280] mt-1">Hết: ${esc(new Date(r.expires_at).toLocaleString('vi-VN'))}${r.used_username?` · Dùng: ${esc(r.used_username)}`:''}</div></div><div class="flex items-center gap-2"><span class="text-[11px] font-black">${l}</span><button class="small-btn" data-copy-ref="${esc(r.code)}">Copy</button></div></div>`}).join(''):`<div class="text-xs text-[#777] py-5">Chưa có Referral Code.</div>`}</div></section></div>`;
  const create=document.querySelector('#refCreate');create?.addEventListener('click',async()=>{create.disabled=true;const old=create.textContent;create.textContent='Đang tạo...';try{const x=await api('/api/admin/referrals',{method:'POST',body:'{}'});document.querySelector('#refNew').innerHTML=`<div class="border-2 rounded-xl p-4 bg-[#F7FBFF]"><div class="text-xs font-bold text-[#64748B]">Referral Code</div><code class="text-lg font-black break-all">${esc(x.code)}</code><div class="text-xs text-[#64748B] mt-1">Hết hạn: ${esc(new Date(x.expires_at).toLocaleString('vi-VN'))}</div><button class="small-btn mt-3" data-copy-new="${esc(x.code)}">Copy code</button></div>`;await openReferral(btn)}catch(e){alert(e.message)}finally{create.disabled=false;create.textContent=old}});
  document.querySelector('#refRefresh')?.addEventListener('click',()=>openReferral(btn));
  root.querySelectorAll('[data-copy-ref],[data-copy-new]').forEach(b=>b.addEventListener('click',async()=>{const code=b.dataset.copyRef||b.dataset.copyNew||'';try{await navigator.clipboard.writeText(code);b.textContent='Đã copy';setTimeout(()=>b.textContent='Copy',1400)}catch{}}));
 }catch(e){root.innerHTML=`<div class="admin-panel p-5"><b>Không tải được Referral Code.</b><div class="text-xs text-[#6B7280] mt-2">${esc(e.message)}</div></div>`}
}
function install(){document.addEventListener('click',e=>{const btn=e.target.closest?.('[data-tab="subadmins"]');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();openReferral(btn)},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
