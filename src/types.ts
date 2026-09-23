/**
 * A kozos tipusok.
 *
 * Ez a fajl az importok celpontja: a `brief.ts` es a `templates.ts` innen hozza
 * a `DesignlyTemplate`-et, a `constants.ts` pedig a `Language`-t. Nelkule a
 * `vite build` nem talalja a modult, es a build 1-es koddal all le — ez volt a
 * hiba, amiert a deploy 12 masodperc alatt elhasalt.
 */

export interface Language {
  code: string;
  name: string;
  flag: string;
}

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
  style: string;
  palette: string[];
}
