import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});
const clean = (v: unknown) => typeof v === "string" ? v.trim() : "";

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeFilename(value: string): string {
  const base = value.replace(/[\\/]/g, "_").replace(/[^A-Za-z0-9._ ()-]/g, "_").slice(0, 180).replace(/^\.+/, "");
  return base || "upload.bin";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);

  const length = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > MAX_FILE_SIZE + 512 * 1024) {
    return json({ ok: false, error: "FILE_TOO_LARGE", max_bytes: MAX_FILE_SIZE }, 413);
  }

  try {
    if (!(req.headers.get("content-type") || "").toLowerCase().includes("multipart/form-data")) {
      return json({ ok: false, error: "MULTIPART_REQUIRED" }, 400);
    }
    const form = await req.formData();
    const token = clean(form.get("p_token"));
    const incoming = form.get("fileToUpload");
    if (!token || token.length > 256) return json({ ok: false, error: "UNAUTHORIZED" }, 401);
    if (!(incoming instanceof File)) return json({ ok: false, error: "FILE_REQUIRED" }, 400);
    if (!incoming.size) return json({ ok: false, error: "EMPTY_FILE" }, 400);
    if (incoming.size > MAX_FILE_SIZE) return json({ ok: false, error: "FILE_TOO_LARGE", max_bytes: MAX_FILE_SIZE }, 413);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) return json({ ok: false, error: "SERVER_CONFIG" }, 500);
    const sb = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

    const sessionHash = await sha256(token);
    const { data: session, error: sessionError } = await sb
      .from("admin_sessions")
      .select("admin_id, expires_at, revoked_at")
      .eq("session_hash", sessionHash)
      .maybeSingle();
    if (sessionError || !session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
      return json({ ok: false, error: "UNAUTHORIZED" }, 401);
    }

    const { data: admin, error: adminError } = await sb
      .from("admins")
      .select("username, role, active")
      .eq("id", session.admin_id)
      .maybeSingle();
    if (adminError || !admin?.active) return json({ ok: false, error: "UNAUTHORIZED" }, 401);
    if (String(admin.role).toUpperCase() !== "OWNER") return json({ ok: false, error: "OWNER_ONLY" }, 403);

    const filename = safeFilename(incoming.name);
    if (/\.(exe|scr|cpl|doc|docx|docm|dot|dotx|dotm|jar)$/i.test(filename)) {
      return json({ ok: false, error: "FILE_TYPE_BLOCKED" }, 415);
    }

    const catboxForm = new FormData();
    catboxForm.set("reqtype", "fileupload");
    catboxForm.set("fileToUpload", new File([incoming], filename, { type: incoming.type || "application/octet-stream" }));
    const upstream = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: catboxForm,
      headers: { accept: "text/plain" },
      signal: AbortSignal.timeout(90000),
    });
    const raw = (await upstream.text()).trim();
    if (!upstream.ok) {
      console.warn("Catbox upload rejected with HTTP", upstream.status);
      return json({ ok: false, error: "CATBOX_UPSTREAM", status: upstream.status }, 502);
    }
    let uploaded: URL;
    try { uploaded = new URL(raw); } catch { return json({ ok: false, error: "CATBOX_INVALID_RESPONSE" }, 502); }
    if (uploaded.protocol !== "https:" || !["files.catbox.moe", "catbox.moe"].includes(uploaded.hostname.toLowerCase())) {
      console.warn("Catbox returned an unexpected upload URL host");
      return json({ ok: false, error: "CATBOX_INVALID_RESPONSE" }, 502);
    }

    await sb.from("admin_audit").insert({
      action: "CATBOX_UPLOAD",
      actor: String(admin.username),
      target: filename,
      detail: { url: uploaded.href, size_bytes: incoming.size, content_type: incoming.type || null },
    });
    return json({ ok: true, url: uploaded.href, filename, size_bytes: incoming.size });
  } catch (e) {
    console.error("admin-catbox-upload request failed", e instanceof Error ? e.name : "unknown");
    return json({ ok: false, error: "UPLOAD_FAILED" }, 500);
  }
});
