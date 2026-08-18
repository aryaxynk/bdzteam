import { adminLogin } from "../../src/admin_api.js";

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: String(message || "Yêu cầu không hợp lệ.") }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0"
    }
  });
}

function toRequest(req) {
  const origin = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host || "localhost"}`;
  const url = new URL(req.url || "/api/admin/login", origin).toString();
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
  if (String(req.method || "GET").toUpperCase() !== "POST") {
    const r = jsonError("Method Not Allowed. POST /api/admin/login is required.", 405);
    r.headers.set("allow", "POST");
    res.statusCode = r.status;
    r.headers.forEach((v, k) => res.setHeader(k, v));
    return r.arrayBuffer().then(buf => res.end(Buffer.from(buf)));
  }

  try {
    const request = toRequest(req);
    const response = await adminLogin(request, process.env);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const body = await response.arrayBuffer();
    return res.end(Buffer.from(body));
  } catch (error) {
    console.error("[admin/login]", error);
    const r = jsonError("Lỗi máy chủ. Vui lòng thử lại sau.", 500);
    res.statusCode = r.status;
    r.headers.forEach((v, k) => res.setHeader(k, v));
    const body = await r.arrayBuffer();
    return res.end(Buffer.from(body));
  }
}
