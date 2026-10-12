var $=id=>document.getElementById(id);
var esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
var tok=()=>sessionStorage.getItem('bdz_t')||'';
var LOGO='https://263.org.vn/logo?v=20261003';
var rows=[],admins=[],settings={},perms={can_keys:true,can_create_key:true,can_edit_key:true,can_delete_key:true,can_api_keys:true,can_settings:true,can_admins:true},role='OWNER',timer=null;
var ST_LABEL={ACTIVE:'Hoạt động',DISABLED:'Tắt',EXPIRED:'Hết hạn',TIME_EXPIRED:'Hết hạn',DEVICE_LIMIT:'Giới hạn máy',LIMIT_REACHED:'Hết lượt',REACTIVATED:'Hoạt động',CREATED:'Mới tạo'};
function openSide(){const s=$('sideNav'),m=$('sideMask');if(s)s.classList.add('open');if(m)m.classList.add('open');document.body.classList.add('side-open')}
function closeSide(){const s=$('sideNav'),m=$('sideMask');if(s)s.classList.remove('open');if(m)m.classList.remove('open');document.body.classList.remove('side-open')}
function closeModalSmooth(root){
  if(!root)return;
  const overlay=root.querySelector('.modal-bg');
  if(!overlay){root.innerHTML='';return;}
  if(overlay.classList.contains('modal-leaving'))return;
  overlay.classList.add('modal-leaving');
  window.setTimeout(function(){
    if(root.contains(overlay))root.innerHTML='';
  },180);
}


function closeModalSmooth(root){
  if(!root)return;
  const overlay=root.querySelector('.modal-bg');
  if(!overlay){root.innerHTML='';return;}
  if(overlay.classList.contains('modal-leaving'))return;
  overlay.classList.add('modal-leaving');
  window.setTimeout(function(){
    if(root.contains(overlay))root.innerHTML='';
  },180);
}

