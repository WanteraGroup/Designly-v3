/**
 * A katalogus: 24 design stilus, 10 nyelv, 24 sablonkategoria.
 *
 * Arak es kreditkoltsegek SZANDEKOSAN nincsenek itt. Azok az adatbazisban
 * elnek (`system_settings`), mert a szerver az egyetlen hely, ahol egy
 * terheles eldolhet — egy kliens, ami olyan szamot tart, amivel a szerver nem
 * egyezik, elszamolasi hiba egy lassu kapcsolaton.
 */

import type { Language } from './types';

export const LANGUAGES: Language[] = [
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
    const locale = lang === 'uk' ? 'uk-UA' : lang;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
    }).format(eur);
  }
  return new Intl.NumberFormat('hu-HU').format(ft) + ' Ft';
}
