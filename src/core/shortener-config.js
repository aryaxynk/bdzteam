import { setting, saveSetting } from "./supabase.js";

export const PROVIDERS = Object.freeze(["link4m", "trafficvn"]);

export function isShortenerProvider(value) {
  return PROVIDERS.includes(String(value || "").toLowerCase());
}

export function normalizeSlots(raw) {
  let data = {};
  try { data = JSON.parse(raw || "{}"); } catch { data = {}; }
  const result = {};
  for (let position = 1; position <= 2; position += 1) {
    const source = data[position] || data[String(position)] || {};
    const provider = String(source.provider || "").toLowerCase();
    const token = String(source.token || "").trim();
    result[position] = {
      position,
      provider: isShortenerProvider(provider) ? provider : "",
      token,
      quota: Math.max(1, Math.min(100000, parseInt(source.quota || 5, 10) || 5)),
      enabled: isShortenerProvider(provider) && Boolean(token)
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
    const provider = isShortenerProvider(providerValue) ? providerValue : "";
    const token = String(source.token || "").trim();
    data[position] = {
      position,
      provider,
      token,
      quota: Math.max(1, Math.min(100000, parseInt(source.quota || 5, 10) || 5)),
      enabled: Boolean(provider && token)
    };
  }
  await saveSetting(env, "shortener_slots", JSON.stringify(data));
  return data;
}
