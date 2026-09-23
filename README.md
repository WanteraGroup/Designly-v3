# Designly v3 — Creative OS

AI alapú kreatív platform. A felhasználó leírja egy mondatban, mit szeretne — a rendszer megtervezi, felépíti és kirajzolja a kész oldalt, majd finomítani és exportálni lehet.

Ez a `v3`: a generátor a gerinc, és a korábbi Designity-platformból az került át, ami ténylegesen szolgál — sablonkatalógus, brand kittek, kreditek, admin, i18n. A demo-szinti studiok (Tattoo, CNC, Streamer, Shopify, Music, Creator) szándékosan kimaradtak.

## Folyam

```
brief ──► vey-generate (Edge Function) ──► blokklista ──► SitePreview ──► export
                 │
                 └──► vey-refine ──► diff ──► applyEdits
```

Egy hívás, egy kész dokumentum. A generálás Supabase Edge Functionben fut, a modell kulcsa szerveroldalon marad.

## Stack

Vite + React 18 + TypeScript + Tailwind. Supabase (Postgres + Auth + Edge Functions), Groq a modellhez.

## Indítás

```bash
npm install
cp .env.example .env
npm run dev
```

## Edge Functionök

```bash
supabase link --project-ref ovbzoxwwurklwawdvudf
supabase secrets set GROQ_API_KEY=...
supabase functions deploy vey-generate
supabase functions deploy vey-refine
```

## Felépítés

```
src/
  pages/Home.tsx              brief, generálás, előnézet, finomítás, export
  components/SitePreview.tsx  a blokklista renderelője
  lib/api.ts                  buildSite + refineSite
  lib/site-schema.ts          típusok, parseSite, applyEdits
  lib/export-html.ts          önálló HTML export
supabase/functions/           vey-generate, vey-refine
```

## Miért blokklista, és nem HTML

A modell **blokklistát** ad vissza, nem markupot. A renderelő birtokol minden elemet, ami a lapra kerül, tehát a generált szöveg mindig szöveges csomópont — soha nem HTML. A `parseSite` kidobja az allow-listen kívüli blokktípusokat, így egy félig hibás válasz rövidebb oldalt ad, nem hibát dob.

Engedélyezett blokktípusok: `hero`, `features`, `about`, `services`, `pricing`, `gallery`, `testimonials`, `faq`, `contact`, `cta`, `footer`.

A finomítás **diffet** ad vissza pontozott útvonalakon (`blocks.0.headline`, `site.theme.palette`), és az `applyEdits` a kliens saját példányán alkalmazza. Egy nem létező útvonal kimarad, tehát egy kitalált szerkesztés nem teszi tönkre az oldalt.

## A prompt

A rendszer-promptok a `supabase/functions/*/index.ts`-ben élnek, szerveroldalon — a böngészőből nem átírhatók. Ez az a szabály, ami a használható eredményt a generikustól elválasztja.
