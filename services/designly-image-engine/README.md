# Designly Image Engine

Private GPU inference service for Designly V3.

The service exposes a small authenticated HTTP API and runs Qwen-Image-2512 locally. The model is Apache 2.0 licensed according to the upstream Qwen-Image repository.

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

## GPU

Use an NVIDIA CUDA Linux host. Qwen's upstream documentation provides the QwenImagePipeline and native aspect-ratio examples for Qwen-Image-2512. The Designly service intentionally keeps the model behind a private API instead of exposing the model server directly to browsers.

For production, keep the engine URL private and allow only the Supabase Edge Function to reach it.

## Run

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

```text
POST http://localhost:8080/generate
```

The frontend never talks to this service directly. Designly V3's `designly-image` Edge Function remains the authenticated gateway, handles credits/rate limits, and stores generated PNGs in the existing `designly-generations` bucket.
