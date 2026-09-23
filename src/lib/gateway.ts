/**
 * A generator, amely a Vercel AI Gateway-en fut.
 *
 * Miert a gateway, es nem egy szolgaltato SDK-ja: a gateway a deployment sajat
 * OIDC tokenjevel hitelesit, igy a bongeszo nem tart API-kulcsot, es a buildhez
 * nem kell titok. A modellt a Vercel oldja fel, es a csapat AI Gateway
 * hasznalata ellen szamlazza — ezert ad egy feltoltetlen fiok 402-t, nem
 * hitelesitesi hibat.
 *
 * A modell BLOKKLISTAT ad vissza, nem markupot. A renderelo birtokol minden
 * elemet, ami a lapra kerul, tehat a generalt szoveg mindig szoveges csomopont.
 */

import { parseSite, type SiteDocument } from './site-schema';

const GATEWAY = 'https://ai-gateway.vercel.sh/v1/chat/completions';

/**
 * A prompt, ami egy mondatbol kesz oldalt csinal.
 *
 * Azert el itt, es nem az adatbazisban, mert ez a termek: minden szabaly azert
 * van, mert nelkule az eredmeny generikus. Az allow-list a site-schema.ts-ben
 * is szerepel, es a kettonek egyutt kell mozognia — egy itt megnevezett
 * blokktipus, amit a parser elutasit, csendben eltunt szekcio.
 */
export const SYSTEM_PROMPT = `You are a website generator. You receive a one-sentence brief and you return a finished website as an ordered list of blocks.

You do NOT write HTML, CSS or JavaScript. You describe the page, and the renderer builds it.

Reply with a single JSON object:

{
  "site": {
    "title":    string,
    "language": string,
    "theme": {
      "mode":         "dark" | "light",
      "palette":      string[],
      "heading_font": string,
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
  A plausible fictional business name, address and phone number is correct; an
  empty field is not.
- Choose the palette and the fonts from what the brief asks for. A dark,
  premium request gets dark mode and a restrained palette; a bright clinic
  gets light mode.
- "image_query" is a short English phrase naming a photograph to search for.
  It is a query, not visible copy.
- Return JSON only. No prose, no code fences, no commentary.`;

/** Strips a code fence, majd a kulso kapcsos zarojelekig vag, majd parse-ol. */
export function parseJsonLoose(raw: string): unknown {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error('A modell nem JSON-t adott vissza.');
  }
}

export class GatewayError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'GatewayError';
  }
}

/**
 * Egy hivas, egy kesz dokumentum.
 *
 * A 402 kulon ag, mert ez az a hiba, amibe egy friss deployment tenylegesen
 * belefut: a gateway elerheto es a token ervenyes, de a csapatnak nincs AI
 * kreditje. Ez szamlazasi allapot, nem hiba, ezert az uzenet ezt mondja ki,
 * nem egy generikus hibaszoveget, amin a felhasznalo nem tud valtoztatni.
 *
 * A nyers modellkimenet a parseSite-en megy at, ami kidobja az allow-listen
 * kivuli blokktipusokat — igy egy hibas valasz rovidebb oldalt ad, nem omlik
 * ossze a DOM fele vezeto uton.
 */
export async function generateSite(brief: string, language = 'hu'): Promise<SiteDocument> {
  const res = await fetch(GATEWAY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
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
    throw new GatewayError(
      'A Vercel AI Gateway egyenlege elfogyott. Egyenleg vagy fizetesi mod kell a Vercel fiokon, kulonben a generalas nem indul.',
      402,
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new GatewayError(
      `A generalas nem sikerult (${res.status}). ${detail.slice(0, 200)}`,
      res.status,
    );
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = payload.choices?.[0]?.message?.content ?? '';
  const site = parseSite(parseJsonLoose(content));
  if (!site) throw new Error('A valasz nem tartalmazott hasznalhato oldalt.');

  return site;
}
