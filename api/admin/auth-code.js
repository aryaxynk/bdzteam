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

function writeResponse(response, res) {
  res.statusCode = response.status;

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') return;
    res.setHeader(key, value);
  });

  // Vercel/Node must receive Set-Cookie as an array. The previous code
  // forwarded two cookies as one comma-joined header, which could cause the
  // browser to discard the authenticated bdz_admin cookie. For the final
  // auth-code step we only need to issue the new bdz_admin session; the
  // short-lived bdz_pending cookie can simply expire naturally.
  const rawSetCookie = response.headers.get('set-cookie');
  if (rawSetCookie) {
    const cookies = rawSetCookie
      .split(/,\s*(?=[A-Za-z0-9_-]+=)/g)
      .map(v => v.trim())
      .filter(Boolean);
    const adminCookie = cookies.find(v => v.startsWith('bdz_admin='));
    if (adminCookie) res.setHeader('set-cookie', [adminCookie]);
  }
}

export default async function handler(req, res) {
  try {
    const response = await adminAuthCode(toRequest(req), process.env);
    writeResponse(response, res);
    return res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('[admin/auth-code]', error);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
    return res.end(JSON.stringify({ ok: false, error: 'Lỗi máy chủ. Vui lòng thử lại sau.' }));
  }
}
