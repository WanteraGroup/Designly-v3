import { parseSite, type SiteDocument } from './site-schema';
import { FUNCTIONS_URL, authHeaders } from './supabase-client';

export interface SiteGenerationResult {
  site: SiteDocument;
  activeAgents: string[];
  boss: string;
  master: string;
  runtimeMode: 'ai' | 'fallback';
  orchestration?: {
    agents: string[];
    capabilities: string[];
    reasons: Record<string, string>;
    teamExecuted: boolean;
  };
  /**
   * A fallback nem egy siker-varians: a szerver a beepitett sablonvazlatot
   * adta vissza, mert a provider nem futott. A feluletnek ezt ki KELL irnia,
   * kulonben a felhasznalo kesz oldalnak hiszi a vazlatot.
   */
  fallbackReason?: string;
  creditsCharged?: number;
}

export class GatewayError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'GatewayError';
  }
}

export async function generateSite(brief: string, language = 'hu'): Promise<SiteGenerationResult> {
  if (!brief.trim()) throw new GatewayError('A brief nem lehet üres.', 400, 'INVALID_REQUEST');

  let headers: Record<string, string>;
  try {
    headers = await authHeaders();
  } catch {
    throw new GatewayError('A generáláshoz jelentkezz be.', 401, 'AUTH_REQUIRED');
  }

  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_URL}/designly-v3-agent`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ brief: brief.slice(0, 4000), language }),
    });
  } catch {
    throw new GatewayError('A VYRON CORE szerver nem érhető el. Ellenőrizd a Supabase kapcsolatot.', 0, 'NETWORK');
  }

  const body = (await res.json().catch(() => ({}))) as {
    document?: unknown;
    error?: string;
    message?: string;
    activeAgents?: string[];
    boss?: string;
    master?: string;
    diagnostics?: { runtimeMode?: 'ai' | 'fallback'; providerError?: string | null; creditsCharged?: number };
    orchestration?: SiteGenerationResult['orchestration'];
  };

  if (res.status === 429) throw new GatewayError(body.message || 'Túl sok kérés rövid idő alatt.', 429, 'RATE_LIMITED');
  if (res.status === 401) throw new GatewayError('A munkamenet lejárt. Jelentkezz be újra.', 401, 'AUTH_REQUIRED');
  if (res.status === 402) throw new GatewayError(body.message || 'Elfogytak a kreditek.', 402, 'INSUFFICIENT_CREDITS');
  if (!res.ok) throw new GatewayError(body.message || body.error || `A VYRON CORE hibát adott (${res.status}).`, res.status);

  const site = parseSite(body.document);
  if (!site) throw new GatewayError('A VYRON CORE válasza nem tartalmazott használható oldalt.', 0, 'BAD_DOCUMENT');

  const runtimeMode = body.diagnostics?.runtimeMode === 'ai' ? 'ai' : 'fallback';

  return {
    site,
    activeAgents: Array.isArray(body.activeAgents) ? body.activeAgents : [],
    boss: body.boss || 'core',
    master: body.master || 'master',
    runtimeMode,
    orchestration: body.orchestration,
    ...(runtimeMode === 'fallback'
      ? { fallbackReason: body.diagnostics?.providerError || 'A provider nem futott le, ezért sablonvázlat készült.' }
      : {}),
    ...(typeof body.diagnostics?.creditsCharged === 'number'
      ? { creditsCharged: body.diagnostics.creditsCharged }
      : {}),
  };
}
