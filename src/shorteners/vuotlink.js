const DEFAULT_API_URL = "https://vuotlink.xyz/api";

function validUrl(value) {
  try {
    const u = new URL(String(value || "").trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}

export async function shortenVuotlink(token, destination, env = {}) {
  let apiToken = String(token || "").trim();
  let apiUrl = String(env.VUOTLINK_API_URL || DEFAULT_API_URL).trim() || DEFAULT_API_URL;

  if (apiToken.startsWith("{") && apiToken.endsWith("}")) {
    try {
      const config = JSON.parse(apiToken);
      apiToken = String(config.api_token || config.token || "").trim();
      apiUrl = String(config.api_url || config.url || apiUrl).trim() || apiUrl;
    } catch {}
  }

  const target = validUrl(destination);
  if (!apiToken) throw new Error("Vuotlink API token chưa được cấu hình");
  if (!target) throw new Error("URL cần rút gọn không hợp lệ");

  const endpoint = new URL(apiUrl);
  endpoint.searchParams.set("api", apiToken);
  endpoint.searchParams.set("url", target);

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: { Accept: "application/json, text/plain, */*" },
    redirect: "follow",
    cache: "no-store"
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}

  const shortened = validUrl(data?.shortenedUrl) || validUrl(data?.shortened_url) || (validUrl(text) ? text.trim() : "");
  if (!response.ok || data?.status === "error" || !shortened) {
    throw new Error(data?.message || "Vuotlink không tạo được link rút gọn");
  }
  return shortened;
}
