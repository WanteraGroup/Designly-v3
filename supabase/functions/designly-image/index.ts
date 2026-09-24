import { adminClient, consumeCredits, ensureProfile, refundCredits, requestUser } from "../_shared/auth.ts";
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

const ENGINE_URL = (Deno.env.get("DESIGNLY_IMAGE_ENGINE_URL") ?? "").replace(/\/$/, "");
const ENGINE_KEY = Deno.env.get("DESIGNLY_IMAGE_ENGINE_KEY") ?? "";
const RUNPOD_KEY = Deno.env.get("RUNPOD_API_KEY") ?? "";
const RUNPOD_ENDPOINT = (Deno.env.get("DESIGNLY_RUNPOD_ENDPOINT") ?? "https://api.runpod.ai/v2/qwen-image-t2i").replace(/\/$/, "");
const ALLOW_PUBLIC_FALLBACK = (Deno.env.get("DESIGNLY_IMAGE_ALLOW_PUBLIC_FALLBACK") ?? "false").toLowerCase() === "true";

type ProviderName = "private" | "runpod" | "public";
type NanoBananaEditResolution = "1k" | "2k" | "4k";

function providerChain(): ProviderName[] {
  const configured = (Deno.env.get("DESIGNLY_IMAGE_PROVIDERS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as ProviderName[];

  const installed: ProviderName[] = [];
  if (ENGINE_URL && ENGINE_KEY) installed.push("private");
  if (RUNPOD_KEY) installed.push("runpod");
  if (ALLOW_PUBLIC_FALLBACK) installed.push("public");

  if (configured.length) {
    const selected = installed.filter((p) => configured.includes(p));
    if (selected.length) return selected;
  }
  return installed;
}

const HF_SPACE = "https://akhaliq-qwen-image-2-1-workflow.hf.space";
const HF_FN = "text_to_image";
function toAbsoluteFileUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return HF_SPACE + value;
  return HF_SPACE + "/" + value;
}

const RATIO_SIZES: Record<string, [number, number]> = {
  "1:1": [1328, 1328],
  "4:3": [1472, 1104],
  "3:4": [1104, 1472],
  "16:9": [1664, 928],
  "9:16": [928, 1664],
  "3:2": [1584, 1056],
  "2:3": [1056, 1584],
  "21:9": [1664, 714],
};

async function runNanoBanana2Edit(images: string[], prompt: string, resolution: NanoBananaEditResolution, aspectRatio: string): Promise<{ bytes: ArrayBuffer; model: string; width: number; height: number; costUsd: number }> {
  if (!RUNPOD_KEY) throw new Error("RUNPOD_NOT_CONFIGURED");
  const endpoint = "https://api.runpod.ai/v2/google-nano-banana-2-edit/runsync";
  const timeoutMs = Number(Deno.env.get("DESIGNLY_IMAGE_TIMEOUT_MS") || "300000");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RUNPOD_KEY}` },
    body: JSON.stringify({
      input: {
        images,
        prompt,
        resolution,
        aspect_ratio: aspectRatio,
        output_format: "png",
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Nano Banana 2 Edit HTTP ${response.status}: ${text.slice(0, 500)}`);
  let payload: { status?: string; output?: { image_url?: string; cost?: number }; error?: string };
  try { payload = JSON.parse(text); } catch { throw new Error("Nano Banana 2 Edit response is not JSON"); }
  if (payload.status !== "COMPLETED" || !payload.output?.image_url) {
    throw new Error(`Nano Banana 2 Edit failed: ${payload.error ?? "no image returned"}`);
  }
  const image = await fetch(payload.output.image_url, { signal: AbortSignal.timeout(60_000) });
  if (!image.ok) throw new Error(`Nano Banana 2 Edit image download failed (${image.status})`);
  const [width, height] = RATIO_SIZES[aspectRatio] ?? RATIO_SIZES["1:1"];
  return {
    bytes: await image.arrayBuffer(),
    model: "Google Nano Banana 2 Edit",
    width,
    height,
    costUsd: Number(payload.output.cost ?? 0),
  };
}

