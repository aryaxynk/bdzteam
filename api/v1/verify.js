import { verifyKeyByIp } from '../../src/ip_verify.js';

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
  if (!['GET','POST','OPTIONS'].includes(String(req.method || 'GET').toUpperCase())) {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.end(JSON.stringify({ ok:false, status:'INVALID', code:'METHOD_NOT_ALLOWED', message:'Method Not Allowed.' }));
  }
  if (String(req.method || '').toUpperCase() === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    return res.end();
  }
  try {
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
