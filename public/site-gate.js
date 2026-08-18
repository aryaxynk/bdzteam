(() => {
  const SITE_KEY = document.getElementById('siteTurnstile')?.dataset.sitekey || '';
  const gate = document.getElementById('siteGate');
  if (!gate || !SITE_KEY) return;
  const saved = Number(sessionStorage.getItem('bdz_gate_verified_at') || 0);
  if (saved && Date.now() - saved < 30 * 60 * 1000) {
    gate.classList.add('gate-hidden');
    return;
  }
  const status = document.getElementById('gateStatus');
  let token = '';
  let widget = null;
  let mounted = false;
  const setStatus = (text, kind='info') => {
    if (!status) return;
    status.textContent = text;
    status.dataset.kind = kind;
  };
  const ready = () => {
    if (mounted || !window.turnstile) return;
    mounted = true;
    widget = window.turnstile.render('#siteTurnstile', {
      sitekey: SITE_KEY,
      theme: 'light',
      callback: t => { token = t; setStatus('Đã xác minh. Đang kiểm tra bảo mật…', 'ok'); verify(); },
      'expired-callback': () => { token=''; setStatus('Phiên xác minh đã hết hạn. Hãy xác minh lại.', 'warn'); },
      'timeout-callback': () => { token=''; setStatus('Xác minh mất quá nhiều thời gian. Thử lại nhé.', 'warn'); },
      'error-callback': () => { token=''; setStatus('Không thể tải Turnstile. Đang thử kết nối lại…', 'warn'); mounted=false; setTimeout(ready, 1200); }
    });
    setStatus('Hoàn thành xác minh để vào website.', 'info');
  };
  async function verify() {
    if (!token) return;
    try {
      const r = await fetch('/api/site-gate', {
        method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({turnstile_token:token}), cache:'no-store'
      });
      const d = await r.json().catch(()=>({}));
      if (!r.ok || !d.ok) throw Error(d.error || 'Xác minh thất bại');
      sessionStorage.setItem('bdz_gate_verified_at', String(Date.now()));
      gate.classList.add('gate-hidden');
    } catch (e) {
      setStatus(e.message || 'Xác minh thất bại. Hãy thử lại.', 'error');
      if (widget !== null && window.turnstile) window.turnstile.reset(widget);
      token='';
    }
  }
  const start = Date.now();
  const timer = setInterval(() => {
    if (window.turnstile) { clearInterval(timer); ready(); }
    else if (Date.now() - start > 10000) {
      clearInterval(timer);
      setStatus('Cloudflare đang phản hồi chậm. Đang thử lại…', 'warn');
      setTimeout(() => location.reload(), 1800);
    }
  }, 120);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !gate.classList.contains('gate-hidden')) e.preventDefault(); });
})();
