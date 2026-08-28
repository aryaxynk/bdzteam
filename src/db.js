export const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, no-cache, must-revalidate, max-age=0"
};

export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extra }
  });

export const ipOf = (request) => {
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
};

export async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

export async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(String(value))
  );

  return new Uint8Array(signature);
}

const b64 = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/i, "");

const unb64 = (value) => {
  const normalized = String(value)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

export const cookieHeader = (name, value, maxAge = 28800) =>
  String(name) +
  "=" +
  String(value) +
  "; Path=/; Max-Age=" +
  String(maxAge) +
  "; HttpOnly; Secure; SameSite=Lax";

export async function signSession(env, payload) {
  const body = b64(new TextEncoder().encode(JSON.stringify(payload)));
  const secret = env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD || "bdz-session";
  const signature = b64(await hmac(secret, body));
  return body + "." + signature;
}

export async function verifySession(env, raw) {
  if (!raw) return null;

  const index = raw.lastIndexOf(".");
  if (index < 1) return null;

  const body = raw.slice(0, index);
  const signature = raw.slice(index + 1);
  const secret = env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD || "bdz-session";
  const wanted = b64(await hmac(secret, body));

  if (signature !== wanted) return null;

  try {
    const decoded = new TextDecoder().decode(unb64(body));
    const data = JSON.parse(decoded);
    return Number(data.exp) > Date.now() ? data : null;
  } catch {
    return null;
  }
}

export async function getSession(request, env, name = "bdz_admin") {
  const cookie = request.headers.get("Cookie") || "";
  const entry = cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(name + "="));

  return verifySession(env, entry ? entry.slice(name.length + 1) : "");
}

export const clearAuth = () => ({
  "set-cookie": [
    "bdz_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
    "bdz_pending=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
  ].join(", ")
});

export async function sb(env, path, init = {}) {
  const key = String(env.SUPABASE_SECRET_KEY || "").trim();
  const base = String(env.SUPABASE_URL || "").replace(/\/$/, "");

  if (!key) throw new Error("SUPABASE_SECRET_KEY chưa được cấu hình");
  if (!base) throw new Error("SUPABASE_URL chưa được cấu hình");

  const headers = new Headers(init.headers || {});
  headers.set("apikey", key);
  headers.set("Authorization", "Bearer " + key);
  headers.set("Accept", "application/json");

  if (init.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  const cleanPath = String(path || "").replace(/^\/+/, "");
  const response = await fetch(base + "/rest/v1/" + cleanPath, {
    ...init,
    headers
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && data.message
        ? ": " + String(data.message)
        : "";
    throw new Error("Supabase HTTP " + response.status + message);
  }

  return data;
}

export const rpc = (env, name, body = {}) =>
  sb(env, "/rpc/" + String(name), {
    method: "POST",
    body: JSON.stringify(body)
  });

export async function setting(env, key, fallback = "") {
  const result = await sb(
    env,
    "settings?select=setting_value&setting_key=eq." +
      encodeURIComponent(key) +
      "&limit=1"
  );

  return result && result[0] && result[0].setting_value !== undefined
    ? result[0].setting_value
    : fallback;
}

export async function saveSetting(env, key, value) {
  const encodedKey = encodeURIComponent(key);
  const body = JSON.stringify({
    setting_key: key,
    setting_value: String(value == null ? "" : value)
  });

  const existing = await sb(
    env,
    "settings?select=id&setting_key=eq." + encodedKey + "&limit=1"
  ).catch(() => []);

  if (Array.isArray(existing) && existing.length) {
    await sb(env, "settings?setting_key=eq." + encodedKey, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body
    });
    return true;
  }

  try {
    await sb(env, "settings", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body
    });
    return true;
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    if (
      message.includes("409") ||
      message.includes("duplicate key") ||
      message.includes("settings_setting_key_key")
    ) {
      await sb(env, "settings?setting_key=eq." + encodedKey, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body
      });
      return true;
    }
    throw error;
  }
}

const PROVIDERS = ["link4m", "trafficvn", "gtraffic"];

