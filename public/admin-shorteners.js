(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));
const tok=()=>sessionStorage.getItem('bdz_t')||'';
let items=[];

function ensurePanel(){
  if($('shortenerPanel')) return;
  const page=$('pg-settings');
  if(!page) return;
  const box=document.createElement('div');
  box.className='card';
  box.id='shortenerPanel';
  box.style.marginTop='16px';
  box.innerHTML=`
    <div class="section-head">
      <div>
        <h2>API rút gọn (Get Key theo phiên)</h2>
        <p class="hint">Số thứ tự càng nhỏ = ưu tiên càng cao. Chỉ API <b>Bật</b> mới đưa vào chuỗi phiên. Mỗi phiên cần captcha toán.</p>
      </div>
      <button type="button" id="btnAddShortener" class="btn primary sm">+ Thêm API</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:70px">STT</th>
            <th>Tên</th>
            <th>Provider</th>
            <th>Base URL</th>
            <th>Token</th>
            <th>TT</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="shortenerRows"></tbody>
      </table>
    </div>`;
  page.appendChild(box);
  if($('btnAddShortener')) $('btnAddShortener').onclick=()=>modalShortener();
}

function render(){
  const tb=$('shortenerRows');
  if(!tb) return;
  if(!items.length){
    tb.innerHTML='<tr><td colspan="7" style="color:var(--muted-fg,var(--muted))">Chưa có API — thêm Vượt Nhanh / Link4M…</td></tr>';
    return;
  }
  tb.innerHTML=items.map(it=>`<tr>
    <td><input class="input so" data-id="${it.id}" type="number" value="${esc(it.sort_order)}" style="width:64px;min-height:32px"></td>
    <td>${esc(it.name||'')}</td>
    <td class="mono" style="font-size:12px">${esc(it.provider||'')}</td>
    <td style="font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis">${esc(it.base_url||'')}</td>
    <td class="mono" style="font-size:11px">${esc((it.api_token||'').slice(0,10))}…</td>
    <td><span class="tag ${it.enabled?'on':'off'}">${it.enabled?'Bật':'Tắt'}</span></td>
    <td style="white-space:nowrap">
      <button class="btn sm" data-edit="${it.id}">Sửa</button>
      <button class="btn sm" data-toggle="${it.id}">${it.enabled?'Tắt':'Bật'}</button>
      <button class="btn sm danger" data-del="${it.id}">Xóa</button>
    </td>
  </tr>`).join('');

  tb.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{
    const it=items.find(x=>String(x.id)===b.dataset.edit);
    if(it) modalShortener(it);
  });
  tb.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{
    try{
      const x=await BDZ.rpc('bdz_admin_shorteners',{p_token:tok(),p_action:'toggle',p_payload:{id:+b.dataset.toggle}});
      if(!x||!x.ok) throw Error(x&&x.error||'Lỗi');
      await loadShorteners();
    }catch(e){alert(e.message)}
  });
  tb.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Xóa API này?')) return;
    try{
      const x=await BDZ.rpc('bdz_admin_shorteners',{p_token:tok(),p_action:'delete',p_payload:{id:+b.dataset.del}});
      if(!x||!x.ok) throw Error(x&&x.error||'Lỗi');
      await loadShorteners();
    }catch(e){alert(e.message)}
  });
  tb.querySelectorAll('input.so').forEach(inp=>{
    inp.onchange=async()=>{
      const id=+inp.dataset.id;
      const it=items.find(x=>x.id===id);
      if(!it) return;
      try{
        const x=await BDZ.rpc('bdz_admin_shorteners',{p_token:tok(),p_action:'upsert',p_payload:{
          id, provider:it.provider, name:it.name, base_url:it.base_url, api_token:it.api_token,
          enabled:it.enabled, sort_order:+inp.value||100
        }});
        if(!x||!x.ok) throw Error(x&&x.error||'Lỗi');
        await loadShorteners();
      }catch(e){alert(e.message)}
    };
  });
}

function modalShortener(it){
  const root=$('modalRoot'); if(!root) return;
  const isEdit=!!(it&&it.id);
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:min(480px,100%)">
    <h3>${isEdit?'Sửa API rút gọn':'Thêm API rút gọn'}</h3>
    <div class="field"><label>Tên hiển thị</label><input id="sName" class="input" value="${esc(it&&it.name||'')}" placeholder="Vượt Nhanh / Link4M"></div>
    <div class="field"><label>Provider</label><input id="sProv" class="input" value="${esc(it&&it.provider||'vuotnhanh')}" placeholder="vuotnhanh | link4m | custom"></div>
    <div class="field"><label>Base URL API</label><input id="sUrl" class="input" value="${esc(it&&it.base_url||'')}" placeholder="https://vuotnhanh.com/api"></div>
    <div class="field"><label>API Token</label><input id="sTok" class="input" value="${esc(it&&it.api_token||'')}"></div>
    <div class="grid2">
      <div class="field"><label>Thứ tự (nhỏ = ưu tiên cao)</label><input id="sOrder" class="input" type="number" value="${esc(it&&it.sort_order!=null?it.sort_order:10)}"></div>
      <div class="field"><label>Trạng thái</label><select id="sEn" class="select"><option value="true" ${!it||it.enabled?'selected':''}>Bật</option><option value="false" ${it&&!it.enabled?'selected':''}>Tắt</option></select></div>
    </div>
    <p class="hint">Link4M: <code>https://link4m.co/api-shorten/v2</code> · Vượt Nhanh: <code>https://vuotnhanh.com/api</code></p>
    <div class="modal-actions"><button class="btn" id="mCancel">Hủy</button><button class="btn primary" id="mOk">Lưu</button></div>
  </div></div>`;
  $('mCancel').onclick=()=>{ if(typeof closeModalSmooth==='function') closeModalSmooth(root); else root.innerHTML=''; };
  $('mOk').onclick=async()=>{
    try{
      const payload={
        id: isEdit?it.id:undefined,
        name: $('sName').value.trim()||'API',
        provider: $('sProv').value.trim()||'custom',
        base_url: $('sUrl').value.trim(),
        api_token: $('sTok').value.trim(),
        sort_order: +$('sOrder').value||100,
        enabled: $('sEn').value==='true'
      };
      if(!payload.base_url||!payload.api_token) throw Error('Nhập Base URL và API Token');
      const x=await BDZ.rpc('bdz_admin_shorteners',{p_token:tok(),p_action:'upsert',p_payload:payload});
      if(!x||!x.ok) throw Error(x&&x.error||'Lỗi');
      if(typeof closeModalSmooth==='function') closeModalSmooth(root); else root.innerHTML='';
      await loadShorteners();
    }catch(e){alert(e.message)}
  };
}

async function loadShorteners(){
  ensurePanel();
  if(!tok()) return;
  try{
    const x=await BDZ.rpc('bdz_admin_shorteners',{p_token:tok(),p_action:'list'});
    if(!x||!x.ok){items=[];render();return;}
    items=x.items||[];
    render();
  }catch(e){console.warn(e)}
}

window.loadShorteners=loadShorteners;
document.addEventListener('bdz:admin-ready', loadShorteners);
(async()=>{
  for(let i=0;i<60;i++){ if($('pg-settings')) break; await new Promise(r=>setTimeout(r,100)); }
  ensurePanel();
  if(tok()) loadShorteners();
})();
})();
