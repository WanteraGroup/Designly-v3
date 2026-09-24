import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";

const json = (data: unknown, status = 200, req: Request) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeadersFor(req), "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeadersFor(req) });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405, req);

  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown")
    .split(",")[0].trim().slice(0, 100);

  try {
    const body = await req.json().catch(() => ({}));
    const formId = typeof body.formId === "string" ? body.formId.trim().slice(0, 80) : "";
    const siteTitle = typeof body.siteTitle === "string" ? body.siteTitle.trim().slice(0, 200) : "";
    const website = typeof body.website === "string" ? body.website.trim() : "";
    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim().slice(0, 500) : "";
    const data = body.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data : {};

    if (website) return json({ ok: true, message: "Köszönjük." }, 200, req);
    if (!formId) return json({ error: "INVALID_FORM" }, 400, req);

    const db = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const allowed = await db.rpc("consume_designly_rate_limit", {
      p_key: "form:" + ip,
      p_limit: 5,
      p_window_seconds: 60,
    });
    if (allowed.error) return json({ error: "RATE_LIMIT_UNAVAILABLE" }, 503, req);
    if (allowed.data !== true) return json({ error: "RATE_LIMITED", message: "Túl sok üzenet. Próbáld később." }, 429, req);

    const payload = JSON.parse(JSON.stringify(data).slice(0, 12000));
    const { error } = await db.from("designly_form_submissions").insert({
      form_id: formId,
      site_title: siteTitle,
      payload,
      source_url: sourceUrl,
    });
    if (error) throw error;

    return json({ ok: true, message: "Az üzenetet sikeresen elküldtük." }, 200, req);
  } catch (error) {
    console.error("designly-form-submit", error);
    return json({ error: "SUBMISSION_FAILED", message: "Az üzenetet nem sikerült elküldeni." }, 500, req);
  }
});
