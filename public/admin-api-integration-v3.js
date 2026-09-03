(()=>{'use strict';
const ENDPOINT='https://nklukqriopezsoalnghm.supabase.co/functions/v1/check-key';
const QUICK=`POST ${ENDPOINT}\n\n{\n  "key": "YOUR_KEY",\n  "product_slug": "YOUR_SLUG",\n  "device_id": "YOUR_DEVICE_ID"\n}`;
const QUICK_JAVA=`String response = NativeKeyBridge.checkKey(key, "");
JSONObject json = new JSONObject(response == null ? "{}" : response);
if (json.optBoolean("ok", false)) openMain();
else showInvalidKey();`;
const EX={
java:`String endpoint="${ENDPOINT}";
String body="{\\"key\\":\\"YOUR_KEY\\",\\"product_slug\\":\\"YOUR_SLUG\\",\\"device_id\\":\\"YOUR_DEVICE_ID\\"}";
// POST JSON -> đọc ok.
// ok=true: Key hợp lệ. ok=false: Key không hợp lệ.`,
cpp:`std::string endpoint="${ENDPOINT}";
std::string body=R"({"key":"YOUR_KEY","product_slug":"YOUR_SLUG","device_id":"YOUR_DEVICE_ID"})";
// POST JSON -> chỉ cần đọc ok.`,
python:`import requests
r=requests.post("${ENDPOINT}",json={"key":"YOUR_KEY","product_slug":"YOUR_SLUG","device_id":"YOUR_DEVICE_ID"},timeout=10)
d=r.json()
if d.get("ok"):
    open_app()
else:
    show_invalid_key()`,
html:`async function verifyKey(key,productSlug,deviceId){
  const r=await fetch("${ENDPOINT}",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key,product_slug:productSlug,device_id:deviceId})});
  const d=await r.json();
  if(!d.ok) throw new Error("Key không hợp lệ");
  return d;
}`,
php:`$ch=curl_init('${ENDPOINT}');
curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_HTTPHEADER=>['Content-Type: application/json'],CURLOPT_POSTFIELDS=>json_encode(['key'=>$key,'product_slug'=>$slug,'device_id'=>$deviceId]),CURLOPT_RETURNTRANSFER=>true]);
$d=json_decode(curl_exec($ch),true) ?: [];
curl_close($ch);
if(empty($d['ok'])) throw new Exception('Key không hợp lệ');`};
const RESPONSE={ok:true,message:'VALID'};
const STATUS=[['VALID','Key hợp lệ'],['DEVICE_REQUIRED','Server yêu cầu device_id'],['DEVICE_LIMIT','Đã đạt giới hạn thiết bị'],['USED','Key đã được dùng'],['WRONG_PRODUCT','Sai product_slug'],['EXPIRED','Key hết hạn'],['LOCKED','Key bị khóa'],['INVALID','Key không tồn tại/không hợp lệ'],['INVALID_PRODUCT','Sản phẩm không tồn tại'],['SERVER_ERROR','Lỗi máy chủ']];
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const copy=async v=>{try{await navigator.clipboard.writeText(v);return true}catch{return false}};
function mount(){
 const title=document.querySelector('#title'),panel=document.querySelector('#panel');
 if(!title||!panel||title.textContent.trim()!=='API Key')return;
 if(panel.dataset.bdzApiV4==='1')return;
 panel.dataset.bdzApiV4='1';
 const tab=window.__bdzApiExample||'java';
 panel.innerHTML=`
 <section class="panel">
  <div class="panel-head"><div><h2>Quick API</h2><p>Tích hợp nhanh · chỉ gửi một request và đọc <code>ok</code>. Mọi trường hợp không hợp lệ đều xử lý thành <b>Key không hợp lệ</b>.</p></div></div>
  <div class="endpoint"><strong>POST</strong><code>${ENDPOINT}</code><button class="btn sm" id="apiCopyQuick">Copy</button></div>
  <div class="code"><pre>${esc(QUICK)}</pre></div>
  <div class="code"><pre>${esc('{"ok":true,"message":"VALID"}')}\n\n${esc('{"ok":false,"message":"Key không hợp lệ"}')}</pre></div>
  <div class="code"><pre id="apiQuickJava">${esc(QUICK_JAVA)}</pre></div>
 </section>
 <section class="panel">
  <div class="panel-head"><div><h2>Dev API</h2><p>Tài liệu đầy đủ cho cùng một Key API. Không còn tách GET Key / Admin Key thành hai hệ khác nhau.</p></div></div>
  <div class="endpoint"><strong>POST</strong><code>${ENDPOINT}</code><button class="btn sm" id="apiCopyEndpoint">Copy</button></div>
  <div class="metrics" style="margin-top:12px"><div class="metric"><b>key</b><span>Key cần xác thực</span></div><div class="metric"><b>product_slug</b><span>Slug của sản phẩm</span></div><div class="metric"><b>device_id</b><span>Device ID ổn định của app; gửi cùng request</span></div></div>
  <div class="code"><pre>${esc(JSON.stringify({key:'YOUR_KEY',product_slug:'YOUR_SLUG',device_id:'YOUR_DEVICE_ID'},null,2))}</pre></div>
  <div class="panel-head"><div><h3>Response mẫu</h3><p>Phía app chỉ cần quyết định theo <code>ok</code>.</p></div></div>
  <div class="code"><pre>${esc(JSON.stringify(RESPONSE,null,2))}</pre></div>
  <p style="font-size:10px;color:#7b8795">${STATUS.map(x=>x[0]+' = '+x[1]).join(' · ')}</p>
  <div class="panel-head"><div><h3>Examples</h3><p>Java · C++ · Python · HTML · PHP</p></div></div>
  <div class="tabs">${Object.keys(EX).map(x=>`<button class="${tab===x?'active':''}" data-api-example="${x}">${x.toUpperCase()}</button>`).join('')}</div>
  <div class="code"><button class="btn sm copy" id="apiCopyExample">Copy code</button><pre id="apiExampleCode">${esc(EX[tab])}</pre></div>
 </section>`;
 document.querySelector('#apiCopyQuick')?.addEventListener('click',async e=>{if(await copy(QUICK))e.currentTarget.textContent='Copied'});
 document.querySelector('#apiCopyEndpoint')?.addEventListener('click',async e=>{if(await copy(ENDPOINT))e.currentTarget.textContent='Copied'});
 document.querySelectorAll('[data-api-example]').forEach(b=>b.addEventListener('click',()=>{window.__bdzApiExample=b.dataset.apiExample;panel.dataset.bdzApiV4='';mount()}));
 document.querySelector('#apiCopyExample')?.addEventListener('click',async()=>{if(await copy(EX[window.__bdzApiExample||'java']))document.querySelector('#apiCopyExample').textContent='Copied'});
}
const obs=new MutationObserver(()=>{const t=document.querySelector('#title');const p=document.querySelector('#panel');if(t&&p&&t.textContent.trim()==='API Key'&&!p.dataset.bdzApiV4)setTimeout(mount,0)});
obs.observe(document.body,{subtree:true,childList:true});
document.addEventListener('DOMContentLoaded',mount);mount();
})();
