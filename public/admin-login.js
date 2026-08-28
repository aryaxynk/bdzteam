(()=>{
'use strict';
const $=id=>document.getElementById(id);
const errorBox=$('error');
const loginForm=$('loginForm');
const authForm=$('authForm');
const loginBtn=$('loginBtn');
const authBtn=$('authBtn');

function message(value,fallback='Đã xảy ra lỗi.'){
  if(value==null)return fallback;
  if(value instanceof Error)return value.message||fallback;
  if(typeof value==='string')return value.trim()||fallback;
  if(typeof value==='object'){
    for(const key of ['error','message','detail','reason','description','msg']){
      const v=value[key];
      if(typeof v==='string'&&v.trim())return v.trim();
    }
    try{return JSON.stringify(value)}catch{return fallback}
  }
  return String(value);
}
function showError(value){
  if(!errorBox)return;
  errorBox.textContent=message(value);
  errorBox.classList.remove('hidden');
}
function clearError(){
  if(!errorBox)return;
  errorBox.textContent='';
  errorBox.classList.add('hidden');
}
async function jsonResponse(response){
  const text=await response.text();
  if(!text.trim())return {ok:false,error:`Máy chủ không trả dữ liệu (HTTP ${response.status}).`};
  try{return JSON.parse(text)}catch{return {ok:false,error:text.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,500)||`Máy chủ không trả JSON (HTTP ${response.status}).`}}
}
async function api(url,options={}){
  const response=await fetch(url,{credentials:'include',cache:'no-store',...options,headers:{accept:'application/json',...(options.body?{'content-type':'application/json'}:{}),...(options.headers||{})}});
  const data=await jsonResponse(response);
  if(!response.ok)throw new Error(message(data,`HTTP ${response.status}`));
  return data;
}

let siteKey='';
let recaptchaPromise=null;
function waitForRecaptcha(){
  if(window.grecaptcha&&siteKey){
    return new Promise(resolve=>window.grecaptcha.ready(resolve));
  }
  if(recaptchaPromise)return recaptchaPromise;
  recaptchaPromise=(async()=>{
    const config=await api('/api/admin/recaptcha-config');
    siteKey=String(config.site_key||'').trim();
    if(!siteKey)throw new Error('RECAPTCHA_SITE_KEY chưa được cấu hình trên Vercel.');
    if(!window.grecaptcha){
      await new Promise((resolve,reject)=>{
        const existing=document.querySelector('script[data-bdz-recaptcha]');
        if(existing){
          existing.addEventListener('load',resolve,{once:true});
          existing.addEventListener('error',()=>reject(new Error('Không thể tải Google reCAPTCHA.')),{once:true});
          return;
        }
        const script=document.createElement('script');
        script.src='https://www.google.com/recaptcha/api.js?render='+encodeURIComponent(siteKey);
        script.async=true;
        script.defer=true;
        script.dataset.bdzRecaptcha='1';
        script.onload=resolve;
        script.onerror=()=>reject(new Error('Không thể tải Google reCAPTCHA.'));
        document.head.appendChild(script);
      });
    }
    if(!window.grecaptcha)throw new Error('Không thể khởi tạo Google reCAPTCHA.');
    await new Promise(resolve=>window.grecaptcha.ready(resolve));
  })().finally(()=>{recaptchaPromise=null});
  return recaptchaPromise;
}

$('togglePassword')?.addEventListener('click',()=>{
  const input=$('password'),icon=$('passwordIcon'),button=$('togglePassword');
  if(!input)return;
  const visible=input.type==='password';
  input.type=visible?'text':'password';
  if(icon)icon.className=visible?'fa-solid fa-eye-slash':'fa-solid fa-eye';
  button?.setAttribute('aria-label',visible?'Ẩn mật khẩu':'Hiện mật khẩu');
});

loginForm?.addEventListener('submit',async event=>{
  event.preventDefault();
  event.stopPropagation();
  clearError();
  if(!loginBtn||loginBtn.disabled)return;
  loginBtn.disabled=true;
  const oldText=loginBtn.textContent||'ĐĂNG NHẬP';
  loginBtn.textContent='ĐANG ĐĂNG NHẬP...';
  try{
    const username=String($('username')?.value||'').trim();
    const password=String($('password')?.value||'');
    if(!username||!password)throw new Error('Vui lòng nhập tài khoản và mật khẩu.');
    await waitForRecaptcha();
    const token=await window.grecaptcha.execute(siteKey,{action:'admin_login'});
    if(!token)throw new Error('Không thể tạo reCAPTCHA token.');
    const data=await api('/api/admin/login',{method:'POST',body:JSON.stringify({username,password,recaptcha_token:token})});
    if(data.requires_auth_code===true){
      loginForm.classList.add('hidden');
      authForm?.classList.remove('hidden');
      $('authCode')?.focus();
      return;
    }
    if(data.ok===true){location.replace('/admin');return;}
    throw new Error(message(data,'Đăng nhập không thành công.'));
  }catch(error){
    showError(error);
  }finally{
    loginBtn.disabled=false;
    loginBtn.textContent=oldText;
  }
});

authForm?.addEventListener('submit',async event=>{
  event.preventDefault();
  event.stopPropagation();
  clearError();
  if(!authBtn||authBtn.disabled)return;
  authBtn.disabled=true;
  const oldText=authBtn.textContent||'XÁC NHẬN MÃ';
  authBtn.textContent='ĐANG XÁC NHẬN...';
  try{
    const code=String($('authCode')?.value||'').trim().toUpperCase();
    const data=await api('/api/admin/auth-code',{method:'POST',body:JSON.stringify({auth_code:code})});
    if(data.ok===true){location.replace('/admin');return;}
    throw new Error(message(data,'Xác thực thất bại.'));
  }catch(error){
    showError(error);
  }finally{
    authBtn.disabled=false;
    authBtn.textContent=oldText;
  }
});

// Preload silently; authentication still waits for readiness at submit time.
waitForRecaptcha().catch(()=>{});
})();
