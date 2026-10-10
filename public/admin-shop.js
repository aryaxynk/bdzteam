var shopRows=[];
async function loadShop(){
  try{
    const x=await BDZ.rpc('bdz_admin_shop',{p_token:tok(),p_action:'list'});
    if(!x||!x.ok){
      shopRows=[];
      if($('shopRows'))$('shopRows').innerHTML='<tr><td colspan="7" style="color:var(--muted)">'+(x&&x.error?esc(x.error):'Chưa có bảng shop')+'</td></tr>';
      return;
    }
    shopRows=x.rows||[];
    renderShop();
  }catch(e){
    if($('shopRows'))$('shopRows').innerHTML='<tr><td colspan="7" style="color:var(--muted)">'+esc(e.message||'Lỗi')+'</td></tr>';
  }
}
function renderShop(){
  const tb=$('shopRows'); if(!tb) return;
  const q=(($('shopQAdm')&&$('shopQAdm').value)||'').trim().toLowerCase();
  const r=shopRows.filter(p=>!q||String(p.name).toLowerCase().includes(q)||String(p.code).toLowerCase().includes(q));
  tb.innerHTML=r.map(p=>`<tr>
    <td class="mono">${esc(p.code)}</td>
    <td><b>${esc(p.name)}</b></td>
    <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;font-size:11px">${p.image_url?'<a href="'+esc(p.image_url)+'" target="_blank" rel="noopener">Ảnh</a>':'—'}</td>
    <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;font-size:11px"><a href="${esc(p.download_url)}" target="_blank" rel="noopener">Link</a></td>
    <td><span class="tag ${p.enabled?'on':'off'}">${p.enabled?'Bật':'Tắt'}</span></td>
    <td style="font-size:12px;color:var(--muted)">${esc(p.description||'—')}</td>
    <td><button class="btn sm" data-sid="${p.id}">⋮</button></td>
  </tr>`).join('')||'<tr><td colspan="7" style="color:var(--muted)">Chưa có sản phẩm — bấm + Thêm</td></tr>';
  tb.querySelectorAll('[data-sid]').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const id=+b.dataset.sid;
    const p=shopRows.find(x=>x.id===id);
    if(!p)return;
    const rect=b.getBoundingClientRect();
    $('menuRoot').innerHTML=`<div class="menu" style="position:fixed;top:${rect.bottom+4}px;left:${Math.min(rect.left,window.innerWidth-160)}px;z-index:200;background:var(--card);border:1px solid var(--line);border-radius:4px;min-width:140px;padding:4px">
      <button class="menu-item" data-a="edit">Sửa</button>
      <button class="menu-item" data-a="toggle">${p.enabled?'Tắt':'Bật'}</button>
      <button class="menu-item danger" data-a="del">Xóa</button>
    </div>`;
    document.querySelectorAll('#menuRoot .menu-item').forEach(m=>m.onclick=async ev=>{
      ev.stopPropagation();$('menuRoot').innerHTML='';
      try{
        if(m.dataset.a==='edit')return modalShop(p);
        if(m.dataset.a==='toggle'){
          await BDZ.rpc('bdz_admin_shop',{p_token:tok(),p_action:'update',p_payload:{id:p.id,enabled:!p.enabled}});
          loadShop();
        }
        if(m.dataset.a==='del'){
          if(!confirm('Xóa '+p.name+'?'))return;
          await BDZ.rpc('bdz_admin_shop',{p_token:tok(),p_action:'delete',p_payload:{id:p.id}});
          loadShop();
        }
      }catch(err){alert(err.message)}
    });
  });
}
function modalShop(p){
  const isEdit=!!p, root=$('modalRoot');
  root.innerHTML=`<div class="modal-bg"><div class="modal">
    <h3>${isEdit?'Sửa sản phẩm':'Thêm sản phẩm'}</h3>
    ${isEdit?`<p class="hint" style="margin:0 0 12px">Mã: <b class="mono">${esc(p.code)}</b> (không đổi)</p>`:''}
    <div class="field"><label>Tên sản phẩm *</label><input id="sName" class="input" value="${isEdit?esc(p.name):''}" placeholder="vd: Menu V2 Free Fire"></div>
    <div class="field"><label>Link tải *</label><input id="sUrl" class="input" value="${isEdit?esc(p.download_url||''):''}" placeholder="https://..."></div>
    <div class="field"><label>Ảnh (tuỳ chọn)</label><input id="sImg" class="input" value="${isEdit?esc(p.image_url||''):''}" placeholder="https://...jpg"></div>
    <div class="field"><label>Mô tả (tuỳ chọn)</label><input id="sDesc" class="input" value="${isEdit?esc(p.description||''):''}" placeholder="Thông tin ngắn"></div>
    <div class="field"><label>Trạng thái</label><select id="sEn" class="select">
      <option value="true" ${!isEdit||p.enabled?'selected':''}>Bật — hiện public</option>
      <option value="false" ${isEdit&&!p.enabled?'selected':''}>Tắt — ẩn</option>
    </select></div>
    <div class="modal-actions"><button class="btn" id="sCancel">Hủy</button><button class="btn primary" id="sOk">Lưu</button></div>
  </div></div>`;
  $('sCancel').onclick=()=>root.innerHTML='';
  $('sOk').onclick=async()=>{
    try{
      const payload={
        name:($('sName').value||'').trim(),
        download_url:($('sUrl').value||'').trim(),
        image_url:($('sImg').value||'').trim(),
        description:($('sDesc').value||'').trim(),
        enabled:$('sEn').value==='true'
      };
      if(!payload.name)throw Error('Nhập tên sản phẩm');
      if(!payload.download_url)throw Error('Nhập link tải');
      if(isEdit){
        payload.id=p.id;
        await BDZ.rpc('bdz_admin_shop',{p_token:tok(),p_action:'update',p_payload:payload});
      }else{
        await BDZ.rpc('bdz_admin_shop',{p_token:tok(),p_action:'create',p_payload:payload});
      }
      root.innerHTML='';
      loadShop();
    }catch(e){alert(e.message)}
  };
}
