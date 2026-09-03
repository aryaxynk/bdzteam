(()=>{
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const msg=e=>e instanceof Error?e.message:e&&typeof e==='object'?(e.error||e.message||e.detail||JSON.stringify(e)):String(e??'');
  const api=async(body)=>{
    const r=await fetch('/api/admin/action',{method:'POST',credentials:'include',cache:'no-store',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify(body)});
    const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={error:t||`HTTP ${r.status}`}};
    if(!r.ok||d.ok===false)throw Error(msg(d)||`HTTP ${r.status}`);return d;
  };
  let loaded=false;
  function shell(){
    const panel=$('#panel');
    if(!panel||$('#sub-permissions-panel'))return;
    const wrap=document.createElement('section');
    wrap.id='sub-permissions-panel';
    wrap.className='panel sub-permissions-panel';
    wrap.innerHTML='<div class="panel-head"><div><h2>Phân quyền Admin phụ</h2><p>Bật / tắt quyền quản lý Key cho từng tài khoản. Quyền được kiểm tra trực tiếp ở backend.</p></div></div><div class="sub-permissions-body"><div class="empty">Đang tải quyền...</div></div>';
    panel.appendChild(wrap);
  }
  function render(data){
    const body=$('.sub-permissions-body');if(!body)return;
    const admins=data.admins||[];const defs=data.permissions||{};
    if(!admins.length){body.innerHTML='<div class="empty">Chưa có Admin phụ.</div>';return;}
    body.innerHTML=admins.map(a=>{
      const p=a.permissions||{};
      const rows=Object.keys(defs).map(key=>`<label class="perm-item"><input type="checkbox" data-perm="${esc(key)}" ${p[key]!==false?'checked':''}><span><b>${esc(defs[key].label||key)}</b></span></label>`).join('');
      return `<div class="sub-perm-card" data-sub-card="${a.id}"><div class="sub-perm-head"><div><b>${esc(a.username)}</b><small>${esc(a.status)} · tạo ${new Date(a.created_at).toLocaleString('vi-VN',{hour12:false})}</small></div><span class="perm-state">${Object.values(p).filter(Boolean).length}/${Object.keys(defs).length}</span></div><div class="perm-grid">${rows}</div><div class="row-actions"><button class="btn primary sm" data-save-perm="${a.id}">Lưu quyền</button></div></div>`;
    }).join('');
    body.querySelectorAll('input[data-perm="manage_keys"]').forEach(cb=>{
      cb.addEventListener('change',()=>{
        const card=cb.closest('.sub-perm-card');
        card?.querySelectorAll('input[data-perm]:not([data-perm="manage_keys"])').forEach(x=>{x.checked=cb.checked&&x.checked; if(!cb.checked)x.checked=false;});
      });
    });
    body.querySelectorAll('[data-save-perm]').forEach(btn=>btn.onclick=async()=>{
      const card=btn.closest('.sub-perm-card');
      const permissions={};card?.querySelectorAll('input[data-perm]').forEach(x=>permissions[x.dataset.perm]=x.checked);
      btn.disabled=true;btn.textContent='Đang lưu...';
      try{
        await api({action:'update_sub_admin_permissions',sub_id:Number(btn.dataset.savePerm),permissions});
        btn.textContent='Đã lưu';
        setTimeout(()=>{btn.textContent='Lưu quyền';btn.disabled=false;},1200);
      }catch(e){btn.disabled=false;btn.textContent='Lưu quyền';alert(msg(e)||'Không thể lưu quyền.');}
    });
  }
  async function mount(){
    if(loaded||!document.body.textContent.includes('Admin phụ'))return;
    const panel=$('#panel');if(!panel)return;
    shell();
    try{const data=await api({action:'list_sub_admin_permissions'});render(data);loaded=true;}catch(e){const body=$('.sub-permissions-body');if(body)body.innerHTML=`<div class="empty">${esc(msg(e)||'Không thể tải quyền Admin phụ.')}</div>`;}
  }
  const observer=new MutationObserver(()=>{
    const title=$('#title')?.textContent||'';
    const visible=title.trim()==='Admin' && $('#panel');
    if(visible)mount(); else loaded=false;
  });
  observer.observe(document.body,{subtree:true,childList:true});
  window.setTimeout(mount,400);
})();
