(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));
const tok=()=>sessionStorage.getItem('bdz_t')||'';
let bans=[];

function injectBanTab(){
  const nav=$('navTabs'); if(!nav) return;
  if([...nav.querySelectorAll('.tab')].some(t=>t.dataset.p==='bans')) return;
  const b=document.createElement('button');
  b.className='tab'; b.dataset.p='bans'; b.textContent='Ban';
  b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.p==='bans'));document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='pg-bans'));if(typeof loadBans==='function')loadBans();};
  const setBtn=[...nav.querySelectorAll('.tab')].find(t=>t.dataset.p==='settings');
  if(setBtn) nav.insertBefore(b,setBtn); else nav.appendChild(b);
  if(!$('pg-bans')){
    const sec=document.createElement('section');
    sec.id='pg-bans'; sec.className='view';
    sec.innerHTML='<div class="card"><div class="section-head"><div><h2>Ban / Unban</h2><p class="hint">Spam get-key >3 lần/30s → ban 1 ngày</p></div><button id="btnBan" class="btn primary">+ Ban</button></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Lý do</th><th>Đến</th><th>TT</th><th>Note</th><th></th></tr></thead><tbody id="banRows"></tbody></table></div></div>';
    ($('pages')||document.body).appendChild(sec);
    if($('btnBan')) $('btnBan').onclick=modalBan;
  }
}

function injectMaint(){
  if($('setMaint')) return;
  const grid=document.querySelector('#pg-settings .grid2');
  if(!grid) return;
  const d=document.createElement('div'); d.className='field';
  d.innerHTML='<label>Bảo trì web (chặn get key)</label><select id="setMaint" class="select"><option value="false">Tắt</option><option value="true">Bật</option></select>';
  grid.appendChild(d);
  const hint=document.createElement('p'); hint.className='hint';
  hint.textContent='Bảo trì chỉ chặn trang nhận key. API check-key app vẫn chạy.';
  const save=$('saveSet');
  if(save&&save.parentElement) save.parentElement.insertBefore(hint,save);
}

async function loadBans(){
  try{
    const x=await BDZ.rpc('bdz_admin_bans',{p_token:tok(),p_action:'list'});
    if(!x||!x.ok){if($('banRows'))$('banRows').innerHTML='<tr><td colspan="6" style="color:var(--muted)">—</td></tr>';return}
    bans=x.bans||[];renderBans();
  }catch(e){}
}
function renderBans(){
  if(!$('banRows'))return;
  $('banRows').innerHTML=(bans||[]).map(b=>'<tr><td>'+b.id+'</td><td>'+esc(b.reason||'')+'</td><td style="font-size:12px">'+(b.banned_until?new Date(b.banned_until).toLocaleString('vi-VN'):'—')+'</td><td><span class="tag '+(b.active?'off':'on')+'">'+(b.active?'BAN':'OFF')+'</span></td><td style="font-size:12px">'+esc(b.note||'')+'</td><td>'+(b.active?'<button class="btn sm" data-unban="'+b.id+'">Unban</button>':'—')+'</td></tr>').join('')||'<tr><td colspan="6" style="color:var(--muted)">Không có ban</td></tr>';
  document.querySelectorAll('[data-unban]').forEach(btn=>btn.onclick=async()=>{
    try{const x=await BDZ.rpc('bdz_admin_bans',{p_token:tok(),p_action:'unban',p_payload:{id:+btn.dataset.unban}});if(!x||!x.ok)throw Error(x&&x.error||'Lỗi');loadBans()}catch(e){alert(e.message)}
  });
}
function modalBan(){
  const root=$('modalRoot'); if(!root)return;
  root.innerHTML='<div class="modal-bg"><div class="modal"><h3>Ban visitor / IP</h3><div class="field"><label>Visitor ID</label><input id="bVis" class="input"></div><div class="field"><label>IP / fingerprint</label><input id="bIp" class="input"></div><div class="field"><label>Lý do</label><input id="bReason" class="input" value="manual"></div><div class="field"><label>Giờ ban</label><input id="bHours" class="input" type="number" value="24" min="1"></div><div class="field"><label>Ghi chú</label><input id="bNote" class="input"></div><div class="modal-actions"><button class="btn" id="mCancel">Hủy</button><button class="btn primary" id="mOk">Ban</button></div></div></div>';
  $('mCancel').onclick=()=>root.innerHTML='';
  $('mOk').onclick=async()=>{
    try{
      const payload={visitor_id:$('bVis').value.trim(),ip_hash:$('bIp').value.trim(),reason:$('bReason').value.trim()||'manual',hours:+$('bHours').value||24,note:$('bNote').value.trim()};
      const x=await BDZ.rpc('bdz_admin_bans',{p_token:tok(),p_action:'ban',p_payload:payload});
      if(!x||!x.ok)throw Error(x&&x.error||'Lỗi');root.innerHTML='';loadBans();
    }catch(e){alert(e.message)}
  };
}

window.saveSettings=async function(){
  try{
    const payload={
      default_duration_hours:+($('setDur')&&$('setDur').value||5),
      default_max_devices:+($('setDev')&&$('setDev').value||1),
      default_max_checks:0,
      get_key_limit_per_visitor:+($('setLim')&&$('setLim').value||3),
      bind_ip_on_activate:($('setIp')&&$('setIp').value)==='true',
      bind_device_on_activate:($('setBind')&&$('setBind').value)==='true',
      maintenance_mode:($('setMaint')?$('setMaint').value==='true':false)
    };
    const x=await BDZ.rpc('bdz_admin_settings',{p_token:tok(),p_action:'update',p_payload:payload});
    if(!x||!x.ok)throw Error(x&&x.error||'Lỗi');
    if(typeof settings!=='undefined') settings=x.settings||payload;
    if($('saveMsg'))$('saveMsg').textContent='Đã lưu';
  }catch(e){if($('saveMsg'))$('saveMsg').textContent=e.message}
};

async function bootExtra(){
  for(let i=0;i<50;i++){ if($('navTabs')&&$('pg-settings')) break; await new Promise(r=>setTimeout(r,100)); }
  injectBanTab();
  injectMaint();
  try{
    if(tok()){
      const x=await BDZ.rpc('bdz_admin_settings',{p_token:tok(),p_action:'get'});
      if(x&&x.ok&&x.settings&&$('setMaint')) $('setMaint').value=String(x.settings.maintenance_mode??false);
      loadBans();
    }
  }catch(e){}
  if($('saveSet'))$('saveSet').onclick=window.saveSettings;
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bootExtra);
else setTimeout(bootExtra,300);
})();
