(()=>{
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt=v=>v?new Date(v).toLocaleString('vi-VN'):'—';
  let raf=0;
  const enhance=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{
    if(typeof state==='undefined'||state.tab!=='keys')return;
    const table=document.querySelector('#tabContent table'); if(!table)return;
    const head=table.querySelector('thead tr'), body=table.querySelector('tbody');
    if(head&&!head.querySelector('[data-col="key-meta"]')){
      const th=document.createElement('th'); th.dataset.col='key-meta'; th.textContent='IP / Kích hoạt'; head.appendChild(th);
    }
    const rows=[...(body?.querySelectorAll('tr')||[])], data=Array.isArray(state.data?.keys)?state.data.keys:[];
    rows.forEach((tr,i)=>{
      if(!data[i])return;
      let td=tr.querySelector('[data-key-meta]');
      if(!td){td=document.createElement('td');td.dataset.keyMeta='1';tr.appendChild(td)}
      const k=data[i];
      td.innerHTML=`<div class="text-[10px] leading-5 break-all"><b>Claim IP:</b> ${esc(k.claimed_ip||'—')}<br><b>Active IP:</b> ${esc(k.activated_ip||'—')}<br><b>Kích hoạt:</b> ${esc(fmt(k.activated_at))}</div>`;
    });
  })};
  document.addEventListener('DOMContentLoaded',()=>{
    const root=document.getElementById('tabContent'); if(!root)return;
    new MutationObserver(enhance).observe(root,{childList:true,subtree:true});
    enhance();
  },{once:true});
})();
