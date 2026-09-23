/**
 * Domain types.
 *
 * A shape itt a semaval egyezik, nem a tablakkal: a Designly-v3 generatorkent
 * indul, adatbazis nelkul. A BrandKit es a Profile megvan, mert a kovetkezo
 * lepes az admin es a brand-kit — de addig nem hasznalja semmi.
 */

export type AppRole = 'owner' | 'admin' | 'user';

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export interface BrandKit {
  id: string;
  user_id: string;
  name: string;
  industry: string;
  colors: string[];
  fonts: { heading: string; body: string };
  tone: string;
  logo_url: string | null;
  style_keywords: string[];
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: AppRole;
  created_at: string;
}

/** A template entry from the generated catalogue. */
export interface DesignlyTemplate {
  id: string;
  name: string;
  category: string;
  type: string;
  premium: boolean;
  description: string;
  style: string;
  effect: string;
  palette: string[];
  layout: 'editorial' | 'bold' | 'minimal' | 'luxury' | 'corporate';
  fontPair: string;
  format: string;
  variant: number;
}
