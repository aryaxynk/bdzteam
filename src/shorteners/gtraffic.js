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

async function parseResponse(response) {
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  return { raw, data };
}

export async function shortenGTraffic(token, destination, env = {}) {
  const apiKey = String(token || '').trim();
  const target = safeHttpUrl(destination);
  if (!apiKey) throw new Error('GTraffic API token chưa được cấu hình');
  if (!target) throw new Error('URL cần rút gọn không hợp lệ');

  const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseKey = String(env.SUPABASE_SECRET_KEY || '').trim();

  if (supabaseUrl && supabaseKey) {
    try {
      const proxy = await fetch(`${supabaseUrl}/functions/v1/gtraffic-shortener`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          accept: 'application/json',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ token: apiKey, url: target }),
        cache: 'no-store'
      });
      const { data, raw } = await parseResponse(proxy);
      if (proxy.ok && data?.ok && safeHttpUrl(data?.url)) return data.url;
      const detail = typeof data?.error === 'string' ? data.error : raw.replace(/\s+/g, ' ').trim().slice(0, 300);
      if (proxy.status !== 502 && proxy.status !== 503 && proxy.status !== 500) {
        throw new Error(`GTraffic proxy HTTP ${proxy.status}${detail ? `: ${detail}` : ''}`);
      }
    } catch (e) {
      if (String(e?.message || '').startsWith('GTraffic proxy HTTP')) throw e;
      console.warn('[gtraffic] proxy failed, trying direct request');
    }
  }

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
  const { data, raw } = await parseResponse(response);

  if (!response.ok) {
    const detail = typeof data?.message === 'string' ? data.message :
      typeof data?.error === 'string' ? data.error : raw.replace(/\s+/g, ' ').trim().slice(0, 300);
    throw new Error(`GTraffic HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
  }

  const id = String(data?.id || '').trim();
  if (!id) throw new Error('GTraffic HTTP 200 nhưng response không có id');
  return safeHttpUrl(data?.shortenedUrl || data?.short_url || data?.shortUrl) || `${PUBLIC_BASE}/${encodeURIComponent(id)}`;
}
