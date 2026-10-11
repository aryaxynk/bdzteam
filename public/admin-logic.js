function buildNav(){
  const tabs=[['dash','Tổng quan'],['keys','Key'],['apikeys','API'],['versions','Version'],['admins','Admin'],['settings','Cài đặt']];
  const nav=$('navTabs');
  if(!nav)return;
  if($('pg-bans'))tabs.splice(tabs.length-1,0,['bans','Ban']);
  const active=nav.querySelector('.side-item.active, .tab.active');
  const keep=active&&active.dataset.p;
  const icons={
    dash:'<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>',
    keys:'<svg viewBox="0 0 24 24"><circle cx="8" cy="15.5" r="4.5"/><path d="m11.2 12.3 8.3-8.3 2 2-2 2 1.4 1.4-2.4 2.4-1.4-1.4-3.1 3.1"/></svg>',
    apikeys:'<svg viewBox="0 0 24 24"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>',
    versions:'<svg viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>',
    admins:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.3"/><path d="M3 20v-1.4A4.6 4.6 0 0 1 7.6 14h2.8a4.6 4.6 0 0 1 4.6 4.6V20M16 4.8a3.3 3.3 0 0 1 0 6.4M18 14.2a4.4 4.4 0 0 1 3 4.2V20"/></svg>',
    settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="m19.4 15 .1.1 1.5 1.2-1.5 2.6-1.8-.7a8 8 0 0 1-1.7 1l-.3 1.9h-3l-.3-1.9a8 8 0 0 1-1.7-1l-1.8.7-1.5-2.6L7 15a8 8 0 0 1 0-2l-1.5-1.2L7 9.2l1.8.7a8 8 0 0 1 1.7-1l.3-1.9h3l.3 1.9a8 8 0 0 1 1.7 1l1.8-.7 1.5 2.6-1.5 1.2a8 8 0 0 1-.1 2Z"/></svg>',
    bans:'<svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.6 2.9 7.9 7 10 4.1-2.1 7-5.4 7-10V6l-7-3Z"/><path d="m9 9 6 6m0-6-6 6"/></svg>'
  };
  nav.innerHTML=tabs.map(t=>'<button type="button" class="side-item" data-p="'+t[0]+'"><span class="nav-icon" aria-hidden="true">'+(icons[t[0]]||icons.dash)+'</span><span class="side-label">'+t[1]+'</span></button>').join('');
  nav.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{page(b.dataset.p);if(typeof closeSide==='function')closeSide()});
  page(keep&&tabs.some(t=>t[0]===keep)?keep:'dash');
}
let pageLoadSeq=0,pageLoadTimer=null;
async function page(name){
  if(!name)name='dash';
  const seq=++pageLoadSeq;
  if(pageLoadTimer){clearTimeout(pageLoadTimer);pageLoadTimer=null;}
  const loader=$('viewLoader');
  if(loader)loader.classList.add('hidden');
  document.querySelectorAll('.side-item,.tab').forEach(b=>b.classList.toggle('active',b.dataset.p===name));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='pg-'+name));
  const el=$('pg-'+name);if(el)el.classList.add('active');
  if(name==='apikeys'&&typeof showLang==='function'){
    showLang((document.querySelector('.tab-lang.active')||{}).dataset?.lang||'java');
    document.querySelectorAll('.tab-lang').forEach(b=>b.onclick=()=>showLang(b.dataset.lang));
  }
  const tasks=[];
  if(name==='versions'&&typeof loadVersions==='function')tasks.push(loadVersions());
  if(name==='versions'&&!$('pg-versions'))console.error('pg-versions missing');
  if(name==='bans'&&typeof loadBans==='function')tasks.push(loadBans());
  if(tasks.length&&loader){
    pageLoadTimer=setTimeout(()=>{if(seq===pageLoadSeq)loader.classList.remove('hidden');},110);
    await Promise.allSettled(tasks);
    if(pageLoadTimer){clearTimeout(pageLoadTimer);pageLoadTimer=null;}
    if(seq===pageLoadSeq)loader.classList.add('hidden');
  }
}
function showApp(){$('login').classList.add('hidden');$('app').classList.remove('hidden')}
async function doLogin(){
const e=$('loginErr'); if(e) e.classList.add('hidden');
const btn=$('loginBtn'); if(btn) btn.disabled=true;
try{
  if(typeof BDZ==='undefined'||!BDZ.rpc) throw Error('Chưa tải cấu hình API. Refresh trang.');
  const u=($('u')&&$('u').value||'').trim();
  const p=$('p')&&$('p').value||'';
  if(!u||!p) throw Error('Nhập tài khoản và mật khẩu.');
  const x=await BDZ.rpc('bdz_admin_login',{p_username:u,p_password:p,p_ip:BDZ.visitorId?BDZ.visitorId():'',p_user_agent:navigator.userAgent.slice(0,200)});
  if(!x||!x.ok) throw Error((x&&(x.error==='INVALID'||x.error==='INVALID_LOGIN'))?'Sai tài khoản hoặc mật khẩu.':(x&&x.error)||'Sai tài khoản hoặc mật khẩu.');
  sessionStorage.setItem('bdz_t',x.token);
  sessionStorage.setItem('bdz_r',x.role||'');
  role=x.role||'OWNER';
  if($('p')) $('p').value='';
  showApp();
  await load(true);
}catch(err){
  if(e){ e.textContent=err&&err.message?err.message:'Sai tài khoản hoặc mật khẩu.'; e.classList.remove('hidden'); }
}finally{ if(btn) btn.disabled=false; }
}
async function doLogout(){try{await BDZ.rpc('bdz_admin_logout',{p_token:tok()})}catch{}sessionStorage.clear();location.reload()}
async function rpcAction(action,payload){const x=await BDZ.rpc('bdz_admin_key_action',{p_token:tok(),p_action:action,p_payload:payload});if(!x?.ok)throw Error(x?.error||'Lỗi');return x}
async function load(full){if(!tok())return;try{const x=await BDZ.rpc('bdz_admin_keys',{p_token:tok()});if(x?.error==='UNAUTHORIZED'){sessionStorage.clear();location.reload();return}rows=x?.keys||[];renderDash();renderKeys();if(full){await loadPerms();buildNav();await Promise.all([loadSettings(),loadAdmins(),loadChart(),typeof loadVersions==='function'?loadVersions():Promise.resolve()])}else await loadChart()}catch(e){console.warn(e)}}
async function loadPerms(){try{const x=await BDZ.rpc('bdz_admin_perms',{p_token:tok(),p_action:'get_me'});if(x?.ok){role=x.role||role;perms=x.perms||perms}}catch{}}
function renderDash(){const a=rows.filter(k=>['ACTIVE','REACTIVATED'].includes(k.status)).length,d=rows.filter(k=>k.device_id_hash||k.activated_device_id_hash).length,ip=rows.filter(k=>k.activated_ip_hash).length;if($('sTotal'))$('sTotal').textContent=rows.length;if($('sActive'))$('sActive').textContent=a;if($('sDevices'))$('sDevices').textContent=d;if($('sIp'))$('sIp').textContent=ip}
async function loadChart(){try{const x=await BDZ.rpc('bdz_admin_chart',{p_token:tok()});if(x?.ok&&typeof drawChart==='function')drawChart(x.series||[])}catch{}}
function selectedIds(){return [...document.querySelectorAll('.kchk:checked')].map(c=>+c.value)}
function openBulkMenu(e){e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();$('menuRoot').innerHTML=`<div class="menu" style="position:fixed;top:${r.bottom+4}px;left:${r.left}px;z-index:200"><button class="menu-item" data-b="enable">Bật đã chọn</button><button class="menu-item" data-b="disable">Tắt đã chọn</button><button class="menu-item" data-b="del">Xóa đã chọn</button><button class="menu-item danger" data-b="delall">Xóa tất cả</button></div>`;document.querySelectorAll('.menu-item').forEach(b=>b.onclick=async ev=>{ev.stopPropagation();$('menuRoot').innerHTML='';const act=b.dataset.b;try{if(act==='delall'){if(!confirm('Xóa TẤT CẢ key?'))return;await BDZ.rpc('bdz_admin_keys_bulk',{p_token:tok(),p_action:'delete_all'})}else{const ids=selectedIds();if(!ids.length)return alert('Chọn key');if(act==='del'){if(!confirm('Xóa '+ids.length+' key?'))return;await BDZ.rpc('bdz_admin_keys_bulk',{p_token:tok(),p_action:'delete_selected',p_ids:ids})}if(act==='enable')await BDZ.rpc('bdz_admin_keys_bulk',{p_token:tok(),p_action:'enable_selected',p_ids:ids});if(act==='disable')await BDZ.rpc('bdz_admin_keys_bulk',{p_token:tok(),p_action:'disable_selected',p_ids:ids})}load()}catch(err){alert(err.message)}})}
function openRowMenu(e,id,kind){e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();const items=kind==='key'?`<button class="menu-item" data-a="edit">Sửa</button><button class="menu-item" data-a="toggle">Bật/Tắt</button><button class="menu-item" data-a="device">Reset device/IP</button><button class="menu-item danger" data-a="del">Xóa</button>`:`<button class="menu-item" data-a="edit">Sửa</button><button class="menu-item" data-a="perms">Phân quyền</button>`;$('menuRoot').innerHTML=`<div class="menu" style="position:fixed;top:${r.bottom+4}px;left:${Math.min(r.left,window.innerWidth-160)}px;z-index:200">${items}</div>`;document.querySelectorAll('.menu-item').forEach(b=>b.onclick=async ev=>{ev.stopPropagation();$('menuRoot').innerHTML='';const a=b.dataset.a;try{if(kind==='key'){const k=rows.find(x=>x.id===id);if(!k)return;if(a==='edit'){if(!perms.can_edit_key)return alert('Không có quyền');return modalKey(k)}if(a==='toggle')await rpcAction('status',{id,status:['ACTIVE','REACTIVATED'].includes(k.status)?'DISABLED':'ACTIVE'});if(a==='device'){if(!confirm('Reset?'))return;await rpcAction('reset_device',{id})}if(a==='del'){if(!perms.can_delete_key)return alert('Không có quyền');if(!confirm('Xóa?'))return;await rpcAction('delete',{id})}load()}else{const u=admins.find(x=>x.id===id);if(!u)return;if(a==='edit')modalAdmin(u);if(a==='perms')modalPerms(u)}}catch(err){alert(err.message)}})}
