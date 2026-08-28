import { JSON_HEADERS, json, safeUrl } from "./core/http.js";
import { sb, rpc, setting, saveSetting, ensureProducts } from "./core/supabase.js";
import {
  sha256,
  hmac,
  ipOf,
  cookieHeader,
  signSession,
  verifySession,
  getSession,
  clearAuth,
  securityLog as writeSecurityLog,
  banned as isBanned,
  autoBanned as isAutoBanned,
  isBadUserAgent,
  sameOrigin,
  consumeRateLimit as consumeSecurityRateLimit,
  registerViolation as registerSecurityViolation
} from "./core/security.js";
import {
  PROVIDERS,
  isShortenerProvider,
  normalizeSlots,
  getSlots,
  saveSlots
} from "./core/shortener-config.js";

export { JSON_HEADERS, json, safeUrl };
export { sb, rpc, setting, saveSetting, ensureProducts };
export {
  sha256,
  hmac,
  ipOf,
  cookieHeader,
  signSession,
  verifySession,
  getSession,
  clearAuth,
  isBadUserAgent,
  sameOrigin,
  normalizeSlots,
  getSlots,
  saveSlots,
  PROVIDERS,
  isShortenerProvider
};

export async function securityLog(env, type, ip, detail = "") {
  return writeSecurityLog(sb, env, type, ip, detail);
}

export async function banned(env, ip) {
  return isBanned(sb, env, ip);
}

export async function autoBanned(env, ip) {
  return isAutoBanned(sb, env, ip);
}

export async function consumeRateLimit(env, scope, key, windowSeconds, limit) {
  return consumeSecurityRateLimit(rpc, env, scope, key, windowSeconds, limit);
}

export async function registerViolation(env, ip, type, detail = "") {
  return registerSecurityViolation(rpc, env, ip, type, detail);
}
