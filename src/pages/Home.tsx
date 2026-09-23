import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check, Download, FolderOpen, Globe2, Image, Layers3, LayoutTemplate, Loader2,
  Palette, Plus, Sparkles, Trash2, Video, Wand2, X
} from 'lucide-react';
import { buildSite, refineSite, type SiteDocument } from '../lib/api';
import { downloadSiteHtml } from '../lib/export-html';
import { DESIGN_STYLES, LANGUAGES } from '../lib/constants';
import SitePreview from '../components/SitePreview';
import { createProject, deleteProject, listProjects, saveProject, type StudioProject } from '../lib/project-store';
import { DEFAULT_COSTS, getCredits, spend } from '../lib/credits';
import { getDesignlyTemplatePage } from '../lib/templates';
import { templateCoverUrl } from '../lib/template-art';
import CreativeModules from '../components/CreativeModules';

const tools = [
  ['site','Weboldal',Globe2,'AI weboldalépítő'],
  ['image','Kép',Image,'Képgenerátor'],
  ['brand','Arculat',Palette,'Brand studio'],
  ['social','Social',Layers3,'Kreatív kampányok'],
  ['video','Videó',Video,'Storyboard / video'],
  ['templates','Sablonok',LayoutTemplate,'Layout könyvtár'],
] as const;

