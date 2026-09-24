/*
 * DESIGNLY V3 — a kliens-oldali Supabase kapcsolat EGY helyen.
 *
 * Korabban ot fajl tartotta a sajat `SUPABASE_URL` / `ANON_KEY` parosat, es
 * mindegyik az ANON keyt kuldte `Authorization` headerben. A `verify_jwt = true`
 * bekapcsolasa utan ez 401-et ad, mert az anon key nem felhasznaloi session
 * token. Ezert: egy kliens, egy header-epito, es minden hivas ezt hasznalja.
 *
 * A hardkodolt projekt-URL fallbacket szandekosan elhagytuk. Egy hianyzo
 * build-valtozo eddig csendben egy masik Supabase projektre mutatott — az ilyen
 * hiba a legrosszabb fajta, mert mukodni latszik. Most inkabb build-idoben
 * all meg a folyamat.
 */
import { createClient, type Session } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

if (!SUPABASE_URL || !ANON_KEY) {
  throw new Error(
    'A Supabase kapcsolat nincs beallitva ebben a buildben. Add meg a VITE_SUPABASE_URL es a VITE_SUPABASE_ANON_KEY valtozot.',
  );
}

export const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

/** A bejelentkezett felhasznalo, vagy null. */
export async function currentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * Az Edge Function hivasokhoz tartozo headerek.
 *
 * Az `Authorization` a felhasznalo session tokenje (a Supabase a vegpont elott
 * ellenorzi), az `apikey` pedig az anon key — a Supabase ezt a projekt
 * azonositasara hasznalja, nem a felhasznaloera. A ketto nem felcserelheto.
 *
 * Ha nincs session, a hivas 401-et kap a Supabase szintjen. Ez szandekos:
 * auth nelkul nincs generalas, es nincs kreditkoltseg sem.
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('AUTH_REQUIRED: jelentkezz be a folytatashoz.');
  return {
    'Content-Type': 'application/json',
    apikey: ANON_KEY,
    Authorization: `Bearer ${token}`,
  };
}

/** A pontos tipus a session-tovabbadasztashoz, ha kell a hivo oldalon. */
export type { Session };