async function runDesignlyEngine(prompt: string, aspectRatio: string): Promise<{ bytes: ArrayBuffer; model: string; width: number; height: number; seed: string }> {
  if (!ENGINE_URL || !ENGINE_KEY) throw new Error("DESIGNLY_ENGINE_NOT_CONFIGURED");
  const response = await fetch(ENGINE_URL + "/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Designly-Engine-Key": ENGINE_KEY },
    body: JSON.stringify({
      prompt,
      aspectRatio,
      steps: Number(Deno.env.get("DESIGNLY_IMAGE_STEPS") || "40"),
    }),
    signal: AbortSignal.timeout(Number(Deno.env.get("DESIGNLY_IMAGE_TIMEOUT_MS") || "300000")),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Designly Image Engine HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength) throw new Error("Designly Image Engine returned an empty image");
  const [width, height] = RATIO_SIZES[aspectRatio] ?? RATIO_SIZES["1:1"];
  return {
    bytes,
    model: response.headers.get("X-Designly-Model") || "Qwen-Image-2512",
    width,
    height,
    seed: response.headers.get("X-Designly-Seed") || "",
  };
}

async function storeGeneratedImage(userId: string, bytes: ArrayBuffer): Promise<string> {
  const admin = adminClient();
  const path = `${userId}/${crypto.randomUUID()}.png`;
  const { error } = await admin.storage.from("designly-generations").upload(path, bytes, {
    contentType: "image/png",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error("A generált kép mentése sikertelen: " + error.message);
  const { data } = admin.storage.from("designly-generations").getPublicUrl(path);
  if (!data.publicUrl) throw new Error("A generált kép publikus URL-je nem jött létre.");
  return data.publicUrl;
}

async function runRunpod(prompt: string, aspectRatio: string): Promise<{ bytes: ArrayBuffer; model: string; width: number; height: number; seed: string }> {
  if (!RUNPOD_KEY) throw new Error("RUNPOD_NOT_CONFIGURED");
  const [width, height] = RATIO_SIZES[aspectRatio] ?? RATIO_SIZES["1:1"];
  const timeoutMs = Number(Deno.env.get("DESIGNLY_IMAGE_TIMEOUT_MS") || "300000");
  const size = `${width}*${height}`;

  const response = await fetch(RUNPOD_ENDPOINT + "/runsync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RUNPOD_KEY}`,
    },
    body: JSON.stringify({
      input: {
        prompt,
        negative_prompt: "low quality, blurry, distorted anatomy, malformed hands, duplicate objects, unreadable text",
        size,
        seed: Math.floor(Math.random() * 2 ** 31),
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`RunPod HTTP ${response.status}: ${text.slice(0, 500)}`);

  let payload: { status?: string; id?: string; output?: unknown; error?: string };
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`RunPod response is not JSON: ${text.slice(0, 300)}`);
  }

  if (payload.status && payload.status !== "COMPLETED") {
    if (!payload.id) throw new Error(`RunPod status ${payload.status} without job id`);
    return await pollRunpod(payload.id, width, height, timeoutMs);
  }

  return await extractRunpodImage(payload, width, height);
}

async function extractRunpodImage(
  payload: { output?: unknown; status?: string; error?: string },
  width: number,
  height: number,
): Promise<{ bytes: ArrayBuffer; model: string; width: number; height: number; seed: string }> {
  if (payload.status === "FAILED") throw new Error(`RunPod job failed: ${payload.error ?? "unknown error"}`);

  const output = Array.isArray(payload.output) ? payload.output[0] : payload.output;
  const imageUrl = output && typeof output === "object"
    ? ((output as Record<string, unknown>).image_url ?? (output as Record<string, unknown>).image)
    : undefined;

  if (typeof imageUrl !== "string" || !imageUrl) {
    throw new Error("RunPod did not return an image URL");
  }

  const image = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) });
  if (!image.ok) throw new Error(`RunPod image download failed (${image.status})`);

  return {
    bytes: await image.arrayBuffer(),
    model: "Qwen Image (RunPod)",
    width,
    height,
    seed: output && typeof output === "object"
      ? String((output as Record<string, unknown>).seed ?? "")
      : "",
  };
}

