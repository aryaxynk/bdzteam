import { requireAdmin, errorMessage } from "../../src/admin_api.js";
import { json } from "../../src/db.js";

export default async function handler(req, res) {
  if (String(req.method || "GET").toUpperCase() !== "GET") {
    const r = json({ ok: false, error: "Method Not Allowed. GET /api/admin/me is required." }, 405, { allow: "GET" });
    res.statusCode = r.status;
    r.headers.forEach((v, k) => res.setHeader(k, v));
    return r.arrayBuffer().then(buf => res.end(Buffer.from(buf)));
  }

  try {
    const request = new Request(`https://${req.headers.host || "localhost"}/api/admin/me`, {
      method: "GET",
      headers: new Headers(Object.entries(req.headers || {}).reduce((out, [k, v]) => {
        if (v != null) out[k] = Array.isArray(v) ? v.join(",") : String(v);
        return out;
      }, {}))
    });
    const session = await requireAdmin(request, process.env);
    if (!session) {
      const r = json({ ok: false, error: "Chưa đăng nhập quản trị." }, 401);
      res.statusCode = r.status;
      r.headers.forEach((v, k) => res.setHeader(k, v));
      return r.arrayBuffer().then(buf => res.end(Buffer.from(buf)));
    }
    const r = json({ ok: true, user: session.u, role: session.r });
    res.statusCode = r.status;
    r.headers.forEach((v, k) => res.setHeader(k, v));
    return r.arrayBuffer().then(buf => res.end(Buffer.from(buf)));
  } catch (e) {
    const r = json({ ok: false, error: errorMessage(e) }, 500);
    res.statusCode = r.status;
    r.headers.forEach((v, k) => res.setHeader(k, v));
    return r.arrayBuffer().then(buf => res.end(Buffer.from(buf)));
  }
}
