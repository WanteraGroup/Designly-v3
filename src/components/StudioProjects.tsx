import { Plus, FolderOpen, Trash2 } from 'lucide-react';
import { createProject, deleteProject, listProjects, type StudioProject } from '../lib/project-store';
import { useEffect, useState } from 'react';
export default function StudioProjects({active,onSelect}:{active:StudioProject|null;onSelect:(p:StudioProject)=>void}){
 const [items,setItems]=useState<StudioProject[]>([]);
 const refresh=()=>setItems(listProjects());
 useEffect(refresh,[]);
 return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-white/45">Projects</span><button onClick={()=>{const p=createProject('Új projekt');refresh();onSelect(p)}} className="rounded-lg bg-violet-500/15 p-2 text-violet-300"><Plus className="h-4 w-4"/></button></div>{items.length===0?<p className="text-xs text-white/30">Még nincs projekt.</p>:<div className="space-y-1">{items.slice(0,8).map(p=><div key={p.id} className={`flex items-center gap-2 rounded-lg px-2 py-2 ${active?.id===p.id?'bg-white/10':''}`}><button className="min-w-0 flex-1 truncate text-left text-xs" onClick={()=>onSelect(p)}><FolderOpen className="mr-2 inline h-3.5 w-3.5 opacity-50"/>{p.name}</button><button onClick={()=>{deleteProject(p.id);refresh()}} className="text-white/25 hover:text-red-300"><Trash2 className="h-3.5 w-3.5"/></button></div>)}</div>}</div>
}