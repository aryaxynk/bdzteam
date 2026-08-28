(()=>{
'use strict';
const mobile=()=>window.matchMedia('(max-width:900px)').matches;
const shell=()=>document.querySelector('.admin-shell');
const sidebar=()=>document.getElementById('adminSidebar');
const backdrop=()=>document.getElementById('adminBackdrop');
const close=()=>{sidebar()?.classList.remove('is-open');backdrop()?.classList.remove('is-visible');document.body.classList.remove('admin-menu-open')};
const open=()=>{sidebar()?.classList.add('is-open');backdrop()?.classList.add('is-visible');document.body.classList.add('admin-menu-open')};
const toggle=()=>mobile()?open():shell()?.classList.toggle('is-collapsed');
function bindShell(){
 const old=document.getElementById('adminMenuBtn');
 if(old){const btn=old.cloneNode(true);old.replaceWith(btn);btn.addEventListener('click',toggle)}
 document.getElementById('adminCloseBtn')?.addEventListener('click',close);
 backdrop()?.addEventListener('click',close);
 window.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
 window.addEventListener('resize',()=>{if(!mobile())close()});
}
async function dashboard(){
 const host=document.getElementById('tabContent');
 if(!host||String(document.getElementById('tabTitle')?.textContent||'').trim().toLowerCase()!=='dashboard')return;
 try{
  const r=await fetch('/api/admin/dashboard',{credentials:'include',cache:'no-store',headers:{accept:'application/json'}});
  const d=await r.json().catch(()=>null);if(!r.ok||!d?.stats)return;
  const s=d.stats||{};
  const total=Number(s.total_keys||0),active=Number(s.active_keys||0),expired=Number(s.expired_keys||0),revoked=Number(s.revoked_keys||0),products=Number(s.products||0),verifications=Number(s.verifications||0);
  const max=Math.max(1,total,active,expired,revoked),vals=[total,active,expired,revoked],xs=[54,172,290,408],pts=vals.map((v,i)=>`${xs[i]},${174-(v/max)*118}`).join(' ');
  const card=(icon,label,value)=>`<article class="ref-stat-card"><div class="ref-stat-icon"><i class="fa-solid ${icon}"></i></div><div class="ref-stat-copy"><div>${label}</div><strong>${value}</strong></div></article>`;
  host.innerHTML=`<section class="ref-dashboard-head"><div><h2>DASHBOARD</h2><p>Tổng quan hệ thống và trạng thái xác thực Key</p></div><div class="ref-head-meta"><span>KỲ THỐNG KÊ</span><strong>${new Date().toLocaleDateString('vi-VN',{month:'long',year:'numeric'})}</strong></div></section><section class="ref-stat-grid">${card('fa-key','TỔNG KEY',total)}${card('fa-bolt','ĐANG HOẠT ĐỘNG',active)}${card('fa-clock','HẾT HẠN',expired)}${card('fa-ban','ĐÃ KHÓA',revoked)}</section><section class="ref-lower-grid"><article class="ref-panel"><header><div><h3><i class="fa-solid fa-chart-line"></i> THỐNG KÊ HỆ THỐNG</h3><p>Phân bố trạng thái Key hiện tại</p></div><span class="ref-mini-badge">LIVE</span></header><div class="ref-chart-wrap"><svg class="ref-chart" viewBox="0 0 430 210" role="img" aria-label="Biểu đồ trạng thái Key"><line x1="54" y1="174" x2="408" y2="174"/><line x1="54" y1="115" x2="408" y2="115"/><line x1="54" y1="56" x2="408" y2="56"/><polyline points="${pts}"/>${vals.map((v,i)=>`<circle cx="${xs[i]}" cy="${174-(v/max)*118}" r="4"/>`).join('')}<g class="ref-chart-labels"><text x="54" y="198" text-anchor="middle">Tổng</text><text x="172" y="198" text-anchor="middle">Active</text><text x="290" y="198" text-anchor="middle">Hết hạn</text><text x="408" y="198" text-anchor="middle">Khóa</text></g></svg></div></article><article class="ref-panel"><header><h3><i class="fa-regular fa-bell"></i> THÔNG BÁO HỆ THỐNG</h3></header><div class="ref-notices"><div><b>Sản phẩm</b><span>${products} sản phẩm đang được quản lý</span></div><div><b>Xác thực</b><span>${verifications} lượt xác thực đã ghi nhận</span></div><div><b>Shortener</b><span>Link4M + TrafficVN</span></div><div><b>Bảo mật</b><span>Cloudflare Turnstile + Security Events</span></div></div></article></section>`;
 }catch(e){console.error('[BDZ dashboard]',e)}
}
function watchTabs(){
 const title=document.getElementById('tabTitle');
 if(title){new MutationObserver(()=>{if(String(title.textContent||'').trim().toLowerCase()==='dashboard')setTimeout(dashboard,20)}).observe(title,{childList:true,characterData:true,subtree:true})}
 document.addEventListener('click',e=>{const b=e.target.closest('.admin-side-item[data-tab]');if(b&&mobile())setTimeout(close,0)},{capture:true});
}
function start(){bindShell();watchTabs();setTimeout(dashboard,700)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
