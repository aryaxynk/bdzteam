(function(){
  'use strict';
  var $=function(id){return document.getElementById(id);};
  var currentPackages=[];
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function fmtMoney(v){return new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Number(v)||0);}
  function msgFor(code){
    var m={
      OWNER_REQUIRED:'Chỉ OWNER được thay đổi cấu hình thông tin Pay2S.',
      FORBIDDEN:'Tài khoản không có quyền thực hiện thao tác này.',
      PAY2S_CONFIG_INCOMPLETE:'Chưa đủ Partner Code, Access Key, Secret Key hoặc tài khoản nhận tiền.',
      NO_ENABLED_PACKAGES:'Hãy tạo và bật ít nhất một gói Key trước khi bật bán hàng.',
      BANK_ACCOUNTS_INVALID:'Danh sách ngân hàng không hợp lệ. Mỗi dòng cần có số tài khoản|Bank ID.',
      INVALID_PACKAGE_NAME:'Tên gói phải có từ 2 đến 100 ký tự.',
      INVALID_PACKAGE_AMOUNT:'Giá gói không hợp lệ.',
      INVALID_PACKAGE_DURATION:'Thời hạn phải từ 1 đến 8760 giờ.',
      INVALID_PACKAGE_DEVICES:'Số thiết bị phải từ 1 đến 100.',
      PACKAGE_NOT_FOUND:'Không tìm thấy gói Key này.',
      CONFIG_OPERATION_FAILED:'Không lưu được cấu hình. Kiểm tra dữ liệu và thử lại.',
      UNAUTHORIZED:'Phiên Admin hết hạn. Vui lòng đăng nhập lại.'
    };
    return m[code]||String(code||'Không thực hiện được thao tác.');
  }
  function setText(id,text){var el=$(id);if(el)el.textContent=text;}
  function setConfigNotice(text,kind){var el=$('p2ConfigStatus');if(el){el.textContent=text;el.className='p2-config-status'+(kind?' '+kind:'');}}
  function setMessage(id,text,error){var el=$(id);if(el){el.textContent=text||'';el.style.color=error?'#ffaaaa':'';}}
  function rpc(action,payload){
    if(!window.BDZ||!BDZ.rpc||typeof tok!=='function')return Promise.reject(new Error('CONFIG'));
    return BDZ.rpc('bdz_pay2s_admin_config',{p_token:tok(),p_action:action,p_payload:payload||{}});
  }
  function isOwner(){return String((typeof role!=='undefined'&&role)||sessionStorage.getItem('bdz_r')||'').toUpperCase()==='OWNER';}
  function renderSecretStatus(id,yes,label){
    var el=$(id);if(!el)return;
    el.textContent=yes?'Đã lưu':'Chưa lưu';el.className='tag'+(yes?' on':' off');
  }
  function renderPackages(){
    var root=$('p2Packages');if(!root)return;
    if(!currentPackages.length){root.innerHTML='<p class="hint">Chưa có gói Key. Thêm gói ở biểu mẫu bên dưới.</p>';return;}
    root.innerHTML=currentPackages.map(function(p){
      var time=Number(p.duration_hours)%24===0?(Number(p.duration_hours)/24+' ngày'):(Number(p.duration_hours)+' giờ');
      return '<article class="p2-package-row">'+
        '<div class="p2-package-main"><strong>'+esc(p.name)+' <span class="tag">'+fmtMoney(p.amount)+'</span></strong>'+
        '<p>'+esc(p.description||'Không có mô tả')+'</p>'+
        '<div class="p2-package-meta"><span class="tag">'+esc(time)+'</span><span class="tag">'+esc(p.max_devices)+' thiết bị</span><span class="tag '+(p.enabled?'on':'off')+'">'+(p.enabled?'Đang bật':'Đang tắt')+'</span><span class="tag">Mã: '+esc(p.code)+'</span></div></div>'+
        '<div class="p2-package-actions"><button type="button" class="btn sm" data-p2-edit="'+Number(p.id)+'">Sửa</button><button type="button" class="btn sm" data-p2-toggle="'+Number(p.id)+'">'+(p.enabled?'Tắt':'Bật')+'</button><button type="button" class="btn sm danger" data-p2-delete="'+Number(p.id)+'">Xóa</button></div>'+
      '</article>';
    }).join('');
  }
  async function loadPay2sConfig(){
    setConfigNotice('Đang tải cấu hình Pay2S…','');
    try{
      var data=await rpc('get',{});
      if(!data||!data.ok)throw new Error(data&&data.error||'CONFIG_OPERATION_FAILED');
      var s=data.settings||{};
      if($('p2Environment'))$('p2Environment').value=s.environment||'sandbox';
      if($('p2Enabled'))$('p2Enabled').value=String(s.enabled===true);
      if($('p2PartnerCode'))$('p2PartnerCode').value=s.partner_code||'';
      if($('p2PartnerName'))$('p2PartnerName').value=s.partner_name||'BDZMOD';
      if($('p2BankAccounts'))$('p2BankAccounts').value=(Array.isArray(s.bank_accounts)?s.bank_accounts:[]).map(function(b){return String(b.account_number||'')+'|'+String(b.bank_id||'');}).join('\n');
      if($('p2IpnUrl'))$('p2IpnUrl').value=data.ipn_url||'https://nklukqriopezsoalnghm.supabase.co/functions/v1/pay2s-ipn';
      if($('p2ReturnUrl'))$('p2ReturnUrl').value=data.return_url||'https://aryaxynk.github.io/bdzteam/payment/return.html';
      renderSecretStatus('p2AccessStatus',data.access_key_set===true);
      renderSecretStatus('p2SecretStatus',data.secret_key_set===true);
      currentPackages=Array.isArray(data.packages)?data.packages:[];
      renderPackages();
      var message=(s.enabled?'Bán hàng đang BẬT':'Bán hàng đang TẮT')+' · Môi trường: '+(s.environment==='production'?'Production':'Sandbox')+
        ' · '+(data.access_key_set?'Access Key đã lưu':'Chưa có Access Key')+
        ' · '+(data.secret_key_set?'Secret Key đã lưu':'Chưa có Secret Key')+
        ' · '+currentPackages.filter(function(p){return p.enabled;}).length+' gói đang bật.';
      setConfigNotice(message,s.enabled&&data.access_key_set&&data.secret_key_set?'ok':'warn');
      if($('p2SaveSettings'))$('p2SaveSettings').disabled=!isOwner();
      if($('p2SaveSettings')&&!isOwner())setMessage('p2SettingsMessage','Chỉ OWNER được lưu cấu hình kết nối.',true);
      return data;
    }catch(e){
      setConfigNotice(msgFor(e&&e.message||'CONFIG_OPERATION_FAILED'),'error');
      throw e;
    }
  }
  function readBanks(){
    var lines=String(($('p2BankAccounts')&&$('p2BankAccounts').value)||'').split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean);
    var banks=[];
    lines.forEach(function(line){
      var parts=line.split('|').map(function(x){return x.trim();});
      if(parts.length!==2||!parts[0]||!parts[1])throw new Error('BANK_ACCOUNTS_INVALID');
      banks.push({account_number:parts[0],bank_id:parts[1]});
    });
    return banks;
  }
  async function saveSettings(){
    var button=$('p2SaveSettings');if(button)button.disabled=true;
    setMessage('p2SettingsMessage','Đang lưu cấu hình…',false);
    try{
      var payload={
        enabled:$('p2Enabled').value==='true',
        environment:$('p2Environment').value,
        partner_code:($('p2PartnerCode').value||'').trim(),
        partner_name:($('p2PartnerName').value||'').trim()||'BDZMOD',
        bank_accounts:readBanks(),
        access_key:($('p2AccessKey').value||'').trim(),
        secret_key:($('p2SecretKey').value||'').trim()
      };
      var data=await rpc('save_settings',payload);
      if(!data||!data.ok)throw new Error(data&&data.error||'CONFIG_OPERATION_FAILED');
      $('p2AccessKey').value='';$('p2SecretKey').value='';
      setMessage('p2SettingsMessage','Đã lưu cấu hình. Credential không được trả lại trình duyệt.',false);
      await loadPay2sConfig();
    }catch(e){setMessage('p2SettingsMessage',msgFor(e&&e.message||'CONFIG_OPERATION_FAILED'),true);}
    finally{if(button)button.disabled=!isOwner();}
  }
  function resetPackageForm(){
    if($('p2PkgId'))$('p2PkgId').value='';
    if($('p2PkgName'))$('p2PkgName').value='';
    if($('p2PkgDescription'))$('p2PkgDescription').value='';
    if($('p2PkgAmount'))$('p2PkgAmount').value='';
    if($('p2PkgDuration'))$('p2PkgDuration').value='';
    if($('p2PkgDevices'))$('p2PkgDevices').value='1';
    if($('p2PkgEnabled'))$('p2PkgEnabled').value='true';
    setText('p2PackageFormTitle','Thêm gói mới');
    setMessage('p2PkgMessage','',false);
    editingPackage=null;
  }
  var editingPackage=null;
  function editPackage(id){
    var p=currentPackages.find(function(x){return Number(x.id)===Number(id);});
    if(!p)return;
    editingPackage=p;
    $('p2PkgId').value=String(p.id);
    $('p2PkgName').value=p.name||'';
    $('p2PkgDescription').value=p.description||'';
    $('p2PkgAmount').value=String(p.amount||'');
    $('p2PkgDuration').value=String(p.duration_hours||'');
    $('p2PkgDevices').value=String(p.max_devices||1);
    $('p2PkgEnabled').value=String(p.enabled===true);
    setText('p2PackageFormTitle','Sửa gói: '+p.name);
    setMessage('p2PkgMessage','',false);
    var el=$('p2PkgName');if(el)el.focus();
  }
  async function savePackage(){
    var button=$('p2PkgSave');if(button)button.disabled=true;
    setMessage('p2PkgMessage','Đang lưu gói…',false);
    try{
      var id=($('p2PkgId').value||'').trim();
      var name=($('p2PkgName').value||'').trim();
      var amount=Number($('p2PkgAmount').value);
      var hours=Number($('p2PkgDuration').value);
      var devices=Number($('p2PkgDevices').value);
      if(name.length<2)throw new Error('INVALID_PACKAGE_NAME');
      if(!Number.isSafeInteger(amount)||amount<1||amount>1000000000)throw new Error('INVALID_PACKAGE_AMOUNT');
      if(!Number.isSafeInteger(hours)||hours<1||hours>8760)throw new Error('INVALID_PACKAGE_DURATION');
      if(!Number.isSafeInteger(devices)||devices<1||devices>100)throw new Error('INVALID_PACKAGE_DEVICES');
      var payload={id:id||null,name:name,description:($('p2PkgDescription').value||'').trim(),amount:amount,duration_hours:hours,max_devices:devices,enabled:$('p2PkgEnabled').value==='true',sort_order:editingPackage?Number(editingPackage.sort_order)||0:0};
      var data=await rpc('save_package',payload);
      if(!data||!data.ok)throw new Error(data&&data.error||'CONFIG_OPERATION_FAILED');
      setMessage('p2PkgMessage','Đã lưu gói Key.',false);
      resetPackageForm();
      await loadPay2sConfig();
    }catch(e){setMessage('p2PkgMessage',msgFor(e&&e.message||'CONFIG_OPERATION_FAILED'),true);}
    finally{if(button)button.disabled=false;}
  }
  async function packageAction(action,id){
    try{
      if(action==='delete_package'&&!window.confirm('Xóa hoặc tắt gói này khỏi danh sách bán?'))return;
      var data=await rpc(action,{id:Number(id)});
      if(!data||!data.ok)throw new Error(data&&data.error||'CONFIG_OPERATION_FAILED');
      if(editingPackage&&Number(editingPackage.id)===Number(id))resetPackageForm();
      await loadPay2sConfig();
    }catch(e){window.alert(msgFor(e&&e.message||'CONFIG_OPERATION_FAILED'));}
  }
  function initPay2sUi(){
    var root=$('pg-pay2s');if(!root||root.dataset.p2Ready==='1')return;
    root.dataset.p2Ready='1';
    if($('p2Reload'))$('p2Reload').addEventListener('click',function(){loadPay2sConfig().catch(function(){});});
    if($('p2SaveSettings'))$('p2SaveSettings').addEventListener('click',saveSettings);
    if($('p2PkgSave'))$('p2PkgSave').addEventListener('click',savePackage);
    if($('p2PkgReset'))$('p2PkgReset').addEventListener('click',resetPackageForm);
    if($('p2Packages'))$('p2Packages').addEventListener('click',function(e){
      var edit=e.target.closest('[data-p2-edit]');if(edit){editPackage(edit.getAttribute('data-p2-edit'));return;}
      var toggle=e.target.closest('[data-p2-toggle]');if(toggle){packageAction('toggle_package',toggle.getAttribute('data-p2-toggle'));return;}
      var del=e.target.closest('[data-p2-delete]');if(del)packageAction('delete_package',del.getAttribute('data-p2-delete'));
    });
  }
  window.loadPay2sConfig=loadPay2sConfig;
  window.initPay2sUi=initPay2sUi;
})();