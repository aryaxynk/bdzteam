(()=>{'use strict';
const check=()=>{const title=document.querySelector('#title'),panel=document.querySelector('#panel');if(!title||!panel||title.textContent.trim()!=='API Key')return;const hasContent=!!panel.querySelector('.panel-head h2, [data-bdz-api-root]');if(panel.dataset.bdzApiV4==='1'&&!hasContent){panel.dataset.bdzApiV4='';panel.appendChild(document.createComment('bdz-api-tab-refresh'))}};
setInterval(check,150);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check,{once:true});else check();
})();
