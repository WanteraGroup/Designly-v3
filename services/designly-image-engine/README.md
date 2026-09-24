# Designly Image Engine

Private GPU inference service for Designly V3.

The service exposes a small authenticated HTTP API and runs Qwen-Image-2512 locally. The model is Apache 2.0 licensed according to the upstream Qwen-Image model card.

## Endpoints

- `GET /healthz`
- `POST /generate`

### POST /generate

Headers:

`X-Designly-Engine-Key: <ENGINE_API_KEY>`

JSON:

```json
{
  "prompt": "luxury black sports car in neon blue rain",
  "aspectRatio": "16:9",
  "seed": 42,
  "steps": 40
}
```

The response is a PNG image.

## Environment

- `DESIGNLY_ENGINE_API_KEY` — required
- `MODEL_ID` — default `Qwen/Qwen-Image-2512`
- `MODEL_REVISION` — optional
- `DEVICE` — default `cuda`
- `CPU_OFFLOAD` — default `true`
- `DEFAULT_STEPS` — default `40`
- `MAX_STEPS` — default `50`
- `MAX_CONCURRENCY` — default `1`
- `PRELOAD_MODEL` — default `true`

## Recommended RunPod test

For the first real model test, an **A100 80GB Secure Cloud Pod** is a straightforward choice. RunPod currently lists A100 80GB at **$1.59/hour** on Secure Cloud and bills Pods per second. cite is intentionally omitted from repository files.

Use a persistent volume mounted at `/models`. The current Qwen-Image-2512 repository is substantially larger than 40 GB, so use **at least 100 GB**, preferably **120–150 GB**, for model files plus cache.

Recommended environment:

```text
DESIGNLY_ENGINE_API_KEY=<long-random-secret>
MODEL_ID=Qwen/Qwen-Image-2512
DEVICE=cuda
CPU_OFFLOAD=false
DEFAULT_STEPS=40
MAX_STEPS=50
MAX_CONCURRENCY=1
PRELOAD_MODEL=true
```

Expose HTTP port `8080`.

Health check:

```bash
curl https://<pod-id>-8080.proxy.runpod.net/healthz
```

Expected shape:

```json
{
  "ok": true,
  "service": "Designly Image Engine",
  "model": "Qwen/Qwen-Image-2512",
  "cuda": true,
  "gpu": "NVIDIA A100-SXM4-80GB"
}
```

The exact GPU string depends on the Pod hardware.

## Local Docker

The image is already prepared for CUDA 12.8. The Dockerfile installs the official PyTorch **2.9.0 CUDA 12.8 wheel** explicitly; do not replace it with an unpinned PyPI Torch install.

```bash
docker build -t designly-image-engine services/designly-image-engine
docker run --gpus all -p 8080:8080 \
  -e DESIGNLY_ENGINE_API_KEY='replace-with-a-long-random-secret' \
  designly-image-engine
```

Health check:

```text
GET http://localhost:8080/healthz
```

Generation:

```bash
curl -X POST http://localhost:8080/generate \
  -H "X-Designly-Engine-Key: <ENGINE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"luxury black sports car in neon blue rain","aspectRatio":"16:9","steps":40}' \
  --output test.png
```

The frontend never talks to this service directly. Designly V3's `designly-image` Edge Function remains the authenticated gateway, handles credits/rate limits, and stores generated PNGs in the existing `designly-generations` bucket.

## GitHub Container Registry

GitHub Actions builds:

`ghcr.io/wanteragroup/designly-image-engine:latest`

and a commit-tagged image on changes under this service. If the package is private, the RunPod Pod needs authenticated GHCR access before pulling it; alternatively publish the package as public.
