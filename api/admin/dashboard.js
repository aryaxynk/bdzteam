import { requireAdmin, dashboard } from "../../src/admin_api.js";
import { json } from "../../src/db.js";

function toRequest(req) {
  const origin = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host || "localhost"}`;
  return new Request(new URL(req.url || "/api/admin/dashboard", origin), {
    method: "GET",
    headers: new Headers(Object.entries(req.headers || {}).reduce((out, [k, v]) => {
      if (v != null) out[k] = Array.isArray(v) ? v.join(",") : String(v);
      return out;
    }, {}))
  });
}

export default async function handler(req, res) {
  if (String(req.method || "GET").toUpperCase() !== "GET") {
    const r = json({ ok: false, error: "Method Not Allowed. GET /api/admin/dashboard is required." }, 405, { allow: "GET" });
    res.statusCode = r.status;
    r.headers.forEach((v, k) => res.setHeader(k, v));
    return r.arrayBuffer().then(buf => res.end(Buffer.from(buf)));
  }
  try {
    const request = toRequest(req);
    const session = await requireAdmin(request, process.env);
    if (!session) {
      const r = json({ ok: false, error: "Chưa đăng nhập quản trị." }, 401);
      res.statusCode = r.status;
      r.headers.forEach((v, k) => res.setHeader(k, v));
      return r.arrayBuffer().then(buf => res.end(Buffer.from(buf)));
    }
    const data = await dashboard(process.env, session);
    const r = json({ ok: true, ...data });
    res.statusCode = r.status;
    r.headers.forEach((v, k) => res.setHeader(k, v));
    return r.arrayBuffer().then(buf => res.end(Buffer.from(buf)));
  } catch (e) {
    console.error("[admin/dashboard]", e);
    const r = json({ ok: false, error: String(e?.message || e || "Lỗi máy chủ.") }, 500);
    res.statusCode = r.status;
    r.headers.forEach((v, k) => res.setHeader(k, v));
    return r.arrayBuffer().then(buf => res.end(Buffer.from(buf)));
  }
}
