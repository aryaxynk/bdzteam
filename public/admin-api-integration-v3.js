(()=>{'use strict';
const ENDPOINT='https://nklukqriopezsoalnghm.supabase.co/functions/v1/check-key';
const EX={
java:`String endpoint="${ENDPOINT}";
// Universal flow: first request has key + product_slug only.
// If status == DEVICE_REQUIRED, retry once with your stable installation device_id.
String body="{\\"key\\":\\"YOUR_KEY\\",\\"product_slug\\":\\"YOUR_SLUG\\"}";
// POST JSON, parse response.status/key_scope.
// GET => VALID on first successful call. ADMIN => DEVICE_REQUIRED, then retry with device_id.`,
cpp:`std::string endpoint="${ENDPOINT}";
std::string body=R"({"key":"YOUR_KEY","product_slug":"YOUR_SLUG"})";
// POST JSON. If response.status == "DEVICE_REQUIRED", retry with:
// {"key":"YOUR_KEY","product_slug":"YOUR_SLUG","device_id":"YOUR_STABLE_DEVICE_ID"}
// Continue only when ok == true && status == "VALID".`,
python:`import requests
ENDPOINT="${ENDPOINT}"
def verify_key(key, product_slug, device_id=None):
    payload={"key":key,"product_slug":product_slug}
    r=requests.post(ENDPOINT,json=payload,timeout=10)
    d=r.json()
    if d.get("status")=="DEVICE_REQUIRED" and device_id:
        payload["device_id"]=device_id
        d=requests.post(ENDPOINT,json=payload,timeout=10).json()
    return d
# VALID = ok == True and status == "VALID"`,
html:`async function verifyKey(key,productSlug,deviceId){
  const post=body=>fetch("${ENDPOINT}",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(r=>r.json());
  let d=await post({key,product_slug:productSlug});
  if(d.status==="DEVICE_REQUIRED") d=await post({key,product_slug:productSlug,device_id:deviceId});
  if(!d.ok||d.status!=="VALID") throw new Error(d.message||d.status||"Key rejected");
  return d;
}`,
php:`$endpoint='${ENDPOINT}';
function verifyKey($key,$slug,$deviceId=null){
  global $endpoint;
  $post=function($payload)use($endpoint){
    $ch=curl_init($endpoint);
    curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_HTTPHEADER=>['Content-Type: application/json'],CURLOPT_POSTFIELDS=>json_encode($payload),CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>10]);
    $out=curl_exec($ch);curl_close($ch);return json_decode($out,true) ?: [];
  };
  $d=$post(['key'=>$key,'product_slug'=>$slug]);
  if(($d['status']??'')==='DEVICE_REQUIRED' && $deviceId) $d=$post(['key'=>$key,'product_slug'=>$slug,'device_id'=>$deviceId]);
  return $d;
}`};
const RESPONSE={ok:true,status:'VALID',code:'VALID',key:'BDZ-XXXX',product:'Example',product_slug:'fake-lag',key_scope:'GET',expires_at:'2026-09-02T12:00:00Z',device_bound:false,devices_used:1,max_devices:0,api_used_at:'2026-09-01T12:00:00Z'};
const STATUS=[['VALID','Cho phép mở app/menu'],['DEVICE_REQUIRED','Admin Key: gửi stable device_id rồi gọi lại'],['DEVICE_LIMIT','Admin Key đã đủ max_devices'],['USED','Get Key đã được dùng trên thiết bị khác'],['WRONG_PRODUCT','product_slug không khớp'],['EXPIRED','Key hết hạn'],['LOCKED','Key bị khóa'],['INVALID','Key không tồn tại/không hợp lệ'],['INVALID_PRODUCT','Sản phẩm không tồn tại'],['SERVER_ERROR','Lỗi máy chủ']];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const copy=async v=>{try{await navigator.clipboard.writeText(v);return true}catch{return false}};
function mount(){
 const title=document.querySelector('#title'),panel=document.querySelector('#panel');
 if(!title||!panel||title.textContent.trim()!=='API Key')return;
 if(panel.dataset.bdzApiV4==='1')return;
 panel.dataset.bdzApiV4='1';
 const tab=window.__bdzApiExample||'java';
 panel.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>API Key · Supabase</h2><p>Contract chuẩn v4 · không dùng IP · dùng <code>check-key</code> cho app mới.</p></div></div><div class="endpoint"><strong>POST</strong><code>${ENDPOINT}</code><button class="btn sm" id="apiCopyEndpoint">Copy</button></div><div class="metrics" style="margin-top:12px"><div class="metric"><b>key</b><span>Key cần xác thực</span></div><div class="metric"><b>product_slug</b><span>Slug phải khớp sản phẩm của Key</span></div><div class="metric"><b>device_id</b><span>Chỉ bắt buộc cho ADMIN Key</span></div><div class="metric"><b>IP</b><span>Không tham gia xác thực API</span></div></div></section><section class="panel"><div class="panel-head"><div><h2>1 · Request đầu tiên</h2><p>Luôn gửi <code>key + product_slug</code>. Không gửi IP.</p></div></div><div class="code"><pre>${esc(JSON.stringify({key:'YOUR_KEY',product_slug:'YOUR_SLUG'},null,2))}</pre></div></section><section class="panel"><div class="panel-head"><div><h2>2 · Xử lý theo loại Key</h2><p><b>GET:</b> nếu trả <code>VALID</code> thì hoàn tất; lần thành công đầu tiên sẽ consume Key. <b>ADMIN:</b> server trả <code>DEVICE_REQUIRED</code> (HTTP 200), client gửi lại cùng request + <code>device_id</code>.</p></div></div><div class="code"><pre>${esc(JSON.stringify({key:'YOUR_ADMIN_KEY',product_slug:'YOUR_SLUG',device_id:'YOUR_STABLE_DEVICE_ID'},null,2))}</pre></div></section><section class="panel"><div class="panel-head"><div><h2>Response chuẩn</h2><p>Chỉ cấp quyền khi <code>ok === true && status === "VALID"</code>.</p></div></div><div class="code"><pre>${esc(JSON.stringify(RESPONSE,null,2))}</pre></div><p style="font-size:10px;color:#7b8795">${STATUS.map(x=>x[0]+' = '+x[1]).join(' · ')}</p></section><section class="panel"><div class="panel-head"><div><h2>Examples / Ví dụ tích hợp</h2><p>Java · C++ · Python · HTML · PHP · đều theo cùng một contract hai bước.</p></div></div><div class="tabs">${Object.keys(EX).map(x=>`<button class="${tab===x?'active':''}" data-api-example="${x}">${x.toUpperCase()}</button>`).join('')}</div><div class="code"><button class="btn sm copy" id="apiCopyExample">Copy code</button><pre id="apiExampleCode">${esc(EX[tab])}</pre></div></section>`;
 document.querySelector('#apiCopyEndpoint')?.addEventListener('click',async e=>{if(await copy(ENDPOINT))e.currentTarget.textContent='Copied'});
 document.querySelectorAll('[data-api-example]').forEach(b=>b.addEventListener('click',()=>{window.__bdzApiExample=b.dataset.apiExample;panel.dataset.bdzApiV4='';mount()}));
 document.querySelector('#apiCopyExample')?.addEventListener('click',async()=>{if(await copy(EX[window.__bdzApiExample||'java']))document.querySelector('#apiCopyExample').textContent='Copied'});
}
const obs=new MutationObserver(()=>{const t=document.querySelector('#title');const p=document.querySelector('#panel');if(t&&p&&t.textContent.trim()==='API Key'&&!p.dataset.bdzApiV4){setTimeout(mount,0)}});
obs.observe(document.body,{subtree:true,childList:true});
document.addEventListener('DOMContentLoaded',mount);mount();
})();
