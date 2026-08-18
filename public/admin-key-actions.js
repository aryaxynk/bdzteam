(()=>{
  'use strict';
  const text=(v)=>{
    if(v==null)return '';
    if(v instanceof Error)return v.message||String(v);
    if(typeof v==='string')return v;
    if(typeof v==='object')return String(v.error||v.message||v.detail||v.reason||JSON.stringify(v));
    return String(v);
  };
  const json=async(r)=>{const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch{d={error:raw.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()||`HTTP ${r.status}`}}return {ok:r.ok,status:r.status,data:d}};
  const call=async(payload)=>{const r=await fetch('/api/admin/action',{method:'POST',credentials:'include',headers:{accept:'application/json','content-type':'application/json'},body:JSON.stringify(payload)});const x=await json(r);if(!x.ok||x.data?.ok===false)throw new Error(text(x.data)||`Yêu cầu thất bại (HTTP ${x.status})`);return x.data};
  const flash=(msg,bad=false)=>{const el=document.getElementById('flash');if(!el)return;el.className=`mb-4 p-3 rounded-[10px] border-2 font-extrabold text-xs ${bad?'bg-[#FFE3E3] border-[#C81E1E] text-[#C81E1E]':'bg-[#E3FCEF] border-[#0EA76A] text-[#087A50]'}`;el.textContent=text(msg)||'Đã hoàn tất.';el.classList.remove('hidden');clearTimeout(el._bdzT);el._bdzT=setTimeout(()=>el.classList.add('hidden'),3000)};
  const wait=(b,on)=>{if(!b)return;const old=b.innerHTML;b.disabled=true;b.dataset.old=old;b.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> ĐANG XỬ LÝ...';on?.(old)};
  document.addEventListener('click',async(e)=>{
    const btn=e.target.closest('#createKey,[data-act="delete_key"],[data-act="toggle_key"],[data-act="extend_key"],[data-act="reduce_key"]');
    if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(btn.dataset.bdzBusy==='1')return;btn.dataset.bdzBusy='1';
    try{
      let payload=null;
      if(btn.id==='createKey')payload={action:'create_key',product_id:Number(document.getElementById('kProduct')?.value),duration_hours:Number(document.getElementById('kHours')?.value),key_code:String(document.getElementById('kCode')?.value||'').trim()};
      else{const id=Number(btn.dataset.id);if(!Number.isSafeInteger(id)||id<1)throw new Error('Key ID không hợp lệ.');const a=btn.dataset.act;payload={action:a,key_id:id};if(a==='extend_key')payload.add_hours=24;if(a==='reduce_key')payload.sub_hours=1;}
      wait(btn);
      const d=await call(payload);
      if(btn.id==='createKey'){flash(`Đã tạo Key: ${text(d.key_code)||'thành công'}`)}
      else if(payload.action==='delete_key')flash('Đã xóa Key thành công.');
      else if(payload.action==='toggle_key')flash('Đã cập nhật trạng thái Key.');
      else if(payload.action==='extend_key')flash('Đã cộng thêm 24 giờ.');
      else if(payload.action==='reduce_key')flash('Đã trừ 1 giờ.');
      setTimeout(()=>location.reload(),350);
    }catch(err){flash(text(err)||'Thao tác thất bại.',true);btn.disabled=false;btn.innerHTML=btn.dataset.old||btn.innerHTML}
    finally{delete btn.dataset.bdzBusy}
  },true);
})();
