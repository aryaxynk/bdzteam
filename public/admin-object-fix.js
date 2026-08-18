(()=>{
  'use strict';
  const safe=(v)=>{
    if(v==null)return '';
    if(v instanceof Error)return v.message||String(v);
    if(typeof v==='string')return v;
    if(typeof v==='object'){
      for(const k of ['error','message','detail','reason','description']){
        if(typeof v[k]==='string'&&v[k].trim())return v[k].trim();
      }
      try{return JSON.stringify(v,null,2)}catch{return 'Dữ liệu phản hồi không đọc được.'}
    }
    return String(v);
  };
  window.BDZFormatError=safe;
  const patch=(proto,name)=>{
    try{
      const d=Object.getOwnPropertyDescriptor(proto,name);
      if(!d?.set||!d?.get||d.set.__bdzSafe)return;
      const setter=function(v){d.set.call(this,typeof v==='object'&&v!==null?safe(v):v)};
      setter.__bdzSafe=true;
      Object.defineProperty(proto,name,{...d,set:setter});
    }catch{}
  };
  patch(Element.prototype,'textContent');
  patch(HTMLElement.prototype,'innerText');
  const nativeAlert=window.alert?.bind(window);
  if(nativeAlert&&!window.alert.__bdzSafe){const a=(v)=>nativeAlert(safe(v));a.__bdzSafe=true;window.alert=a}
  const repair=()=>{
    const root=document.getElementById('tabContent')||document.body;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];let n;while((n=walker.nextNode()))nodes.push(n);
    for(const x of nodes){if(x.nodeValue?.includes('[object Object]'))x.nodeValue=x.nodeValue.replaceAll('[object Object]','Dữ liệu phản hồi API không hợp lệ.')}
  };
  document.addEventListener('DOMContentLoaded',()=>{repair();new MutationObserver(()=>{requestAnimationFrame(repair)}).observe(document.getElementById('tabContent')||document.body,{childList:true,subtree:true,characterData:true})},{once:true});
})();
