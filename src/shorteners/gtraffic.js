const ENDPOINT = "https://manager.gtraffic.io/api/cong-khai/tao-lien-ket";
const PUBLIC_BASE = "https://gtraffic.io";

function validUrl(value) {
  try {
    const u = new URL(String(value || "").trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function extractUrl(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const direct = validUrl(value);
    if (direct) return direct;
    const match = value.match(/https?:\/\/[^\s"'<>]+/i);
    return match ? validUrl(match[0]) : "";
  }
  if (typeof value === "object") {
    const keys = ["url", "link", "short_url", "shortened_url", "shortenedUrl", "shortUrl", "redirect", "location", "href"];
    for (const key of keys) {
      const found = extractUrl(value[key]);
      if (found) return found;
    }
  }
  return "";
}

export async function shortenGTraffic(token, destination) {
  const apiKey = String(token || "").trim();
  const target = validUrl(destination);
  if (!apiKey) throw new Error("GTraffic API token chưa được cấu hình");
  if (!target) throw new Error("URL cần rút gọn không hợp lệ");

  const requestUrl = new URL(ENDPOINT);
  requestUrl.searchParams.set("apikey", apiKey);
  requestUrl.searchParams.set("url", target);

  let response;
  try {
    response = await fetch(requestUrl.toString(), {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers: {
        Accept: "application/json, text/plain, */*",
        Referer: "https://gtraffic.io/",
        Origin: "https://gtraffic.io",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(15000)
    });
  } catch (e) {
    throw new Error("Không thể kết nối GTraffic: " + String(e?.message || e));
  }

  const location = validUrl(response.headers.get("location") || "");
  if (location && location !== target) return location;

  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}

  if (data && data.block === true) {
    throw new Error("GTraffic từ chối request (block=true). Endpoint vẫn đang chặn server-side request.");
  }

  if (!response.ok) {
    let detail = "";
    if (data && typeof data === "object") detail = data.message || data.error || data.detail || "";
    if (!detail) detail = cleanText(raw).slice(0, 220);
    throw new Error("GTraffic HTTP " + response.status + (detail ? ": " + detail : ""));
  }

  const returnedUrl = extractUrl(data) || extractUrl(raw);
  if (returnedUrl && returnedUrl !== target) return returnedUrl;

  if (data && typeof data === "object") {
    const id = String(data.id || data.code || data.short_code || "").trim();
    if (/^[A-Za-z0-9_-]{2,100}$/.test(id)) return PUBLIC_BASE + "/" + encodeURIComponent(id);
  }

  const idMatch = raw.match(/(?:id|code|short[_-]?code)\s*[=:]\s*["']?([A-Za-z0-9_-]{3,96})/i);
  if (idMatch) return PUBLIC_BASE + "/" + encodeURIComponent(idMatch[1]);

  throw new Error("GTraffic không trả về liên kết rút gọn hợp lệ");
}
