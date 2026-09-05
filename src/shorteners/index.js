const PROVIDERS = Object.freeze(["vuotlink"]);

export function isShortenerProvider(value) {
  return String(value || "").toLowerCase() === "vuotlink";
}

export function supportedShorteners() {
  return [...PROVIDERS];
}

export async function shortenWithProvider(provider, token, destination, env) {
  if (!isShortenerProvider(provider)) throw new Error("Provider vượt link không hợp lệ");
  const mod = await import("./vuotlink.js");
  return mod.shortenVuotlink(token, destination, env);
}
