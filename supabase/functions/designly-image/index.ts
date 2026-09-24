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

/*
 * A tamogatott kepernyoaranyak es a hozzajuk tartozo valos pixelmeret.
 *
 * A korabbi valtozat fixen `2048 x 2048`-et irt vissza, fuggetlenul attol, hogy
 * a kliens 16:9-et vagy 9:16-ot kert. Ket problema volt ezzel:
 *   1. a metaadat hazudott a kep tenyleges mereterol;
 *   2. a `GamerStudio` asset-metaadatai pontos pixelmereteket igernek
 *      (1920x1080, 1280x720, 4500x5400), amit a felhasznalo igy nem kapott meg.
 *
 * Ez a tabla a kert aranyhoz tartozo dimenziot adja vissza. Az `aspect_ratio`
 * valasz-mezo jelzi, hogy a futo hivas tenylegesen milyen aranyt kapott — a
 * Qwen Space jelenleg nem fogad arany-parametert, ezert ez a mezo a KERT
 * aranyt rögziti, a `providerAspectRatioSupported` pedig azt, hogy a kép
 * tenylegesen ennek megfelelo-e. Amig az utobbi false, a felulet tudja, hogy a
 * kepet utolag kell vagning/letterboxolni.
 */
const RATIO_TABLE: Record<string, { w: number; h: number }> = {
  "1:1": { w: 2048, h: 2048 },
  "4:3": { w: 2048, h: 1536 },
  "3:4": { w: 1536, h: 2048 },
  "16:9": { w: 2048, h: 1152 },
  "9:16": { w: 1152, h: 2048 },
  "3:2": { w: 2048, h: 1365 },
  "2:3": { w: 1365, h: 2048 },
  "21:9": { w: 2048, h: 878 },
};

function compilePrompt(input: string, aspectRatio: string): string {
  const p = input.trim();
  const lower = p.toLowerCase();
  const rules: string[] = [
    "Create the exact scene requested by the user.",
    "Follow every explicitly requested object, quantity, relationship, action, setting, camera angle and style.",
    "Do not reinterpret, symbolize, replace or omit an explicitly requested subject.",
    "Object counts are exact: every requested object must be clearly visible and distinguishable.",
    "Do not introduce unrelated characters or subjects.",
    "Photorealistic, cinematic, coherent anatomy and natural lighting unless the user requests another style.",
    // Az aranyt a promptba is beirjuk: a modell igy legalabb komponalni tud ra,
    // meg ha a kimeneti vaszon fix is marad.
    `Composition must work in a ${aspectRatio} frame; keep the main subject inside that crop.`,
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
const rateBuckets = new Map<string, number[]>();
function rateLimited(req: Request): boolean {
  const key = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "guest").split(",")[0].trim().slice(0, 80);
  const now = Date.now();
  const recent = (rateBuckets.get(key) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 4) return true;
  recent.push(now);
  rateBuckets.set(key, recent);
  if (rateBuckets.size > 2_000) {
    for (const [k, times] of rateBuckets) {
      if (times.every((t) => now - t >= 60_000)) rateBuckets.delete(k);
    }
  }
  return false;
}

function toAbsoluteFileUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return HF_SPACE + value;
  return HF_SPACE + "/" + value;
}

async function runQwen(prompt: string): Promise<string> {
  const start = await fetch(`${HF_SPACE}/gradio_api/call/text_to_image`, {
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
      `${HF_SPACE}/gradio_api/call/text_to_image/${encodeURIComponent(eventId)}`,
      { headers: { Accept: "text/event-stream" } },
    );

    const stream = await result.text();
    if (!result.ok) {
      throw new Error(`Qwen Image eredmény lekérése sikertelen (${result.status}).`);
    }

    const lines = stream.split(/\r?\n/);
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;

      if (payload === "[DONE]") {
        throw new Error("A Qwen Image Space nem adott képet.");
      }

      try {
        const parsed = JSON.parse(payload);
        const value = Array.isArray(parsed) ? parsed[0] : parsed;

        if (typeof value === "string" && (value.startsWith("/") || value.startsWith("http"))) {
          return toAbsoluteFileUrl(value);
        }

        if (value && typeof value === "object") {
          const candidate = value.url ?? value.path;
          if (typeof candidate === "string") return toAbsoluteFileUrl(candidate);
          if (Array.isArray(candidate) && typeof candidate[0] === "string") return toAbsoluteFileUrl(candidate[0]);
        }

        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (typeof item === "string" && (item.startsWith("/") || item.startsWith("http"))) {
              return toAbsoluteFileUrl(item);
            }
            if (item && typeof item === "object" && typeof item.url === "string") {
              return toAbsoluteFileUrl(item.url);
            }
            if (item && typeof item === "object" && typeof item.path === "string") {
              return toAbsoluteFileUrl(item.path);
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (rateLimited(req)) return json({ error: "RATE_LIMITED", message: "Túl sok képgenerálási kérés rövid idő alatt." }, 429);

  let body: { prompt?: string; aspectRatio?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const prompt = (body.prompt ?? "").trim();
  if (prompt.length < 3) return json({ error: "A kép briefje legalább 3 karakter legyen." }, 400);
  if (prompt.length > 5000) return json({ error: "A brief legfeljebb 5000 karakter lehet." }, 400);

  const aspectRatio = (body.aspectRatio ?? "1:1").trim();
  const dims = RATIO_TABLE[aspectRatio];
  if (!dims) {
    return json({
      error: "UNSUPPORTED_ASPECT_RATIO",
      message: `Nem támogatott képarány: ${aspectRatio}`,
      supported: Object.keys(RATIO_TABLE),
    }, 400);
  }

  try {
    const imageUrl = await runQwen(compilePrompt(prompt, aspectRatio));
    return json({
      url: imageUrl,
      width: dims.w,
      height: dims.h,
      aspectRatio,
      /*
       * A Space jelenleg nem kap arany-parametert, tehat a kep negyzetes
       * vaszonon keszul. Ez a mezo mondja meg a kliensnek, hogy a keretre
       * vagni/letterboxolni kell. Amint a Space tamogatja az aranyt, ez
       * true-ra allitando — a felulet viselkedese ehhez igazodik.
       */
      providerAspectRatioSupported: false,
      description: "Qwen-Image-2.1 közvetlen Hugging Face ZeroGPU inference",
      model: "Qwen-Image-2.1",
      provider: "Hugging Face Space",
      steps: 28,
    });
  } catch (error) {
    console.error("designly-image qwen error", error);
    return json({
      error: error instanceof Error ? error.message : "Qwen Image generálás sikertelen.",
    }, 502);
  }
});
