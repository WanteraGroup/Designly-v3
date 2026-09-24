import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

if (!SUPABASE_URL || !ANON_KEY) {
  throw new Error('A Supabase kapcsolat nincs beallitva ebben a buildben.');
}

export const supabase = createClient(SUPABASE_URL, ANON_KEY);

export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

/**
 * Az Edge Function hivasok headere.
 *
 * Az `Authorization` a felhasznalo session tokenje, az `apikey` az anon key.
 * A ketto nem felcserelheto: a `verify_jwt = true` bekapcsolasa utan az anon
 * keyt Authorization-kent kuldve a Supabase 401-et ad, mert az nem session
 * token. A korabbi ot fajl mind ezt tette.
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('A folytatashoz jelentkezz be.');
  return {
    'Content-Type': 'application/json',
    apikey: ANON_KEY!,
    Authorization: `Bearer ${token}`,
  };
}

export async function currentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
