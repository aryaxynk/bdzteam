(()=>{
'use strict';
const safe=(v,seen=new WeakSet())=>{if(v==null)return '';if(v instanceof Error)return v.message||String(v);if(typeof v==='string')return v;if(typeof v==='number'||typeof v==='boolean'||typeof v==='bigint')return String(v);if(typeof v==='object'){if(seen.has(v))return 'Dữ liệu phản hồi bị lặp.';seen.add(v);for(const k of ['message','error','detail','reason','description','msg']){if(v[k]!=null){const s=safe(v[k],seen);if(s&&s!=='[object Object]')return s;}}try{return JSON.stringify(v,null,2)}catch{return 'Dữ liệu phản hồi không đọc được.'}}return String(v)};
window.BDZFormatError=safe;
const patch=(proto,name)=>{try{const d=Object.getOwnPropertyDescriptor(proto,name);if(!d?.set||!d?.get||d.set.__bdzSafe)return;const setter=function(v){d.set.call(this,typeof v==='object'&&v!==null?safe(v):v)};setter.__bdzSafe=true;Object.defineProperty(proto,name,{...d,set:setter})}catch{}};
patch(Element.prototype,'textContent');patch(HTMLElement.prototype,'innerText');
const nativeAlert=window.alert?.bind(window);if(nativeAlert&&!window.alert.__bdzSafe){const a=v=>nativeAlert(safe(v));a.__bdzSafe=true;window.alert=a}
const repair=()=>{const root=document.getElementById('tabContent')||document.body;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];let n;while((n=walker.nextNode()))nodes.push(n);for(const x of nodes)if(x.nodeValue?.includes('[object Object]'))x.nodeValue=x.nodeValue.replaceAll('[object Object]','Dữ liệu phản hồi API không hợp lệ.')};
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repair()})};
document.addEventListener('DOMContentLoaded',()=>{repair();const root=document.getElementById('tabContent');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true})},{once:true});
})();
