/**
 * The site document contract.
 *
 * These types are the allow-list the generator writes against. The renderer
 * switches on `type`, so a block outside this union is dropped rather than
 * rendered — generated output cannot introduce a new shape.
 */

export interface SiteTheme {
  mode: 'dark' | 'light';
  palette: string[];
  heading_font: string;
  body_font: string;
}

export interface SiteMeta {
  title: string;
  language: string;
  theme: SiteTheme;
  nav: { label: string; href: string }[];
}

interface CtaLink {
  label: string;
  href: string;
}

/**
 * Egy galeriaelem.
 *
 * A modell csak `query`-t es `caption`-t ad: egy rovid angol keresokifejezest,
 * nem URL-t. A `url` es tarsai a `vey-images` funkciobol kerulnek bele utolag —
 * ezert mind opcionalis. Ha nincs URL, a renderelo helyorzot rajzol.
 *
 * A `source` a fotos Unsplash-profilja. Az Unsplash API-eloiras szerint a
 * megjelenitett kephez a nevre MUTATO LINK is kell, nem eleg a nev onmagaban —
 * ezert taroljuk kulon.
 */
export interface GalleryImage {
  query: string;
  caption: string;
  url?: string;
  alt?: string;
  author?: string;
  source?: string;
}

/**
 * Az agent-registry bejegyzese, ahogy a generalasba bekerul.
 *
 * Az agentek NEM kulon futo szolgaltatasok: a `live` jeloles azt jelenti, hogy
 * a generalas egy adott szakaszat ma is egy szabaly vagy modellhivas adja. A
 * `planned` pedig helyet jelol — egy agent, ami a listan van, de nem fut, nem
 * hazudik mukodest.
 *
 * Az `ancestor` az eredeti Wantera-projekt, ahonnan a kepesseg szarmazik. Ez
 * azert kell, mert a csalad tobb repobol all (Designity, nexora-ai, Trenova,
 * VEYRA, Mira), es egy agent viselkedeset a szarmazasa magyarazza.
 */
export interface AgentEntry {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
  ancestor: string;
  status: 'live' | 'planned';
}

/**
 * A generalt oldal dokumentuma: a metaadatok es a szekciok listaja.
 */
export interface SiteDocument {
  site: SiteMeta;
  blocks: SiteBlock[];
}

/** A blokkok unioja. A renderelo ezen a `type` mezon kapcsol. */
export type SiteBlock =
  | { type: 'hero'; eyebrow: string; headline: string; subheadline: string; cta: CtaLink }
  | { type: 'features'; heading: string; items: { title: string; text: string }[] }
  | { type: 'about'; heading: string; body: string }
  | { type: 'services'; heading: string; items: { name: string; text: string; price: string }[] }
  | {
      type: 'pricing';
      heading: string;
      tiers: { name: string; price: string; period: string; features: string[] }[];
    }
  | { type: 'gallery'; heading: string; images: GalleryImage[] }
  | { type: 'testimonials'; heading: string; items: { quote: string; author: string; role: string }[] }
  | { type: 'faq'; heading: string; items: { q: string; a: string }[] }
  | { type: 'contact'; heading: string; body: string }
  | { type: 'cta'; headline: string; subheadline: string; cta: CtaLink }
  | { type: 'footer'; text: string; links: CtaLink[] };

/** A pontozott utvonalon erkezo szerkesztes, ahogy a vey-refine adja. */
export interface SiteEdit {
  path: string;
  value: unknown;
}

