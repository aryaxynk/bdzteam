export async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function hmac(secret, value) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(secret)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(value)));
  return new Uint8Array(signature);
}

const b64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/i, "");
const unb64 = (value) => {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

export function ipOf(request) {
  const real = request.headers.get("X-Real-IP");
  if (real) return real.trim();
  const forwarded = request.headers.get("X-Forwarded-For");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  const standard = request.headers.get("Forwarded");
  if (standard) {
    const match = standard.match(/for=([^;]+)/i);
    if (match && match[1]) return match[1].replace(/^"|"$/g, "");
  }
  return "0.0.0.0";
}

export const cookieHeader = (name, value, maxAge = 28800) =>
  String(name) + "=" + String(value) + "; Path=/; Max-Age=" + String(maxAge) + "; HttpOnly; Secure; SameSite=Lax";

export async function signSession(env, payload) {
  const body = b64(new TextEncoder().encode(JSON.stringify(payload)));
  const secret = env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD || "bdz-session";
  return body + "." + b64(await hmac(secret, body));
}

export async function verifySession(env, raw) {
  if (!raw) return null;
  const index = raw.lastIndexOf(".");
  if (index < 1) return null;
  const body = raw.slice(0, index);
  const signature = raw.slice(index + 1);
  const secret = env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD || "bdz-session";
  if (signature !== b64(await hmac(secret, body))) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(unb64(body)));
    return Number(data.exp) > Date.now() ? data : null;
  } catch {
    return null;
  }
}

export async function getSession(request, env, name = "bdz_admin") {
  const cookie = request.headers.get("Cookie") || "";
  const entry = cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(name + "="));
  return verifySession(env, entry ? entry.slice(name.length + 1) : "");
}

export const clearAuth = () => ({
  "set-cookie": [
    "bdz_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
    "bdz_pending=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
  ].join(", ")
});

export async function securityLog(sb, env, type, ip, detail = "") {
  return sb(env, "security_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ event_type: type, ip_address: ip, detail: String(detail).slice(0, 1000) })
  }).catch(() => {});
}

export async function banned(sb, env, ip) {
  const rows = await sb(env, "manual_bans?select=id&ip_address=eq." + encodeURIComponent(ip) + "&limit=1").catch(() => []);
  return Array.isArray(rows) && rows.length > 0;
}

export async function autoBanned(sb, env, ip) {
  const rows = await sb(env, "auto_bans?select=banned_until&ip_address=eq." + encodeURIComponent(ip) + "&banned_until.gt." + encodeURIComponent(new Date().toISOString()) + "&limit=1").catch(() => []);
  return Array.isArray(rows) && rows.length > 0;
}

export function isBadUserAgent(request) {
  const ua = String(request.headers.get("user-agent") || "").toLowerCase();
  if (!ua) return true;
  return ["curl/", "wget/", "python-requests", "python-urllib", "scrapy", "libwww-perl", "httpclient", "go-http-client"].some((item) => ua.includes(item));
}

export function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

export async function consumeRateLimit(rpc, env, scope, key, windowSeconds, limit) {
  const bucketStart = new Date(Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds * 1000).toISOString();
  try {
    const result = await rpc(env, "consume_rate_limit", { p_scope: scope, p_key: String(key), p_bucket_start: bucketStart, p_limit: limit });
    const row = Array.isArray(result) ? result[0] : result;
    const value = Number(row && typeof row === "object" && row.consume_rate_limit !== undefined ? row.consume_rate_limit : row || 0);
    return value <= limit;
  } catch { return true; }
}

export async function registerViolation(rpc, env, ip, type, detail = "") {
  try { await rpc(env, "register_violation", { p_ip_address: ip, p_event_type: type, p_detail: String(detail).slice(0, 500) }); } catch {}
}
