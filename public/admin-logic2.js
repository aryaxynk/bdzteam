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
