(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tok=()=>sessionStorage.getItem('bdz_t')||'';
let bans=[];

function injectBanTab(){
  const nav=$('navTabs'); if(!nav) return;
  if([...nav.querySelectorAll('.tab')].some(t=>t.dataset.p==='bans')) return;
  const b=document.createElement('button');
  b.className='tab'; b.dataset.p='bans'; b.textContent='Ban';
  b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.p==='bans'));document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='pg-bans'));};
  const setBtn=[...nav.querySelectorAll('.tab')].find(t=>t.dataset.p==='settings');
  if(setBtn) nav.insertBefore(b,setBtn); else nav.appendChild(b);
  if(!$('pg-bans')){
    const sec=document.createElement('section');
    sec.id='pg-bans'; sec.className='view';
    sec.innerHTML='<div class="card"><div class="section-head"><div><h2>Ban / Unban</h2><p class="hint">Spam get-key &gt;3 lần/30s → ban 1 ngày</p></div><button id="btnBan" class="btn primary">+ Ban</button></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Lý do</th><th>Đến</th><th>TT</th><th>Note</th><th></th></tr></thead><tbody id="banRows"></tbody></table></div></div>';
    $('pages').appendChild(sec);
    $('btnBan').onclick=modalBan;
  }
}
function injectMaint(){
  if($('setMaint')) return;
  const grid=document.querySelector('#pg-settings .grid2');
  if(!grid) return;
  const d=document.createElement('div'); d.className='field';
  d.innerHTML='<label>Bảo trì web (chặn get key)</label><select id="setMaint" class="select"><option value="false">Tắt</option><option value="true">Bật</option></select>';
  grid.appendChild(d);
  const hint=document.createElement('p'); hint.className='hint';
  hint.textContent='Bảo trì chỉ chặn trang nhận key. API check-key app vẫn chạy.';
  grid.parentElement.insertBefore(hint,$('saveSet'));
}
async function loadBans(){
  try{const x=await BDZ.rpc('bdz_admin_bans',{p_token:tok(),p_action:'list'});
    if(!x?.ok){if($('banRows'))$('banRows').innerHTML='<tr><td colspan="6">—</td></tr>';return}
    bans=x.bans||[];renderBans()}catch(e){}
}
function renderBans(){
  if(!$('banRows'))return;
  $('banRows').innerHTML=(bans||[]).map(b=>'<tr><td>'+b.id+'</td><td>'+esc(b.reason||'')+'</td><td style="font-size:12px">'+(b.banned_until?new Date(b.banned_until).toLocaleString('vi-VN'):'—')+'</td><td><span class="tag '+(b.active?'off':'on')+'">'+(b.active?'BAN':'OFF')+'</span></td><td style="font-size:12px">'+esc(b.note||'')+'</td><td>'+(b.active?'<button class="btn sm" data-unban="'+b.id+'">Unban</button>':'—')+'</td></tr>').join('')||'<tr><td colspan="6" style="color:var(--muted)">Không có ban</td></tr>';
  $('banRows').querySelectorAll('[data-unban]').forEach(btn=>btn.onclick=async()=>{
    if(!confirm('Unban #'+btn.dataset.unban+'?'))return;
    try{const x=await BDZ.rpc('bdz_admin_bans',{p_token:tok(),p_action:'unban',p_payload:{id:+btn.dataset.unban}});if(!x?.ok)throw Error(x?.error||'Lỗi');loadBans()}catch(e){alert(e.message)}});
}
function modalBan(){
  const root=$('modalRoot');
  root.innerHTML='<div class="modal-bg"><div class="modal"><h3>Ban visitor / IP</h3><div class="field"><label>Visitor ID</label><input id="bVis" class="input"></div><div class="field"><label>IP / fingerprint</label><input id="bIp" class="input"></div><div class="field"><label>Lý do</label><input id="bReason" class="input" value="manual"></div><div class="field"><label>Giờ ban</label><input id="bHours" class="input" type="number" value="24" min="1"></div><div class="field"><label>Ghi chú</label><input id="bNote" class="input"></div><div class="modal-actions"><button class="btn" id="mCancel">Hủy</button><button class="btn primary" id="mOk">Ban</button></div></div></div>';
  $('mCancel').onclick=()=>root.innerHTML='';
  $('mOk').onclick=async()=>{try{
    const hours=+$('bHours').value||24;
    const until=new Date(Date.now()+hours*3600*1000).toISOString();
    const x=await BDZ.rpc('bdz_admin_bans',{p_token:tok(),p_action:'ban',p_payload:{visitor_id:$('bVis').value.trim(),ip:$('bIp').value.trim(),reason:$('bReason').value.trim()||'manual',banned_until:until,note:$('bNote').value.trim()}});
    if(!x?.ok)throw Error(x?.error||'Lỗi');root.innerHTML='';loadBans()}catch(e){alert(e.message)}};
}
const FULL={
java:`import okhttp3.*;
import org.json.JSONObject;
import java.util.concurrent.TimeUnit;
public class KeyApi {
  static final String BASE="https://nklukqriopezsoalnghm.supabase.co";
  static final String API_KEY="sb_publishable_RUE5iV8GqoVCFxjVt5ZBpg_FlTC1v-0";
  public static boolean checkKey(String key,String deviceId) throws Exception {
    OkHttpClient c=new OkHttpClient.Builder().connectTimeout(10,TimeUnit.SECONDS).readTimeout(15,TimeUnit.SECONDS).build();
    JSONObject body=new JSONObject(); body.put("key",key); body.put("device_id",deviceId); body.put("app_version","V1");
    Request req=new Request.Builder().url(BASE+"/functions/v1/check-key")
      .addHeader("Content-Type","application/json").addHeader("apikey",API_KEY)
      .post(RequestBody.create(body.toString(),MediaType.parse("application/json"))).build();
    try(Response res=c.newCall(req).execute()){
      String s=res.body()!=null?res.body().string():"";
      JSONObject j=new JSONObject(s);
      return j.optBoolean("ok",false)&&j.optBoolean("key_valid",false);
    }
  }
}`,
python:`import requests
BASE="https://nklukqriopezsoalnghm.supabase.co"
API_KEY="sb_publishable_RUE5iV8GqoVCFxjVt5ZBpg_FlTC1v-0"
def check_key(key, device_id):
    r=requests.post(f"{BASE}/functions/v1/check-key",
      headers={"Content-Type":"application/json","apikey":API_KEY},
      json={"key":key,"device_id":device_id,"app_version":"V1"}, timeout=15)
    d=r.json(); return bool(d.get("ok") and d.get("key_valid"))
`,
cpp:`// Full C++ libcurl: xem api.html`,
c:`/* Full C libcurl: xem api.html */`
};
function patchSamples(){
  document.querySelectorAll('.tab-lang').forEach(b=>{
    b.onclick=()=>{document.querySelectorAll('.tab-lang').forEach(x=>x.classList.toggle('active',x.dataset.lang===b.dataset.lang));
      const el=$('apiSample'); if(el) el.textContent=FULL[b.dataset.lang]||'';};
  });
  if($('apiSample')) $('apiSample').textContent=FULL.java;
  if($('apiSpec')) $('apiSpec').textContent=`POST https://nklukqriopezsoalnghm.supabase.co/functions/v1/check-key\n\nHeaders:\n  Content-Type: application/json\n  apikey: sb_publishable_...\n\nBody: {key, device_id, app_version}\nOK: key_valid true | FAIL: Key không hợp lệ.`;
}
(async()=>{
  for(let i=0;i<50;i++){ if($('navTabs')&&$('pg-settings')) break; await new Promise(r=>setTimeout(r,100)); }
  injectBanTab(); injectMaint();
  const save=$('saveSet');
  if(save) save.onclick=async()=>{
    try{
      const payload={default_duration_hours:+$('setDur').value,default_max_devices:+$('setDev').value,default_max_checks:0,get_key_limit_per_visitor:+$('setLim').value,bind_ip_on_activate:$('setIp').value==='true',bind_device_on_activate:$('setBind').value==='true',maintenance_mode:($('setMaint')?$('setMaint').value==='true':false)};
      const x=await BDZ.rpc('bdz_admin_settings',{p_token:tok(),p_action:'update',p_payload:payload});
      if(!x?.ok) throw Error(x?.error||'Lỗi');
      $('saveMsg').textContent='Đã lưu';
    }catch(e){$('saveMsg').textContent=e.message}
  };
  try{const x=await BDZ.rpc('bdz_admin_settings',{p_token:tok(),p_action:'get'});
    if(x?.ok&&x.settings&&$('setMaint')) $('setMaint').value=String(x.settings.maintenance_mode??false);
  }catch(e){}
  if(tok()) loadBans();
  patchSamples();
})();

