/**
 * DESIGNLY V3 — strict site document contract.
 * Renderer output is limited to the allow-listed block types below.
 */
import { isAllowedEndpoint, FUNCTIONAL_BLOCK_TYPES } from './functional-blocks';
import type {
  BookingBlock,
  FormBlock,
  FormField,
  MapBlock,
  NewsletterBlock,
  ProductGridBlock,
} from './functional-blocks';

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

export type StaticBlock =
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

/**
 * A renderelheto blokk: a statikus bemutatkozo blokkok ES a funkcionalis
 * blokkok (urlap, foglalas, termeklista, terkep, hirlevel).
 *
 * A funkcionalis blokkok tipusai a `functional-blocks.ts`-bol jonnek, hogy a
 * szerzodes egy helyen legyen — a `parseSite` itt csak szur, nem ujradefinial.
 */
export type SiteBlock =
  | StaticBlock
  | FormBlock
  | BookingBlock
  | ProductGridBlock
  | MapBlock
  | NewsletterBlock;

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
  ...FUNCTIONAL_BLOCK_TYPES,
] as const;

const ALLOWED = new Set<string>(BLOCK_TYPES);

function safeColor(v: unknown, fallback = '#c9a45c'): string {
  const color = typeof v === 'string' ? v.trim() : '';
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback;
}

