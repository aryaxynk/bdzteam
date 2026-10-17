import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://aryaxynk.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const encoder = new TextEncoder();
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
async function sha256(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

function clientIp(req: Request, bodyIp: string): string {
  const h = req.headers;
  const candidates = [
    h.get("cf-connecting-ip"),
    h.get("x-real-ip"),
    (h.get("x-forwarded-for") || "").split(",")[0]?.trim(),
    h.get("x-client-ip"),
    bodyIp,
  ];
  for (const c of candidates) {
    const v = clean(c).slice(0, 128);
    if (v && v !== "unknown") return v;
  }
  return "unknown";
}

function extractShortUrl(raw: string, parsed: unknown, target: string): string | null {
  const p = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  const candidates = [
    clean(p?.shortenedUrl),
    clean(p?.shortened_url),
    clean(p?.short_url),
    clean(p?.shortUrl),
    clean(p?.link),
    clean(p?.url),
    raw.trim().replace(/^["']|["']$/g, ""),
  ];
  for (const candidate of candidates) {
    if (!candidate || candidate === target || candidate.length > 2048) continue;
    try {
      const u = new URL(candidate);
      if ((u.protocol === "https:" || u.protocol === "http:") && u.hostname && u.href !== target) {
        return u.href;
      }
    } catch {
      /* skip */
    }
  }
  return null;
}

async function callShortener(
  baseUrl: string,
  apiToken: string,
  target: string,
): Promise<{ ok: true; shortenedUrl: string } | { ok: false; error: string; status?: number }> {
  try {
    const endpoint = new URL(baseUrl);
    endpoint.searchParams.set("api", apiToken);
    endpoint.searchParams.set("url", target);
    const upstream = await fetch(endpoint.toString(), {
      headers: { accept: "application/json, text/plain, */*" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    const raw = await upstream.text();
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      /* text */
    }
    if (!upstream.ok) return { ok: false, error: "SHORTENER_UPSTREAM", status: upstream.status };
    const shortenedUrl = extractShortUrl(raw, parsed, target);
    if (!shortenedUrl) return { ok: false, error: "SHORTENER_INVALID_RESPONSE" };
    return { ok: true, shortenedUrl };
  } catch {
    return { ok: false, error: "SHORTENER_UPSTREAM" };
  }
}

async function shortenWithConfig(
  sb: ReturnType<typeof createClient>,
  shortenerId: number,
  target: string,
) {
  const { data: row } = await sb
    .from("shortener_configs")
    .select("base_url, api_token")
    .eq("id", shortenerId)
    .eq("enabled", true)
    .maybeSingle();
  if (!row?.api_token || !row?.base_url) return { ok: false as const, error: "SHORTENER_NOT_CONFIGURED" };
  return await callShortener(String(row.base_url), String(row.api_token), target);
}

function stepLandingUrl(token: string, isFinal: boolean) {
  if (isFinal) {
    return "https://aryaxynk.github.io/bdzteam/token/?token=" + encodeURIComponent(token);
  }
  return "https://aryaxynk.github.io/bdzteam/step/?token=" + encodeURIComponent(token);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = clean(body?.action) || "start";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) return json({ ok: false, error: "SERVER_CONFIG" }, 500);

    const sb = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const visitorId = clean(body?.visitor_id).slice(0, 256) || "unknown";
    const ip = clientIp(req, clean(body?.ip));

    if (action === "captcha") {
      const { data, error } = await sb.rpc("bdz_web_captcha_new", { p_ip: ip, p_visitor_id: visitorId });
      if (error) return json({ ok: false, error: "CAPTCHA_UNAVAILABLE" }, 500);
      return json(data || { ok: false, error: "CAPTCHA_UNAVAILABLE" });
    }

    if (action === "start") {
      const captchaId = clean(body?.captcha_id);
      const captchaAnswer = clean(body?.captcha_answer);
      const { data, error } = await sb.rpc("bdz_web_start", {
        p_ip: ip,
        p_visitor_id: visitorId,
        p_captcha_id: captchaId || null,
        p_captcha_answer: captchaAnswer || null,
      });
      if (error) return json({ ok: false, error: "START_UNAVAILABLE" }, 500);
      if (!data?.ok || !data?.token) return json(data || { ok: false, error: "START_UNAVAILABLE" }, 429);

      const isFinal = !!data.is_final_step;
      const target = stepLandingUrl(String(data.token), isFinal);
      const short = await shortenWithConfig(sb, Number(data.shortener_id), target);
      if (!short.ok) return json({ ok: false, error: short.error }, 502);

      return json({
        ok: true,
        expires_in_seconds: data.expires_in_seconds || 1800,
        shortenedUrl: short.shortenedUrl,
        step: data.step,
        total_steps: data.total_steps,
      });
    }

    if (action === "arrive") {
      const token = clean(body?.token);
      if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return json({ ok: false, error: "TOKEN_INVALID" }, 400);
      const { data, error } = await sb.rpc("bdz_web_step_arrive", {
        p_token: token,
        p_ip: ip,
        p_visitor_id: visitorId,
      });
      if (error) return json({ ok: false, error: "ARRIVE_UNAVAILABLE" }, 500);
      return json(data || { ok: false, error: "ARRIVE_UNAVAILABLE" });
    }

    if (action === "continue") {
      const token = clean(body?.token);
      const captchaId = clean(body?.captcha_id);
      const captchaAnswer = clean(body?.captcha_answer);
      if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return json({ ok: false, error: "TOKEN_INVALID" }, 400);

      const { data, error } = await sb.rpc("bdz_web_continue", {
        p_token: token,
        p_ip: ip,
        p_visitor_id: visitorId,
        p_captcha_id: captchaId || null,
        p_captcha_answer: captchaAnswer || null,
      });
      if (error) return json({ ok: false, error: "CONTINUE_UNAVAILABLE" }, 500);
      if (!data?.ok) return json(data || { ok: false, error: "CONTINUE_UNAVAILABLE" });

      if (data.phase === "claim") {
        return json({
          ok: true,
          phase: "claim",
          claimUrl: "https://aryaxynk.github.io/bdzteam/token/?token=" + encodeURIComponent(token),
        });
      }

      if (data.phase === "shorten" && data.shortener_id) {
        const isFinal = !!data.is_final_step;
        const target = stepLandingUrl(token, isFinal);
        const short = await shortenWithConfig(sb, Number(data.shortener_id), target);
        if (!short.ok) return json({ ok: false, error: short.error }, 502);
        return json({
          ok: true,
          phase: "shorten",
          shortenedUrl: short.shortenedUrl,
          step: data.step,
          total_steps: data.total_steps,
        });
      }

      return json(data);
    }

    if (action === "claim") {
      const token = clean(body?.token);
      const libraryToken = clean(body?.library_token).toLowerCase();
      if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return json({ ok: false, error: "TOKEN_INVALID" }, 400);
      if (!/^[a-f0-9]{64}$/.test(libraryToken)) {
        return json({ ok: false, error: "LIBRARY_TOKEN_INVALID" }, 400);
      }
      const ownerTokenHash = await sha256(libraryToken);
      const { data, error } = await sb.rpc("bdz_web_claim_key_vault", {
        p_token: token,
        p_ip: ip,
        p_visitor_id: visitorId,
        p_owner_token_hash: ownerTokenHash,
      });
      if (error) {
        console.error("web-get-key claim failed", error instanceof Error ? error.name : "database_error");
        return json({ ok: false, error: "CLAIM_UNAVAILABLE" }, 500);
      }
      return json(data || { ok: false, error: "CLAIM_UNAVAILABLE" });
    }

    return json({ ok: false, error: "INVALID_ACTION" }, 400);
  } catch (e) {
    console.error("web-get-key request failed", e instanceof Error ? e.name : "unknown");
    return json({ ok: false, error: "SERVER_ERROR" }, 500);
  }
});
