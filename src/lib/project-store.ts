import { parseSite, type SiteDocument } from './site-schema';
import { supabase } from './supabase-client';

export interface StudioProject {
  id: string;
  name: string;
  updatedAt: number;
  brief: string;
  site: SiteDocument | null;
  assets: StudioAsset[];
}

export interface StudioAsset {
  id: string;
  kind: 'image' | 'logo' | 'video' | 'file';
  name: string;
  url: string;
  createdAt: number;
}

const KEY = 'designly-studio-projects-v5';

function isAsset(value: unknown): value is StudioAsset {
  if (!value || typeof value !== 'object') return false;
  const x = value as Record<string, unknown>;
  return (
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    typeof x.url === 'string' &&
    typeof x.createdAt === 'number' &&
    ['image', 'logo', 'video', 'file'].includes(String(x.kind))
  );
}

function isProject(value: unknown): value is StudioProject {
  if (!value || typeof value !== 'object') return false;
  const x = value as Record<string, unknown>;
  return (
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    typeof x.updatedAt === 'number' &&
    typeof x.brief === 'string' &&
    (x.site === null || (typeof x.site === 'object' && parseSite(x.site) !== null)) &&
    Array.isArray(x.assets) &&
    x.assets.every(isAsset)
  );
}

function readLocal(): StudioProject[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]') as unknown;
    return Array.isArray(raw) ? raw.filter(isProject).slice(0, 100) : [];
  } catch {
    return [];
  }
}

function writeLocal(projects: StudioProject[]) {
  localStorage.setItem(KEY, JSON.stringify(projects.slice(0, 100)));
}

export function listProjects(): StudioProject[] {
  return readLocal().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function createProject(name: string, brief = ''): StudioProject {
  const p: StudioProject = {
    id: crypto.randomUUID(),
    name: name.slice(0, 160),
    brief: brief.slice(0, 4000),
    site: null,
    assets: [],
    updatedAt: Date.now(),
  };
  writeLocal([p, ...readLocal()]);
  return p;
}

export function saveProject(project: StudioProject): StudioProject {
  const all = readLocal();
  const safe: StudioProject = {
    ...project,
    name: project.name.slice(0, 160),
    brief: project.brief.slice(0, 4000),
    site: project.site ? (parseSite(project.site) ?? null) : null,
    assets: Array.isArray(project.assets) ? project.assets.filter(isAsset).slice(0, 100) : [],
    updatedAt: Date.now(),
  };
  const index = all.findIndex((item) => item.id === safe.id);
  if (index < 0) all.unshift(safe);
  else all[index] = safe;
  writeLocal(all);
  return safe;
}

export async function saveProjectCloud(project: StudioProject): Promise<void> {
  const safe = saveProject(project);
  const { error } = await supabase.from('projects').upsert({
    id: safe.id,
    name: safe.name,
    type: 'custom',
    status: 'draft',
    brief: safe.brief,
    preview_url: null,
    config: {
      version: 5,
      site: safe.site,
      assets: safe.assets,
    },
    updated_at: new Date(safe.updatedAt).toISOString(),
  }, { onConflict: 'id' });

  if (error) throw new Error('A projekt felhőmentése sikertelen: ' + error.message);
}

export async function hydrateProjects(): Promise<StudioProject[]> {
  const local = listProjects();
  const { data, error } = await supabase
    .from('projects')
    .select('id,name,brief,config,updated_at')
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    console.warn('DESIGNLY projektek felhőbetöltése sikertelen:', error.message);
    return local;
  }

  const cloud: StudioProject[] = (data ?? []).flatMap((row) => {
    const config = row.config && typeof row.config === 'object'
      ? row.config as Record<string, unknown>
      : {};
    const parsedSite = config.site ? parseSite(config.site) : null;
    const assets = Array.isArray(config.assets) ? config.assets.filter(isAsset) : [];
    return [{
      id: String(row.id),
      name: String(row.name ?? 'DESIGNLY projekt'),
      brief: String(row.brief ?? ''),
      updatedAt: row.updated_at ? Date.parse(String(row.updated_at)) || Date.now() : Date.now(),
      site: parsedSite,
      assets,
    }];
  });

  const merged = [...cloud];
  for (const item of local) {
    if (!merged.some((x) => x.id === item.id)) merged.push(item);
  }
  merged.sort((a, b) => b.updatedAt - a.updatedAt);
  writeLocal(merged);

  // A lokális projektet is feltöltjük, ha még nincs a felhőben.
  const cloudIds = new Set(cloud.map((x) => x.id));
  for (const item of local.filter((x) => !cloudIds.has(x.id)).slice(0, 20)) {
    try {
      await saveProjectCloud(item);
    } catch (e) {
      console.warn('DESIGNLY lokális projekt cloud sync hiba:', e);
    }
  }

  return listProjects();
}

export function deleteProject(id: string) {
  writeLocal(readLocal().filter((project) => project.id !== id));
}

export async function deleteProjectCloud(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw new Error('A projekt felhőből törlése sikertelen: ' + error.message);
  deleteProject(id);
}
