(()=>{
  'use strict';
  const lock=()=>{document.documentElement.dataset.devtools='1';document.body.innerHTML='<main style="min-height:100vh;display:grid;place-items:center;background:#08090c;color:#f5f7fb;font:700 18px system-ui;text-align:center;padding:24px"><div>Trang đã bị khóa. Hãy đóng công cụ phát triển rồi tải lại.</div></main>';};
  const blocked=e=>{
    const k=(e.key||'').toLowerCase();
    if(e.key==='F12'||(e.ctrlKey&&e.shiftKey&&['i','j','c'].includes(k))||(e.ctrlKey&&['u','s'].includes(k))){e.preventDefault();e.stopPropagation();return true;}
    return false;
  };
  addEventListener('keydown',blocked,true);
  addEventListener('contextmenu',e=>e.preventDefault(),true);
  addEventListener('dragstart',e=>e.preventDefault(),true);
  addEventListener('selectstart',e=>e.preventDefault(),true);
  addEventListener('copy',e=>e.preventDefault(),true);
  addEventListener('cut',e=>e.preventDefault(),true);
  let last=false;
  const check=()=>{
    const gapW=Math.abs(outerWidth-innerWidth)>180;
    const gapH=Math.abs(outerHeight-innerHeight)>180;
    const open=gapW||gapH;
    if(open&&!last){last=true;lock();}
    if(!open) last=false;
  };
  setInterval(check,900);
  check();
})();
