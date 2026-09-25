import { AuthRequiredError, authHeaders, SUPABASE_URL, supabase } from './supabase-client';

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

export type CreativeImageOptions = {
  files?: File[];
  imageUrls?: string[];
  resolution?: '1k' | '2k' | '4k';
};

async function uploadReferenceImage(file: File, userId: string): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
    throw new Error('Csak PNG, JPG vagy WEBP referencia-kép használható.');
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Egy referencia-kép legfeljebb 20 MB lehet.');
  }
  const extension = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = userId + '/references/' + crypto.randomUUID() + '.' + extension;
  const { error } = await supabase.storage.from('designly-generations').upload(path, file, {
    contentType: file.type || 'image/png',
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error('A referencia-kép feltöltése sikertelen: ' + error.message);
  const { data } = supabase.storage.from('designly-generations').getPublicUrl(path);
  if (!data.publicUrl) throw new Error('A referencia-kép URL-je nem jött létre.');
  return data.publicUrl;
}

export async function generateCreativeImage(
  prompt: string,
  aspectRatio = '1:1',
  options: CreativeImageOptions = {},
): Promise<CreativeImageResult> {
  const imageUrls = [...(options.imageUrls ?? [])].map(v => v.trim()).filter(Boolean).slice(0, 14);
  const files = (options.files ?? []).slice(0, Math.max(0, 14 - imageUrls.length));
  if (files.length) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new AuthRequiredError();
    for (const file of files) imageUrls.push(await uploadReferenceImage(file, userId));
  }
  const res = await fetch(FUNCTIONS_URL + '/designly-image', {
    method: 'POST',
    headers: await authHeaders(true),
    body: JSON.stringify({
      prompt,
      aspectRatio,
      ...(imageUrls.length ? { images: imageUrls, resolution: options.resolution || '1k' } : {}),
    }),
  });

  const body = (await res.json().catch(() => ({}))) as Partial<CreativeImageResult> & { error?: string; message?: string };
  if (!res.ok || typeof body.url !== 'string' || !body.url.trim()) {
    throw new Error(body.message ?? body.error ?? ('A képgenerálás nem sikerült (' + res.status + ').'));
  }
  return { ...body, url: body.url };
}


export type CreativeEditOptions = {
  files?: File[];
  imageUrls?: string[];
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
  const images = [...(options.imageUrls ?? [])].map(v => v.trim()).filter(Boolean).slice(0, 14);
  const files = (options.files ?? []).slice(0, Math.max(0, 14 - images.length));
  if (!images.length && !files.length) throw new Error('Legalabb egy kepet vagy kep-linket adj meg.');
  if (!options.prompt.trim()) throw new Error('Add meg, mit szeretnel modositani.');
  if (files.length) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new AuthRequiredError();
    for (const file of files) images.push(await uploadEditSource(file, userId));
  }
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
