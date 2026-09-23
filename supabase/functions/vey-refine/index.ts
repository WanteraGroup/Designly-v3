// vey-refine — applies a natural-language change to an existing page.
//
// The model returns a DIFF of dotted paths, never a new document. The client
// applies it to its own copy, so a refinement cannot restructure a page the
// user did not ask to restructure — and a hallucinated path is a no-op rather
// than a corrupted page.
//
// Like vey-generate, this runs on the Vercel AI Gateway: no API key, no
// secret. Both functions must sit on the same provider, or the generator works
// and the editor silently 500s — which is a confusing half-failure to debug.

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

const GATEWAY = 'https://ai-gateway.vercel.sh/v1/chat/completions';

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
 * The diff is only as safe as the paths it names, so the shape is checked
 * here: a path must be a non-empty string, and the list is capped at six. The
 * client re-checks every path against the document it holds before writing.
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

  const model = Deno.env.get('DESIGNLY_MODEL') ?? 'openai/gpt-4o-mini';
  const language = (body.language ?? 'hu').slice(0, 5);
  const started = Date.now();

  try {
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${model}`,
      },
      body: JSON.stringify({
        model,
        // Low temperature on purpose: an edit should be the change that was
        // asked for, not a creative reinterpretation of it.
        temperature: 0.25,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
        messages: [
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
      }),
    });

    if (res.status === 402) {
      return json(
        {
          error:
            'A Vercel AI Gateway egyenlege elfogyott. Egyenleg vagy fizetési mód kell a Vercel fiókon.',
        },
        402,
      );
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('gateway error', res.status, detail.slice(0, 300));
      return json({ error: `A finomítás nem sikerült (${res.status}).` }, 502);
    }

    const payload = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const result = parseJsonLoose(payload.choices?.[0]?.message?.content ?? '');

    return json({
      reply: typeof result.reply === 'string' ? result.reply : '',
      edits: normaliseEdits(result.edits),
      durationMs: Date.now() - started,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('vey-refine failed', message);
    return json({ error: message }, 500);
  }
});
