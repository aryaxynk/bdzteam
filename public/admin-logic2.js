function renderKeys(){
  const qEl=$('q'),fEl=$('filter');
  if(!qEl||!$('keyRows'))return;
  const q=qEl.value.trim().toLowerCase(),f=fEl?fEl.value:'';
  const r=rows.filter(k=>(!q||String(k.key_code).toLowerCase().includes(q))&&(!f||k.status===f));
  const empty='<tr><td colspan="6" style="color:var(--muted);text-align:center;padding:24px">Không có key</td></tr>';
  $('keyRows').innerHTML=r.map(k=>{
    const used=(k.devices_used!=null?k.devices_used:((k.device_id_hash||k.activated_device_id_hash)?1:0));
    const badge=k.created_by_name?`<span class="tag tag-admin" title="Admin tạo">Admin: ${esc(k.created_by_name)}</span>`:'';
    const st=ST_LABEL[k.status]||k.status;
    const on=['ACTIVE','REACTIVATED'].includes(k.status)?'on':'off';
    return `<tr>
      <td><input type="checkbox" class="kchk" value="${k.id}"></td>
      <td><div class="key-cell"><span class="mono key-code">${esc(k.key_code)}</span>${badge}</div></td>
      <td><span class="tag ${on}">${esc(st)}</span></td>
      <td class="nowrap">${used}/${k.max_devices||1}</td>
      <td class="nowrap muted-sm">${k.expires_at?new Date(k.expires_at).toLocaleString('vi-VN'):'—'}</td>
      <td><button type="button" class="btn sm icon-btn" data-menu="key" data-id="${k.id}" aria-label="Menu">⋮</button></td>
    </tr>`;
  }).join('')||empty;
  $('keyRows').querySelectorAll('[data-menu]').forEach(b=>b.onclick=e=>openRowMenu(e,+b.dataset.id,'key'));
  const cards=$('keyCards');
  if(cards){
    cards.innerHTML=r.length?r.map(k=>{
      const used=(k.devices_used!=null?k.devices_used:((k.device_id_hash||k.activated_device_id_hash)?1:0));
      const badge=k.created_by_name?`<span class="tag tag-admin">Admin: ${esc(k.created_by_name)}</span>`:'';
      const st=ST_LABEL[k.status]||k.status;
      const on=['ACTIVE','REACTIVATED'].includes(k.status)?'on':'off';
      const exp=k.expires_at?new Date(k.expires_at).toLocaleString('vi-VN'):'—';
      return `<article class="key-card">
        <div class="key-card-top">
          <label class="key-check"><input type="checkbox" class="kchk" value="${k.id}"></label>
          <div class="key-card-main">
            <span class="mono key-code">${esc(k.key_code)}</span>
            ${badge}
          </div>
          <button type="button" class="btn sm icon-btn" data-menu="key" data-id="${k.id}">⋮</button>
        </div>
        <div class="key-card-meta">
          <span class="tag ${on}">${esc(st)}</span>
          <span class="meta-item">Device ${used}/${k.max_devices||1}</span>
          <span class="meta-item">${esc(exp)}</span>
        </div>
      </article>`;
    }).join(''):'<p class="shop-empty" style="padding:20px">Không có key</p>';
    cards.querySelectorAll('[data-menu]').forEach(b=>b.onclick=e=>openRowMenu(e,+b.dataset.id,'key'));
  }
}
async function loadAdmins(){try{const x=await BDZ.rpc('bdz_admin_admins',{p_token:tok(),p_action:'list'});admins=(x&&x.rows)||(x&&x.admins)||[];renderAdmins()}catch(e){console.warn(e)}}
function renderAdmins(){
  const t=$('adminRows');if(!t)return;
  t.innerHTML=admins.length?admins.map(u=>`<tr>
    <td>${esc(u.username)}</td>
    <td>${esc(u.role||'')}</td>
    <td><span class="tag ${u.enabled!==false?'on':'off'}">${u.enabled!==false?'Bật':'Tắt'}</span></td>
    <td class="muted-sm">${u.last_login?new Date(u.last_login).toLocaleString('vi-VN'):'—'}</td>
    <td><button type="button" class="btn sm icon-btn" data-menu="admin" data-id="${u.id}">⋮</button></td>
  </tr>`).join(''):'<tr><td colspan="5" style="color:var(--muted);text-align:center;padding:20px">Chưa có admin phụ</td></tr>';
  t.querySelectorAll('[data-menu]').forEach(b=>b.onclick=e=>openRowMenu(e,+b.dataset.id,'admin'));
  const cards=$('adminCards');
  if(cards){
    cards.innerHTML=admins.length?admins.map(u=>`<article class="admin-card">
      <div class="admin-card-top">
        <div class="admin-card-main">
          <strong>${esc(u.username)}</strong>
          <span class="meta-item">${esc(u.role||'ADMIN')}</span>
        </div>
        <button type="button" class="btn sm icon-btn" data-menu="admin" data-id="${u.id}">⋮</button>
      </div>
      <div class="admin-card-meta">
        <span class="tag ${u.enabled!==false?'on':'off'}">${u.enabled!==false?'Bật':'Tắt'}</span>
        <span class="meta-item">${u.last_login?new Date(u.last_login).toLocaleString('vi-VN'):'Chưa login'}</span>
      </div>
    </article>`).join(''):'<p class="shop-empty" style="padding:16px">Chưa có admin phụ</p>';
    cards.querySelectorAll('[data-menu]').forEach(b=>b.onclick=e=>openRowMenu(e,+b.dataset.id,'admin'));
  }
}
function modalAdmin(u){const edit=!!u;const root=$('modalRoot');if(!root)return;root.innerHTML=`<div class="modal-bg"><div class="modal"><h3>${edit?'Sửa admin':'Tạo admin phụ'}</h3><div class="field"><label>Username</label><input id="maUser" class="input" value="${esc(u&&u.username||'')}"></div><div class="field"><label>Password ${edit?'(để trống = giữ)':''}</label><input id="maPass" class="input" type="password"></div><div class="modal-actions"><button class="btn ghost" id="maCancel">Hủy</button><button class="btn primary" id="maSave">Lưu</button></div></div></div>`;$('maCancel').onclick=()=>root.innerHTML='';$('maSave').onclick=async()=>{try{const payload={username:($('maUser').value||'').trim(),password:$('maPass').value||''};if(edit)payload.id=u.id;const x=await BDZ.rpc('bdz_admin_admins',{p_token:tok(),p_action:edit?'update':'create',p_payload:payload});if(!x||!x.ok)throw Error(x&&x.error||'Lỗi');root.innerHTML='';loadAdmins()}catch(e){alert(e.message)}}}
function modalPerms(u){alert('Phân quyền admin ID '+u.id)}
function modalKey(k){const edit=!!k;const root=$('modalRoot');if(!root)return;root.innerHTML=`<div class="modal-bg"><div class="modal"><h3>${edit?'Sửa key':'Tạo key'}</h3><div class="field"><label>Key code</label><input id="mkCode" class="input" value="${esc(k&&k.key_code||'')}" ${edit?'readonly':''}></div><div class="grid2"><div class="field"><label>Max devices</label><input id="mkDev" class="input" type="number" min="1" value="${k&&k.max_devices||1}"></div><div class="field"><label>Thời hạn (giờ)</label><input id="mkDur" class="input" type="number" min="1" value="${k&&k.duration_hours||settings.duration_hours||5}"></div></div><div class="modal-actions"><button class="btn ghost" id="mkCancel">Hủy</button><button class="btn primary" id="mkSave">Lưu</button></div></div></div>`;$('mkCancel').onclick=()=>root.innerHTML='';$('mkSave').onclick=async()=>{try{const payload={key_code:($('mkCode').value||'').trim(),max_devices:+$('mkDev').value||1,duration_hours:+$('mkDur').value||5};if(edit)payload.id=k.id;const action=edit?'update':'create';const x=await BDZ.rpc('bdz_admin_key_action',{p_token:tok(),p_action:action,p_payload:payload});if(!x||!x.ok)throw Error(x&&x.error||'Lỗi');root.innerHTML='';if(typeof load==='function')load(true)}catch(e){alert(e.message)}}}
async function loadSettings(){try{const x=await BDZ.rpc('bdz_admin_settings',{p_token:tok(),p_action:'get'});if(!x||!x.ok)return;settings=x.settings||x;if($('setDur'))$('setDur').value=settings.duration_hours||settings.key_duration_hours||5;if($('setDev'))$('setDev').value=settings.max_devices||1;if($('setLim'))$('setLim').value=settings.get_limit||settings.max_gets_per_visitor||3;if($('setIp'))$('setIp').value=String(settings.bind_ip!==false);if($('setBind'))$('setBind').value=String(settings.bind_device!==false)}catch(e){console.warn(e)}}
async function saveSettings(){const msg=$('saveMsg');if(msg)msg.textContent='Đang lưu…';try{const payload={duration_hours:+($('setDur')&&$('setDur').value||5),max_devices:+($('setDev')&&$('setDev').value||1),get_limit:+($('setLim')&&$('setLim').value||3),bind_ip:($('setIp')&&$('setIp').value)==='true',bind_device:($('setBind')&&$('setBind').value)==='true'};const x=await BDZ.rpc('bdz_admin_settings',{p_token:tok(),p_action:'save',p_payload:payload});if(!x||!x.ok)throw Error(x&&x.error||'Lỗi');if(msg)msg.textContent='Đã lưu';setTimeout(()=>{if(msg)msg.textContent=''},1500)}catch(e){if(msg)msg.textContent=e.message||'Lỗi'}}
function showLang(lang){document.querySelectorAll('.tab-lang').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang));const s=$('apiSample');const p=$('apiSpec');if(typeof SAMPLES!=='undefined'&&s)s.textContent=SAMPLES[lang]||'';if(typeof API_SPEC!=='undefined'&&p)p.textContent=API_SPEC}
const SAMPLES={java:'// Java — check key\n// POST check-key {key, device_id}',native:'// Native POST check-key',chung:'POST /functions/v1/check-key\n{ "key": "...", "device_id": "..." }'};
const API_SPEC='CHECK KEY\nPOST /functions/v1/check-key\nBody: key, device_id';
