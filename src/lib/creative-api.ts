import { authHeaders, SUPABASE_URL, supabase } from './supabase-client';

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


export type CreativeEditOptions = {
  files: File[];
  prompt: string;
  aspectRatio?: string;
  resolution?: '1k' | '2k' | '4k';
};

async function uploadEditSource(file: File, userId: string): Promise<string> {
  const extension = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `${userId}/edits/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('designly-generations').upload(path, file, {
    contentType: file.type || 'image/png',
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error('A referencia-kep feltoltese sikertelen: ' + error.message);
  const { data } = supabase.storage.from('designly-generations').getPublicUrl(path);
  if (!data.publicUrl) throw new Error('A referencia-kep URL-je nem jott letre.');
  return data.publicUrl;
}

export async function editCreativeImage(options: CreativeEditOptions): Promise<CreativeImageResult> {
  if (!options.files.length) throw new Error('Legalabb egy kepet valassz.');
  if (options.files.length > 14) throw new Error('Legfeljebb 14 referencia-kep adhato meg.');
  if (!options.prompt.trim()) throw new Error('Add meg, mit szeretnel modositani.');
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new AuthRequiredError();
  const images = [];
  for (const file of options.files) images.push(await uploadEditSource(file, userId));
  const res = await fetch(FUNCTIONS_URL + '/designly-image', {
    method: 'POST',
    headers: await authHeaders(true),
    body: JSON.stringify({
      mode: 'edit',
      images,
      prompt: options.prompt.trim(),
      aspectRatio: options.aspectRatio || '1:1',
      resolution: options.resolution || '1k',
    }),
  });
  const body = (await res.json().catch(() => ({}))) as Partial<CreativeImageResult> & { error?: string; message?: string };
  if (!res.ok || typeof body.url !== 'string' || !body.url.trim()) {
    throw new Error(body.message ?? body.error ?? ('Az AI Edit nem sikerult (' + res.status + ').'));
  }
  return { ...body, url: body.url };
}