export function normalizeSlots(raw) {
  let data = {};
  try {
    data = JSON.parse(raw || "{}");
  } catch {
    data = {};
  }

  const result = {};
  for (let position = 1; position <= 2; position += 1) {
    const source = data[position] || data[String(position)] || {};
    const provider = String(source.provider || "").toLowerCase();
    const token = String(source.token || "").trim();

    result[position] = {
      position,
      provider: PROVIDERS.includes(provider) ? provider : "",
      token,
      quota: Math.max(
        1,
        Math.min(100000, parseInt(source.quota || 5, 10) || 5)
      ),
      enabled: PROVIDERS.includes(provider) && Boolean(token)
    };
  }

  return result;
}

export async function getSlots(env) {
  return normalizeSlots(await setting(env, "shortener_slots", "{}"));
}

export async function saveSlots(env, value) {
  const data = {};

  for (let position = 1; position <= 2; position += 1) {
    const source = value && (value[position] || value[String(position)]) || {};
    const providerValue = String(source.provider || "").toLowerCase();
    const provider = PROVIDERS.includes(providerValue) ? providerValue : "";
    const token = String(source.token || "").trim();

    data[position] = {
      position,
      provider,
      token,
      quota: Math.max(
        1,
        Math.min(100000, parseInt(source.quota || 5, 10) || 5)
      ),
      enabled: Boolean(provider && token)
    };
  }

  await saveSetting(env, "shortener_slots", JSON.stringify(data));
  return data;
}

export async function ensureProducts(env) {
  let rows = await sb(env, "products?select=id,name,slug&order=id.desc");
  if (rows && rows.length) return rows;

  const defaults = [
    { name: "Free Fire VIP Menu 24H", slug: "free-fire-vip-24h" },
    { name: "Pubg Mobile Pro", slug: "pubg-mobile-pro" },
    { name: "Mobile Legends Elite", slug: "ml-elite" }
  ];

  for (const product of defaults) {
    await sb(env, "products", {
      method: "POST",
      headers: {
        Prefer: "resolution=ignore-duplicates,return=minimal"
      },
      body: JSON.stringify(product)
    }).catch(() => {});
  }

  rows = await sb(env, "products?select=id,name,slug&order=id.desc");
  return rows;
}

export async function securityLog(env, type, ip, detail = "") {
  return sb(env, "security_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      event_type: type,
      ip_address: ip,
      detail: String(detail).slice(0, 1000)
    })
  }).catch(() => {});
}

export async function banned(env, ip) {
  const rows = await sb(
    env,
    "manual_bans?select=id&ip_address=eq." + encodeURIComponent(ip) + "&limit=1"
  ).catch(() => []);
  return Array.isArray(rows) && rows.length > 0;
}

export async function autoBanned(env, ip) {
  const rows = await sb(
    env,
    "auto_bans?select=banned_until&ip_address=eq." +
      encodeURIComponent(ip) +
      "&banned_until.gt." +
      encodeURIComponent(new Date().toISOString()) +
      "&limit=1"
  ).catch(() => []);
  return Array.isArray(rows) && rows.length > 0;
}

export function isBadUserAgent(request) {
  const ua = String(request.headers.get("user-agent") || "").toLowerCase();
  if (!ua) return true;

  const blocked = [
    "curl/",
    "wget/",
    "python-requests",
    "python-urllib",
    "scrapy",
    "libwww-perl",
    "httpclient",
    "go-http-client"
  ];

  return blocked.some((item) => ua.includes(item));
}

export function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function consumeRateLimit(env, scope, key, windowSeconds, limit) {
  const bucketStart = new Date(
    Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds * 1000
  ).toISOString();

  try {
    const result = await rpc(env, "consume_rate_limit", {
      p_scope: scope,
      p_key: String(key),
      p_bucket_start: bucketStart,
      p_limit: limit
    });

    const row = Array.isArray(result) ? result[0] : result;
    const value = Number(
      row && typeof row === "object" && row.consume_rate_limit !== undefined
        ? row.consume_rate_limit
        : row || 0
    );

    return value <= limit;
  } catch {
    return true;
  }
}

export async function registerViolation(env, ip, type, detail = "") {
  try {
    await rpc(env, "register_violation", {
      p_ip_address: ip,
      p_event_type: type,
      p_detail: String(detail).slice(0, 500)
    });
  } catch {}
}

export function safeUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}
