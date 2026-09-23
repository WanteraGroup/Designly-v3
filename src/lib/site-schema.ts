/**
 * DESIGNLY V3 — strict site document contract.
 * Renderer output is limited to the allow-listed block types below.
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

export interface GalleryImage {
  query: string;
  caption: string;
  url?: string;
  alt?: string;
  author?: string;
  source?: string;
}

export type SiteBlock =
  | { type: 'hero'; eyebrow: string; headline: string; subheadline: string; cta: CtaLink }
  | { type: 'features'; heading: string; items: { title: string; text: string }[] }
  | { type: 'about'; heading: string; body: string }
  | { type: 'services'; heading: string; items: { name: string; text: string; price: string }[] }
  | { type: 'pricing'; heading: string; tiers: { name: string; price: string; period: string; features: string[] }[] }
  | { type: 'gallery'; heading: string; images: GalleryImage[] }
  | { type: 'testimonials'; heading: string; items: { quote: string; author: string; role: string }[] }
  | { type: 'faq'; heading: string; items: { q: string; a: string }[] }
  | { type: 'contact'; heading: string; body: string; email: string; phone: string; address: string }
  | { type: 'cta'; headline: string; subheadline: string; cta: CtaLink }
  | { type: 'footer'; text: string; links: { label: string; href: string }[] };

export interface SiteDocument {
  site: SiteMeta;
  blocks: SiteBlock[];
}

export interface SiteEdit {
  path: string;
  value: unknown;
}

export const BLOCK_TYPES = [
  'hero','features','about','services','pricing','gallery','testimonials','faq','contact','cta','footer',
] as const;

const ALLOWED = new Set<string>(BLOCK_TYPES);

export function parseSite(raw: unknown): SiteDocument | null {
  if (!raw || typeof raw !== 'object') return null;
  const doc = raw as Partial<SiteDocument>;
  if (!doc.site || !Array.isArray(doc.blocks)) return null;

  const theme = (doc.site.theme ?? {}) as Partial<SiteTheme>;

  return {
    site: {
      title: typeof doc.site.title === 'string' && doc.site.title.trim() ? doc.site.title : 'DESIGNLY',
      language: typeof doc.site.language === 'string' && doc.site.language.trim() ? doc.site.language : 'hu',
      theme: {
        mode: theme.mode === 'light' ? 'light' : 'dark',
        palette: Array.isArray(theme.palette) && theme.palette.length ? theme.palette.slice(0, 8) : ['#c9a45c'],
        heading_font: typeof theme.heading_font === 'string' && theme.heading_font ? theme.heading_font : 'Marcellus',
        body_font: typeof theme.body_font === 'string' && theme.body_font ? theme.body_font : 'Inter',
      },
      nav: Array.isArray(doc.site.nav)
        ? doc.site.nav
            .filter((item) => item && typeof item.label === 'string' && typeof item.href === 'string')
            .slice(0, 8)
        : [],
    },
    blocks: doc.blocks.filter(
      (b): b is SiteBlock =>
        !!b && typeof b === 'object' && ALLOWED.has((b as { type?: string }).type ?? ''),
    ),
  };
}

export function applyEdits(doc: SiteDocument, edits: SiteEdit[]): SiteDocument {
  const next = structuredClone(doc) as unknown as Record<string, unknown>;

  for (const edit of edits) {
    if (!edit || typeof edit.path !== 'string' || !edit.path.trim()) continue;
    const parts = edit.path.split('.').filter(Boolean);
    if (!parts.length) continue;

    let cursor: Record<string, unknown> = next;
    let ok = true;

    for (let i = 0; i < parts.length - 1; i++) {
      const step = cursor[parts[i]];
      if (step && typeof step === 'object') cursor = step as Record<string, unknown>;
      else {
        ok = false;
        break;
      }
    }

    if (!ok) continue;
    const last = parts[parts.length - 1];
    if (!(last in cursor)) continue;

    const current = cursor[last];
    const value = edit.value;

    if (typeof current === 'string') {
      if (typeof value === 'string') cursor[last] = value.slice(0, 8000);
    } else if (Array.isArray(current) && Array.isArray(value)) {
      cursor[last] = value;
    } else if (current && typeof current === 'object' && value && typeof value === 'object' && !Array.isArray(current) && !Array.isArray(value)) {
      cursor[last] = value;
    }
  }

  return next as unknown as SiteDocument;
}
