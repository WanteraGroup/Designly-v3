import { useState } from 'react';
import { Download, Grid3X3, PenTool, Share2, Sparkles } from 'lucide-react';
import { generateCreativeImage } from '../lib/creative-api';

type Lang = 'hu'|'en'|'de'|'fr'|'es'|'it'|'pl'|'uk'|'ro'|'nl';
type StyleKey = 'blackwork'|'fineLine'|'geometric'|'ornamental'|'nordic'|'realistic'|'dotwork'|'minimal';
type PlacementKey = 'forearm'|'upperArm'|'calf'|'chest'|'back'|'shoulder';
const STYLES: Array<{id:StyleKey;hu:string;en:string}> = [
  {id:'blackwork',hu:'Blackwork',en:'Blackwork'},
  {id:'fineLine',hu:'Fineline',en:'Fine line'},
  {id:'geometric',hu:'Geometrikus',en:'Geometric'},
  {id:'ornamental',hu:'Ornament / mandala',en:'Ornamental / mandala'},
  {id:'nordic',hu:'Kelta / Viking',en:'Celtic / Viking'},
  {id:'realistic',hu:'Realistikus',en:'Realistic'},
  {id:'dotwork',hu:'Dotwork',en:'Dotwork'},
  {id:'minimal',hu:'Minimal',en:'Minimal'},
];
const PLACEMENTS: Array<{id:PlacementKey;hu:string;en:string}> = [
  {id:'forearm',hu:'Alkar',en:'Forearm'},
  {id:'upperArm',hu:'Felkar',en:'Upper arm'},
  {id:'calf',hu:'Vádli',en:'Calf'},
  {id:'chest',hu:'Mellkas',en:'Chest'},
  {id:'back',hu:'Hát',en:'Back'},
  {id:'shoulder',hu:'Váll',en:'Shoulder'},
];
const UI: Record<Lang, Record<string,string>> = {
  hu:{title:'PRO TATTOO STUDIO',desc:'Szalonszintű tattoo minta készítése átlátszó háttérrel, stencillel és segédvonalas munkalappal.',style:'Stílus',subject:'Mit készítsünk?',placement:'Elhelyezés',format:'Formátum',guides:'Segédvonalak',center:'Középvonal',grid:'Rács',mirror:'Tükörtengely',generate:'Tattoo minta készítése',generating:'Minta készül…',result:'ELŐNÉZET',transparent:'Átlátszó PNG',stencil:'Stencil PNG',guideSheet:'Szalon munkalap',download:'Letöltés',share:'Küldés / megosztás',svg:'Stencil SVG',ready:'SZALONKÉSZ',note:'A fehér háttér automatikusan átlátszóvá válik. A stencil fekete, nyomtatás- és fóliavágás-barát változat.',},
  en:{title:'PRO TATTOO STUDIO',desc:'Salon-ready tattoo design with transparent background, stencil output and guide-sheet.',style:'Style',subject:'What should we create?',placement:'Placement',format:'Format',guides:'Guide lines',center:'Center line',grid:'Grid',mirror:'Mirror axis',generate:'Create tattoo design',generating:'Generating…',result:'PREVIEW',transparent:'Transparent PNG',stencil:'Stencil PNG',guideSheet:'Salon sheet',download:'Download',share:'Share / send',svg:'Stencil SVG',ready:'SALON READY',note:'White background is automatically removed. Stencil is a black, print- and transfer-friendly version.',},
  de:{title:'PRO TATTOO STUDIO',desc:'Salonfertiges Tattoo mit transparentem Hintergrund, Schablone und Hilfslinien.',style:'Stil',subject:'Was soll erstellt werden?',placement:'Position',format:'Format',guides:'Hilfslinien',center:'Mittellinie',grid:'Raster',mirror:'Spiegelachse',generate:'Tattoo erstellen',generating:'Wird erstellt…',result:'VORSCHAU',transparent:'Transparente PNG',stencil:'Stencil PNG',guideSheet:'Salonblatt',download:'Download',share:'Teilen / senden',svg:'Stencil SVG',ready:'SALONFERTIG',note:'Der weiße Hintergrund wird automatisch transparent. Die Schablone ist schwarz und transferfreundlich.',},
  fr:{title:'PRO TATTOO STUDIO',desc:'Motif prêt pour le salon avec fond transparent, stencil et lignes guides.',style:'Style',subject:'Que créer ?',placement:'Emplacement',format:'Format',guides:'Lignes guides',center:'Axe central',grid:'Grille',mirror:'Axe miroir',generate:'Créer le tattoo',generating:'Génération…',result:'APERÇU',transparent:'PNG transparent',stencil:'PNG stencil',guideSheet:'Plan salon',download:'Télécharger',share:'Partager / envoyer',svg:'SVG stencil',ready:'PRÊT SALON',note:'Le fond blanc est retiré automatiquement. Le stencil est noir et adapté au transfert.',},
  es:{title:'PRO TATTOO STUDIO',desc:'Diseño de tatuaje listo para estudio con fondo transparente, stencil y guías.',style:'Estilo',subject:'¿Qué creamos?',placement:'Ubicación',format:'Formato',guides:'Líneas guía',center:'Línea central',grid:'Cuadrícula',mirror:'Eje espejo',generate:'Crear tatuaje',generating:'Generando…',result:'VISTA PREVIA',transparent:'PNG transparente',stencil:'PNG stencil',guideSheet:'Hoja de estudio',download:'Descargar',share:'Compartir / enviar',svg:'SVG stencil',ready:'LISTO PARA ESTUDIO',note:'El fondo blanco se elimina automáticamente. El stencil queda negro y preparado para transferencia.',},
  it:{title:'PRO TATTOO STUDIO',desc:'Design tattoo pronto per studio con sfondo trasparente, stencil e linee guida.',style:'Stile',subject:'Cosa creiamo?',placement:'Posizione',format:'Formato',guides:'Linee guida',center:'Linea centrale',grid:'Griglia',mirror:'Asse specchio',generate:'Crea tattoo',generating:'Generazione…',result:'ANTEPRIMA',transparent:'PNG trasparente',stencil:'PNG stencil',guideSheet:'Scheda studio',download:'Scarica',share:'Condividi / invia',svg:'SVG stencil',ready:'PRONTO STUDIO',note:'Lo sfondo bianco viene rimosso automaticamente. Lo stencil è nero e adatto al trasferimento.',},
  pl:{title:'PRO TATTOO STUDIO',desc:'Wzór gotowy do studia: przezroczyste tło, stencil i linie pomocnicze.',style:'Styl',subject:'Co tworzymy?',placement:'Miejsce',format:'Format',guides:'Linie pomocnicze',center:'Oś środkowa',grid:'Siatka',mirror:'Oś lustrzana',generate:'Utwórz tatuaż',generating:'Generowanie…',result:'PODGLĄD',transparent:'PNG z przezroczystością',stencil:'PNG stencil',guideSheet:'Arkusz studia',download:'Pobierz',share:'Udostępnij / wyślij',svg:'SVG stencil',ready:'GOTOWE DO STUDIA',note:'Białe tło jest automatycznie usuwane. Stencil jest czarny i gotowy do transferu.',},
  uk:{title:'PRO TATTOO STUDIO',desc:'Тату-ескіз для салону з прозорим фоном, трафаретом і направляючими.',style:'Стиль',subject:'Що створити?',placement:'Розміщення',format:'Формат',guides:'Напрямні',center:'Центральна лінія',grid:'Сітка',mirror:'Вісь дзеркала',generate:'Створити тату',generating:'Генерація…',result:'ПЕРЕГЛЯД',transparent:'PNG з прозорістю',stencil:'PNG трафарет',guideSheet:'Аркуш студії',download:'Завантажити',share:'Поділитися / надіслати',svg:'SVG трафарет',ready:'ГОТОВО ДЛЯ СТУДІЇ',note:'Білий фон автоматично стає прозорим. Трафарет чорний і придатний для перенесення.',},
  ro:{title:'PRO TATTOO STUDIO',desc:'Design de tatuaj pregătit pentru salon, cu fundal transparent, stencil și ghidaje.',style:'Stil',subject:'Ce creăm?',placement:'Poziționare',format:'Format',guides:'Linii ghid',center:'Linie centrală',grid:'Grilă',mirror:'Axă oglindă',generate:'Creează tatuaj',generating:'Se generează…',result:'PREVIZUALIZARE',transparent:'PNG transparent',stencil:'PNG stencil',guideSheet:'Foaie salon',download:'Descarcă',share:'Distribuie / trimite',svg:'SVG stencil',ready:'GATA PENTRU SALON',note:'Fundalul alb este eliminat automat. Stencilul este negru și pregătit pentru transfer.',},
  nl:{title:'PRO TATTOO STUDIO',desc:'Salon-klaar tattoo-ontwerp met transparante achtergrond, stencil en hulplijnen.',style:'Stijl',subject:'Wat maken we?',placement:'Plaatsing',format:'Formaat',guides:'Hulplijnen',center:'Middenlijn',grid:'Raster',mirror:'Spiegelas',generate:'Tattoo maken',generating:'Genereren…',result:'VOORBEELD',transparent:'Transparante PNG',stencil:'Stencil PNG',guideSheet:'Salonblad',download:'Download',share:'Delen / verzenden',svg:'Stencil SVG',ready:'SALONKLAAR',note:'De witte achtergrond wordt automatisch transparant. De stencil is zwart en geschikt voor transfer.',},
};

