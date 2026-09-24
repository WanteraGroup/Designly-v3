import asyncio
import io
import os
import secrets
from typing import Optional

import torch
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from diffusers import QwenImagePipeline

APP_NAME = "Designly Image Engine"
MODEL_ID = os.getenv("MODEL_ID", "Qwen/Qwen-Image-2512")
MODEL_REVISION = os.getenv("MODEL_REVISION") or None
DEVICE = os.getenv("DEVICE", "cuda")
CPU_OFFLOAD = os.getenv("CPU_OFFLOAD", "true").lower() in {"1", "true", "yes", "on"}
ENGINE_KEY = os.getenv("DESIGNLY_ENGINE_API_KEY", "")
DEFAULT_STEPS = int(os.getenv("DEFAULT_STEPS", "40"))
MAX_STEPS = int(os.getenv("MAX_STEPS", "50"))
MAX_CONCURRENCY = max(1, int(os.getenv("MAX_CONCURRENCY", "1")))

SIZES = {
    "1:1": (1328, 1328),
    "16:9": (1664, 928),
    "9:16": (928, 1664),
    "4:3": (1472, 1104),
    "3:4": (1104, 1472),
    "3:2": (1584, 1056),
    "2:3": (1056, 1584),
}

app = FastAPI(title=APP_NAME, version="1.0.0")
generation_lock = asyncio.Semaphore(MAX_CONCURRENCY)
pipe: Optional[QwenImagePipeline] = None


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=5000)
    aspectRatio: str = "1:1"
    seed: Optional[int] = None
    steps: Optional[int] = None
    negativePrompt: str = ""


def require_key(value: Optional[str]) -> None:
    if not ENGINE_KEY:
        raise HTTPException(status_code=503, detail="DESIGNLY_ENGINE_API_KEY is not configured")
    if not value or not secrets.compare_digest(value, ENGINE_KEY):
        raise HTTPException(status_code=401, detail="Unauthorized")


def build_prompt(prompt: str) -> str:
    return (
        "DESIGNLY IMAGE GENERATION CONTRACT. "
        "Follow the user's requested subject, count, composition, style, camera, lighting and setting exactly. "
        "Do not add unrelated people or objects. Keep anatomy, geometry, text and perspective coherent. "
        "Produce a polished commercial-quality image suitable for a professional design studio. "
        "USER BRIEF: " + prompt.strip()
    )


def load_pipeline() -> QwenImagePipeline:
    global pipe
    if pipe is not None:
        return pipe

    if DEVICE != "cuda" or not torch.cuda.is_available():
        raise RuntimeError("A CUDA NVIDIA GPU is required for the Designly Image Engine")

    dtype = torch.bfloat16
    kwargs = {"torch_dtype": dtype}
    if MODEL_REVISION:
        kwargs["revision"] = MODEL_REVISION

    pipe = QwenImagePipeline.from_pretrained(MODEL_ID, **kwargs)

    if CPU_OFFLOAD:
        pipe.enable_model_cpu_offload()
    else:
        pipe.to("cuda")

    pipe.set_progress_bar_config(disable=True)
    return pipe


@app.on_event("startup")
async def startup() -> None:
    if os.getenv("PRELOAD_MODEL", "true").lower() in {"1", "true", "yes", "on"}:
        await asyncio.to_thread(load_pipeline)


@app.get("/healthz")
async def healthz() -> dict:
    return {
        "ok": True,
        "service": APP_NAME,
        "model": MODEL_ID,
        "cuda": bool(torch.cuda.is_available()),
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
    }


@app.post("/generate")
async def generate(
    request: GenerateRequest,
    x_designly_engine_key: Optional[str] = Header(default=None),
):
    require_key(x_designly_engine_key)

    ratio = request.aspectRatio.strip()
    if ratio not in SIZES:
        raise HTTPException(status_code=400, detail=f"Unsupported aspect ratio: {ratio}")

    steps = max(1, min(request.steps or DEFAULT_STEPS, MAX_STEPS))
    seed = request.seed if request.seed is not None else int.from_bytes(os.urandom(8), "big")
    width, height = SIZES[ratio]

    async with generation_lock:
        try:
            pipeline = await asyncio.to_thread(load_pipeline)
            generator = torch.Generator(device="cuda").manual_seed(seed)

            prompt = build_prompt(request.prompt)
            negative = request.negativePrompt.strip() or "low quality, blurry, distorted anatomy, malformed hands, duplicate objects, unreadable text"

            def infer():
                with torch.inference_mode():
                    return pipeline(
                        prompt=prompt,
                        negative_prompt=negative,
                        width=width,
                        height=height,
                        num_inference_steps=steps,
                        true_cfg_scale=4.0,
                        generator=generator,
                    ).images[0]

            image = await asyncio.to_thread(infer)

            buffer = io.BytesIO()
            image.save(buffer, format="PNG", optimize=True)
            buffer.seek(0)

            return StreamingResponse(
                buffer,
                media_type="image/png",
                headers={
                    "X-Designly-Model": MODEL_ID,
                    "X-Designly-Seed": str(seed),
                    "X-Designly-Width": str(width),
                    "X-Designly-Height": str(height),
                    "Cache-Control": "no-store",
                },
            )
        except HTTPException:
            raise
        except torch.cuda.OutOfMemoryError as exc:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            raise HTTPException(status_code=503, detail="GPU memory is insufficient for this generation") from exc
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Generation failed: {type(exc).__name__}") from exc
