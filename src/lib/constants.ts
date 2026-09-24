import type { LanguageCode } from './types';

export type { LanguageCode } from './types';

export const LANGUAGES: { code: LanguageCode; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: 'EN' },
  { code: 'hu', name: 'Magyar', flag: 'HU' },
  { code: 'de', name: 'Deutsch', flag: 'DE' },
  { code: 'fr', name: 'Français', flag: 'FR' },
  { code: 'es', name: 'Español', flag: 'ES' },
  { code: 'it', name: 'Italiano', flag: 'IT' },
  { code: 'pl', name: 'Polski', flag: 'PL' },
  { code: 'uk', name: 'Українська', flag: 'UK' },
  { code: 'ro', name: 'Română', flag: 'RO' },
  { code: 'nl', name: 'Nederlands', flag: 'NL' },
];

/**
 * Az `Intl` lokacio egy nyelvkódhoz.
 *
 * Az `uk` nem `uk` az Intl-ben (az ukran `uk-UA`), es a `hu` sem mindig — ezert
 * kell a lekepezes. Enelkul a `toLocaleString('uk')` hibas vagy angol
 * formatumot ad.
 */
export function localeFor(lang: string): string {
  const map: Record<string, string> = {
    hu: 'hu-HU', en: 'en-GB', de: 'de-DE', fr: 'fr-FR', es: 'es-ES',
    it: 'it-IT', pl: 'pl-PL', uk: 'uk-UA', ro: 'ro-RO', nl: 'nl-NL',
  };
  return map[lang] ?? 'en-GB';
}

/** A kivalasztott nyelven formazott szam. */
export function formatNumber(value: number, lang = 'hu'): string {
  return new Intl.NumberFormat(localeFor(lang)).format(value);
}

/** Bator, mozis iranyok, amiket a brief-epito presetkent kinal. */
export const DESIGN_STYLES = [
  'premium', 'luxury', 'minimal', 'modern', 'corporate', 'elegant', 'bold', 'cinematic',
  'automotive', 'fashion', 'restaurant', 'real_estate', 'technology', 'industrial', 'creative',
  'nordic', 'celtic', 'editorial', 'art_deco', 'brutalist', 'futuristic', 'organic', 'tech_noir',
  'high_fashion', 'architectural', 'dark_academia', 'soft_luxury',
];

export const TEMPLATE_CATEGORIES = [
  'Business', 'Restaurant', 'Real Estate', 'Beauty', 'Fitness', 'Technology', 'Events', 'Wedding',
  'Personal', 'E-commerce', 'Marketing', 'Corporate', 'Automotive', 'Hospitality', 'Healthcare',
  'Education', 'Finance', 'Construction', 'Fashion', 'Travel', 'Creator', 'Gaming', 'Nonprofit', 'Luxury',
];

export const DISPLAY_EUR_HUF_RATE = 400;

/**
 * A magyar ar forintban van, ezert a mindig lathato osszeg HUF. Minden mas
 * nyelv ugyanezt a szamot latja, statikus display-arfolyamon — ez cimke, nem
 * szamlazasi arfolyam.
 */
export function formatPrice(ft: number, lang = 'hu'): string {
  if (lang !== 'hu') {
    const eur = ft / DISPLAY_EUR_HUF_RATE;
    return new Intl.NumberFormat(localeFor(lang), {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
    }).format(eur);
  }
  return new Intl.NumberFormat('hu-HU').format(ft) + ' Ft';
}
