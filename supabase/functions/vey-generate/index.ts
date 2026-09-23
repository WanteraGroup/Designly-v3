// vey-generate — turns a one-sentence brief into a finished site document.
//
// A modell egy valodi provider-kulccsal megy (Groq vagy OpenAI), amit Supabase
// secretkent tarolunk. A korabbi verzio a Vercel AI Gateway-t probalta hivni a
// modell nevével a hitelesitesi fejlecben — az nem hitelesites, es a Supabase
// fuggvenynek nincs OIDC tokenje a gatewayhez. Ez volt a nema hiba oka: minden
// build zold volt, minden fuggveny ACTIVE, es a generalas megis elhasalt.
//
// A modell blokklistat ad vissza, soha nem markupot. A renderelo birtokol minden
// elemet, ami a lapra kerul, tehat a generalt szoveg csak szoveges csomopontkent
// erkezhet. A prompt itt el, szerveroldalon, ahonnan a bongeszo nem irhatja at.

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

  try {
    const result = await chat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Write all copy in this language: ${language}\n\nBrief:\n${brief}`,
        },
      ],
      { temperature: 0.75, maxTokens: 8192 },
    );

    const document = parseJsonLoose(result.content);
    return json({ document, durationMs: result.durationMs });
  } catch (e) {
    if (e instanceof ProviderError) {
      return json({ error: e.message }, e.status);
    }
    const message = e instanceof Error ? e.message : String(e);
    console.error('vey-generate failed', message);
    return json({ error: message }, 500);
  }
});
