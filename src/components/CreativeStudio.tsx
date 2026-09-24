import { useMemo, useState } from 'react';
import { BadgeCheck, BriefcaseBusiness, Brush, CalendarDays, Check, Download, FileText, Image as ImageIcon, Layers3, LayoutDashboard, Megaphone, PenTool, Ruler, Save, Settings2, Sparkles, Target, Wand2, Wrench, X } from 'lucide-react';
import { generateCreativeImage } from '../lib/creative-api';

type ToolId = 'brand'|'campaign'|'business_card'|'invitation'|'flyer'|'poster'|'advertisement'|'brochure'|'menu'|'pricelist'|'social'|'banner'|'presentation'|'tattoo'|'planner'|'cnc';
type Tool = { id: ToolId; label: string; desc: string; icon: typeof Sparkles; kind: 'visual'|'system' };
const TOOLS: Tool[] = [
  {id:'brand',label:'Brand Kit',desc:'Színek, tipográfia, hangnem és márkaalap.',icon:BriefcaseBusiness,kind:'system'},
  {id:'campaign',label:'Kampány Stúdió',desc:'Egy briefből több kreatív formátum.',icon:Megaphone,kind:'visual'},
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
function downloadJson(name:string,data:unknown){download(name,JSON.stringify(data,null,2),'application/json;charset=utf-8');}
function cncGcode(w:number,h:number,depth:number,feed:number,plunge:number,spindle:number,controller:string){const d=Math.max(.2,Math.abs(depth));const step=Math.max(.2,d/2);const out=['%','( DESIGNLY CNC CAM )','( CONTROLLER: '+controller+' )','G21 G90 G17 G94','G0 Z5','M3 S'+Math.round(spindle)];for(let z=-step;z>=-d-1e-6;z-=step){const zz=Math.max(z,-d).toFixed(3);out.push('(DEPTH '+zz+' MM)','G0 X0 Y0','G1 Z'+zz+' F'+Math.round(plunge),'G1 X'+w.toFixed(3)+' Y0 F'+Math.round(feed),'G1 X'+w.toFixed(3)+' Y'+h.toFixed(3),'G1 X0 Y'+h.toFixed(3),'G1 X0 Y0','G0 Z5');if(z<=-d)break;}out.push('M5','M30','%');return out.join('\n');}
function plannerSvg(w:number,h:number,label:string){const safeW=Math.max(1,w),safeH=Math.max(1,h),W=900,H=600,scale=Math.min(760/safeW,450/safeH),rw=safeW*scale,rh=safeH*scale,x=(W-rw)/2,y=(H-rh)/2;return '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="100%" height="100%" fill="#090a0d"/><rect x="'+x+'" y="'+y+'" width="'+rw+'" height="'+rh+'" fill="#13161c" stroke="#c9a45c" stroke-width="3"/><text x="450" y="45" fill="#c9a45c" font-size="22" text-anchor="middle">DESIGNLY PLANNER</text><text x="450" y="570" fill="#eee8dc" font-size="18" text-anchor="middle">'+safeW+' × '+safeH+' mm · '+label+'</text></svg>';}

export default function CreativeStudio(){
 const [tool,setTool]=useState<ToolId>('brand');
 const [brief,setBrief]=useState('');
 const [style,setStyle]=useState('premium');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [image,setImage]=useState<string|null>(null);
 const [campaign,setCampaign]=useState<{label:string;url:string}[]>([]);
 const [brand,setBrand]=useState<Brand>(DEFAULT_BRAND);
 const [brandSaved,setBrandSaved]=useState(false);
 const [cnc,setCnc]=useState({w:80,h:50,depth:4,feed:700,plunge:250,spindle:12000,controller:'GRBL'});
 const [planner,setPlanner]=useState({w:200,h:100,label:'Alaprajz / gyártási terv'});
 const current=useMemo(()=>TOOLS.find(t=>t.id===tool)!,[tool]);
 const select=(id:ToolId)=>{setTool(id);setImage(null);setCampaign([]);setError('');};
 const loadBrand=()=>{try{const v=localStorage.getItem('designly_brand_kit_v5');if(v)setBrand({...DEFAULT_BRAND,...JSON.parse(v)});}catch{setError('A mentett Brand Kit nem olvasható.');}};
 const saveBrand=()=>{localStorage.setItem('designly_brand_kit_v5',JSON.stringify({...brand,savedAt:new Date().toISOString()}));setBrandSaved(true);};
 async function generateVisual(){if(!brief.trim()||busy)return;setBusy(true);setError('');setImage(null);try{const prompt='Professional '+current.label+' design. Brief: '+brief+'. Style: '+style+'. Brand: '+(brand.name||'DESIGNLY')+'. Colors: '+brand.colors.join(', ')+'. Premium polished graphic composition.';const result=await generateCreativeImage(prompt,RATIO[tool]||'1:1');setImage(result.url);}catch(e){setError(e instanceof Error?e.message:'A generálás sikertelen.');}finally{setBusy(false);}}
 async function generateCampaign(){if(!brief.trim()||busy)return;setBusy(true);setError('');setCampaign([]);const formats=['poster','flyer','social','advertisement'];const out:{label:string;url:string}[]=[];try{for(const fmt of formats){const label=TOOLS.find(t=>t.id===fmt)?.label||fmt;const result=await generateCreativeImage('Campaign creative for '+brief+'. Format: '+label+'. Style: '+style+'. Brand: '+(brand.name||'DESIGNLY')+'. Colors: '+brand.colors.join(', ')+'. Keep the same identity.','1:1');out.push({label,url:result.url});setCampaign([...out]);}}catch(e){setError(e instanceof Error?e.message:'A kampány generálása sikertelen.');}finally{setBusy(false);}}
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
     {tool==='brand' && <section className='space-y-4'><div className='grid gap-4 md:grid-cols-2'><input className='vp-input' value={brand.name} onChange={e=>setBrand({...brand,name:e.target.value})} placeholder='Márkanév'/><input className='vp-input' value={brand.tone} onChange={e=>setBrand({...brand,tone:e.target.value})} placeholder='Hangnem / stílus'/><input className='vp-input' value={brand.heading} onChange={e=>setBrand({...brand,heading:e.target.value})} placeholder='Címbetű'/><input className='vp-input' value={brand.body} onChange={e=>setBrand({...brand,body:e.target.value})} placeholder='Törzsszöveg betű'/></div><div className='flex flex-wrap gap-2'>{brand.colors.map((c,i)=><input key={i} type='color' value={c} onChange={e=>{const colors=[...brand.colors];colors[i]=e.target.value;setBrand({...brand,colors});}} className='h-11 w-14 rounded-lg border border-line bg-panel'/>)}</div><div className='grid gap-3 md:grid-cols-4'>{brand.colors.map((c,i)=><div key={i} className='h-20 rounded-xl border border-line' style={{background:c}} title={'Szín '+(i+1)+' '+c}/>)}</div><div className='flex flex-wrap items-center gap-3'><button type='button' onClick={saveBrand} className='vp-btn'><Save className='h-4 w-4'/>Brand Kit mentése</button><button type='button' onClick={loadBrand} className='vp-btn-ghost'><Wand2 className='h-4 w-4'/>Mentett betöltése</button>{brandSaved&&<span className='text-xs text-emerald-300'><Check className='inline h-4 w-4'/> Elmentve</span>}</div></section>}
     {tool==='cnc' && <section className='space-y-4'><div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>{(['w','h','depth','feed','plunge','spindle'] as const).map(k=><label key={k} className='text-xs text-ink-400'>{k}<input type='number' min='0.1' value={cnc[k]} onChange={e=>setCnc({...cnc,[k]:Number(e.target.value)})} className='vp-input mt-1'/></label>)}<label className='text-xs text-ink-400'>Vezérlő<select value={cnc.controller} onChange={e=>setCnc({...cnc,controller:e.target.value})} className='vp-input mt-1'>{['GRBL','LinuxCNC','Mach3','Fanuc','Haas','Siemens'].map(v=><option key={v}>{v}</option>)}</select></label></div><pre className='max-h-80 overflow-auto rounded-2xl border border-line bg-black p-4 text-[11px] leading-5 text-ink-200'>{gcode}</pre><button type='button' onClick={()=>download('designly-cnc.nc',gcode,'text/plain;charset=utf-8')} className='vp-btn'><Download className='h-4 w-4'/>G-kód export</button></section>}
     {tool==='planner' && <section className='space-y-4'><div className='grid gap-3 md:grid-cols-3'><input type='number' min='1' className='vp-input' value={planner.w} onChange={e=>setPlanner({...planner,w:Math.max(1,Number(e.target.value))})}/><input type='number' min='1' className='vp-input' value={planner.h} onChange={e=>setPlanner({...planner,h:Math.max(1,Number(e.target.value))})}/><input className='vp-input' value={planner.label} onChange={e=>setPlanner({...planner,label:e.target.value})}/></div><img src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(psvg)} alt='Planner előnézet' className='w-full rounded-2xl border border-line'/><button type='button' onClick={()=>download('designly-planner.svg',psvg,'image/svg+xml;charset=utf-8')} className='vp-btn'><Download className='h-4 w-4'/>SVG export</button></section>}
     {tool==='campaign' && <section className='space-y-4'><textarea rows={4} className='vp-input' value={brief} onChange={e=>setBrief(e.target.value)} placeholder='Pl. KÉK MAJOM őszi kampány: autókozmetika akció'/><button type='button' disabled={busy||!brief.trim()} onClick={generateCampaign} className='vp-btn'><Megaphone className='h-4 w-4'/>{busy?'Kampány készül…':'Teljes kampány generálása'}</button>{campaign.length>0&&<div className='grid gap-4 sm:grid-cols-2'>{campaign.map(x=><figure key={x.label} className='overflow-hidden rounded-2xl border border-line bg-panel'><img src={x.url} alt={x.label} draggable={false} className='aspect-square w-full object-cover'/><figcaption className='p-3 text-xs text-ink-200'>{x.label}</figcaption></figure>)}</div>}</section>}
     {!['brand','cnc','planner','campaign'].includes(tool) && <section className='space-y-4'><textarea rows={4} className='vp-input' value={brief} onChange={e=>setBrief(e.target.value)} placeholder={'Mit szeretnél készíteni? Példa: '+current.label+' egy prémium fekete-arany márkának.'}/><div className='flex flex-wrap gap-2'>{['premium','luxury','minimal','modern','cinematic','corporate','bold'].map(v=><button key={v} type='button' onClick={()=>setStyle(v)} className={'rounded-full border px-3 py-1 text-xs '+(style===v?'border-accent/70 bg-accent/15 text-accent':'border-line text-ink-300')}>{v}</button>)}</div><div className='flex flex-wrap gap-2'><button type='button' disabled={busy||!brief.trim()} onClick={generateVisual} className='vp-btn'>{busy?<Sparkles className='h-4 w-4 animate-pulse'/>:<Brush className='h-4 w-4'/>}{busy?'Generálás…':'AI kreatív készítése'}</button><button type='button' onClick={loadBrand} className='vp-btn-ghost'><Wand2 className='h-4 w-4'/>Brand betöltése</button></div>{image&&<div className='overflow-hidden rounded-2xl border border-accent/20 bg-black'><img src={image} alt={current.label} draggable={false} className='max-h-[620px] w-full object-contain'/></div>}</section>}
     {error&&<div className='mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'><X className='h-4 w-4'/>{error}</div>}
     </main>
   </div>
  </div>
 );
}