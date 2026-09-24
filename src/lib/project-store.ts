import { parseSite, type SiteDocument } from './site-schema';

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

const KEY = 'designly-studio-projects-v4';

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

function read(): StudioProject[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]') as unknown;
    return Array.isArray(raw)
      ? raw.filter(isProject).slice(0, 100)
      : [];
  } catch {
    return [];
  }
}

function write(projects: StudioProject[]) {
  localStorage.setItem(KEY, JSON.stringify(projects.slice(0, 100)));
}

export function listProjects(): StudioProject[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
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
  write([p, ...read()]);
  return p;
}

export function saveProject(project: StudioProject): StudioProject {
  const all = read();
  const safe: StudioProject = {
    ...project,
    name: project.name.slice(0, 160),
    brief: project.brief.slice(0, 4000),
    assets: Array.isArray(project.assets) ? project.assets.filter(isAsset).slice(0, 100) : [],
    updatedAt: Date.now(),
  };
  const index = all.findIndex((item) => item.id === safe.id);
  if (index < 0) all.unshift(safe);
  else all[index] = safe;
  write(all);
  return safe;
}

export function deleteProject(id: string) {
  write(read().filter((project) => project.id !== id));
}
