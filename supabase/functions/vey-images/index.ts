import { requestUser } from "../_shared/auth.ts";
import { consumeRateLimit } from "../_shared/rate-limit.ts";

// vey-images — a galeriablokkok image_query-jet valodi kepekre csereli.
//
// A generator nem rajzol: a modell egy rovid angol keresokifejezest ad minden
// galeriaelemhez (`image_query`), es ez a funkcio oldja fel valodi fotokra. Igy a
// generalt oldal kep nelkul is kesz, es a kep csak ott kerul be, ahol kell.
//
// A kulcs szerveroldalon marad: a kliens csak a keresokifejezeseket kuldheti.

interface Body {
  queries?: string[];
  perQuery?: number;
}

interface ImageHit {
  query: string;
  url: string;
  thumb: string;
  alt: string;
  author: string;
  source: string;
}

/** A valaszok cache-elese a funkcio eletciklusan belul. */
const cache = new Map<string, ImageHit[]>();

/**
 * Unsplash kereses.
 *
 * Az Unsplash a legjobb valasztas ilyen celra: a licensze engedi a beagyazast, es
 * a szerzot meg kell jeleniteni — ezert a valasz tartalmazza a nevet es a forrast,
 * hogy a felulet ki tudja irni a galeria ala.
 */
async function unsplash(query: string, perQuery: number): Promise<ImageHit[]> {
  const key = Deno.env.get('UNSPLASH_ACCESS_KEY');
  if (!key) throw new Error('UNSPLASH_ACCESS_KEY is not set on this function');

  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(perQuery));
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('content_filter', 'high');

  const res = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${key}`,
      'Accept-Version': 'v1',
    },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Unsplash ${res.status}: ${detail.slice(0, 160)}`);
  }

  const payload = (await res.json()) as {
    results?: Array<{
      urls?: { regular?: string; small?: string };
      alt_description?: string | null;
      description?: string | null;
      user?: { name?: string };
      links?: { html?: string };
    }>;
  };

  return (payload.results ?? [])
    .filter((r) => r.urls?.regular)
    .map((r) => ({
      query,
      url: r.urls!.regular!,
      thumb: r.urls?.small ?? r.urls!.regular!,
      alt: r.alt_description ?? r.description ?? query,
      author: r.user?.name ?? '',
      source: r.links?.html ?? '',
    }));
}

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const user = await requestUser(req);
  if (!user) return json({ error: 'UNAUTHORIZED', message: 'Jelentkezz be a képkereséshez.' }, 401);
  if (!await consumeRateLimit(req, user.id, 20, 'images')) {
    return json({ error: 'RATE_LIMITED', message: 'Túl sok képkeresési kérés rövid idő alatt.' }, 429);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const queries = (body.queries ?? [])
    .map((q) => String(q).trim())
    .filter(Boolean)
    .slice(0, 12);

  if (queries.length === 0) {
    return json({ error: 'Adj meg legalabb egy keresokifejezest.' }, 400);
  }

  const perQuery = Math.min(Math.max(body.perQuery ?? 1, 1), 6);

  try {
    const settled = await Promise.allSettled(
      queries.map(async (q) => {
        const cacheKey = `${q}:${perQuery}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;
        const hits = await unsplash(q, perQuery);
        cache.set(cacheKey, hits);
        return hits;
      }),
    );

    const results: ImageHit[] = [];
    for (const s of settled) {
      if (s.status === 'fulfilled') results.push(...s.value);
    }

    // Ha egy kereses sem talal, az nem hiba: a felulet a hianyzo kep helyett
    // helyorzot rajzol, es a generalas emiatt nem all meg.
    return json({ images: results, count: results.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('vey-images failed', message);
    return json({ error: message }, 500);
  }
});
