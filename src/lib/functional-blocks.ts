/*
 * DESIGNLY V3 — funkcionalis blokk-sema.
 *
 * A jelenlegi `SiteBlock` egy statikus bemutatkozo oldal blokkjait fedi le.
 * Ez a fajl azokat a blokkokat adja hozza, amitol egy oldal MUKODIK: uriap,
 * foglalas, termeklista, terkep es hirlevel-feliratkozas.
 *
 * A generalt oldal soha nem renderel modell-altal adott HTML-t: minden blokk
 * itt szuletik, tipizalt mezokkel. Ez a fajl a szerzodest rogziti; a
 * `parseSite` ezt fogja hasznalni a szureshez.
 *
 * A BIZTONSAGI KORLAT, amit a parseSite-nak be kell tartania:
 *   - az `endpoint` CSAK sajat cim lehet (relativ ut vagy a sajat functions
 *     URL prefixe). Kulso URL-t elfogadni SSRF es adatkiszivargás — a
 *     generalt oldal a latogato beiratait egy idegen szerverre kuldene.
 *   - a `fields[].name` csak [a-z0-9_] lehet: a backend ezt kapja kulcskent.
 *   - a `mode: 'cart'` termeklista fizetesi szandekot jelent, ezert csak
 *     akkor engedheto, ha a brief kifejezetten kereskedelmi oldalt kert.
 */

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'date' | 'time';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface FormBlock {
  type: 'form';
  heading: string;
  body: string;
  fields: FormField[];
  submitLabel: string;
  /** Sajat vegpont only — lasd a biztonsagi korlatot a fajl elejen. */
  endpoint: string;
  successMessage: string;
}

export interface BookingBlock {
  type: 'booking';
  heading: string;
  body: string;
  services: { name: string; duration: string; price: string }[];
  availability: { day: string; from: string; to: string }[];
  endpoint: string;
  successMessage: string;
}

export interface ProductGridBlock {
  type: 'product-grid';
  heading: string;
  body: string;
  products: {
    name: string;
    description: string;
    price: string;
    imageQuery: string;
    imageUrl?: string;
    sku: string;
  }[];
  mode: 'inquiry' | 'cart';
  endpoint: string;
}

export interface MapBlock {
  type: 'map';
  heading: string;
  /** Cim, amit geokodolni kell — a modell nem tud koordinatat. */
  address: string;
  mode: 'embed' | 'link';
}

export interface NewsletterBlock {
  type: 'newsletter';
  heading: string;
  body: string;
  placeholder: string;
  submitLabel: string;
  endpoint: string;
  successMessage: string;
}

export type FunctionalBlock =
  | FormBlock
  | BookingBlock
  | ProductGridBlock
  | MapBlock
  | NewsletterBlock;

export const FUNCTIONAL_BLOCK_TYPES = [
  'form',
  'booking',
  'product-grid',
  'map',
  'newsletter',
] as const;

/** A sajat vegpontok, amiket a generalt oldal hivhat. */
export const FUNCTION_ALLOWED_ENDPOINTS = [
  'designly-form-submit',
  'designly-booking',
  'designly-cart',
  'designly-subscribe',
] as const;

/**
 * Elfogadhato-e az `endpoint` mezo.
 *
 * Harom eset jo: relativ ut (`/...`), sajat functions URL, vagy a fenti
 * rovid nev — a tobbi elutasitando. Ez a fuggveny a parseSite-bol hivando.
 */
export function isAllowedEndpoint(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v || v.length > 320) return false;
  if (v.startsWith('//')) return false;
  if ((FUNCTION_ALLOWED_ENDPOINTS as readonly string[]).includes(v)) return true;
  if (v.startsWith('/')) return true;
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  return !!base && v.startsWith(`${base}/functions/v1/`);
}
