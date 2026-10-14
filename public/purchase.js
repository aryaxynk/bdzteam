(function(){
  'use strict';
  var modal=document.getElementById('buyModal');
  var openBtn=document.getElementById('buyKey');
  var closeBtn=document.getElementById('closeBuyModal');
  var status=document.getElementById('buyKeyStatus');
  var packagesEl=document.getElementById('buyKeyPackages');
  var loading=false;
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function setStatus(message,error){if(!status)return;status.textContent=message;status.classList.toggle('error',!!error);}
  function money(n){return new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Number(n)||0);}
  function messageFor(code){
    var m={
      SALES_DISABLED:'Hiện chưa mở bán Key. Vui lòng quay lại sau.',
      PAY2S_NOT_CONFIGURED:'Cổng Pay2S chưa được cấu hình đầy đủ.',
      INVALID_PACKAGE:'Gói Key không hợp lệ.',
      PACKAGE_UNAVAILABLE:'Gói này vừa được tắt hoặc không còn bán.',
      ORDER_RATE_LIMIT:'Bạn đã tạo quá nhiều đơn gần đây. Hãy thử lại sau.',
      PAY2S_UNAVAILABLE:'Pay2S đang tạm thời không phản hồi. Hãy thử lại sau.',
      PAY2S_ENVIRONMENT_MISMATCH:'Môi trường của liên kết Pay2S không khớp bộ khóa trong Admin > Pay2S. Hãy kiểm tra Production/Sandbox.',
      PAY2S_RESPONSE_INVALID:'Phản hồi Pay2S không khớp đơn hàng. Hãy kiểm tra Partner Code, số tiền và cấu hình ngân hàng.',
      PAY2S_LINK_MISSING:'Pay2S trả kết quả nhưng không có liên kết QR hợp lệ. Hãy kiểm tra cấu hình trong Admin > Pay2S và log API.',
      PAY2S_CREATE_FAILED:'Pay2S từ chối tạo liên kết. Hãy kiểm tra đúng bộ khóa và tài khoản ngân hàng trong Admin > Pay2S.',
      KEY_LIBRARY_TOKEN_INVALID:'Không tạo được mã bảo vệ thư viện Key. Hãy bật lưu trữ trình duyệt rồi thử lại.',
      KEY_LIBRARY_STORAGE_DISABLED:'Trình duyệt đang chặn localStorage. Hãy bật lưu trữ cho BDZMOD rồi thử lại.',
      SECURE_RANDOM_UNAVAILABLE:'Trình duyệt không hỗ trợ tạo mã bảo mật. Hãy dùng trình duyệt hiện đại qua HTTPS.'
    };
    return m[code]||'Không thể bắt đầu mua Key lúc này. Vui lòng thử lại sau.';
  }
  function openModal(){
    if(!modal)return;
    modal.classList.remove('hidden');modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    loadPackages();
  }
  function closeModal(){
    if(!modal)return;
    modal.classList.add('hidden');modal.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
    if(openBtn)openBtn.focus();
  }
  async function loadPackages(){
    if(loading)return;
    loading=true;
    setStatus('Đang tải các gói Key…',false);
    packagesEl.innerHTML='';
    try{
      if(!window.BDZ||typeof BDZ.edge!=='function')throw new Error('CONFIG');
      var data=await BDZ.edge('pay2s-api',{action:'packages'});
      if(!data||!data.ok)throw new Error(data&&data.error||'UNAVAILABLE');
      if(data.enabled!==true){setStatus('Chức năng mua Key chưa được bật. Vui lòng thử lại sau.',false);return;}
      var rows=Array.isArray(data.packages)?data.packages:[];
      if(!rows.length){setStatus('Chưa có gói Key nào đang mở bán.',false);return;}
      setStatus('Chọn gói cần mua. Bạn sẽ được chuyển sang trang thanh toán Pay2S.',false);
      packagesEl.innerHTML=rows.map(function(p){
        var hours=Number(p.duration_hours)||0;
        var time=hours%24===0?(hours/24+' ngày'):(hours+' giờ');
        return '<article class="buy-package">'+
          '<h3>'+esc(p.name)+'</h3>'+
          '<p>'+esc(p.description||'Key BDZMOD · thời hạn '+time)+'</p>'+
          '<div class="buy-package-price">'+money(p.amount)+'</div>'+
          '<div class="buy-package-meta"><span>'+esc(time)+'</span><span>· '+esc(p.max_devices||1)+' thiết bị</span></div>'+
          '<button type="button" class="btn primary" data-buy-package="'+Number(p.id)+'">Mua gói này</button></article>';
      }).join('');
    }catch(e){
      setStatus(messageFor(e&&e.message)||'Không tải được gói Key. Vui lòng thử lại.',true);
    }finally{loading=false;}
  }
  async function buy(id,button){
    if(!id||!button||button.disabled)return;
    button.disabled=true;button.textContent='Đang tạo đơn…';
    setStatus('Đang tạo đơn thanh toán an toàn…',false);
    try{
      var data=await BDZ.edge('pay2s-api',{action:'create_order',package_id:Number(id),visitor_id:BDZ.visitorId(),library_token:BDZ.libraryToken()});
      if(!data||!data.ok||!data.pay_url||!data.view_token||!data.order_id)throw new Error(data&&data.error||'PAY2S_CREATE_FAILED');
      try{
        sessionStorage.setItem('bdzPay2sOrder',data.order_id);
        sessionStorage.setItem('bdzPay2sView',data.view_token);
      }catch(_){throw new Error('SESSION_STORAGE_DISABLED');}
      window.location.assign(data.pay_url);
    }catch(e){
      var msg=e&&e.message==='SESSION_STORAGE_DISABLED'?'Trình duyệt đang chặn lưu phiên. Hãy bật lưu trữ phiên rồi thử lại.':messageFor(e&&e.message);
      setStatus(msg,true);
      button.disabled=false;button.textContent='Thử lại';
    }
  }
  if(openBtn)openBtn.addEventListener('click',openModal);
  if(closeBtn)closeBtn.addEventListener('click',closeModal);
  if(modal)modal.querySelectorAll('[data-close-buy]').forEach(function(el){el.addEventListener('click',closeModal);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&modal&&!modal.classList.contains('hidden'))closeModal();});
  if(packagesEl)packagesEl.addEventListener('click',function(e){
    var btn=e.target.closest('[data-buy-package]');
    if(btn)buy(btn.getAttribute('data-buy-package'),btn);
  });
})();