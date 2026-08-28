const ENDPOINT = "https://manager.gtraffic.io/api/cong-khai/tao-lien-ket";
const PUBLIC_BASE = "https://gtraffic.io";

function validUrl(value) {
  try {
    var u = new URL(String(value || "").trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.href;
  } catch (e) {
    return "";
  }
}

async function readBody(response) {
  var text = await response.text();
  var data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = null;
  }
  return { text: text, data: data };
}

export async function shortenGTraffic(token, destination) {
  var apiKey = String(token || "").trim();
  var target = validUrl(destination);

  if (!apiKey) throw new Error("GTraffic API token chưa được cấu hình");
  if (!target) throw new Error("URL cần rút gọn không hợp lệ");

  var url = new URL(ENDPOINT);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("url", target);

  var response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json, text/plain, */*" },
      redirect: "follow",
      cache: "no-store"
    });
  } catch (e) {
    throw new Error("Không thể kết nối GTraffic: " + String(e && e.message ? e.message : e));
  }

  var body = await readBody(response);
  var data = body.data || {};

  if (!response.ok) {
    var detail = "";
    if (typeof data.message === "string") detail = data.message;
    else if (typeof data.error === "string") detail = data.error;
    else if (body.text) detail = body.text.replace(/\s+/g, " ").trim().slice(0, 300);
    throw new Error("GTraffic HTTP " + response.status + (detail ? ": " + detail : ""));
  }

  var id = String(data.id || "").trim();
  if (!id) throw new Error("GTraffic trả về HTTP 200 nhưng không có id");

  return PUBLIC_BASE + "/" + encodeURIComponent(id);
}
