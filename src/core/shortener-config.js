import { setting } from "./supabase.js";

// The web now uses one fixed shortener. These exports remain as compatibility
// helpers for older admin routes, but provider selection and slot rotation are gone.
export const PROVIDERS = Object.freeze(["vuotlink"]);

export function isShortenerProvider(value) {
  return String(value || "").toLowerCase() === "vuotlink";
}

export function normalizeSlots(raw) {
  return {
    1: {
      position: 1,
      provider: "vuotlink",
      token: "",
      quota: 0,
      enabled: true
    }
  };
}

export async function getSlots(env) {
  return normalizeSlots(await setting(env, "shortener_slots", "{}"));
}

export async function saveSlots(_env, _value) {
  return normalizeSlots("{}");
}
