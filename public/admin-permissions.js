(()=>{
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('vi-VN',{hour12:false})};
  const msg=e=>e instanceof Error?e.message:e&&typeof e==='object'?(e.error||e.message||e.detail||JSON.stringify(e)):String(e??'');
  const api=async(body)=>{const r=await fetch('/api/admin/action',{method:'POST',credentials:'include',cache:'no-store',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify(body)});const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={error:t||`HTTP ${r.status}`}}if(!r.ok||d.ok===false)throw Error(msg(d)||`HTTP ${r.status}`);return d};
  let loaded=false;
  let state={admins:[],permissions:{}};
  function panel(){return $$('section.panel').find(x=>(x.querySelector('h2')?.textContent||'').trim()==='Admin phụ')||null}
  function closeMenus(except){$$('.sub-menu').forEach(x=>{if(x!==except)x.remove()})}
  function closeEditor(){const e=$('#sub-editor-root');if(e)e.remove()}
  function openEditor(a){
    closeMenus();closeEditor();
    const defs=state.permissions||{};const p=a.permissions||{};
    const root=document.createElement('div');root.id='sub-editor-root';root.className='sub-editor-backdrop';
    root.innerHTML=`<section class="sub-editor" role="dialog" aria-modal="true"><div class="sub-editor-head"><div><h3>Sửa Admin phụ</h3><p>Chỉnh thông tin và quyền Key cho tài khoản này.</p></div><button class="sub-editor-close" type="button" aria-label="Đóng">×</button></div><div class="sub-editor-body"><div class="sub-info-grid"><div class="sub-info-card"><span>Tên đăng nhập</span><b>${esc(a.username)}</b></div><div class="sub-info-card"><span>Trạng thái</span><b>${esc(a.status)}</b></div><div class="sub-info-card"><span>Ngày tạo</span><b>${fmt(a.created_at)}</b></div><div class="sub-info-card"><span>Đăng nhập cuối</span><b>${fmt(a.last_login)}</b></div></div><div class="sub-section-title">Thông tin</div><div class="sub-info-card sub-readonly"><span>Ghi chú / thông tin hiện tại</span><b>${esc(a.note||'Chưa có ghi chú')}</b></div><div class="sub-section-title">Key & phân quyền</div><div class="perm-grid">${Object.keys(defs).map(k=>`<label class="perm-item"><input type="checkbox" data-editor-perm="${esc(k)}" ${p[k]!==false?'checked':''}><span><b>${esc(defs[k].label||k)}</b></span></label>`).join('')}</div><div class="sub-editor-actions"><button class="btn sm" data-editor-cancel>Đóng</button><button class="btn primary" data-editor-save data-id="${a.id}">Lưu thay đổi</button></div></div></section>`;
    document.body.appendChild(root);
    root.querySelector('.sub-editor-close').onclick=closeEditor;
    root.querySelector('[data-editor-cancel]').onclick=closeEditor;
    root.onclick=e=>{if(e.target===root)closeEditor()};
    const master=root.querySelector('[data-editor-perm="manage_keys"]');
    master?.addEventListener('change',()=>{if(!master.checked)root.querySelectorAll('[data-editor-perm]:not([data-editor-perm="manage_keys"])').forEach(x=>x.checked=false)});
    root.querySelector('[data-editor-save]').onclick=async()=>{
      const btn=root.querySelector('[data-editor-save]');const permissions={};root.querySelectorAll('[data-editor-perm]').forEach(x=>permissions[x.dataset.editorPerm]=x.checked);
      btn.disabled=true;btn.textContent='Đang lưu...';
      try{await api({action:'update_sub_admin_permissions',sub_id:Number(a.id),permissions});btn.textContent='Đã lưu';await load();setTimeout(closeEditor,450)}catch(e){btn.disabled=false;btn.textContent='Lưu thay đổi';alert(msg(e)||'Không thể lưu thay đổi.')}
    };
  }
  function menu(a,anchor){
    closeMenus();
    const m=document.createElement('div');m.className='sub-menu';
    const toggle=a.status==='LOCKED'?'Mở khóa':'Khóa';
    m.innerHTML=`<button type="button" data-sub-edit>Sửa Admin phụ</button><button type="button" data-sub-perm>Phân quyền Key</button><button type="button" data-sub-toggle>${toggle}</button><button type="button" data-sub-delete class="danger-text">Xóa Admin phụ</button>`;
    anchor.closest('.sub-perm-card').appendChild(m);
    m.querySelector('[data-sub-edit]').onclick=()=>openEditor(a);
    m.querySelector('[data-sub-perm]').onclick=()=>openEditor(a);
    m.querySelector('[data-sub-toggle]').onclick=async()=>{try{await api({action:'toggle_sub_admin',sub_id:Number(a.id)});await load()}catch(e){alert(msg(e)||'Không thể đổi trạng thái Admin phụ.')}};
    m.querySelector('[data-sub-delete]').onclick=async()=>{if(!confirm(`Xóa Admin phụ "${a.username}"? Hành động này không thể hoàn tác.`))return;try{await api({action:'delete_sub_admin',sub_id:Number(a.id)});await load()}catch(e){alert(msg(e)||'Không thể xóa Admin phụ.')}};
  }
  function render(){
    const p=panel();if(!p)return;
    const list=p.querySelector('.list');if(!list)return;
    const admins=state.admins||[];
    list.className='sub-permissions-body';
    if(!admins.length){list.innerHTML='<div class="empty">Chưa có Admin phụ.</div>';return}
    list.innerHTML=admins.map(a=>{
      const p=a.permissions||{};const count=Object.values(p).filter(Boolean).length;const total=Object.keys(state.permissions||{}).length;
      return `<div class="sub-perm-card" data-sub-card="${a.id}"><div class="sub-perm-main"><div class="sub-perm-name"><b>${esc(a.display_name||a.username)}</b><span class="sub-admin-badge ${a.status==='ACTIVE'?'active':'locked'}">${esc(a.status)}</span></div><small>@${esc(a.username)} · tạo ${fmt(a.created_at)} · login ${fmt(a.last_login)}</small><div class="sub-perm-meta"><span class="sub-admin-badge">Key ${count}/${total} quyền</span>${a.note?`<span class="sub-admin-badge">${esc(a.note)}</span>`:''}</div></div><div class="sub-perm-actions"><button class="sub-dots" type="button" aria-label="Tùy chọn Admin phụ">⋮</button></div></div>`;
    }).join('');
    admins.forEach(a=>{const card=list.querySelector(`[data-sub-card="${a.id}"]`);const dots=card?.querySelector('.sub-dots');if(dots)dots.onclick=e=>{e.stopPropagation();menu(a,dots)};});
  }
  async function load(){
    try{const d=await api({action:'list_sub_admin_permissions'});state={admins:d.admins||[],permissions:d.permissions||{}};render();loaded=true;}catch(e){const p=panel();const list=p?.querySelector('.list');if(list)list.innerHTML=`<div class="empty">${esc(msg(e)||'Không thể tải danh sách Admin phụ.')}</div>`}
  }
  const observer=new MutationObserver(()=>{
    const title=($('#title')?.textContent||'').trim();
    const visible=title==='Admin'&&panel();
    if(visible){if(!loaded)load();}
    else{loaded=false;closeEditor();closeMenus()}
  });
  observer.observe(document.body,{subtree:true,childList:true});
  window.setTimeout(()=>{if(($('#title')?.textContent||'').trim()==='Admin')load()},350);
  document.addEventListener('click',e=>{if(!e.target.closest('.sub-perm-actions')&&!e.target.closest('.sub-menu'))closeMenus()});
})();
