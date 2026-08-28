const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hideLoader=()=>document.getElementById('bdzPageLoader')?.classList.add('hide');
function mountMotionStyles(){if(document.querySelector('link[data-bdz-motion]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='/motion.css';l.dataset.bdzMotion='1';document.head.appendChild(l)}
function mountUIPolish(){if(document.querySelector('link[data-bdz-ui-polish]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='/ui-polish.css';l.dataset.bdzUiPolish='1';document.head.appendChild(l)}
function bdzToMessage(v,seen=new WeakSet()){
  if(v==null)return '';
  if(v instanceof Error)return v.message||String(v);
  if(typeof v==='string')return v;
  if(typeof v==='number'||typeof v==='boolean'||typeof v==='bigint')return String(v);
  if(typeof v==='object'){
    if(seen.has(v))return 'Dữ liệu lỗi bị lặp.';
    seen.add(v);
    for(const k of ['message','error','detail','reason','description','msg']){if(v[k]!=null){const m=bdzToMessage(v[k],seen);if(m&&m!=='[object Object]')return m}}
    try{return JSON.stringify(v)}catch{return 'Dữ liệu phản hồi không đọc được.'}
  }
  return String(v);
}
window.BDZToMessage=bdzToMessage;
function bdzPublicPage(){const p=location.pathname;return !['/login','/login/','/login.html','/admin','/admin/','/admin.html','/admin.html/','/dashboard','/dashboard/','/dashboard.html','/dashboard.html/'].includes(p)}
function mountPublicRecaptcha(){
  if(!bdzPublicPage())return;
  if(window.grecaptcha||document.querySelector('script[data-bdz-recaptcha]')||document.querySelector('script[src*="google.com/recaptcha/api.js"]'))return;
  fetch('/api/admin/recaptcha-config',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}})
    .then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok||!d.site_key)throw new Error(d.error||'Không thể tải cấu hình reCAPTCHA.');return String(d.site_key).trim()})
    .then(siteKey=>{
      if(!siteKey||document.querySelector('script[data-bdz-recaptcha]')||document.querySelector('script[src*="google.com/recaptcha/api.js"]'))return;
      const s=document.createElement('script');
      s.src='https://www.google.com/recaptcha/api.js?render='+encodeURIComponent(siteKey);
      s.async=true;s.defer=true;s.dataset.bdzRecaptcha='1';
      document.head.appendChild(s);
    }).catch(()=>{});
}
function mountTelegramNotice(){
  if(!bdzPublicPage())return;
  const storageKey='bdz_telegram_notice_closed_at',ttl=24*60*60*1000;
  try{const closedAt=Number(localStorage.getItem(storageKey)||0);if(closedAt&&Date.now()-closedAt<ttl)return;}catch{}
  if(document.querySelector('.bdz-telegram-notice'))return;
  const style=document.createElement('style');
  style.textContent=`.bdz-telegram-notice{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.46);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:16px}.bdz-telegram-notice-card{position:relative;width:min(440px,100%);background:#fffdf7;color:#000;border:3px solid #000;border-radius:7px;box-shadow:7px 7px 0 #000;padding:22px 20px 18px;text-align:center}.bdz-telegram-notice-icon{width:58px;height:58px;margin:0 auto 12px;border:3px solid #000;border-radius:50%;display:grid;place-items:center;background:#93c5fd;box-shadow:4px 4px 0 #000;font-size:28px}.bdz-telegram-notice-title{font-size:clamp(20px,5vw,25px);font-weight:1000;margin:0 0 7px}.bdz-telegram-notice-text{margin:0 auto 16px;max-width:360px;font-size:12px;line-height:1.65;color:#333}.bdz-telegram-notice-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.bdz-telegram-notice-link{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:42px;padding:9px 11px;border:3px solid #000;border-radius:6px;background:#facc15;box-shadow:3px 3px 0 #000;color:#000;font-size:11px;font-weight:1000;text-decoration:none}.bdz-telegram-notice-link.secondary{background:#fff}.bdz-telegram-notice-close{position:absolute;right:8px;top:7px;width:34px;height:34px;border:3px solid #000;border-radius:5px;background:#fda4af;color:#000;font-size:22px;font-weight:1000;line-height:1;cursor:pointer;box-shadow:2px 2px 0 #000}.bdz-telegram-notice-close:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #000}@media(max-width:480px){.bdz-telegram-notice-card{padding:20px 14px 15px}.bdz-telegram-notice-actions{grid-template-columns:1fr}.bdz-telegram-notice-link{min-height:40px}}@media(prefers-reduced-motion:reduce){.bdz-telegram-notice *{transition:none!important}}`;
  document.head.appendChild(style);
  const wrap=document.createElement('div');wrap.className='bdz-telegram-notice';wrap.innerHTML='<div class="bdz-telegram-notice-card" role="dialog" aria-modal="true" aria-labelledby="bdzTelegramNoticeTitle"><button class="bdz-telegram-notice-close" type="button" aria-label="Đóng thông báo">×</button><div class="bdz-telegram-notice-icon"><i class="fa-brands fa-telegram"></i></div><h2 id="bdzTelegramNoticeTitle" class="bdz-telegram-notice-title">KẾT NỐI TELEGRAM BDZTEAM</h2><p class="bdz-telegram-notice-text">Theo dõi Telegram để nhận thông báo, cập nhật mới và liên hệ với đội ngũ BDZTEAM nhanh hơn.</p><div class="bdz-telegram-notice-actions"><a class="bdz-telegram-notice-link" href="https://t.me/BDZTEAM_VN" target="_blank" rel="noopener"><i class="fa-brands fa-telegram"></i> KÊNH BDZTEAM</a><a class="bdz-telegram-notice-link secondary" href="https://t.me/aryaxynk" target="_blank" rel="noopener"><i class="fa-brands fa-telegram"></i> LIÊN HỆ ADMIN</a></div></div>';
  document.body.appendChild(wrap);
  const close=()=>{try{localStorage.setItem(storageKey,String(Date.now()))}catch{}wrap.remove();style.remove()};
  wrap.querySelector('.bdz-telegram-notice-close').addEventListener('click',close);
  wrap.addEventListener('click',e=>{if(e.target===wrap)close()});
  document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',esc)}});
}
document.addEventListener('DOMContentLoaded',()=>{mountMotionStyles();mountUIPolish();setTimeout(hideLoader,420);mountTelegramNotice();mountPublicRecaptcha();const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;const items=[...document.querySelectorAll('.reveal:not(.in)')];if(reduce||!('IntersectionObserver' in window)){items.forEach(e=>e.classList.add('in'))}else{const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');obs.unobserve(e.target)}}),{root:null,rootMargin:'0px 0px -8% 0px',threshold:.04});items.forEach(e=>obs.observe(e))}document.querySelectorAll('a:not([target])').forEach(a=>{if(!a.href.startsWith(location.origin)||a.href.includes('#'))return;a.addEventListener('click',()=>{if(a.dataset.noLoader!==undefined)return;document.getElementById('bdzPageLoader')?.classList.remove('hide')})});const ip=document.getElementById('userIp'),gets=document.getElementById('todayGets');if(ip||gets)fetch('/api/key-meta',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(!d)return;if(ip)ip.textContent=d.ip||'Vercel';if(gets)gets.textContent=(d.today_gets??0)+' Lượt'}).catch(()=>{});const adminPaths=new Set(['/admin','/admin/','/admin.html','/admin.html/','/dashboard','/dashboard/','/dashboard.html','/dashboard.html/']);if(adminPaths.has(location.pathname)){const poll=async()=>{try{const r=await fetch('/api/session-check',{cache:'no-store'});const d=await r.json();if(!d.ok){alert(bdzToMessage(d)||'Phiên quản trị đã bị vô hiệu hóa.');location.href='/login'}}catch{}};poll();setInterval(poll,30000)}});
window.bdzCopy=async text=>{try{await navigator.clipboard.writeText(text);return true}catch{return false}};
