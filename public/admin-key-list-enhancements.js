(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const msg=e=>e instanceof Error?e.message:e&&typeof e==='object'?(e.error||e.message||e.detail||JSON.stringify(e)):String(e??'');
const api=async body=>{const r=await fetch('/api/admin/action',{method:'POST',credentials:'include',cache:'no-store',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify(body)});const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={error:t||`HTTP ${r.status}`}}if(!r.ok||d.ok===false)throw Error(msg(d)||`HTTP ${r.status}`);return d};
let cache=[];let loadedAt=0;
async function loadInfo(force=false){if(!force&&Date.now()-loadedAt<2500&&cache.length)return cache;const r=await fetch('/api/admin/key-info',{credentials:'include',cache:'no-store',headers:{accept:'application/json'}});const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw Error(msg(d)||`HTTP ${r.status}`);cache=d.keys||[];loadedAt=Date.now();return cache}
function addStyle(){if($('#admin-key-extra-style'))return;const s=document.createElement('style');s.id='admin-key-extra-style';s.textContent='.key-extra{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}.key-extra .key-chip{font-size:11px;font-weight:800;padding:5px 8px;border-radius:999px;border:1px solid #dfe5ec;background:#f7f9fb;color:#3d4652}.key-extra .key-chip strong{color:#111}.key-limit-editor{display:flex;align-items:center;gap:7px;margin-top:8px}.key-limit-editor input{width:86px;padding:7px 9px;border:1px solid #dfe5ec;border-radius:9px;font:inherit}.key-limit-editor .btn{padding:7px 10px}.key-limit-msg{font-size:11px;color:#737d8a}.menu button[data-set-limit]{display:block}';document.head.appendChild(s)}
function find(id){return cache.find(k=>Number(k.id)===Number(id))}
function enrich(){
 addStyle();
 $$('.key-card [data-menu]').forEach(()=>{});
 $$('.key-card').forEach(card=>{
  const menu=card.querySelector('.menu');const id=menu?.id?.replace(/^menu-/,'');if(!id)return;const k=find(id);if(!k)return;
  let extra=card.querySelector('.key-extra');if(!extra){extra=document.createElement('div');extra.className='key-extra';const main=card.querySelector('.key-main');(main||card).appendChild(extra)}
  const scope=String(k.key_scope||'').toUpperCase()==='ADMIN'?'ADMIN':'GET';const slug=k.product_slug||k.products?.slug||'—';const name=k.product_name||k.products?.name||'—';const used=Number(k.devices_used||0);const limit=scope==='ADMIN'?Number(k.max_devices||0):0;
  extra.innerHTML=`<span class="key-chip">Loại: <strong>${scope}</strong></span><span class="key-chip">Product: <strong>${esc(name)}</strong></span><span class="key-chip">Slug: <strong>${esc(slug)}</strong></span>${scope==='ADMIN'?`<span class="key-chip">Thiết bị: <strong>${used}/${limit}</strong></span>`:'<span class="key-chip">Limit: <strong>1 lần</strong></span>'}`;
  if(scope==='ADMIN'&&!menu.querySelector('[data-set-limit]')){const b=document.createElement('button');b.type='button';b.dataset.setLimit=id;b.textContent='Sửa Limit';menu.insertBefore(b,menu.firstChild)}
 });
}
async function editLimit(id){
 const k=find(id);if(!k||String(k.key_scope||'').toUpperCase()!=='ADMIN')return;
 const used=Number(k.devices_used||0),old=Number(k.max_devices||1);const value=window.prompt(`Giới hạn thiết bị mới (đã dùng ${used}/${old}):`,String(old));if(value===null)return;const n=Number(value);if(!Number.isInteger(n)||n<1||n>1000){alert('Limit phải là số nguyên từ 1 đến 1000.');return}if(n<used){alert(`Limit mới không được nhỏ hơn số thiết bị đã dùng (${used}).`);return}
 try{await api({action:'set_key_limit',key_id:Number(id),max_devices:n});await loadInfo(true);document.dispatchEvent(new CustomEvent('bdz:key-list-refresh'));alert(`Đã cập nhật Limit: ${n} thiết bị.`)}catch(e){alert(msg(e)||'Không thể cập nhật Limit.')}
}
document.addEventListener('click',async e=>{const b=e.target.closest?.('[data-set-limit]');if(b){e.preventDefault();e.stopPropagation();await editLimit(b.dataset.setLimit);return}const m=e.target.closest?.('[data-menu]');if(m){setTimeout(()=>enrich(),0)}});
const obs=new MutationObserver(()=>enrich());obs.observe(document.body,{subtree:true,childList:true});
async function boot(){try{await loadInfo();enrich()}catch{}}
window.setTimeout(boot,700);
window.addEventListener('load',boot);
})();