function t(language:string,key:string){const l=(language in UI?language:'en') as Lang;return UI[l][key]||UI.en[key]||key;}
function dl(name:string,blob:Blob){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
async function urlToPng(url:string,transparent:boolean):Promise<Blob>{
  const response=await fetch(url); if(!response.ok) throw new Error('A generált kép letöltése sikertelen.');
  const blob=await response.blob(); const bitmap=await createImageBitmap(blob);
  const canvas=document.createElement('canvas'); canvas.width=bitmap.width; canvas.height=bitmap.height;
  const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('A képfeldolgozó nem indult.');
  ctx.drawImage(bitmap,0,0); bitmap.close();
  const data=ctx.getImageData(0,0,canvas.width,canvas.height); const px=data.data;
  for(let i=0;i<px.length;i+=4){
    const r=px[i],g=px[i+1],b=px[i+2];
    const max=Math.max(r,g,b), min=Math.min(r,g,b), lum=0.2126*r+0.7152*g+0.0722*b;
    if(transparent && max>236 && max-min<24){px[i+3]=0;}
    else if(transparent && max>215 && max-min<18){px[i+3]=Math.max(0,Math.round((236-max)*255/21));}
    if(!transparent){
      const darkness=Math.max(0,Math.min(255,255-lum)); const ink=darkness>45?255:0;
      px[i]=ink;px[i+1]=ink;px[i+2]=ink;px[i+3]=darkness>45?255:0;
    }
  }
  ctx.putImageData(data,0,0);
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG export hiba.')),'image/png'));
}
async function guideSheet(blob:Blob,opts:{grid:boolean;center:boolean;mirror:boolean}):Promise<Blob>{
  const bitmap=await createImageBitmap(blob); const w=bitmap.width,h=bitmap.height;
  const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('A segédvonal export nem indult.');
  ctx.clearRect(0,0,w,h); ctx.drawImage(bitmap,0,0); bitmap.close();
  ctx.save(); ctx.lineWidth=Math.max(1,Math.round(w/900)); ctx.setLineDash([8,8]);
  if(opts.grid){ for(let i=1;i<4;i++){const x=w*i/4,y=h*i/4;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}}
  if(opts.center){ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();}
  if(opts.mirror){ctx.beginPath();ctx.moveTo(w/2-2,0);ctx.lineTo(w/2-2,h);ctx.stroke();ctx.beginPath();ctx.moveTo(w/2+2,0);ctx.lineTo(w/2+2,h);ctx.stroke();}
  ctx.restore();
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Segédvonal export hiba.')),'image/png'));
}
export default function TattooStudio({language='hu'}:{language?:string}){
 const [style,setStyle]=useState<StyleKey>('blackwork');
 const [placement,setPlacement]=useState<PlacementKey>('forearm');
 const [format,setFormat]=useState<'vertical'|'square'|'horizontal'>('vertical');
 const [subject,setSubject]=useState('Készíts egy részletgazdag, professzionális tetoválásmintát fekete és szürke tintával, tiszta kontúrokkal.');
 const [grid,setGrid]=useState(true); const [center,setCenter]=useState(true); const [mirror,setMirror]=useState(false);
 const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [result,setResult]=useState<string|null>(null); const [transparent,setTransparent]=useState<Blob|null>(null); const [stencil,setStencil]=useState<Blob|null>(null); const [sheet,setSheet]=useState<Blob|null>(null);
 const styleName=STYLES.find(x=>x.id===style)?.[language==='hu'?'hu':'en']||style; const placementName=PLACEMENTS.find(x=>x.id===placement)?.[language==='hu'?'hu':'en']||placement;
 const ratio=format==='vertical'?'2:3':format==='horizontal'?'3:2':'1:1';
 async function generate(){
  if(!subject.trim()||busy)return; setBusy(true);setError('');setResult(null);setTransparent(null);setStencil(null);setSheet(null);
  try{
   const prompt=[
    'Professional tattoo flash / stencil master artwork.',
    'Create ONE centered tattoo design only, isolated on a clean pure white background for later alpha extraction.',
    'No text, no letters, no numbers, no logo, no watermark, no mockup, no body photo, no skin, no frame.',
    'Black and grey tattoo ink, crisp contour hierarchy, deliberate line weight, clean negative space, tattooable shapes, coherent anatomy and symmetry where appropriate.',
    'Style: '+styleName+'. Placement target: '+placementName+'. Composition: '+format+'.',
    'User concept: '+subject.trim(),
    'Design for a professional tattoo artist: clear outer silhouette, internal linework separated, avoid muddy micro-details, keep the design printable and traceable.'
   ].join(' ');
   const r=await generateCreativeImage(prompt,ratio); setResult(r.url);
   const alpha=await urlToPng(r.url,true); const st=await urlToPng(r.url,false); const sh=await guideSheet(alpha,{grid,center,mirror});
   setTransparent(alpha);setStencil(st);setSheet(sh);
  }catch(e){setError(e instanceof Error?e.message:'A tattoo generálása sikertelen.');}
  finally{setBusy(false);}
 }
 async function share(blob:Blob,name:string){
  try{const file=new File([blob],name,{type:'image/png'}); if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){await navigator.share({title:'Designly Tattoo',text:'Tetoválásminta – Designly',files:[file]});return;} dl(name,blob);
  }catch(e){if(e instanceof DOMException && e.name==='AbortError') return; dl(name,blob);}
 }
 return <section className='space-y-5'>
  <div className='rounded-2xl border border-accent/25 bg-accent/5 p-4'><div className='flex flex-wrap items-center justify-between gap-3'><div><div className='text-xs font-semibold text-ink-100'>{t(language,'title')}</div><p className='mt-1 text-xs text-ink-400'>{t(language,'desc')}</p></div><span className='rounded-full border border-emerald-500/30 px-3 py-1 text-[10px] text-emerald-300'>{t(language,'ready')}</span></div></div>
  <div className='grid gap-4 lg:grid-cols-2'>
   <div className='space-y-4 rounded-2xl border border-line bg-canvas/50 p-4'>
    <label className='text-xs text-ink-400'>{t(language,'subject')}<textarea rows={5} className='vp-input mt-1' value={subject} onChange={e=>setSubject(e.target.value)}/></label>
    <div><div className='mb-2 text-xs text-ink-400'>{t(language,'style')}</div><div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>{STYLES.map(s=><button key={s.id} type='button' onClick={()=>setStyle(s.id)} className={'rounded-xl border px-3 py-2 text-xs '+(style===s.id?'border-accent/70 bg-accent/15 text-accent':'border-line text-ink-300')}>{language==='hu'?s.hu:s.en}</button>)}</div></div>
    <div><div className='mb-2 text-xs text-ink-400'>{t(language,'placement')}</div><div className='flex flex-wrap gap-2'>{PLACEMENTS.map(p=><button key={p.id} type='button' onClick={()=>setPlacement(p.id)} className={'rounded-full border px-3 py-1.5 text-xs '+(placement===p.id?'border-accent/70 bg-accent/15 text-accent':'border-line text-ink-300')}>{language==='hu'?p.hu:p.en}</button>)}</div></div>
    <div><div className='mb-2 text-xs text-ink-400'>{t(language,'format')}</div><div className='flex flex-wrap gap-2'>{[['vertical','2:3'],['square','1:1'],['horizontal','3:2']].map(([id,label])=><button key={id} type='button' onClick={()=>setFormat(id as typeof format)} className={'rounded-full border px-3 py-1.5 text-xs '+(format===id?'border-accent/70 bg-accent/15 text-accent':'border-line text-ink-300')}>{label}</button>)}</div></div>
    <div><div className='mb-2 text-xs text-ink-400'>{t(language,'guides')}</div><div className='flex flex-wrap gap-2'>{([{on:grid,k:'grid'},{on:center,k:'center'},{on:mirror,k:'mirror'}] as const).map(({on,k})=><button key={k} type='button' onClick={()=>k==='grid'?setGrid(!grid):k==='center'?setCenter(!center):setMirror(!mirror)} className={'rounded-full border px-3 py-1.5 text-xs '+(on?'border-accent/70 bg-accent/15 text-accent':'border-line text-ink-300')}>{t(language,k as string)}</button>)}</div></div>
    <button type='button' onClick={generate} disabled={busy||!subject.trim()} className='vp-btn w-full'>{busy?<Sparkles className='h-4 w-4 animate-pulse'/>:<PenTool className='h-4 w-4'/>}{busy?t(language,'generating'):t(language,'generate')}</button>
    {error&&<p className='rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300'>{error}</p>}
   </div>
   <div className='rounded-2xl border border-line bg-black p-4'>
    <div className='mb-3 flex items-center justify-between text-xs text-ink-400'><span>{t(language,'result')}</span><span>{result?'AI → alpha → stencil':'—'}</span></div>
    <div className='relative flex min-h-[520px] items-center justify-center overflow-hidden rounded-2xl border border-line' style={{backgroundImage:'linear-gradient(45deg,#171717 25%,transparent 25%),linear-gradient(-45deg,#171717 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#171717 75%),linear-gradient(-45deg,transparent 75%,#171717 75%)',backgroundSize:'28px 28px',backgroundPosition:'0 0,0 14px,14px -14px,-14px 0'}}>
     {result?<img src={result} alt='Tattoo AI preview' className='max-h-[620px] max-w-full object-contain'/>:<div className='text-center text-sm text-ink-500'><PenTool className='mx-auto mb-2 h-8 w-8'/></div>}
     {result&&<div className='pointer-events-none absolute inset-0'><div className='absolute inset-4 border border-accent/30'/>{center&&<div className='absolute bottom-4 left-1/2 top-4 w-px bg-accent/30'/>}{mirror&&<><div className='absolute bottom-4 left-[calc(50%-6px)] top-4 w-px border-l border-dashed border-cyan-300/40'/><div className='absolute bottom-4 left-[calc(50%+6px)] top-4 w-px border-l border-dashed border-cyan-300/40'/></>}{grid&&<div className='absolute inset-4' style={{backgroundImage:'linear-gradient(to right, transparent 24.9%, rgba(201,164,92,.18) 25%, transparent 25.1%, transparent 49.9%, rgba(201,164,92,.18) 50%, transparent 50.1%, transparent 74.9%, rgba(201,164,92,.18) 75%, transparent 75.1%),linear-gradient(to bottom, transparent 24.9%, rgba(201,164,92,.18) 25%, transparent 25.1%, transparent 49.9%, rgba(201,164,92,.18) 50%, transparent 50.1%, transparent 74.9%, rgba(201,164,92,.18) 75%, transparent 75.1%)'}}/>}</div>}
    </div>
    {transparent&&stencil&&<div className='mt-4 grid gap-2 sm:grid-cols-2'><button type='button' className='vp-btn' onClick={()=>dl('designly-tattoo-transparent.png',transparent)}><Download className='h-4 w-4'/>{t(language,'transparent')}</button><button type='button' className='vp-btn' onClick={()=>dl('designly-tattoo-stencil.png',stencil)}><Download className='h-4 w-4'/>{t(language,'stencil')}</button><button type='button' className='vp-btn-ghost' onClick={()=>sheet&&dl('designly-tattoo-salon-sheet.png',sheet)}><Grid3X3 className='h-4 w-4'/>{t(language,'guideSheet')}</button><button type='button' className='vp-btn-ghost' onClick={()=>share(stencil,'designly-tattoo-stencil.png')}><Share2 className='h-4 w-4'/>{t(language,'share')}</button></div>}
    {transparent&&<p className='mt-3 text-[10px] text-ink-500'>{t(language,'note')}</p>}
   </div>
  </div>
 </section>;
}
