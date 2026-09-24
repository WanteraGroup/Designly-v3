import { generateSite, type SiteGenerationResult } from './gateway';
import { applyEdits, type SiteDocument, type SiteEdit } from './site-schema';

export type { SiteDocument, SiteBlock, SiteTheme, SiteMeta } from './site-schema';
export type { SiteGenerationResult } from './gateway';
export { GatewayError } from './gateway';

import { authHeaders, SUPABASE_URL } from './supabase-client';

export const buildSite = generateSite;

export async function refineSite(
  site: SiteDocument,
  instruction: string,
  language = 'hu',
): Promise<{ site: SiteDocument; reply: string }> {
  if (!instruction.trim()) throw new Error('A módosítási utasítás nem lehet üres.');

  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_URL}/designly-v3-refine`, {
      method: 'POST',
      headers: await authHeaders(true),
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

  if (!res.ok) throw new Error(body.message || body.error || `A finomítás nem sikerült (${res.status}).`);

  const edits = Array.isArray(body.edits) ? body.edits : [];
  return { site: applyEdits(site, edits), reply: body.reply || 'Módosítás alkalmazva.' };
}
