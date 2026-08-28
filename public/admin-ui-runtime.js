(()=>{
'use strict';
const $=s=>document.querySelector(s),text=v=>String(v??'');
const integrationHtml=()=>`<section class="integration-ref">
  <div class="integration-ref-grid">
    <article class="integration-ref-card">
      <header class="integration-ref-head"><div><h2 class="integration-ref-title"><i class="fa-solid fa-plug"></i> TÍCH HỢP API</h2><p class="integration-ref-sub">Contract chính thức để Game/Menu giao tiếp với BDZTEAM</p></div><span class="integration-ref-status"><span class="integration-ref-dot"></span> Sẵn sàng</span></header>
      <div class="integration-ref-body">
        <div class="integration-ref-row"><b>Endpoint</b><span class="integration-ref-code-inline">/api/check-key</span></div>
        <div class="integration-ref-row"><b>Phương thức</b><span>POST</span></div>
        <div class="integration-ref-row"><b>Định dạng</b><span>application/json</span></div>
        <div class="integration-ref-row"><b>Luồng xử lý</b><span>Game/Menu → BDZTEAM API → Supabase → JSON</span></div>
        <div class="integration-ref-row"><b>Xác thực</b><span>Key + sản phẩm + quy tắc IP theo backend</span></div>
        <div class="integration-ref-copy"><button type="button" data-copy-api="endpoint"><i class="fa-regular fa-copy"></i> Sao chép Endpoint</button></div>
      </div>
    </article>
    <article class="integration-ref-card">
      <header class="integration-ref-head"><div><h2 class="integration-ref-title"><i class="fa-solid fa-list-check"></i> RESPONSE</h2><p class="integration-ref-sub">Các trường mà client có thể đọc</p></div></header>
      <div class="integration-ref-body"><div class="integration-response-grid">
        <div><b>status</b><span>Trạng thái Key</span></div><div><b>product</b><span>Sản phẩm</span></div>
        <div><b>duration_hours</b><span>Thời lượng</span></div><div><b>expires_at</b><span>Thời điểm hết hạn</span></div>
        <div><b>claimed_ip</b><span>IP nhận Key</span></div><div><b>activated_ip</b><span>IP kích hoạt</span></div>
        <div><b>activated_at</b><span>Thời điểm kích hoạt</span></div>
      </div></div>
    </article>
  </div>
  <article class="integration-ref-card">
    <header class="integration-ref-head"><div><h2 class="integration-ref-title"><i class="fa-solid fa-terminal"></i> MẪU REQUEST</h2><p class="integration-ref-sub">Payload tối thiểu theo contract hiện tại</p></div></header>
    <div class="integration-ref-body"><pre id="integrationCode" class="integration-ref-code">POST /api/check-key
Content-Type: application/json

{
  "key": "BDZ-XXXXXXXXXXXX",
  "product": "free-fire",
  "client_ip": "1.2.3.4"
}</pre><div class="integration-ref-copy"><button type="button" data-copy-api="code"><i class="fa-regular fa-copy"></i> Sao chép Request</button></div></div>
  </article>
  <div class="integration-ref-note"><strong>Ghi chú:</strong> API secret, service key và token nhà cung cấp không được đưa vào frontend. Client chỉ gửi dữ liệu theo contract.</div>
</section>`;
function fallbackCopy(value){const ta=document.createElement('textarea');ta.value=value;ta.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy')}finally{ta.remove()}}
async function copyText(value,btn){try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(value);else fallbackCopy(value);const old=btn.innerHTML;btn.innerHTML='<i class="fa-solid fa-check"></i> Đã sao chép';window.setTimeout(()=>{btn.innerHTML=old},1200)}catch{fallbackCopy(value)}}
function enhanceIntegration(){const host=$('#tabContent');if(!host||text($('#tabTitle')?.textContent).trim().toLowerCase()!=='tích hợp api')return;if(host.dataset.integrationEnhanced==='1')return;host.innerHTML=integrationHtml();host.dataset.integrationEnhanced='1';host.querySelectorAll('[data-copy-api]').forEach(btn=>btn.addEventListener('click',()=>{const type=btn.dataset.copyApi;const code=$('#integrationCode')?.textContent||'';copyText(type==='code'?code:location.origin+'/api/check-key',btn)}))}
function watch(){const title=$('#tabTitle');if(title){new MutationObserver(()=>requestAnimationFrame(enhanceIntegration)).observe(title,{childList:true,characterData:true,subtree:true})}const host=$('#tabContent');if(host)new MutationObserver(()=>requestAnimationFrame(enhanceIntegration)).observe(host,{childList:true});document.addEventListener('click',e=>{if(e.target.closest('.admin-side-item[data-tab="integration"]'))requestAnimationFrame(enhanceIntegration)},{passive:true});requestAnimationFrame(enhanceIntegration)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();