function safeFont(v: unknown, fallback: string): string {
  const font = typeof v === 'string' ? v.trim() : '';
  return /^[A-Za-z0-9 _.,'\-]{1,80}$/.test(font) ? font : fallback;
}

function safeHref(v: unknown, fallback = '#'): string {
  const href = typeof v === 'string' ? v.trim() : '';
  if (!href) return fallback;
  if (/^(#|\/|\.\/|\.\.\/)/.test(href)) return href.slice(0, 320);
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href.slice(0, 320);
  return fallback;
}

function safeMediaUrl(v: unknown): string {
  const url = typeof v === 'string' ? v.trim() : '';
  if (/^https?:\/\//i.test(url) || /^\//.test(url)) return url.slice(0, 4000);
  return '';
}

function text(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v.slice(0, 8000) : fallback;
}

function link(v: unknown, fallbackLabel = 'Link', fallbackHref = '#'): CtaLink {
  const x = v && typeof v === 'object' ? v as Record<string, unknown> : {};
  return {
    label: text(x.label, fallbackLabel).slice(0, 160),
    href: safeHref(x.href, fallbackHref),
  };
}

function objectArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v)
    ? v.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    : [];
}

function stringArray(v: unknown, max = 12): string[] {
  return Array.isArray(v)
    ? v.filter((item): item is string => typeof item === 'string').slice(0, max).map((item) => item.slice(0, 800))
    : [];
}

/*
 * A funkcionalis blokkok mezoszetovaltoi.
 *
 * A `siteId` es a `formId` azert kell, mert a fogado vegpont ezekbol tudja,
 * melyik generalt oldalhoz tartozik a bekuldes. A generalt oldal ezt a sajat
 * dokumentumabol kapja, nem keresbol — igy a latogato nem tud mas oldal neveben
 * bekuldeni.
 */
const FIELD_NAME = /^[a-z0-9_]{1,40}$/;
const FIELD_TYPES = ['text', 'email', 'tel', 'textarea', 'select', 'date', 'time'] as const;

export function normalizeFormFields(v: unknown): FormField[] {
  return objectArray(v)
    .slice(0, 24)
    .map((x) => {
      const name = text(x.name).trim().toLowerCase();
      const type = FIELD_TYPES.includes(text(x.type).trim() as typeof FIELD_TYPES[number])
        ? (text(x.type).trim() as FormField['type'])
        : 'text';
      return {
        name: FIELD_NAME.test(name) ? name : '',
        label: text(x.label, 'Mező').slice(0, 160),
        type,
        required: x.required === true,
        ...(type === 'select' ? { options: stringArray(x.options, 20) } : {}),
        ...(text(x.placeholder) ? { placeholder: text(x.placeholder).slice(0, 200) } : {}),
      };
    })
    /*
     * Egy ervenytelen nevu mezo kimarad: a backend ezt a nevet kapja kulcskent,
     * es egy szabalytalan kulcs vagy elveszne, vagy (rosszabb esetben) egy
     * nem kivant oszlopba irna. Inkább kevesebb mezo, mint nemkivant.
     */
    .filter((f) => f.name !== '');
}

function functionalBlock(b: Record<string, unknown>): SiteBlock | null {
  const endpoint = (fallback: string) => (isAllowedEndpoint(b.endpoint) ? String(b.endpoint).trim() : fallback);

  switch (b.type) {
    case 'form':
      return {
        type: 'form',
        heading: text(b.heading, 'Írj nekünk').slice(0, 140),
        body: text(b.body).slice(0, 800),
        fields: normalizeFormFields(b.fields),
        submitLabel: text(b.submitLabel, 'Küldés').slice(0, 80),
        endpoint: endpoint('designly-form-submit'),
        successMessage: text(b.successMessage, 'Köszönjük, megkaptuk az üzenetedet.').slice(0, 300),
      };
    case 'booking':
      return {
        type: 'booking',
        heading: text(b.heading, 'Időpontfoglalás').slice(0, 140),
        body: text(b.body).slice(0, 800),
        services: objectArray(b.services).slice(0, 12).map((x) => ({
          name: text(x.name, 'Szolgáltatás').slice(0, 140),
          duration: text(x.duration, '—').slice(0, 60),
          price: text(x.price, '—').slice(0, 120),
        })),
        availability: objectArray(b.availability).slice(0, 7).map((x) => ({
          day: text(x.day, 'Hétfő').slice(0, 40),
          from: text(x.from, '09:00').slice(0, 10),
          to: text(x.to, '17:00').slice(0, 10),
        })),
        endpoint: endpoint('designly-booking'),
        successMessage: text(b.successMessage, 'A foglalási kérésedet megkaptuk.').slice(0, 300),
      };
    case 'product-grid':
      return {
        type: 'product-grid',
        heading: text(b.heading, 'Termékek').slice(0, 140),
        body: text(b.body).slice(0, 800),
        products: objectArray(b.products).slice(0, 24).map((x) => ({
          name: text(x.name, 'Termék').slice(0, 160),
          description: text(x.description).slice(0, 600),
          price: text(x.price, '—').slice(0, 120),
          imageQuery: text(x.imageQuery, 'product photography').slice(0, 240),
          ...(safeMediaUrl(x.imageUrl) ? { imageUrl: safeMediaUrl(x.imageUrl) } : {}),
          sku: text(x.sku).slice(0, 60),
        })),
        mode: b.mode === 'cart' ? 'cart' : 'inquiry',
        endpoint: endpoint('designly-cart'),
      };
    case 'map':
      return {
        type: 'map',
        heading: text(b.heading, 'Helyszín').slice(0, 140),
        /*
         * A modell nem tud koordinatat, es nem is kell neki: cimet ad, amit a
         * renderelo geokodol (vagy terkep-linkke alakít). Egy hamis lat/lng par
         * rosszabb lenne, mint egy cim, amit lehet ellenorizni.
         */
        address: text(b.address).slice(0, 400),
        mode: b.mode === 'link' ? 'link' : 'embed',
      };
    case 'newsletter':
      return {
        type: 'newsletter',
        heading: text(b.heading, 'Hírlevél').slice(0, 140),
        body: text(b.body).slice(0, 600),
        placeholder: text(b.placeholder, 'Az email címed').slice(0, 120),
        submitLabel: text(b.submitLabel, 'Feliratkozás').slice(0, 80),
        endpoint: endpoint('designly-subscribe'),
        successMessage: text(b.successMessage, 'Köszönjük, hamarosan jelentkezünk.').slice(0, 300),
      };
    default:
      return null;
  }
}

function normalizeBlock(raw: unknown): SiteBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const type = b.type;
  if (typeof type !== 'string' || !ALLOWED.has(type)) return null;

  if ((FUNCTIONAL_BLOCK_TYPES as readonly string[]).includes(type)) {
    return functionalBlock(b);
  }

  switch (type) {
    case 'hero':
      return {
        type,
        eyebrow: text(b.eyebrow),
        headline: text(b.headline, 'Create.'),
        subheadline: text(b.subheadline),
        cta: link(b.cta, 'Contact', '#contact'),
      };
    case 'features':
      return {
        type,
        heading: text(b.heading, 'Features'),
        items: objectArray(b.items).slice(0, 8).map((x) => ({
          title: text(x.title, 'Feature'),
          text: text(x.text),
        })),
      };
    case 'about':
      return { type, heading: text(b.heading, 'About'), body: text(b.body) };
    case 'services':
      return {
        type,
        heading: text(b.heading, 'Services'),
        items: objectArray(b.items).slice(0, 8).map((x) => ({
          name: text(x.name, 'Service'),
          text: text(x.text),
          price: text(x.price, '—').slice(0, 120),
        })),
      };
    case 'pricing':
      return {
        type,
        heading: text(b.heading, 'Pricing'),
        tiers: objectArray(b.tiers).slice(0, 6).map((x) => ({
          name: text(x.name, 'Plan'),
          price: text(x.price, '—').slice(0, 120),
          period: text(x.period).slice(0, 80),
          features: stringArray(x.features, 10),
        })),
      };
    case 'gallery': {
      const images = objectArray(b.images).slice(0, 8).map((x) => ({
        query: text(x.query, 'modern design').slice(0, 240),
        caption: text(x.caption).slice(0, 400),
        ...(safeMediaUrl(x.url) ? { url: safeMediaUrl(x.url) } : {}),
        ...(text(x.alt) ? { alt: text(x.alt, '').slice(0, 400) } : {}),
        ...(text(x.author) ? { author: text(x.author, '').slice(0, 200) } : {}),
        ...(text(x.source) ? { source: text(x.source, '').slice(0, 4000) } : {}),
      }));
      return { type, heading: text(b.heading, 'Gallery'), images };
    }
    case 'testimonials':
      return {
        type,
        heading: text(b.heading, 'Testimonials'),
        items: objectArray(b.items).slice(0, 8).map((x) => ({
          quote: text(x.quote),
          author: text(x.author, 'Client').slice(0, 160),
          role: text(x.role).slice(0, 160),
        })),
      };
    case 'faq':
      return {
        type,
        heading: text(b.heading, 'FAQ'),
        items: objectArray(b.items).slice(0, 10).map((x) => ({
          q: text(x.q, 'Question').slice(0, 400),
          a: text(x.a).slice(0, 1200),
        })),
      };
    case 'contact':
      return {
        type,
        heading: text(b.heading, 'Contact'),
        body: text(b.body),
        email: text(b.email).slice(0, 240),
        phone: text(b.phone).slice(0, 120),
        address: text(b.address).slice(0, 400),
      };
    case 'cta':
      return {
        type,
        headline: text(b.headline, 'Let us build it.'),
        subheadline: text(b.subheadline),
        cta: link(b.cta, 'Start', '#contact'),
      };
    case 'footer':
      return {
        type,
        text: text(b.text, 'DESIGNLY STUDIO'),
        links: objectArray(b.links).slice(0, 10).map((x) => ({
          label: text(x.label, 'Link').slice(0, 160),
          href: safeHref(x.href),
        })),
      };
    default:
      return null;
  }
}

export function parseSite(raw: unknown): SiteDocument | null {
  if (!raw || typeof raw !== 'object') return null;
  const doc = raw as Partial<SiteDocument>;
  if (!doc.site || !Array.isArray(doc.blocks)) return null;

  const theme = (doc.site.theme ?? {}) as Partial<SiteTheme>;

  return {
    site: {
      title: typeof doc.site.title === 'string' && doc.site.title.trim() ? doc.site.title.slice(0, 200) : 'DESIGNLY',
      language: typeof doc.site.language === 'string' && doc.site.language.trim() ? doc.site.language.slice(0, 12) : 'hu',
      theme: {
        mode: theme.mode === 'light' ? 'light' : 'dark',
        palette: Array.isArray(theme.palette) && theme.palette.length
          ? theme.palette.filter((v): v is string => typeof v === 'string').slice(0, 8).map((v) => safeColor(v))
          : ['#c9a45c'],
        heading_font: safeFont(theme.heading_font, 'Marcellus'),
        body_font: safeFont(theme.body_font, 'Inter'),
      },
      nav: Array.isArray(doc.site.nav)
        ? doc.site.nav
            .filter((item): item is {label: string; href: string} =>
              !!item && typeof item.label === 'string' && typeof item.href === 'string')
            .slice(0, 8)
            .map((item) => ({ label: item.label.slice(0, 160), href: safeHref(item.href) }))
        : [],
    },
    blocks: doc.blocks
      .map(normalizeBlock)
      .filter((b): b is SiteBlock => b !== null),
  };
}

export function applyEdits(doc: SiteDocument, edits: SiteEdit[]): SiteDocument {
  const next = structuredClone(doc) as unknown as Record<string, unknown>;

  for (const edit of edits) {
    if (!edit || typeof edit.path !== 'string' || !edit.path.trim()) continue;
    const parts = edit.path.split('.').filter(Boolean);
    if (!parts.length) continue;
    if (parts.some((part) => ['__proto__', 'prototype', 'constructor'].includes(part))) continue;
    if (!(parts[0] === 'site' || parts[0] === 'blocks')) continue;

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
    } else if (
      current && typeof current === 'object' &&
      value && typeof value === 'object' &&
      !Array.isArray(current) && !Array.isArray(value)
    ) {
      cursor[last] = value;
    }
  }

  return parseSite(next) ?? doc;
}
