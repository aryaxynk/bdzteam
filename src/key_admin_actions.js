import { json, sb } from './db.js';

const int = (v, min, max, fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
};
const keyCode = (v) => {
  const raw = String(v || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return raw || `BDZ-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
};

export async function handleKeyAdminAction(request, env, session) {
  const b = await request.json().catch(() => ({}));
  const raw = String(b.action || '').trim().toLowerCase();
  const aliases = {
    create_admin_key: 'create_key',
    create_admin_key_with_limit: 'create_key',
    create_key_with_limit: 'create_key',
    create_get_key: 'create_key',
    update_expiry: 'set_key_expiry',
    update_key_expiry: 'set_key_expiry',
    set_expiry: 'set_key_expiry',
    extend_expiry: 'extend_key',
    reduce_expiry: 'reduce_key',
    revoke_key: 'lock_key',
    restore_key: 'unlock_key',
    delete: 'delete_key'
  };
  const action = aliases[raw] || raw;
  if (!['create_key','set_key_expiry','extend_key','reduce_key','toggle_key','lock_key','unlock_key','delete_key'].includes(action)) return null;
  if (session?.r !== 'main') return json({ok:false,error:'Bạn không có quyền quản lý Key.'},403);
  try {
    if (action === 'create_key') {
      const requestedScope = String(b.key_scope || (raw === 'create_get_key' ? 'GET' : 'ADMIN')).trim().toUpperCase();
      const key_scope = requestedScope === 'GET' ? 'GET' : 'ADMIN';
      const productId = int(b.product_id,1,Number.MAX_SAFE_INTEGER,0);
      const hours = int(b.duration_hours,1,720,10);
      const maxDevices = key_scope === 'ADMIN' ? int(b.max_devices,1,1000,1) : 0;
      if (!productId) return json({ok:false,error:'Vui lòng chọn sản phẩm hợp lệ.'},400);
      const product = (await sb(env,`products?id=eq.${productId}&select=id,name,slug&limit=1`).catch(()=>[]))?.[0];
      if (!product) return json({ok:false,error:'Không tìm thấy sản phẩm.'},404);
      const code = keyCode(b.key_code);
      const exists = await sb(env,`keys?select=id&key_code=eq.${encodeURIComponent(code)}&limit=1`).catch(()=>[]);
      if (exists?.length) return json({ok:false,error:'Key đã tồn tại.'},409);
      const payload={key_code:code,product_id:productId,duration_hours:hours,status:'ACTIVE',expires_at:new Date(Date.now()+hours*3600000).toISOString(),key_scope,max_devices:maxDevices,claimed_ip:null,claimed_at:null,activated_at:null,activated_ip:null,device_id_hash:null,activated_device_id_hash:null,api_used_at:null};
      const created=await sb(env,'keys',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
      const row=Array.isArray(created)?created[0]:created;
      if (!row?.id) return json({ok:false,error:'Không thể tạo Key.'},500);
      return json({ok:true,key_id:row.id,key_code:row.key_code||code,key_scope,product,max_devices:maxDevices,expires_at:row.expires_at||payload.expires_at});
    }
    const id=int(b.key_id,1,Number.MAX_SAFE_INTEGER,0);
    if (!id) return json({ok:false,error:'Key không hợp lệ.'},400);
    const row=(await sb(env,`keys?select=id,status,expires_at&id=eq.${id}&limit=1`).catch(()=>[]))?.[0];
    if (!row) return json({ok:false,error:'Không tìm thấy Key.'},404);
    if (action==='toggle_key'||action==='lock_key'||action==='unlock_key') {
      const next=action==='lock_key'?'REVOKED':action==='unlock_key'?'ACTIVE':row.status==='REVOKED'?'ACTIVE':'REVOKED';
      await sb(env,`keys?id=eq.${id}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:next})});
      return json({ok:true,status:next});
    }
    if (action==='delete_key') {
      await sb(env,`key_device_bindings?key_id=eq.${id}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
      await sb(env,`keys?id=eq.${id}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
      return json({ok:true});
    }
    if (action==='set_key_expiry') {
      const value=String(b.expires_at||'').trim(),parsed=new Date(value);
      if (!value||Number.isNaN(parsed.getTime())||parsed.getTime()<=Date.now()) return json({ok:false,error:'Thời gian hết hạn không hợp lệ.'},400);
      await sb(env,`keys?id=eq.${id}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({expires_at:parsed.toISOString(),status:'ACTIVE'})});
      return json({ok:true,expires_at:parsed.toISOString()});
    }
    const hours=int(b.add_hours??b.sub_hours,1,720,action==='extend_key'?24:1);
    const current=row.expires_at?new Date(row.expires_at).getTime():Date.now();
    const next=action==='extend_key'?new Date(Math.max(Date.now(),current)+hours*3600000):new Date(current-hours*3600000);
    if (next.getTime()<=Date.now()) return json({ok:false,error:'Thời gian hết hạn phải lớn hơn hiện tại.'},400);
    await sb(env,`keys?id=eq.${id}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({expires_at:next.toISOString(),status:'ACTIVE'})});
    return json({ok:true,expires_at:next.toISOString()});
  } catch(e) {
    console.error('key_admin_action',e);
    return json({ok:false,error:'Không thể thực hiện Action Key.'},500);
  }
}
