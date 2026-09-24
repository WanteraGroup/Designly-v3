# DESIGNLY V3 — Creative OS

AI-alapú kreatív platform. A felhasználó briefből indul, a VYRON CORE koordinálja a háttérspecialistákat, a DESIGNLY renderer felépíti az oldalt, majd az eredmény szerkeszthető és exportálható.

## Fő felépítés

**VYRON CORE → DESIGNLY MASTER → specialisták → QA → eredmény**

A felhasználó nem 20+ külön agentet kezel. A fő modulok:

- CREATE
- BRAND STUDIO
- WEB ARCHITECT
- CONTENT & GROWTH
- IMAGE STUDIO
- MEDIA STUDIO
- SOCIAL STUDIO
- TEMPLATE STUDIO
- EXTRA DESIGN STUDIO
- STREAMER & GAMER STUDIO
- MERCH FACTORY
- QA AGENT
- HUGINN

Az EXTRA DESIGN STUDIO többek között névjegyet, meghívót, flyert, plakátot, posztert, hirdetést, brosúrát, étlapot, árlistát, bannert, prezentációt, Tattoo mintát, Plannert és CNC CAM kimenetet kezel.

A STREAMER & GAMER STUDIO stream scene-eket, overlayeket, alertokat, thumbnailokat, emote-okat, badge-eket és merch artworköt kezel.

## Stack

Vite + React 18 + TypeScript + Tailwind. Supabase Postgres/Auth/Edge Functions. A szöveges agent runtime szerveroldali Groq providerrel működik, és provider-hiba esetén egyértelműen jelölt előnézeti fallbackot ad. A képgenerálás a DESIGNLY Qwen-Image-2.1 Edge Functionjén keresztül működik; a jelenlegi provider 1:1 kimenetet ad, ezért a kért képarányt a rendszer nem állítja hamisan kimeneti méretként.

## Indítás

```bash
npm install
cp .env.example .env
npm run dev
```

Build ellenőrzés:

```bash
npm run typecheck
npm run build
```

## Frontend útvonalak

- `/` — DESIGNLY landing
- `/app` — generátor
- `/app?tab=studio` — Extra Design Studio
- `/app?tab=gamer` — Streamer & Gamer Studio
- `/app?tab=templates` — sablonok

## Aktív Edge Functionök

- `designly-v3-agent` — VYRON CORE + specialisták
- `designly-v3-refine` — természetes nyelvű szerkesztés
- `designly-huginn` — HUGINN concierge
- `designly-image` — Qwen-Image-2.1
- `vey-images` — Unsplash kép-feloldás és attribúció
- `designly-video` — külön legacy/provider réteg; a jelenlegi V3 UI nem hívja automatikusan

A generátor és a finomító nem használja a Vercel AI Gateway-t. A provider kulcsok szerveroldalon vannak.

## Adatmodell és biztonság

A generált weboldal allow-listelt blokksémát használ; a kliens soha nem renderel modell által visszaadott HTML-t.

A credit-ledger szerveroldali RPC-t használó részeknél az auth.uid ellenőrzés kötelező. A produkciós Supabase adatbázis hardening migrationje a `supabase/migrations/20260924112704_designly_hardening.sql` fájlban van.

## CI és security

GitHub Actions:

- `.github/workflows/designly-ci.yml` — TypeScript + Vite build + Deno Edge Function typecheck
- `.github/workflows/designly-security.yml` — CodeQL
- `.github/workflows/designly-dependency-review.yml` — Dependency Review PR-oknál

A GitHub Actions a `main` ágat ellenőrzi; a deployment célja továbbra is Vercel.

GitHub Pages / Next.js deployment workflow nincs a V3-ban; a deployment célja Vercel.

## Képforrások

Az Unsplash képekhez a fotós neve és a forráslink megmarad a galériában és az exportált HTML-ben.

A Qwen-Image-2.1 használata előtt kereskedelmi szolgáltatásnál a modell aktuális licencfeltételeit külön ellenőrizni kell.
