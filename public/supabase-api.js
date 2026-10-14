(()=>{
  const c=window.BDZ_CONFIG;
  if(!c?.SUPABASE_URL||!c?.SUPABASE_PUBLISHABLE_KEY) throw new Error('CFG');
  const base=c.SUPABASE_URL.replace(/\/$/,'');
  async function rpc(name,args={}){
    const r=await fetch(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:c.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+c.SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'},body:JSON.stringify(args),cache:'no-store'});
    const x=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(x?.message||x?.error||'ERR');
    return x;
  }
  async function edge(name,body={}){
    const r=await fetch(base+'/functions/v1/'+encodeURIComponent(name),{method:'POST',headers:{apikey:c.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+c.SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
    const x=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(x?.message||x?.error||'ERR');
    return x;
  }
  function visitorId(){let id=localStorage.getItem('bdz_v');if(!id){id=(crypto.randomUUID&&crypto.randomUUID())||String(Date.now());localStorage.setItem('bdz_v',id)}return id}
  // 256-bit browser-held bearer secret; never send it in URLs or store it server-side raw.
  function libraryToken(){
    const key='bdz_key_vault_v1';
    let token;
    try{token=localStorage.getItem(key);}catch(_){throw new Error('KEY_LIBRARY_STORAGE_DISABLED');}
    if(!/^[a-f0-9]{64}$/.test(token||'')){
      if(!window.crypto||typeof window.crypto.getRandomValues!=='function')throw new Error('SECURE_RANDOM_UNAVAILABLE');
      const bytes=new Uint8Array(32);window.crypto.getRandomValues(bytes);
      token=Array.from(bytes,function(b){return b.toString(16).padStart(2,'0')}).join('');
      try{localStorage.setItem(key,token);}catch(_){throw new Error('KEY_LIBRARY_STORAGE_DISABLED');}
    }
    return token;
  }
  window.BDZ={SUPABASE_URL:c.SUPABASE_URL,rpc,edge,visitorId,libraryToken};
})();
