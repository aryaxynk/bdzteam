(()=>{
'use strict';
if(window.__bdzCleanNav)return;window.__bdzCleanNav=true;
const $=s=>document.querySelector(s);
const hideTabs=['logs','integration','notifications','maintenance'];
function rename(btn,icon,text){if(!btn)return;btn.dataset.tab=btn.dataset.tab||'';const i=btn.querySelector('i'),s=btn.querySelector('span');if(i)i.className=icon;if(s)s.textContent=text}
function switchExisting(tab){const b=document.querySelector(`[data-tab="${tab}"]`);if(b){b.click();return true}return false}
function buildSystemHub(){const root=$('#tabContent');if(!root)return;const items=[['logs','fa-clock-rotate-left','Nhật Ký','Xem các sự kiện và lịch sử hoạt động'],['integration','fa-code','Tích Hợp API','Xem contract API cho Game/Menu'],['notifications','fa-bell','Thông Báo','Quản lý thông báo hiển thị trên website'],['maintenance','fa-screwdriver-wrench','Bảo Trì Website','Bật/tắt chế độ bảo trì và nội dung bảo trì']];root.innerHTML=`<div class="admin-panel p-4"><h2 class="font-black text-lg">Hệ Thống</h2><p class="text-xs text-[#666] mt-1 mb-4">Các công cụ hệ thống được gom vào một khu vực để dễ quản lý.</p><div class="grid md:grid-cols-2 gap-3">${items.map(x=>`<button type="button" class="admin-hub-item" data-system-target="${x[0]}"><i class="fa-solid ${x[1]}"></i><span><b>${x[2]}</b><small>${x[3]}</small></span><i class="fa-solid fa-chevron-right"></i></button>`).join('')}</div></div>`;root.querySelectorAll('[data-system-target]').forEach(b=>b.addEventListener('click',()=>switchExisting(b.dataset.systemTarget)))}
function install(){
 const side=document.querySelector('.admin-side-scroll');if(!side)return;
 const buttons=[...side.querySelectorAll('[data-tab]')];
 hideTabs.forEach(t=>{const b=side.querySelector(`[data-tab="${t}"]`);if(b)b.closest('.admin-nav-group')?.querySelector(`[data-tab="${t}"]`)?.setAttribute('hidden','hidden')||b.setAttribute('hidden','hidden')});
 buttons.filter(b=>hideTabs.includes(b.dataset.tab)).forEach(b=>b.setAttribute('hidden','hidden'));
 const sec=side.querySelector('[data-tab="security"]');
 if(sec && !side.querySelector('[data-tab="system"]')){const g=sec.closest('.admin-nav-group');const b=document.createElement('button');b.type='button';b.className='admin-side-item';b.dataset.tab='system';b.innerHTML='<i class="fa-solid fa-sliders"></i><span>Hệ Thống</span>';g?.appendChild(b);b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));const h=$('#tabTitle'),s=$('#tabSub');if(h)h.textContent='Hệ Thống';if(s)s.textContent='Công cụ hệ thống';buildSystemHub()},{capture:true});}
 rename(side.querySelector('[data-tab="subadmins"]'),'fa-solid fa-ticket','Referral Code');
 rename(side.querySelector('[data-tab="settings"]'),'fa-solid fa-gear','Cấu Hình');
 const oldSub=side.querySelector('[data-tab="subadmins"]');if(oldSub)oldSub.title='Quản lý Referral Code cho Admin phụ';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
