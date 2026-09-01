(()=>{
'use strict';
const SUPABASE_FUNCTION='https://nklukqriopezsoalnghm.supabase.co/functions/v1/check-key';
const EX={
java:`import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

String endpoint = "${SUPABASE_FUNCTION}";
String body = "{\\"key\\":\\"YOUR_KEY\\",\\"product_slug\\":\\"YOUR_SLUG\\",\\"device_id\\":\\"YOUR_INSTALL_ID\\"}";

HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(body))
    .build();

HttpResponse<String> response = HttpClient.newHttpClient()
    .send(request, HttpResponse.BodyHandlers.ofString());

System.out.println(response.body());`,
cpp:`#include <curl/curl.h>
#include <string>

CURL* curl = curl_easy_init();
std::string endpoint = "${SUPABASE_FUNCTION}";
std::string body = R"({"key":"YOUR_KEY","product_slug":"YOUR_SLUG","device_id":"YOUR_INSTALL_ID"})";

curl_easy_setopt(curl, CURLOPT_URL, endpoint.c_str());
curl_easy_setopt(curl, CURLOPT_POST, 1L);
curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, body.size());

struct curl_slist* headers = nullptr;
headers = curl_slist_append(headers, "Content-Type: application/json");
curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
curl_easy_perform(curl);

curl_slist_free_all(headers);
curl_easy_cleanup(curl);`,
python:`import requests

endpoint = "${SUPABASE_FUNCTION}"
payload = {
    "key": "YOUR_KEY",
    "product_slug": "YOUR_SLUG",
    "device_id": "YOUR_INSTALL_ID",
}

response = requests.post(endpoint, json=payload, timeout=10)
print(response.status_code)
print(response.json())`,
html:`async function checkKey(key, productSlug, deviceId) {
  const response = await fetch("${SUPABASE_FUNCTION}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key,
      product_slug: productSlug,
      device_id: deviceId
    })
  });
  return await response.json();
}`,
php:`<?php
$endpoint = '${SUPABASE_FUNCTION}';
$payload = json_encode([
  'key' => 'YOUR_KEY',
  'product_slug' => 'YOUR_SLUG',
  'device_id' => 'YOUR_INSTALL_ID'
]);

$ch = curl_init($endpoint);
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
  CURLOPT_POSTFIELDS => $payload,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 10,
]);

$response = curl_exec($ch);
curl_close($ch);
echo $response;`};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const copy=async text=>{try{await navigator.clipboard.writeText(text);return true}catch{return false}};
const panelHTML=()=>`<section class="panel"><div class="panel-head"><div><h2>API Key · Supabase</h2><p>APK/Menu kiểm tra Key trực tiếp qua Supabase Edge Function. Không dùng endpoint Vercel để verify.</p></div></div><div class="endpoint"><strong>POST</strong><code>${SUPABASE_FUNCTION}</code><button class="btn sm" id="bdzApiCopyEndpoint">Copy</button></div><div class="metrics" style="margin-top:12px"><div class="metric"><b>key</b><span>Key người dùng nhập</span></div><div class="metric"><b>product_slug</b><span>Slug của game/app</span></div><div class="metric"><b>device_id</b><span>ID cài đặt của APK</span></div><div class="metric"><b>IP</b><span>Supabase tự nhận từ request</span></div></div></section><section class="panel"><div class="panel-head"><div><h2>Request</h2><p>APK gửi đúng 3 trường dưới đây. Không gửi Supabase service-role key.</p></div></div><div class="code"><pre>${esc(JSON.stringify({key:'YOUR_KEY',product_slug:'YOUR_SLUG',device_id:'YOUR_INSTALL_ID'},null,2))}</pre></div></section><section class="panel"><div class="panel-head"><div><h2>Response mẫu</h2><p>Thông tin trả về cho menu App.</p></div></div><div class="code"><pre>${esc(JSON.stringify({ok:true,status:'VALID',code:'VALID',key:'BDZ-XXXX-XXXX',product:'Example',product_slug:'example',product_id:1,duration_hours:10,expires_at:'2026-09-01T12:00:00Z',created_at:'2026-08-31T10:00:00Z',claimed_ip:'1.2.3.4',activated_ip:'1.2.3.4',activated_at:'2026-08-31T10:05:00Z',verified_ip:'1.2.3.4',ip:'1.2.3.4',device_id:'YOUR_INSTALL_ID',device_bound:true,admin_key:false,server_time:'2026-08-31T10:05:01Z'},null,2))}</pre></div><p style="font-size:10px;color:#7b8795">Các trạng thái: VALID, INVALID, WRONG_PRODUCT, EXPIRED, LOCKED, USED, DEVICE_MISMATCH, SERVER_ERROR.</p></section><section class="panel"><div class="panel-head"><div><h2>Examples / Ví dụ tích hợp</h2><p>Java · C++ · Python · HTML · PHP</p></div></div><div class="tabs" id="bdzApiExampleTabs">${Object.keys(EX).map(x=>`<button class="${window.__bdzApiExample===x?'active':''}" data-bdz-example="${x}">${x.toUpperCase()}</button>`).join('')}</div><div class="code"><button class="btn sm copy" id="bdzApiCopyExample">Copy code</button><pre id="bdzApiExampleCode">${esc(EX[window.__bdzApiExample||'java'])}</pre></div></section>`;
function mount(){const title=document.querySelector('#title');const panel=document.querySelector('#panel');if(!title||!panel||title.textContent.trim()!=='API Key')return;if(panel.dataset.bdzApiMounted==='1'&&panel.querySelector('#bdzApiCopyEndpoint'))return;panel.dataset.bdzApiMounted='1';panel.innerHTML=panelHTML();const endpointBtn=document.querySelector('#bdzApiCopyEndpoint');endpointBtn?.addEventListener('click',async()=>{if(await copy(SUPABASE_FUNCTION))endpointBtn.textContent='Copied'});document.querySelectorAll('[data-bdz-example]').forEach(btn=>btn.addEventListener('click',()=>{window.__bdzApiExample=btn.dataset.bdzExample;panel.dataset.bdzApiMounted='0';mount();}));document.querySelector('#bdzApiCopyExample')?.addEventListener('click',async()=>{if(await copy(EX[window.__bdzApiExample||'java']))document.querySelector('#bdzApiCopyExample').textContent='Copied'});}
let timer=0;const run=()=>{clearTimeout(timer);timer=setTimeout(mount,0)};const obs=new MutationObserver(run);obs.observe(document.body,{subtree:true,childList:true});document.addEventListener('DOMContentLoaded',run);run();
})();