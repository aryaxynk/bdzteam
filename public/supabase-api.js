(()=>{
  const c=window.BDZ_CONFIG;
  if(!c?.SUPABASE_URL||!c?.SUPABASE_PUBLISHABLE_KEY) throw new Error('CFG');
  const base=c.SUPABASE_URL.replace(/\/$/,'');
  async function rpc(name,args={}){
    const r=await fetch(`${base}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:c.SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'},body:JSON.stringify(args),cache:'no-store'});
    const x=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(x?.message||x?.error||'ERR');
    return x;
  }
  async function edge(name,body={}){
    const r=await fetch(`${base}/functions/v1/${encodeURIComponent(name)}`,{method:'POST',headers:{apikey:c.SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
    const x=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(x?.message||x?.error||'ERR');
    return x;
  }
  function visitorId(){let id=localStorage.getItem('bdz_v');if(!id){id=crypto.randomUUID?.()||String(Date.now());localStorage.setItem('bdz_v',id)}return id}
  window.BDZ={SUPABASE_URL:c.SUPABASE_URL,rpc,edge,visitorId};
})();
