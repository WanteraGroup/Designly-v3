import { adminClient, consumeCredits, ensureProfile, refundCredits, requestUser } from "../_shared/auth.ts";
import { consumeRateLimit } from "../_shared/rate-limit.ts";
import { corsHeadersFor } from "../_shared/cors.ts";

type VideoProvider = "wan" | "kling";
type VideoMode = "t2v" | "i2v";
type RunpodStatus = "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

const RUNPOD_KEY = Deno.env.get("RUNPOD_API_KEY") ?? "";
const WAN_ENDPOINT = (Deno.env.get("DESIGNLY_WAN_VIDEO_ENDPOINT") ?? "https://api.runpod.ai/v2/wan-2-2-i2v-720").replace(/\/$/, "");
const WAN_T2V_ENDPOINT = (Deno.env.get("DESIGNLY_WAN_T2V_VIDEO_ENDPOINT") ?? "https://api.runpod.ai/v2/wan-2-2-t2v-720").replace(/\/$/, "");
const KLING_ENDPOINT = (Deno.env.get("DESIGNLY_KLING_VIDEO_ENDPOINT") ?? "https://api.runpod.ai/v2/kling-v2-1-i2v-pro").replace(/\/$/, "");
const VIDEO_COST = Number(Deno.env.get("DESIGNLY_VIDEO_COST") || "0");
const MAX_PROMPT_LENGTH = 2500;
const NEGATIVE_PROMPT = "blurry, low quality, distorted anatomy, flicker, jitter, deformed objects, text artifacts";

const json = (body: unknown, status = 200, req?: Request) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...(req ? corsHeadersFor(req) : {}), "Content-Type": "application/json" },
  });

function parseProvider(value: unknown): VideoProvider {
  return value === "kling" ? "kling" : "wan";
}

function endpointFor(provider: VideoProvider, mode: VideoMode = "i2v"): string {
  if (mode === "t2v") return WAN_T2V_ENDPOINT;
  return provider === "kling" ? KLING_ENDPOINT : WAN_ENDPOINT;
}

function modelFor(provider: VideoProvider, mode: VideoMode = "i2v"): string {
  if (mode === "t2v") return "alibaba/wan-2.2-t2v-720";
  return provider === "kling"
    ? "kwaivgi/kling-v2.1-i2v-pro"
    : "alibaba/wan-2.2-i2v-720";
}

function extractVideoUrl(output: unknown): string {
  const first = Array.isArray(output) ? output[0] : output;
  if (!first || typeof first !== "object") return "";
  const record = first as Record<string, unknown>;
  for (const key of ["video_url", "url", "result"]) {
    const value = record[key];
    if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) return value.trim();
    if (Array.isArray(value) && typeof value[0] === "string" && /^https?:\/\//i.test(value[0].trim())) {
      return value[0].trim();
    }
  }
  return "";
}

function extractCost(output: unknown): number {
  const first = Array.isArray(output) ? output[0] : output;
  if (!first || typeof first !== "object") return 0;
  const value = Number((first as Record<string, unknown>).cost ?? 0);
  return Number.isFinite(value) ? value : 0;
}

async function runRunpod(provider: VideoProvider, mode: VideoMode, imageUrl: string | undefined, prompt: string, duration: 5 | 10) {
  if (!RUNPOD_KEY) throw new Error("RUNPOD_NOT_CONFIGURED");

  if (mode === "t2v" && provider !== "wan") {
    throw new Error("T2V supports the Wan 2.2 provider only.");
  }

  const input = mode === "t2v"
    ? {
        prompt,
        negative_prompt: NEGATIVE_PROMPT,
        size: "1280*720",
        num_inference_steps: 30,
        guidance: 5,
        duration,
        flow_shift: 5,
        seed: -1,
        enable_prompt_optimization: false,
        enable_safety_checker: true,
      }
    : provider === "kling"
      ? {
          prompt,
          negative_prompt: NEGATIVE_PROMPT,
          image: imageUrl,
          guidance_scale: 0.5,
          duration,
          enable_safety_checker: true,
        }
      : {
          prompt,
          negative_prompt: NEGATIVE_PROMPT,
          image: imageUrl,
          size: "1280*720",
          num_inference_steps: 30,
          guidance: 5,
          duration,
          flow_shift: 5,
          seed: -1,
          enable_prompt_optimization: false,
          enable_safety_checker: true,
        };

  const response = await fetch(endpointFor(provider, mode) + "/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + RUNPOD_KEY,
    },
    body: JSON.stringify({ input }),
    signal: AbortSignal.timeout(30_000),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error("RunPod " + provider + " " + mode + " HTTP " + response.status + ": " + text.slice(0, 700));
  }

  let payload: { id?: string; status?: RunpodStatus; output?: unknown; error?: string };
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("RunPod " + provider + " " + mode + " response is not JSON: " + text.slice(0, 300));
  }

  if (!payload.id) {
    throw new Error("RunPod " + provider + " " + mode + " response did not include a job id: " + text.slice(0, 500));
  }

  return {
    jobId: payload.id,
    status: payload.status || "IN_QUEUE",
    model: modelFor(provider, mode),
    cost: extractCost(payload.output),
  };
}