/** A blokktipusok allow-listaja. A `parseSite` ezt hasznalja szurkent. */
const ALLOWED_BLOCKS: ReadonlySet<string> = new Set([
  'hero',
  'features',
  'about',
  'services',
  'pricing',
  'gallery',
  'testimonials',
  'faq',
  'contact',
  'cta',
  'footer',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A nyers modellkimenet szurese.
 *
 * Ez a fuggveny az allow-list: a modell egy blokklistat ad vissza, es ami nincs
 * a listan, az kimarad. Egy felig hibas valasz igy rovidebb oldalt ad, nem
 * osszeomlast — a DOM fele nem kerul olyan blokk, amit a renderelo nem ismer.
 *
 * A `site` blokk hianyaban sincs baj: a hivas egy ures metaadattal ter vissza,
 * es a hivo a sajat cimet hasznalja helyette.
 */
export function parseSite(raw: unknown): SiteDocument | null {
  if (!isRecord(raw)) return null;

  const siteRaw = isRecord(raw.site) ? raw.site : {};
  const themeRaw = isRecord(siteRaw.theme) ? siteRaw.theme : {};

  const mode = themeRaw.mode === 'light' ? 'light' : 'dark';
  const palette = Array.isArray(themeRaw.palette)
    ? themeRaw.palette.filter((c): c is string => typeof c === 'string').slice(0, 4)
    : [];

  const site: SiteMeta = {
    title: typeof siteRaw.title === 'string' ? siteRaw.title : 'Kész oldal',
    language: typeof siteRaw.language === 'string' ? siteRaw.language : 'hu',
    theme: {
      mode,
      palette: palette.length > 0 ? palette : ['#0f172a', '#f8fafc'],
      heading_font: typeof themeRaw.heading_font === 'string' ? themeRaw.heading_font : 'Inter',
      body_font: typeof themeRaw.body_font === 'string' ? themeRaw.body_font : 'Inter',
    },
    nav: Array.isArray(siteRaw.nav)
      ? siteRaw.nav
          .filter(isRecord)
          .filter((n) => typeof n.label === 'string')
          .map((n) => ({
            label: n.label as string,
            href: typeof n.href === 'string' ? n.href : '#',
          }))
          .slice(0, 6)
      : [],
  };

  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks
        .filter(isRecord)
        .filter((b) => typeof b.type === 'string' && ALLOWED_BLOCKS.has(b.type))
        .slice(0, 20)
    : [];

  if (blocks.length === 0) return null;

  return { site, blocks: blocks as unknown as SiteBlock[] };
}

/**
 * A pontozott utvonal feloldasa egy letezo ertekre.
 *
 * Csak LETEZO utvonalat ad vissza: ha barmelyik szegmens nem talalhato, a
 * fuggveny null-t ad, es a hivo kihagyja a szerkesztest. Ez az, ami egy
 * kitalalt utvonalat neman nem-re fordit a dokumentum rongalasa helyett.
 */
function resolvePath(
  root: unknown,
  path: string,
): { parent: Record<string, unknown> | unknown[]; key: string } | null {
  const parts = path.split('.').filter(Boolean);
  if (parts.length === 0) return null;

  let current: unknown = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!isRecord(current) && !Array.isArray(current)) return null;
    const container = current as Record<string, unknown>;
    if (!(parts[i] in container)) return null;
    current = container[parts[i]];
  }

  if (!isRecord(current) && !Array.isArray(current)) return null;
  const container = current as Record<string, unknown>;
  const key = parts[parts.length - 1];
  if (!(key in container)) return null;

  return { parent: container, key };
}

/**
 * A diff alkalmazasa a kliens sajat peldanyan.
 *
 * Minden utvonal kulon forditodik le: ami nem letezik, az kimarad, a tobbi
 * viszont ervenyesul. Igy egy hat utvonalbol allo diff reszlegesen is hasznos,
 * es egy elgepelt utvonal nem viszi magaval a tobbi valtoztatast.
 */
export function applyEdits(site: SiteDocument, edits: SiteEdit[]): SiteDocument {
  if (!Array.isArray(edits) || edits.length === 0) return site;

  const next = structuredClone(site) as unknown as Record<string, unknown>;

  for (const edit of edits) {
    if (!edit || typeof edit.path !== 'string') continue;
    const resolved = resolvePath(next, edit.path);
    if (!resolved) continue;
    (resolved.parent as Record<string, unknown>)[resolved.key] = edit.value;
  }

  return next as unknown as SiteDocument;
}
