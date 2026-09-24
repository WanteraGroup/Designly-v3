import { consumeCredits, ensureProfile, refundCredits, requestUser } from "../_shared/auth.ts";
import { consumeRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function compilePrompt(input: string): string {
  const p = input.trim();
  const lower = p.toLowerCase();
  const rules: string[] = [
    "Create the exact scene requested by the user.",
    "Follow every explicitly requested object, quantity, relationship, action, setting, camera angle and style.",
    "Do not reinterpret, symbolize, replace or omit an explicitly requested subject.",
    "Object counts are exact: every requested object must be clearly visible and distinguishable.",
    "Do not introduce unrelated characters or subjects.",
    "Photorealistic, cinematic, coherent anatomy and natural lighting unless the user requests another style.",
  ];

  if (lower.includes("odin holl") || lower.includes("odin hollói") || lower.includes("odin holló")) {
    rules.push(
      "CRITICAL SUBJECT: EXACTLY TWO black ravens, Hugin and Munin.",
      "The two ravens are the main subjects and both must be clearly visible.",
      "Do NOT depict Odin as a human portrait, warrior, statue or face unless the user explicitly asks for Odin himself.",
      "Do NOT replace the ravens with a person, god, symbol, logo, eagle or other bird.",
    );
  }

  if (/(kettő|két|two|2)\s+(holló|raven)/i.test(p)) {
    rules.push("EXACT COUNT: two ravens only — no more and no fewer.");
  }

  return [
    "DESIGNLY IMAGE GENERATION CONTRACT",
    ...rules.map((x) => "- " + x),
    "",
    "USER BRIEF:",
    p,
    "",
    "Generate the requested visual literally and precisely.",
  ].join("\n");
}

const HF_SPACE = "https://akhaliq-qwen-image-2-1-workflow.hf.space";
const HF_FN = "text_to_image";
function toAbsoluteFileUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return HF_SPACE + value;
  return HF_SPACE + "/" + value;
}

async function runQwen(prompt: string): Promise<string> {
  const start = await fetch(`${HF_SPACE}/gradio_api/call/${HF_FN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [prompt, 28] }),
  });

  const startText = await start.text();
  if (!start.ok) {
    throw new Error(`Qwen Image Space indítása sikertelen (${start.status}): ${startText.slice(0, 400)}`);
  }

  let eventId: string | undefined;
  try {
    eventId = JSON.parse(startText).event_id;
  } catch {
    const match = startText.match(/"event_id"\s*:\s*"([^"]+)"/);
    eventId = match?.[1];
  }
  if (!eventId) throw new Error("A Qwen Image Space nem adott event_id értéket.");

  const deadline = Date.now() + 110_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const result = await fetch(
      `${HF_SPACE}/gradio_api/call/${HF_FN}/${encodeURIComponent(eventId)}`,
      { headers: { Accept: "text/event-stream" } },
    );

    const stream = await result.text();
    if (!result.ok) {
      throw new Error(`Qwen Image eredmény lekérése sikertelen (${result.status}).`);
    }

    const lines = stream.split(/\r?\n/);
    let eventName = "";
    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
        continue;
      }
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;

      if (eventName === "error") {
        throw new Error("Qwen Image generation failed.");
      }
      if (eventName !== "complete") continue;

      try {
        const parsed = JSON.parse(payload);
        const candidates = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of candidates) {
          if (typeof item === "string" && (item.startsWith("/") || item.startsWith("http"))) {
            return toAbsoluteFileUrl(item);
          }
          if (item && typeof item === "object") {
            const candidate = item.url ?? item.path;
            if (typeof candidate === "string") return toAbsoluteFileUrl(candidate);
            if (Array.isArray(candidate) && typeof candidate[0] === "string") {
              return toAbsoluteFileUrl(candidate[0]);
            }
          }
        }
      } catch {
        // Ignore non-JSON SSE lines such as progress messages.
      }
    }
  }

  throw new Error("A Qwen Image generálás túllépte a 110 másodperces várakozási időt.");
}

async function runQwenWithRetry(prompt: string): Promise<string> {
  let lastError: unknown;
  for (const wait of [0, 4000, 8000]) {
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    try {
      return await runQwen(prompt);
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      if (!/\(5\d\d\)|Space|event_id/i.test(msg)) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function classifyProviderError(error: unknown): { code: string; message: string } {
  const msg = error instanceof Error ? error.message : String(error);
  if (/\(5\d\d\)/.test(msg)) {
    return { code: "PROVIDER_UNAVAILABLE", message: "A képgenerátor átmenetileg nem elérhető. Próbáld újra fél perc múlva." };
  }
  if (/várakozási időt|túllépte/i.test(msg)) {
    return { code: "PROVIDER_TIMEOUT", message: "A generálás túllépte az időkeretet. Próbáld újra." };
  }
  if (/nem adott képet|\[DONE\]|generation failed/i.test(msg)) {
    return { code: "PROVIDER_EMPTY", message: "A generátor nem adott képet erre a briefre. Fogalmazd át." };
  }
  return { code: "PROVIDER_ERROR", message: "A képgenerálás nem sikerült." };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const user = await requestUser(req);
  if (!user) return json({ error: "UNAUTHORIZED", message: "Jelentkezz be a képgeneráláshoz." }, 401);
  if (!await consumeRateLimit(req, user.id, 4, "image")) {
    return json({ error: "RATE_LIMITED", message: "Túl sok képgenerálási kérés rövid idő alatt." }, 429);
  }

  let body: { prompt?: string; aspectRatio?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const prompt = (body.prompt ?? "").trim();
  const requestedAspectRatio = (body.aspectRatio ?? "1:1").trim();
  if (prompt.length < 3) return json({ error: "A kép briefje legalább 3 karakter legyen." }, 400);
  if (prompt.length > 5000) return json({ error: "A brief legfeljebb 5000 karakter lehet." }, 400);

  const allowedRatios = new Set(["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"]);
  if (!allowedRatios.has(requestedAspectRatio)) {
    return json({ error: "Nem támogatott képarány: " + requestedAspectRatio }, 400);
  }

  const cost = Number(Deno.env.get("DESIGNLY_IMAGE_COST") || "4");
  await ensureProfile(user.id);
  const charged = await consumeCredits(user.id, cost, "designly-image");
  if (!charged) return json({ error: "INSUFFICIENT_CREDITS", message: "Elfogytak a kreditek." }, 402);

  try {
    const imageUrl = await runQwenWithRetry(compilePrompt(prompt));
    return json({
      url: imageUrl,
      width: 2048,
      height: 2048,
      requestedAspectRatio,
      outputAspectRatio: "1:1",
      description: "Qwen-Image-2.1 közvetlen Hugging Face ZeroGPU inference",
      model: "Qwen-Image-2.1",
      provider: "Hugging Face Space",
      steps: 28,
    });
  } catch (error) {
    try {
      await refundCredits(user.id, cost, "designly-image provider/runtime refund");
    } catch (refundError) {
      console.error("image refund failed", refundError);
    }
    console.error("designly-image qwen error", error);
    const { code, message } = classifyProviderError(error);
    return json({ error: code, message }, 502);
  }
});
