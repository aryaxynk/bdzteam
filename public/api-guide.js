(()=>{let rendered=false;const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));const copy=async text=>{try{await navigator.clipboard.writeText(text);return true}catch{return false}};const setTab=()=>{try{if(typeof state!=='undefined')state.tab='integration';document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab==='integration'));const t=document.getElementById('tabTitle'),s=document.getElementById('tabSub');if(t)t.textContent='Tích Hợp API';if(s)s.textContent='App / Game → Supabase trực tiếp';}catch{}};const wire=()=>{document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{const ok=await copy(b.dataset.copy);const old=b.textContent;b.textContent=ok?'✓ Đã sao chép':'Không thể sao chép';setTimeout(()=>b.textContent=old,900)}));document.querySelectorAll('[data-code-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-code-tab]').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.api-code-block').forEach(x=>x.classList.remove('active'));document.getElementById(b.dataset.codeTab)?.classList.add('active')}));};const guide=()=>{const c=document.getElementById('tabContent');if(!c)return;setTab();if(rendered&&c.querySelector('.api-guide'))return;const supabase='https://nklukqriopezsoalnghm.supabase.co';const rpc=supabase+'/rest/v1/rpc/verify_key_app';const pub='sb_publishable_RUE5iV8GqoVCFxjVt5ZBpg_FlTC1v-0';c.innerHTML=`<div class="space-y-4 api-guide"><section class="admin-panel p-4 md:p-5 api-panel"><div class="flex flex-wrap items-center justify-between gap-2"><div><span class="status-pill success">API GAME · DIRECT SUPABASE</span><h2 class="text-xl md:text-2xl font-black mt-2">App → Supabase → App</h2></div><span class="status-pill info">Không qua Website</span></div><p class="text-sm text-[#555] mt-3 leading-6">Đây là luồng chính dành cho game/app: người dùng Get Key trên website, nhập Key trong app, app gọi trực tiếp Supabase REST RPC, Supabase kiểm tra Key và trả JSON, app đọc kết quả rồi quyết định bước tiếp theo.</p><div class="api-copy"><code>${esc(rpc)}</code><button class="small-btn" data-copy="${esc(rpc)}">Sao chép</button></div><div class="api-note mt-3"><b>Chỉ dùng Publishable/anon key trong APK.</b> Tuyệt đối không đưa Service Role/Secret Key vào AIDE Pro, Android Studio hoặc APK.</div></section><section class="admin-panel p-4 md:p-5 api-panel"><h2 class="text-lg font-black">1. Request chuẩn</h2><pre class="text-xs mt-3">POST ${rpc}\nContent-Type: application/json\napikey: ${pub}\nAuthorization: Bearer ${pub}\n\n{\n  "p_key_code": "BDZ-XXXXXXXXXXXX",\n  "p_client_ip": "1.2.3.4",\n  "p_product_slug": "free-fire"\n}</pre><p class="text-xs text-[#666] mt-3">Tên tham số phải đúng tuyệt đối: <code>p_key_code</code>, <code>p_client_ip</code>, <code>p_product_slug</code>.</p></section><section class="admin-panel p-4 md:p-5 api-panel"><h2 class="text-lg font-black">2. Response mẫu — VALID</h2><pre class="text-xs mt-3">[{\n  "status":"ACTIVE",\n  "product":"Free Fire",\n  "product_id":4,\n  "duration_hours":10,\n  "expires_at":"2026-08-19T10:00:00Z",\n  "claimed_ip":"1.2.3.4",\n  "key_scope":"GET",\n  "activated_at":"2026-08-19T00:00:00Z",\n  "activated_ip":"1.2.3.4",\n  "message":"Key hợp lệ."\n}]</pre><p class="text-xs text-[#666] mt-3">Supabase REST RPC trả một mảng JSON vì PostgreSQL function dùng <code>RETURNS TABLE</code>. App phải lấy phần tử đầu tiên.</p></section><section class="admin-panel p-4 md:p-5 api-panel"><h2 class="text-lg font-black">3. App phải xử lý trạng thái</h2><div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3 text-xs">${[['ACTIVE','Cho phép vào menu/chức năng tiếp theo.'],['INVALID','Key không tồn tại hoặc không hợp lệ → dừng.'],['EXPIRED','Key hết hạn → dừng.'],['REVOKED','Admin đã khóa Key → dừng.'],['IP_MISMATCH','IP gửi lên không khớp IP Key GET → dừng.'],['WRONG_PRODUCT','Sai game/sản phẩm → dừng.'],['SERVER_ERROR','Supabase/API tạm lỗi → báo thử lại, không tự mở menu.'],['HTTP_401_403','Sai Publishable key/quyền RPC → sửa cấu hình Supabase, không retry vô hạn.'],['HTTP_429','Quá nhiều request → chờ rồi thử lại.']].map(([a,b])=>`<div class="step-box p-3"><b>${esc(a)}</b><div class="mt-1 text-[#666]">${esc(b)}</div></div>`).join('')}</div></section><section class="admin-panel p-4 md:p-5 api-panel"><h2 class="text-lg font-black">4. Luồng chính xác</h2><div class="grid md:grid-cols-5 gap-2 mt-3 text-xs"><div class="step-box p-3"><b>① Get Key</b><br>Website tạo/cấp Key.</div><div class="step-box p-3"><b>② Nhập Key</b><br>Người dùng dán Key vào app.</div><div class="step-box p-3"><b>③ Gọi Supabase</b><br>App POST trực tiếp RPC.</div><div class="step-box p-3"><b>④ Supabase trả JSON</b><br>App đọc <code>status</code>.</div><div class="step-box p-3"><b>⑤ Quyết định</b><br>ACTIVE → tiếp tục; lỗi → dừng/hiển thị lý do.</div></div></section><section class="admin-panel p-4 md:p-5 api-panel"><h2 class="text-lg font-black">5. Kotlin — Android Studio / AIDE Pro</h2><div class="code-tabs mt-3"><button class="active" data-code-tab="kt">Kotlin</button><button data-code-tab="java">Java</button></div><div id="kt" class="api-code-block active mt-3"><pre class="text-xs">val supabaseUrl = "${supabase}"
val publishableKey = "${pub}"
val key = "BDZ-XXXXXXXXXXXX"
val clientIp = "1.2.3.4"
val product = "free-fire"

