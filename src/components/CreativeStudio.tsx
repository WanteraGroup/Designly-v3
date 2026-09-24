import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, BriefcaseBusiness, Brush, CalendarDays, Check, Download, FileText, Image as ImageIcon, Layers3, LayoutDashboard, Megaphone, PenTool, Ruler, Save, Settings2, Sparkles, Target, Wand2, Wrench, X } from 'lucide-react';
import { editCreativeImage, generateCreativeImage } from '../lib/creative-api';
import EngineeringPlanner from './EngineeringPlanner';
import CncPromptStudio from './CncPromptStudio';
import TattooStudio from './TattooStudio';

type ToolId = 'brand'|'campaign'|'product'|'ai_edit'|'business_card'|'invitation'|'flyer'|'poster'|'advertisement'|'brochure'|'menu'|'pricelist'|'social'|'banner'|'presentation'|'tattoo'|'planner'|'cnc';
/**
 * Egy eszkoz.
 *
 * A `label` szandekosan NEM forditott: a promptba kerul, es a modell egy stabil,
 * angol eszkoznevet ertelmez jol. A `desc` a lathato kartyaszoveg.
 */
type Tool = { id: ToolId; label: string; desc: { hu: string; en: string }; icon: typeof Sparkles; kind: 'visual'|'system' };
const TOOLS: Tool[] = [
  {id:'ai_edit',label:'AI Image Edit',desc:{hu:'Nano Banana 2: képszerkesztés és több referencia összeillesztése.',en:'Nano Banana 2: image editing and combining several references.'},icon:Wand2,kind:'visual'},
  {id:'brand',label:'Brand Kit',desc:{hu:'Színek, tipográfia, hangnem és márkaalap.',en:'Colours, typography, tone of voice and brand foundation.'},icon:BriefcaseBusiness,kind:'system'},
  {id:'campaign',label:'Kampány Stúdió',desc:{hu:'Egy briefből több kreatív formátum.',en:'Several creative formats from one brief.'},icon:Megaphone,kind:'visual'},
  {id:'product',label:'AI Product Studio',desc:{hu:'Termékfotóból prémium reklám- és lifestyle jelenetek.',en:'Premium ad and lifestyle scenes from a product photo.'},icon:ImageIcon,kind:'visual'},
  {id:'business_card',label:'Névjegy',desc:{hu:'Modern névjegy koncepció.',en:'Modern business card concept.'},icon:BadgeCheck,kind:'visual'},
  {id:'invitation',label:'Meghívó',desc:{hu:'Esemény- és rendezvénymeghívó.',en:'Event and party invitation.'},icon:CalendarDays,kind:'visual'},
  {id:'flyer',label:'Flyer / Szórólap',desc:{hu:'Nyomdai és digitális szórólap.',en:'Print and digital flyer.'},icon:FileText,kind:'visual'},
  {id:'poster',label:'Plakát / Poszter',desc:{hu:'Nagyformátumú kreatív.',en:'Large-format creative.'},icon:ImageIcon,kind:'visual'},
  {id:'advertisement',label:'Hirdetés',desc:{hu:'Social és display hirdetés.',en:'Social and display advertisement.'},icon:Target,kind:'visual'},
  {id:'brochure',label:'Brosúra',desc:{hu:'Üzleti kiadvány vizuális iránya.',en:'Visual direction for a business brochure.'},icon:Layers3,kind:'visual'},
  {id:'menu',label:'Étlap',desc:{hu:'Éttermi menü vizuális rendszere.',en:'Visual system for a restaurant menu.'},icon:FileText,kind:'visual'},
  {id:'pricelist',label:'Árlista',desc:{hu:'Szolgáltatás- és termékárlista.',en:'Service and product price list.'},icon:Settings2,kind:'visual'},
  {id:'social',label:'Social Post',desc:{hu:'Social feed kreatív.',en:'Social feed creative.'},icon:Sparkles,kind:'visual'},
  {id:'banner',label:'Banner',desc:{hu:'Webes és display banner.',en:'Web and display banner.'},icon:LayoutDashboard,kind:'visual'},
  {id:'presentation',label:'Prezentáció',desc:{hu:'Pitch deck / üzleti slide.',en:'Pitch deck / business slides.'},icon:Layers3,kind:'visual'},
  {id:'tattoo',label:'Tattoo Minta',desc:{hu:'AI tetováláskoncepció.',en:'AI tattoo concept.'},icon:PenTool,kind:'visual'},
  {id:'planner',label:'Tervező',desc:{hu:'Méretezés, elrendezés és látványterv.',en:'Sizing, layout and visual plan.'},icon:Ruler,kind:'system'},
  {id:'cnc',label:'CNC CAM',desc:{hu:'Paraméterezett G-kód és export.',en:'Parameterised G-code and export.'},icon:Wrench,kind:'system'},
];
const RATIO: Record<string,string> = { business_card:'3:2', invitation:'4:3', flyer:'3:4', poster:'2:3', advertisement:'1:1', brochure:'4:3', menu:'3:4', pricelist:'3:4', social:'1:1', banner:'16:9', presentation:'16:9', tattoo:'1:1' };

