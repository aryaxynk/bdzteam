import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
const clean = (v: unknown) => typeof v === "string" ? v.trim() : "";

async function createOntopsLink(sb: ReturnType<typeof createClient>, target: string): Promise<{ url: string; exhausted: boolean } | null> {
  const { data: cfg, error } = await sb
    .from("shortener_configs")
    .select("id, base_url, api_token")
    .eq("provider", "ontops")
    .eq("enabled", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !cfg?.api_token) {
    if (error) console.warn("Ontops config unavailable");
    return null;
  }

  try {
    const endpoint = new URL("https://api-management.ontops.link/api/public/create-short-link");
    endpoint.searchParams.set("apikey", String(cfg.api_token));
    endpoint.searchParams.set("url", target);
    const response = await fetch(endpoint.toString(), {
      headers: { accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    const raw = await response.text();
    let payload: Record<string, unknown> | null = null;
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) payload = parsed as Record<string, unknown>;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      console.warn("Ontops shortener returned HTTP", response.status);
      return null;
    }

    const id = clean(payload?.id);
    if (!/^[A-Za-z0-9_-]{3,64}$/.test(id)) {
      console.warn("Ontops shortener response did not contain a valid id");
      return null;
    }

    // The API returns a short code in id rather than a shortenedUrl field.
    const url = "https://ontops.link/" + encodeURIComponent(id);
    const remaining = Number(payload?.remaining);
    const exhausted = payload?.remaining !== undefined && payload?.remaining !== null
      && Number.isFinite(remaining) && remaining <= 0;

    if (exhausted) {
      // Keep the last successful link, then use the backup provider for later requests.
      const { error: disableError } = await sb
        .from("shortener_configs")
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq("id", cfg.id);
      if (disableError) console.warn("Could not disable exhausted Ontops configuration");
    }
    return { url, exhausted };
  } catch {
    console.warn("Ontops shortener request failed");
    return null;
  }
}

async function createVuotlinkFallback(sb: ReturnType<typeof createClient>, target: string): Promise<string | null> {
  const { data: cfg, error } = await sb
    .from("shortener_configs")
    .select("base_url, api_token")
    .eq("provider", "vuotlink")
    .eq("enabled", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !cfg?.api_token) return null;

  try {
    const endpoint = new URL(String(cfg.base_url || "https://vuotlink.xyz/api"));
    endpoint.searchParams.set("api", String(cfg.api_token));
    endpoint.searchParams.set("url", target);
    const response = await fetch(endpoint.toString(), {
      headers: { accept: "application/json, text/plain, */*" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    const raw = await response.text();
    let payload: Record<string, unknown> | null = null;
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) payload = parsed as Record<string, unknown>;
    } catch {
      payload = null;
    }
    if (!response.ok) return null;
    const shortened = clean(payload?.shortenedUrl ?? payload?.shortened_url ?? payload?.short_url).replace(/^"|"$/g, "");
    return /^https?:\/\//i.test(shortened) ? shortened : null;
  } catch {
    console.warn("Fallback shortener request failed");
    return null;
  }
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
    const sb = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
    const ip = clean(body?.ip).slice(0, 128) || "unknown";
    const visitorId = clean(body?.visitor_id).slice(0, 256) || "unknown";

    if (action === "start") {
      const { data, error } = await sb.rpc("bdz_web_start", { p_ip: ip, p_visitor_id: visitorId });
      if (error) return json({ ok: false, error: "START_UNAVAILABLE" }, 500);
      if (!data?.ok || !data?.token) return json(data || { ok: false, error: "START_UNAVAILABLE" }, 429);
      const target = "https://aryaxynk.github.io/bdzteam/token/?token=" + encodeURIComponent(String(data.token));
      let shortened: string | null = null;
      const ontops = await createOntopsLink(sb, target);
      if (ontops) shortened = ontops.url;

      // Ontops is primary; keep the current provider as a safety fallback if Ontops has no quota or fails.
      if (!shortened) shortened = await createVuotlinkFallback(sb, target);
      if (!shortened) return json({ ok: false, error: "SHORTENER_UNAVAILABLE" }, 502);
      return json({ ok: true, expires_in_seconds: 900, shortenedUrl: shortened });
    }

    if (action === "claim") {
      const token = clean(body?.token);
      if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return json({ ok: false, error: "TOKEN_INVALID" }, 400);
      const { data, error } = await sb.rpc("bdz_web_claim", { p_token: token, p_ip: ip, p_visitor_id: visitorId });
      if (error) return json({ ok: false, error: "CLAIM_UNAVAILABLE" }, 500);
      return json(data || { ok: false, error: "CLAIM_UNAVAILABLE" });
    }
    return json({ ok: false, error: "INVALID_ACTION" }, 400);
  } catch (e) {
    console.error("web-get-key request failed", e instanceof Error ? e.name : "unknown");
    return json({ ok: false, error: "SERVER_ERROR" }, 500);
  }
});