async function enhanceKeyLabels(){
  if(!tok()||!$('keyRows')) return;
  try{
    const x=await BDZ.rpc('bdz_admin_keys',{p_token:tok()});
    if(!x?.ok||!Array.isArray(x.keys)) return;
    const map={};
    x.keys.forEach(k=>{map[k.id]=k});
    $('keyRows').querySelectorAll('tr').forEach(tr=>{
      const cb=tr.querySelector('.kchk');
      if(!cb) return;
      const k=map[+cb.value];
      if(!k) return;
      const mono=tr.querySelector('.mono');
      if(mono&&k.created_by_name&&!mono.parentElement.querySelector('[data-admin-badge]')){
        const sp=document.createElement('span');
        sp.className='tag';
        sp.dataset.adminBadge='1';
        sp.setAttribute('style','margin-left:6px;font-size:10px;opacity:.9');
        sp.title='Admin tạo';
        sp.textContent='Admin: '+k.created_by_name;
        mono.parentElement.appendChild(sp);
      }
      if(k.devices_used!=null){
        const tds=tr.querySelectorAll('td');
        if(tds.length>=4){
          tds[3].textContent=(k.devices_used)+'/'+(k.max_devices||1);
        }
      }
    });
  }catch(e){}
}
setInterval(enhanceKeyLabels,1200);
})();
