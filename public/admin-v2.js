(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));
const tok=()=>sessionStorage.getItem('bdz_admin_token')||'';
let rows=[], settings={}, timer=null;

const TABS={dash:'Dashboard',keys:'Keys',stats:'Thống kê',admins:'Admins',api:'API',settings:'Settings'};

function shell(){
  $('root').innerHTML=`
<div id="login" class="login">
  <section class="neo panel loginbox">
    <div class="brand"><span class="logo">BZ</span>BDZ ADMIN</div>
    <span class="tag blue">OWNER ACCESS</span>
    <h1>ARYA.</h1>
    <p class="muted">Key System Control</p>
    <div class="field"><label>Tài khoản</label><input id="u" class="input" value="arya" autocomplete="username"></div>
    <div class="field"><label>Mật khẩu</label><input id="p" class="input" type="password" autocomplete="current-password"></div>
    <button id="loginBtn" class="btn primary">ĐĂNG NHẬP →</button>
    <div id="loginErr" class="status err hidden"></div>
  </section>
</div>
<main id="app" class="hidden">
  <div class="wrap">
    <header class="top neo">
      <div class="brand"><span class="logo">BZ</span>BDZ</div>
      <span class="tag blue">OWNER</span>
      <span class="grow"></span>
      <span id="clock" class="muted small"></span>
      <button id="refresh" class="btn">↻</button>
      <button id="logout" class="btn pink">OUT</button>
    </header>
    <nav class="tabs neo-sm">${Object.entries(TABS).map(([k,v],i)=>`<button class="tab ${i?'':'active'}" data-page="${k}">${v}</button>`).join('')}</nav>
    <div id="pages"></div>
    <footer class="footer">BDZ · GitHub Pages + Supabase</footer>
  </div>
</main>`;

  $('pages').innerHTML=`
<section id="pg-dash" class="view active">
  <div class="grid four">
    <div class="neo-sm stat yellow"><b>KEYS</b><strong id="sTotal">0</strong></div>
    <div class="neo-sm stat green"><b>ACTIVE</b><strong id="sActive">0</strong></div>
    <div class="neo-sm stat blue"><b>CHECKS</b><strong id="sChecks">0</strong></div>
    <div class="neo-sm stat pink"><b>DEVICES</b><strong id="sDevices">0</strong></div>
  </div>
  <div class="grid two mt">
    <section class="neo panel"><h2>Hệ thống</h2><div id="overview" class="list"></div></section>
    <section class="neo panel"><h2>Key mới</h2><div id="recent" class="list"></div></section>
  </div>
</section>

<section id="pg-keys" class="view">
  <section class="neo panel">
    <div class="sectionHead">
      <div><h2>Quản lý Key</h2><p class="muted">Tạo / sửa / reset · default 5h · 1 device</p></div>
      <button id="create" class="btn primary">＋ TẠO KEY</button>
    </div>
    <div class="toolbar">
      <input id="q" class="input" placeholder="Tìm key…">
      <select id="filter" class="select">
        <option value="">Tất cả</option>
        <option>ACTIVE</option><option>DISABLED</option><option>EXPIRED</option>
        <option>LIMIT_REACHED</option><option>REACTIVATED</option>
      </select>
    </div>
    <div class="tableWrap"><table>
      <thead><tr><th>KEY</th><th>STATUS</th><th>CHECKS</th><th>DEVICE</th><th>HẾT HẠN</th><th></th></tr></thead>
      <tbody id="keyRows"></tbody>
    </table></div>
  </section>
</section>

<section id="pg-stats" class="view">
  <div class="grid three">
    <section class="neo panel"><h2>Trạng thái</h2><div id="statusStats"></div></section>
    <section class="neo panel"><h2>Top checks</h2><div id="checkStats"></div></section>
    <section class="neo panel"><h2>Health</h2><div id="healthStats"></div></section>
  </div>
  <section class="neo panel mt"><h2>Tóm tắt</h2><div id="summaryStats"></div></section>
</section>

<section id="pg-admins" class="view">
  <section class="neo panel">
    <div class="sectionHead">
      <div><h2>Tài khoản Admin</h2><p class="muted">OWNER tạo admin phụ</p></div>
      <button id="createAdmin" class="btn primary">＋ ADMIN</button>
    </div>
    <div class="tableWrap"><table>
      <thead><tr><th>USER</th><th>ROLE</th><th>STATUS</th><th>LOGIN</th></tr></thead>
      <tbody id="adminRows"></tbody>
    </table></div>
  </section>
</section>

<section id="pg-api" class="view">
  <div class="grid two">
    <section class="neo panel">
      <h2>Check Key Endpoint</h2>
      <p class="muted">APK gọi thẳng Supabase. Sai / hết hạn / limit → luôn trả <b>Key không hợp lệ</b>.</p>
      <pre class="code">POST ${BDZ.SUPABASE_URL}/functions/v1/check-key
Content-Type: application/json
apikey: (publishable key)

{"key":"...","device_id":"...","app_version":"V1","ip":"..."}</pre>
      <div class="field mt"><label>Test key</label><input id="testKey" class="input"></div>
      <div class="field"><label>Device ID</label><input id="testDevice" class="input" value="admin-test"></div>
      <button id="testBtn" class="btn primary">TEST →</button>
      <pre id="testOut" class="code mt">Chưa test.</pre>
    </section>
    <section class="neo panel">
      <h2>Code mẫu</h2>
      <p class="muted">Java · C++ · Python — copy dùng luôn.</p>
      <div class="list">
        <div><b>Java</b><span>OkHttp / HttpURLConnection</span></div>
        <div><b>C++ / C</b><span>libcurl</span></div>
        <div><b>Python</b><span>requests</span></div>
      </div>
      <a class="btn primary mt" href="./api.html" style="text-decoration:none;display:inline-block">XEM FULL SAMPLE →</a>
    </section>
  </div>
</section>

<section id="pg-settings" class="view">
  <div class="grid two">
    <section class="neo panel">
      <h2>Default Key</h2>
      <p class="muted">Áp dụng khi user GET KEY từ web.</p>
      <div class="field"><label>Thời hạn (giờ)</label><input id="setDur" class="input" type="number" min="1" max="8760"></div>
      <div class="field"><label>Max devices</label><input id="setDev" class="input" type="number" min="1" max="100"></div>
      <div class="field"><label>Max checks (0 = ∞)</label><input id="setChk" class="input" type="number" min="0"></div>
      <div class="field"><label>Get key / visitor</label><input id="setLim" class="input" type="number" min="1" max="10"></div>
      <div class="field"><label>Bind IP khi activate</label>
        <select id="setIp" class="select"><option value="true">ON</option><option value="false">OFF</option></select>
      </div>
      <div class="field"><label>Bind Device khi activate</label>
        <select id="setBind" class="select"><option value="true">ON</option><option value="false">OFF</option></select>
      </div>
      <button id="saveSet" class="btn primary">LƯU SETTINGS</button>
      <span id="saveMsg" class="small muted"></span>
    </section>
    <section class="neo panel">
      <h2>UI</h2>
      <div class="field"><label>Auto refresh</label>
        <select id="auto" class="select">
          <option value="0">Tắt</option><option value="30">30s</option>
          <option value="60">60s</option><option value="300">5 phút</option>
        </select>
      </div>
      <button id="saveUi" class="btn">LƯU UI</button>
      <button id="clearSession" class="btn pink mt">CLEAR SESSION</button>
    </section>
  </div>
</section>`;

  $('loginBtn').onclick=doLogin;
  $('logout').onclick=doLogout;
  $('refresh').onclick=()=>load(true);
  $('create').onclick=createKey;
  $('createAdmin').onclick=createAdmin;
  $('q').oninput=renderKeys;
  $('filter').onchange=renderKeys;
  $('testBtn').onclick=testApi;
  $('saveSet').onclick=saveSettings;
  $('saveUi').onclick=saveUi;
  $('clearSession').onclick=()=>{sessionStorage.clear();location.reload()};
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>page(b.dataset.page));
  loadUi(); clock(); setInterval(clock,1000);
}

