import { authHeaders, SUPABASE_URL } from './supabase-client';

const FUNCTIONS_URL = SUPABASE_URL + '/functions/v1';

export type CreativeImageResult = {
  url: string;
  width?: number | null;
  height?: number | null;
  description?: string;
  model?: string;
  provider?: string;
  requestedAspectRatio?: string;
  outputAspectRatio?: string;
  [key: string]: unknown;
};

export async function generateCreativeImage(prompt: string, aspectRatio = '1:1'): Promise<CreativeImageResult> {
  const res = await fetch(FUNCTIONS_URL + '/designly-image', {
    method: 'POST',
    headers: await authHeaders(true),
    body: JSON.stringify({ prompt, aspectRatio }),
  });

  const body = (await res.json().catch(() => ({}))) as Partial<CreativeImageResult> & { error?: string; message?: string };
  if (!res.ok || typeof body.url !== 'string' || !body.url.trim()) {
    throw new Error(body.message ?? body.error ?? ('A képgenerálás nem sikerült (' + res.status + ').'));
  }
  return { ...body, url: body.url };
}
