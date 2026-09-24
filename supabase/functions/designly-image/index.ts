import { adminClient, consumeCredits, ensureProfile, refundCredits, requestUser } from "../_shared/auth.ts";
import { consumeRateLimit } from "../_shared/rate-limit.ts";
import { corsHeadersFor } from "../_shared/cors.ts";

const json = (body: unknown, status = 200, req: Request) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), "Content-Type": "application/json" },
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

// The RunPod qwen-image-t2i endpoint validates size against the model's
// fixed Qwen Image presets. It does not accept arbitrary/custom dimensions.
// Keep all Studio ratios usable by mapping unsupported ratios to the nearest
// supported preset; the response still reports the requested ratio separately.
const RATIO_SIZES: Record<string, [number, number]> = {
  "1:1": [1328, 1328],
  "4:3": [1472, 1104],
  "3:4": [1104, 1472],
  "16:9": [1664, 928],
  "9:16": [928, 1664],

  // RunPod/Qwen fixed-preset compatibility mappings.
  "3:2": [1472, 1104],
  "2:3": [1104, 1472],
  "21:9": [1664, 928],
  "4:5": [1104, 1472],
};

/*
 * A RunPod Public Endpoint valaszabol a kep URL-je `output.result` kulcs alatt
 * jon, nem `image` vagy `image_url` neven. A playground valaszabol ellenorizve
 * (2026-09-24):
 *
 *   {"delayTime":484,"executionTime":17903,"id":"sync-...",
 *    "output":{"cost":0.02,"result":"https://...jpeg"},"status":"COMPLETED"}
 *
 * A korabbi valtozat csak az `image_url` es `image` kulcsot kereste, ezert a
 * `result`-ot nem talalta, es "RunPod did not return an image URL" hibat dobott
 * — amit a vegpont 502-nek adott tovabb. Ez volt az oka, hogy a Studio nem
 * tudott kepet generalni.
 *
 * A tobbi kulcsnev mas RunPod modellekhez kell (FLUX, Nano Banana), ezert
 * mindegyik marad az unios keresben.
 */
