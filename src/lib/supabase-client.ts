import { createClient } from '@supabase/supabase-js';

// A Supabase kapcsolat build-idobeni kotelezo. Korabban a projekt URL es a
// publishable key be volt egetve fallbackkent, igy egy hianyzo Vercel env
// csendben egy MASIK projektre mutatott — a build zold maradt, a hiba csak
// elesben derult ki. Most a hianyzo valtozo itt all meg, nem a produkcioban.
const RAW_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const RAW_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

const MISSING: string[] = [];
if (!RAW_URL) MISSING.push('VITE_SUPABASE_URL');
if (!RAW_KEY) MISSING.push('VITE_SUPABASE_ANON_KEY');

if (MISSING.length) {
  throw new Error(
    'A Supabase kapcsolat nincs beallitva ebben a buildben. Hianyzo environment valtozo(k): ' +
      MISSING.join(', ') +
      '. Allitsd be oket a Vercel projekt Environment Variables reszben (Production, Preview es Development), majd deployolj ujra.',
  );
}

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
