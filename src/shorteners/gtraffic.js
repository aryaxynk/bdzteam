const ENDPOINT = 'https://manager.gtraffic.io/api/cong-khai/tao-lien-ket';
const PUBLIC_BASE = 'https://gtraffic.io';

function safeHttpUrl(value) {
  try {
    const u = new URL(String(value || '').trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : '';
  } catch {
    return '';
  }
}

function responseDetail(status, contentType, raw, data) {
  const msg = typeof data?.message === 'string' ? data.message :
    typeof data?.error === 'string' ? data.error :
    typeof data?.detail === 'string' ? data.detail : '';
  const text = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, 240) : '';
  const detail = msg || text;
  return `HTTP ${status}${contentType ? ` (${contentType})` : ''}${detail ? `: ${detail}` : ''}`;
}

export async function shortenGTraffic(token, destination) {
  const apiKey = String(token || '').trim();
  const target = safeHttpUrl(destination);
  if (!apiKey) throw new Error('GTraffic API token chưa được cấu hình');
  if (!target) throw new Error('URL cần rút gọn không hợp lệ');

  const url = new URL(ENDPOINT);
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('url', target);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      accept: 'application/json, text/plain, */*',
      'user-agent': 'Mozilla/5.0 (compatible; BDZTEAM-GTraffic/1.0)'
    },
    redirect: 'follow',
    cache: 'no-store'
  });

  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}

  if (!response.ok) {
    throw new Error(`GTraffic ${responseDetail(response.status, response.headers.get('content-type') || '', raw, data)}`);
  }

  const id = String(data?.id || '').trim();
  if (!id) {
    throw new Error('GTraffic HTTP 200 nhưng response không có id');
  }

  const direct = safeHttpUrl(data?.shortenedUrl || data?.short_url || data?.shortUrl);
  if (direct) return direct;

  return `${PUBLIC_BASE}/${encodeURIComponent(id)}`;
}
