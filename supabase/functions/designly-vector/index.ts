import { consumeCredits, ensureProfile, refundCredits, requestUser } from "../_shared/auth.ts";
import { consumeRateLimit } from "../_shared/rate-limit.ts";
import { corsHeadersFor } from "../_shared/cors.ts";

const json = (body: unknown, status = 200, req: Request) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), "Content-Type": "application/json" },
  });

function extractSvg(raw: string): string {
  const cleaned = raw.replace(/\```(?:svg|xml)?/gi, "").replace(/\```/g, "").trim();
  const start = cleaned.indexOf("<svg");
  const end = cleaned.lastIndexOf("</svg>");
  if (start < 0 || end < start) throw new Error("A vektor modell nem adott érvényes SVG-t.");
  const svg = cleaned.slice(start, end + 6).trim();
  if (svg.length > 120_000) throw new Error("Az SVG túl nagy.");
  if (/<script\b|<foreignObject\b|on[a-z]+\s*=|javascript:|data:text\/html/i.test(svg)) {
    throw new Error("Nem biztonságos SVG tartalom.");
  }
  if (!/^<svg\b[^>]*xmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(svg)) {
    throw new Error("Az SVG namespace hiányzik.");
  }
  return svg;
}

function buildSystem(): string {
  return [
    "You are DESIGNLY VECTOR CORE.",
    "Return ONLY one complete SVG document. No markdown, no explanation.",
    "Create a clean, production-oriented vector graphic from the user's brief.",
    "Use paths, shapes, groups, gradients and strokes; do not embed raster images.",
    "Do not use script, foreignObject, filters with external resources, HTML, iframe, image tags, external URLs or event handlers.",
    "Use a 1000x1000 viewBox unless the brief explicitly requires another canvas ratio.",
    "Keep the SVG editable and reasonably compact. Prefer geometric paths and reusable defs.",
    "If text is requested, use <text> elements but do not depend on external fonts.",
    "The result must work as a standalone .svg file in a browser and vector editor.",
  ].join(" ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersFor(req) });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405, req);

  const user = await requestUser(req);
  if (!user) return json({ error: "UNAUTHORIZED", message: "Jelentkezz be a vektorgeneráláshoz." }, 401, req);
  if (!await consumeRateLimit(req, user.id, 6, "vector")) {
    return json({ error: "RATE_LIMITED", message: "Túl sok vektorgenerálási kérés rövid idő alatt." }, 429, req);
  }

  let body: { prompt?: string; style?: string };
  try { body = await req.json(); } catch { return json({ error: "INVALID_JSON" }, 400, req); }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 5000) : "";
  const style = typeof body.style === "string" ? body.style.trim().slice(0, 500) : "clean logo";
  if (!prompt) return json({ error: "INVALID_REQUEST", message: "A vektor prompt kötelező." }, 400, req);

  const key = Deno.env.get("GROQ_API_KEY") || Deno.env.get("AI_API_KEY") || "";
  const model = Deno.env.get("DESIGNLY_GROQ_MODEL") || "openai/gpt-oss-120b";
  if (!key) return json({ error: "VECTOR_PROVIDER_NOT_CONFIGURED", message: "A vektor AI provider nincs beállítva." }, 503, req);

  const cost = Number(Deno.env.get("DESIGNLY_VECTOR_COST") || "3");
  await ensureProfile(user.id);
  const charged = await consumeCredits(user.id, cost, "designly-vector");
  if (!charged) return json({ error: "INSUFFICIENT_CREDITS", message: "Elfogytak a kreditek." }, 402, req);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.15,
        max_tokens: 8000,
        messages: [
          { role: "system", content: buildSystem() },
          { role: "user", content: "STYLE: " + style + "\nVECTOR BRIEF:\n" + prompt },
        ],
      }),
      signal: AbortSignal.timeout(90_000),
    });
    const rawText = await response.text();
    if (!response.ok) throw new Error("Groq HTTP " + response.status + ": " + rawText.slice(0, 400));
    const data = JSON.parse(rawText);
    const raw = data.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || !raw.trim()) throw new Error("A vektor modell üres választ adott.");

    const svg = extractSvg(raw);
    return json({ success: true, svg, model, provider: "Groq Vector Core", cost }, 200, req);
  } catch (error) {
    try { await refundCredits(user.id, cost, "designly-vector provider failure"); } catch (refundError) { console.error("vector refund failed", refundError); }
    return json({
      error: "VECTOR_GENERATION_FAILED",
      message: error instanceof Error ? error.message : "A vektorgenerálás sikertelen.",
    }, 502, req);
  }
});
