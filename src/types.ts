/**
 * A kozos tipusok.
 *
 * Ez a fajl az importok celpontja: a `brief.ts` es a `templates.ts` innen hozza
 * a `DesignlyTemplate`-et, a `constants.ts` pedig a `Language`-t.
 *
 * Fontos: a `DesignlyTemplate` mezoi PONTOSAN azok, amiket a `templates.ts`
 * `templateAt()` visszaad. Egy itt nem szereplo mezo tipushiba, es a `vite
 * build` 1-es koddal all le — ez volt a deploy hibaja.
 */

/** A tamogatott feluleti nyelvek. Az `i18n.ts` ebbol epit. */
export type LanguageCode = 'hu' | 'en' | 'de' | 'fr' | 'es' | 'it' | 'pl' | 'uk' | 'ro' | 'nl';

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
}

/** A sablon-elrendezes, amit a `LAYOUTS` lista felsorol. */
export type TemplateLayout = 'luxury' | 'editorial' | 'minimal' | 'bold' | 'corporate';

/**
 * Egy sablon a katalogusban.
 *
 * A katalogus nagy (138 240 tetel), es nincs kepfajlja: minden sablon a sajat
 * boritojat rajzolja az indexebol (lasd `template-art.ts`). Ezert itt szin-
 * paletta es stilus van, nem kep URL.
 */
export interface DesignlyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  /** A sablon tipusa: social, business_card, invitation, website, ... */
  type: string;
  premium: boolean;
  style: string;
  effect: string;
  palette: string[];
  layout: TemplateLayout;
  fontPair: string;
  /** Pl. '1080×1080' vagy 'Premium'. */
  format: string;
  variant: number;
}
