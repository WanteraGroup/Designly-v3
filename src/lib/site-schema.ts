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