function extractImageUrl(output: unknown): string {
  const first = Array.isArray(output) ? output[0] : output;
  if (!first || typeof first !== "object") return "";
  const o = first as Record<string, unknown>;
  for (const key of ["result", "image", "image_url", "url"]) {
    const value = o[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
      return value[0].trim();
    }
  }
  return "";
}

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
  let payload: { status?: string; output?: unknown; error?: string };
  try { payload = JSON.parse(text); } catch { throw new Error("Nano Banana 2 Edit response is not JSON"); }
  if (payload.status !== "COMPLETED") {
    throw new Error(`Nano Banana 2 Edit failed: ${payload.error ?? payload.status ?? "unknown"}`);
  }
  const imageUrl = extractImageUrl(payload.output);
  if (!imageUrl) throw new Error("Nano Banana 2 Edit did not return an image URL");
  const image = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) });
  if (!image.ok) throw new Error(`Nano Banana 2 Edit image download failed (${image.status})`);
  const [width, height] = RATIO_SIZES[aspectRatio] ?? RATIO_SIZES["1:1"];
  const cost = (payload.output && typeof payload.output === "object")
    ? Number((payload.output as Record<string, unknown>).cost ?? 0)
    : 0;
  return {
    bytes: await image.arrayBuffer(),
    model: "Google Nano Banana 2 Edit",
    width,
    height,
    costUsd: cost,
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
        enable_safety_checker: true,
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

  const imageUrl = extractImageUrl(payload.output);
  if (!imageUrl) {
    throw new Error(`RunPod did not return an image URL: ${JSON.stringify(payload.output).slice(0, 300)}`);
  }

  const image = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) });
  if (!image.ok) throw new Error(`RunPod image download failed (${image.status})`);

  const output = Array.isArray(payload.output) ? payload.output[0] : payload.output;
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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersFor(req) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, req);

  const user = await requestUser(req);
  if (!user) return json({ error: "UNAUTHORIZED", message: "Jelentkezz be a képgeneráláshoz." }, 401, req);
  if (!await consumeRateLimit(req, user.id, 4, "image")) {
    return json({ error: "RATE_LIMITED", message: "Túl sok képgenerálási kérés rövid idő alatt." }, 429, req);
  }

  let body: { prompt?: string; aspectRatio?: string; edit?: boolean; images?: string[]; resolution?: NanoBananaEditResolution };
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400, req);
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 4000) : "";
  const aspectRatio = typeof body.aspectRatio === "string" ? body.aspectRatio.trim() : "1:1";
  const wantsEdit = body.edit === true && Array.isArray(body.images) && body.images.length > 0;
  const resolution: NanoBananaEditResolution = body.resolution === "2k" || body.resolution === "4k" ? body.resolution : "1k";

  if (!prompt) return json({ error: "INVALID_REQUEST", message: "A prompt kötelező." }, 400, req);

  const chain = providerChain();
  if (chain.length === 0) {
    return json({
      error: "IMAGE_PROVIDER_NOT_CONFIGURED",
      message: "Nincs képgenerátor provider beállítva.",
    }, 503, req);
  }

  const cost = Number(Deno.env.get(wantsEdit ? "DESIGNLY_IMAGE_EDIT_COST" : "DESIGNLY_IMAGE_COST") || "2");
  await ensureProfile(user.id);
  const charged = await consumeCredits(user.id, cost, wantsEdit ? "designly-image-edit" : "designly-image");
  if (!charged) return json({ error: "INSUFFICIENT_CREDITS", message: "Elfogytak a kreditek." }, 402, req);

  const errors: string[] = [];
  for (const provider of chain) {
    try {
      let bytes: ArrayBuffer;
      let model: string;
      let width: number;
      let height: number;

      if (wantsEdit) {
        const result = await runNanoBanana2Edit(body.images as string[], prompt, resolution, aspectRatio);
        bytes = result.bytes; model = result.model; width = result.width; height = result.height;
      } else if (provider === "private") {
        const result = await runDesignlyEngine(compilePrompt(prompt), aspectRatio);
        bytes = result.bytes; model = result.model; width = result.width; height = result.height;
      } else if (provider === "runpod") {
        const result = await runRunpod(compilePrompt(prompt), aspectRatio);
        bytes = result.bytes; model = result.model; width = result.width; height = result.height;
      } else {
        const url = await runQwen(compilePrompt(prompt));
        const image = await fetch(url, { signal: AbortSignal.timeout(60_000) });
        if (!image.ok) throw new Error(`Qwen image download failed (${image.status})`);
        bytes = await image.arrayBuffer();
        model = "Qwen Image (public Space)";
        const fallbackSize = RATIO_SIZES[aspectRatio] ?? RATIO_SIZES["1:1"];
        width = fallbackSize[0]; height = fallbackSize[1];
      }

      const url = await storeGeneratedImage(user.id, bytes);
      return json({
        url,
        model,
        provider: provider === "private" ? "Designly Image Engine" : provider === "runpod" ? "RunPod" : "Hugging Face public fallback",
        width,
        height,
        requestedAspectRatio: aspectRatio,
        outputAspectRatio: `${width}:${height}`,
        cost,
      }, 200, req);
    } catch (error) {
      const classified = classifyProviderError(error);
      errors.push(`${provider}: ${classified.code}`);
      console.error("designly-image provider failed", provider, error);
    }
  }

  try { await refundCredits(user.id, cost, "designly-image all providers failed"); } catch (refundError) { console.error("image refund failed", refundError); }
  const classified = classifyProviderError(new Error(errors.join(" | ")));
  return json({ error: classified.code, message: classified.message, providers: errors }, 502, req);
});
