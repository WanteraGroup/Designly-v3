# DESIGNLY V3 — P0 javitasok es funkcionalis blokkok

Ez a branch a teljes rendszeratvizsgalas javitasait tartalmazza: a blokkolo
hibakat zarja le, es letrehozza a "mukodo oldal" iranyahoz tartozo reteget.

## P0 — biztonsag es integritas

| Fajl | Valtozas |
|---|---|
| `supabase/config.toml` | A generalo funkciok `verify_jwt = true`; a harom bekuldes-fogado szandekosan nyitott |
| `src/lib/supabase-client.ts` | Egy kliens, egy `authHeaders()` — session token az anon key helyett |
| `src/lib/gateway.ts`, `api.ts`, `images.ts`, `creative-api.ts` | Az ot ismetelt header-epito lecserelve a kozos helperre |
| `src/components/AuthGate.tsx` | Bejelentkezesi/regisztracios kapu |
| `src/pages/Home.tsx` | Az `AuthGate` bekotve; a fallback allapot lathato figyelmeztetessel |
| `supabase/functions/designly-v3-agent/index.ts` | `auth.getUser()` + `deduct_credits` a provider hivas ELOTT (401/402/503) |
| `supabase/functions/designly-v3-refine/index.ts` | A vilagos/sotet fallback `else if` + szohatar |
| `supabase/functions/designly-image/index.ts` | Valos kepernyoarany a fix `2048x2048` helyett |
| `supabase/functions/designly-huginn/deno.json` | Import-feloldas az ures `{}` helyett |
| `supabase/migrations/20260924130000_*.sql` | A fogado tablak, RLS-sel lezarva |

## Funkcionalis blokkok — a teljes lanc

| Reteg | Fajl |
|---|---|
| Szerzodes | `src/lib/functional-blocks.ts` — `form`, `booking`, `product-grid`, `map`, `newsletter` |
| Sema es szures | `src/lib/site-schema.ts` — `normalizeFormFields`, `isAllowedEndpoint` |
| Preview | `src/components/FunctionalBlocks.tsx` + `SitePreview.tsx` |
| Export | `src/lib/export-html.ts` — mukodo urlap a letoltott HTML-ben is |
| Fogado vegpontok | `designly-form-submit`, `designly-booking`, `designly-subscribe` |

Az `endpoint` mezo csak sajat cimet fogadhat el. Kulso URL-t elfogadni azt
jelentene, hogy a generalt oldal a latogato beiratait egy idegen szerverre
kuldene — ezert a szures a `parseSite`-ban van, nem a rendereloben.

## Ismert korlatok

- A `designly-image` tovabbra is negyzetes vasznon general (a HF Space nem fogad
  arany-parametert). A valasz most megmondja (`providerAspectRatioSupported: false`),
  tehat a felulet tud vagni — de a tenyleges megoldas egy arany-tamogato provider.
- A `designly-subscribe` nem kuld visszaigazolo levelet `DESIGNLY_MAIL_API_KEY`
  nelkul. A token elmentve var, es a valasz `confirmationSent: false`-t ad —
  nem allitjuk, hogy elkuldtuk.
- A `deduct_credits` RPC-hez `SUPABASE_SERVICE_ROLE_KEY` kell a futo kornyezetben.
  Nelkule a vegpont 503-at ad, nem futtat ingyen generalast.
- A `product-grid` `cart` modja meg nem vezet fizeteshez: a blokk jelzi, hogy
  kulon bekapcsolast igenyel.

## Kezzel potolando

1. **A CI `functions` job** — a `.github/workflows/designly-ci.yml`-be:

```yaml
  functions:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v2
        with:
          deno-version: v2.x
      - run: deno check supabase/functions/**/index.ts supabase/functions/_shared/*.ts
```

2. **A migration futtatasa** a produkcios Supabase projekten
   (`20260924130000_designly_functional_blocks.sql`).

3. **A `SUPABASE_SERVICE_ROLE_KEY`** beallitasa az Edge Functionok kornyezeteben.
