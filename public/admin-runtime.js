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
 document.getElementById('adminMenuBtn')?.replaceWith(document.getElementById('adminMenuBtn').cloneNode(true));
 document.getElementById('adminMenuBtn')?.addEventListener('click',toggle);
 document.getElementById('adminCloseBtn')?.addEventListener('click',close);
 backdrop()?.addEventListener('click',close);
 window.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
 window.addEventListener('resize',()=>{if(!mobile())close()});
}
function bindTabs(){
 document.querySelectorAll('.admin-side-item[data-tab]').forEach(btn=>{
   btn.addEventListener('click',e=>{
     e.preventDefault();
     if(btn.disabled)return;
     const api=window.BDZAdmin;
     if(api?.setTab)api.setTab(btn.dataset.tab);
     if(mobile())close();
   },{capture:false});
 });
}
function referenceDashboard(){
 const host=document.getElementById('tabContent');
 if(!host||String(document.getElementById('tabTitle')?.textContent||'').toLowerCase()!=='dashboard')return;
 fetch('/api/admin/dashboard',{credentials:'include',cache:'no-store',headers:{accept:'application/json'}}).then(r=>r.json().then(d=>({ok:r.ok,d}))).then(({d})=>{
   if(!d?.stats)return;
   const s=d.stats||{};
   const card=(icon,label,value)=>`<article class="ref-stat-card"><div class="ref-stat-icon"><i class="fa-solid ${icon}"></i></div><div class="ref-stat-copy"><div>${label}</div><strong>${Number(value??0)}</strong></div></article>`;
   const total=Number(s.total_keys||0),active=Number(s.active_keys||0),expired=Number(s.expired_keys||0),revoked=Number(s.revoked_keys||0);
   const max=Math.max(1,total,active,expired,revoked);
   const vals=[total,active,expired,revoked], xs=[54,172,290,408], pts=vals.map((v,i)=>`${xs[i]},${174-(v/max)*118}`).join(' ');
   host.innerHTML=`<section class="ref-dashboard-head"><div><div class="ref-kicker">BDZTEAM ADMIN</div><h2>DASHBOARD</h2><p>Tổng quan hệ thống và trạng thái xác thực Key</p></div><div class="ref-head-meta"><span>Hệ thống</span><strong>BDZTEAM</strong></div></section><section class="ref-stat-grid">${card('fa-key','TỔNG KEY',total)}${card('fa-bolt','ĐANG HOẠT ĐỘNG',active)}${card('fa-clock','HẾT HẠN',expired)}${card('fa-ban','ĐÃ KHÓA',revoked)}</section><section class="ref-lower-grid"><article class="ref-panel ref-chart-panel"><header><div><h3><i class="fa-solid fa-chart-line"></i> THỐNG KÊ LƯU LƯỢNG</h3><p>Trạng thái Key trong hệ thống</p></div><span class="ref-mini-badge">TỔNG QUAN</span></header><div class="ref-chart-wrap"><svg class="ref-chart" viewBox="0 0 430 210" role="img" aria-label="Biểu đồ thống kê"><line x1="54" y1="174" x2="408" y2="174"/><line x1="54" y1="115" x2="408" y2="115"/><line x1="54" y1="56" x2="408" y2="56"/><polyline points="${pts}"/>${vals.map((v,i)=>`<circle cx="${xs[i]}" cy="${174-(v/max)*118}" r="4"/>`).join('')}<g class="ref-chart-labels"><text x="54" y="198" text-anchor="middle">Tổng</text><text x="172" y="198" text-anchor="middle">Active</text><text x="290" y="198" text-anchor="middle">Hết hạn</text><text x="408" y="198" text-anchor="middle">Khóa</text></g></svg></div></article><article class="ref-panel ref-notice-panel"><header><h3><i class="fa-regular fa-bell"></i> THÔNG BÁO HỆ THỐNG</h3></header><div class="ref-notices"><div><b>Shortener</b><span>Link4M + TrafficVN</span></div><div><b>Cơ sở dữ liệu</b><span>Supabase</span></div><div><b>Bảo mật</b><span>Cloudflare Turnstile</span></div><div><b>Backend</b><span>Vercel Functions</span></div></div></article></section>`;
 }).catch(()=>{});
}
function start(){bindShell();bindTabs();setTimeout(referenceDashboard,600);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
