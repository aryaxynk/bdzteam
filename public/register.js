(()=>{
'use strict';
const $=id=>document.getElementById(id),form=$('registerForm'),btn=$('registerBtn'),error=$('error');
const message=v=>v instanceof Error?v.message:(typeof v==='string'?v:(v?.error||v?.message||v?.detail||'Đã xảy ra lỗi.'));
const showError=v=>{if(!error)return;error.textContent=message(v);error.classList.remove('hidden')};
const clearError=()=>{error?.classList.add('hidden');if(error)error.textContent=''};
$('togglePassword')?.addEventListener('click',()=>{const i=$('password'),ic=$('passwordIcon');if(!i)return;const visible=i.type==='password';i.type=visible?'text':'password';if(ic)ic.className=visible?'fa-solid fa-eye-slash':'fa-solid fa-eye';});
form?.addEventListener('submit',async e=>{e.preventDefault();clearError();if(!btn||btn.disabled)return;const username=String($('username')?.value||'').trim(),password=String($('password')?.value||''),confirm_password=String($('confirmPassword')?.value||''),referral_code=String($('referralCode')?.value||'').trim().toUpperCase();if(!username||!password||!confirm_password||!referral_code)return showError('Vui lòng nhập đầy đủ thông tin.');btn.disabled=true;btn.textContent='Đang đăng ký...';try{const r=await fetch('/api/register-sub-admin',{method:'POST',credentials:'include',cache:'no-store',headers:{accept:'application/json','content-type':'application/json'},body:JSON.stringify({username,password,confirm_password,referral_code})});const text=await r.text();let d={};try{d=text?JSON.parse(text):{}}catch{d={error:text||`HTTP ${r.status}`}}if(!r.ok||d.ok!==true)throw Error(message(d));alert('Đăng ký thành công. Bạn có thể đăng nhập ngay.');location.replace('/login')}catch(err){showError(err)}finally{btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-right-to-bracket"></i> Register'}});
})();
