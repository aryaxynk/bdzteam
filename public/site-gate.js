(() => {
  const SITE_KEY = document.getElementById('siteTurnstile')?.dataset.sitekey || window.BDZ?.turnstileSiteKey || '';
  const gate = document.getElementById('siteGate');
  if (!gate || !SITE_KEY) return;
  const saved = Number(sessionStorage.getItem('bdz_gate_verified_at') || 0);
  if (saved && Date.now() - saved < 30 * 60 * 1000) { gate.classList.add('gate-hidden'); return; }
  const status = document.getElementById('gateStatus'), box = document.getElementById('siteTurnstile');
  let token='', widget=null, mounted=false, attempts=0, verifying=false;
  const setStatus=(text,kind='info')=>{if(status){status.textContent=text;status.dataset.kind=kind}};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const ensureApi=async()=>{
    if(window.turnstile)return window.turnstile;
    let script=document.querySelector('script[data-bdz-turnstile]');
    if(!script){script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;script.dataset.bdzTurnstile='1';document.head.appendChild(script)}
    for(let i=0;i<300;i++){if(window.turnstile)return window.turnstile;await sleep(50)}
    throw Error('Turnstile API chưa sẵn sàng');
  };
  const mount=async()=>{
    if(mounted||!box)return;
    try{
      setStatus('Đang tải Cloudflare Turnstile…','info');
      const api=await ensureApi();
      if(mounted)return;
      box.innerHTML='';
      widget=api.render(box,{sitekey:SITE_KEY,theme:'light',size:'normal',callback:t=>{token=t;setStatus('Đã xác minh. Đang kiểm tra bảo mật…','ok');verify()},'expired-callback':()=>{token='';verifying=false;setStatus('Phiên xác minh đã hết hạn. Hãy xác minh lại.','warn')},'timeout-callback':()=>{token='';verifying=false;setStatus('Xác minh mất quá nhiều thời gian. Hãy thử lại.','warn')},'error-callback':()=>{token='';verifying=false;mounted=false;setStatus('Cloudflare Turnstile tạm thời chưa sẵn sàng. Đang tự thử lại…','warn');setTimeout(mount,1200)}});
      if(widget===undefined||widget===null)throw Error('render failed');
      mounted=true;attempts=0;setStatus('Hoàn thành xác minh để vào website.','info');
    }catch(e){mounted=false;attempts++;setStatus('Cloudflare Turnstile chưa tải xong. Đang tự thử lại…','warn');setTimeout(mount,Math.min(2500,600+attempts*250))}
  };
  async function verify(){
    if(!token||verifying)return;verifying=true;
    try{const r=await fetch('/api/site-gate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({turnstile_token:token}),cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw Error(d.error||'Xác minh thất bại');sessionStorage.setItem('bdz_gate_verified_at',String(Date.now()));if(d.gate_token)sessionStorage.setItem('bdz_gate_token',d.gate_token);setStatus('Xác minh thành công.','ok');gate.classList.add('gate-hidden');setTimeout(()=>gate.remove(),520)}catch(e){verifying=false;token='';setStatus(e.message||'Xác minh thất bại.','error');if(widget!==null&&window.turnstile)try{window.turnstile.reset(widget)}catch{}}
  }
  mount();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!mounted)mount()});
})();
