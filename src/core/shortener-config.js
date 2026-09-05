import { setting, saveSetting } from "./supabase.js";

export const PROVIDERS = Object.freeze(["vuotlink"]);
const DEFAULT_API_URL = "https://vuotlink.xyz/api";
const INTERNAL_QUOTA = 100000;

function cleanUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_API_URL;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href.replace(/\/$/, "") : DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
}

export function isShortenerProvider(value) {
  return String(value || "").toLowerCase() === "vuotlink";
}

export function normalizeSlots(_raw, apiUrl = DEFAULT_API_URL, apiToken = "") {
  return {
    1: {
      position: 1,
      provider: "vuotlink",
      api_url: cleanUrl(apiUrl),
      token: String(apiToken || "").trim(),
      quota: INTERNAL_QUOTA,
      enabled: Boolean(String(apiToken || "").trim())
    }
  };
}

export async function getSlots(env) {
  const [apiUrl, apiToken] = await Promise.all([
    setting(env, "shortener_api_url", DEFAULT_API_URL).catch(() => DEFAULT_API_URL),
    setting(env, "shortener_api_token", "").catch(() => "")
  ]);
  return normalizeSlots("", apiUrl, apiToken);
}

export async function saveSlots(env, value) {
  const source = value && (value[1] || value["1"] || value) || {};
  const apiUrl = cleanUrl(source.api_url || source.url || DEFAULT_API_URL);
  const suppliedToken = String(source.token || source.api_token || "").trim();
  const apiToken = suppliedToken || await setting(env, "shortener_api_token", "").catch(() => "");
  await saveSetting(env, "shortener_api_url", apiUrl);
  await saveSetting(env, "shortener_api_token", apiToken);
  return normalizeSlots("", apiUrl, apiToken);
}

export const DEFAULT_ENDPOINT = DEFAULT_API_URL;
