/**
 * A kliens a ket generator-uthoz.
 *
 * KET KULON UT, szandekosan nem osszemosva:
 *   - `buildSite` a Vercel AI Gateway-t hivja kozvetlenul a bongeszobol
 *     (src/lib/gateway.ts) — nincs kulcs, nincs telepitett funkcio.
 *   - `refineSite` Supabase Edge Functiont hiv, mert a diff-allow-listet
 *     szerveroldalon kell tartani: egy bongeszobol atirhato allow-list nem
 *     allow-list.
 *
 * Ha a `vey-refine` nincs telepitve, a finomitas 404-et ad — a hivas ezt
 * ertheto hibauzenette forditja, nem nyers statuszkodot ad vissza.
 */

import { generateSite } from './gateway';
import { applyEdits, type SiteDocument, type SiteEdit } from './site-schema';

export type { SiteDocument, SiteBlock, SiteTheme, SiteMeta } from './site-schema';
export { GatewayError } from './gateway';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Brief -> kesz oldal, a gateway-en keresztul.
 */
export const buildSite = generateSite;

/**
 * Termeszetes nyelvu valtoztatas egy meglevo oldalon.
 *
 * A modell diffet ad vissza pontozott utvonalakon (`blocks.0.headline`,
 * `site.theme.palette`), nem uj dokumentumot, es a diff itt alkalmazodik a
 * hivo sajat peldanyan. Egy nem letezo utvonal kimarad, tehat egy kitalalt
 * szerkesztes nem teszi tonkre az oldalt — neman nem tortenik semmi.
 */
export async function refineSite(
  site: SiteDocument,
  instruction: string,
  language = 'hu',
): Promise<{ site: SiteDocument; reply: string }> {
  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_URL}/vey-refine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ document: site, instruction, language }),
    });
  } catch {
    throw new Error('A finomitas nem erte el a szervert. Ellenorizd a kapcsolatot, es probald ujra.');
  }

  if (res.status === 404) {
    throw new Error(
      'A finomito funkcio (vey-refine) nincs telepitve ezen a Supabase projekten. A generalas mukodik, a finomitas nem.',
    );
  }

  const body = (await res.json().catch(() => ({}))) as {
    edits?: SiteEdit[];
    reply?: string;
    error?: string;
  };

  if (!res.ok) throw new Error(body.error ?? `A finomitas nem sikerult (${res.status})`);

  const edits = Array.isArray(body.edits) ? body.edits : [];
  return { site: applyEdits(site, edits), reply: body.reply ?? '' };
}
