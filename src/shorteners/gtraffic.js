const ENDPOINT = "https://manager.gtraffic.io/api/cong-khai/tao-lien-ket";
const PUBLIC_BASE = "https://gtraffic.io";
const SUPABASE_FUNCTION = "https://nklukqriopezsoalnghm.supabase.co/functions/v1/gtraffic-shortener";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rbHVrcXJpb3BlenNvYWxuaG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTIwNzEsImV4cCI6MjEwMjUyODA3MX0.vbXNvGYQUjhOygLCbyJ5gZiKVjKm2e41UYshpbg2j3E";

function safeUrl(value) {
  try {
    const u = new URL(String(value || "").trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}

async function parseResponse(response) {
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { text, data };
}

export async function shortenGTraffic(token, destination) {
  const apiKey = String(token || "").trim();
  const target = safeUrl(destination);
  if (!apiKey) throw new Error("GTraffic API token chưa được cấu hình");
  if (!target) throw new Error("URL cần rút gọn không hợp lệ");

  try {
    const proxy = await fetch(SUPABASE_FUNCTION, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        apikey: SUPABASE_ANON_KEY,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token: apiKey, url: target }),
      cache: "no-store"
    });
    const parsed = await parseResponse(proxy);
    if (proxy.ok && parsed.data && parsed.data.ok && safeUrl(parsed.data.url)) {
      return safeUrl(parsed.data.url);
    }
    if (proxy.status >= 400 && proxy.status < 500 && parsed.data && parsed.data.error) {
      throw new Error("GTraffic proxy: " + String(parsed.data.error).slice(0, 300));
    }
  } catch (e) {
    const message = String(e && e.message ? e.message : e);
    if (message.startsWith("GTraffic proxy:")) throw e;
  }

  const requestUrl = new URL(ENDPOINT);
  requestUrl.searchParams.set("apikey", apiKey);
  requestUrl.searchParams.set("url", target);
  const response = await fetch(requestUrl.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0 (compatible; BDZTEAM-GTraffic/1.0)"
    },
    redirect: "follow",
    cache: "no-store"
  });
  const parsed = await parseResponse(response);
  if (!response.ok) {
    const detail = parsed.data && typeof parsed.data.message === "string"
      ? parsed.data.message
      : parsed.data && typeof parsed.data.error === "string"
        ? parsed.data.error
        : parsed.text.replace(/\s+/g, " ").trim().slice(0, 300);
    throw new Error("GTraffic HTTP " + response.status + (detail ? ": " + detail : ""));
  }
  const id = String(parsed.data && parsed.data.id ? parsed.data.id : "").trim();
  if (!id) throw new Error("GTraffic HTTP 200 nhưng response không có id");
  const direct = safeUrl(parsed.data.shortenedUrl || parsed.data.short_url || parsed.data.shortUrl);
  return direct || PUBLIC_BASE + "/" + encodeURIComponent(id);
}
