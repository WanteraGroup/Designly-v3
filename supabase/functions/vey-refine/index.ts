// vey-refine — applies a natural-language change to an existing page.
//
// A modell DIFF-et ad vissza pontozott utvonalakon, soha nem uj dokumentumot.
// A kliens a sajat peldanyan alkalmazza, tehat egy finomitas nem tudja atalakitani
// azt a lapot, amit a felhasznalo nem kert — es egy kitalalt utvonal nem rontja
// el az oldalt, hanem neman nem tortenik semmi.
//
// Pontosan ugyanazt a provider-utat hasznalja, mint a vey-generate: ha a ket
// fuggveny kulon providerre ulne, a generalas menne es a finomitas neman 500-at
// adna — az a felig-mukodo allapot a legnehezebben kideritheto hiba.

import { chat, ProviderError } from '../_shared/provider.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const SYSTEM_PROMPT = `You are the editor of a generated website.

The user sees a finished page and asks for a change in plain language. You return the SMALLEST set of edits that satisfies the request.

Reply with a single JSON object:

{
  "reply": string,   // one short sentence in the user's language, confirming the change
  "edits": [
    { "path": string, "value": <string | number | string[] | object> }
  ]
}

"path" is a dotted path into the design document, e.g.:
  site.theme.palette
  site.theme.mode
  site.theme.heading_font
  site.title
  blocks.0.headline
  blocks.2.items.1.price
  blocks.4.tiers.0.price

Hard rules:
- Only edit paths that already exist. Never add a block, remove a block or
  reorder blocks — that is a regeneration, not an edit.
- Never change site.language, and never change the "type" of an existing block.
- One or two edits for a simple request. More than four means you have
  misunderstood the request; make the smallest faithful change instead.
- When the request is about colour, change site.theme.palette (and
  site.theme.mode if the request asks for light or dark).
- When the request is about wording, change only the specific text fields named.
- The reply is in the user's language. Paths and structural values stay exactly
  as they are.
- If the request is not an edit ("start over", "make it completely different"),
  return an empty edits array and say in the reply that this needs a fresh
  generation.
- Return JSON only. No prose, no code fences, no commentary.`;

function parseJsonLoose(raw: string): Record<string, unknown> {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new Error('A modell nem JSON-t adott vissza.');
  }
}

/**
 * A diff csak annyira biztonsagos, amennyire az utvonalak, amiket megnevez:
 * az utvonal nem ures string kell legyen, es a lista legfeljebb hat elemet
 * enged at. A kliens utana meg egyszer ellenőrzi mindegyiket a nala levo
 * dokumentum ellen, mielott ir.
 */
function normaliseEdits(raw: unknown): { path: string; value: unknown }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (e): e is { path: string; value: unknown } =>
        !!e &&
        typeof e === 'object' &&
        typeof (e as { path?: unknown }).path === 'string' &&
        (e as { path: string }).path.trim().length > 0,
    )
    .map((e) => ({ path: e.path, value: e.value }))
    .slice(0, 6);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { document?: Record<string, unknown>; instruction?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const instruction = (body.instruction ?? '').trim();
  if (!instruction) return json({ error: 'Írd le, mit változtassak.' }, 400);
  if (instruction.length > 1000) {
    return json({ error: 'A kérés túl hosszú — 1000 karakter alatt tartsd.' }, 400);
  }
  if (!body.document || typeof body.document !== 'object' || Array.isArray(body.document)) {
    return json({ error: 'Hiányzik az oldal, amit módosítani kell.' }, 400);
  }

  const language = (body.language ?? 'hu').slice(0, 5);

  try {
    const result = await chat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            `Reply language: ${language}`,
            '',
            'Current design document:',
            JSON.stringify(body.document),
            '',
            `Requested change: ${instruction}`,
          ].join('\n'),
        },
      ],
      // Alacsony homerseklet szandekos: egy szerkesztes az legyen, amit kertek,
      // ne egy kreativ ujraertelmezes.
      { temperature: 0.25, maxTokens: 2048 },
    );

    const parsed = parseJsonLoose(result.content);

    return json({
      reply: typeof parsed.reply === 'string' ? parsed.reply : '',
      edits: normaliseEdits(parsed.edits),
      durationMs: result.durationMs,
    });
  } catch (e) {
    if (e instanceof ProviderError) {
      return json({ error: e.message }, e.status);
    }
    const message = e instanceof Error ? e.message : String(e);
    console.error('vey-refine failed', message);
    return json({ error: message }, 500);
  }
});
