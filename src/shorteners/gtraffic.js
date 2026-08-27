const ENDPOINT = "https://manager.gtraffic.io/api/cong-khai/tao-lien-ket";
const PUBLIC_BASE = "https://gtraffic.io";
const SUPABASE_FUNCTION = "https://nklukqriopezsoalnghm.supabase.co/functions/v1/gtraffic-shortener";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJpZWYiOiJubWx1a3FyaW9wZXpzb2FsbmdobSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzg2OTUyMDcxLCJleHAiOjIxMDI1MjgwNzF9.vbXNvGYQUjhOygLCbyJ5gZiKVjKm2e41UYshpbg2j3E";
function safeUrl(value) {
  try { const u = new URL(String(value || "").trim()); return u.protocol === "http:" || u.protocol === "https:" ? u.href : ""; }
  catch { return ""; }
}
async function readJson(response) {
  const text = await response.text(); let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { text, data };
}
export async function shortenGTraffic(token, destination) {
  const apiKey = String(token || "").trim(); const target = safeUrl(destination);
  if (!apiKey) throw new Error("GTraffic API token chưa được cấu hình");
  if (!target) throw new Error("URL cần rút gọn không hợp lệ");
  const proxy = await fetch(SUPABASE_FUNCTION, {
    method: "POST",
    headers: { Authorization: "Bearer " + SUPABASE_ANON_KEY, apikey: SUPABASE_ANON_KEY, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ token: apiKey, url: target }), cache: "no-store"
  }).catch(() => null);
  if (proxy) {
    const p = await readJson(proxy);
    if (proxy.ok && p.data && p.data.ok && safeUrl(p.data.url)) return safeUrl(p.data.url);
    if (proxy.status >= 400 && proxy.status < 500 && p.data && p.data.error) throw new Error("GTraffic proxy: " + String(p.data.error).slice(0, 300));
  }
  const requestUrl = new URL(ENDPOINT);
  requestUrl.searchParams.set("apikey", apiKey); requestUrl.searchParams.set("url", target);
  const response = await fetch(requestUrl.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*", "User-Agent": "Mozilla/5.0 (compatible; BDZTEAM-GTraffic/1.0)" }, redirect: "follow", cache: "no-store" });
  const p = await readJson(response);
  if (!response.ok) {
    const detail = p.data && typeof p.data.message === "string" ? p.data.message : p.data && typeof p.data.error === "string" ? p.data.error : p.text.replace(/\s+/g, " ").trim().slice(0, 300);
    throw new Error("GTraffic HTTP " + response.status + (detail ? ": " + detail : ""));
  }
  const id = String(p.data && p.data.id ? p.data.id : "").trim();
  if (!id) throw new Error("GTraffic HTTP 200 nhưng response không có id");
  return safeUrl(p.data.shortenedUrl || p.data.short_url || p.data.shortUrl) || PUBLIC_BASE + "/" + encodeURIComponent(id);
}
