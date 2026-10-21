(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));
const tok=()=>sessionStorage.getItem('bdz_t')||'';
let bans=[];
let fraudFlags=[];
let apkSessions=[];
let banSub='getkey';
let apkView='sessions';

function shortHash(h){
  if(!h) return '—';
  const s=String(h);
  return s.length>14 ? s.slice(0,8)+'…'+s.slice(-4) : s;
}
function fmtTime(t){
  if(!t) return '—';
  try{ return new Date(t).toLocaleString('vi-VN'); }catch(_){ return String(t); }
}

function injectBanTab(){
  const nav=$('navTabs'); if(!nav) return;
  if(nav.querySelector('[data-p="bans"]')) return;
  const b=document.createElement('button');
  b.className='side-item'; b.dataset.p='bans'; b.textContent='Ban';
  b.onclick=()=>{
    if(typeof page==='function') page('bans');
    else document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='pg-bans'));
    switchBanSub(banSub||'getkey');
  };
  const setBtn=[...nav.querySelectorAll('.side-item, .tab')].find(t=>t.dataset.p==='settings');
  if(setBtn) nav.insertBefore(b,setBtn); else nav.appendChild(b);

  if(!$('pg-bans')){
    const sec=document.createElement('section');
    sec.id='pg-bans'; sec.className='view';
    sec.innerHTML=`
<header class="md-admin-heading">
  <div><h1>Ban</h1><p class="hint">Get Key (web) và APK (session check-in từ app).</p></div>
</header>
<div class="toolbar" style="gap:6px;margin-bottom:14px">
  <button type="button" class="btn sm ban-sub active" data-sub="getkey">Get Key</button>
  <button type="button" class="btn sm ban-sub" data-sub="apk">APK</button>
</div>

<div id="banPaneGetkey">
  <div class="card">
    <div class="section-head">
      <div><h2>Ban Get Key</h2><p class="hint">Spam get-key / visitor / IP — chặn trang nhận key.</p></div>
      <button id="btnBan" class="btn primary">+ Ban</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Lý do</th><th>Đến</th><th>TT</th><th>Note</th><th></th></tr></thead>
        <tbody id="banRows"></tbody>
      </table>
    </div>
  </div>
</div>

<div id="banPaneApk" class="hidden">
  <div class="toolbar" style="gap:6px;margin-bottom:12px">
    <button type="button" class="btn sm apk-view active" data-av="sessions">Session log</button>
    <button type="button" class="btn sm apk-view" data-av="flags">Ban vĩnh viễn</button>
    <button type="button" class="btn sm" id="btnFraudRefresh">Làm mới</button>
  </div>

  <div id="apkPaneSessions" class="card">
    <div class="section-head">
      <div><h2>Session APK</h2><p class="hint">Gộp theo Device + IP. Bấm Chi tiết để xem full timeline.</p></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Device</th><th>IP</th><th>Hits</th><th>Last</th><th>Key</th><th>KQ gần nhất</th><th>Ban?</th><th>Lần cuối</th><th></th>
          </tr>
        </thead>
        <tbody id="sessionRows"></tbody>
      </table>
    </div>
  </div>

  <div id="apkPaneFlags" class="card hidden">
    <div class="section-head">
      <div><h2>Ban APK (vĩnh viễn)</h2><p class="hint">Device/IP bị gắn cờ — mọi check-in sau đều KILL.</p></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Lý do</th><th>Device</th><th>IP</th><th>TT</th><th>Note</th><th>Thời gian</th><th></th>
          </tr>
        </thead>
        <tbody id="fraudRows"></tbody>
      </table>
    </div>
  </div>
</div>`;
    ($('pages')||document.body).appendChild(sec);

    if($('btnBan')) $('btnBan').onclick=modalBan;
    if($('btnFraudRefresh')) $('btnFraudRefresh').onclick=()=>{
      if(apkView==='sessions') loadApkSessions(); else loadFraudFlags();
    };
    document.querySelectorAll('.ban-sub').forEach(btn=>{
      btn.onclick=()=>switchBanSub(btn.dataset.sub);
    });
    document.querySelectorAll('.apk-view').forEach(btn=>{
      btn.onclick=()=>switchApkView(btn.dataset.av);
    });
  }
}

