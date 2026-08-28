const PUBLIC_BASE = "https://gtraffic.io";

function validUrl(value) {
  try {
    const u = new URL(String(value || "").trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}

async function readBody(response) {
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { text, data };
}

export async function shortenGTraffic(token, destination, env = {}) {
  const apiKey = String(token || "").trim();
  const target = validUrl(destination);
  if (!apiKey) throw new Error("GTraffic API token chưa được cấu hình");
  if (!target) throw new Error("URL cần rút gọn không hợp lệ");

  const runtimeEnv = env && Object.keys(env).length ? env : (typeof process !== "undefined" && process.env ? process.env : {});
  const supabaseUrl = String(runtimeEnv.SUPABASE_URL || "").replace(/\/$/, "");
  const gatewayKey = String(runtimeEnv.SUPABASE_SECRET_KEY || runtimeEnv.SUPABASE_ANON_KEY || "").trim();
  if (!supabaseUrl || !gatewayKey) throw new Error("Thiếu cấu hình Supabase gateway cho GTraffic");

  const proxyUrl = supabaseUrl + "/functions/v1/gtraffic-shortener";
  let response;
  try {
    response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + gatewayKey,
        apikey: gatewayKey,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token: apiKey, url: target }),
      cache: "no-store",
      signal: AbortSignal.timeout(12000)
    });
  } catch (e) {
    throw new Error("Không thể kết nối GTraffic proxy: " + String(e && e.message ? e.message : e));
  }

  const body = await readBody(response);
  const data = body.data || {};
  if (!response.ok || data.ok !== true) {
    const detail = typeof data.error === "string" ? data.error : body.text.replace(/\s+/g, " ").trim().slice(0, 300);
    if (data.blocked === true || data.upstream_status === 403) {
      throw new Error("GTraffic từ chối request (HTTP 403/block). Kiểm tra API token hoặc trạng thái tài khoản GTraffic.");
    }
    throw new Error("GTraffic proxy HTTP " + response.status + (detail ? ": " + detail : ""));
  }

  const shortUrl = validUrl(data.url) || (data.id ? PUBLIC_BASE + "/" + encodeURIComponent(String(data.id).trim()) : "");
  if (!shortUrl) throw new Error("GTraffic response không có liên kết rút gọn hợp lệ");
  return shortUrl;
}
