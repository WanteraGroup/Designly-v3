import { AuthRequiredError, authHeaders, SUPABASE_URL, supabase } from './supabase-client';

const FUNCTIONS_URL = SUPABASE_URL + '/functions/v1';

export type VideoProvider = 'wan' | 'kling';

export type VideoGenerationOptions = {
  image?: File;
  imageUrl?: string;
  prompt: string;
  provider?: VideoProvider;
  mode?: "t2v" | "i2v";
  duration?: 5 | 10;
};

export type VideoGenerationStatus = {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  provider: string;
  model?: string;
  mode?: 't2v' | 'i2v';
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
  if (!options.prompt.trim()) throw new Error('Add meg a videó promptját.');
  const mode = options.mode || (options.image || options.imageUrl ? "i2v" : "t2v");
  if (mode === "i2v" && !options.image && !options.imageUrl) {
    throw new Error('Adj meg egy referencia-képet az image-to-video módhoz.');
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new AuthRequiredError();

  const imageUrl = options.image
    ? await uploadVideoSource(options.image, userId)
    : options.imageUrl?.trim();

  const res = await fetch(FUNCTIONS_URL + '/designly-video', {
    method: 'POST',
    headers: await authHeaders(true),
    body: JSON.stringify({
      action: 'start',
      provider: options.provider || 'wan',
      mode,
      ...(imageUrl ? { imageUrl } : {}),
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
  mode: "t2v" | "i2v" = "i2v",
): Promise<VideoGenerationStatus> {
  const res = await fetch(FUNCTIONS_URL + '/designly-video', {
    method: 'POST',
    headers: await authHeaders(true),
    body: JSON.stringify({
      action: 'status',
      provider,
      mode,
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
  const mode = options.mode || (options.image || options.imageUrl ? "i2v" : "t2v");
  const started = await startVideoGeneration({ ...options, mode });
  onStatus?.(started);

  const maxAttempts = 50;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const status = await pollVideoGeneration(started.jobId!, provider, mode);
    onStatus?.(status);

    if (status.status === 'COMPLETED') return status;
    if (status.status === 'FAILED') {
      throw new Error(status.error || 'A videógenerálás sikertelen.');
    }
  }

  throw new Error('A videógenerálás túllépte a kliens oldali várakozási időt. A RunPod feladat tovább futhat; indítsd újra az állapotellenőrzést később.');
}
