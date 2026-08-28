import { verifyKeyByIp } from '../../src/ip_verify.js';
import { setting, json } from '../../src/db.js';

function toRequest(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = String(req.headers.host || 'localhost');
  const url = `${proto}://${host}${req.url || '/api/v1/verify'}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (v != null) headers.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  let body;
  if (!['GET','HEAD'].includes(String(req.method || 'GET').toUpperCase())) {
    body = typeof req.body === 'string' ? req.body : req.body === undefined ? undefined : JSON.stringify(req.body);
  }
  return new Request(url, { method: req.method || 'GET', headers, body });
}

export default async function handler(req, res) {
  const method = String(req.method || 'GET').toUpperCase();
  if (!['GET','POST','OPTIONS'].includes(method)) {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.end(JSON.stringify({ ok:false, status:'INVALID', code:'METHOD_NOT_ALLOWED', message:'Method Not Allowed.' }));
  }
  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    return res.end();
  }
  try {
    if ((await setting(process.env,'maintenance_enabled','false')) === 'true') {
      const message = await setting(process.env,'maintenance_message','Website đang bảo trì. Vui lòng quay lại sau.');
      const r = json({ ok:false, status:'MAINTENANCE', code:'SITE_MAINTENANCE', message }, 503, {'cache-control':'no-store'});
      res.statusCode=r.status;r.headers.forEach((v,k)=>res.setHeader(k,v));return res.end(Buffer.from(await r.arrayBuffer()));
    }
    const r = await verifyKeyByIp(toRequest(req), process.env);
    res.statusCode = r.status;
    r.headers.forEach((v,k)=>res.setHeader(k,v));
    const body = Buffer.from(await r.arrayBuffer());
    return res.end(body);
  } catch (e) {
    console.error('[api/v1/verify]', e);
    res.statusCode = 500;
    res.setHeader('Content-Type','application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok:false, status:'SERVER_ERROR', code:'VERIFY_UNAVAILABLE', message:'Hệ thống xác minh Key đang tạm thời không khả dụng.' }));
  }
}
