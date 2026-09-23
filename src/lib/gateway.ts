/**
 * A generator kliens-oldali belepesi pontja.
 *
 * MIERT NEM KÖZVETLENUL A GATEWAYT HÍVJUK:
 * a bongeszobol inditott keres egy masik domainre megy (ai-gateway.vercel.sh),
 * es a gateway nem engedelyezi a cross-origin hívást — a `fetch` el sem indul,
 * es a felhasznalo annyit lat, hogy „nem erte el a szolgaltatast". Ez nem
 * hitelesitesi hiba, hanem CORS: a keres el sem hagyja a bongeszot.
 *
 * Ezert a keres a sajat Edge Functionunkon megy at (`vey-generate`), amely
 * szerveroldalon hivja a gatewayt. Ott nincs CORS, es a gateway a deployment
 * OIDC tokenjevel azonosit — igy tovabbra sem kell API-kulcs a bongeszoben.
 */

import { parseSite, type SiteDocument } from './site-schema';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
 * Brief -> kesz oldal.
 *
 * A funkcio a nyers modellkimenetet adja vissza (`document`), amit itt a
 * `parseSite` szur at: az allow-listen kivuli blokktipusok kimaradnak, tehat
 * egy hibas valasz rovidebb oldalt ad, nem omlik ossze a DOM fele vezeto uton.
 */
export async function generateSite(brief: string, language = 'hu'): Promise<SiteDocument> {
  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_URL}/vey-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ brief, language }),
    });
  } catch {
    throw new GatewayError(
      'A generálás nem érte el a szervert. Ellenőrizd a kapcsolatot, és próbáld újra.',
      0,
    );
  }

  const body = (await res.json().catch(() => ({}))) as {
    document?: unknown;
    error?: string;
  };

  if (res.status === 404) {
    throw new GatewayError(
      'A generáló funkció (vey-generate) nincs telepítve ezen a Supabase projekten.',
      404,
    );
  }

  if (res.status === 402) {
    throw new GatewayError(
      body.error ??
        'A Vercel AI Gateway egyenlege elfogyott. Egyenleg vagy fizetési mód kell a Vercel fiókon, különben a generálás nem indul.',
      402,
    );
  }

  if (!res.ok) {
    throw new GatewayError(
      body.error ?? `A generálás nem sikerült (${res.status}).`,
      res.status,
    );
  }

  const site = parseSite(body.document);
  if (!site) {
    throw new GatewayError('A válasz nem tartalmazott felhasználható oldalt.', 0);
  }

  return site;
}
