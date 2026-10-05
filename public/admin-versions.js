var versionRows=[];
async function loadVersions(){
  try{
    const x=await BDZ.rpc('bdz_admin_versions',{p_token:tok(),p_action:'list'});
    if(!x||!x.ok){
      versionRows=[];
      if($('verRows'))$('verRows').innerHTML='<tr><td colspan="6" style="color:var(--muted)">'+(x&&x.error?esc(x.error):'Chưa có bảng — chạy SQL sql_app_versions.sql')+'</td></tr>';
      return;
    }
    versionRows=x.rows||[];
    renderVersions();
  }catch(e){
    if($('verRows'))$('verRows').innerHTML='<tr><td colspan="6" style="color:var(--muted)">'+esc(e.message||'Lỗi')+'</td></tr>';
  }
}
function renderVersions(){
  const tb=$('verRows'); if(!tb) return;
  const q=(($('verQ')&&$('verQ').value)||'').trim().toLowerCase();
  const r=versionRows.filter(v=>!q||String(v.app_id).toLowerCase().includes(q)||String(v.version).toLowerCase().includes(q));
  tb.innerHTML=r.map(v=>`<tr>
    <td class="mono">${esc(v.app_id)}</td>
    <td class="mono"><b>${esc(v.version)}</b></td>
    <td><span class="tag ${v.enabled?'on':'off'}">${v.enabled?'Bật':'Tắt'}</span></td>
    <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;font-size:11px">${v.download_url?esc(v.download_url):'—'}</td>
    <td style="font-size:12px;color:var(--muted)">${esc(v.note||'—')}</td>
    <td><button class="btn sm" data-vid="${v.id}">⋮</button></td>
  </tr>`).join('')||'<tr><td colspan="6" style="color:var(--muted)">Chưa có version — bấm + Thêm version</td></tr>';
  tb.querySelectorAll('[data-vid]').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const id=+b.dataset.vid;
    const v=versionRows.find(x=>x.id===id);
    if(!v)return;
    const r=b.getBoundingClientRect();
    $('menuRoot').innerHTML=`<div class="menu" style="position:fixed;top:${r.bottom+4}px;left:${Math.min(r.left,window.innerWidth-160)}px;z-index:200;background:var(--card);border:1px solid var(--line);border-radius:4px;min-width:140px;padding:4px">
      <button class="menu-item" data-a="edit">Sửa</button>
      <button class="menu-item" data-a="toggle">${v.enabled?'Tắt':'Bật'}</button>
      <button class="menu-item danger" data-a="del">Xóa</button>
    </div>`;
    document.querySelectorAll('#menuRoot .menu-item').forEach(m=>m.onclick=async ev=>{
      ev.stopPropagation();$('menuRoot').innerHTML='';
      try{
        if(m.dataset.a==='edit')return modalVersion(v);
        if(m.dataset.a==='toggle'){
          await BDZ.rpc('bdz_admin_versions',{p_token:tok(),p_action:'update',p_payload:{id:v.id,enabled:!v.enabled}});
          loadVersions();
        }
        if(m.dataset.a==='del'){
          if(!confirm('Xóa version '+v.version+'?'))return;
          await BDZ.rpc('bdz_admin_versions',{p_token:tok(),p_action:'delete',p_payload:{id:v.id}});
          loadVersions();
        }
      }catch(err){alert(err.message)}
    });
  });
}
function modalVersion(v){
  const isEdit=!!v, root=$('modalRoot');
  root.innerHTML=`<div class="modal-bg"><div class="modal">
    <h3>${isEdit?'Sửa version':'Thêm version'}</h3>
    <div class="field"><label>App ID</label><input id="vApp" class="input" value="${isEdit?esc(v.app_id):'default'}" placeholder="default hoặc tên app"></div>
    <div class="field"><label>Version</label><input id="vCode" class="input" value="${isEdit?esc(v.version):''}" placeholder="vd: 1.0.0"></div>
    <div class="field"><label>Trạng thái</label><select id="vEn" class="select">
      <option value="true" ${!isEdit||v.enabled?'selected':''}>Bật — cho app dùng</option>
      <option value="false" ${isEdit&&!v.enabled?'selected':''}>Tắt — bắt update</option>
    </select></div>
    <div class="field"><label>Link tải (khi bắt update)</label><input id="vUrl" class="input" value="${isEdit?esc(v.download_url||''):''}" placeholder="https://..."></div>
    <div class="field"><label>Ghi chú</label><input id="vNote" class="input" value="${isEdit?esc(v.note||''):''}" placeholder="vd: Fix lỗi login"></div>
    <div class="modal-actions"><button class="btn" id="vCancel">Hủy</button><button class="btn primary" id="vOk">Lưu</button></div>
  </div></div>`;
  $('vCancel').onclick=()=>root.innerHTML='';
  $('vOk').onclick=async()=>{
    try{
      const payload={
        app_id:$('vApp').value.trim()||'default',
        version:$('vCode').value.trim(),
        enabled:$('vEn').value==='true',
        download_url:$('vUrl').value.trim(),
        note:$('vNote').value.trim()
      };
      if(!payload.version)throw Error('Nhập version');
      if(isEdit){payload.id=v.id;await BDZ.rpc('bdz_admin_versions',{p_token:tok(),p_action:'update',p_payload:payload})}
      else{await BDZ.rpc('bdz_admin_versions',{p_token:tok(),p_action:'create',p_payload:payload})}
      root.innerHTML='';loadVersions();
    }catch(e){alert(e.message)}
  };
}
