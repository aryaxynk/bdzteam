(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const DEFAULT_URL='https://vuotlink.xyz/api';
let mounted=false;
async function api(body){
 const r=await fetch('/api/admin/action',{method:'POST',credentials:'include',cache:'no-store',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify(body)});
 const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={error:t||`HTTP ${r.status}`}}
 if(!r.ok||d.ok===false)throw Error(d.error||d.message||`HTTP ${r.status}`);return d;
}
function render(){
 const title=$('#title'),panel=$('#panel');
 if(!title||title.textContent.trim()!=='Liên kết'||!panel)return;
 if(mounted&&panel.dataset.vuotlinkFixed==='1')return;
 mounted=true;panel.dataset.vuotlinkFixed='1';
 const isMain=/ADMIN CHÍNH/i.test($('.role')?.textContent||'');
 const url=localStorage.getItem('bdz_vuotlink_api_url')||DEFAULT_URL;
 panel.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Rút gọn link</h2><p>Vuotlink · dùng chung cho toàn bộ luồng Get Key.</p></div><span class="badge active">Đang dùng</span></div><div class="endpoint"><strong>GET</strong><code id="vuotlinkPreview">${esc(url)}?api=••••••&url=DESTINATION</code></div>${isMain?`<div class="fields three"><label class="field">API URL<input id="vuotlinkApiUrl" type="url" value="${esc(url)}" placeholder="https://vuotlink.xyz/api"></label><label class="field">API Token<input id="vuotlinkApiToken" type="password" placeholder="Nhập token mới"></label><button id="vuotlinkSave" class="btn primary">Lưu API</button></div>`:'<div class="empty">Chỉ Admin chính được chỉnh API rút gọn link.</div>'}</section>`;
 if(!isMain)return;
 $('#vuotlinkSave').onclick=async()=>{
  const btn=$('#vuotlinkSave');const inputUrl=String($('#vuotlinkApiUrl')?.value||'').trim()||DEFAULT_URL;const token=String($('#vuotlinkApiToken')?.value||'').trim();
  try{
   const parsed=new URL(inputUrl);if(!/^https?:$/.test(parsed.protocol))throw Error('API URL không hợp lệ.');
   btn.disabled=true;btn.textContent='Đang lưu...';
   await api({action:'save_shortener_slot',position:1,provider:'vuotlink',token,api_url:parsed.href.replace(/\/$/,''),quota:0,enabled:true});
   localStorage.setItem('bdz_vuotlink_api_url',parsed.href.replace(/\/$/,''));
   btn.disabled=false;btn.textContent='Đã lưu';
   const preview=$('#vuotlinkPreview');if(preview)preview.textContent=`${parsed.href.replace(/\/$/,'')}?api=••••••&url=DESTINATION`;
  }catch(e){btn.disabled=false;btn.textContent='Lưu API';alert(e.message||'Không thể lưu API rút gọn link.')}
 };
}
const observer=new MutationObserver(()=>{const title=$('#title');if(title?.textContent.trim()==='Liên kết')setTimeout(render,0);else{mounted=false}});
observer.observe(document.body,{subtree:true,childList:true});
document.addEventListener('DOMContentLoaded',render);render();
})();
