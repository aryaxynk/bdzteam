(()=>{
  'use strict';
  const root=()=>document.getElementById('tabContent');
  const title=()=>String(document.getElementById('tabTitle')?.textContent||'').trim().toLowerCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  let lastSignature='';
  function readStats(el){
    const cards=[...el.querySelectorAll('.admin-panel')].slice(0,4);
    return cards.map(card=>({
      icon:card.querySelector('i')?.className||'fa-solid fa-chart-line',
      value:(card.querySelector('.text-2xl,.text-3xl')?.textContent||'0').trim(),
      label:(card.querySelector('.text-xs')?.textContent||'').trim()
    }));
  }
  function buildChart(values){
    const nums=values.map(v=>{const n=Number(String(v).replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.max(0,n):0});
    const max=Math.max(1,...nums), pts=nums.map((n,i)=>{
      const x=54+i*92;
      const y=174-(n/max)*118;
      return `${x},${y.toFixed(1)}`;
    }).join(' ');
    return `<div class="ref-chart-wrap"><svg class="ref-chart" viewBox="0 0 430 210" role="img" aria-label="Biểu đồ tổng quan thống kê hệ thống"><line x1="54" y1="174" x2="408" y2="174"/><line x1="54" y1="115" x2="408" y2="115"/><line x1="54" y1="56" x2="408" y2="56"/><polyline points="${pts}"/><g class="ref-chart-dots">${nums.map((n,i)=>{const x=54+i*92,y=174-(n/max)*118;return `<circle cx="${x}" cy="${y.toFixed(1)}" r="4"/>`}).join('')}</g><g class="ref-chart-labels">${['Tổng','Active','Hết hạn','Khóa'].map((x,i)=>`<text x="${54+i*92}" y="198" text-anchor="middle">${x}</text>`).join('')}</g></svg></div>`;
  }
  function dashboard(el){
    const stats=readStats(el);
    const values=stats.map(x=>x.value);
    const cards=stats.length?stats:[
      {icon:'fa-solid fa-key',value:'0',label:'Tổng Key'},
      {icon:'fa-solid fa-bolt',value:'0',label:'Đang hoạt động'},
      {icon:'fa-solid fa-clock',value:'0',label:'Hết hạn'},
      {icon:'fa-solid fa-ban',value:'0',label:'Đã khóa'}
    ];
    const slots=Object.values(document.querySelectorAll?.('[data-tab="shortener"]')||{}).length;
    el.innerHTML=`
      <section class="ref-dashboard-head">
        <div><div class="ref-kicker">BDZTEAM ADMIN</div><h2>DASHBOARD</h2><p>Tổng quan hệ thống và trạng thái xác thực Key</p></div>
        <div class="ref-head-meta"><span>Hệ thống</span><strong>BDZTEAM</strong></div>
      </section>
      <section class="ref-stat-grid">${cards.map(x=>`<article class="ref-stat-card"><div class="ref-stat-icon"><i class="${esc(x.icon)}"></i></div><div class="ref-stat-copy"><div>${esc(x.label||'Thống kê')}</div><strong>${esc(x.value||'0')}</strong></div></article>`).join('')}</section>
      <section class="ref-lower-grid">
        <article class="ref-panel ref-chart-panel"><header><div><h3><i class="fa-solid fa-chart-line"></i> THỐNG KÊ HỆ THỐNG</h3><p>Phân bố hiện tại của các trạng thái Key</p></div><span class="ref-mini-badge">TỔNG QUAN</span></header>${buildChart(values)}</article>
        <article class="ref-panel ref-notice-panel"><header><h3><i class="fa-regular fa-bell"></i> THÔNG BÁO HỆ THỐNG</h3></header><div class="ref-notices"><div><b>API Shortener</b><span>Link4M + TrafficVN</span></div><div><b>Cơ sở dữ liệu</b><span>Supabase đang được sử dụng</span></div><div><b>Bảo vệ truy cập</b><span>Cloudflare Turnstile</span></div><div><b>Kiến trúc</b><span>Vercel Functions + backend tách lớp</span></div></div></article>
      </section>`;
    lastSignature='dashboard:'+cards.map(x=>x.value+'|'+x.label).join('~');
  }
  function enhance(){
    const el=root();
    if(!el||title()!=='dashboard')return;
    if(el.dataset.refUi==='1')return;
    const sig=el.textContent.slice(0,500);
    if(!sig)return;
    dashboard(el);
    el.dataset.refUi='1';
  }
  const obs=new MutationObserver(()=>{
    const el=root();
    if(el?.dataset.refUi==='1' && title()!=='dashboard') delete el.dataset.refUi;
    requestAnimationFrame(enhance);
  });
  obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('load',()=>setTimeout(enhance,50));
})();
