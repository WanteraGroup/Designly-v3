import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, BriefcaseBusiness, Brush, CalendarDays, Check, Download, FileText, Image as ImageIcon, Layers3, LayoutDashboard, Megaphone, PenTool, Ruler, Save, Settings2, Sparkles, Target, Wand2, Wrench, X } from 'lucide-react';
import { editCreativeImage, generateCreativeImage } from '../lib/creative-api';

type ToolId = 'brand'|'campaign'|'product'|'ai_edit'|'business_card'|'invitation'|'flyer'|'poster'|'advertisement'|'brochure'|'menu'|'pricelist'|'social'|'banner'|'presentation'|'tattoo'|'planner'|'cnc';
type Tool = { id: ToolId; label: string; desc: string; icon: typeof Sparkles; kind: 'visual'|'system' };
const TOOLS: Tool[] = [
  {id:'ai_edit',label:'AI Image Edit',desc:'Nano Banana 2: képszerkesztés és több referencia összeillesztése.',icon:Wand2,kind:'visual'},
  {id:'brand',label:'Brand Kit',desc:'Színek, tipográfia, hangnem és márkaalap.',icon:BriefcaseBusiness,kind:'system'},
  {id:'campaign',label:'Kampány Stúdió',desc:'Egy briefből több kreatív formátum.',icon:Megaphone,kind:'visual'},
  {id:'product',label:'AI Product Studio',desc:'Termékfotóból prémium reklám- és lifestyle jelenetek.',icon:ImageIcon,kind:'visual'},
  {id:'business_card',label:'Névjegy',desc:'Modern névjegy koncepció.',icon:BadgeCheck,kind:'visual'},
  {id:'invitation',label:'Meghívó',desc:'Esemény- és rendezvénymeghívó.',icon:CalendarDays,kind:'visual'},
  {id:'flyer',label:'Flyer / Szórólap',desc:'Nyomdai és digitális szórólap.',icon:FileText,kind:'visual'},
  {id:'poster',label:'Plakát / Poszter',desc:'Nagyformátumú kreatív.',icon:ImageIcon,kind:'visual'},
  {id:'advertisement',label:'Hirdetés',desc:'Social és display hirdetés.',icon:Target,kind:'visual'},
  {id:'brochure',label:'Brosúra',desc:'Üzleti kiadvány vizuális iránya.',icon:Layers3,kind:'visual'},
  {id:'menu',label:'Étlap',desc:'Éttermi menü vizuális rendszere.',icon:FileText,kind:'visual'},
  {id:'pricelist',label:'Árlista',desc:'Szolgáltatás- és termékárlista.',icon:Settings2,kind:'visual'},
  {id:'social',label:'Social Post',desc:'Social feed kreatív.',icon:Sparkles,kind:'visual'},
  {id:'banner',label:'Banner',desc:'Webes és display banner.',icon:LayoutDashboard,kind:'visual'},
  {id:'presentation',label:'Prezentáció',desc:'Pitch deck / üzleti slide.',icon:Layers3,kind:'visual'},
  {id:'tattoo',label:'Tattoo Minta',desc:'AI tetováláskoncepció.',icon:PenTool,kind:'visual'},
  {id:'planner',label:'Tervező',desc:'Méretezés, elrendezés és látványterv.',icon:Ruler,kind:'system'},
  {id:'cnc',label:'CNC CAM',desc:'Paraméterezett G-kód és export.',icon:Wrench,kind:'system'},
];
const RATIO: Record<string,string> = { business_card:'3:2', invitation:'4:3', flyer:'3:4', poster:'2:3', advertisement:'1:1', brochure:'4:3', menu:'3:4', pricelist:'3:4', social:'1:1', banner:'16:9', presentation:'16:9', tattoo:'1:1' };
type Brand = { name:string; tone:string; colors:string[]; heading:string; body:string };
const DEFAULT_BRAND: Brand = { name:'', tone:'Nordic / Minimal / Luxury', colors:['#C9A45C','#0B0C10','#F3EEE3'], heading:'Marcellus', body:'Inter' };
function download(name:string,data:BlobPart,type:string){const blob=new Blob([data],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
function cncGcode(w:number,h:number,depth:number,feed:number,plunge:number,spindle:number,controller:string){const d=Math.max(.2,Math.abs(depth));const step=Math.max(.2,d/2);const out=['%','( DESIGNLY CNC CAM )','( CONTROLLER: '+controller+' )','G21 G90 G17 G94','G0 Z5','M3 S'+Math.round(spindle)];for(let z=-step;z>=-d-1e-6;z-=step){const zz=Math.max(z,-d).toFixed(3);out.push('(DEPTH '+zz+' MM)','G0 X0 Y0','G1 Z'+zz+' F'+Math.round(plunge),'G1 X'+w.toFixed(3)+' Y0 F'+Math.round(feed),'G1 X'+w.toFixed(3)+' Y'+h.toFixed(3),'G1 X0 Y'+h.toFixed(3),'G1 X0 Y0','G0 Z5');if(z<=-d)break;}out.push('M5','M30','%');return out.join('\n');}
function plannerSvg(w:number,h:number,label:string){const safeW=Math.max(1,w),safeH=Math.max(1,h),W=900,H=600,scale=Math.min(760/safeW,450/safeH),rw=safeW*scale,rh=safeH*scale,x=(W-rw)/2,y=(H-rh)/2;return '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="100%" height="100%" fill="#090a0d"/><rect x="'+x+'" y="'+y+'" width="'+rw+'" height="'+rh+'" fill="#13161c" stroke="#c9a45c" stroke-width="3"/><text x="450" y="45" fill="#c9a45c" font-size="22" text-anchor="middle">DESIGNLY PLANNER</text><text x="450" y="570" fill="#eee8dc" font-size="18" text-anchor="middle">'+safeW+' × '+safeH+' mm · '+label+'</text></svg>';}

export default function CreativeStudio({ initialTool }: { initialTool?: string }) {
 const [tool,setTool]=useState<ToolId>(() => {
  const candidate=initialTool as ToolId;
  return TOOLS.some((item)=>item.id===candidate) ? candidate : 'brand';
 });
 const [brief,setBrief]=useState('');
 const [style,setStyle]=useState('premium');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [image,setImage]=useState<string|null>(null);
 const [logoImage,setLogoImage]=useState<string|null>(null);
 const [campaign,setCampaign]=useState<{label:string;url:string}[]>([]);
 const [editFiles,setEditFiles]=useState<File[]>([]);
 const [editPrompt,setEditPrompt]=useState('');
 const [editResolution,setEditResolution]=useState<'1k'|'2k'|'4k'>('1k');
 const [editAspectRatio,setEditAspectRatio]=useState('1:1');
 const [editImage,setEditImage]=useState<string|null>(null);
 const [editHistory,setEditHistory]=useState<string[]>([]);
 const [editCompare,setEditCompare]=useState(50);
 const [productFile,setProductFile]=useState<File|null>(null);
 const [productPrompt,setProductPrompt]=useState('Hozd létre a termék prémium lifestyle reklámfotóját természetes fényekkel, realisztikus anyagokkal és finom árnyékokkal. A termék formáját, logóját és arányait tartsd változatlanul.');
 const [productResult,setProductResult]=useState<string|null>(null);
 const [brand,setBrand]=useState<Brand>(DEFAULT_BRAND);
 const [brandSaved,setBrandSaved]=useState(false);
 const [cnc,setCnc]=useState({w:80,h:50,depth:4,feed:700,plunge:250,spindle:12000,controller:'GRBL'});
 const [planner,setPlanner]=useState({w:200,h:100,label:'Alaprajz / gyártási terv'});
 const current=useMemo(()=>TOOLS.find(t=>t.id===tool)!,[tool]);
 const select=(id:ToolId)=>{setTool(id);setImage(null);setLogoImage(null);setCampaign([]);setEditImage(null);setEditHistory([]);setProductResult(null);setError('');};
 useEffect(()=>()=>{editFiles.forEach((file)=>{ /* object URLs are created only for previews below */ void file; });},[editFiles]);
 const loadBrand=()=>{
  try{
    const v=localStorage.getItem('designly_brand_kit_v5');
    if(!v)return;
    const raw=JSON.parse(v) as Partial<Brand>;
    const colors=Array.isArray(raw.colors)
      ? raw.colors.filter((value): value is string => typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value)).slice(0,6)
      : [];
    setBrand({
      ...DEFAULT_BRAND,
      name:typeof raw.name==='string'?raw.name.slice(0,160):DEFAULT_BRAND.name,
      tone:typeof raw.tone==='string'?raw.tone.slice(0,240):DEFAULT_BRAND.tone,
      heading:typeof raw.heading==='string'?raw.heading.slice(0,80):DEFAULT_BRAND.heading,
      body:typeof raw.body==='string'?raw.body.slice(0,80):DEFAULT_BRAND.body,
      colors:colors.length?colors:DEFAULT_BRAND.colors,
    });
  }catch{setError('A mentett Brand Kit nem olvasható.');}
 };
 const saveBrand=()=>{try{localStorage.setItem('designly_brand_kit_v5',JSON.stringify({...brand,savedAt:new Date().toISOString()}));setBrandSaved(true);}catch{setError('A Brand Kit mentése sikertelen. Ellenőrizd a böngésző tárhelyét.');}};
 async function generateLogo(){
  if(!brand.name.trim()||busy)return;
  setBusy(true);setError('');setLogoImage(null);
  try{
    const prompt='Professional brand logo concept for '+brand.name+'. Tone: '+brand.tone+'. Typography direction: '+brand.heading+'. Colors: '+brand.colors.join(', ')+'. Create a clean distinctive logo mark and wordmark on a dark neutral presentation board. No mockup-only result.';
    const result=await generateCreativeImage(prompt,'1:1');
    setLogoImage(result.url);
  }catch(e){setError(e instanceof Error?e.message:'A logó generálása sikertelen.');}
  finally{setBusy(false);}
 }
 async function generateVisual(){if(!brief.trim()||busy)return;setBusy(true);setError('');setImage(null);try{const prompt='Professional '+current.label+' design. Brief: '+brief+'. Style: '+style+'. Brand: '+(brand.name||'DESIGNLY')+'. Colors: '+brand.colors.join(', ')+'. Premium polished graphic composition.';const result=await generateCreativeImage(prompt,RATIO[tool]||'1:1');setImage(result.url);}catch(e){setError(e instanceof Error?e.message:'A generálás sikertelen.');}finally{setBusy(false);}}
 async function runImageEdit(){
  if(!editFiles.length||!editPrompt.trim()||busy)return;
  setBusy(true);setError('');setEditImage(null);
  try{
    const result=await editCreativeImage({files:editFiles,prompt:editPrompt,aspectRatio:editAspectRatio,resolution:editResolution});
    setEditImage(result.url);
    setEditHistory((prev)=>[result.url,...prev.filter((url)=>url!==result.url)].slice(0,8));
  }catch(e){setError(e instanceof Error?e.message:'Az AI Edit sikertelen.');}
  finally{setBusy(false);}
 }
 async function generateProduct(){
  if(!productFile||!productPrompt.trim()||busy)return;
  setBusy(true);setError('');setProductResult(null);
  try{
    const result=await editCreativeImage({files:[productFile],prompt:productPrompt.trim(),aspectRatio:editAspectRatio,resolution:editResolution});
    setProductResult(result.url);
  }catch(e){setError(e instanceof Error?e.message:'A Product Studio generálása sikertelen.');}
  finally{setBusy(false);}
 }
 async function generateCampaign(){if(!brief.trim()||busy)return;setBusy(true);setError('');setCampaign([]);const formats=['poster','flyer','social','advertisement'];const out:{label:string;url:string}[]=[];try{for(const fmt of formats){const label=TOOLS.find(t=>t.id===fmt)?.label||fmt;const result=await generateCreativeImage('Campaign creative for '+brief+'. Format: '+label+'. Style: '+style+'. Brand: '+(brand.name||'DESIGNLY')+'. Colors: '+brand.colors.join(', ')+'. Keep the same identity and preserve the requested format composition.',RATIO[fmt]||'1:1');out.push({label,url:result.url});setCampaign([...out]);}}catch(e){setError(e instanceof Error?e.message:'A kampány generálása sikertelen.');}finally{setBusy(false);}}
 const gcode=cncGcode(cnc.w,cnc.h,cnc.depth,cnc.feed,cnc.plunge,cnc.spindle,cnc.controller);
 const psvg=plannerSvg(planner.w,planner.h,planner.label);
 return (
  <div className='mt-8 rounded-3xl border border-line bg-panel/70 p-5 shadow-2xl backdrop-blur-xl'>
   <div className='grid gap-5 lg:grid-cols-[260px_1fr]'>
    <aside className='rounded-2xl border border-line bg-canvas/70 p-3'>
     <div className='mb-3 px-2 text-[10px] uppercase tracking-[.22em] text-accent'>DESIGNLY EXTRA STUDIO</div>
     <div className='space-y-1'>
      {TOOLS.map(({id,label,icon:Icon,kind})=>(<button key={id} type='button' onClick={()=>select(id)} className={'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs transition '+(tool===id?'border-accent/60 bg-accent/10 text-accent':'border-transparent text-ink-300 hover:border-line hover:text-ink-100')}><Icon className='h-4 w-4'/><span className='flex-1'>{label}</span><span className={'text-[9px] '+(kind==='system'?'text-cyan-300':'text-emerald-400')}>{kind==='system'?'CORE':'AI'}</span></button>))}
     </div>
    </aside>
    <main>
     <div className='mb-5 flex flex-wrap items-start justify-between gap-4'><div><div className='text-[10px] uppercase tracking-[.2em] text-accent'>ACTIVE TOOL</div><h2 className='mt-1 font-display text-2xl text-ink-100'>{current.label}</h2><p className='mt-1 text-sm text-ink-400'>{current.desc}</p></div><span className='rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] text-emerald-300'>AKTÍV</span></div>
     {tool==='brand' && <section className='space-y-4'><div className='grid gap-4 md:grid-cols-2'><input className='vp-input' value={brand.name} onChange={e=>setBrand({...brand,name:e.target.value})} placeholder='Márkanév'/><input className='vp-input' value={brand.tone} onChange={e=>setBrand({...brand,tone:e.target.value})} placeholder='Hangnem / stílus'/><input className='vp-input' value={brand.heading} onChange={e=>setBrand({...brand,heading:e.target.value})} placeholder='Címbetű'/><input className='vp-input' value={brand.body} onChange={e=>setBrand({...brand,body:e.target.value})} placeholder='Törzsszöveg betű'/></div><div className='flex flex-wrap gap-2'>{brand.colors.map((c,i)=><input key={i} type='color' value={c} onChange={e=>{const colors=[...brand.colors];colors[i]=e.target.value;setBrand({...brand,colors});}} className='h-11 w-14 rounded-lg border border-line bg-panel'/>)}</div><div className='grid gap-3 md:grid-cols-4'>{brand.colors.map((c,i)=><div key={i} className='h-20 rounded-xl border border-line' style={{background:c}} title={'Szín '+(i+1)+' '+c}/>)}</div><div className='flex flex-wrap items-center gap-3'><button type='button' onClick={generateLogo} disabled={busy||!brand.name.trim()} className='vp-btn'><Sparkles className='h-4 w-4'/>Logó koncepció</button><button type='button' onClick={saveBrand} className='vp-btn'><Save className='h-4 w-4'/>Brand Kit mentése</button><button type='button' onClick={loadBrand} className='vp-btn-ghost'><Wand2 className='h-4 w-4'/>Mentett betöltése</button>{brandSaved&&<span className='text-xs text-emerald-300'><Check className='inline h-4 w-4'/> Elmentve</span>}</div>{logoImage&&<div className='overflow-hidden rounded-2xl border border-accent/20 bg-black'><img src={logoImage} alt='Logó koncepció' draggable={false} className='max-h-[420px] w-full object-contain'/><div className='flex justify-end p-3'><a href={logoImage} target='_blank' rel='noreferrer' className='vp-btn-ghost'><Download className='h-4 w-4'/>Logó megnyitása / mentése</a></div></div>}</section>}
     {tool==='cnc' && <section className='space-y-4'><div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>{(['w','h','depth','feed','plunge','spindle'] as const).map(k=><label key={k} className='text-xs text-ink-400'>{k}<input type='number' min='0.1' value={cnc[k]} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n))setCnc({...cnc,[k]:Math.max(0.1,n)});}} className='vp-input mt-1'/></label>)}<label className='text-xs text-ink-400'>Vezérlő<select value={cnc.controller} onChange={e=>setCnc({...cnc,controller:e.target.value})} className='vp-input mt-1'>{['GRBL','LinuxCNC','Mach3','Fanuc','Haas','Siemens'].map(v=><option key={v}>{v}</option>)}</select></label></div><pre className='max-h-80 overflow-auto rounded-2xl border border-line bg-black p-4 text-[11px] leading-5 text-ink-200'>{gcode}</pre><button type='button' onClick={()=>download('designly-cnc.nc',gcode,'text/plain;charset=utf-8')} className='vp-btn'><Download className='h-4 w-4'/>G-kód export</button></section>}
     {tool==='planner' && <section className='space-y-4'><div className='grid gap-3 md:grid-cols-3'><input type='number' min='1' className='vp-input' value={planner.w} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n))setPlanner({...planner,w:Math.max(1,n)});}}/><input type='number' min='1' className='vp-input' value={planner.h} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n))setPlanner({...planner,h:Math.max(1,n)});}}/><input className='vp-input' value={planner.label} onChange={e=>setPlanner({...planner,label:e.target.value})}/></div><img src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(psvg)} alt='Planner előnézet' className='w-full rounded-2xl border border-line'/><button type='button' onClick={()=>download('designly-planner.svg',psvg,'image/svg+xml;charset=utf-8')} className='vp-btn'><Download className='h-4 w-4'/>SVG export</button></section>}
     {tool==='product' && <section className='space-y-4'>
      <div className='rounded-2xl border border-accent/20 bg-accent/5 p-4 text-sm text-ink-300'><div className='font-semibold text-ink-100'>AI Product Studio</div><p className='mt-1'>Tölts fel egy termékfotót, válassz jelenetet, majd készíts reklám- vagy webshop-kompatibilis képet. A meglévő AI Edit motor használja a referenciát.</p></div>
      <div className='grid gap-4 md:grid-cols-2'>
       <div className='rounded-2xl border border-line bg-canvas/50 p-4'>
        <div className='mb-2 text-xs font-semibold text-ink-200'>1. Termékfotó</div>
        <input type='file' accept='image/png,image/jpeg,image/webp' className='vp-input' onChange={e=>{setProductFile(e.target.files?.[0]||null);setProductResult(null);setError('');}}/>
        {productFile&&<img src={URL.createObjectURL(productFile)} alt='Termék referencia' className='mt-3 max-h-80 w-full rounded-xl object-contain'/>}
       </div>
       <div className='rounded-2xl border border-line bg-canvas/50 p-4'>
        <div className='mb-2 text-xs font-semibold text-ink-200'>2. Jelenet / irány</div>
        <textarea rows={7} className='vp-input' value={productPrompt} onChange={e=>setProductPrompt(e.target.value)}/>
        <div className='mt-3 flex flex-wrap gap-2'>{['Luxus stúdiófotó fekete háttérrel','Minimal fehér webshop háttér','Modern lifestyle jelenet','Prémium social reklámkép','Sötét cinematic termékfotó'].map(p=><button key={p} type='button' onClick={()=>setProductPrompt(p+'. A termék formáját, logóját és arányait tartsd változatlanul.')} className='rounded-full border border-line px-3 py-1.5 text-[10px] text-ink-300 hover:border-accent/50 hover:text-accent'>{p}</button>)}</div>
       </div>
      </div>
      <div className='grid gap-3 sm:grid-cols-3'>
       <label className='text-xs text-ink-400'>Felbontás<select className='vp-input mt-1' value={editResolution} onChange={e=>setEditResolution(e.target.value as '1k'|'2k'|'4k')}><option value='1k'>1K · 10 kredit</option><option value='2k'>2K · 15 kredit</option><option value='4k'>4K · 20 kredit</option></select></label>
       <label className='text-xs text-ink-400'>Képarány<select className='vp-input mt-1' value={editAspectRatio} onChange={e=>setEditAspectRatio(e.target.value)}>{['1:1','16:9','9:16','3:2','4:5','4:3','3:4','2:3'].map(v=><option key={v}>{v}</option>)}</select></label>
       <div className='flex items-end'><button type='button' disabled={busy||!productFile||!productPrompt.trim()} onClick={generateProduct} className='vp-btn w-full'><Sparkles className='h-4 w-4'/>{busy?'Termékkép készül…':'Termékjelenet generálása'}</button></div>
      </div>
      {productResult&&<div className='overflow-hidden rounded-2xl border border-accent/20 bg-black'><img src={productResult} alt='AI Product Studio eredmény' className='max-h-[720px] w-full object-contain'/><div className='flex justify-end p-3'><a href={productResult} target='_blank' rel='noreferrer' className='vp-btn-ghost'><Download className='h-4 w-4'/>Eredmény megnyitása</a></div></div>}
     </section>}
     {tool==='ai_edit' && <section className='space-y-4'>
      <div className='rounded-2xl border border-accent/20 bg-accent/5 p-4 text-sm text-ink-300'>
       <div className='font-semibold text-ink-100'>AI Image Editor 2.0</div>
       <p className='mt-1'>Nano Banana 2 Edit · 1–14 referencia-kép · 1K / 2K / 4K. A rendszer az eredeti témát megőrzi, és a promptban megadott változtatást célozza.</p>
      </div>
      <div className='grid gap-3 md:grid-cols-2'>
       <div className='rounded-2xl border border-line bg-canvas/50 p-4'>
        <div className='mb-2 text-xs font-semibold text-ink-200'>1. Referenciák</div>
        <input type='file' accept='image/png,image/jpeg,image/webp' multiple className='vp-input' onChange={e=>{const files=Array.from(e.target.files||[]).slice(0,14);setEditFiles(files);setEditImage(null);setEditHistory([]);setError('');}}/>
        {editFiles.length>0&&<div className='mt-3 grid grid-cols-3 gap-2'>{editFiles.map((file,i)=><figure key={file.name+i} className='overflow-hidden rounded-lg border border-line bg-black'><img src={URL.createObjectURL(file)} alt={file.name} className='aspect-square w-full object-cover'/><figcaption className='truncate p-1.5 text-[9px] text-ink-500'>{i+1}. {file.name}</figcaption></figure>)}</div>}
       </div>
       <div className='rounded-2xl border border-line bg-canvas/50 p-4'>
        <div className='mb-2 text-xs font-semibold text-ink-200'>2. Mit változtassak?</div>
        <textarea rows={5} className='vp-input' value={editPrompt} onChange={e=>setEditPrompt(e.target.value)} placeholder='Pl. Cseréld le a hátteret sötét prémium stúdióra. A terméket, logót, feliratot és arányokat tartsd változatlanul.'/>
        <div className='mt-3 flex flex-wrap gap-2'>{[
          'Háttér csere prémium stúdióra',
          'Termék környezetének cseréje',
          'Fények és árnyékok javítása',
          'Tisztítsd meg a hátteret',
          'Cseréld a színeket, mást ne módosíts',
          'Készíts reklámfotó jellegű változatot',
        ].map(p=><button key={p} type='button' onClick={()=>setEditPrompt(p)} className='rounded-full border border-line px-3 py-1.5 text-[10px] text-ink-300 hover:border-accent/50 hover:text-accent'>{p}</button>)}</div>
       </div>
      </div>
      <div className='grid gap-3 sm:grid-cols-3'>
       <label className='text-xs text-ink-400'>Felbontás<select className='vp-input mt-1' value={editResolution} onChange={e=>setEditResolution(e.target.value as '1k'|'2k'|'4k')}><option value='1k'>1K · 10 kredit</option><option value='2k'>2K · 15 kredit</option><option value='4k'>4K · 20 kredit</option></select></label>
       <label className='text-xs text-ink-400'>Képarány<select className='vp-input mt-1' value={editAspectRatio} onChange={e=>setEditAspectRatio(e.target.value)}>{['1:1','16:9','9:16','3:2','4:5','4:3','3:4','2:3'].map(v=><option key={v}>{v}</option>)}</select></label>
       <div className='flex items-end'><button type='button' disabled={busy||!editFiles.length||!editPrompt.trim()} onClick={runImageEdit} className='vp-btn w-full'><Wand2 className='h-4 w-4'/>{busy?'AI Edit készül…':'AI Edit futtatása'}</button></div>
      </div>
      {editImage&&editFiles[0]&&<div className='rounded-2xl border border-line bg-black p-3'>
       <div className='mb-2 flex items-center justify-between text-xs text-ink-400'><span>ELŐTTE / UTÁNA</span><span>{editCompare}%</span></div>
       <div className='relative overflow-hidden rounded-xl'>
        <img src={URL.createObjectURL(editFiles[0])} alt='Eredeti referencia' className='block max-h-[720px] w-full object-contain'/>
        <div className='absolute inset-y-0 left-0 overflow-hidden' style={{width:editCompare+'%'}}><img src={editImage} alt='Szerkesztett eredmény' className='block h-full w-[100vw] max-w-none object-contain object-left'/></div>
       </div>
       <input aria-label='Előtte utána összehasonlítás' type='range' min='0' max='100' value={editCompare} onChange={e=>setEditCompare(Number(e.target.value))} className='mt-3 w-full'/>
       <div className='mt-3 flex flex-wrap justify-end gap-2'><a href={editImage} target='_blank' rel='noreferrer' className='vp-btn-ghost'><Download className='h-4 w-4'/>Eredmény megnyitása</a></div>
      </div>}
      {editHistory.length>0&&<div className='rounded-2xl border border-line bg-canvas/50 p-4'><div className='mb-3 text-xs font-semibold text-ink-200'>VERZIÓK · {editHistory.length}</div><div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>{editHistory.map((url,i)=><button key={url} type='button' onClick={()=>setEditImage(url)} className={'overflow-hidden rounded-xl border bg-black '+(url===editImage?'border-accent/70':'border-line')}><img src={url} alt={'AI Edit '+(i+1)} className='aspect-square w-full object-cover'/><span className='block p-2 text-left text-[10px] text-ink-400'>V{i+1}</span></button>)}</div></div>}
     </section>
     {tool==='campaign' && <section className='space-y-4'><textarea rows={4} className='vp-input' value={brief} onChange={e=>setBrief(e.target.value)} placeholder='Pl. KÉK MAJOM őszi kampány: autókozmetika akció'/><button type='button' disabled={busy||!brief.trim()} onClick={generateCampaign} className='vp-btn'><Megaphone className='h-4 w-4'/>{busy?'Kampány készül…':'Teljes kampány generálása'}</button>{campaign.length>0&&<div className='grid gap-4 sm:grid-cols-2'>{campaign.map(x=><figure key={x.label} className='overflow-hidden rounded-2xl border border-line bg-panel'><img src={x.url} alt={x.label} draggable={false} className='h-auto w-full object-cover'/><figcaption className='flex items-center justify-between gap-3 p-3 text-xs text-ink-200'><span>{x.label}</span><a href={x.url} target='_blank' rel='noreferrer' className='text-accent'>Megnyitás</a></figcaption></figure>)}</div>}</section>}
     {!['brand','cnc','planner','campaign'].includes(tool) && <section className='space-y-4'><textarea rows={4} className='vp-input' value={brief} onChange={e=>setBrief(e.target.value)} placeholder={'Mit szeretnél készíteni? Példa: '+current.label+' egy prémium fekete-arany márkának.'}/><div className='flex flex-wrap gap-2'>{['premium','luxury','minimal','modern','cinematic','corporate','bold'].map(v=><button key={v} type='button' onClick={()=>setStyle(v)} className={'rounded-full border px-3 py-1 text-xs '+(style===v?'border-accent/70 bg-accent/15 text-accent':'border-line text-ink-300')}>{v}</button>)}</div><div className='flex flex-wrap gap-2'><button type='button' disabled={busy||!brief.trim()} onClick={generateVisual} className='vp-btn'>{busy?<Sparkles className='h-4 w-4 animate-pulse'/>:<Brush className='h-4 w-4'/>}{busy?'Generálás…':'AI kreatív készítése'}</button><button type='button' onClick={loadBrand} className='vp-btn-ghost'><Wand2 className='h-4 w-4'/>Brand betöltése</button></div>{image&&<div className='overflow-hidden rounded-2xl border border-accent/20 bg-black'><img src={image} alt={current.label} draggable={false} className='max-h-[620px] w-full object-contain'/><div className='flex justify-end p-3'><a href={image} target='_blank' rel='noreferrer' className='vp-btn-ghost'><Download className='h-4 w-4'/>Kép megnyitása / mentése</a></div></div>}</section>}
     {error&&<div className='mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'><X className='h-4 w-4'/>{error}</div>}
     </main>
   </div>
  </div>
 );
}