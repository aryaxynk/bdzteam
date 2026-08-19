(() => {
  'use strict';

  let rendered = false;
  const SUPABASE_URL = 'https://nklukqriopezsoalnghm.supabase.co';
  const RPC_URL = `${SUPABASE_URL}/rest/v1/rpc/verify_key_app`;
  const PUBLISHABLE_KEY = 'sb_publishable_RUE5iV8GqoVCFxjVt5ZBpg_FlTC1v-0';

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[c]));

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const copyButton = (text, label = 'Sao chép') =>
    `<button class="small-btn" type="button" data-api-copy="${esc(text)}">${label}</button>`;

  const code = (text) => `<pre class="api-long-code text-xs">${esc(text)}</pre>`;
  const note = (title, text) => `<div class="api-note mt-3"><b>${esc(title)}</b> ${esc(text)}</div>`;

  function setTabHeader() {
    try {
      if (typeof state !== 'undefined') state.tab = 'integration';
    } catch {}
    document.querySelectorAll('[data-tab]').forEach((el) => {
      el.classList.toggle('active', el.dataset.tab === 'integration');
    });
    const title = document.getElementById('tabTitle');
    const sub = document.getElementById('tabSub');
    if (title) title.textContent = 'Tích Hợp API';
    if (sub) sub.textContent = 'Tài liệu tích hợp Key vào Menu App / Game';
  }

  function wire() {
    document.querySelectorAll('[data-api-copy]').forEach((button) => {
      if (button.dataset.wired === '1') return;
      button.dataset.wired = '1';
      button.addEventListener('click', async () => {
        const ok = await copy(button.dataset.apiCopy || '');
        const old = button.textContent;
        button.textContent = ok ? '✓ Đã sao chép' : 'Không thể sao chép';
        setTimeout(() => { button.textContent = old; }, 1200);
      });
    });

    document.querySelectorAll('[data-api-code-tab]').forEach((button) => {
      if (button.dataset.wired === '1') return;
      button.dataset.wired = '1';
      button.addEventListener('click', () => {
        document.querySelectorAll('[data-api-code-tab]').forEach((x) => x.classList.remove('active'));
        document.querySelectorAll('.api-code-block').forEach((x) => x.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(button.dataset.apiCodeTab)?.classList.add('active');
      });
    });
  }

  function render() {
    const container = document.getElementById('tabContent');
    if (!container) return;

    setTabHeader();
    rendered = true;

    const requestJson = JSON.stringify({
      p_key_code: 'BDZ-XXXXXXXXXXXX',
      p_client_ip: '1.2.3.4',
      p_product_slug: 'free-fire'
    }, null, 2);

    const kotlin = `private const val SUPABASE_URL = "${SUPABASE_URL}"\nprivate const val SUPABASE_KEY = "${PUBLISHABLE_KEY}"\n\nsuspend fun checkKey(key: String, clientIp: String, product: String): Result<String> {\n    val payload = JSONObject().apply {\n        put("p_key_code", key.trim())\n        put("p_client_ip", clientIp.trim())\n        put("p_product_slug", product.trim())\n    }\n\n    val request = Request.Builder()\n        .url(\"${RPC_URL}\")\n        .post(payload.toString().toRequestBody(\"application/json\".toMediaType()))\n        .header(\"apikey\", SUPABASE_KEY)\n        .header(\"Authorization\", \"Bearer $SUPABASE_KEY\")\n        .header(\"Accept\", \"application/json\")\n        .build()\n\n    return try {\n        client.newCall(request).execute().use { response ->\n            val body = response.body?.string().orEmpty()\n            if (!response.isSuccessful) {\n                return Result.failure(IllegalStateException(\"Supabase HTTP ${'$'}{response.code}: ${'$'}body\"))\n            }\n\n            val array = JSONArray(body)\n            if (array.length() == 0) {\n                return Result.failure(IllegalStateException(\"Supabase không trả dữ liệu Key.\"))\n            }\n\n            val item = array.getJSONObject(0)\n            val status = item.optString(\"status\")\n\n            when (status) {\n                \"ACTIVE\" -> Result.success(item.toString())\n                else -> Result.failure(IllegalStateException(item.optString(\"message\", \"Key không hợp lệ.\")))\n            }\n        }\n    } catch (e: Exception) {\n        Result.failure(e)\n    }\n}`;

    const java = `private static final String SUPABASE_URL = "${SUPABASE_URL}";\nprivate static final String SUPABASE_KEY = "${PUBLISHABLE_KEY}";\n\nvoid checkKey(String key, String clientIp, String product) {\n    JSONObject payload = new JSONObject();\n    payload.put(\"p_key_code\", key.trim());\n    payload.put(\"p_client_ip\", clientIp.trim());\n    payload.put(\"p_product_slug\", product.trim());\n\n    Request request = new Request.Builder()\n        .url(\"${RPC_URL}\")\n        .post(RequestBody.create(payload.toString(), MediaType.parse(\"application/json\")))\n        .addHeader(\"apikey\", SUPABASE_KEY)\n        .addHeader(\"Authorization\", \"Bearer \" + SUPABASE_KEY)\n        .addHeader(\"Accept\", \"application/json\")\n        .build();\n\n    client.newCall(request).enqueue(new Callback() {\n        @Override public void onFailure(Call call, IOException e) {\n            // Không mở menu khi mất mạng.\n        }\n\n        @Override public void onResponse(Call call, Response response) throws IOException {\n            String body = response.body() != null ? response.body().string() : \"\";\n            if (!response.isSuccessful()) {\n                // Hiển thị Supabase HTTP code và dừng.\n                return;\n            }\n\n            JSONArray array = new JSONArray(body);\n            if (array.length() == 0) return;\n            JSONObject item = array.getJSONObject(0);\n            String status = item.optString(\"status\");\n            if (\"ACTIVE\".equals(status)) {\n                // runOnUiThread(() -> openNextMenu());\n            } else {\n                String message = item.optString(\"message\", \"Key không hợp lệ.\");\n                // runOnUiThread(() -> showError(message));\n            }\n        }\n    });\n}`;

    const gsonKotlin = `data class VerifyResult(\n    val status: String,\n    val product: String?,\n    val product_id: Long?,\n    val duration_hours: Int?,\n    val expires_at: String?,\n    val claimed_ip: String?,\n    val key_scope: String?,\n    val activated_at: String?,\n    val activated_ip: String?,\n    val message: String?\n)\n\n// Supabase RPC trả JSONArray -> parse response[0] thành VerifyResult.`;

    container.innerHTML = `
      <div class="space-y-4 api-guide">
        <section class="admin-panel p-4 md:p-5 api-panel api-hero-panel">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0">
              <span class="status-pill success">GAME API · DIRECT SUPABASE</span>
              <h2 class="text-xl md:text-2xl font-black mt-2 break-words">API chính thức cho Menu App / Game</h2>
              <p class="text-sm text-[#555] mt-2 leading-6">Không gọi Website/Vercel để Check Key. App gọi trực tiếp Supabase RPC, nhận JSON và tự quyết định mở hay khóa bước tiếp theo.</p>
            </div>
            <span class="status-pill info">App → Supabase → App</span>
          </div>

          <div class="api-flow-grid mt-4">
            <div class="step-box p-3"><b>① GET KEY</b><br><span>Người dùng lấy Key trên website.</span></div>
            <div class="step-box p-3"><b>② NHẬP KEY</b><br><span>Menu App nhận Key từ người dùng.</span></div>
            <div class="step-box p-3"><b>③ CHECK</b><br><span>App POST trực tiếp đến Supabase.</span></div>
            <div class="step-box p-3"><b>④ JSON</b><br><span>Supabase trả status + thông tin Key.</span></div>
            <div class="step-box p-3"><b>⑤ QUYẾT ĐỊNH</b><br><span>Chỉ ACTIVE mới mở Menu tiếp theo.</span></div>
          </div>
        </section>

        <section class="admin-panel p-4 md:p-5 api-panel">
          <h2 class="text-lg md:text-xl font-black">1. Thông tin kết nối — nhập đúng từng ký tự</h2>
          <div class="api-field-grid mt-4">
            <div><b>Supabase Project URL</b><div class="api-copy"><code>${esc(SUPABASE_URL)}</code>${copyButton(SUPABASE_URL)}</div></div>
            <div><b>RPC URL</b><div class="api-copy"><code>${esc(RPC_URL)}</code>${copyButton(RPC_URL)}</div></div>
            <div><b>RPC Function</b><div class="api-copy"><code>verify_key_app</code>${copyButton('verify_key_app')}</div></div>
            <div><b>Publishable Key</b><div class="api-copy"><code>${esc(PUBLISHABLE_KEY)}</code>${copyButton(PUBLISHABLE_KEY)}</div></div>
          </div>
          ${note('Không dùng:', 'Service Role Key, Secret Key, ADMIN_SESSION_SECRET, ADMIN_PASSWORD hoặc bất kỳ credential server-side nào trong APK.')}
        </section>

        <section class="admin-panel p-4 md:p-5 api-panel">
          <h2 class="text-lg md:text-xl font-black">2. HTTP Request chuẩn</h2>
          ${code(`POST ${RPC_URL}\nContent-Type: application/json\napikey: ${PUBLISHABLE_KEY}\nAuthorization: Bearer ${PUBLISHABLE_KEY}\nAccept: application/json\n\n${requestJson}`)}
          <div class="flex flex-wrap gap-2 mt-3">${copyButton(RPC_URL, 'Copy URL')}${copyButton(requestJson, 'Copy JSON')}${copyButton(PUBLISHABLE_KEY, 'Copy Publishable Key')}</div>
          ${note('Ba field bắt buộc:', 'p_key_code = Key người dùng nhập; p_client_ip = IP client dùng cho logic IP binding hiện tại; p_product_slug = slug chính xác của game/sản phẩm.')}
        </section>

        <section class="admin-panel p-4 md:p-5 api-panel">
          <h2 class="text-lg md:text-xl font-black">3. Response chuẩn mà App phải đọc</h2>
          ${code(`[{\n  "status": "ACTIVE",\n  "product": "Free Fire",\n  "product_id": 4,\n  "duration_hours": 10,\n  "expires_at": "2026-08-19T10:00:00Z",\n  "claimed_ip": "1.2.3.4",\n  "key_scope": "GET",\n  "activated_at": null,\n  "activated_ip": null,\n  "message": "Key hợp lệ."\n}]`)}
          ${note('Quan trọng:', 'REST RPC của PostgreSQL function trả về một mảng JSON. App phải kiểm tra array không rỗng rồi đọc object đầu tiên: response[0].')}
          ${code(gsonKotlin)}
        </section>

        <section class="admin-panel p-4 md:p-5 api-panel">
          <h2 class="text-lg md:text-xl font-black">4. Bảng trạng thái — App phải xử lý nhất quán</h2>
          <div class="api-status-grid mt-4">
            ${[
              ['ACTIVE', 'Cho phép mở Menu / chức năng tiếp theo.'],
              ['INVALID', 'Key không tồn tại hoặc không hợp lệ → dừng.'],
              ['EXPIRED', 'Key đã hết hạn → dừng.'],
              ['REVOKED', 'Admin đã khóa/thu hồi → dừng.'],
              ['IP_MISMATCH', 'IP hiện tại không khớp Key GET → dừng.'],
              ['WRONG_PRODUCT', 'Key không dành cho sản phẩm hiện tại → dừng.'],
              ['HTTP 401 / 403', 'Publishable key hoặc quyền RPC sai → không retry vô hạn.'],
              ['HTTP 429', 'Rate limit → chờ rồi thử lại sau.'],
              ['HTTP 5xx', 'Supabase tạm lỗi → retry giới hạn 1–2 lần, không mở Menu.'],
              ['NETWORK_ERROR', 'Không có mạng/timeout → hiển thị lỗi kết nối, không mở Menu.']
            ].map(([status, text]) => `<div class="step-box p-3"><b>${esc(status)}</b><p class="mt-1 text-[#666]">${esc(text)}</p></div>`).join('')}
          </div>
        </section>

        <section class="admin-panel p-4 md:p-5 api-panel">
          <h2 class="text-lg md:text-xl font-black">5. Logic Menu App — chính xác từng bước</h2>
          ${code(`1. Lấy Key từ TextInput/EditText.\n2. trim() và kiểm tra rỗng.\n3. Lấy product_slug đúng với game hiện tại.\n4. Lấy client IP theo cơ chế App đang dùng.\n5. POST tới verify_key_app.\n6. Kiểm tra HTTP status.\n7. Parse JSON array.\n8. Lấy response[0].\n9. Đọc field status.\n10. status == ACTIVE → chuyển sang bước tiếp theo.\n11. Các status khác → hiển thị message và dừng.\n12. Không được mở Menu chỉ vì request HTTP = 200; phải có status == ACTIVE.`)}
          ${code(`val item = responseArray.getJSONObject(0)\nwhen (item.optString("status")) {\n    "ACTIVE" -> openNextMenu()\n    "INVALID" -> showError("Key không hợp lệ")\n    "EXPIRED" -> showError("Key đã hết hạn")\n    "REVOKED" -> showError("Key đã bị khóa")\n    "IP_MISMATCH" -> showError("Key không thuộc IP hiện tại")\n    "WRONG_PRODUCT" -> showError("Key không đúng sản phẩm")\n    else -> showError(item.optString("message", "Xác minh thất bại"))\n}`)}
        </section>

        <section class="admin-panel p-4 md:p-5 api-panel">
          <h2 class="text-lg md:text-xl font-black">6. Kotlin — Android Studio / AIDE Pro</h2>
          <div class="code-tabs mt-3">
            <button class="active" data-api-code-tab="kotlin-code">Kotlin</button>
            <button data-api-code-tab="java-code">Java</button>
          </div>
          <div id="kotlin-code" class="api-code-block active mt-3">${code(kotlin)}</div>
          <div id="java-code" class="api-code-block mt-3">${code(java)}</div>
          ${note('Thư viện:', 'Dùng OkHttp + org.json (hoặc Moshi/Gson). Luôn chạy network call ngoài UI thread; cập nhật UI bằng Main/UI thread sau khi nhận kết quả.')}
        </section>

        <section class="admin-panel p-4 md:p-5 api-panel">
          <h2 class="text-lg md:text-xl font-black">7. Android Studio / AIDE Pro — cấu hình tối thiểu</h2>
          ${code(`AndroidManifest.xml\n\n<uses-permission android:name="android.permission.INTERNET" />\n\nDependencies (ví dụ)\n\nimplementation("com.squareup.okhttp3:okhttp:<version>")\n\nNếu dùng org.json thì không cần thêm JSON library riêng.`)}
          <div class="api-checklist mt-4">
            <div>☐ INTERNET permission</div>
            <div>☐ Đúng Supabase URL</div>
            <div>☐ Đúng Publishable Key</div>
            <div>☐ Đúng RPC = verify_key_app</div>
            <div>☐ JSON dùng đúng 3 parameter</div>
            <div>☐ Parse JSONArray → object 0</div>
            <div>☐ Chỉ ACTIVE mới mở Menu</div>
            <div>☐ Không gọi mạng trên UI thread</div>
            <div>☐ Timeout 10–15 giây</div>
            <div>☐ Retry 1–2 lần cho network/5xx</div>
          </div>
        </section>

        <section class="admin-panel p-4 md:p-5 api-panel">
          <h2 class="text-lg md:text-xl font-black">8. Ví dụ flow thực tế trong Menu</h2>
          ${code(`Người dùng nhập: BDZ-A1B2C3D4\n        ↓\nApp xác định product_slug = free-fire\n        ↓\nPOST verify_key_app\n        ↓\nSupabase trả status = ACTIVE\n        ↓\nApp đọc expires_at / product / duration_hours\n        ↓\nHiển thị "Key hợp lệ"\n        ↓\nopenNextMenu()\n\nNếu status = EXPIRED / REVOKED / IP_MISMATCH / INVALID\n        ↓\nHiển thị message\n        ↓\nKHÔNG gọi openNextMenu()`)}
        </section>

        <section class="admin-panel p-4 md:p-5 api-panel">
          <h2 class="text-lg md:text-xl font-black">9. Bảo mật</h2>
          <div class="grid md:grid-cols-2 gap-3 mt-4 text-xs">
            <div class="step-box p-3"><b>Được phép trong APK</b><p class="mt-1 text-[#666]">Supabase Project URL + Publishable/anon key.</p></div>
            <div class="step-box p-3"><b>Tuyệt đối không</b><p class="mt-1 text-[#666]">Service Role Key, Secret Key, ADMIN_PASSWORD, ADMIN_SESSION_SECRET hay token shortener.</p></div>
            <div class="step-box p-3"><b>Không tin HTTP 200</b><p class="mt-1 text-[#666]">HTTP 200 chỉ có nghĩa request thành công; App phải kiểm tra status == ACTIVE.</p></div>
            <div class="step-box p-3"><b>Không retry vô hạn</b><p class="mt-1 text-[#666]">4xx không retry liên tục. Network/5xx chỉ retry giới hạn.</p></div>
          </div>
          ${note('Giới hạn IP:', 'Khi App gọi Supabase trực tiếp, p_client_ip là dữ liệu do client cung cấp và không thể được xem là bằng chứng IP chống giả mạo tuyệt đối. Đây là giới hạn của kiến trúc Direct App → Supabase.')}
        </section>

        <section class="admin-panel p-4 md:p-5 api-panel">
          <h2 class="text-lg md:text-xl font-black">10. Bản tóm tắt để gửi cho người code Menu</h2>
          ${code(`Endpoint:\n${RPC_URL}\n\nMethod:\nPOST\n\nHeaders:\napikey: ${PUBLISHABLE_KEY}\nAuthorization: Bearer ${PUBLISHABLE_KEY}\nContent-Type: application/json\nAccept: application/json\n\nBody:\n{\n  "p_key_code": "KEY_USER_INPUT",\n  "p_client_ip": "CLIENT_IP",\n  "p_product_slug": "free-fire"\n}\n\nRead:\nresponse[0].status\n\nOnly:\nACTIVE = continue\n\nOther status = stop + show message`)}
        </section>
      </div>
    `;

    wire();
  }

  function open(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
    rendered = false;
    requestAnimationFrame(render);
  }

  // Capture phase is intentional: the detailed guide must win over the legacy inline renderer.
  document.addEventListener('click', (event) => {
    const tab = event.target.closest?.('[data-tab="integration"]');
    if (tab) open(event);
  }, true);

  window.BDZApiGuide = {
    render,
    reset: () => { rendered = false; render(); }
  };
})();