val json = """{\"p_key_code\":\"$key\",\"p_client_ip\":\"$clientIp\",\"p_product_slug\":\"$product\"}"""
val body = json.toRequestBody("application/json".toMediaType())

val request = Request.Builder()
    .url("$supabaseUrl/rest/v1/rpc/verify_key_app")
    .post(body)
    .header("apikey", publishableKey)
    .header("Authorization", "Bearer $publishableKey")
    .header("Content-Type", "application/json")
    .header("Accept", "application/json")
    .build()

client.newCall(request).enqueue(object : Callback {
    override fun onFailure(call: Call, e: IOException) {
        // Hiển thị lỗi mạng; KHÔNG mở menu
    }
    override fun onResponse(call: Call, response: Response) {
        val text = response.body?.string().orEmpty()
        // Parse JSONArray; lấy object đầu tiên
        // status == ACTIVE -> cho phép tiếp tục
        // status khác -> hiển thị message và dừng
    }
})</pre></div><div id="java" class="api-code-block mt-3"><pre class="text-xs">String supabaseUrl = "${supabase}";
String publishableKey = "${pub}";
String bodyJson = "{\"p_key_code\":\"BDZ-XXXXXXXXXXXX\",\"p_client_ip\":\"1.2.3.4\",\"p_product_slug\":\"free-fire\"}";
RequestBody body = RequestBody.create(bodyJson, MediaType.parse("application/json"));
Request request = new Request.Builder()
    .url(supabaseUrl + "/rest/v1/rpc/verify_key_app")
    .post(body)
    .addHeader("apikey", publishableKey)
    .addHeader("Authorization", "Bearer " + publishableKey)
    .addHeader("Content-Type", "application/json")
    .addHeader("Accept", "application/json")
    .build();

client.newCall(request).enqueue(new Callback() {
  @Override public void onFailure(Call call, IOException e) { }
  @Override public void onResponse(Call call, Response response) throws IOException {
    String text = response.body() != null ? response.body().string() : "";
    // Parse JSONArray -> object 0 -> status/message
  }
});</pre></div><p class="text-xs text-[#666] mt-3">Dùng OkHttp; luôn chạy request ngoài UI thread. Đặt timeout khoảng 10–15 giây, retry tối đa 2 lần cho lỗi mạng/5xx.</p></section><section class="admin-panel p-4 md:p-5 api-panel"><h2 class="text-lg font-black">6. Lưu ý quan trọng về IP</h2><div class="api-note">Vì App gọi Supabase trực tiếp, Supabase không thể tin địa chỉ IP do APK tự khai báo như một nguồn bằng chứng mạnh. Trường <code>p_client_ip</code> hiện được dùng để giữ đúng logic IP binding của hệ thống; App phải lấy IP công khai trước khi gọi RPC. Không coi đây là cơ chế chống giả mạo IP tuyệt đối.</div></section><section class="admin-panel p-4 md:p-5 api-panel"><h2 class="text-lg font-black">7. Không được làm</h2><div class="grid md:grid-cols-3 gap-3 mt-3 text-xs"><div class="step-box p-3"><b>Không dùng Secret</b><p class="mt-1 text-[#666]">Không nhúng Service Role/Secret vào APK.</p></div><div class="step-box p-3"><b>Không dùng Vercel API</b><p class="mt-1 text-[#666]">App không gọi <code>/api/v1/verify</code> trong flow này.</p></div><div class="step-box p-3"><b>Không mở menu mù</b><p class="mt-1 text-[#666]">Chỉ mở khi Supabase trả <code>ACTIVE</code>.</p></div></div></section></div>`;wire();rendered=true};const open=e=>{if(e){e.preventDefault();e.stopImmediatePropagation()}rendered=false;setTab();requestAnimationFrame(guide)};document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('[data-tab="integration"]').forEach(b=>b.addEventListener('click',open,true)));window.BDZApiGuide={render:guide,reset:()=>{rendered=false;guide()}};})();