/**
 * Client for the two generator functions.
 *
 * Both calls go through Supabase Edge Functions, so the model key stays
 * server-side and the prompts cannot be rewritten from the browser.
 */

import { parseSite, applyEdits, type SiteDocument, type SiteEdit } from './site-schema';

export type { SiteDocument, SiteBlock, SiteTheme, SiteMeta } from './site-schema';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${ANON_KEY}`,
  apikey: ANON_KEY,
};

/**
 * Turns a brief into a finished site document.
 *
 * The response is narrowed through `parseSite`, which drops any block type
 * outside the allow-list. A malformed answer is a shorter page, not a crash.
 */
export async function buildSite(brief: string, language = 'hu'): Promise<SiteDocument> {
  const res = await fetch(`${FUNCTIONS_URL}/vey-generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ brief, language }),
  });

  const body = (await res.json().catch(() => ({}))) as { document?: unknown; error?: string };
  if (!res.ok) throw new Error(body.error ?? `A generálás nem sikerült (${res.status})`);

  const site = parseSite(body.document);
  if (!site) throw new Error('A válasz nem tartalmazott felhasználható oldalt.');
  return site;
}

/**
 * Applies a natural-language change to an existing page.
 *
 * The model returns a diff of dotted paths rather than a new document, and the
 * diff is applied here against the caller's own copy. A path that does not
 * resolve is skipped, so a hallucinated edit is a no-op rather than a
 * corrupted page.
 */
export async function refineSite(
  site: SiteDocument,
  instruction: string,
  language = 'hu',
): Promise<{ site: SiteDocument; reply: string }> {
  const res = await fetch(`${FUNCTIONS_URL}/vey-refine`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ document: site, instruction, language }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    edits?: SiteEdit[];
    reply?: string;
    error?: string;
  };

  if (!res.ok) throw new Error(body.error ?? `A finomítás nem sikerült (${res.status})`);

  const edits = Array.isArray(body.edits) ? body.edits : [];
  return { site: applyEdits(site, edits), reply: body.reply ?? '' };
}
