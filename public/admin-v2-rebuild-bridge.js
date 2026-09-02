(()=>{'use strict';
// Compatibility bridge for the rebuilt implementation. The visual DOM/CSS remain the established admin UI.
const nativeQSA=Document.prototype.querySelectorAll;
Document.prototype.querySelectorAll=function(selector){
  if(selector==='#panel [data-key-scope]') return nativeQSA.call(this,'#panel [data-key-group]');
  return nativeQSA.call(this,selector);
};
// Keep key creation on the Key Manager screen even when the legacy UI handler reloads the page.
document.addEventListener('click',e=>{const b=e.target.closest?.('#createKey');if(b)sessionStorage.setItem('bdz_return_keys','1')},true);
function restoreKeysTab(){
  if(sessionStorage.getItem('bdz_return_keys')!=='1') return;
  sessionStorage.removeItem('bdz_return_keys');
  const run=()=>document.querySelector('[data-tab="keys"]')?.click();
  if(document.readyState==='complete') setTimeout(run,0); else window.addEventListener('load',()=>setTimeout(run,0),{once:true});
}
restoreKeysTab();
})();