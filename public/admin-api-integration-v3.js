(()=>{'use strict';
const ENDPOINT='https://nklukqriopezsoalnghm.supabase.co/functions/v1/check-key';
const QUICK=`POST ${ENDPOINT}\n\n{\n  "key": "YOUR_KEY",\n  "product_slug": "YOUR_SLUG"\n}`;
const QUICK_JAVA=`String response = NativeKeyBridge.checkKey(key, "");
JSONObject json = new JSONObject(response == null ? "{}" : response);
if (json.optBoolean("ok", false)) openMain();
else showInvalidKey();`;
const EX={
java:`String endpoint="${ENDPOINT}";
String body="{\\"key\\":\\"YOUR_KEY\\",\\"product_slug\\":\\"YOUR_SLUG\\"}";
// POST JSON -> parse ok/status.
// ADMIN + DEVICE_REQUIRED: gửi lại thêm device_id.
// Chỉ cho phép khi ok=true && status=VALID.`,
cpp:`std::string endpoint="${ENDPOINT}";
std::string body=R"({"key":"YOUR_KEY","product_slug":"YOUR_SLUG"})";
// POST JSON -> nếu DEVICE_REQUIRED thì gửi lại thêm device_id.
// Chỉ cho phép khi ok=true && status=VALID.`,
python:`import requests
r=requests.post("${ENDPOINT}",json={"key":"YOUR_KEY","product_slug":"YOUR_SLUG"},timeout=10)
d=r.json()
# ADMIN + DEVICE_REQUIRED -> request lại với device_id.
# Chỉ cho phép khi d["ok"] == True && d["status"] == "VALID"`,
html:`async function verifyKey(key,productSlug,deviceId){
  const post=b=>fetch("${ENDPOINT}",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json());
  let d=await post({key,product_slug:productSlug});
  if(d.status==="DEVICE_REQUIRED") d=await post({key,product_slug:productSlug,device_id:deviceId});
  if(!d.ok||d.status!=="VALID") throw new Error("Key không hợp lệ");
  return d;
}`,
php:`$ch=curl_init('${ENDPOINT}');
curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_HTTPHEADER=>['Content-Type: application/json'],CURLOPT_POSTFIELDS=>json_encode(['key'=>$key,'product_slug'=>$slug]),CURLOPT_RETURNTRANSFER=>true]);
$d=json_decode(curl_exec($ch),true) ?: [];
curl_close($ch);
// ok=true + status=VALID => hợp lệ.`};
const RESPONSE={ok:true,status:'VALID',message:'VALID',key:'BDZ-XXXX',product_slug:'fake-lag',key_scope:'GET',expires_at:'2026-09-02T12:00:00Z',device_bound:false,devices_used:1,max_devices:0};
const STATUS=[['VALID','Cho phép'],['DEVICE_REQUIRED','ADMIN: cần gửi device_id'],['DEVICE_LIMIT','Vượt số thiết bị'],['USED','GET đã dùng'],['WRONG_PRODUCT','Sai product_slug'],['EXPIRED','Hết hạn'],['LOCKED','Bị khóa'],['INVALID','Không tồn tại/không hợp lệ'],['INVALID_PRODUCT','Sản phẩm không tồn tại'],['SERVER_ERROR','Lỗi máy chủ']];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const copy=async v=>{try{await navigator.clipboard.writeText(v);return true}catch{return false}};
function mount(){
 const title=document.querySelector('#title'),panel=document.querySelector('#panel');
 if(!title||!panel||title.textContent.trim()!=='API Key')return;
 if(panel.dataset.bdzApiV4==='1')return;
 panel.dataset.bdzApiV4='1';
 const tab=window.__bdzApiExample||'java';
 panel.innerHTML=`
 <section class="panel">
  <div class="panel-head"><div><h2>Quick API</h2><p>Tích hợp nhanh vào app · chỉ cần đọc <code>ok</code>. Lỗi, hết hạn, limit, khóa... đều xử lý thành <b>Key không hợp lệ</b>.</p></div></div>
  <div class="endpoint"><strong>POST</strong><code>${ENDPOINT}</code><button class="btn sm" id="apiCopyQuick">Copy</button></div>
  <div class="code"><pre>${esc(QUICK)}</pre></div>
  <div class="code"><pre>${esc('{"ok":true}')}\n\n${esc('{"ok":false,"message":"Key không hợp lệ"}')}</pre></div>
  <div class="code"><pre id="apiQuickJava">${esc(QUICK_JAVA)}</pre></div>
 </section>
 <section class="panel">
  <div class="panel-head"><div><h2>Dev API</h2><p>Tài liệu đầy đủ cho dev cần xử lý GET Key / ADMIN Key và device binding.</p></div></div>
  <div class="endpoint"><strong>POST</strong><code>${ENDPOINT}</code><button class="btn sm" id="apiCopyEndpoint">Copy</button></div>
  <div class="metrics" style="margin-top:12px"><div class="metric"><b>key</b><span>Key cần xác thực</span></div><div class="metric"><b>product_slug</b><span>Slug của sản phẩm</span></div><div class="metric"><b>device_id</b><span>Chỉ cần cho ADMIN khi server yêu cầu</span></div></div>
  <div class="code"><pre>${esc(JSON.stringify({key:'YOUR_KEY',product_slug:'YOUR_SLUG'},null,2))}</pre></div>
  <div class="code"><pre>${esc(JSON.stringify({key:'YOUR_ADMIN_KEY',product_slug:'YOUR_SLUG',device_id:'YOUR_STABLE_DEVICE_ID'},null,2))}</pre></div>
  <div class="panel-head"><div><h3>Response mẫu</h3><p>Cho phép khi <code>ok === true && status === "VALID"</code>.</p></div></div>
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
