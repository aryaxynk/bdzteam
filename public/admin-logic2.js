function renderKeys(){const qEl=$('q'),fEl=$('filter');if(!qEl||!$('keyRows'))return;const q=qEl.value.trim().toLowerCase(),f=fEl?fEl.value:'',r=rows.filter(k=>(!q||String(k.key_code).toLowerCase().includes(q))&&(!f||k.status===f));$('keyRows').innerHTML=r.map(k=>{const used=(k.devices_used!=null?k.devices_used:((k.device_id_hash||k.activated_device_id_hash)?1:0));const badge=k.created_by_name?`<span class="tag" style="margin-left:6px;font-size:10px" title="Admin tạo">Admin: ${esc(k.created_by_name)}</span>`:'';return `<tr><td><input type="checkbox" class="kchk" value="${k.id}"></td><td><span class="mono">${esc(k.key_code)}</span>${badge}</td><td><span class="tag ${['ACTIVE','REACTIVATED'].includes(k.status)?'on':'off'}">${esc(ST_LABEL[k.status]||k.status)}</span></td><td>${used}/${k.max_devices||1}</td><td style="white-space:nowrap;font-size:12px">${k.expires_at?new Date(k.expires_at).toLocaleString('vi-VN'):'—'}</td><td><button class="btn sm" data-menu="key" data-id="${k.id}">⋮</button></td></tr>`}).join('')||'<tr><td colspan="6" style="color:var(--muted)">Không có key</td></tr>';$('keyRows').querySelectorAll('[data-menu]').forEach(b=>b.onclick=e=>openRowMenu(e,+b.dataset.id,'key'))}
function modalKey(k){const isEdit=!!k,root=$('modalRoot'),statuses=['ACTIVE','DISABLED','TIME_EXPIRED','DEVICE_LIMIT','EXPIRED','LIMIT_REACHED','REACTIVATED'];root.innerHTML=`<div class="modal-bg"><div class="modal"><h3>${isEdit?'Sửa key':'Tạo key'}</h3><div class="field"><label>Key code</label><input id="mCode" class="input" value="${isEdit?esc(k.key_code):''}" placeholder="${isEdit?'':'Tự động'}"></div><div class="field"><label>Thời hạn (giờ)</label><input id="mDur" class="input" type="number" value="${isEdit?(k.duration_hours||5):(settings.default_duration_hours||5)}"></div><div class="field"><label>Max devices</label><input id="mDev" class="input" type="number" value="${isEdit?(k.max_devices||1):(settings.default_max_devices||1)}"></div>${isEdit?`<div class="field"><label>Trạng thái</label><select id="mSt" class="select">${statuses.map(s=>`<option value="${s}" ${k.status===s?'selected':''}>${ST_LABEL[s]||s}</option>`).join('')}</select></div>`:''}<div class="modal-actions"><button class="btn" id="mCancel">Hủy</button><button class="btn primary" id="mOk">${isEdit?'Lưu':'Tạo'}</button></div></div></div>`;$('mCancel').onclick=()=>root.innerHTML='';$('mOk').onclick=async()=>{try{const payload={duration_hours:+$('mDur').value,max_devices:+$('mDev').value,max_checks:0};const code=$('mCode').value.trim();if(code)payload.key_code=code;if(isEdit){payload.id=k.id;payload.status=$('mSt').value;await rpcAction('update',payload)}else{const x=await rpcAction('create',payload);alert('Key: '+(x.row?.key_code||'OK'))}root.innerHTML='';load()}catch(e){alert(e.message)}}}
async function loadAdmins(){if(role!=='OWNER'&&!perms.can_admins)return;try{const x=await BDZ.rpc('bdz_admin_users',{p_token:tok()});if(!x?.ok){$('adminRows').innerHTML=`<tr><td colspan="5" style="color:var(--muted)">${esc(x?.error||'—')}</td></tr>`;return}admins=x.users||[];$('adminRows').innerHTML=admins.map(u=>`<tr><td><b>${esc(u.username)}</b></td><td><span class="tag">${esc(u.role)}</span></td><td><span class="tag ${u.active?'on':'off'}">${u.active?'ON':'OFF'}</span></td><td style="font-size:12px">${u.last_login_at?new Date(u.last_login_at).toLocaleString('vi-VN'):'—'}</td><td>${u.role==='OWNER'?'—':`<button class="btn sm" data-menu="admin" data-id="${u.id}">⋮</button>`}</td></tr>`).join('');$('adminRows').querySelectorAll('[data-menu]').forEach(b=>b.onclick=e=>openRowMenu(e,+b.dataset.id,'admin'))}catch(e){}}
function modalAdmin(u){const isEdit=!!u,root=$('modalRoot');root.innerHTML=`<div class="modal-bg"><div class="modal"><h3>${isEdit?'Sửa admin':'Tạo admin'}</h3><div class="field"><label>Username</label><input id="mUser" class="input" value="${isEdit?esc(u.username):''}"></div><div class="field"><label>Password</label><input id="mPass" class="input" type="password" placeholder="${isEdit?'Để trống nếu không đổi':''}"></div><div class="modal-actions"><button class="btn" id="mCancel">Hủy</button><button class="btn primary" id="mOk">Lưu</button></div></div></div>`;$('mCancel').onclick=()=>root.innerHTML='';$('mOk').onclick=async()=>{try{const payload={username:$('mUser').value.trim()};const p=$('mPass').value;if(p)payload.password=p;if(isEdit){payload.id=u.id;await BDZ.rpc('bdz_admin_users',{p_token:tok(),p_action:'update',p_payload:payload})}else{await BDZ.rpc('bdz_admin_users',{p_token:tok(),p_action:'create',p_payload:payload})}root.innerHTML='';loadAdmins()}catch(e){alert(e.message)}}}
function modalPerms(u){alert('Phân quyền: dùng RPC bdz_admin_perms (owner)')}
async function loadSettings(){try{const x=await BDZ.rpc('bdz_admin_settings',{p_token:tok(),p_action:'get'});if(x?.ok&&x.settings){settings=x.settings;if($('setDur'))$('setDur').value=settings.default_duration_hours||5;if($('setDev'))$('setDev').value=settings.default_max_devices||1;if($('setLim'))$('setLim').value=settings.get_key_limit_per_visitor||3;if($('setIp'))$('setIp').value=String(settings.bind_ip_on_activate??true);if($('setBind'))$('setBind').value=String(settings.bind_device_on_activate??true)}}catch(e){}}
async function saveSettings(){try{const payload={default_duration_hours:+$('setDur').value,default_max_devices:+$('setDev').value,default_max_checks:0,get_key_limit_per_visitor:+$('setLim').value,bind_ip_on_activate:$('setIp').value==='true',bind_device_on_activate:$('setBind').value==='true'};const x=await BDZ.rpc('bdz_admin_settings',{p_token:tok(),p_action:'update',p_payload:payload});if(!x?.ok)throw Error(x?.error||'Lỗi');settings=x.settings||payload;$('saveMsg').textContent='Đã lưu'}catch(e){$('saveMsg').textContent=e.message}}
const SAMPLES={
java:`// ═══════════════════════════════════════
// BDZ — Android Java (OkHttp)
// ═══════════════════════════════════════
// build.gradle:
//   implementation "com.squareup.okhttp3:okhttp:4.12.0"
//   implementation "org.json:json:20231013"

public class BdzApi {
  static final String BASE =
    "https://nklukqriopezsoalnghm.supabase.co";
  static final String API_KEY =
    "sb_publishable_RUE5iV8GqoVCFxjVt5ZBpg_FlTC1v-0";
  // Version app — phải trùng bản đang Bật trên admin
  static final String APP_VERSION = "1.0.0";
  static final String APP_ID = "default";

  static OkHttpClient client = new OkHttpClient.Builder()
      .connectTimeout(10, TimeUnit.SECONDS)
      .readTimeout(15, TimeUnit.SECONDS)
      .build();

  // 1) Mỗi lần mở app — check version trước
  //    true = cho chạy · false = bắt update
  public static JSONObject checkVersion() throws Exception {
    JSONObject body = new JSONObject();
    body.put("version", APP_VERSION);
    body.put("app_id", APP_ID);
    Request req = new Request.Builder()
        .url(BASE + "/functions/v1/check-version")
        .addHeader("Content-Type", "application/json")
        .addHeader("apikey", API_KEY)
        .post(RequestBody.create(body.toString(),
            MediaType.parse("application/json")))
        .build();
    try (Response res = client.newCall(req).execute()) {
      String raw = res.body() != null ? res.body().string() : "{}";
      return new JSONObject(raw);
    }
  }

  // 2) Sau khi version OK — check key
  //    true = cho login menu
  public static boolean checkKey(String key, String deviceId)
      throws Exception {
    JSONObject body = new JSONObject();
    body.put("key", key);
    body.put("device_id", deviceId);
    body.put("app_version", APP_VERSION);
    Request req = new Request.Builder()
        .url(BASE + "/functions/v1/check-key")
        .addHeader("Content-Type", "application/json")
        .addHeader("apikey", API_KEY)
        .post(RequestBody.create(body.toString(),
            MediaType.parse("application/json")))
        .build();
    try (Response res = client.newCall(req).execute()) {
      String raw = res.body() != null ? res.body().string() : "{}";
      JSONObject j = new JSONObject(raw);
      return j.optBoolean("ok", false)
          && j.optBoolean("key_valid", false);
    }
  }
}

// Startup:
// JSONObject v = BdzApi.checkVersion();
// if (!v.optBoolean("allowed", false)) {
//   // hiện dialog update · v.optString("download_url")
//   // chặn app
// }
// if (BdzApi.checkKey(userKey, hwid)) { /* vào menu */ }
`,
native:`// ═══════════════════════════════════════
// BDZ — Native C++ (JNI / Zygisk / ImGui)
// Link: -lcurl
// ═══════════════════════════════════════

#include <curl/curl.h>
#include <string>

static const char* BASE =
  "https://nklukqriopezsoalnghm.supabase.co";
static const char* API_KEY =
  "sb_publishable_RUE5iV8GqoVCFxjVt5ZBpg_FlTC1v-0";
static const char* APP_VERSION = "1.0.0";
static const char* APP_ID = "default";

static size_t write_cb(char* p, size_t s, size_t n, void* u) {
  ((std::string*)u)->append(p, s * n);
  return s * n;
}

static bool http_post(const char* path, const std::string& body,
                      std::string& out) {
  std::string url = std::string(BASE) + path;
  CURL* curl = curl_easy_init();
  if (!curl) return false;
  struct curl_slist* h = nullptr;
  h = curl_slist_append(h, "Content-Type: application/json");
  h = curl_slist_append(h, (std::string("apikey: ") + API_KEY).c_str());
  curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
  curl_easy_setopt(curl, CURLOPT_HTTPHEADER, h);
  curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_cb);
  curl_easy_setopt(curl, CURLOPT_WRITEDATA, &out);
  curl_easy_setopt(curl, CURLOPT_TIMEOUT, 15L);
  CURLcode rc = curl_easy_perform(curl);
  curl_slist_free_all(h);
  curl_easy_cleanup(curl);
  return rc == CURLE_OK;
}

bool bdz_check_version() {
  std::string body = std::string("{\"version\":\"") + APP_VERSION +
    "\",\"app_id\":\"" + APP_ID + "\"}";
  std::string res;
  if (!http_post("/functions/v1/check-version", body, res)) return false;
  return res.find("\"allowed\":true") != std::string::npos
      || res.find("\"allowed\": true") != std::string::npos;
}

bool bdz_check_key(const std::string& key,
                   const std::string& device_id) {
  std::string body =
    std::string("{\"key\":\"") + key +
    "\",\"device_id\":\"" + device_id +
    "\",\"app_version\":\"" + APP_VERSION + "\"}";
  std::string res;
  if (!http_post("/functions/v1/check-key", body, res)) return false;
  bool ok = res.find("\"ok\":true") != std::string::npos
         || res.find("\"ok\": true") != std::string::npos;
  bool valid = res.find("\"key_valid\":true") != std::string::npos
            || res.find("\"key_valid\": true") != std::string::npos;
  return ok && valid;
}

// Startup:
// if (!bdz_check_version()) { /* hiện update · chặn app */ }
// if (bdz_check_key(key, hwid)) { /* vào menu */ }
`,
chung:`// ═══════════════════════════════════════
// BDZ API — CODE CHUNG (full)
// ═══════════════════════════════════════

BASE
  https://nklukqriopezsoalnghm.supabase.co

HEADER (cả 2 API)
  Content-Type: application/json
  apikey: sb_publishable_RUE5iV8GqoVCFxjVt5ZBpg_FlTC1v-0

═══════════════════════════════════════
1) CHECK VERSION  (mỗi lần mở app)
═══════════════════════════════════════
POST {BASE}/functions/v1/check-version

BODY
  version    string   version app đang chạy (vd "1.0.0")
  app_id     string   id app (vd "default")

RESPONSE
  Cho chạy:
    { "ok": true, "allowed": true,
      "message": "Version hợp lệ." }

  Bắt update (version Tắt / không có):
    { "ok": true, "allowed": false,
      "message": "Vui lòng cập nhật phiên bản mới nhất.",
      "latest": "1.0.1",
      "download_url": "https://...",
      "note": "..." }

QUY TẮC
  allowed=true  → tiếp tục check-key
  allowed=false → hiện dialog update · chặn app

═══════════════════════════════════════
2) CHECK KEY  (sau khi version OK)
═══════════════════════════════════════
POST {BASE}/functions/v1/check-key

BODY
  key          string   mã key user nhập
  device_id    string   HWID máy (Android ID)
  app_version  string   version app (nên gửi)

RESPONSE
  OK:
    { "ok": true, "key_valid": true,
      "message": "Key hợp lệ." }
  FAIL:
    { "ok": false, "key_valid": false,
      "message": "Key không hợp lệ." }

QUY TẮC
  ok && key_valid → cho login / mở menu
  còn lại         → chặn

STATUS (admin xem)
  ACTIVE · REACTIVATED · DISABLED
  EXPIRED · TIME_EXPIRED
  DEVICE_LIMIT · LIMIT_REACHED · CREATED

TIMEOUT gợi ý: connect 10s · read 15s
`
};

