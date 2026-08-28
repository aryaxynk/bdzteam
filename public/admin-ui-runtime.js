(()=>{
'use strict';
const $=s=>document.querySelector(s);
const safe=v=>String(v??'');
const integrationHtml=()=>`<section class="integration-ref">
  <div class="integration-ref-grid">
    <article class="integration-ref-card">
      <header class="integration-ref-head"><div><h2 class="integration-ref-title"><i class="fa-solid fa-code"></i> TÍCH HỢP API</h2><p class="integration-ref-sub">Thông tin kết nối API hiện tại của BDZTEAM</p></div><span class="integration-ref-status"><span class="integration-ref-dot"></span> Hệ thống hoạt động</span></header>
      <div class="integration-ref-body">
        <div class="integration-ref-row"><b>Endpoint</b><span>/api/check-key</span></div>
        <div class="integration-ref-row"><b>Phương thức</b><span>POST</span></div>
        <div class="integration-ref-row"><b>Content-Type</b><span>application/json</span></div>
        <div class="integration-ref-row"><b>Luồng</b><span>Game/Menu → BDZTEAM API → Supabase → JSON response</span></div>
        <div class="integration-ref-row"><b>Xác thực</b><span>Key code + sản phẩm + chính sách IP theo backend hiện tại</span></div>
        <div class="integration-ref-copy"><button type="button" data-copy-api="endpoint"><i class="fa-regular fa-copy"></i> Sao chép Endpoint</button></div>
      </div>
    </article>
    <article class="integration-ref-card">
      <header class="integration-ref-head"><div><h2 class="integration-ref-title"><i class="fa-solid fa-circle-info"></i> PHẢN HỒI</h2><p class="integration-ref-sub">Các trường app/game có thể đọc</p></div></header>
      <div class="integration-ref-body"><ul class="integration-ref-list"><li><b>status</b> — trạng thái Key</li><li><b>product</b> — sản phẩm</li><li><b>duration_hours</b> — thời lượng</li><li><b>expires_at</b> — thời điểm hết hạn</li><li><b>claimed_ip</b> — IP nhận Key</li><li><b>activated_ip</b> — IP kích hoạt</li><li><b>activated_at</b> — thời điểm kích hoạt</li></ul></div>
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
  <div class="integration-ref-note"><strong>Lưu ý:</strong> Tab này chỉ hiển thị contract của API BDZTEAM. Không đưa API/token của provider shortener vào frontend.</div>
</section>`;
function copyText(text,btn){navigator.clipboard?.writeText(text).then(()=>{const old=btn.innerHTML;btn.innerHTML='<i class="fa-solid fa-check"></i> Đã sao chép';setTimeout(()=>btn.innerHTML=old,1200)}).catch(()=>{})}
function enhanceIntegration(){const host=$('#tabContent');const title=safe($('#tabTitle')?.textContent).toLowerCase();if(!host||title!=='tích hợp api')return false;host.innerHTML=integrationHtml();host.querySelectorAll('[data-copy-api]').forEach(btn=>btn.addEventListener('click',()=>{const type=btn.dataset.copyApi;const code=$('#integrationCode')?.textContent||'';copyText(type==='code'?code:'/api/check-key',btn)}));return true}
function transition(){const host=$('#tabContent');if(!host)return;host.classList.add('is-switching');setTimeout(()=>{enhanceIntegration();host.classList.remove('is-switching')},170)}
function bind(){document.addEventListener('click',e=>{const b=e.target.closest('.admin-side-item[data-tab]');if(!b)return;transition();setTimeout(()=>enhanceIntegration(),260)},true);const host=$('#tabContent');if(host)new MutationObserver(()=>{if(safe($('#tabTitle')?.textContent).toLowerCase()==='tích hợp api')enhanceIntegration()}).observe(host,{childList:true});setTimeout(()=>enhanceIntegration(),700)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
