// vey-generate — turns a one-sentence brief into a finished site document.
//
// The model runs on the Vercel AI Gateway. Why the gateway and not a provider
// SDK: the gateway authenticates through the deployment's own OIDC token, so
// there is no API key to store and no secret to set — which is exactly the
// step that kept failing on this project (the CLI account cannot write edge
// function secrets). Vercel resolves the model and bills it against the team's
// AI Gateway usage, so an unfunded account returns 402 rather than an auth
// error — and that distinction is surfaced below rather than flattened into a
// generic 500.
//
// The model returns a block list, never markup. The client renderer owns every
// element that reaches the page, so generated text can only arrive as a text
// node. The prompt lives here, server-side, where the browser cannot rewrite it.

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

const SYSTEM_PROMPT = `You are a website generator. You receive a one-sentence brief and you return a finished website as an ordered list of blocks.

You do NOT write HTML, CSS or JavaScript. You describe the page, and the renderer builds it.

Reply with a single JSON object:

{
  "site": {
    "title":    string,
    "language": string,          // BCP-47, e.g. "hu"
    "theme": {
      "mode":         "dark" | "light",
      "palette":      string[],  // 2-4 hex colours
      "heading_font": string,    // e.g. "Inter", "Playfair Display", "Space Grotesk"
      "body_font":    string
    },
    "nav": [ { "label": string, "href": string } ]
  },
  "blocks": [ ... ]
}

Allowed block types and their exact fields:

  { "type": "hero",         "eyebrow": string, "headline": string, "subheadline": string, "cta": { "label": string, "href": string } }
  { "type": "features",     "heading": string, "items": [ { "title": string, "text": string } ] }
  { "type": "about",        "heading": string, "body": string }
  { "type": "services",     "heading": string, "items": [ { "name": string, "text": string, "price": string } ] }
  { "type": "pricing",      "heading": string, "tiers": [ { "name": string, "price": string, "period": string, "features": string[] } ] }
  { "type": "gallery",      "heading": string, "images": [ { "query": string, "caption": string } ] }
  { "type": "testimonials", "heading": string, "items": [ { "quote": string, "author": string, "role": string } ] }
  { "type": "faq",          "heading": string, "items": [ { "q": string, "a": string } ] }
  { "type": "contact",      "heading": string, "body": string, "email": string, "phone": string, "address": string }
  { "type": "cta",          "headline": string, "subheadline": string, "cta": { "label": string, "href": string } }
  { "type": "footer",       "text": string, "links": [ { "label": string, "href": string } ] }

Hard rules:
- Write every user-facing string in the SAME LANGUAGE as the brief.
- Use ONLY the block types listed above. An unknown type is dropped by the
  renderer, so inventing one loses that section.
- Order the blocks like a real page: hero first, footer last. Five to nine
  blocks. Never repeat a block type more than twice.
- Write finished copy. No placeholders, no "Lorem ipsum", no bracketed blanks.
  A plausible fictional business name, address and phone number is correct;
  an empty field is not.
- Choose the palette and the fonts from what the brief asks for. A dark,
  premium request gets dark mode and a restrained palette; a bright clinic
  gets light mode.
- "image_query" is a short English phrase naming a photograph to search for.
  It is a query, not visible copy.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let brief = '';
  let language = 'hu';
  try {
    const body = (await req.json()) as { brief?: string; language?: string };
    brief = (body.brief ?? '').trim();
    language = (body.language ?? 'hu').slice(0, 5);
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!brief) return json({ error: 'Írj le egy mondatban, mit építsünk.' }, 400);
  if (brief.length > 2000) {
    return json({ error: 'A leírás túl hosszú — 2000 karakter alatt tartsd.' }, 400);
  }

  // No key to read: the gateway authenticates the deployment itself. The one
  // header it wants is the model's routing hint, sent as a bearer token.
  const model = Deno.env.get('DESIGNLY_MODEL') ?? 'openai/gpt-4o-mini';
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
        temperature: 0.75,
        max_tokens: 8192,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Write all copy in this language: ${language}\n\nBrief:\n${brief}`,
          },
        ],
      }),
    });

    if (res.status === 402) {
      return json(
        {
          error:
            'A Vercel AI Gateway egyenlege elfogyott. Egyenleg vagy fizetési mód kell a Vercel fiókon, különben a generálás nem indul.',
        },
        402,
      );
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('gateway error', res.status, detail.slice(0, 300));
      return json({ error: `A generálás nem sikerült (${res.status}).` }, 502);
    }

    const payload = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const document = parseJsonLoose(payload.choices?.[0]?.message?.content ?? '');

    return json({ document, durationMs: Date.now() - started });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('vey-generate failed', message);
    return json({ error: message }, 500);
  }
});
