/**
 * The catalogue: 24 design styles, 10 languages, 24 template categories, and
 * the font and effect libraries the generator draws from.
 *
 * Prices and credit costs are NOT here. They live in the database (`plans`,
 * `system_settings`), because the server is the only place a charge can be
 * decided — a client that holds a number the server disagrees with is a
 * billing bug waiting for a slow connection.
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

/** Bold, cinematic directions the brief builder offers as presets. */
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
 * Hungarian pricing is quoted in forint, so the always-shown amount is HUF.
 * Every other language sees the same number converted at a static display
 * rate — this is a label, not a billing rate.
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
