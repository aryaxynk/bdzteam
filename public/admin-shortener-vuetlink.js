(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const msg=e=>e instanceof Error?e.message:e&&typeof e==='object'?(e.error||e.message||e.detail||JSON.stringify(e)):String(e??'');
const DEFAULT_URL='https://vuotlink.xyz/api';
let mounted=false;
async function api(body){
 const r=await fetch('/api/admin/action',{method:'POST',credentials:'include',cache:'no-store',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify(body)});
 const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={error:t||`HTTP ${r.status}`}}
 if(!r.ok||d.ok===false)throw Error(msg(d)||`HTTP ${r.status}`);return d;
}
function render(){
 const title=$('#title'),panel=$('#panel');
 if(!title||!panel||title.textContent.trim()!=='Liên kết')return false;
 if(mounted&&panel.dataset.vuotlinkUi==='1')return true;
 mounted=true;panel.dataset.vuotlinkUi='1';
 const role=document.querySelector('.role')?.textContent||'';
 const isMain=/ADMIN CHÍNH/i.test(role);
 const savedUrl=localStorage.getItem('bdz_vuotlink_api_url')||DEFAULT_URL;
 panel.innerHTML=`<section class="panel">
  <div class="panel-head"><div><h2>API rút gọn link</h2><p>Vuotlink · 1 API cố định cho toàn bộ luồng Get Key.</p></div></div>
  <div class="endpoint"><strong>GET</strong><code>${esc(savedUrl)}</code></div>
  ${isMain?`<div class="fields three">
    <label class="field">API URL<input id="vuotlinkApiUrl" type="url" value="${esc(savedUrl)}" placeholder="https://vuotlink.xyz/api"></label>
    <label class="field">API Token<input id="vuotlinkApiToken" type="password" placeholder="Nhập token mới"></label>
    <button id="vuotlinkSave" class="btn primary">Lưu API</button>
  </div>`:`<div class="empty">Chỉ Admin chính được chỉnh API rút gọn link.</div>`}
 </section>`;
 if(isMain){
  $('#vuotlinkSave').onclick=async()=>{
   const btn=$('#vuotlinkSave');const url=String($('#vuotlinkApiUrl')?.value||'').trim()||DEFAULT_URL;const token=String($('#vuotlinkApiToken')?.value||'').trim();
   try{
    const parsed=new URL(url);if(!/^https?:$/.test(parsed.protocol))throw Error('API URL không hợp lệ.');
    btn.disabled=true;btn.textContent='Đang lưu...';
    await api({action:'save_shortener_slot',position:1,provider:'vuotlink',token,api_url:parsed.href.replace(/\/$/,''),quota:0,enabled:true});
    localStorage.setItem('bdz_vuotlink_api_url',parsed.href.replace(/\/$/,''));
    btn.textContent='Đã lưu';
    setTimeout(()=>{btn.disabled=false;btn.textContent='Lưu API'},700);
   }catch(e){btn.disabled=false;btn.textContent='Lưu API';alert(msg(e)||'Không thể lưu API rút gọn link.')}
  };
 }
 return true;
}
const observer=new MutationObserver(()=>{const title=$('#title');if(title?.textContent.trim()==='Liên kết'){setTimeout(render,0)}else{mounted=false}});
observer.observe(document.body,{subtree:true,childList:true});
document.addEventListener('DOMContentLoaded',render);
})();
