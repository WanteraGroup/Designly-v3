import { generateSite, type SiteGenerationResult } from './gateway';
import { applyEdits, type SiteDocument, type SiteEdit } from './site-schema';
import { FUNCTIONS_URL, authHeaders } from './supabase-client';

export type { SiteDocument, SiteBlock, SiteTheme, SiteMeta } from './site-schema';
export type { SiteGenerationResult } from './gateway';
export { GatewayError } from './gateway';

export const buildSite = generateSite;

export async function refineSite(
  site: SiteDocument,
  instruction: string,
  language = 'hu',
): Promise<{ site: SiteDocument; reply: string }> {
  if (!instruction.trim()) throw new Error('A módosítási utasítás nem lehet üres.');

  let headers: Record<string, string>;
  try {
    headers = await authHeaders();
  } catch {
    throw new Error('A szerkesztéshez jelentkezz be.');
  }

  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_URL}/designly-v3-refine`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        document: site,
        instruction: instruction.slice(0, 1200),
        language,
      }),
    });
  } catch {
    throw new Error('A finomítás nem érte el a szervert.');
  }

  const body = await res.json().catch(() => ({})) as {
    edits?: SiteEdit[];
    reply?: string;
    error?: string;
    message?: string;
  };

  if (res.status === 401) throw new Error('A munkamenet lejárt. Jelentkezz be újra.');
  if (!res.ok) throw new Error(body.message || body.error || `A finomítás nem sikerült (${res.status}).`);

  const edits = Array.isArray(body.edits) ? body.edits : [];
  return { site: applyEdits(site, edits), reply: body.reply || 'Módosítás alkalmazva.' };
}
