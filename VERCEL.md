# DESIGNLY V3 — Vercel

A DESIGNLY V3 egy Vite + React alkalmazás.

## Vercel beállítás

Framework preset: **Vite**

Build command: `npm run build`

Output directory: `dist`

Install command: `npm install`

Production branch: **main**

A repository `vercel.json` már tartalmazza a fenti build beállításokat. Ne legyenek ellentmondó dashboard override-ok.

## Environment Variables

Production és Preview környezetben:

```
VITE_SUPABASE_URL=https://mxrgdcvmxzhocbdhtlhg.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase publishable/anon key>
```

A kliens csak publishable/anon kulcsot kaphat. Provider secret, Groq kulcs vagy más szerveroldali titok nem kerülhet Vercel frontend env-be.

## Deployment flow

```
GitHub push
   ↓
DESIGNLY CI
   ↓
Vercel build
   ↓
Vercel deployment
```

## Supabase runtime

A frontend ezeket használja:

`designly-v3-agent`
`designly-v3-refine`
`designly-huginn`
`designly-image`
`vey-images`

A generátor **nem** a Vercel AI Gateway-t hívja. A VYRON CORE Edge Function szerveroldali provider kulccsal dolgozik.

## Fontos

A régi Next.js/GitHub Pages workflow nem része a V3-nak.

A videó backend jelenleg legacy/provider réteg; a V3 frontend nem hívja automatikusan, így nincs rejtett FAL.ai generálási költség a jelenlegi kreatív folyamatban.
