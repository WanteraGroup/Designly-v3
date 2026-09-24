import { AuthRequiredError, authHeaders, SUPABASE_URL, supabase } from './supabase-client';

const FUNCTIONS_URL = SUPABASE_URL + '/functions/v1';

export type VideoProvider = 'wan' | 'kling';

export type VideoGenerationOptions = {
  image?: File;
  imageUrl?: string;
  prompt: string;
  provider?: VideoProvider;
  duration?: 5 | 10;
};

export type VideoGenerationStatus = {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  provider: string;
  model?: string;
  jobId?: string;
  url?: string;
  cost?: number;
  error?: string;
  [key: string]: unknown;
};

async function uploadVideoSource(file: File, userId: string): Promise<string> {
  const extension = (file.name.split('.').pop() || 'png')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') || 'png';
  const path = `${userId}/videos/sources/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('designly-generations').upload(path, file, {
    contentType: file.type || 'image/png',
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error('A videó referencia-kép feltöltése sikertelen: ' + error.message);
  const { data } = supabase.storage.from('designly-generations').getPublicUrl(path);
  if (!data.publicUrl) throw new Error('A videó referencia-kép URL-je nem jött létre.');
  return data.publicUrl;
}

export async function startVideoGeneration(options: VideoGenerationOptions): Promise<VideoGenerationStatus> {
  if (!options.prompt.trim()) throw new Error('Add meg, milyen mozgást szeretnél a videóban.');
  if (!options.image && !options.imageUrl) throw new Error('Adj meg egy referencia-képet a videóhoz.');

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new AuthRequiredError();

  const imageUrl = options.image
    ? await uploadVideoSource(options.image, userId)
    : options.imageUrl!.trim();

  const res = await fetch(FUNCTIONS_URL + '/designly-video', {
    method: 'POST',
    headers: await authHeaders(true),
    body: JSON.stringify({
      action: 'start',
      provider: options.provider || 'wan',
      imageUrl,
      prompt: options.prompt.trim(),
      duration: options.duration || 5,
    }),
  });

  const body = await res.json().catch(() => ({})) as Partial<VideoGenerationStatus> & {
    error?: string;
    message?: string;
  };

  if (!res.ok || typeof body.jobId !== 'string') {
    throw new Error(body.message ?? body.error ?? ('A videógenerálás indítása sikertelen (' + res.status + ').'));
  }

  return body as VideoGenerationStatus;
}

export async function pollVideoGeneration(
  jobId: string,
  provider: VideoProvider,
): Promise<VideoGenerationStatus> {
  const res = await fetch(FUNCTIONS_URL + '/designly-video', {
    method: 'POST',
    headers: await authHeaders(true),
    body: JSON.stringify({
      action: 'status',
      provider,
      jobId,
    }),
  });

  const body = await res.json().catch(() => ({})) as Partial<VideoGenerationStatus> & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? ('A videó állapotának lekérése sikertelen (' + res.status + ').'));
  }

  return body as VideoGenerationStatus;
}

export async function generateVideo(
  options: VideoGenerationOptions,
  onStatus?: (status: VideoGenerationStatus) => void,
): Promise<VideoGenerationStatus> {
  const provider = options.provider || 'wan';
  const started = await startVideoGeneration(options);
  onStatus?.(started);

  const maxAttempts = 50;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const status = await pollVideoGeneration(started.jobId!, provider);
    onStatus?.(status);

    if (status.status === 'COMPLETED') return status;
    if (status.status === 'FAILED') {
      throw new Error(status.error || 'A videógenerálás sikertelen.');
    }
  }

  throw new Error('A videógenerálás túllépte a kliens oldali várakozási időt. A RunPod feladat tovább futhat; indítsd újra az állapotellenőrzést később.');
}
