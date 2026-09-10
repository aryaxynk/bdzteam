(()=>{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const s=document.createElement('style');s.textContent='body{animation:bdzFi .26s ease both}@keyframes bdzFi{from{opacity:0}to{opacity:1}}body.bdzFo{animation:bdzFo .18s ease both!important}@keyframes bdzFo{from{opacity:1}to{opacity:0}}';document.head.appendChild(s);document.addEventListener('click',e=>{const a=e.target.closest?.('a[href]');if(!a)return;const u=new URL(a.href,location.href);if(u.origin!==location.origin||u.hash||a.target==='_blank'||e.defaultPrevented||u.href===location.href)return;e.preventDefault();document.body.classList.add('bdzFo');setTimeout(()=>location.href=u.href,180)},{capture:true})}})();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
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
function mountPublicThemeToggle(){
  const btn=document.querySelector('.demo-theme');
  if(!btn||btn.dataset.bdzThemeBound==='1')return;
  btn.dataset.bdzThemeBound='1';
  btn.setAttribute('role','button');btn.setAttribute('tabindex','0');btn.setAttribute('aria-label','Chuyển giao diện sáng/tối');btn.title='Chuyển giao diện sáng/tối';btn.style.cursor='pointer';
  if(!document.getElementById('bdz-public-theme-style')){
    const style=document.createElement('style');style.id='bdz-public-theme-style';style.textContent=`body.bdz-dark{background:#111827;color:#e5e7eb}body.bdz-dark .demo-header{background:#111827;border-bottom-color:#374151}body.bdz-dark .demo-brand,body.bdz-dark .demo-login-link,body.bdz-dark .demo-header-tools{color:#e5e7eb}body.bdz-dark .demo-main{color:#e5e7eb}body.bdz-dark .demo-card,body.bdz-dark .demo-success{background:#1f2937;border-color:#374151;color:#e5e7eb}body.bdz-dark .demo-card-head{border-bottom-color:#374151;color:#e5e7eb}body.bdz-dark .demo-card-head .head-user{color:#9fb6d1}body.bdz-dark .demo-control{background:#111827;border-color:#4b5563;color:#e5e7eb}body.bdz-dark .demo-control .demo-icon{border-right-color:#374151;color:#9fb6d1}body.bdz-dark .demo-control select,body.bdz-dark .demo-control input{color:#e5e7eb}body.bdz-dark .demo-control input::placeholder{color:#9ca3af}body.bdz-dark .demo-control select option{background:#111827;color:#e5e7eb}body.bdz-dark .demo-hint{color:#cbd5e1}body.bdz-dark .demo-error{background:#3f1d25;border-color:#7f1d1d;color:#fecaca}body.bdz-dark .demo-keybox{background:#111827;border-color:#4b5563;color:#fff}body.bdz-dark .demo-footer{background:#111827;border-top-color:#374151;color:#cbd5e1}body.bdz-dark .demo-theme{color:#f8fafc}`;document.head.appendChild(style)
  }
  let dark=false;try{dark=localStorage.getItem('bdz-theme')==='dark'}catch{}
  const apply=()=>{document.body.classList.toggle('bdz-dark',dark);const i=btn.querySelector('i');if(i)i.className=dark?'fa-regular fa-moon':'fa-regular fa-sun';btn.title=dark?'Chuyển giao diện sáng':'Chuyển giao diện tối';btn.setAttribute('aria-label',btn.title)};
  const toggle=()=>{dark=!dark;try{localStorage.setItem('bdz-theme',dark?'dark':'light')}catch{}apply()};
  btn.addEventListener('click',toggle);btn.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});apply();
}
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
function bindPublicSocial(){const a=[...document.querySelectorAll('.demo-social span')];if(a.length<3)return;const cfg=[['https://t.me/BDZTEAM_VN','Telegram','fa-brands fa-telegram'],['https://www.youtube.com/@aryamodz','YouTube','fa-brands fa-youtube'],['https://tiktok.com/@bdzteammod','TikTok','fa-brands fa-tiktok']];cfg.forEach((x,i)=>{const el=a[i];el.title=x[1];el.setAttribute('aria-label',x[1]);el.setAttribute('role','link');el.tabIndex=0;el.style.cursor='pointer';const icon=el.querySelector('i');if(icon)icon.className=x[2];const go=()=>window.open(x[0],'_blank','noopener,noreferrer');el.onclick=go;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}}})}
document.addEventListener('DOMContentLoaded',()=>{
  mountMotionStyles();
  mountUIPolish();
  mountPublicThemeToggle();
  mountTelegramNotice();
  mountPublicRecaptcha();
  bindPublicSocial();
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items=[...document.querySelectorAll('.reveal:not(.in)')];
  if(reduce||!('IntersectionObserver' in window))items.forEach(e=>e.classList.add('in'));
  else{const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');obs.unobserve(e.target)}}),{root:null,rootMargin:'0px 0px -8% 0px',threshold:.04});items.forEach(e=>obs.observe(e))}
  const ip=document.getElementById('userIp'),gets=document.getElementById('todayGets');
  if(ip||gets)fetch('/api/key-meta',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(!d)return;if(ip)ip.textContent=d.ip||'—';if(gets)gets.textContent=(d.today_gets??0)+' Lượt'}).catch(()=>{});
  const adminPaths=new Set(['/admin','/admin/','/admin.html','/admin.html/','/dashboard','/dashboard/','/dashboard.html','/dashboard.html/']);
  if(adminPaths.has(location.pathname)){const poll=async()=>{try{const r=await fetch('/api/session-check',{cache:'no-store'});const d=await r.json();if(!d.ok){alert(bdzToMessage(d)||'Phiên quản trị đã bị vô hiệu hóa.');location.href='/login'}}catch{}};poll();setInterval(poll,30000)}
});
window.bdzCopy=async text=>{try{await navigator.clipboard.writeText(text);return true}catch{return false}};
function mountPublicTabs(){
  if(!bdzPublicPage()||document.querySelector('.bdz-public-tabs'))return;
  const header=document.querySelector('.demo-header');if(!header)return;
  const style=document.createElement('style');style.id='bdz-public-tabs-style';style.textContent='.bdz-public-tabs{display:flex;justify-content:center;gap:8px;padding:10px 16px;background:rgba(255,255,255,.96);border-bottom:1px solid #dbe1e8}.bdz-public-tabs a{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-width:118px;padding:8px 18px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#334155;font-size:13px;font-weight:700;text-decoration:none;transition:.18s}.bdz-public-tabs a:hover{background:#f8fafc;transform:translateY(-1px)}.bdz-public-tabs a.active{background:#2563eb;border-color:#2563eb;color:#fff;box-shadow:0 3px 10px rgba(37,99,235,.2)}body.bdz-dark .bdz-public-tabs{background:#111827;border-bottom-color:#374151}.bdz-dark .bdz-public-tabs a{background:#1f2937;border-color:#4b5563;color:#e5e7eb}.bdz-dark .bdz-public-tabs a:hover{background:#273548}.bdz-dark .bdz-public-tabs a.active{background:#2563eb;border-color:#2563eb;color:#fff}@media(max-width:480px){.bdz-public-tabs a{min-width:0;flex:1;padding:8px 10px;font-size:12px}}';document.head.appendChild(style);
  const nav=document.createElement('nav');nav.className='bdz-public-tabs';nav.setAttribute('aria-label','Điều hướng chính');const path=location.pathname;const activeShop=path==='/shop'||path==='/shop.html'||path==='/shop/';nav.innerHTML='<a href="/" class="'+(!activeShop?'active':'')+'"><i class="fa-solid fa-key"></i> Get Key</a><a href="/shop" class="'+(activeShop?'active':'')+'"><i class="fa-solid fa-store"></i> Shop</a>';header.insertAdjacentElement('afterend',nav);
}
function mountFavicon(){if(document.querySelector('link[data-bdz-favicon]'))return;const l=document.createElement('link');l.rel='icon';l.type='image/jpeg';l.href='https://files.catbox.moe/hvagjt.jpg';l.dataset.bdzFavicon='1';document.head.appendChild(l)}
document.addEventListener('DOMContentLoaded',()=>{mountPublicTabs();mountFavicon()},{once:false});
