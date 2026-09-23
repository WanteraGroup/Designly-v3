import type { SiteDocument } from './site-schema';

export interface StudioProject { id:string; name:string; updatedAt:number; brief:string; site:SiteDocument|null; assets:StudioAsset[]; }
export interface StudioAsset { id:string; kind:'image'|'logo'|'video'|'file'; name:string; url:string; createdAt:number; }
const KEY='designly-studio-projects-v4';
const read=():StudioProject[]=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
const write=(x:StudioProject[])=>localStorage.setItem(KEY,JSON.stringify(x));
export function listProjects(){return read().sort((a,b)=>b.updatedAt-a.updatedAt)}
export function createProject(name:string,brief=''){const p:StudioProject={id:crypto.randomUUID(),name,brief,site:null,assets:[],updatedAt:Date.now()};write([p,...read()]);return p}
export function saveProject(p:StudioProject){const all=read();const i=all.findIndex(x=>x.id===p.id);p.updatedAt=Date.now();if(i<0)all.unshift(p);else all[i]=p;write(all);return p}
export function deleteProject(id:string){write(read().filter(x=>x.id!==id))}
