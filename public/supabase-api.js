(()=>{
  const c=window.BDZ_CONFIG;
  if(!c?.SUPABASE_URL||!c?.SUPABASE_PUBLISHABLE_KEY) throw new Error('BDZ_CONFIG_MISSING');
  const base=c.SUPABASE_URL.replace(/\/$/,'');
  async function rpc(name,args={}){
    const r=await fetch(`${base}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:c.SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'},body:JSON.stringify(args),cache:'no-store'});
    const x=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(x?.message||x?.error||`RPC_${r.status}`);
    return x;
  }
  async function edge(name,body={}){
    const r=await fetch(`${base}/functions/v1/${encodeURIComponent(name)}`,{method:'POST',headers:{apikey:c.SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
    const x=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(x?.message||x?.error||`EDGE_${r.status}`);
    return x;
  }
  function visitorId(){let id=localStorage.getItem('bdz_visitor');if(!id){id=crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;localStorage.setItem('bdz_visitor',id)}return id}
  window.BDZ={...c,rpc,edge,visitorId};
  if(c.SITE_URL){const harden=document.createElement('script');harden.src=c.SITE_URL.replace(/\/$/,'')+'/security-hardening.js';harden.defer=true;document.head.appendChild(harden)}
})();
