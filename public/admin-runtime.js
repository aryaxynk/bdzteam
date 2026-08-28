(()=>{
'use strict';
const mq=()=>window.matchMedia('(max-width:900px)').matches;
const el=id=>document.getElementById(id);
const shell=()=>document.querySelector('.admin-shell');
const sidebar=()=>el('adminSidebar');
const backdrop=()=>el('adminBackdrop');
let bound=false;
function closeMobile(){sidebar()?.classList.remove('is-open');backdrop()?.classList.remove('is-visible');document.body.classList.remove('admin-menu-open')}
function openMobile(){sidebar()?.classList.add('is-open');backdrop()?.classList.add('is-visible');document.body.classList.add('admin-menu-open')}
function toggleSidebar(){
  if(mq()){
    if(sidebar()?.classList.contains('is-open')) closeMobile(); else openMobile();
  }else{
    shell()?.classList.toggle('is-collapsed');
  }
}
function bind(){
  if(bound)return;bound=true;
  el('adminMenuBtn')?.addEventListener('click',toggleSidebar);
  el('adminCloseBtn')?.addEventListener('click',closeMobile);
  backdrop()?.addEventListener('click',closeMobile);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobile()});
  document.addEventListener('click',e=>{
    const item=e.target.closest('.admin-side-item[data-tab]');
    if(item&&mq()) requestAnimationFrame(closeMobile);
  });
  const onViewportChange=()=>{if(!mq()){closeMobile()}else if(!sidebar()?.classList.contains('is-open'))document.body.classList.remove('admin-menu-open')};
  window.addEventListener('resize',onViewportChange,{passive:true});
  window.matchMedia('(max-width:900px)').addEventListener?.('change',onViewportChange);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
