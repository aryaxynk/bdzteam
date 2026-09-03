(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const msg=e=>e instanceof Error?e.message:e&&typeof e==='object'?(e.error||e.message||e.detail||JSON.stringify(e)):String(e??'');
const api=async body=>{const r=await fetch('/api/admin/action',{method:'POST',credentials:'include',cache:'no-store',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify(body)});const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={error:t||`HTTP ${r.status}`}}if(!r.ok||d.ok===false)throw Error(msg(d)||`HTTP ${r.status}`);return d};
let cache=[];let loadedAt=0;let pending=false;
async function loadInfo(force=false){if(!force&&Date.now()-loadedAt<2500&&cache.length)return cache;const r=await fetch('/api/admin/key-info',{credentials:'include',cache:'no-store',headers:{accept:'application/json'}});const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw Error(msg(d)||`HTTP ${r.status}`);cache=d.keys||[];loadedAt=Date.now();return cache}
function addStyle(){if($('#admin-key-extra-style'))return;const s=document.createElement('style');s.id='admin-key-extra-style';s.textContent='.key-extra{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}.key-extra .key-chip{font-size:11px;font-weight:800;padding:5px 8px;border-radius:999px;border:1px solid #dfe5ec;background:#f7f9fb;color:#3d4652}.key-extra .key-chip strong{color:#111}.menu button[data-set-limit]{display:block}.key-scope-hidden{display:none!important}';document.head.appendChild(s)}
function find(id){return cache.find(k=>Number(k.id)===Number(id))}
function unifyCreateForm(){
 const scope=$('#kScope');
 if(scope){scope.value='ADMIN';const label=scope.closest('.field');if(label)label.classList.add('key-scope-hidden')}
 const max=$('#maxDevicesWrap');if(max){const title=max.querySelector('.field');}
 const labels=$$('#panel .field');
 labels.forEach(label=>{const text=(label.firstChild?.textContent||'').trim();
  if(text==='Thời hạn (giờ)')label.firstChild.textContent='Setup Key · Thời hạn (giờ)';
  if(text==='Số thiết bị')label.firstChild.textContent='Setup Key · Số thiết bị';
 });
 const head=$('#panel .panel-head h2');if(head&&head.textContent.trim()==='Tạo Key'){const p=head.parentElement?.querySelector('p');if(p)p.textContent='Key dùng chung. User Get Key tự dùng cấu hình mặc định; Admin có thể Setup Key khi tạo.'}
}
function enrich(){
 addStyle();
 if(($('#title')?.textContent||'').trim()==='Quản lý Key')unifyCreateForm();
 $$('.key-card').forEach(card=>{
  const menu=card.querySelector('.menu');const id=menu?.id?.replace(/^menu-/,'');if(!id)return;const k=find(id);if(!k)return;
  let extra=card.querySelector('.key-extra');if(!extra){extra=document.createElement('div');extra.className='key-extra';const main=card.querySelector('.key-main');(main||card).appendChild(extra)}
  const slug=k.product_slug||k.products?.slug||'—';const name=k.product_name||k.products?.name||'—';const used=Number(k.devices_used||0);const limit=Number(k.max_devices||0);
  const setup=limit>0?`<span class=\"key-chip\">Thiết bị: <strong>${Math.min(used,limit)}/${limit}</strong></span>`:'<span class=\"key-chip\">Thiết bị: <strong>Mặc định</strong></span>';
  const html=`<span class=\"key-chip\">Key</span><span class=\"key-chip\">Product: <strong>${esc(name)}</strong></span><span class=\"key-chip\">Slug: <strong>${esc(slug)}</strong></span>${setup}`;
  if(extra.innerHTML!==html)extra.innerHTML=html;
  if(!menu.querySelector('[data-set-limit]')){const b=document.createElement('button');b.type='button';b.dataset.setLimit=id;b.textContent='Setup Limit';menu.insertBefore(b,menu.firstChild)}
 });
}
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;enrich()})}
async function editLimit(id){
 const k=find(id);if(!k)return;
 const used=Number(k.devices_used||0),old=Math.max(1,Number(k.max_devices||1));const value=window.prompt(`Setup giới hạn thiết bị (đã dùng ${used}/${old}). Nếu giảm limit, thiết bị vượt giới hạn sẽ bị gỡ liên kết:`,String(old));if(value===null)return;const n=Number(value);if(!Number.isInteger(n)||n<1||n>1000){alert('Limit phải là số nguyên từ 1 đến 1000.');return}
 try{const result=await api({action:'set_key_limit',key_id:Number(id),max_devices:n});k.max_devices=n;k.devices_used=Number(result.devices_used??Math.min(used,n));await loadInfo(true);enrich();if(Number(result.removed_devices||0)>0)alert(`Đã giảm Limit xuống ${n}. Đã gỡ ${result.removed_devices} thiết bị vượt giới hạn.`)}catch(e){alert(msg(e)||'Không thể cập nhật Limit.')}
}
document.addEventListener('click',async e=>{const b=e.target.closest?.('[data-set-limit]');if(b){e.preventDefault();e.stopPropagation();await editLimit(b.dataset.setLimit);return}const m=e.target.closest?.('[data-menu]');if(m)setTimeout(schedule,0)});
const obs=new MutationObserver(()=>schedule());obs.observe(document.body,{subtree:true,childList:true});
async function boot(){try{await loadInfo();enrich()}catch{}}
window.setTimeout(boot,700);window.addEventListener('load',boot);
})();
