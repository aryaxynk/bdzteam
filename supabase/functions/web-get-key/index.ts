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

/** Extract shortened URL from VuotNhanh JSON or plain-text response. */
function extractShortUrl(raw: string, parsed: unknown, target: string): string | null {
  const p = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  const candidates = [
    clean(p?.shortenedUrl),
    clean(p?.shortened_url),
    clean(p?.short_url),
    clean(p?.shortUrl),
    clean(p?.link),
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
      /* skip non-URL */
    }
  }
  return null;
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
    const ip = clean(body?.ip).slice(0, 128) || "unknown";
    const visitorId = clean(body?.visitor_id).slice(0, 256) || "unknown";

    if (action === "start") {
      const { data, error } = await sb.rpc("bdz_web_start", { p_ip: ip, p_visitor_id: visitorId });
      if (error) return json({ ok: false, error: "START_UNAVAILABLE" }, 500);
      if (!data?.ok || !data?.token) return json(data || { ok: false, error: "START_UNAVAILABLE" }, 429);

      const target =
        "https://aryaxynk.github.io/bdzteam/token/?token=" + encodeURIComponent(String(data.token));

      const { data: cfg, error: cfgError } = await sb
        .from("shortener_configs")
        .select("base_url, api_token")
        .eq("provider", "vuotnhanh")
        .eq("enabled", true)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (cfgError || !cfg?.api_token) {
        return json({ ok: false, error: "SHORTENER_NOT_CONFIGURED" }, 502);
      }

      const endpoint = new URL(String(cfg.base_url || "https://vuotnhanh.com/api"));
      endpoint.searchParams.set("api", String(cfg.api_token));
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
        /* plain text URL */
      }
      if (!upstream.ok) {
        return json({ ok: false, error: "SHORTENER_UPSTREAM", status: upstream.status }, 502);
      }
      const shortenedUrl = extractShortUrl(raw, parsed, target);
      if (!shortenedUrl) return json({ ok: false, error: "SHORTENER_INVALID_RESPONSE" }, 502);

      return json({ ok: true, expires_in_seconds: 900, shortenedUrl });
    }

    if (action === "claim") {
      const token = clean(body?.token);
      const libraryToken = clean(body?.library_token).toLowerCase();
      if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return json({ ok: false, error: "TOKEN_INVALID" }, 400);
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
