import { adminAuthCode } from "../../src/admin_api.js";

function toRequest(req) {
  const origin = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host || "localhost"}`;
  const url = new URL(req.url || "/api/admin/auth-code", origin).toString();
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (value != null) headers.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  let body;
  if (!['GET', 'HEAD'].includes(String(req.method || 'GET').toUpperCase())) {
    if (typeof req.body === 'string') body = req.body;
    else if (Buffer.isBuffer(req.body)) body = req.body.toString('utf8');
    else if (req.body !== undefined && req.body !== null) body = JSON.stringify(req.body);
  }
  return new Request(url, { method: req.method || 'GET', headers, body });
}

export default async function handler(req, res) {
  try {
    const response = await adminAuthCode(toRequest(req), process.env);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    return res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('[admin/auth-code]', error);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: 'Lỗi máy chủ. Vui lòng thử lại sau.' }));
  }
}
