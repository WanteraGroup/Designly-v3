import { AuthRequiredError, authHeaders, SUPABASE_URL } from './supabase-client';

const FUNCTIONS_URL = SUPABASE_URL + '/functions/v1';

export type VectorResult = {
  svg: string;
  name?: string;
  viewBox?: string;
  model?: string;
};

export async function generateVectorFromPrompt(prompt: string, style = 'clean logo'): Promise<VectorResult> {
  const res = await fetch(FUNCTIONS_URL + '/designly-vector', {
    method: 'POST',
    headers: await authHeaders(true),
    body: JSON.stringify({ prompt, style }),
  });
  const body = (await res.json().catch(() => ({}))) as Partial<VectorResult> & { error?: string; message?: string };
  if (!res.ok || typeof body.svg !== 'string' || !body.svg.trim()) {
    throw new Error(body.message ?? body.error ?? ('A vektor generálás nem sikerült (' + res.status + ').'));
  }
  return { ...body, svg: body.svg };
}

export async function getVectorAuthCheck(): Promise<void> {
  const { supabase } = await import('./supabase-client');
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new AuthRequiredError();
}