async function getRunpodStatus(provider: VideoProvider, mode: VideoMode, jobId: string) {
  if (!RUNPOD_KEY) throw new Error("RUNPOD_NOT_CONFIGURED");
  if (!/^[A-Za-z0-9._:-]{8,160}$/.test(jobId)) throw new Error("INVALID_JOB_ID");

  const response = await fetch(
    endpointFor(provider, mode) + "/status/" + encodeURIComponent(jobId),
    {
      headers: { Authorization: "Bearer " + RUNPOD_KEY },
      signal: AbortSignal.timeout(30_000),
    },
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error("RunPod " + provider + " status HTTP " + response.status + ": " + text.slice(0, 700));
  }

  try {
    return JSON.parse(text) as {
      id?: string;
      status?: RunpodStatus;
      output?: unknown;
      error?: string;
    };
  } catch {
    throw new Error("RunPod " + provider + " status is not JSON: " + text.slice(0, 300));
  }
}

async function storeVideo(userId: string, provider: VideoProvider, jobId: string, video: Response): Promise<string> {
  const bytes = await video.arrayBuffer();
  if (!bytes.byteLength) throw new Error("RunPod returned an empty video.");
  const contentType = video.headers.get("content-type")?.split(";")[0] || "video/mp4";
  const admin = adminClient();
  const path = userId + "/videos/" + provider + "-" + jobId + ".mp4";
  const { error } = await admin.storage.from("designly-generations").upload(path, bytes, {
    contentType,
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error("A generált videó mentése sikertelen: " + error.message);
  const { data } = admin.storage.from("designly-generations").getPublicUrl(path);
  if (!data.publicUrl) throw new Error("A generált videó publikus URL-je nem jött létre.");
  return data.publicUrl;
}

async function finalizeCompletedVideo(userId: string, provider: VideoProvider, mode: VideoMode, jobId: string, output: unknown) {
  const videoUrl = extractVideoUrl(output);
  if (!videoUrl) {
    throw new Error("RunPod " + provider + " did not return a video URL: " + JSON.stringify(output).slice(0, 700));
  }

  const video = await fetch(videoUrl, { signal: AbortSignal.timeout(120_000) });
  if (!video.ok) throw new Error("RunPod video download failed (" + video.status + ")");

  const url = await storeVideo(userId, provider, jobId, video);
  return {
    url,
    provider: provider === "kling" ? "Kling" : "RunPod",
    model: modelFor(provider, mode),
    cost: extractCost(output),
  };
}

async function start(userId: string, provider: VideoProvider, mode: VideoMode, imageUrl: string | undefined, prompt: string, duration: 5 | 10, req: Request) {
  await ensureProfile(userId);
  const charged = await consumeCredits(userId, VIDEO_COST, "designly-video-" + provider);
  if (!charged) return json({ error: "INSUFFICIENT_CREDITS", message: "Elfogytak a kreditek." }, 402, req);

  try {
    const job = await runRunpod(provider, mode, imageUrl, prompt, duration);
    return json({
      status: job.status,
      jobId: job.jobId,
      provider: mode === "t2v" ? "RunPod" : provider === "kling" ? "Kling" : "RunPod",
      model: job.model,
      mode,
      cost: job.cost || undefined,
      duration,
    }, 200, req);
  } catch (error) {
    try {
      await refundCredits(userId, VIDEO_COST, "designly-video-" + provider + " start failed");
    } catch (refundError) {
      console.error("video credit refund failed", refundError);
    }
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersFor(req) });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405, req);

  const user = await requestUser(req);
  if (!user) return json({ error: "UNAUTHORIZED", message: "Jelentkezz be a videógeneráláshoz." }, 401, req);
  if (!await consumeRateLimit(req, user.id, 2, "video")) {
    return json({ error: "RATE_LIMITED", message: "Túl sok videógenerálási kérés rövid idő alatt." }, 429, req);
  }

  let body: {
    action?: "start" | "status";
    provider?: VideoProvider;
    mode?: VideoMode;
    imageUrl?: string;
    prompt?: string;
    duration?: number;
    jobId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400, req);
  }

  const provider = parseProvider(body.provider);

  try {
    if (body.action === "status") {
      const mode: VideoMode = body.mode === "t2v" ? "t2v" : "i2v";
      const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
      if (!jobId) return json({ error: "INVALID_REQUEST", message: "A jobId kötelező." }, 400, req);

      const result = await getRunpodStatus(provider, mode, jobId);
      const status = result.status || "IN_QUEUE";

      if (status === "FAILED") {
        return json({
          status,
          jobId,
          provider: provider === "kling" ? "Kling" : "RunPod",
          model: modelFor(provider, mode),
          error: result.error || "A RunPod videógenerálás sikertelen.",
        }, 200, req);
      }

      if (status === "COMPLETED") {
        try {
          const completed = await finalizeCompletedVideo(user.id, provider, mode, jobId, result.output);
          return json({
            status,
            jobId,
            ...completed,
          }, 200, req);
        } catch (error) {
          console.error("video finalize failed", provider, error);
          return json({
            status: "FAILED",
            jobId,
            provider: provider === "kling" ? "Kling" : "RunPod",
            model: modelFor(provider, mode),
            error: error instanceof Error ? error.message : String(error),
          }, 200, req);
        }
      }

      return json({
        status,
        jobId,
        provider: provider === "kling" ? "Kling" : "RunPod",
        model: modelFor(provider, mode),
      }, 200, req);
    }

    const mode: VideoMode = body.mode === "t2v" ? "t2v" : "i2v";
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, MAX_PROMPT_LENGTH) : "";
    const duration = body.duration === 10 ? 10 : 5;

    if (mode === "i2v" && (!imageUrl || !/^https?:\/\//i.test(imageUrl))) {
      return json({ error: "INVALID_REQUEST", message: "Érvényes referencia-kép URL szükséges." }, 400, req);
    }
    if (!prompt) {
      return json({ error: "INVALID_REQUEST", message: "A videó prompt kötelező." }, 400, req);
    }

    return await start(user.id, provider, mode, mode === "t2v" ? undefined : imageUrl, prompt, duration, req);
  } catch (error) {
    console.error("designly-video provider failed", provider, error);
    const message = error instanceof Error ? error.message : String(error);
    if (/RUNPOD_NOT_CONFIGURED/.test(message)) {
      return json({ error: "VIDEO_PROVIDER_NOT_CONFIGURED", message: "A RunPod videó provider nincs beállítva." }, 503, req);
    }
    if (/401|403/.test(message)) {
      return json({ error: "VIDEO_PROVIDER_AUTH", message: "A RunPod videó provider hitelesítése sikertelen." }, 502, req);
    }
    if (/429|quota|rate limit/i.test(message)) {
      return json({ error: "VIDEO_PROVIDER_QUOTA", message: "A RunPod videó kvótája jelenleg nem elérhető." }, 429, req);
    }
    if (/INVALID_JOB_ID/.test(message)) {
      return json({ error: "INVALID_JOB_ID", message: "Érvénytelen RunPod job azonosító." }, 400, req);
    }
    return json({
      error: "VIDEO_PROVIDER_ERROR",
      message: "A videógenerálás nem sikerült.",
      detail: message.slice(0, 700),
    }, 502, req);
  }
});