const API_SPEC =
`═══════════════════════════════════════
CHECK VERSION  (mỗi lần mở app)
═══════════════════════════════════════
POST .../functions/v1/check-version

BIẾN
  version    version app đang chạy
  app_id     id app (mặc định "default")

RESPONSE
  allowed=true   → cho mở app
  allowed=false  → bắt update
                 (trả latest + download_url)

LOGIC SERVER
  Version Bật + đúng  → allowed=true
  Version Tắt / không có → allowed=false

═══════════════════════════════════════
CHECK KEY  (sau khi version OK)
═══════════════════════════════════════
POST .../functions/v1/check-key

BIẾN BẮT BUỘC
  key           mã key
  device_id     HWID máy (Android ID)

BIẾN TÙY CHỌN
  app_version   version app
  ip            client IP

RESPONSE
  ok + key_valid = true  → cho login
  còn lại                → Key không hợp lệ

STATUS (admin)
  ACTIVE · DISABLED · EXPIRED
  TIME_EXPIRED · DEVICE_LIMIT
  LIMIT_REACHED · REACTIVATED · CREATED
`;

function showLang(lang){
  document.querySelectorAll('.tab-lang').forEach(b=>
    b.classList.toggle('active',b.dataset.lang===lang));
  const el=$('apiSample');
  if(el) el.textContent=SAMPLES[lang]||SAMPLES.chung||'';
  const spec=$('apiSpec');
  if(spec){ spec.textContent=API_SPEC; }
}
themeInit();shell();
$('login')&&$('login').classList.remove('hidden');
$('app')&&$('app').classList.add('hidden');
(async()=>{if(!tok())return;try{const x=await BDZ.rpc('bdz_admin_keys',{p_token:tok()});if(x?.error==='UNAUTHORIZED'||!x||x.error){sessionStorage.clear();return}role=sessionStorage.getItem('bdz_r')||'OWNER';showApp();rows=x?.keys||[];await loadPerms();buildNav();renderDash();renderKeys();await Promise.all([loadSettings(),loadAdmins(),loadChart(),typeof loadVersions==='function'?loadVersions():Promise.resolve()]);showLang('java')}catch{sessionStorage.clear()}})();
