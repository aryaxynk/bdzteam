export async function sb(env, path, init = {}) {
  const key = String(env.SUPABASE_SECRET_KEY || "").trim();
  const base = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  if (!key) throw new Error("SUPABASE_SECRET_KEY chưa được cấu hình");
  if (!base) throw new Error("SUPABASE_URL chưa được cấu hình");

  const headers = new Headers(init.headers || {});
  headers.set("apikey", key);
  headers.set("Authorization", "Bearer " + key);
  headers.set("Accept", "application/json");
  if (init.body !== undefined) headers.set("content-type", "application/json");

  const cleanPath = String(path || "").replace(/^\/+/, "");
  const response = await fetch(base + "/rest/v1/" + cleanPath, { ...init, headers });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!response.ok) {
    const message = data && typeof data === "object" && data.message ? ": " + String(data.message) : "";
    throw new Error("Supabase HTTP " + response.status + message);
  }
  return data;
}

export const rpc = (env, name, body = {}) =>
  sb(env, "/rpc/" + String(name), { method: "POST", body: JSON.stringify(body) });

export async function setting(env, key, fallback = "") {
  const result = await sb(env, "settings?select=setting_value&setting_key=eq." + encodeURIComponent(key) + "&limit=1");
  return result && result[0] && result[0].setting_value !== undefined ? result[0].setting_value : fallback;
}

export async function saveSetting(env, key, value) {
  const encodedKey = encodeURIComponent(key);
  const body = JSON.stringify({ setting_key: key, setting_value: String(value == null ? "" : value) });
  const existing = await sb(env, "settings?select=id&setting_key=eq." + encodedKey + "&limit=1").catch(() => []);
  if (Array.isArray(existing) && existing.length) {
    await sb(env, "settings?setting_key=eq." + encodedKey, { method: "PATCH", headers: { Prefer: "return=minimal" }, body });
    return true;
  }
  try {
    await sb(env, "settings", { method: "POST", headers: { Prefer: "return=minimal" }, body });
    return true;
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    if (message.includes("409") || message.includes("duplicate key") || message.includes("settings_setting_key_key")) {
      await sb(env, "settings?setting_key=eq." + encodedKey, { method: "PATCH", headers: { Prefer: "return=minimal" }, body });
      return true;
    }
    throw error;
  }
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
    await sb(env, "products", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(product) }).catch(() => {});
  }
  return sb(env, "products?select=id,name,slug&order=id.desc");
}
