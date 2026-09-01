(()=>{'use strict';
const reveal=()=>document.body.classList.remove('dashboard-bootstrap');
const ready=()=>{if(document.querySelector('#panel .dashboard-v3')){reveal();return true}return false};
if(ready()){}else{
  const obs=new MutationObserver(()=>{if(ready())obs.disconnect()});
  obs.observe(document.body,{subtree:true,childList:true});
  window.setTimeout(reveal,8000);
}
})();
