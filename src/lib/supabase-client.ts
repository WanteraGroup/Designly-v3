import { createClient } from '@supabase/supabase-js';

// Vercelben az env változók az elsődlegesek. Ha a Vercel projektben még
// nincsenek beállítva, a DESIGNITY publikus Supabase kapcsolatával indulunk,
// így a landing oldal nem áll meg egy kliensoldali konfigurációs hibánál.
const SUPABASE_DEFAULT_URL = 'https://mxrgdcvmxzhocbdhtlhg.supabase.co';
const SUPABASE_DEFAULT_KEY = 'sb_publishable_BAAqJlE-bkcIlanoHtPDLg_rcfiZ64-';

const RAW_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || SUPABASE_DEFAULT_URL;
const RAW_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || SUPABASE_DEFAULT_KEY;

export const SUPABASE_URL = RAW_URL;
export const PUBLISHABLE_KEY = RAW_KEY;

export const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export class AuthRequiredError extends Error {
  constructor(message = 'Jelentkezz be a DESIGNLY workspace hasznalatahoz.') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export async function authHeaders(requireSession = true): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (requireSession && !token) {
    throw new AuthRequiredError();
  }

  return {
    'Content-Type': 'application/json',
    apikey: PUBLISHABLE_KEY,
    Authorization: `Bearer ${token ?? PUBLISHABLE_KEY}`,
  };
}
