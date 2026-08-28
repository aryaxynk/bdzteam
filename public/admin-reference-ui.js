(()=>{
  'use strict';
  const root=()=>document.getElementById('tabContent');
  const currentTab=()=>String(document.getElementById('tabTitle')?.textContent||'').trim().toLowerCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const monthNames=['','Tháng Một','Tháng Hai','Tháng Ba','Tháng Tư','Tháng Năm','Tháng Sáu','Tháng Bảy','Tháng Tám','Tháng Chín','Tháng Mười','Tháng Mười Một','Tháng Mười Hai'];
  function getSourceStats(el){
    const cards=[...el.querySelectorAll('.admin-panel')].slice(0,4);
    return cards.map((card,i)=>({
      icon:card.querySelector('i')?.className||['fa-solid fa-key','fa-solid fa-bolt','fa-solid fa-clock','fa-solid fa-ban'][i],
      value:(card.querySelector('.text-2xl,.text-3xl')?.textContent||'0').trim(),
      label:(card.querySelector('.text-xs')?.textContent||['Tổng Key','Đang hoạt động','Hết hạn','Đã khóa'][i]).trim()
    }));
  }
  function numeric(v){const n=Number(String(v).replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.max(0,n):0}
  function chart(values){
    const nums=values.map(numeric), max=Math.max(1,...nums), width=600, left=48, right=578, top=18, bottom=225;
    const span=Math.max(1,nums.length-1);
    const points=nums.map((n,i)=>{const x=left+(i/span)*(right-left),y=bottom-(n/max)*(bottom-top-22);return {x,y}});
    const poly=points.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const labels=['Tổng','Active','Hết hạn','Khóa'];
    const grid=[0,.2,.4,.6,.8,1].map((ratio,i)=>{const y=bottom-(bottom-top)*ratio;const val=Math.round(max*ratio);return `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}"/><text x="10" y="${y+3}" text-anchor="start">${val}</text>`}).join('');
    return `<div class="ref-chart-wrap"><svg class="ref-chart" viewBox="0 0 ${width} 250" role="img" aria-label="Biểu đồ thống kê hệ thống">${grid}<polyline points="${poly}"/>${points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4"/>`).join('')}${points.map((p,i)=>`<text class="ref-x-label" x="${p.x}" y="246" text-anchor="middle">${labels[i]||''}</text>`).join('')}</svg></div>`;
  }
  function monthLabel(){const d=new Date();return `${monthNames[d.getMonth()+1]}, ${d.getFullYear()}`}
  function dashboard(el){
    const source=getSourceStats(el);
    const fallback=[
      {icon:'fa-solid fa-key',value:'0',label:'Tổng Key'},
      {icon:'fa-solid fa-bolt',value:'0',label:'Đang hoạt động'},
      {icon:'fa-solid fa-clock',value:'0',label:'Hết hạn'},
      {icon:'fa-solid fa-ban',value:'0',label:'Đã khóa'}
    ];
    const cards=(source.length===4?source:fallback).map((x,i)=>({...x,label:['TỔNG KEY','KEY HOẠT ĐỘNG','KEY HẾT HẠN','KEY ĐÃ KHÓA'][i]}));
    el.innerHTML=`
      <section class="ref-dashboard-head">
        <div><h2>DASHBOARD</h2><p>Dữ liệu thống kê kỳ: <strong>${esc(monthLabel())}</strong></p></div>
        <button class="ref-period-select" type="button" aria-label="Kỳ thống kê"><span>${esc(monthLabel())}</span><i class="fa-solid fa-chevron-down"></i></button>
      </section>
      <section class="ref-stat-grid">${cards.map(x=>`<article class="ref-stat-card"><div class="ref-stat-icon"><i class="${esc(x.icon)}"></i></div><div class="ref-stat-copy"><div>${esc(x.label)}</div><strong>${esc(x.value||'0')}</strong></div></article>`).join('')}</section>
      <section class="ref-lower-grid">
        <article class="ref-panel ref-chart-panel"><header><div><h3><i class="fa-solid fa-chart-line"></i> BIỂU ĐỒ THỐNG KÊ HỆ THỐNG</h3></div></header>${chart(cards.map(x=>x.value))}</article>
        <article class="ref-panel ref-notice-panel"><header><h3><i class="fa-regular fa-bell"></i> THÔNG BÁO HỆ THỐNG</h3></header><div class="ref-notices"><div class="ref-notice-feature"><b>BDZTEAM THÔNG BÁO</b><span>Hệ thống cấp Key, xác thực và quản trị đang hoạt động trên Vercel + Supabase.</span></div><div><b>🔐 Bảo vệ truy cập</b><span>Cloudflare Turnstile, giới hạn tốc độ và kiểm soát IP đang được áp dụng.</span></div><div><b>🔗 Shortener</b><span>Chuỗi Shortener được cấu hình trong mục Quản Lý → Shortener.</span></div></div></article>
      </section>`;
  }
  function enhance(){
    const el=root();
    if(!el||currentTab()!=='dashboard'||el.dataset.refUi==='1')return;
    if(!el.textContent.trim())return;
    dashboard(el);
    el.dataset.refUi='1';
  }
  const observer=new MutationObserver(()=>{
    const el=root();
    if(el?.dataset.refUi==='1' && currentTab()!=='dashboard')delete el.dataset.refUi;
    requestAnimationFrame(enhance);
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('load',()=>setTimeout(enhance,80));
})();