/*
 * Azok az eszkozok, amiknek SAJAT blokkja van a renderben. A generalikus
 * "brief -> AI kreativ" blokk ezeket KIZARJA, kulonben a sajat blokk es a
 * generalikus blokk is lefut ugyanarra az eszkozre.
 *
 * Ez volt a hiba: az `ai_edit` es a `product` nem szerepelt a kizarasban, ezert
 * a felhasznalo a sajat panel MELLETT egy masodik, ertelmetlen blokkot is
 * latott — a generalikus blokk ugyanis a `current.label`-t hasznalta promptkent,
 * ami edit eseten ertelmezhetetlen.
 */
const TOOLS_WITH_OWN_BLOCK: ToolId[] = ['brand','cnc','planner','campaign','product','ai_edit','tattoo'];
type Brand = { name:string; tone:string; colors:string[]; heading:string; body:string };
const DEFAULT_BRAND: Brand = { name:'', tone:'Nordic / Minimal / Luxury', colors:['#C9A45C','#0B0C10','#F3EEE3'], heading:'Marcellus', body:'Inter' };

const TEXT: Record<string,{hu:string;en:string}> = {
  testBanner:{hu:'TESZT MÓD AKTÍV',en:'TEST MODE ACTIVE'},
  testBannerBody:{hu:'A kreditlevonás ideiglenesen ki van kapcsolva, így a DESIGNLY funkciói szabadon tesztelhetők.',en:'Credit deduction is temporarily disabled, so the DESIGNLY features can be tested freely.'},
  active:{hu:'AKTÍV',en:'ACTIVE'},
  brandName:{hu:'Márkanév',en:'Brand name'},
  brandTone:{hu:'Hangnem / stílus',en:'Tone / style'},
  brandHeading:{hu:'Címbetű',en:'Heading font'},
  brandBody:{hu:'Törzsszöveg betű',en:'Body font'},
  logoConcept:{hu:'Logó koncepció',en:'Logo concept'},
  brandSave:{hu:'Brand Kit mentése',en:'Save Brand Kit'},
  brandLoad:{hu:'Mentett betöltése',en:'Load saved'},
  saved:{hu:'Elmentve',en:'Saved'},
  openLogo:{hu:'Logó megnyitása / mentése',en:'Open / save logo'},
  productLead:{hu:'Tölts fel egy termékfotót, válassz jelenetet, majd készíts reklám- vagy webshop-kompatibilis képet. A meglévő AI Edit motor használja a referenciát.',en:'Upload a product photo, choose a scene, then create an ad- or webshop-ready image. The existing AI Edit engine uses the reference.'},
  stepProduct:{hu:'1. Termékfotó',en:'1. Product photo'},
  productRef:{hu:'Termék referencia',en:'Product reference'},
  stepScene:{hu:'2. Jelenet / irány',en:'2. Scene / direction'},
  productBusy:{hu:'Termékkép készül…',en:'Creating product image…'},
  productMake:{hu:'Termékjelenet generálása',en:'Generate product scene'},
  openResult:{hu:'Eredmény megnyitása',en:'Open result'},
  editLead:{hu:'Nano Banana 2 Edit · 1–14 referencia-kép · 1K / 2K / 4K. A rendszer az eredeti témát megőrzi, és a promptban megadott változtatást célozza.',en:'Nano Banana 2 Edit · 1–14 reference images · 1K / 2K / 4K. The system preserves the original subject and targets the change you describe.'},
  stepRefs:{hu:'1. Referenciák',en:'1. References'},
  stepChange:{hu:'2. Mit változtassak?',en:'2. What should change?'},
  editBusy:{hu:'AI Edit készül…',en:'Running AI Edit…'},
  editRun:{hu:'AI Edit futtatása',en:'Run AI Edit'},
  beforeAfter:{hu:'ELŐTTE / UTÁNA',en:'BEFORE / AFTER'},
  compareLabel:{hu:'Előtte utána összehasonlítás',en:'Before / after comparison'},
  versions:{hu:'VERZIÓK',en:'VERSIONS'},
  campaignBusy:{hu:'Kampány készül…',en:'Creating campaign…'},
  campaignMake:{hu:'Teljes kampány generálása',en:'Generate the full campaign'},
  open:{hu:'Megnyitás',en:'Open'},
  genericPlaceholder:{hu:'Mit szeretnél készíteni? Példa: ',en:'What would you like to create? For example: '},
  genericPlaceholderTail:{hu:' egy prémium fekete-arany márkának.',en:' for a premium black-and-gold brand.'},
  genericBusy:{hu:'Generálás…',en:'Generating…'},
  genericMake:{hu:'AI kreatív készítése',en:'Create AI creative'},
  brandLoadShort:{hu:'Brand betöltése',en:'Load brand'},
  openImage:{hu:'Kép megnyitása / mentése',en:'Open / save image'},
  resolution:{hu:'Felbontás',en:'Resolution'},
  aspectRatio:{hu:'Képarány',en:'Aspect ratio'},
  freeTest:{hu:'INGYENES TESZT',en:'FREE TEST'},
  colorTitle:{hu:'Szín',en:'Colour'},
  errBrand:{hu:'A mentett Brand Kit nem olvasható.',en:'The saved Brand Kit could not be read.'},
  errBrandSave:{hu:'A Brand Kit mentése sikertelen. Ellenőrizd a böngésző tárhelyét.',en:'Saving the Brand Kit failed. Check the browser storage.'},
  errLogo:{hu:'A logó generálása sikertelen.',en:'Logo generation failed.'},
  errGeneric:{hu:'A generálás sikertelen.',en:'Generation failed.'},
  errEdit:{hu:'Az AI Edit sikertelen.',en:'AI Edit failed.'},
  errProduct:{hu:'A Product Studio generálása sikertelen.',en:'Product Studio generation failed.'},
  errCampaign:{hu:'A kampány generálása sikertelen.',en:'Campaign generation failed.'},
};

