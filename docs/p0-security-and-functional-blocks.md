# DESIGNLY V3 — P0 javitasok es funkcionalis blokkok

Ez a branch a teljes rendszeratvizsgalas elso korét tartalmazza: a blokkolo
hibakat javitja, es letrehozza a "mukodo oldal" iranyahoz tartozo elso reteget.

## P0 — biztonsag es integritas

| Fajl | Valtozas |
|---|---|
| `supabase/config.toml` | Minden Edge Function `verify_jwt = true` |
| `src/lib/supabase-client.ts` | Egy kliens, egy `authHeaders()` — session token az anon key helyett |
| `src/lib/gateway.ts`, `api.ts`, `images.ts`, `creative-api.ts` | Az ot ismetelt header-epito lecserelve a kozos helperre |
| `src/components/AuthGate.tsx` | Bejelentkezesi/regisztracios kapu, amit a JWT-kovetelmeny megkivan |
| `supabase/functions/designly-v3-agent/index.ts` | `auth.getUser()` + `deduct_credits` a provider hivas ELOTT; 401/402/503 |
| `supabase/functions/designly-v3-refine/index.ts` | A vilagos/sotet fallback `else if` + szohatar — eddig mindket ag lefutott |
| `supabase/functions/designly-image/index.ts` | Valos kepernyoarany a fix `2048x2048` helyett, + `providerAspectRatioSupported` |
| `supabase/functions/designly-huginn/deno.json` | Import-feloldas az ures `{}` helyett |
| `supabase/migrations/20260924130000_designly_functional_blocks.sql` | A fogado tablak, RLS-sel lezarva |

## Funkcionalis blokkok (elso reteg)

- `src/lib/functional-blocks.ts` — a szerzodes: `form`, `booking`, `product-grid`,
  `map`, `newsletter`. Az `endpoint` csak sajat cim lehet (`isAllowedEndpoint`),
  kulonben a generalt oldal idegen szerverre kuldene a latogato adatait.
- `supabase/functions/designly-form-submit/index.ts` — urlap-fogado, honeypot-tal
  es mezo-szuresel.
- `supabase/functions/designly-booking/index.ts` — foglalas-fogado, ami a
  bekuldott idopontot a megadott nyitvatartas ellen ellenorzi.

## Ami ezutan kell (nem ebben a branchben)

1. **A `parseSite` bekotese a funkcionalis blokkokra.** A `normalizeBlock`
   switch-e kapja meg az ot uj `case`-et, a `functional-blocks.ts` szurojevel.
2. **A `SiteRenderer` es a `toStandaloneHtml` renderelje a funkcionalis blokkokat.**
   Az exportnal az `endpoint` abszolut URL kell legyen, kulonben a letoltott oldal
   a helyi gepre kuld.
3. **`designly-subscribe`** (hirlevel, dupla opt-in) es **`designly-cart`**
   (termeklista, fizetes) — a sema es a tablak mar allnak hozzajuk.
4. **A `planAgents`/`buildOrchestrationPlan` RULES bovitese** a `/urlap/`,
   `/foglal/`, `/kosar/` terminusokkal, es a `functional` specialista use.
5. **A CI `functions` job** — a `deno check` lepest a repoban levo token scope
   nem engedte beirni, kezzel kell potolni a `.github/workflows/designly-ci.yml`-be.

## Ismert korlatok

- A `designly-image` tovabbra is negyzetes vasznon general (a HF Space nem fogad
  arany-parametert). A valasz most **megmondja** ezt
  (`providerAspectRatioSupported: false`), tehat a felulet tud vagning/letterboxolni —
  de a tenyleges megoldas egy arany-tamogato provider.
- A `deduct_credits` RPC-hez `SUPABASE_SERVICE_ROLE_KEY` kell a futo kornyezetben.
  Nelkule a vegpont 503-at ad, nem futtat ingyen general ast.
- A `designly-video` tovabbra is stub (503), es a `creative-video-api.ts` nem hivja
  semmi. Vagy bekotni, vagy torolni.
