const PROVIDERS = Object.freeze(["link4m", "trafficvn"]);

export function isShortenerProvider(value) {
  return PROVIDERS.includes(String(value || "").toLowerCase());
}

export function supportedShorteners() {
  return [...PROVIDERS];
}

export async function shortenWithProvider(provider, token, destination, env) {
  const name = String(provider || "").toLowerCase();
  if (name === "link4m") {
    const mod = await import("./link4m.js");
    return mod.shortenLink4M(token, destination, env);
  }
  if (name === "trafficvn") {
    const mod = await import("./trafficvn.js");
    return mod.shortenTrafficVN(token, destination, env);
  }
  throw new Error("Provider vượt link không hợp lệ");
}
