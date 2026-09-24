import { requestUser } from "../_shared/auth.ts";
import { consumeRateLimit } from "../_shared/rate-limit.ts";
import { corsHeadersFor } from "../_shared/cors.ts";

function json(data: unknown, status = 200, req: Request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeadersFor(req), "Content-Type": "application/json" },
  });
}

const destinations = [
  "landing", "services", "agents", "templates", "pricing", "contact",
  "create", "extra", "gamer", "workflow"
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeadersFor(req) });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405, req);

  const user = await requestUser(req);
  if (!await consumeRateLimit(req, user?.id ?? null, user ? 20 : 8, user ? "huginn" : "huginn-public")) {
    return json({ ok: false, error: "RATE_LIMITED", message: "Túl sok kérés rövid idő alatt." }, 429, req);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
    const language = typeof body.language === "string" ? body.language.slice(0, 8) : "hu";
    if (!message) return json({ error: "INVALID_REQUEST" }, 400, req);

    const key = Deno.env.get("GROQ_API_KEY") || Deno.env.get("AI_API_KEY") || "";
    if (!user || !key) {
      return json({ ok: true, reply: "HUGINN a DESIGNLY guide-ja. A teljes AI concierge a bejelentkezett workspace-ben aktív.", action: "create" }, 200, req);
    }

    const system = [
      "You are HUGINN, the built-in DESIGNLY visitor guide and AI concierge.",
      "You are named after Odin's raven Huginn.",
      "Answer in the user's language. Be concise, useful and factual.",
      "DESIGNLY public workspace: CREATE, BRAND STUDIO, WEB ARCHITECT, CONTENT & GROWTH, IMAGE STUDIO, MEDIA STUDIO, SOCIAL STUDIO, TEMPLATE STUDIO, EXTRA DESIGN STUDIO, STREAMER & GAMER STUDIO, MERCH FACTORY, QA AGENT.",
      "Extra tools include business cards, invitations, flyers, posters, ads, brochures, menus, price lists, banners, presentations, tattoo patterns, planner and CNC CAM.",
      "Streamer/Gamer includes scenes, overlays, alerts, thumbnails, emotes, badges and merch.",
      "VYRON CORE coordinates background specialist agents.",
      "Navigation is / for landing and /app for the workspace; /app?tab=studio opens Extra Studio and /app?tab=gamer opens Streamer & Gamer.",
      "Never claim an action was completed unless it actually was.",
      "Never invent prices, integrations or capabilities.",
      "Return ONLY JSON: {reply:string, action:null|string}. action must be one of: " + destinations.join(", ") + ".",
    ].join("\n");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("DESIGNLY_GROQ_MODEL") || "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: system },
          { role: "user", content: "Language: " + language + "\nVisitor question: " + message },
        ],
        temperature: 0.2,
        max_tokens: 350,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return json({ ok: false, error: "AI_PROVIDER_ERROR" }, 502, req);

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    let parsed: unknown = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { reply: raw, action: null }; }

    const value = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
    const reply = typeof value.reply === "string" ? value.reply.slice(0, 1200) : "Kérdezz a DESIGNLY funkcióiról.";
    const action = typeof value.action === "string" && destinations.includes(value.action) ? value.action : null;
    return json({ ok: true, reply, action }, 200, req);
  } catch {
    return json({ ok: false, error: "HUGINN_ERROR" }, 500, req);
  }
});
