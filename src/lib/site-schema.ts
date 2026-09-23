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
  | { type: 'gallery'; heading: string; images: { query: string; caption: string }[] }
  | {
      type: 'testimonials';
      heading: string;
      items: { quote: string; author: string; role: string }[];
    }
  | { type: 'faq'; heading: string; items: { q: string; a: string }[] }
  | { type: 'contact'; heading: string; body: string; email: string; phone: string; address: string }
  | { type: 'cta'; headline: string; subheadline: string; cta: CtaLink }
  | { type: 'footer'; text: string; links: { label: string; href: string }[] };

export interface SiteDocument {
  site: SiteMeta;
  blocks: SiteBlock[];
}

/** A single allow-listed mutation, as returned by the refine agent. */
export interface SiteEdit {
  path: string;
  value: unknown;
}

export const BLOCK_TYPES = [
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
] as const;

const ALLOWED = new Set<string>(BLOCK_TYPES);

/**
 * Narrows an unknown payload to a SiteDocument, dropping blocks whose type is
 * not on the allow-list. A half-shaped response renders as a shorter page
 * instead of throwing on the way to the DOM.
 */
export function parseSite(raw: unknown): SiteDocument | null {
  if (!raw || typeof raw !== 'object') return null;
  const doc = raw as Partial<SiteDocument>;
  if (!doc.site || !Array.isArray(doc.blocks)) return null;

  const theme = (doc.site.theme ?? {}) as Partial<SiteTheme>;

  return {
    site: {
      title: doc.site.title ?? 'Untitled',
      language: doc.site.language ?? 'hu',
      theme: {
        mode: theme.mode === 'light' ? 'light' : 'dark',
        palette:
          Array.isArray(theme.palette) && theme.palette.length ? theme.palette : ['#7c5cff'],
        heading_font: theme.heading_font ?? 'Inter',
        body_font: theme.body_font ?? 'Inter',
      },
      nav: Array.isArray(doc.site.nav) ? doc.site.nav : [],
    },
    blocks: doc.blocks.filter(
      (b): b is SiteBlock =>
        !!b && typeof b === 'object' && ALLOWED.has((b as { type?: string }).type ?? ''),
    ),
  };
}

/**
 * Applies refine-agent edits at dotted paths.
 *
 * Only existing paths are written. A path that does not resolve is skipped, so
 * a hallucinated edit is a no-op rather than a corrupted document.
 */
export function applyEdits(doc: SiteDocument, edits: SiteEdit[]): SiteDocument {
  const next = structuredClone(doc) as unknown as Record<string, unknown>;

  for (const { path, value } of edits) {
    const parts = path.split('.');
    let cursor: Record<string, unknown> = next;
    let ok = true;

    for (let i = 0; i < parts.length - 1; i++) {
      const step = cursor[parts[i]];
      if (step && typeof step === 'object') {
        cursor = step as Record<string, unknown>;
      } else {
        ok = false;
        break;
      }
    }

    if (ok) {
      const last = parts[parts.length - 1];
      if (last in cursor) cursor[last] = value;
    }
  }

  return next as unknown as SiteDocument;
}