function LocalImage({ file, alt, className, draggable = false }: { file: File; alt: string; className?: string; draggable?: boolean }) {
 const [url,setUrl]=useState('');
 useEffect(()=>{const next=URL.createObjectURL(file);setUrl(next);return()=>URL.revokeObjectURL(next);},[file]);
 if(!url) return null;
 return <img src={url} alt={alt} draggable={draggable} className={className}/>;
}
function download(name:string,data:BlobPart,type:string){const blob=new Blob([data],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}

export default function CreativeStudio({ initialTool, language='hu' }: { initialTool?: string; language?: string }) {
 const hu = language === 'hu';
 const t = (key:string) => (hu ? TEXT[key]?.hu : (TEXT[key]?.en ?? TEXT[key]?.hu)) ?? key;
 const descOf = (item: Tool) => (hu ? item.desc.hu : item.desc.en);
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
 const [productPrompt,setProductPrompt]=useState(() => hu
   ? 'Hozd létre a termék prémium lifestyle reklámfotóját természetes fényekkel, realisztikus anyagokkal és finom árnyékokkal. A termék formáját, logóját és arányait tartsd változatlanul.'
   : 'Create a premium lifestyle advertising photo of the product with natural lighting, realistic materials and subtle shadows. Keep the product shape, logo and proportions unchanged.');
 const [productResult,setProductResult]=useState<string|null>(null);
 const [brand,setBrand]=useState<Brand>(DEFAULT_BRAND);
 const [brandSaved,setBrandSaved]=useState(false);
 const [cnc,setCnc]=useState({w:80,h:50,depth:4,feed:700,plunge:250,spindle:12000,controller:'GRBL'});
 const [planner,setPlanner]=useState({w:200,h:100,label:hu?'Alaprajz / gyártási terv':'Layout / production plan'});
 const current=useMemo(()=>TOOLS.find(t=>t.id===tool)!,[tool]);
 const select=(id:ToolId)=>{setTool(id);setImage(null);setLogoImage(null);setCampaign([]);setEditImage(null);setEditHistory([]);setProductResult(null);setError('');};
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
  }catch{setError(t('errBrand'));}
 };
 const saveBrand=()=>{try{localStorage.setItem('designly_brand_kit_v5',JSON.stringify({...brand,savedAt:new Date().toISOString()}));setBrandSaved(true);}catch{setError(t('errBrandSave'));}};
 async function generateLogo(){
  if(!brand.name.trim()||busy)return;
  setBusy(true);setError('');setLogoImage(null);
  try{
    const prompt='Professional brand logo concept for '+brand.name+'. Tone: '+brand.tone+'. Typography direction: '+brand.heading+'. Colors: '+brand.colors.join(', ')+'. Create a clean distinctive logo mark and wordmark on a dark neutral presentation board. No mockup-only result.';
    const result=await generateCreativeImage(prompt,'1:1');
    setLogoImage(result.url);
  }catch(e){setError(e instanceof Error?e.message:t('errLogo'));}
  finally{setBusy(false);}
 }
 async function generateVisual(){if(!brief.trim()||busy)return;setBusy(true);setError('');setImage(null);try{const prompt='Professional '+current.label+' design. Brief: '+brief+'. Style: '+style+'. Brand: '+(brand.name||'DESIGNLY')+'. Colors: '+brand.colors.join(', ')+'. Premium polished graphic composition.';const result=await generateCreativeImage(prompt,RATIO[tool]||'1:1');setImage(result.url);}catch(e){setError(e instanceof Error?e.message:t('errGeneric'));}finally{setBusy(false);}}
 async function runImageEdit(){
  if(!editFiles.length||!editPrompt.trim()||busy)return;
  setBusy(true);setError('');setEditImage(null);
  try{
    const result=await editCreativeImage({files:editFiles,prompt:editPrompt,aspectRatio:editAspectRatio,resolution:editResolution});
    setEditImage(result.url);
    setEditHistory((prev)=>[result.url,...prev.filter((url)=>url!==result.url)].slice(0,8));
  }catch(e){setError(e instanceof Error?e.message:t('errEdit'));}
  finally{setBusy(false);}
 }
 async function generateProduct(){
  if(!productFile||!productPrompt.trim()||busy)return;
  setBusy(true);setError('');setProductResult(null);
  try{
    const result=await editCreativeImage({files:[productFile],prompt:productPrompt.trim(),aspectRatio:editAspectRatio,resolution:editResolution});
    setProductResult(result.url);
  }catch(e){setError(e instanceof Error?e.message:t('errProduct'));}
  finally{setBusy(false);}
 }
 async function generateCampaign(){if(!brief.trim()||busy)return;setBusy(true);setError('');setCampaign([]);const formats=['poster','flyer','social','advertisement'];const out:{label:string;url:string}[]=[];try{for(const fmt of formats){const label=TOOLS.find(t=>t.id===fmt)?.label||fmt;const result=await generateCreativeImage('Campaign creative for '+brief+'. Format: '+label+'. Style: '+style+'. Brand: '+(brand.name||'DESIGNLY')+'. Colors: '+brand.colors.join(', ')+'. Keep the same identity and preserve the requested format composition.',RATIO[fmt]||'1:1');out.push({label,url:result.url});setCampaign([...out]);}}catch(e){setError(e instanceof Error?e.message:t('errCampaign'));}finally{setBusy(false);}}
 const resolutions: Array<'1k'|'2k'|'4k'> = ['1k','2k','4k'];
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
      <div className='mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200'>
       <span className='font-semibold'>{t('testBanner')}</span> · {t('testBannerBody')}
      </div>
     <div className='mb-5 flex flex-wrap items-start justify-between gap-4'><div><div className='text-[10px] uppercase tracking-[.2em] text-accent'>ACTIVE TOOL</div><h2 className='mt-1 font-display text-2xl text-ink-100'>{current.label}</h2><p className='mt-1 text-sm text-ink-400'>{descOf(current)}</p></div><span className='rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] text-emerald-300'>{t('active')}</span></div>
     {tool==='brand' && <section className='space-y-4'><div className='grid gap-4 md:grid-cols-2'><input className='vp-input' value={brand.name} onChange={e=>setBrand({...brand,name:e.target.value})} placeholder={t('brandName')}/><input className='vp-input' value={brand.tone} onChange={e=>setBrand({...brand,tone:e.target.value})} placeholder={t('brandTone')}/><input className='vp-input' value={brand.heading} onChange={e=>setBrand({...brand,heading:e.target.value})} placeholder={t('brandHeading')}/><input className='vp-input' value={brand.body} onChange={e=>setBrand({...brand,body:e.target.value})} placeholder={t('brandBody')}/></div><div className='flex flex-wrap gap-2'>{brand.colors.map((c,i)=><input key={i} type='color' value={c} onChange={e=>{const colors=[...brand.colors];colors[i]=e.target.value;setBrand({...brand,colors});}} className='h-11 w-14 rounded-lg border border-line bg-panel'/>)}</div><div className='grid gap-3 md:grid-cols-4'>{brand.colors.map((c,i)=><div key={i} className='h-20 rounded-xl border border-line' style={{background:c}} title={t('colorTitle')+' '+(i+1)+' '+c}/>)}</div><div className='flex flex-wrap items-center gap-3'><button type='button' onClick={generateLogo} disabled={busy||!brand.name.trim()} className='vp-btn'><Sparkles className='h-4 w-4'/>{t('logoConcept')}</button><button type='button' onClick={saveBrand} className='vp-btn'><Save className='h-4 w-4'/>{t('brandSave')}</button><button type='button' onClick={loadBrand} className='vp-btn-ghost'><Wand2 className='h-4 w-4'/>{t('brandLoad')}</button>{brandSaved&&<span className='text-xs text-emerald-300'><Check className='inline h-4 w-4'/> {t('saved')}</span>}</div>{logoImage&&<div className='overflow-hidden rounded-2xl border border-accent/20 bg-black'><img src={logoImage} alt={t('logoConcept')} draggable={false} className='max-h-[420px] w-full object-contain'/><div className='flex justify-end p-3'><a href={logoImage} target='_blank' rel='noreferrer' className='vp-btn-ghost'><Download className='h-4 w-4'/>{t('openLogo')}</a></div></div>}</section>}
     {tool==='cnc' && <CncPromptStudio language={language} />}
     {tool==='planner' && <EngineeringPlanner language={language} />}
     {tool==='tattoo' && <TattooStudio language={language} />}
     {tool==='product' && <section className='space-y-4'>
      <div className='rounded-2xl border border-accent/20 bg-accent/5 p-4 text-sm text-ink-300'><div className='font-semibold text-ink-100'>AI Product Studio</div><p className='mt-1'>{t('productLead')}</p></div>
      <div className='grid gap-4 md:grid-cols-2'>
       <div className='rounded-2xl border border-line bg-canvas/50 p-4'>
        <div className='mb-2 text-xs font-semibold text-ink-200'>{t('stepProduct')}</div>
        <input type='file' accept='image/png,image/jpeg,image/webp' className='vp-input' onChange={e=>{setProductFile(e.target.files?.[0]||null);setProductResult(null);setError('');}}/>
        {productFile&&<LocalImage file={productFile} alt={t('productRef')} className='mt-3 max-h-80 w-full rounded-xl object-contain'/>}
       </div>
       <div className='rounded-2xl border border-line bg-canvas/50 p-4'>
        <div className='mb-2 text-xs font-semibold text-ink-200'>{t('stepScene')}</div>
        <textarea rows={7} className='vp-input' value={productPrompt} onChange={e=>setProductPrompt(e.target.value)}/>
        <div className='mt-3 flex flex-wrap gap-2'>{(hu
          ? ['Luxus stúdiófotó fekete háttérrel','Minimal fehér webshop háttér','Modern lifestyle jelenet','Prémium social reklámkép','Sötét cinematic termékfotó']
          : ['Luxury studio shot on a black background','Minimal white webshop background','Modern lifestyle scene','Premium social ad image','Dark cinematic product shot']
        ).map(p=><button key={p} type='button' onClick={()=>setProductPrompt(p+(hu?'. A termék formáját, logóját és arányait tartsd változatlanul.':'. Keep the product shape, logo and proportions unchanged.'))} className='rounded-full border border-line px-3 py-1.5 text-[10px] text-ink-300 hover:border-accent/50 hover:text-accent'>{p}</button>)}</div>
       </div>
      </div>
      <div className='grid gap-3 sm:grid-cols-3'>
       <label className='text-xs text-ink-400'>{t('resolution')}<select className='vp-input mt-1' value={editResolution} onChange={e=>setEditResolution(e.target.value as '1k'|'2k'|'4k')}>{resolutions.map(v=><option key={v} value={v}>{v.toUpperCase()+' · '+t('freeTest')}</option>)}</select></label>
       <label className='text-xs text-ink-400'>{t('aspectRatio')}<select className='vp-input mt-1' value={editAspectRatio} onChange={e=>setEditAspectRatio(e.target.value)}>{['1:1','16:9','9:16','3:2','4:5','4:3','3:4','2:3'].map(v=><option key={v}>{v}</option>)}</select></label>
       <div className='flex items-end'><button type='button' disabled={busy||!productFile||!productPrompt.trim()} onClick={generateProduct} className='vp-btn w-full'><Sparkles className='h-4 w-4'/>{busy?t('productBusy'):t('productMake')}</button></div>
      </div>
      {productResult&&<div className='overflow-hidden rounded-2xl border border-accent/20 bg-black'><img src={productResult} alt={t('productMake')} className='max-h-[720px] w-full object-contain'/><div className='flex justify-end p-3'><a href={productResult} target='_blank' rel='noreferrer' className='vp-btn-ghost'><Download className='h-4 w-4'/>{t('openResult')}</a></div></div>}
     </section>}
     {tool==='ai_edit' && <section className='space-y-4'>
      <div className='rounded-2xl border border-accent/20 bg-accent/5 p-4 text-sm text-ink-300'>
       <div className='font-semibold text-ink-100'>AI Image Editor 2.0</div>
       <p className='mt-1'>{t('editLead')}</p>
      </div>
      <div className='grid gap-3 md:grid-cols-2'>
       <div className='rounded-2xl border border-line bg-canvas/50 p-4'>
        <div className='mb-2 text-xs font-semibold text-ink-200'>{t('stepRefs')}</div>
        <input type='file' accept='image/png,image/jpeg,image/webp' multiple className='vp-input' onChange={e=>{const files=Array.from(e.target.files||[]).slice(0,14);setEditFiles(files);setEditImage(null);setEditHistory([]);setError('');}}/>
        {editFiles.length>0&&<div className='mt-3 grid grid-cols-3 gap-2'>{editFiles.map((file,i)=><figure key={file.name+i} className='overflow-hidden rounded-lg border border-line bg-black'><LocalImage file={file} alt={file.name} className='aspect-square w-full object-cover'/><figcaption className='truncate p-1.5 text-[9px] text-ink-500'>{i+1}. {file.name}</figcaption></figure>)}</div>}
       </div>
       <div className='rounded-2xl border border-line bg-canvas/50 p-4'>
        <div className='mb-2 text-xs font-semibold text-ink-200'>{t('stepChange')}</div>
        <textarea rows={5} className='vp-input' value={editPrompt} onChange={e=>setEditPrompt(e.target.value)} placeholder={hu?'Pl. Cseréld le a hátteret sötét prémium stúdióra. A terméket, logót, feliratot és arányokat tartsd változatlanul.':'E.g. Replace the background with a dark premium studio. Keep the product, logo, text and proportions unchanged.'}/>
        <div className='mt-3 flex flex-wrap gap-2'>{(hu
          ? ['Háttér csere prémium stúdióra','Termék környezetének cseréje','Fények és árnyékok javítása','Tisztítsd meg a hátteret','Cseréld a színeket, mást ne módosíts','Készíts reklámfotó jellegű változatot']
          : ['Swap the background for a premium studio','Replace the product environment','Improve lighting and shadows','Clean up the background','Change the colours, nothing else','Create an advertising-style version']
        ).map(p=><button key={p} type='button' onClick={()=>setEditPrompt(p)} className='rounded-full border border-line px-3 py-1.5 text-[10px] text-ink-300 hover:border-accent/50 hover:text-accent'>{p}</button>)}</div>
       </div>
      </div>
      <div className='grid gap-3 sm:grid-cols-3'>
       <label className='text-xs text-ink-400'>{t('resolution')}<select className='vp-input mt-1' value={editResolution} onChange={e=>setEditResolution(e.target.value as '1k'|'2k'|'4k')}><option value='1k'>1K · 10 {hu?'kredit':'credits'}</option><option value='2k'>2K · 15 {hu?'kredit':'credits'}</option><option value='4k'>4K · 20 {hu?'kredit':'credits'}</option></select></label>
       <label className='text-xs text-ink-400'>{t('aspectRatio')}<select className='vp-input mt-1' value={editAspectRatio} onChange={e=>setEditAspectRatio(e.target.value)}>{['1:1','16:9','9:16','3:2','4:5','4:3','3:4','2:3'].map(v=><option key={v}>{v}</option>)}</select></label>
       <div className='flex items-end'><button type='button' disabled={busy||!editFiles.length||!editPrompt.trim()} onClick={runImageEdit} className='vp-btn w-full'><Wand2 className='h-4 w-4'/>{busy?t('editBusy'):t('editRun')}</button></div>
      </div>
      {editImage&&editFiles[0]&&<div className='rounded-2xl border border-line bg-black p-3'>
       <div className='mb-2 flex items-center justify-between text-xs text-ink-400'><span>{t('beforeAfter')}</span><span>{editCompare}%</span></div>
       <div className='relative overflow-hidden rounded-xl'>
        <LocalImage file={editFiles[0]} alt={hu?'Eredeti referencia':'Original reference'} className='block max-h-[720px] w-full object-contain'/>
        <div className='absolute inset-y-0 left-0 overflow-hidden' style={{width:editCompare+'%'}}><img src={editImage} alt={t('openResult')} className='block h-full w-[100vw] max-w-none object-contain object-left'/></div>
       </div>
       <input aria-label={t('compareLabel')} type='range' min='0' max='100' value={editCompare} onChange={e=>setEditCompare(Number(e.target.value))} className='mt-3 w-full'/>
       <div className='mt-3 flex flex-wrap justify-end gap-2'><a href={editImage} target='_blank' rel='noreferrer' className='vp-btn-ghost'><Download className='h-4 w-4'/>{t('openResult')}</a></div>
      </div>}
      {editHistory.length>0&&<div className='rounded-2xl border border-line bg-canvas/50 p-4'><div className='mb-3 text-xs font-semibold text-ink-200'>{t('versions')} · {editHistory.length}</div><div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>{editHistory.map((url,i)=><button key={url} type='button' onClick={()=>setEditImage(url)} className={'overflow-hidden rounded-xl border bg-black '+(url===editImage?'border-accent/70':'border-line')}><img src={url} alt={'AI Edit '+(i+1)} className='aspect-square w-full object-cover'/><span className='block p-2 text-left text-[10px] text-ink-400'>V{i+1}</span></button>)}</div></div>}
      </section>}
     {tool==='campaign' && <section className='space-y-4'><textarea rows={4} className='vp-input' value={brief} onChange={e=>setBrief(e.target.value)} placeholder={hu?'Pl. KÉK MAJOM őszi kampány: autókozmetika akció':'E.g. BLUE MONKEY autumn campaign: car detailing offer'}/><button type='button' disabled={busy||!brief.trim()} onClick={generateCampaign} className='vp-btn'><Megaphone className='h-4 w-4'/>{busy?t('campaignBusy'):t('campaignMake')}</button>{campaign.length>0&&<div className='grid gap-4 sm:grid-cols-2'>{campaign.map(x=><figure key={x.label} className='overflow-hidden rounded-2xl border border-line bg-panel'><img src={x.url} alt={x.label} draggable={false} className='h-auto w-full object-cover'/><figcaption className='flex items-center justify-between gap-3 p-3 text-xs text-ink-200'><span>{x.label}</span><a href={x.url} target='_blank' rel='noreferrer' className='text-accent'>{t('open')}</a></figcaption></figure>)}</div>}</section>}
     {!TOOLS_WITH_OWN_BLOCK.includes(tool) && <section className='space-y-4'><textarea rows={4} className='vp-input' value={brief} onChange={e=>setBrief(e.target.value)} placeholder={t('genericPlaceholder')+current.label+t('genericPlaceholderTail')}/><div className='flex flex-wrap gap-2'>{['premium','luxury','minimal','modern','cinematic','corporate','bold'].map(v=><button key={v} type='button' onClick={()=>setStyle(v)} className={'rounded-full border px-3 py-1 text-xs '+(style===v?'border-accent/70 bg-accent/15 text-accent':'border-line text-ink-300')}>{v}</button>)}</div><div className='flex flex-wrap gap-2'><button type='button' disabled={busy||!brief.trim()} onClick={generateVisual} className='vp-btn'>{busy?<Sparkles className='h-4 w-4 animate-pulse'/>:<Brush className='h-4 w-4'/>}{busy?t('genericBusy'):t('genericMake')}</button><button type='button' onClick={loadBrand} className='vp-btn-ghost'><Wand2 className='h-4 w-4'/>{t('brandLoadShort')}</button></div>{image&&<div className='overflow-hidden rounded-2xl border border-accent/20 bg-black'><img src={image} alt={current.label} draggable={false} className='max-h-[620px] w-full object-contain'/><div className='flex justify-end p-3'><a href={image} target='_blank' rel='noreferrer' className='vp-btn-ghost'><Download className='h-4 w-4'/>{t('openImage')}</a></div></div>}</section>}
     {error&&<div className='mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'><X className='h-4 w-4'/>{error}</div>}
     </main>
   </div>
  </div>
 );
}
