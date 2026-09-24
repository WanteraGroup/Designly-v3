/**
 * DESIGNLY V3 — strict site document contract.
 * Renderer output is limited to the allow-listed block types below.
 */
export interface SiteTheme {
  mode: 'dark' | 'light';
  palette: string[];
  heading_font: string;
  body_font: string;
  background_image?: string;
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

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  required: boolean;
  options?: string[];
  placeholder?: string;
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
  | { type: 'footer'; text: string; links: { label: string; href: string }[] }
  | { type: 'form'; heading: string; body: string; fields: FormField[]; submitLabel: string; successMessage: string; endpoint: string; formId: string };

export interface SiteDocument {
  site: SiteMeta;
  blocks: SiteBlock[];
}

export interface SiteEdit {
  path: string;
  value: unknown;
}

export const BLOCK_TYPES = [
  'hero','features','about','services','pricing','gallery','testimonials','faq','contact','cta','footer','form',
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

function normalizeBlock(raw: unknown): SiteBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const type = b.type;
  if (typeof type !== 'string' || !ALLOWED.has(type)) return null;

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
    case 'form':
      return {
        type,
        heading: text(b.heading, 'Kapcsolat'),
        body: text(b.body),
        fields: objectArray(b.fields).slice(0, 8).map((x, index) => {
          const rawType = text(x.type, 'text');
          const fieldType = ['text','email','tel','textarea','select'].includes(rawType) ? rawType as FormField['type'] : 'text';
          return {
            name: text(x.name, 'field_' + (index + 1)).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80),
            label: text(x.label, 'Mező').slice(0, 120),
            type: fieldType,
            required: Boolean(x.required),
            ...(Array.isArray(x.options) ? { options: x.options.filter((v): v is string => typeof v === 'string').slice(0, 20).map((v) => v.slice(0, 120)) } : {}),
            ...(text(x.placeholder) ? { placeholder: text(x.placeholder).slice(0, 160) } : {}),
          };
        }),
        submitLabel: text(b.submitLabel, 'Küldés').slice(0, 100),
        successMessage: text(b.successMessage, 'Köszönjük, az üzenetet elküldtük.').slice(0, 300),
        endpoint: '/functions/v1/designly-form-submit',
        formId: text(b.formId, crypto.randomUUID()).slice(0, 80),
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
        ...(typeof theme.background_image === 'string' && /^https?:\/\//i.test(theme.background_image.trim()) ? { background_image: theme.background_image.trim().slice(0, 4000) } : {}),
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
