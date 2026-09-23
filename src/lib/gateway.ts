import { parseSite, type SiteDocument } from './site-schema';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

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
}

export class GatewayError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'GatewayError';
  }
}

export async function generateSite(brief: string, language = 'hu'): Promise<SiteGenerationResult> {
  if (!brief.trim()) throw new GatewayError('A brief nem lehet üres.', 400);
  if (!import.meta.env.VITE_SUPABASE_URL) {
    throw new GatewayError('A Supabase kapcsolat nincs beállítva ebben a buildben.', 0);
  }

  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_URL}/designly-v3-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ANON_KEY ? { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY } : {}),
      },
      body: JSON.stringify({ brief: brief.slice(0, 4000), language }),
    });
  } catch {
    throw new GatewayError('A VYRON CORE szerver nem érhető el. Ellenőrizd a Supabase kapcsolatot.', 0);
  }

  const body = await res.json().catch(() => ({})) as {
    document?: unknown;
    error?: string;
    message?: string;
    activeAgents?: string[];
    boss?: string;
    master?: string;
    diagnostics?: { runtimeMode?: 'ai' | 'fallback' };
    orchestration?: SiteGenerationResult['orchestration'];
  };

  if (res.status === 429) throw new GatewayError(body.message || 'Túl sok kérés rövid idő alatt.', 429);
  if (!res.ok) throw new GatewayError(body.message || body.error || `A VYRON CORE hibát adott (${res.status}).`, res.status);

  const site = parseSite(body.document);
  if (!site) throw new GatewayError('A VYRON CORE válasza nem tartalmazott használható oldalt.', 0);

  return {
    site,
    activeAgents: Array.isArray(body.activeAgents) ? body.activeAgents : [],
    boss: body.boss || 'core',
    master: body.master || 'master',
    runtimeMode: body.diagnostics?.runtimeMode === 'ai' ? 'ai' : 'fallback',
    orchestration: body.orchestration,
  };
}