function shell(){
$('root').innerHTML=`<div id="login" class="login-page">
<a href="./" class="btn sm ghost login-back" id="btnBackLogin"><svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Trang chủ</a>
<div class="login-layout">
  <section class="login-intro">
    <div class="login-brand"><img src="${LOGO}" alt="" referrerpolicy="no-referrer"><span><strong>BDZ Console</strong><small>KEY MANAGEMENT</small></span></div>
    <div class="md-overline">ADMIN WORKSPACE</div>
    <h2>Quản lý hệ thống<br>trong một nơi.</h2>
    <p>Theo dõi key, quản lý phiên thiết bị, cấu hình và quyền truy cập từ một giao diện thống nhất.</p>
    <ul class="login-points">
      <li><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg> Quản lý key và trạng thái hoạt động</li>
      <li><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg> Theo dõi thống kê và phiên truy cập</li>
      <li><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg> Kiểm soát quyền quản trị</li>
    </ul>
  </section>
  <section class="login-box">
    <div class="login-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="8.5" cy="15.5" r="4.5"/><path d="m11.7 12.3 8.1-8.1 2 2-2 2 1.4 1.4-2.4 2.4-1.4-1.4-2.8 2.8"/></svg></div>
    <h1>Đăng nhập</h1>
    <p class="sub">Đăng nhập BDZ Console để tiếp tục đến không gian quản trị.</p>
    <div class="field"><label for="u">Email / Tên đăng nhập</label><input id="u" class="input" autocomplete="username" placeholder="Tài khoản admin"></div>
    <div class="field"><label for="p">Mật khẩu</label><input id="p" class="input" type="password" autocomplete="current-password" placeholder="Nhập mật khẩu"></div>
    <button id="loginBtn" class="btn primary lg">Đăng nhập <svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
    <div id="loginErr" class="err hidden" role="alert"></div>
    <p class="hint"><a href="./"><svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Về trang nhận key</a></p>
  </section>
</div>
</div>
<main id="app" class="hidden admin-shell">
  <header class="topbar">
    <button type="button" class="btn icon-btn" id="btnMenu" aria-label="Mở menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    <img class="logo-img" src="${LOGO}" alt="" referrerpolicy="no-referrer">
    <div class="topbar-brand"><span class="brand">BDZ Console</span><span class="topbar-subtitle">Key management workspace</span></div>
    <span class="grow"></span><span class="topbar-status"><span class="status-pulse"></span> Admin workspace</span>
    
    <button id="refresh" class="btn icon-btn" aria-label="Làm mới" title="Làm mới dữ liệu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5"/><path d="M20 12a8 8 0 0 0-14-5L4 9m0 8v-5h5"/><path d="M4 12a8 8 0 0 0 14 5l2-2"/></svg></button>
    <button id="logout" class="btn sm danger">Thoát</button>
  </header>
  <div class="side-mask" id="sideMask"></div>
  <aside class="side-nav" id="sideNav">
    <div class="side-head"><span>Workspace</span><button type="button" class="btn sm ghost" id="btnCloseSide" aria-label="Đóng menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <nav class="side-tabs" id="navTabs" aria-label="Điều hướng quản trị"></nav>
    <a href="./" class="side-foot-link"><svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Về trang nhận key</a>
  </aside>
  <div id="pages"></div>
</main>
<div id="modalRoot"></div><div id="menuRoot"></div>`;
$('pages').innerHTML=`<section id="pg-dash" class="view active">
<header class="md-admin-heading"><div><p class="md-overline">WORKSPACE OVERVIEW</p><h1>Tổng quan</h1><p class="hint">Tình hình key và hoạt động hệ thống của bạn.</p></div><span class="md-heading-chip"><span class="status-pulse"></span> Tổng quan hệ thống</span></header>
<div class="bento-dash">
  <div class="stat"><div class="stat-top"><b>Tổng key</b><span class="stat-icon"><svg viewBox="0 0 24 24"><circle cx="8.5" cy="15.5" r="4.5"/><path d="m12 12 8-8 2 2-2 2 1.4 1.4-2.4 2.4-1.4-1.4-2.8 2.8"/></svg></span></div><strong id="sTotal">0</strong><p class="stat-caption">Đã tạo trong hệ thống</p></div>
  <div class="stat"><div class="stat-top"><b>Hoạt động</b><span class="stat-icon"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span></div><strong id="sActive">0</strong><p class="stat-caption">Key đang được kích hoạt</p></div>
  <div class="stat"><div class="stat-top"><b>Thiết bị</b><span class="stat-icon"><svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/></svg></span></div><strong id="sDevices">0</strong><p class="stat-caption">Đã liên kết thiết bị</p></div>
  <div class="stat"><div class="stat-top"><b>IP bind</b><span class="stat-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg></span></div><strong id="sIp">0</strong><p class="stat-caption">Đã gắn IP</p></div>
  <div class="card tile-chart"><div class="section-head"><div><p class="md-overline">ANALYTICS</p><h2>Hoạt động theo ngày</h2><p class="hint">Thống kê sử dụng key trong tháng</p></div><span class="md-heading-chip">Tháng hiện tại</span></div><div id="chartMonth"></div><svg id="chart" viewBox="0 0 640 220" width="100%" height="220" style="display:block"></svg></div>
  <div class="card tile-note"><p class="md-overline">QUICK NOTE</p><h2>Vận hành hệ thống</h2><p class="hint">Quản lý key, thiết bị, IP và trạng thái truy cập tại mục <b>Key</b>. Sử dụng phần cài đặt để điều chỉnh giới hạn và thời hạn mặc định.</p><div class="md-heading-chip" style="margin-top:12px"><span class="status-pulse"></span> Workspace sẵn sàng</div></div>
</div></section>
<section id="pg-keys" class="view">
<header class="md-admin-heading"><div><p class="md-overline">ACCESS CONTROL</p><h1>Danh sách Key</h1><p class="hint">Tìm kiếm, lọc trạng thái và quản lý key đã phát hành.</p></div><div class="md-heading-actions"><button id="btnBulk" class="btn">Đa nhiệm ▾</button><button id="btnCreateKey" class="btn primary">+ Tạo key</button></div></header>
<div class="keys-layout"><div class="card keys-card"><div class="toolbar keys-toolbar"><input id="q" class="input" aria-label="Tìm key" placeholder="Tìm key…"><select id="filter" class="select" aria-label="Lọc trạng thái"><option value="">Tất cả trạng thái</option><option value="ACTIVE">Hoạt động</option><option value="DISABLED">Tắt</option><option value="EXPIRED">Hết hạn</option></select></div><div class="table-wrap keys-table-wrap"><table class="keys-table"><thead><tr><th style="width:36px"><input type="checkbox" id="chkAll" aria-label="Chọn tất cả"></th><th>Key</th><th>Trạng thái</th><th>Device</th><th>Hết hạn</th><th></th></tr></thead><tbody id="keyRows"></tbody></table></div><div id="keyCards" class="key-cards"></div></div></div></section>
<section id="pg-apikeys" class="view">
<header class="md-admin-heading"><div><p class="md-overline">DEVELOPER TOOLS</p><h1>API check key</h1><p class="hint">Thông tin tích hợp và mẫu code cho ứng dụng.</p></div></header>
<div class="bento-dash"><div class="card tile-7"><div class="section-head"><div><h2>Thông số API</h2><p class="hint">Endpoint và định dạng gọi API</p></div></div><pre class="code" id="apiSpec" style="margin:0;min-height:120px;white-space:pre-wrap"></pre></div><div class="card tile-5"><div class="section-head"><div><h2>Mẫu code</h2><p class="hint">Chọn ngôn ngữ để xem ví dụ.</p></div></div><div class="toolbar" style="margin:14px 0 12px"><button class="btn sm tab-lang active" data-lang="java">Java</button><button class="btn sm tab-lang" data-lang="native">Native</button><button class="btn sm tab-lang" data-lang="chung">Chung</button></div><pre class="code" id="apiSample" style="max-height:420px;overflow:auto;margin:0;white-space:pre-wrap"></pre></div></div></section>
<section id="pg-versions" class="view">
<header class="md-admin-heading"><div><p class="md-overline">RELEASE MANAGEMENT</p><h1>Version app</h1><p class="hint">Quản lý version được phép sử dụng và đường dẫn cập nhật.</p></div><button id="btnCreateVer" class="btn primary">+ Thêm version</button></header>
<div class="card"><div class="toolbar"><input id="verQ" class="input" placeholder="Lọc App ID hoặc version…" aria-label="Lọc version" style="max-width:320px"></div><div class="table-wrap versions-table-wrap"><table><thead><tr><th>App ID</th><th>Version</th><th>Trạng thái</th><th>Link</th><th>Ghi chú</th><th></th></tr></thead><tbody id="verRows"></tbody></table></div><div id="versionCards" class="version-cards"></div></div></section>
<section id="pg-admins" class="view">
<header class="md-admin-heading"><div><p class="md-overline">TEAM & PERMISSIONS</p><h1>Admin phụ</h1><p class="hint">Tạo tài khoản quản trị và kiểm soát quyền truy cập.</p></div><button id="btnCreateAdmin" class="btn primary">+ Admin phụ</button></header>
<div class="card"><div class="table-wrap admins-table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Trạng thái</th><th>Login</th><th></th></tr></thead><tbody id="adminRows"></tbody></table></div><div id="adminCards" class="admin-cards"></div></div></section>
<section id="pg-settings" class="view">
<header class="md-admin-heading"><div><p class="md-overline">SYSTEM PREFERENCES</p><h1>Cài đặt</h1><p class="hint">Quản lý thời hạn key, giới hạn thiết bị và chính sách liên kết.</p></div></header>
<div class="card"><div class="grid2"><div class="field"><label for="setDur">Thời hạn (giờ)</label><input id="setDur" class="input" type="number" min="1"></div><div class="field"><label for="setDev">Max devices</label><input id="setDev" class="input" type="number" min="1"></div><div class="field"><label for="setLim">Get / visitor</label><input id="setLim" class="input" type="number" min="1"></div><div class="field"><label for="setIp">Bind IP</label><select id="setIp" class="select"><option value="true">Bật</option><option value="false">Tắt</option></select></div><div class="field"><label for="setBind">Bind device</label><select id="setBind" class="select"><option value="true">Bật</option><option value="false">Tắt</option></select></div></div><button id="saveSet" class="btn primary">Lưu cài đặt</button><span id="saveMsg" role="status"></span></div></section>
<div id="viewLoader" class="view-loader hidden" role="status" aria-live="polite"><span class="loader-ring" aria-hidden="true"></span><span>Đang tải nội dung…</span></div>`;
if(typeof buildNav==='function')buildNav();
if($('loginBtn'))$('loginBtn').onclick=function(){if(typeof doLogin==='function')doLogin()};
if($('logout'))$('logout').onclick=function(){if(typeof doLogout==='function')doLogout()};
if($('refresh'))$('refresh').onclick=function(){if(typeof load==='function')load(true)};
if($('btnMenu'))$('btnMenu').onclick=openSide;
if($('btnCloseSide'))$('btnCloseSide').onclick=closeSide;
if($('sideMask'))$('sideMask').onclick=closeSide;
['u','p'].forEach(id=>{const el=$(id);if(el)el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(typeof doLogin==='function')doLogin()}})});
if($('btnCreateKey'))$('btnCreateKey').onclick=function(){if(!perms.can_create_key)return alert('Không có quyền');if(typeof modalKey==='function')modalKey()};
if($('btnCreateAdmin'))$('btnCreateAdmin').onclick=function(){if(!perms.can_admins)return alert('Không có quyền');if(typeof modalAdmin==='function')modalAdmin()};
if($('btnBulk'))$('btnBulk').onclick=function(e){if(typeof openBulkMenu==='function')openBulkMenu(e)};
if($('q'))$('q').oninput=function(){if(typeof renderKeys==='function')renderKeys()};
if($('filter'))$('filter').onchange=function(){if(typeof renderKeys==='function')renderKeys()};
if($('saveSet'))$('saveSet').onclick=function(){if(typeof saveSettings==='function')saveSettings()};
if($('chkAll'))$('chkAll').onchange=function(){document.querySelectorAll('.kchk').forEach(c=>c.checked=$('chkAll').checked)};
document.addEventListener('click',function(){const m=$('menuRoot');if(m)m.innerHTML=''});
document.querySelectorAll('.tab-lang').forEach(b=>b.onclick=function(){if(typeof showLang==='function')showLang(b.dataset.lang)});
if(typeof showLang==='function')showLang('java');
if($('btnCreateVer'))$('btnCreateVer').onclick=function(){if(typeof modalVersion==='function')modalVersion()};
if($('verQ'))$('verQ').oninput=function(){if(typeof renderVersions==='function')renderVersions()};
}
