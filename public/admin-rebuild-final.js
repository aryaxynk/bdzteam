(()=>{'use strict';
const LOGO='https://263.org.vn/logo';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
async function request(url,options={}){const r=await fetch(url,{credentials:'include',cache:'no-store',headers:{accept:'application/json',...(options.body?{'content-type':'application/json'}:{}),...(options.headers||{})},...options});const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={error:t||`HTTP ${r.status}`}}if(!r.ok||d.ok===false)throw Error(d.error||d.message||`HTTP ${r.status}`);return d}
function brand(){
  document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(l=>{l.href=LOGO;l.type='image/jpeg'});
  document.querySelectorAll('img').forEach(i=>{if(i.closest('.brand')||/bdzteam|catbox/i.test(i.src||'')||/^BDZTEAM$/i.test(i.alt||'')){i.src=LOGO;i.removeAttribute('srcset')}});
}
function ensureShopButton(){
  const nav=$('.nav'); if(!nav)return;
  let b=nav.querySelector('[data-bdz-rebuild-shop]');
  if(b)return b;
  b=document.createElement('button'); b.type='button'; b.className='nav-btn'; b.dataset.bdzRebuildShop='1'; b.innerHTML='<i class="fa-solid fa-store"></i>Shop';
  const product=nav.querySelector('[data-tab="products"]');
  const links=nav.querySelector('[data-tab="shortener"]');
  if(product)product.insertAdjacentElement('afterend',b); else if(links)links.insertAdjacentElement('beforebegin',b); else nav.appendChild(b);
  b.onclick=()=>openShop(b);
  return b;
}
function panelMarkup(items){return `<section class="panel"><div class="panel-head"><div><h2>Quản lý Shop</h2><p>Quản lý sản phẩm hiển thị tại Shop công khai.</p></div><button id="rbShopAdd" class="btn primary"><i class="fa-solid fa-plus"></i> Thêm sản phẩm</button></div><div id="rbShopEditor" class="stack hidden"></div><div id="rbShopList" class="list"></div></section>`}
function draw(items){
  const p=$('#panel'); if(!p)return; p.innerHTML=panelMarkup(items);
  const list=$('#rbShopList'); list.innerHTML=items.map((x,i)=>`<div class="row"><span><b>${esc(x.name)}</b><small>${esc(x.price||'Liên hệ')} · ${x.enabled===false?'Đang tắt':'Đang hiển thị'}</small></span><div class="row-actions"><button class="btn sm" data-rb-edit="${i}">Sửa</button><button class="btn sm ${x.enabled===false?'primary':''}" data-rb-toggle="${i}">${x.enabled===false?'Bật':'Tắt'}</button><button class="btn sm danger" data-rb-delete="${i}">Xóa</button></div></div>`).join('')||'<div class="empty">Shop chưa có sản phẩm.</div>';
  $('#rbShopAdd').onclick=()=>editor(items,-1);
  $$('[data-rb-edit]',list).forEach(b=>b.onclick=()=>editor(items,Number(b.dataset.rbEdit)));
  $$('[data-rb-toggle]',list).forEach(b=>b.onclick=async()=>{const i=Number(b.dataset.rbToggle);items[i].enabled=items[i].enabled===false;await save(items)});
  $$('[data-rb-delete]',list).forEach(b=>b.onclick=async()=>{const i=Number(b.dataset.rbDelete);if(!confirm(`Xóa ${items[i]?.name||'sản phẩm'}?`))return;items.splice(i,1);await save(items)});
}
function editor(items,index){
 const e=$('#rbShopEditor');if(!e)return;const x=index>=0?items[index]:{name:'',description:'',price:'',image_url:'',action_url:'',enabled:true};e.className='panel';e.innerHTML=`<div class="panel-head"><div><h2>${index>=0?'Sửa sản phẩm':'Thêm sản phẩm'}</h2><p>Thông tin hiển thị công khai.</p></div></div><div class="fields three"><label class="field">Tên<input id="rbName" maxlength="120" value="${esc(x.name)}"></label><label class="field">Giá<input id="rbPrice" maxlength="80" value="${esc(x.price)}" placeholder="50.000đ"></label><label class="field">Ảnh URL<input id="rbImage" maxlength="500" value="${esc(x.image_url)}"></label><label class="field">Link mua<input id="rbAction" maxlength="500" value="${esc(x.action_url)}" placeholder="https://..."></label><label class="field" style="grid-column:1/-1">Mô tả<textarea id="rbDesc" rows="3" maxlength="500">${esc(x.description)}</textarea></label><label class="field">Hiển thị<select id="rbEnabled"><option value="true" ${x.enabled!==false?'selected':''}>Bật</option><option value="false" ${x.enabled===false?'selected':''}>Tắt</option></select></label></div><div class="row-actions"><button id="rbSave" class="btn primary">Lưu</button><button id="rbCancel" class="btn sm">Hủy</button></div>`;
 $('#rbSave').onclick=async()=>{const v={...(index>=0?items[index]:{id:`shop-${Date.now()}`}),name:String($('#rbName').value||'').trim(),price:String($('#rbPrice').value||'').trim(),image_url:String($('#rbImage').value||'').trim(),action_url:String($('#rbAction').value||'').trim(),description:String($('#rbDesc').value||'').trim(),enabled:$('#rbEnabled').value==='true'};if(!v.name)return alert('Vui lòng nhập tên sản phẩm.');if(!v.action_url)return alert('Vui lòng nhập link mua.');if(index>=0)items[index]=v;else items.push(v);await save(items)};
 $('#rbCancel').onclick=()=>{e.className='stack hidden';e.innerHTML=''};
}
async function save(items){try{const d=await request('/api/admin/shop',{method:'POST',body:JSON.stringify({action:'save',items})});draw(d.items||items)}catch(e){alert(e.message||'Không thể lưu Shop.')}}
async function openShop(btn){
  $$('[data-tab]',document).forEach(x=>x.classList.remove('active')); $$('.nav-btn',document).forEach(x=>x.classList.remove('active')); btn.classList.add('active');
  const title=$('#title'),sub=$('#sub');if(title)title.textContent='Shop';if(sub)sub.textContent='Quản lý sản phẩm Shop';
  try{const d=await request('/api/admin/shop');draw(d.items||[])}catch(e){const p=$('#panel');if(p)p.innerHTML=`<section class="panel"><div class="empty">${esc(e.message||'Không thể tải Shop.')}</div></section>`}
}
function ensureStyles(){if($('#rbStyle'))return;const s=document.createElement('style');s.id='rbStyle';s.textContent='.rb-rebuild-badge{font-size:10px;font-weight:700;color:#64748b;margin-left:8px}';document.head.appendChild(s)}
function boot(){brand();ensureStyles();ensureShopButton();setInterval(()=>{brand();const b=ensureShopButton();if(b)b.onclick=()=>openShop(b)},700)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
