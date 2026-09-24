import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
  'https://mxrgdcvmxzhocbdhtlhg.supabase.co';

const PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  'sb_publishable_BAAqJlE-bkcIlanoHtPDLg_rcfiZ64-';

export const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export class AuthRequiredError extends Error {
  constructor(message = 'Jelentkezz be a DESIGNLY workspace használatához.') {
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

export { SUPABASE_URL, PUBLISHABLE_KEY };