export default function Home(){
  const [tool,setTool]=useState('site');
  const [brief,setBrief]=useState('');
  const [language,setLanguage]=useState('hu');
  const [style,setStyle]=useState<string|null>(null);
  const [site,setSite]=useState<SiteDocument|null>(null);
  const [pendingSite,setPendingSite]=useState<SiteDocument|null>(null);
  const [busy,setBusy]=useState(false);
  const [instruction,setInstruction]=useState('');
  const [error,setError]=useState('');
  const [reply,setReply]=useState('');
  const [credits,setCreditsState]=useState(getCredits());
  const [projects,setProjects]=useState<StudioProject[]>(listProjects());
  const [activeProject,setActiveProject]=useState<StudioProject|null>(projects[0] ?? null);
  const [templateOffset,setTemplateOffset]=useState(0);
  const ref=useRef<HTMLInputElement>(null);

  const templates=useMemo(()=>getDesignlyTemplatePage(templateOffset,12),[templateOffset]);

  useEffect(()=>{
    if(!activeProject && projects.length===0){
      const p=createProject('Új projekt');
      setProjects(listProjects());
      setActiveProject(p);
    }
  },[activeProject,projects.length]);

  useEffect(()=>{
    if(activeProject?.site) setSite(activeProject.site);
    if(activeProject?.brief) setBrief(activeProject.brief);
  },[activeProject?.id]);

  const refreshProjects=()=>setProjects(listProjects());

  const newProject=()=>{
    const p=createProject('Új projekt');
    refreshProjects();
    setActiveProject(p);
    setSite(null);
    setBrief('');
    setPendingSite(null);
    setError('');
  };

  const selectProject=(p:StudioProject)=>{
    setActiveProject(p);
    setSite(p.site);
    setBrief(p.brief);
    setPendingSite(null);
    setError('');
  };

  const generate=async()=>{
    if(!brief.trim()||busy||tool!=='site')return;
    setBusy(true); setError(''); setPendingSite(null);
    try{
      const generated=await buildSite(style?brief+' — stílus: '+style:brief,language);
      setPendingSite(generated);
    }catch(e){
      setError(e instanceof Error?e.message:String(e));
    }finally{setBusy(false)}
  };

  const acceptGenerated=()=>{
    if(!pendingSite||!activeProject)return;
    if(!spend('site')){
      setError('Nincs elegendő kredit. A generálás előnézete ingyenes; a kredit csak elfogadáskor kerül levonásra.');
      return;
    }
    const updated=saveProject({...activeProject,brief,site:pendingSite});
    setActiveProject(updated);
    setSite(pendingSite);
    setPendingSite(null);
    setCreditsState(getCredits());
    refreshProjects();
  };

  const rejectGenerated=()=>setPendingSite(null);

  const refine=async()=>{
    if(!site||!instruction.trim()||busy)return;
    setBusy(true); setError(''); setReply('');
    try{
      const r=await refineSite(site,instruction,language);
      setPendingSite(r.site);
      setReply(r.reply);
      setInstruction('');
    }catch(e){
      setError(e instanceof Error?e.message:String(e));
    }finally{setBusy(false)}
  };

  const acceptRefinement=()=>{
    if(!pendingSite||!activeProject)return;
    const updated=saveProject({...activeProject,site:pendingSite});
    setActiveProject(updated);
    setSite(pendingSite);
    setPendingSite(null);
    setReply('Módosítás elfogadva és elmentve.');
    refreshProjects();
  };

  const removeProject=(id:string)=>{
    deleteProject(id);
    const remaining=listProjects();
    setProjects(remaining);
    if(activeProject?.id===id){
      const next=remaining[0] ?? null;
      setActiveProject(next);
      setSite(next?.site ?? null);
      setBrief(next?.brief ?? '');
    }
  };

  useEffect(()=>{if(site||pendingSite)ref.current?.focus()},[site,pendingSite]);

  return <div className="min-h-screen bg-[#07080c] text-white">
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07080c]/90 px-5 py-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        <b className="tracking-[.28em]">DESIGNLY <span className="text-violet-400">STUDIO</span> <span className="ml-2 text-[9px] tracking-[.2em] text-white/30">V4</span></b>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs"><span className="text-white/40">Kredit</span> <b className="ml-1 text-violet-300">{credits}</b></div>
          <select value={language} onChange={e=>setLanguage(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
            {LANGUAGES.map(l=><option className="bg-slate-900" key={l.code} value={l.code}>{l.flag} {l.code.toUpperCase()}</option>)}
          </select>
        </div>
      </div>
    </header>

    <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[235px_1fr]">
      <aside className="border-r border-white/10 p-4">
        <div className="mb-4 flex items-center justify-between px-3">
          <p className="text-[10px] uppercase tracking-[.25em] text-white/35">Creative OS</p>
          <button onClick={newProject} title="Új projekt" className="rounded-lg border border-white/10 p-1.5 text-white/50 hover:text-white"><Plus className="h-3.5 w-3.5"/></button>
        </div>
        {tools.map(([id,label,Icon,desc])=><button key={id} onClick={()=>setTool(id)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${tool===id?'bg-violet-500/15 text-violet-300':'text-white/60 hover:bg-white/5 hover:text-white'}`}><Icon className="h-4 w-4"/><span><b className="block text-sm">{label}</b><small className="text-[10px] opacity-50">{desc}</small></span></button>)}

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-3">
          <div className="mb-2 flex items-center justify-between"><span className="text-[10px] uppercase tracking-[.2em] text-white/35">Projektek</span><button onClick={newProject} className="text-white/40 hover:text-white"><Plus className="h-3.5 w-3.5"/></button></div>
          <div className="space-y-1">
            {projects.slice(0,8).map(p=><div key={p.id} className={`group flex items-center gap-1 rounded-lg px-2 py-2 ${activeProject?.id===p.id?'bg-white/10':''}`}>
              <button onClick={()=>selectProject(p)} className="min-w-0 flex-1 truncate text-left text-xs"><FolderOpen className="mr-1.5 inline h-3 w-3 opacity-40"/>{p.name}</button>
              <button onClick={()=>removeProject(p.id)} className="opacity-0 transition group-hover:opacity-100 text-white/25 hover:text-red-300"><Trash2 className="h-3 w-3"/></button>
            </div>)}
            {!projects.length&&<p className="text-[10px] text-white/30">Még nincs projekt.</p>}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-[11px] leading-5 text-white/45"><b className="text-white/80">Veyra AI</b><br/>Egy projektben kezeli a weboldalt, képeket, arculatot, social és videó munkákat.</div>
      </aside>

      <main className="min-w-0 p-5 md:p-8">
      {tool==='site'&&<>
        <div className="mb-7">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[.2em] text-violet-400"><Sparkles className="h-4 w-4"/> AI Website Builder</div>
          <h1 className="mt-3 text-4xl font-black md:text-6xl">Mondd el. <span className="text-white/30">Mi felépítjük.</span></h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/45">Brief → struktúra → design → élő előnézet → természetes nyelvű szerkesztés → mentés → HTML export.</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[520px_minmax(0,1fr)]">
          <section>
            <div className="rounded-3xl border border-white/10 bg-white/[.035] p-5">
              <div className="mb-3 flex items-center justify-between"><span className="text-[10px] uppercase tracking-[.2em] text-white/35">{activeProject?.name ?? 'Projekt'}</span><span className="text-[10px] text-white/30">Előnézet: 0 kredit · Elfogadás: {DEFAULT_COSTS.site}</span></div>
              <textarea value={brief} onChange={e=>setBrief(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))void generate()}} rows={7} placeholder="Pl. Építs egy prémium, sötét étterem weboldalt foglalással, étlappal és galériával…" className="w-full resize-none bg-transparent text-lg leading-8 outline-none placeholder:text-white/20"/>
              <div className="mt-4 flex flex-wrap gap-2">{DESIGN_STYLES.slice(0,12).map(s=><button key={s} onClick={()=>setStyle(style===s?null:s)} className={`rounded-full border px-3 py-1 text-[11px] ${style===s?'border-violet-400/60 bg-violet-500/15 text-violet-300':'border-white/10 text-white/45'}`}>{s}</button>)}</div>
              <button disabled={busy||!brief.trim()} onClick={()=>void generate()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-5 py-4 text-sm font-bold disabled:opacity-40">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Sparkles className="h-4 w-4"/>}{busy?'Építés…':'Weboldal előnézet létrehozása'}</button>
            </div>

            {(site||pendingSite)&&<div className="mt-4 rounded-2xl border border-white/10 bg-white/[.025] p-4">
              <div className="mb-2 flex justify-between text-xs"><span>AI Editor</span><button onClick={()=>downloadSiteHtml(pendingSite??site!,brief)} title="HTML export"><Download className="h-4 w-4"/></button></div>
              <div className="flex gap-2"><input ref={ref} value={instruction} onChange={e=>setInstruction(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void refine()}} placeholder="Pl. legyen luxusabb, adj FAQ-t…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"/><button onClick={()=>void refine()} disabled={busy||!instruction.trim()||!site} className="rounded-xl bg-white/10 px-4 disabled:opacity-30"><Wand2 className="h-4 w-4"/></button></div>
              {reply&&<p className="mt-2 text-xs text-emerald-300">{reply}</p>}
            </div>}

            {pendingSite&&<div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
              <div className="text-sm font-semibold">Új eredmény készült</div>
              <p className="mt-1 text-xs leading-5 text-white/45">Az eredmény előnézete ingyenes. Kredit csak elfogadáskor kerül levonásra.</p>
              <div className="mt-3 flex gap-2"><button onClick={acceptGenerated} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-500 px-3 py-2 text-xs font-bold"><Check className="h-3.5 w-3.5"/> Elfogadom</button><button onClick={rejectGenerated} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60"><X className="h-3.5 w-3.5"/></button></div>
            </div>}

            {error&&<div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300">{error}</div>}
          </section>

          <section>
            {(pendingSite||site)?<><div className="mb-2 text-[10px] text-white/35">LIVE PREVIEW · {(pendingSite??site).blocks.length} SZEKCIÓ · {pendingSite?'UNSAVED RESULT':'MENTVE'}</div><SitePreview document={pendingSite??site!}/></>:<div className="grid min-h-[580px] place-items-center rounded-3xl border border-dashed border-white/10"><div className="text-center text-white/35"><Sparkles className="mx-auto h-8 w-8"/><p className="mt-3 text-sm">Az oldal előnézete itt jelenik meg.</p></div></div>}
          </section>
        </div>
      </>}

      {tool==='templates'&&<section>
        <div className="mb-6"><div className="text-xs uppercase tracking-[.2em] text-violet-400">Template Library</div><h2 className="mt-2 text-3xl font-black">138 240 generált sablon</h2><p className="mt-2 text-sm text-white/40">A könyvtár determinisztikus: nincs több gigabájtnyi kép a bundle-ben.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{templates.map((t,i)=><button key={t.id} onClick={()=>{setTool('site');setBrief(`Építs egy ${t.category.toLowerCase()} ${t.type} oldalt ${t.style} stílusban, ${t.effect.toLowerCase()} effektekkel.`)}} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.03] text-left transition hover:-translate-y-0.5 hover:border-violet-400/30"><img src={templateCoverUrl(templateOffset+i)} alt="" className="aspect-[4/3] w-full object-cover"/><div className="p-4"><div className="text-sm font-bold">{t.name}</div><div className="mt-1 text-[11px] text-white/40">{t.category} · {t.style} · {t.fontPair}</div></div></button>)}</div>
        <div className="mt-5 flex justify-center gap-2"><button disabled={templateOffset===0} onClick={()=>setTemplateOffset(Math.max(0,templateOffset-12))} className="rounded-xl border border-white/10 px-4 py-2 text-xs disabled:opacity-30">Előző</button><button onClick={()=>setTemplateOffset(templateOffset+12)} className="rounded-xl border border-white/10 px-4 py-2 text-xs">Következő</button></div>
      </section>}

      {tool!=='site'&&tool!=='templates'&&activeProject&&<CreativeModules tool={tool} project={activeProject} onProject={(p)=>{setActiveProject(p);refreshProjects()}} onCredits={setCreditsState}/>}
      {tool!=='site'&&tool!=='templates'&&!activeProject&&<div className="grid min-h-[70vh] place-items-center rounded-3xl border border-white/10"><p className="text-sm text-white/40">Hozz létre egy projektet.</p></div>}
      </main>
    </div>
  </div>
}
