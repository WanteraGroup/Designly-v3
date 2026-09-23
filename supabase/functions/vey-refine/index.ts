// vey-refine — applies a natural-language change to an existing page.
//
// The model returns a DIFF of dotted paths, never a new document. The client
// applies it to its own copy, so a refinement cannot restructure a page the
// user did not ask to restructure — and a hallucinated path is a no-op rather
// than a corrupted page.

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

const SYSTEM_PROMPT = [
  'You are the editor of a generated website.',
  '',
  'The user sees a finished page and asks for a change in plain language. You return the SMALLEST set of edits that satisfies the request.',
  '',
  'Reply with a single JSON object:',
  '',
  '{',
  '  "reply": string,   // one short sentence in the user language, confirming the change',
  '  "edits": [',
  '    { "path": string, "value": string | number | string[] | object }',
  '  ]',
  '}',
  '',
  'The path is a dotted path into the design document, for example:',
  '  site.theme.palette',
  '  site.theme.mode',
  '  site.theme.heading_font',
  '  site.title',
  '  blocks.0.headline',
  '  blocks.2.items.1.price',
  '  blocks.4.tiers.0.price',
  '',
  'Hard rules:',
  '- Only edit paths that already exist. Never add a block, remove a block or',
  '  reorder blocks. That is a regeneration, not an edit.',
  '- Never change site.language, and never change the type of an existing block.',
  '- One or two edits for a simple request. More than four means you have',
  '  misunderstood the request; make the smallest faithful change instead.',
  '- When the request is about colour, change site.theme.palette, and',
  '  site.theme.mode if the request asks for light or dark.',
  '- When the request is about wording, change only the specific text fields named.',
  '- The reply is in the user language. Paths and structural values stay exactly',
  '  as they are.',
  '- If the request is not an edit, return an empty edits array and say in the',
  '  reply that the page needs a fresh generation.',
  '- Return JSON only. No prose, no code fences, no commentary.',
].join('\n');

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
    throw new Error('The model did not return JSON.');
  }
}

// The diff is only as safe as the paths it names, so the shape is checked
// here: a path must be a non-empty string, and the list is capped at six. The
// client re-checks every path against the document it holds before writing.
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
  if (!instruction) return json({ error: 'Describe the change you want.' }, 400);
  if (instruction.length > 1000) {
    return json({ error: 'That instruction is too long. Keep it under 1000 characters.' }, 400);
  }
  if (!body.document || typeof body.document !== 'object' || Array.isArray(body.document)) {
    return json({ error: 'The page to edit is missing.' }, 400);
  }

  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) {
    return json({ error: 'GROQ_API_KEY is not set on this function' }, 500);
  }

  const model = Deno.env.get('VEYLON_MODEL') ?? 'openai/gpt-oss-120b';
  const language = (body.language ?? 'hu').slice(0, 5);
  const started = Date.now();

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
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

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('provider error', res.status, detail.slice(0, 300));
      return json({ error: `Refinement failed (${res.status}).` }, 502);
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