function page(name){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.page===name));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='pg-'+name));
}
function clock(){const c=$('clock'); if(c) c.textContent=new Date().toLocaleString('vi-VN')}
function showApp(){
  $('login').classList.add('hidden');
  $('app').classList.remove('hidden');
}
async function doLogin(){
  const e=$('loginErr'); e.classList.add('hidden');
  try{
    const x=await BDZ.rpc('bdz_admin_login',{p_username:$('u').value.trim(),p_password:$('p').value,p_ip:BDZ.visitorId(),p_user_agent:navigator.userAgent.slice(0,240)});
    if(!x?.ok) throw Error(x?.error||'INVALID_LOGIN');
    sessionStorage.setItem('bdz_admin_token',x.token);
    sessionStorage.setItem('bdz_admin_user',x.user||'arya');
    sessionStorage.setItem('bdz_admin_role',x.role||'OWNER');
    $('p').value='';
    showApp(); await load(true);
  }catch(err){
    e.textContent='✕ '+(err.message==='INVALID_LOGIN'?'Sai tài khoản hoặc mật khẩu.':err.message);
    e.classList.remove('hidden');
  }
}
async function doLogout(){
  try{await BDZ.rpc('bdz_admin_logout',{p_token:tok()})}catch{}
  sessionStorage.clear(); location.reload();
}
async function rpcAction(action,payload){
  const x=await BDZ.rpc('bdz_admin_key_action',{p_token:tok(),p_action:action,p_payload:payload});
  if(!x?.ok) throw Error(x?.error||'ACTION_FAILED');
  return x;
}
async function load(full){
  if(!tok()) return;
  try{
    const x=await BDZ.rpc('bdz_admin_keys',{p_token:tok()});
    if(x?.error==='UNAUTHORIZED'){sessionStorage.clear();location.reload();return}
    rows=x?.keys||[];
    renderDash(); renderKeys(); renderStats();
    if(full){ await loadSettings(); await loadAdmins(); }
  }catch(e){ console.warn(e); }
}
function renderDash(){
  const a=rows.filter(k=>['ACTIVE','REACTIVATED'].includes(k.status)).length;
  const c=rows.reduce((n,k)=>n+(Number(k.check_count)||0),0);
  const d=rows.filter(k=>k.device_id_hash||k.activated_device_id_hash).length;
  $('sTotal').textContent=rows.length;
  $('sActive').textContent=a;
  $('sChecks').textContent=c;
  $('sDevices').textContent=d;
  $('overview').innerHTML=[['FRONTEND','GitHub Pages'],['BACKEND','Supabase'],['DEFAULT', (settings.default_duration_hours||5)+'h · '+(settings.default_max_devices||1)+' device'],['OWNER','ARYA']].map(([a,b])=>`<div><b>${a}</b><span>${b}</span></div>`).join('');
  $('recent').innerHTML=rows.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,8).map(k=>`<div><b class="mono">${esc(k.key_code)}</b><span>${esc(k.status)}</span></div>`).join('')||'<div>Chưa có key.</div>';
}
function renderKeys(){
  const q=$('q').value.trim().toLowerCase(), f=$('filter').value;
  const r=rows.filter(k=>(!q||String(k.key_code).toLowerCase().includes(q))&&(!f||k.status===f));
  $('keyRows').innerHTML=r.map(k=>`<tr>
    <td><b class="mono">${esc(k.key_code)}</b><div class="tiny muted">#${k.id}</div></td>
    <td><span class="tag">${esc(k.status)}</span></td>
    <td>${k.check_count||0} / ${k.max_checks||'∞'}</td>
    <td>${(k.device_id_hash||k.activated_device_id_hash)?'1':'0'} / ${k.max_devices||1}</td>
    <td>${k.expires_at?new Date(k.expires_at).toLocaleString('vi-VN'):'—'}</td>
    <td>
      <button class="btn mini" onclick="BDZA.toggle(${k.id},'${['ACTIVE','REACTIVATED'].includes(k.status)?'DISABLED':'ACTIVE'}')">${['ACTIVE','REACTIVATED'].includes(k.status)?'OFF':'ON'}</button>
      <button class="btn mini" onclick="BDZA.edit(${k.id})">EDIT</button>
      <button class="btn mini" onclick="BDZA.device(${k.id})">DEVICE</button>
      <button class="btn mini pinkbg" onclick="BDZA.remove(${k.id})">DEL</button>
    </td>
  </tr>`).join('')||'<tr><td colspan="6">Không có key.</td></tr>';
}
function renderStats(){
  const count={}; rows.forEach(k=>count[k.status]=(count[k.status]||0)+1);
  const total=rows.length||1;
  $('statusStats').innerHTML=Object.entries(count).map(([s,n])=>`<div class="barRow"><div class="barMeta"><b>${esc(s)}</b><span>${n}</span></div><div class="bar"><i style="width:${Math.round(n/total*100)}%"></i></div></div>`).join('')||'—';
  const top=rows.slice().sort((a,b)=>(b.check_count||0)-(a.check_count||0)).slice(0,8);
  const mx=Math.max(1,...top.map(k=>Number(k.check_count)||0));
  $('checkStats').innerHTML=top.map(k=>`<div class="barRow"><div class="barMeta"><b class="mono">${esc(String(k.key_code).slice(0,12))}</b><span>${k.check_count||0}</span></div><div class="bar"><i style="width:${Math.round((k.check_count||0)/mx*100)}%"></i></div></div>`).join('')||'—';
  const expired=rows.filter(k=>k.expires_at&&new Date(k.expires_at)<new Date()).length;
  $('healthStats').innerHTML=[['API','READY'],['EXPIRED',expired],['BOUND',rows.filter(k=>k.device_id_hash||k.activated_device_id_hash).length]].map(([a,b])=>`<div class="healthRow"><b>${a}</b><strong>${b}</strong></div>`).join('');
  $('summaryStats').innerHTML=`<p><b>${rows.length}</b> keys · <b>${count.ACTIVE||0}</b> active · <b>${rows.reduce((n,k)=>n+(Number(k.check_count)||0),0)}</b> checks</p>`;
}
async function createKey(){
  const h=prompt('Thời hạn (giờ):', String(settings.default_duration_hours||5)); if(h===null)return;
  const d=prompt('Max devices:', String(settings.default_max_devices||1)); if(d===null)return;
  const c=prompt('Max checks (0=∞):', String(settings.default_max_checks??0)); if(c===null)return;
  try{
    const x=await rpcAction('create',{duration_hours:+h,max_devices:+d,max_checks:+c});
    alert('KEY: '+(x.row?.key_code||'created'));
    load();
  }catch(e){alert(e.message)}
}
window.BDZA={
  toggle:async(id,s)=>{try{await rpcAction('status',{id,status:s});load()}catch(e){alert(e.message)}},
  device:async id=>{if(!confirm('Reset device + IP?'))return;try{await rpcAction('reset_device',{id});load()}catch(e){alert(e.message)}},
  edit:async id=>{
    const k=rows.find(x=>x.id===id); if(!k)return;
    const h=prompt('Thời hạn (giờ):',k.duration_hours); if(h===null)return;
    const c=prompt('Max checks:',k.max_checks); if(c===null)return;
    const code=prompt('Key code (để trống = giữ):',k.key_code); if(code===null)return;
    try{
      await rpcAction('update',{id,duration_hours:+h,max_devices:+(k.max_devices||1),max_checks:+c,key_code:code||k.key_code,status:k.status});
      load();
    }catch(e){alert(e.message)}
  },
  remove:async id=>{if(!confirm('Xóa key vĩnh viễn?'))return;try{await rpcAction('delete',{id});load()}catch(e){alert(e.message)}}
};
async function loadAdmins(){
  try{
    const x=await BDZ.rpc('bdz_admin_users',{p_token:tok()});
    if(!x?.ok){ $('adminRows').innerHTML='<tr><td colspan="4">Không đủ quyền hoặc lỗi.</td></tr>'; return; }
    $('adminRows').innerHTML=(x.users||[]).map(u=>`<tr>
      <td><b>${esc(u.username)}</b>${u.display_name?`<div class="tiny muted">${esc(u.display_name)}</div>`:''}</td>
      <td><span class="tag">${esc(u.role)}</span></td>
      <td>${u.active?'ACTIVE':'OFF'}</td>
      <td>${u.last_login_at?new Date(u.last_login_at).toLocaleString('vi-VN'):'—'}</td>
    </tr>`).join('')||'<tr><td colspan="4">Chưa có.</td></tr>';
  }catch{ $('adminRows').innerHTML='<tr><td colspan="4">Lỗi load.</td></tr>'; }
}
async function createAdmin(){
  const u=prompt('Username (min 3):'); if(!u)return;
  const p=prompt('Password (min 6):'); if(!p)return;
  const r=prompt('Role: ADMIN / SUPPORT / VIEWER','ADMIN'); if(r===null)return;
  try{
    const x=await BDZ.rpc('bdz_admin_create_user',{p_token:tok(),p_username:u,p_password:p,p_role:r});
    if(!x?.ok) throw Error(x?.error||'FAILED');
    alert('Đã tạo: '+x.username+' ('+x.role+')');
    loadAdmins();
  }catch(e){alert(e.message)}
}
async function loadSettings(){
  try{
    const x=await BDZ.rpc('bdz_admin_settings',{p_token:tok(),p_action:'get'});
    if(x?.ok&&x.settings){
      settings=x.settings;
      $('setDur').value=settings.default_duration_hours??5;
      $('setDev').value=settings.default_max_devices??1;
      $('setChk').value=settings.default_max_checks??0;
      $('setLim').value=settings.get_key_limit_per_visitor??1;
      $('setIp').value=String(settings.bind_ip_on_activate??true);
      $('setBind').value=String(settings.bind_device_on_activate??true);
    }
  }catch{}
}
async function saveSettings(){
  try{
    const payload={
      default_duration_hours:+$('setDur').value,
      default_max_devices:+$('setDev').value,
      default_max_checks:+$('setChk').value,
      get_key_limit_per_visitor:+$('setLim').value,
      bind_ip_on_activate:$('setIp').value==='true',
      bind_device_on_activate:$('setBind').value==='true'
    };
    const x=await BDZ.rpc('bdz_admin_settings',{p_token:tok(),p_action:'update',p_payload:payload});
    if(!x?.ok) throw Error(x?.error||'SAVE_FAILED');
    settings=x.settings||payload;
    $('saveMsg').textContent='Đã lưu ✓';
    renderDash();
  }catch(e){ $('saveMsg').textContent='Lỗi: '+e.message; }
}
async function testApi(){
  const out=$('testOut'); out.textContent='Đang test…';
  try{
    const x=await BDZ.edge('check-key',{key:$('testKey').value.trim(),device_id:$('testDevice').value.trim(),app_version:'V1',ip:null});
    out.textContent=JSON.stringify(x,null,2);
  }catch(e){ out.textContent='ERROR: '+e.message; }
}
function loadUi(){
  $('auto').value=localStorage.getItem('bdz_refresh')||'0';
  const n=Number($('auto').value); if(timer)clearInterval(timer); if(n>0)timer=setInterval(()=>load(false),n*1000);
}
function saveUi(){ localStorage.setItem('bdz_refresh',$('auto').value); loadUi(); }

shell();
$('login').classList.remove('hidden');
$('app').classList.add('hidden');
(async()=>{
  if(!tok()) return;
  try{
    const x=await BDZ.rpc('bdz_admin_keys',{p_token:tok()});
    if(x?.error==='UNAUTHORIZED'||!x||x.error){ sessionStorage.clear(); return; }
    showApp();
    rows=x?.keys||[];
    renderDash(); renderKeys(); renderStats();
    await loadSettings(); await loadAdmins();
  }catch{ sessionStorage.clear(); }
})();
})();
