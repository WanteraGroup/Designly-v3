# Vercel — a deploy ellenőrzőlistája

A repó készen áll. A build **három beállításon** áll vagy bukik, és mindhárom a
Vercel dashboardon van, mert a projekt a v0.app-os Next.js korszakból örökölte
őket. Ez a fájl pontosan megmondja, mit hova kell írni.

## 1. Settings → Build & Development Settings

| Mező | Érték | Miért |
| --- | --- | --- |
| Framework Preset | **Vite** | `Next.js` volt, és az felülírja a `vercel.json`-t — ez adta a `No Next.js version detected` hibát |
| Build Command | **üres** | a `vercel.json`-ból jön: `npm run build` |
| Output Directory | **üres** | a `vercel.json`-ból jön: `dist` |
| Install Command | **üres** | a `vercel.json`-ból jön: `npm install` — enélkül a `vite: command not found` |
| Root Directory | **üres** vagy `./` | a `package.json` a repó gyökerében van |

Ha bármelyik felülíró mező ki van töltve, az **legyőzi** a `vercel.json`-t. Ezért
kell üresen hagyni őket: így egy helyen — a repóban — él a konfiguráció.

## 2. Settings → Git → Production Branch

**`main`**

A build log háromszor is a `91e20d9` commitot klónozta, ami a `vercel.json` előtti
állapot. Ha a Production Branch nem a `main` headje, a Vercel mindig a kitűzött
régi commitot hozza, hiába van újabb commit a repóban.

## 3. Settings → Environment Variables

Production **és** Preview környezetre is:

```
VITE_SUPABASE_URL=https://ovbzoxwwurklwawdvudf.supabase.co
VITE_SUPABASE_ANON_KEY=<az anon kulcs a Supabase → Project Settings → API alatt>
```

Ez nélkül a Vite build elhasal: a `src/lib/supabase.ts` szándékosan dob, ha
hiányoznak, hogy ne egy néma, üres felület legyen a hibaüzenet helyett.

## 4. Deployments → Redeploy

A `main` csúcsa a `vercel.json`-t már tartalmazza (`framework: "vite"`,
`installCommand: "npm install"`), tehát a két korábbi build-hiba nem jön vissza.

## Ha a Redeploy még mindig a régi commitot hozza

A projekt örökölte a v0.app-os konfigurációt — a logban ez is látszott:
`Skipping build cache since Package Manager changed from "pnpm" to "npm"`.
Ilyenkor a legbiztosabb út:

1. Vercel → Settings → **Delete Project**
2. **Add New → Project** → Import `WanteraGroup/Designly-v3`
3. Framework: **Vite** (magától felismeri), a többi mező maradjon üres
4. Environment Variables: a fenti kettő
5. **Deploy**

Az új projekt a repó `vercel.json`-ját olvassa, és nem hozza magával a régi
Next.js beállításokat.

## Ellenőrzés a build után

A helyes oldal ezt tartalmazza:

- `/` — a nyitó lap: hero, számok, hat modul, **21 agent**, sablonok, árak
- `/app` — a generátor: brief, stílusok, sablon-galéria, finomítás, HTML export

Ha a betöltött oldal `/_next/` fájlokat tölt, vagy `hero-ravens.png`-t, akkor egy
**másik projekt** fut a domainen — az nem ez a repó.

## A generáláshoz

A generátor a Vercel **AI Gateway**-en megy (`src/lib/gateway.ts`), nem külső
szolgáltatón. Ha az egyenleg üres, a hibaüzenet ezt mondja: „A Vercel AI Gateway
egyenlege elfogyott. Egyenleg vagy fizetési mód kell a Vercel fiókon, különben a
generálás nem indul.” Ez a Vercel oldalsáv **AI** menüjében rendezhető.