function switchBanSub(sub){
  banSub=sub==='apk'?'apk':'getkey';
  document.querySelectorAll('.ban-sub').forEach(b=>{
    b.classList.toggle('active', b.dataset.sub===banSub);
  });
  const gk=$('banPaneGetkey');
  const apk=$('banPaneApk');
  if(gk) gk.classList.toggle('hidden', banSub!=='getkey');
  if(apk) apk.classList.toggle('hidden', banSub!=='apk');
  if(banSub==='getkey') loadBans();
  else switchApkView(apkView||'sessions');
}

function switchApkView(v){
  apkView=v==='flags'?'flags':'sessions';
  document.querySelectorAll('.apk-view').forEach(b=>{
    b.classList.toggle('active', b.dataset.av===apkView);
  });
  const s=$('apkPaneSessions');
  const f=$('apkPaneFlags');
  if(s) s.classList.toggle('hidden', apkView!=='sessions');
  if(f) f.classList.toggle('hidden', apkView!=='flags');
  if(apkView==='sessions') loadApkSessions();
  else loadFraudFlags();
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

/* ——— Get Key bans ——— */
async function loadBans(){
  try{
    const x=await BDZ.rpc('bdz_admin_bans',{p_token:tok(),p_action:'list'});
    if(!x||!x.ok){
      if($('banRows')) $('banRows').innerHTML='<tr><td colspan="6" style="color:var(--fg-3)">—</td></tr>';
      return;
    }
    bans=x.bans||[];
    renderBans();
  }catch(e){}
}
function renderBans(){
  if(!$('banRows')) return;
  $('banRows').innerHTML=(bans||[]).map(b=>
    '<tr>'+
      '<td>'+b.id+'</td>'+
      '<td>'+esc(b.reason||'')+'</td>'+
      '<td style="font-size:12px">'+fmtTime(b.banned_until)+'</td>'+
      '<td><span class="tag '+(b.active?'off':'on')+'">'+(b.active?'BAN':'OFF')+'</span></td>'+
      '<td style="font-size:12px">'+esc(b.note||'')+'</td>'+
      '<td style="white-space:nowrap">'+
        (b.active?'<button class="btn sm" data-unban="'+b.id+'">Unban</button> ':'')+
        '<button class="btn sm danger" data-delban="'+b.id+'">Xóa</button>'+
      '</td>'+
    '</tr>'
  ).join('')||'<tr><td colspan="6" style="color:var(--fg-3)">Không có ban</td></tr>';

  document.querySelectorAll('[data-unban]').forEach(btn=>{
    btn.onclick=async()=>{
      try{
        const x=await BDZ.rpc('bdz_admin_bans',{p_token:tok(),p_action:'unban',p_payload:{id:+btn.dataset.unban}});
        if(!x||!x.ok) throw Error(x&&x.error||'Lỗi');
        loadBans();
      }catch(e){ alert(e.message); }
    };
  });
  document.querySelectorAll('[data-delban]').forEach(btn=>{
    btn.onclick=async()=>{
      if(!confirm('Xóa hẳn log ban #'+btn.dataset.delban+'?')) return;
      try{
        const x=await BDZ.rpc('bdz_admin_bans',{p_token:tok(),p_action:'delete',p_payload:{id:+btn.dataset.delban}});
        if(!x||!x.ok) throw Error(x&&x.error||'Lỗi');
        loadBans();
      }catch(e){ alert(e.message); }
    };
  });
}
function modalBan(){
  const root=$('modalRoot'); if(!root) return;
  root.innerHTML='<div class="modal-bg"><div class="modal"><h3>Ban visitor / IP (Get Key)</h3>'+
    '<div class="field"><label>Visitor ID</label><input id="bVis" class="input"></div>'+
    '<div class="field"><label>IP (plain — server sẽ hash)</label><input id="bIp" class="input"></div>'+
    '<div class="field"><label>Lý do</label><input id="bReason" class="input" value="manual"></div>'+
    '<div class="field"><label>Giờ ban</label><input id="bHours" class="input" type="number" value="24" min="1"></div>'+
    '<div class="field"><label>Ghi chú</label><input id="bNote" class="input"></div>'+
    '<div class="modal-actions"><button class="btn" id="mCancel">Hủy</button><button class="btn primary" id="mOk">Ban</button></div></div></div>';
  $('mCancel').onclick=()=>closeModalSmooth(root);
  $('mOk').onclick=async()=>{
    try{
      const hours=+$('bHours').value||24;
      const payload={
        visitor_id:$('bVis').value.trim(),
        ip:$('bIp').value.trim(),
        reason:$('bReason').value.trim()||'manual',
        banned_until:new Date(Date.now()+hours*3600*1000).toISOString(),
        note:$('bNote').value.trim()
      };
      const x=await BDZ.rpc('bdz_admin_bans',{p_token:tok(),p_action:'ban',p_payload:payload});
      if(!x||!x.ok) throw Error(x&&x.error||'Lỗi');
      closeModalSmooth(root);
      loadBans();
    }catch(e){ alert(e.message); }
  };
}

/* ——— APK sessions (grouped) ——— */
async function loadApkSessions(){
  try{
    const x=await BDZ.rpc('bdz_admin_fraud',{p_token:tok(),p_action:'sessions'});
    if(!x||!x.ok){
      if($('sessionRows')) $('sessionRows').innerHTML='<tr><td colspan="9" style="color:var(--fg-3)">—</td></tr>';
      return;
    }
    apkSessions=x.sessions||[];
    renderApkSessions();
  }catch(e){
    if($('sessionRows')) $('sessionRows').innerHTML='<tr><td colspan="9" style="color:var(--fg-3)">Lỗi tải</td></tr>';
  }
}
function renderApkSessions(){
  if(!$('sessionRows')) return;
  if(!apkSessions.length){
    $('sessionRows').innerHTML='<tr><td colspan="9" style="color:var(--fg-3)">Chưa có session</td></tr>';
    return;
  }
  $('sessionRows').innerHTML=apkSessions.map((s,idx)=>{
    const act=s.last_action||'';
    const tag=act==='KILL'?'off':(act==='DENY'?'off':'on');
    const warn=s.ever_no_key||s.kill_count>0;
    const dh=esc(s.device_hash||'');
    const ih=esc(s.ip_hash||'');
    return '<tr'+(warn?' style="background:rgba(239,68,68,.08)"':'')+'>'+
      '<td class="mono" style="font-size:11px" title="'+dh+'">'+esc(shortHash(s.device_hash))+'</td>'+
      '<td style="font-size:12px">'+esc(s.ip_raw||shortHash(s.ip_hash))+'</td>'+
      '<td><b>'+(s.hit_count||0)+'</b>'+
        (s.no_key_count?' <span class="tag off" style="font-size:10px">'+s.no_key_count+' no-key</span>':'')+
      '</td>'+
      '<td style="font-size:12px">'+esc(s.last_phase||'—')+'</td>'+
      '<td class="mono" style="font-size:12px">'+esc(s.last_key||'—')+'</td>'+
      '<td><span class="tag '+tag+'">'+esc(act||'—')+'</span> <span style="font-size:11px;color:var(--fg-3)">'+esc(s.last_reason||'')+'</span></td>'+
      '<td>'+(s.is_banned?'<span class="tag off">BAN</span>':'<span class="tag on">OK</span>')+'</td>'+
      '<td style="font-size:11px">'+fmtTime(s.last_at)+'</td>'+
      '<td style="white-space:nowrap">'+
        '<button class="btn sm" data-sdetail="'+idx+'">Chi tiết</button> '+
        (!s.is_banned?'<button class="btn sm" data-sgban="'+idx+'">Ban</button> ':'')+
        '<button class="btn sm danger" data-sgdel="'+idx+'">Xóa</button>'+
      '</td>'+
    '</tr>';
  }).join('');

  document.querySelectorAll('[data-sdetail]').forEach(btn=>{
    btn.onclick=()=>modalSessionDetail(apkSessions[+btn.dataset.sdetail]);
  });
  document.querySelectorAll('[data-sgban]').forEach(btn=>{
    btn.onclick=async()=>{
      const s=apkSessions[+btn.dataset.sgban];
      if(!s||!confirm('Ban vĩnh viễn device này?')) return;
      try{
        const x=await BDZ.rpc('bdz_admin_fraud',{p_token:tok(),p_action:'ban',p_payload:{
          device_hash:s.device_hash, ip_hash:s.ip_hash||null, reason:'manual', note:'admin from grouped session'
        }});
        if(!x||!x.ok) throw Error(x&&x.error||'Lỗi');
        loadApkSessions();
      }catch(e){ alert(e.message); }
    };
  });
  document.querySelectorAll('[data-sgdel]').forEach(btn=>{
    btn.onclick=async()=>{
      const s=apkSessions[+btn.dataset.sgdel];
      if(!s||!confirm('Xóa toàn bộ log session của device này?')) return;
      try{
        const x=await BDZ.rpc('bdz_admin_fraud',{p_token:tok(),p_action:'delete_session_group',p_payload:{
          device_hash:s.device_hash, ip_hash:s.ip_hash||null
        }});
        if(!x||!x.ok) throw Error(x&&x.error||'Lỗi');
        loadApkSessions();
      }catch(e){ alert(e.message); }
    };
  });
}

async function modalSessionDetail(group){
  const root=$('modalRoot'); if(!root||!group) return;
  root.innerHTML='<div class="modal-bg"><div class="modal" style="width:min(640px,100%)"><h3>Timeline session</h3><p class="hint">Đang tải…</p></div></div>';
  try{
    const x=await BDZ.rpc('bdz_admin_fraud',{p_token:tok(),p_action:'session_detail',p_payload:{
      device_hash:group.device_hash,
      ip_hash:group.ip_hash||null
    }});
    if(!x||!x.ok) throw Error(x.error||'Lỗi');
    const events=x.events||[];
    const rows=events.map(e=>{
      const act=e.result_action||'';
      const tag=act==='KILL'?'off':(act==='DENY'?'off':'on');
      return '<tr>'+
        '<td style="font-size:11px">'+fmtTime(e.created_at)+'</td>'+
        '<td>'+esc(e.phase||'')+'</td>'+
        '<td>'+(e.has_key?'<span class="tag on">Có</span>':'<span class="tag off">THIẾU</span>')+'</td>'+
        '<td class="mono" style="font-size:11px">'+esc(e.key_code||'—')+'</td>'+
        '<td><span class="tag '+tag+'">'+esc(act)+'</span></td>'+
        '<td style="font-size:11px;color:var(--fg-3)">'+esc(e.result_reason||'')+'</td>'+
        '<td style="font-size:11px">'+esc(e.app_version||'—')+'</td>'+
      '</tr>';
    }).join('')||'<tr><td colspan="7" style="color:var(--fg-3)">Trống</td></tr>';

    root.innerHTML=`
<div class="modal-bg"><div class="modal" style="width:min(640px,100%)">
  <h3>Timeline — ${esc(shortHash(group.device_hash))}</h3>
  <p class="hint" style="margin:6px 0 12px">
    IP: ${esc(group.ip_raw||shortHash(group.ip_hash))} ·
    ${group.hit_count||events.length} hits ·
    ${x.is_banned?'<span class="tag off">ĐANG BAN</span>':'<span class="tag on">OK</span>'}
  </p>
  <div class="table-wrap" style="max-height:360px;overflow:auto">
    <table>
      <thead><tr><th>Thời gian</th><th>Phase</th><th>Key?</th><th>Key</th><th>KQ</th><th>Lý do</th><th>Ver</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="modal-actions" style="margin-top:12px">
    <button class="btn" id="mClose">Đóng</button>
    ${!x.is_banned?'<button class="btn primary" id="mBan">Ban vĩnh viễn</button>':''}
  </div>
</div></div>`;
    $('mClose').onclick=()=>closeModalSmooth(root);
    if($('mBan')){
      $('mBan').onclick=async()=>{
        if(!confirm('Ban vĩnh viễn device này?')) return;
        try{
          const u=await BDZ.rpc('bdz_admin_fraud',{p_token:tok(),p_action:'ban',p_payload:{
            device_hash:group.device_hash, ip_hash:group.ip_hash||null, reason:'manual', note:'admin from timeline'
          }});
          if(!u||!u.ok) throw Error(u&&u.error||'Lỗi');
          closeModalSmooth(root);
          loadApkSessions();
        }catch(e){ alert(e.message); }
      };
    }
  }catch(e){
    root.innerHTML=`<div class="modal-bg"><div class="modal"><h3>Lỗi</h3><p class="err">${esc(e.message)}</p><div class="modal-actions"><button class="btn" id="mClose">Đóng</button></div></div></div>`;
    $('mClose').onclick=()=>closeModalSmooth(root);
  }
}

/* ——— APK fraud flags ——— */
async function loadFraudFlags(){
  try{
    const x=await BDZ.rpc('bdz_admin_fraud',{p_token:tok(),p_action:'list'});
    if(!x||!x.ok){
      if($('fraudRows')) $('fraudRows').innerHTML='<tr><td colspan="8" style="color:var(--fg-3)">—</td></tr>';
      return;
    }
    fraudFlags=x.flags||[];
    renderFraudFlags();
  }catch(e){
    if($('fraudRows')) $('fraudRows').innerHTML='<tr><td colspan="8" style="color:var(--fg-3)">Lỗi tải</td></tr>';
  }
}
function renderFraudFlags(){
  if(!$('fraudRows')) return;
  if(!fraudFlags.length){
    $('fraudRows').innerHTML='<tr><td colspan="8" style="color:var(--fg-3)">Chưa có ban APK</td></tr>';
    return;
  }
  $('fraudRows').innerHTML=fraudFlags.map(f=>{
    return '<tr>'+
      '<td>'+f.id+'</td>'+
      '<td><span class="tag off">'+esc(f.reason||'fraud')+'</span></td>'+
      '<td class="mono" style="font-size:11px" title="'+esc(f.device_hash||'')+'">'+esc(shortHash(f.device_hash))+'</td>'+
      '<td style="font-size:12px">'+esc(f.ip_raw||shortHash(f.ip_hash))+'</td>'+
      '<td><span class="tag '+(f.active?'off':'on')+'">'+(f.active?(f.kill_app?'KILL':'FLAG'):'OFF')+'</span></td>'+
      '<td style="font-size:12px">'+esc(f.note||'')+'</td>'+
      '<td style="font-size:11px">'+fmtTime(f.created_at)+'</td>'+
      '<td style="white-space:nowrap">'+
        (f.active?'<button class="btn sm" data-funban="'+f.id+'">Unban</button> ':'')+
        '<button class="btn sm danger" data-fdel="'+f.id+'">Xóa</button>'+
      '</td>'+
    '</tr>';
  }).join('');

  document.querySelectorAll('[data-funban]').forEach(btn=>{
    btn.onclick=async()=>{
      if(!confirm('Unban device này?')) return;
      try{
        const x=await BDZ.rpc('bdz_admin_fraud',{p_token:tok(),p_action:'unban',p_payload:{id:+btn.dataset.funban}});
        if(!x||!x.ok) throw Error(x&&x.error||'Lỗi');
        loadFraudFlags();
      }catch(e){ alert(e.message); }
    };
  });
  document.querySelectorAll('[data-fdel]').forEach(btn=>{
    btn.onclick=async()=>{
      if(!confirm('Xóa hẳn ban #'+btn.dataset.fdel+'?')) return;
      try{
        const x=await BDZ.rpc('bdz_admin_fraud',{p_token:tok(),p_action:'delete',p_payload:{id:+btn.dataset.fdel}});
        if(!x||!x.ok) throw Error(x&&x.error||'Lỗi');
        loadFraudFlags();
      }catch(e){ alert(e.message); }
    };
  });
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
    if(!x||!x.ok) throw Error(x&&x.error||'Lỗi');
    if(typeof settings!=='undefined') settings=x.settings||payload;
    if($('saveMsg')) $('saveMsg').textContent='Đã lưu';
  }catch(e){ if($('saveMsg')) $('saveMsg').textContent=e.message; }
};

window.loadBans=loadBans;
window.loadFraudFlags=loadFraudFlags;
window.loadApkSessions=loadApkSessions;

async function bootExtra(){
  for(let i=0;i<50;i++){
    if($('navTabs')&&$('pg-settings')) break;
    await new Promise(r=>setTimeout(r,100));
  }
  injectBanTab();
  injectMaint();
  try{
    if(tok()){
      const x=await BDZ.rpc('bdz_admin_settings',{p_token:tok(),p_action:'get'});
      if(x&&x.ok&&x.settings&&$('setMaint')) $('setMaint').value=String(x.settings.maintenance_mode??false);
      loadBans();
    }
  }catch(e){}
  if($('saveSet')) $('saveSet').onclick=window.saveSettings;
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bootExtra);
else setTimeout(bootExtra,300);
})();
