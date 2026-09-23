import { useMemo, useState } from 'react';
import { Check, Copy, Download, Image as ImageIcon, Loader2, Palette, Play, Sparkles } from 'lucide-react';
import type { StudioProject } from '../lib/project-store';
import { saveProject } from '../lib/project-store';
import { DEFAULT_COSTS, getCredits, spend } from '../lib/credits';
import { generateCreativeImage } from '../lib/creative-api';
import { generateCreativeVideo } from '../lib/creative-video-api';

type Props={tool:string;project:StudioProject|null;onProject:(p:StudioProject)=>void;onCredits:(n:number)=>void};

function svgData(title:string,subtitle:string,accent:string,kind:string){
  const safe=(s:string)=>s.replace(/[<>&"]/g,'');
  const shapes=kind==='social'
    ? '<rect x="42" y="42" width="936" height="936" rx="44" fill="none" stroke="'+accent+'" stroke-width="3" opacity=".55"/><circle cx="820" cy="180" r="130" fill="'+accent+'" opacity=".12"/>'
    : '<path d="M0 760 Q300 560 520 700 T1100 500 V1100 H0Z" fill="'+accent+'" opacity=".14"/><circle cx="780" cy="260" r="190" fill="'+accent+'" opacity=".10"/>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#08090d"/>'+shapes+'<text x="90" y="520" fill="#fff" font-size="72" font-family="Arial" font-weight="700">'+safe(title).slice(0,26)+'</text><text x="90" y="585" fill="'+accent+'" font-size="26" font-family="Arial" letter-spacing="4">'+safe(subtitle).slice(0,42).toUpperCase()+'</text><text x="90" y="930" fill="#fff" opacity=".42" font-size="18" font-family="Arial">DESIGNLY STUDIO</text></svg>');
}

export default function CreativeModules({tool,project,onProject,onCredits}:Props){
 const [prompt,setPrompt]=useState(project?.brief||'');
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState<{url:string;title:string;meta:string}|null>(null);
 const [accepted,setAccepted]=useState(false);
 const [error,setError]=useState('');
 const [brand,setBrand]=useState({name:'',industry:'',tone:'Premium',colors:['#0a0a0d','#c9a45c','#f4eee2']});
 const [social,setSocial]=useState({network:'Instagram',campaign:'',format:'1080 × 1080'});
 const [video,setVideo]=useState({concept:'',duration:'15 mp',scenes:4});

 const config=useMemo(()=>({
   image:{title:'AI Kép Studio',desc:'Generálási briefből projektbe menthető kreatív előnézet.',cost:DEFAULT_COSTS.image},
   brand:{title:'Brand Studio',desc:'Brand kit létrehozása névvel, iparággal, tónussal és palettával.',cost:DEFAULT_COSTS.brand},
   social:{title:'Social Studio',desc:'Kampánykoncepció és publikálásra kész kreatív brief.',cost:DEFAULT_COSTS.social},
   video:{title:'Video Studio',desc:'Storyboard és jelenetstruktúra egy kampányvideóhoz.',cost:DEFAULT_COSTS.video}
 } as Record<string,{title:string;desc:string;cost:number}>)[tool]||null,[tool]);

 if(!config) return null;

 const accept=()=>{
   if(!result||!project)return;
   if(!spend(tool as 'image'|'brand'|'social'|'video')){
     setAccepted(false); return;
   }
   const asset={id:crypto.randomUUID(),kind:tool==='image'||tool==='social'?'image':tool==='video'?'video':'logo',name:result.title,url:result.url,createdAt:Date.now()};
   const p=saveProject({...project,assets:[...project.assets,asset]});
   onProject(p);onCredits(getCredits());setAccepted(true);
 };

 const generate=async()=>{
   if(busy)return;
   setBusy(true);setAccepted(false);setError('');
   try {
   if(tool==='image'){
     const title=prompt.trim()||'Premium Creative';
     const generated=await generateCreativeImage(title,'1:1');
     setResult({url:generated.url,title,meta:'AI kép · 1:1 · Pollinations / Qwen Image'});
   }else if(tool==='social'){
     const title=social.campaign.trim()||prompt.trim()||'Új kampány';
     setResult({url:svgData(title,social.network,'#c9a45c','social'),title,meta:social.format+' · '+social.network});
   }else if(tool==='brand'){
     const title=brand.name.trim()||'Új Brand';
     setResult({url:svgData(title,brand.industry||'Brand Identity',brand.colors[1],'brand'),title,meta:brand.tone+' · '+brand.industry});
   }else{
     const title=video.concept.trim()||prompt.trim()||'Cinematic Campaign';
     const seconds=Number.parseInt(video.duration,10)||10;
     const generated=await generateCreativeVideo(title,Math.min(15,Math.max(5,seconds)),'16:9');
     setResult({url:generated.url,title,meta:'AI videó · '+seconds+' mp · MiniMax H3 Max'});
   }
   } catch (e) {
     setError(e instanceof Error ? e.message : 'A generálás nem sikerült.');
   } finally {
     setBusy(false);
   }
 };

 const inputClass='w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none placeholder:text-white/20';
 return <section className="grid gap-6 xl:grid-cols-[520px_minmax(0,1fr)]">
   <div>
    <div className="rounded-3xl border border-white/10 bg-white/[.035] p-5">
      <div className="flex items-center gap-3"><div className="rounded-xl bg-violet-500/15 p-2 text-violet-300">{tool==='image'?<ImageIcon className="h-5 w-5"/>:tool==='brand'?<Palette className="h-5 w-5"/>:tool==='video'?<Play className="h-5 w-5"/>:<Sparkles className="h-5 w-5"/>}</div><div><h2 className="font-bold">{config.title}</h2><p className="text-xs text-white/40">{config.desc}</p></div></div>
      {tool==='image'&&<div className="mt-5 space-y-3"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={7} placeholder="Pl. sötét prémium autókozmetika reklámkép, króm, kék neon, cinematic…" className={inputClass+' resize-none leading-6'}/></div>}
      {tool==='brand'&&<div className="mt-5 space-y-3"><input value={brand.name} onChange={e=>setBrand({...brand,name:e.target.value})} placeholder="Márkanév" className={inputClass}/><input value={brand.industry} onChange={e=>setBrand({...brand,industry:e.target.value})} placeholder="Iparág" className={inputClass}/><select value={brand.tone} onChange={e=>setBrand({...brand,tone:e.target.value})} className={inputClass}><option>Premium</option><option>Modern</option><option>Minimal</option><option>Luxury</option><option>Tech</option></select><div className="grid grid-cols-3 gap-2">{brand.colors.map((c,i)=><label key={i} className="rounded-xl border border-white/10 p-2 text-[10px] text-white/40"><input type="color" value={c} onChange={e=>{const a=[...brand.colors];a[i]=e.target.value;setBrand({...brand,colors:a})}} className="h-10 w-full bg-transparent"/>{c}</label>)}</div></div>}
      {tool==='social'&&<div className="mt-5 space-y-3"><input value={social.campaign} onChange={e=>setSocial({...social,campaign:e.target.value})} placeholder="Kampány neve / célja" className={inputClass}/><select value={social.network} onChange={e=>setSocial({...social,network:e.target.value})} className={inputClass}><option>Instagram</option><option>Facebook</option><option>LinkedIn</option><option>TikTok</option></select><select value={social.format} onChange={e=>setSocial({...social,format:e.target.value})} className={inputClass}><option>1080 × 1080</option><option>1080 × 1350</option><option>1080 × 1920</option><option>1200 × 628</option></select></div>}
      {tool==='video'&&<div className="mt-5 space-y-3"><textarea value={video.concept} onChange={e=>setVideo({...video,concept:e.target.value})} rows={5} placeholder="Videó koncepció…" className={inputClass+' resize-none'}/><div className="grid grid-cols-2 gap-3"><select value={video.duration} onChange={e=>setVideo({...video,duration:e.target.value})} className={inputClass}><option>5 mp</option><option>10 mp</option><option>15 mp</option></select><select value={video.scenes} onChange={e=>setVideo({...video,scenes:Number(e.target.value)})} className={inputClass}><option value={3}>3 jelenet</option><option value={4}>4 jelenet</option><option value={6}>6 jelenet</option><option value={8}>8 jelenet</option></select></div></div>}
      <button onClick={()=>void generate()} disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-5 py-4 text-sm font-bold disabled:opacity-40">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Sparkles className="h-4 w-4"/>}{busy?'Generálás…':'Előnézet létrehozása'}</button>
      {error&&<p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-200">{error}</p>}<p className="mt-2 text-center text-[10px] text-white/30">Előnézet: 0 kredit · Elfogadás: {config.cost} kredit</p>
    </div>
   </div>
   <div className="rounded-3xl border border-white/10 bg-white/[.025] p-5">
     {result?<div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]"><div><img src={result.url} alt="" className="w-full rounded-2xl border border-white/10 bg-black object-cover"/><div className="mt-3 flex gap-2"><a href={result.url} download={tool==='video'?'designly-video.mp4':'designly-creative.png'} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs"><Download className="h-3.5 w-3.5"/> Export</a><button onClick={()=>navigator.clipboard?.writeText(result.title)} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs"><Copy className="h-3.5 w-3.5"/> Másolás</button></div></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="text-xs text-white/40">Eredmény</div><h3 className="mt-2 font-bold">{result.title}</h3><p className="mt-2 text-xs text-white/40">{result.meta}</p><button onClick={accept} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/90 px-3 py-3 text-xs font-bold"><Check className="h-4 w-4"/> Elfogadás és mentés</button>{accepted&&<p className="mt-3 text-center text-xs text-emerald-300">Mentve a projektbe.</p>}</div></div>:<div className="grid min-h-[560px] place-items-center text-center text-white/30"><Sparkles className="mx-auto h-9 w-9 text-violet-400"/><p className="mt-3 text-sm">A generált eredmény itt jelenik meg.</p><p className="mt-1 text-[11px]">Előnézet után te döntöd el, hogy felhasználod-e.</p></div>}
   </div>
 </section>
}
