import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RETURN_URL = "https://aryaxynk.github.io/bdzteam/payment/return.html";
const IPN_URL = SUPABASE_URL.replace(/\/+$/, "") + "/functions/v1/pay2s-ipn";
const ORIGINS = new Set(["https://aryaxynk.github.io"]);
const encoder = new TextEncoder();
const supabase = () => createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });
function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return { "Access-Control-Allow-Origin": ORIGINS.has(origin) ? origin : "https://aryaxynk.github.io",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Max-Age": "86400", "Vary": "Origin" };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req),
    "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
const text = (v: unknown) => typeof v === "string" ? v.trim() : "";
const hex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
function randomHex(bytes = 16) { const b = new Uint8Array(bytes); crypto.getRandomValues(b); return hex(b); }
async function sha256(value: string) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)))); }
async function hmacSha256(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}
function inspectPay2sUrl(url: string) {
  try {
    const u = new URL(url);
    const hostEnvironment = u.hostname === "payment.pay2s.vn" ? "production" :
      u.hostname === "sandbox-payment.pay2s.vn" ? "sandbox" : null;
    const trustedPath = u.pathname.startsWith("/quicklink/") ||
      u.pathname.startsWith("/v2/gateway/pay");
    const valid = u.protocol === "https:" && hostEnvironment !== null &&
      !u.username && !u.password && (!u.port || u.port === "443") && trustedPath;
    return { url, valid, host: hostEnvironment ? u.hostname : "untrusted-or-invalid",
      environment: hostEnvironment, pathValid: trustedPath };
  } catch {
    return { url, valid: false, host: "invalid-url", environment: null as string | null, pathValid: false };
  }
}
async function getConfig(sb: ReturnType<typeof supabase>) {
  const { data, error } = await sb.rpc("bdz_pay2s_backend_config");
  if (error || !data?.ok || !data?.settings) throw new Error("PAYMENT_CONFIG");
  return data as { ok: boolean; access_key: string | null; secret_key: string | null;
    settings: { enabled: boolean; environment: "sandbox" | "production"; partner_code: string | null;
      partner_name: string; bank_accounts: Array<{ account_number: string; bank_id: string }> } };
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE) return json(req, { ok: false, error: "SERVER_CONFIG" }, 500);
  try {
    const body = await req.json().catch(() => ({}));
    const action = text(body?.action);
    const sb = supabase();
    if (action === "packages") {
      const cfg = await getConfig(sb);
      const { data: packages, error } = await sb.from("pay2s_packages").select("id,code,name,description,amount,duration_hours,max_devices")
        .eq("enabled", true).order("sort_order", { ascending: true }).order("id", { ascending: true });
      if (error) return json(req, { ok: false, error: "PACKAGES_UNAVAILABLE" }, 500);
      return json(req, { ok: true, enabled: cfg.settings.enabled === true, environment: cfg.settings.environment,
        packages: cfg.settings.enabled ? (packages || []) : [] });
    }
    if (action === "create_order") {
      const cfg = await getConfig(sb);
      if (cfg.settings.enabled !== true) return json(req, { ok: false, error: "SALES_DISABLED" }, 503);
      if (!cfg.access_key || !cfg.secret_key || !cfg.settings.partner_code ||
          !Array.isArray(cfg.settings.bank_accounts) || cfg.settings.bank_accounts.length === 0)
        return json(req, { ok: false, error: "PAY2S_NOT_CONFIGURED" }, 503);
      const packageId = Number(body?.package_id);
      if (!Number.isSafeInteger(packageId) || packageId <= 0) return json(req, { ok: false, error: "INVALID_PACKAGE" }, 400);
      const visitorId = text(body?.visitor_id).slice(0, 256);
      if (visitorId.length < 8) return json(req, { ok: false, error: "INVALID_VISITOR" }, 400);
      const visitorHash = await sha256("BDZMOD-PAY2S-VISITOR|" + visitorId);
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const now = new Date().toISOString();
      // Failed attempts and stale pending orders must not block legitimate retries.
      // Keep the daily cap for paid orders and still-active pending orders only.
      const { count, error: countError } = await sb.from("pay2s_orders").select("id", { count: "exact", head: true })
        .eq("visitor_hash", visitorHash).gte("created_at", since)
        .or(`status.eq.PAID,and(status.eq.PENDING,expires_at.gt.${now})`);
      if (countError) return json(req, { ok: false, error: "ORDER_LIMIT_CHECK" }, 500);
      if ((count || 0) >= 5) return json(req, { ok: false, error: "ORDER_RATE_LIMIT" }, 429);
      const { data: pack, error: packError } = await sb.from("pay2s_packages")
        .select("id,code,name,description,amount,duration_hours,max_devices").eq("id", packageId).eq("enabled", true).maybeSingle();
      if (packError || !pack) return json(req, { ok: false, error: "PACKAGE_UNAVAILABLE" }, 404);
      if (!Number.isSafeInteger(Number(pack.amount)) || Number(pack.amount) <= 0) return json(req, { ok: false, error: "PACKAGE_AMOUNT_INVALID" }, 500);
      const orderId = "BDZ" + randomHex(16).toUpperCase();
      const requestId = Date.now().toString() + randomHex(12).toUpperCase();
      const orderInfo = "BDZ" + randomHex(12).toUpperCase();
      const viewToken = randomHex(32);
      const viewTokenHash = await sha256(viewToken);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const { error: insertError } = await sb.from("pay2s_orders").insert({
        order_id: orderId, request_id: requestId, package_id: pack.id, package_code: pack.code,
        package_name: pack.name, amount: pack.amount, duration_hours: pack.duration_hours,
        max_devices: pack.max_devices, status: "PENDING", view_token_hash: viewTokenHash,
        visitor_hash: visitorHash, expires_at: expiresAt });
      if (insertError) return json(req, { ok: false, error: "ORDER_CREATE_FAILED" }, 500);
      const redirectUrl = RETURN_URL + "?order=" + encodeURIComponent(orderId);
      const requestType = "pay2s";
      const amount = String(Number(pack.amount));
      const rawHash = "accessKey=" + cfg.access_key + "&amount=" + amount + "&bankAccounts=Array" + "&ipnUrl=" + IPN_URL +
        "&orderId=" + orderId + "&orderInfo=" + orderInfo + "&partnerCode=" + cfg.settings.partner_code +
        "&redirectUrl=" + redirectUrl + "&requestId=" + requestId + "&requestType=" + requestType;
      const signature = await hmacSha256(rawHash, cfg.secret_key);
      const endpoint = cfg.settings.environment === "production" ? "https://payment.pay2s.vn/v1/gateway/api/create" :
        "https://sandbox-payment.pay2s.vn/v1/gateway/api/create";
      let upstream: Response; let upstreamBody: Record<string, unknown>;
      try {
        upstream = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json; charset=UTF-8", "Accept": "application/json" },
          signal: AbortSignal.timeout(15000), body: JSON.stringify({ accessKey: cfg.access_key, partnerCode: cfg.settings.partner_code,
            partnerName: cfg.settings.partner_name || "BDZMOD", requestId, amount: Number(pack.amount), orderId, orderInfo,
            orderType: requestType, bankAccounts: cfg.settings.bank_accounts, redirectUrl, ipnUrl: IPN_URL, requestType, signature }) });
        upstreamBody = await upstream.json().catch(() => ({}));
      } catch {
        await sb.from("pay2s_orders").update({ status: "FAILED", result_message: "Pay2S unavailable" }).eq("order_id", orderId).eq("status", "PENDING");
        return json(req, { ok: false, error: "PAY2S_UNAVAILABLE" }, 502);
      }
      const resultCode = Number(upstreamBody.resultCode);
      const responseAmount = Number(upstreamBody.amount);
      const partnerMatches = text(upstreamBody.partnerCode) === cfg.settings.partner_code;
      const requestMatches = text(upstreamBody.requestId) === requestId;
      const orderMatches = text(upstreamBody.orderId) === orderId;
      const amountMatches = responseAmount === Number(pack.amount);

      // Pay2S Collection Link often returns qrList[].qrUrl instead of payUrl.
      // Accept either shape while enforcing exact Pay2S host and environment.
      const qrList = Array.isArray(upstreamBody.qrList)
        ? upstreamBody.qrList as Array<Record<string, unknown>>
        : [];
      const linkCandidates = [
        text(upstreamBody.payUrl),
        ...qrList.map(item => text(item?.qrUrl))
      ].filter(Boolean);
      const parsedLinks = linkCandidates.map(url => inspectPay2sUrl(url));
      const paymentLink = parsedLinks.find(link => link.valid && link.environment === cfg.settings.environment)
        || parsedLinks.find(link => link.valid)
        || inspectPay2sUrl("");
      const markOrderFailed = async (reason: string) => {
        await sb.from("pay2s_orders").update({ status: "FAILED",
          result_code: Number.isFinite(resultCode) ? resultCode : null,
          result_message: reason.slice(0, 300) }).eq("order_id", orderId).eq("status", "PENDING");
      };
      if (!upstream.ok || resultCode !== 0) {
        await markOrderFailed("Pay2S create rejected: HTTP " + upstream.status +
          ", resultCode=" + (Number.isFinite(resultCode) ? resultCode : "missing"));
        console.warn("Pay2S create rejected", {
          httpStatus: upstream.status, resultCode: Number.isFinite(resultCode) ? resultCode : null,
          hasMessage: Boolean(text(upstreamBody.message) || text(upstreamBody.error))
        });
        return json(req, { ok: false, error: "PAY2S_CREATE_FAILED" }, 502);
      }
      if (!partnerMatches || !requestMatches || !orderMatches || !amountMatches) {
        const mismatch = [
          !partnerMatches ? "partnerCode" : "",
          !requestMatches ? "requestId" : "",
          !orderMatches ? "orderId" : "",
          !amountMatches ? "amount" : ""
        ].filter(Boolean);
        await markOrderFailed("Pay2S response validation failed: " + mismatch.join(", "));
        console.warn("Pay2S create response validation failed", {
          httpStatus: upstream.status, resultCode, partnerMatches, requestMatches, orderMatches, amountMatches
        });
        return json(req, { ok: false, error: "PAY2S_RESPONSE_INVALID" }, 502);
      }
      if (!paymentLink.valid) {
        const hasQrUrl = qrList.some(item => Boolean(text(item?.qrUrl)));
        await markOrderFailed("Pay2S response has no trusted checkout URL: hasPayUrl=" +
          Boolean(text(upstreamBody.payUrl)) + ", qrListLength=" + qrList.length + ", hasQrUrl=" + hasQrUrl);
        console.warn("Pay2S create response missing checkout URL", {
          httpStatus: upstream.status, resultCode, hasPayUrl: Boolean(text(upstreamBody.payUrl)),
          qrListLength: qrList.length, hasQrUrl
        });
        return json(req, { ok: false, error: "PAY2S_LINK_MISSING" }, 502);
      }
      if (paymentLink.environment !== cfg.settings.environment) {
        await markOrderFailed("Pay2S checkout environment mismatch: configured=" +
          cfg.settings.environment + ", returned=" + paymentLink.environment);
        console.warn("Pay2S checkout environment mismatch", {
          configuredEnvironment: cfg.settings.environment,
          returnedEnvironment: paymentLink.environment,
          payUrlHost: paymentLink.host
        });
        return json(req, { ok: false, error: "PAY2S_ENVIRONMENT_MISMATCH" }, 502);
      }
      return json(req, { ok: true, order_id: orderId, view_token: viewToken, pay_url: paymentLink.url,
        amount: Number(pack.amount), package_name: pack.name, expires_at: expiresAt });
    }
    if (action === "order_status") {
      const orderId = text(body?.order_id); const viewToken = text(body?.view_token);
      if (!/^[A-Z0-9]{20,48}$/.test(orderId) || !/^[a-f0-9]{64}$/i.test(viewToken))
        return json(req, { ok: false, error: "ORDER_ACCESS_INVALID" }, 400);
      const tokenHash = await sha256(viewToken);
      const { data: order, error } = await sb.from("pay2s_orders")
        .select("order_id,package_name,amount,status,key_id,expires_at,paid_at")
        .eq("order_id", orderId).eq("view_token_hash", tokenHash).maybeSingle();
      if (error || !order) return json(req, { ok: false, error: "ORDER_NOT_FOUND" }, 404);
      let status = order.status;
      if (status === "PENDING" && Date.parse(order.expires_at) < Date.now()) {
        await sb.from("pay2s_orders").update({ status: "EXPIRED" }).eq("order_id", orderId).eq("status", "PENDING");
        status = "EXPIRED";
      }
      const out: Record<string, unknown> = { ok: true, order_id: order.order_id, package_name: order.package_name,
        amount: Number(order.amount), status, paid_at: order.paid_at };
      if (status === "PAID" && order.key_id) {
        const { data: keyRow, error: keyError } = await sb.from("app_keys").select("key_code").eq("id", order.key_id).maybeSingle();
        if (keyError || !keyRow?.key_code) return json(req, { ok: false, error: "KEY_DELIVERY_PENDING" }, 503);
        out.key_code = keyRow.key_code;
      }
      return json(req, out);
    }
    return json(req, { ok: false, error: "INVALID_ACTION" }, 400);
  } catch (e) {
    console.error("pay2s-api request failed", e instanceof Error ? e.name : "unknown");
    return json(req, { ok: false, error: "SERVER_ERROR" }, 500);
  }
});