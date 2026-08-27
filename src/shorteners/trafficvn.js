const DEFAULT_ENDPOINT = "https://trafficvn.com/apidevelop";
function validUrl(value) {
  try { const u = new URL(String(value || "").trim()); return u.protocol === "http:" || u.protocol === "https:" ? u.href : ""; }
  catch { return ""; }
}
async function read(response) {
  const text = await response.text(); let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { text, data };
}
export async function shortenTrafficVN(token, destination, env = {}) {
  const api = String(token || "").trim(); const target = validUrl(destination);
  const base = String(env.TRAFFICVN_BASE_URL || DEFAULT_ENDPOINT).trim() || DEFAULT_ENDPOINT;
  if (!api) throw new Error("TrafficVN API token chưa được cấu hình");
  if (!target) throw new Error("URL cần rút gọn không hợp lệ");
  const u = new URL(base); u.searchParams.set("api", api); u.searchParams.set("url", target);
  const r = await fetch(u.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*" }, redirect: "follow", cache: "no-store" });
  const p = await read(r); const d = p.data || {};
  const result = [d.shortenedUrl,d.shortened_url,d.short_url,d.shorturl,d.url,d.link,d.data && d.data.url,d.data && d.data.link,d.result && d.result.url].map(validUrl).find(Boolean);
  if (!r.ok || !result) throw new Error("TrafficVN không tạo được link rút gọn");
  return result;
}
