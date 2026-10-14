import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const encoder = new TextEncoder();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const str = (v: unknown) => v === null || v === undefined ? "" : String(v);
const hex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
async function hmacSha256(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}
function equalHex(a: string, b: string) {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  let diff = 0; for (let i = 0; i < 64; i++) diff |= a.toLowerCase().charCodeAt(i) ^ b.toLowerCase().charCodeAt(i);
  return diff === 0;
}
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ success: false, message: "POST required" }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ success: false }, 500);
  try {
    const data = await req.json().catch(() => null);
    if (!data || typeof data !== "object") return json({ success: false, message: "Invalid JSON" }, 400);
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: cfg, error: cfgError } = await sb.rpc("bdz_pay2s_backend_config");
    if (cfgError || !cfg?.ok || !cfg.access_key || !cfg.secret_key || !cfg.settings?.partner_code)
      return json({ success: false, message: "Server configuration unavailable" }, 503);
    const amount = str(data.amount), extraData = str(data.extraData), message = str(data.message);
    const orderId = str(data.orderId), orderInfo = str(data.orderInfo), orderType = str(data.orderType);
    const partnerCode = str(data.partnerCode), payType = str(data.payType), requestId = str(data.requestId);
    const responseTime = str(data.responseTime), resultCodeRaw = str(data.resultCode);
    const transId = str(data.transId), signature = str(data.m2signature);
    if (!orderId || !requestId || !partnerCode || !amount || !resultCodeRaw || !/^\d+$/.test(amount) ||
        !/^-?\d+$/.test(resultCodeRaw) || partnerCode !== cfg.settings.partner_code)
      return json({ success: false, message: "Invalid payment fields" }, 400);
    const rawHash = "accessKey=" + cfg.access_key + "&amount=" + amount + "&extraData=" + extraData + "&message=" + message +
      "&orderId=" + orderId + "&orderInfo=" + orderInfo + "&orderType=" + orderType + "&partnerCode=" + partnerCode +
      "&payType=" + payType + "&requestId=" + requestId + "&responseTime=" + responseTime +
      "&resultCode=" + resultCodeRaw + "&transId=" + transId;
    const expectedSignature = await hmacSha256(rawHash, cfg.secret_key);
    if (!equalHex(signature, expectedSignature)) return json({ success: false, message: "Invalid signature" }, 401);
    const numericAmount = Number(amount), resultCode = Number(resultCodeRaw);
    if (!Number.isSafeInteger(numericAmount) || numericAmount <= 0 || !Number.isSafeInteger(resultCode))
      return json({ success: false, message: "Invalid amount/result" }, 400);
    const { data: settled, error: settleError } = await sb.rpc("bdz_pay2s_settle", {
      p_order_id: orderId, p_request_id: requestId, p_partner_code: partnerCode, p_amount: numericAmount,
      p_result_code: resultCode, p_trans_id: transId.slice(0, 100), p_message: message.slice(0, 300) });
    if (settleError || !settled?.ok) return json({ success: false, message: "Order validation failed" }, 400);
    return json({ success: true });
  } catch (e) {
    console.error("pay2s-ipn processing failed", e instanceof Error ? e.name : "unknown");
    return json({ success: false, message: "Processing error" }, 500);
  }
});