async function pollRunpod(
  jobId: string,
  width: number,
  height: number,
  timeoutMs: number,
): Promise<{ bytes: ArrayBuffer; model: string; width: number; height: number; seed: string }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await fetch(`${RUNPOD_ENDPOINT}/status/${encodeURIComponent(jobId)}`, {
      headers: { Authorization: `Bearer ${RUNPOD_KEY}` },
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`RunPod status HTTP ${response.status}: ${text.slice(0, 300)}`);
    let data: { status?: string; output?: unknown; error?: string };
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`RunPod status is not JSON: ${text.slice(0, 300)}`);
    }
    if (data.status === "FAILED") throw new Error(`RunPod job failed: ${data.error ?? "unknown error"}`);
    if (data.status !== "COMPLETED") continue;
    return await extractRunpodImage(data, width, height);
  }
  throw new Error("RunPod generation exceeded the configured timeout.");
}

async function runQwen(prompt: string): Promise<string> {
  const start = await fetch(`${HF_SPACE}/gradio_api/call/${HF_FN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [prompt, 28] }),
    signal: AbortSignal.timeout(30_000),
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

  const result = await fetch(
    `${HF_SPACE}/gradio_api/call/${HF_FN}/${encodeURIComponent(eventId)}`,
    {
      headers: { Accept: "text/event-stream" },
      signal: AbortSignal.timeout(115_000),
    },
  );

  const stream = await result.text();
  if (!result.ok) {
    throw new Error(`Qwen Image eredmény lekérése sikertelen (${result.status}): ${stream.slice(0, 400)}`);
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
      throw new Error(`Qwen Image generation failed: ${payload.slice(0, 400)}`);
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
          const candidate = (item as Record<string, unknown>).url ?? (item as Record<string, unknown>).path;
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

  throw new Error("A Qwen Image generátor nem küldött complete eseményt képpel.");
}

function classifyProviderError(error: unknown): { code: string; message: string } {
  const msg = error instanceof Error ? error.message : String(error);
  if (/\(429\)/.test(msg) || /quota|rate limit|too many requests|anonymous/i.test(msg)) {
    return {
      code: "PROVIDER_QUOTA",
      message: "A képgenerátor pillanatnyi kvótája betelt. Várj, majd próbáld újra.",
    };
  }
  if (/\(5\d\d\)/.test(msg)) {
    return {
      code: "PROVIDER_UNAVAILABLE",
      message: "A képgenerátor szolgáltatása pillanatnyilag nem válaszol. Próbáld újra később.",
    };
  }
  if (/timed out|timeout|AbortError|túllépte/i.test(msg)) {
    return { code: "PROVIDER_TIMEOUT", message: "A generálás túllépte az időkeretet. Próbáld újra." };
  }
  if (/nem adott képet|complete eseményt|generation failed|did not return an image/i.test(msg)) {
    return { code: "PROVIDER_EMPTY", message: "A képgenerátor nem adott vissza képet erre a briefre." };
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

  let body: { prompt?: string; aspectRatio?: string; mode?: string; images?: unknown; resolution?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const prompt = (body.prompt ?? "").trim();
  const requestedAspectRatio = (body.aspectRatio ?? "1:1").trim();
  const allowedRatios = new Set(["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9", "4:5"]);
  if (!allowedRatios.has(requestedAspectRatio)) return json({ error: "Nem támogatott képarány: " + requestedAspectRatio }, 400);
  const mode = body.mode === "edit" ? "edit" : "generate";
  if (mode === "edit") {
    if (!RUNPOD_KEY) return json({ error: "RUNPOD_NOT_CONFIGURED", message: "A Nano Banana 2 Edithez nincs beállítva RunPod API-kulcs." }, 503);
    if (!Array.isArray(body.images) || body.images.length < 1 || body.images.length > 14 || body.images.some((x) => typeof x !== "string")) {
      return json({ error: "INVALID_EDIT_IMAGES", message: "Az AI Edit 1–14 képet fogad." }, 400);
    }
    const imageUrls = body.images as string[];
    const supabaseOrigin = new URL(Deno.env.get("SUPABASE_URL") ?? "").origin;
    if (imageUrls.some((url) => {
      try { return new URL(url).origin !== supabaseOrigin; } catch { return true; }
    })) {
      return json({ error: "INVALID_EDIT_IMAGE_URL", message: "Csak a Designly saját Storage URL-je használható referencia-képként." }, 400);
    }
    const resolution = body.resolution === "2k" || body.resolution === "4k" ? body.resolution : "1k";
    const editCost = resolution === "4k"
      ? Number(Deno.env.get("DESIGNLY_NANO_BANANA_2_EDIT_COST_4K") || "20")
      : resolution === "2k"
        ? Number(Deno.env.get("DESIGNLY_NANO_BANANA_2_EDIT_COST_2K") || "15")
        : Number(Deno.env.get("DESIGNLY_NANO_BANANA_2_EDIT_COST_1K") || "10");
    const editPrompt = prompt;
    await ensureProfile(user.id);
    const chargedEdit = await consumeCredits(user.id, editCost, "designly-image:nano-banana-2-edit");
    if (!chargedEdit) return json({ error: "INSUFFICIENT_CREDITS", message: "Elfogytak a kreditek." }, 402);
    try {
      const generated = await runNanoBanana2Edit(imageUrls, editPrompt, resolution, requestedAspectRatio);
      const imageUrl = await storeGeneratedImage(user.id, generated.bytes);
      return json({
        url: imageUrl,
        width: generated.width,
        height: generated.height,
        requestedAspectRatio,
        outputAspectRatio: requestedAspectRatio,
        description: "Google Nano Banana 2 Edit — RunPod Public Endpoint",
        model: generated.model,
        provider: "RunPod",
        resolution,
        providerCostUsd: generated.costUsd,
      });
    } catch (error) {
      try { await refundCredits(user.id, editCost, "designly-image:nano-banana-2-edit refund"); } catch (refundError) { console.error("edit refund failed", refundError); }
      console.error("Nano Banana 2 Edit error", error);
      const { code, message } = classifyProviderError(error);
      return json({ error: code, message }, 502);
    }
  }


  if (prompt.length < 3) return json({ error: "A kép briefje legalább 3 karakter legyen." }, 400);
  if (prompt.length > 5000) return json({ error: "A brief legfeljebb 5000 karakter lehet." }, 400);

  const cost = Number(Deno.env.get("DESIGNLY_IMAGE_COST") || "4");
  await ensureProfile(user.id);
  const charged = await consumeCredits(user.id, cost, "designly-image");
  if (!charged) return json({ error: "INSUFFICIENT_CREDITS", message: "Elfogytak a kreditek." }, 402);

  try {
    const compiledPrompt = compilePrompt(prompt);
    const chain = providerChain();
    let lastError: unknown;

    if (!chain.length) {
      throw new Error("DESIGNLY_IMAGE_NO_PROVIDER");
    }

    for (const provider of chain) {
      try {
        if (provider === "private") {
          const generated = await runDesignlyEngine(compiledPrompt, requestedAspectRatio);
          const imageUrl = await storeGeneratedImage(user.id, generated.bytes);
          return json({
            url: imageUrl,
            width: generated.width,
            height: generated.height,
            requestedAspectRatio,
            outputAspectRatio: requestedAspectRatio,
            description: "Designly saját GPU Image Engine",
            model: generated.model,
            provider: "Designly Image Engine",
            seed: generated.seed || undefined,
            steps: Number(Deno.env.get("DESIGNLY_IMAGE_STEPS") || "40"),
          });
        }

        if (provider === "runpod") {
          const generated = await runRunpod(compiledPrompt, requestedAspectRatio);
          const imageUrl = await storeGeneratedImage(user.id, generated.bytes);
          return json({
            url: imageUrl,
            width: generated.width,
            height: generated.height,
            requestedAspectRatio,
            outputAspectRatio: requestedAspectRatio,
            description: "Qwen Image — RunPod Public Endpoint",
            model: generated.model,
            provider: "RunPod",
            seed: generated.seed || undefined,
          });
        }

        const imageUrl = await runQwen(compiledPrompt);
        return json({
          url: imageUrl,
          width: 2048,
          height: 2048,
          requestedAspectRatio,
          outputAspectRatio: "1:1",
          description: "Ideiglenes publikus Qwen fallback",
          model: "Qwen-Image-2.1",
          provider: "Hugging Face public fallback",
          steps: 28,
        });
      } catch (providerError) {
        lastError = providerError;
        console.error(`designly-image provider "${provider}" failed`, providerError);
      }
    }

    throw lastError ?? new Error("DESIGNLY_IMAGE_NO_PROVIDER");
  } catch (error) {
    try {
      await refundCredits(user.id, cost, "designly-image provider/runtime refund");
    } catch (refundError) {
      console.error("image refund failed", refundError);
    }
    console.error("designly-image provider error", error);
    const { code, message } = classifyProviderError(error);
    return json({ error: code, message }, 502);
  }
});
