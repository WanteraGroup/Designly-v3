// A kozos provider-hivas a ket generator-funkcio szamara.
//
// MIERT KELL EZ A FAJL:
// a korabbi verzio a Vercel AI Gateway-t hivta, es a hitelesitesi fejlecbe a
// MODELL NEVET tette (`Authorization: Bearer openai/gpt-4o-mini`). Ez nem
// hitelesites: a gateway a deployment OIDC tokenjet varja, ami viszont egy
// Supabase Edge Functionnek nincs — a fuggveny nem Vercel deployment. Ezert a
// keres vagy 401-et kapott, vagy el sem jutott a modellig, es a felhasznalo
// annyit latott, hogy a generalas nem sikerult.
//
// A megoldas egy valodi provider-kulcs, amit Supabase secretkent tarolunk.
// A fuggveny a kliens kereset tovabbitja a provider fele, tehat a kulcs
// szerveroldalon marad, a bongeszobe soha nem kerul.
//
// A provider valaszthato: ha van GROQ_API_KEY, azt hasznaljuk (ingyenes szint
// van, es gyors); ha van OPENAI_API_KEY, azt. Ha egyik sincs, a fuggveny ezt
// NEVEN NEVEZI — nem egy altalanos 500-at ad, amibol nem derul ki, mi a baj.

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export interface ProviderResult {
  content: string;
  durationMs: number;
}

/** A fuggveny hibaja, amit a HTTP-státuszkóddal egyutt adunk vissza. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

interface ProviderConfig {
  name: string;
  url: string;
  model: string;
  key: string;
}

/**
 * Melyik provider all rendelkezesre. A sorrend szandekos: a Groq az elso,
 * mert a jelenlegi projektben az a kulcs volt a terv.
 */
function resolveProvider(): ProviderConfig {
  const groq = Deno.env.get('GROQ_API_KEY') ?? Deno.env.get('GROQAPIKEY');
  if (groq) {
    return {
      name: 'Groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      model: Deno.env.get('DESIGNLY_MODEL') ?? 'llama-3.3-70b-versatile',
      key: groq,
    };
  }

  const openai = Deno.env.get('OPENAI_API_KEY');
  if (openai) {
    return {
      name: 'OpenAI',
      url: 'https://api.openai.com/v1/chat/completions',
      model: Deno.env.get('DESIGNLY_MODEL') ?? 'gpt-4o-mini',
      key: openai,
    };
  }

  throw new ProviderError(
    'Nincs beallitva AI provider kulcs ezen a Supabase projekten. ' +
      'Supabase -> Settings -> Edge Functions -> Secrets: add hozza a GROQ_API_KEY ' +
      '(vagy OPENAI_API_KEY) secretet, majd teleptsd ujra a fuggvenyeket.',
    503,
  );
}

/**
 * Egy chat-hivas a kivalasztott providerre.
 *
 * A `response_format: json_object` mindket providernel tamogatott, es a
 * generalas JSON-t var — enelkul a modell neha prose-ba csomagolja a valaszt.
 */
export async function chat(
  messages: ChatMessage[],
  options: { temperature: number; maxTokens: number },
): Promise<ProviderResult> {
  const provider = resolveProvider();
  const started = Date.now();

  let res: Response;
  try {
    res = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`,
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        response_format: { type: 'json_object' },
        messages,
      }),
    });
  } catch {
    throw new ProviderError(
      `A ${provider.name} nem erheto el. Ellenorizd a kapcsolatot, es probald ujra.`,
      502,
    );
  }

  if (res.status === 401 || res.status === 403) {
    throw new ProviderError(
      `A ${provider.name} elutasitotta a kulcsot (${res.status}). ` +
        'A secret hibas vagy visszavont — allitsd be ujra a Supabase-en.',
      401,
    );
  }

  if (res.status === 429) {
    throw new ProviderError(
      `A ${provider.name} atmenetileg korlatozza a kereseket (429). Probald ujra par perc mulva.`,
      429,
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('provider error', provider.name, res.status, detail.slice(0, 300));
    throw new ProviderError(
      `A generalas nem sikerult (${res.status}).`,
      502,
    );
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  return {
    content: payload.choices?.[0]?.message?.content ?? '',
    durationMs: Date.now() - started,
  };
}
