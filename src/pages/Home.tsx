import { useEffect, useRef, useState } from 'react';
import { Download, Image, Layers3, Loader2, Sparkles, Wand2, Globe2, Palette, Video, LayoutTemplate } from 'lucide-react';
import { buildSite, refineSite, type SiteDocument } from '../lib/api';
import { downloadSiteHtml } from '../lib/export-html';
import { DESIGN_STYLES, LANGUAGES } from '../lib/constants';
import SitePreview from '../components/SitePreview';

const tools = [
  ['site','Weboldal',Globe2,'AI weboldalépítő'],['image','Kép',Image,'Képgenerátor'],
  ['brand','Arculat',Palette,'Brand studio'],['social','Social',Layers3,'Kreatív kampányok'],
  ['video','Videó',Video,'Storyboard / video'],['templates','Sablonok',LayoutTemplate,'Layout könyvtár'],
] as const;

export default function Home(){
  const [tool,setTool]=useState('site'),[brief,setBrief]=useState(''),[language,setLanguage]=useState('hu');
  const [style,setStyle]=useState<string|null>(null),[site,setSite]=useState<SiteDocument|null>(null);
  const [busy,setBusy]=useState(false),[instruction,setInstruction]=useState(''),[error,setError]=useState(''),[reply,setReply]=useState('');
  const ref=useRef<HTMLInputElement>(null);
  const generate=async()=>{if(!brief.trim()||busy||tool!=='site')return;setBusy(true);setError('');try{setSite(await buildSite(style?brief+' — stílus: '+style:brief,language))}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}};
  const refine=async()=>{if(!site||!instruction.trim()||busy)return;setBusy(true);try{const r=await refineSite(site,instruction,language);setSite(r.site);setReply(r.reply);setInstruction('')}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}};
  useEffect(()=>{if(site)ref.current?.focus()},[site]);
  return <div className="min-h-screen bg-[#07080c] text-white">
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07080c]/90 px-5 py-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between"><b className="tracking-[.28em]">DESIGNLY <span className="text-violet-400">STUDIO</span></b>
      <select value={language} onChange={e=>setLanguage(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">{LANGUAGES.map(l=><option className="bg-slate-900" key={l.code} value={l.code}>{l.flag} {l.code.toUpperCase()}</option>)}</select></div>
    </header>
    <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[220px_1fr]">
      <aside className="border-r border-white/10 p-4"><p className="px-3 pb-3 text-[10px] uppercase tracking-[.25em] text-white/35">Creative OS</p>
        {tools.map(([id,label,Icon,desc])=><button key={id} onClick={()=>setTool(id)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${tool===id?'bg-violet-500/15 text-violet-300':'text-white/60 hover:bg-white/5 hover:text-white'}`}><Icon className="h-4 w-4"/><span><b className="block text-sm">{label}</b><small className="text-[10px] opacity-50">{desc}</small></span></button>)}
        <div className="mt-7 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-[11px] leading-5 text-white/45"><b className="text-white/80">Veyra AI</b><br/>Egy projektben kezeli a weboldalt, képeket, arculatot, social és videó munkákat.</div>
      </aside>
      <main className="min-w-0 p-5 md:p-8">
      {tool==='site'?<><div className="mb-7"><div className="flex items-center gap-2 text-xs uppercase tracking-[.2em] text-violet-400"><Sparkles className="h-4 w-4"/> AI Website Builder</div><h1 className="mt-3 text-4xl font-black md:text-6xl">Mondd el. <span className="text-white/30">Mi felépítjük.</span></h1><p className="mt-4 max-w-2xl text-sm leading-6 text-white/45">Brief → struktúra → design → élő előnézet → természetes nyelvű szerkesztés → HTML export.</p></div>
        <div className="grid gap-6 xl:grid-cols-[520px_minmax(0,1fr)]">
          <section><div className="rounded-3xl border border-white/10 bg-white/[.035] p-5">
            <textarea value={brief} onChange={e=>setBrief(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))void generate()}} rows={7} placeholder="Pl. Építs egy prémium, sötét étterem weboldalt foglalással, étlappal és galériával…" className="w-full resize-none bg-transparent text-lg leading-8 outline-none placeholder:text-white/20"/>
            <div className="mt-4 flex flex-wrap gap-2">{DESIGN_STYLES.slice(0,12).map(s=><button key={s} onClick={()=>setStyle(style===s?null:s)} className={`rounded-full border px-3 py-1 text-[11px] ${style===s?'border-violet-400/60 bg-violet-500/15 text-violet-300':'border-white/10 text-white/45'}`}>{s}</button>)}</div>
            <button disabled={busy||!brief.trim()} onClick={()=>void generate()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-5 py-4 text-sm font-bold disabled:opacity-40">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Sparkles className="h-4 w-4"/>}{busy?'Építés…':'Weboldal létrehozása'}</button>
          </div>
          {site&&<div className="mt-4 rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="mb-2 flex justify-between text-xs"><span>AI Editor</span><button onClick={()=>downloadSiteHtml(site,brief)}><Download className="h-4 w-4"/></button></div><div className="flex gap-2"><input ref={ref} value={instruction} onChange={e=>setInstruction(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void refine()}} placeholder="Pl. legyen luxusabb, adj FAQ-t…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"/><button onClick={()=>void refine()} disabled={busy||!instruction.trim()} className="rounded-xl bg-white/10 px-4 disabled:opacity-30"><Wand2 className="h-4 w-4"/></button></div>{reply&&<p className="mt-2 text-xs text-emerald-300">{reply}</p>}</div>}
          {error&&<div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300">{error}</div>}</section>
          <section>{site?<><div className="mb-2 text-[10px] text-white/35">LIVE PREVIEW · {site.blocks.length} SZEKCIÓ</div><SitePreview document={site}/></>:<div className="grid min-h-[580px] place-items-center rounded-3xl border border-dashed border-white/10"><div className="text-center text-white/35"><Sparkles className="mx-auto h-8 w-8"/><p className="mt-3 text-sm">Az oldal előnézete itt jelenik meg.</p></div></div>}</section>
        </div></>:<div className="grid min-h-[70vh] place-items-center rounded-3xl border border-white/10 bg-white/[.025]"><div className="text-center"><Sparkles className="mx-auto h-9 w-9 text-violet-400"/><h2 className="mt-4 text-2xl font-bold">{tools.find(x=>x[0]===tool)?.[1]} Studio</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/45">A modul bekerült az új Creative OS munkaterületbe. A következő körben a saját generáló adapterét és a közös projekt/kredit réteget kötjük rá.</p></div></div>}
      </main>
    </div>
  </div>
}