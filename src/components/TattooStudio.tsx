import { useState } from 'react';
import { Download, Grid3X3, PenTool, Share2, Sparkles } from 'lucide-react';
import { generateCreativeImage } from '../lib/creative-api';

type Lang = 'hu'|'en'|'de'|'fr'|'es'|'it'|'pl'|'uk'|'ro'|'nl';

const UI: Record<Lang, Record<string,string>> = {
  hu: { title:'PRO TATTOO STUDIO', desc:'Izolált, szalonra előkészített tattoo stencil. Csak a minta marad: nincs bőr, plakát, fotó vagy háttér.', concept:'Tattoo koncepció', output:'Kimenet', portrait:'Álló 2:3', square:'Négyzet 1:1', landscape:'Fekvő 3:2', ink:'Tinta / vonal erősség', fine:'Finom', standard:'Standard', bold:'Erős', guides:'Segédvonalak', center:'Középvonal', grid:'Rács', mirror:'Tükörtengely', generate:'Stencil minta készítése', generating:'Stencil készül…', preview:'SZALONKÉSZ ELŐNÉZET', transparent:'Átlátszó PNG', stencil:'Stencil PNG', sheet:'Szalon munkalap', share:'Küldés / megosztás', note:'A megjelenített és letöltött minta izolált tattoo-artwork. A szalon munkalap segédvonalakat tartalmaz.', error:'A tattoo stencil generálása sikertelen.' },
  en: { title:'PRO TATTOO STUDIO', desc:'Isolated, salon-ready tattoo stencil. Only the motif remains: no skin, poster, photo or background.', concept:'Tattoo concept', output:'Output', portrait:'Portrait 2:3', square:'Square 1:1', landscape:'Landscape 3:2', ink:'Ink / line strength', fine:'Fine', standard:'Standard', bold:'Bold', guides:'Guide lines', center:'Center line', grid:'Grid', mirror:'Mirror axis', generate:'Create stencil design', generating:'Creating stencil…', preview:'SALON-READY PREVIEW', transparent:'Transparent PNG', stencil:'Stencil PNG', sheet:'Salon guide sheet', share:'Share / send', note:'The displayed and downloaded artwork is isolated tattoo art. The salon sheet adds alignment guides.', error:'Tattoo stencil generation failed.' },
  de: { title:'PRO TATTOO STUDIO', desc:'Isoliertes, salonfertiges Tattoo-Stencil. Nur das Motiv bleibt – ohne Haut, Poster, Foto oder Hintergrund.', concept:'Tattoo-Konzept', output:'Ausgabe', portrait:'Hochformat 2:3', square:'Quadrat 1:1', landscape:'Querformat 3:2', ink:'Tinte / Linienstärke', fine:'Fein', standard:'Standard', bold:'Stark', guides:'Hilfslinien', center:'Mittellinie', grid:'Raster', mirror:'Spiegelachse', generate:'Stencil erstellen', generating:'Stencil wird erstellt…', preview:'SALONFERTIGE VORSCHAU', transparent:'Transparente PNG', stencil:'Stencil PNG', sheet:'Salon-Arbeitsblatt', share:'Teilen / senden', note:'Das angezeigte und heruntergeladene Motiv ist isolierte Tattoo-Kunst. Das Arbeitsblatt enthält Ausrichtungshilfen.', error:'Tattoo-Stencil konnte nicht erstellt werden.' },
  fr: { title:'PRO TATTOO STUDIO', desc:'Stencil tattoo isolé, prêt pour le salon. Seul le motif reste : sans peau, affiche, photo ni décor.', concept:'Concept tattoo', output:'Sortie', portrait:'Portrait 2:3', square:'Carré 1:1', landscape:'Paysage 3:2', ink:'Encre / force des lignes', fine:'Fin', standard:'Standard', bold:'Fort', guides:'Lignes guides', center:'Axe central', grid:'Grille', mirror:'Axe miroir', generate:'Créer le stencil', generating:'Création du stencil…', preview:'APERÇU PRÊT SALON', transparent:'PNG transparent', stencil:'PNG stencil', sheet:'Feuille salon', share:'Partager / envoyer', note:'Le motif affiché et téléchargé est isolé. La feuille salon ajoute les repères.', error:'Échec de génération du stencil tattoo.' },
  es: { title:'PRO TATTOO STUDIO', desc:'Stencil de tatuaje aislado y listo para estudio. Solo queda el motivo: sin piel, póster, foto ni fondo.', concept:'Concepto del tatuaje', output:'Salida', portrait:'Vertical 2:3', square:'Cuadrado 1:1', landscape:'Horizontal 3:2', ink:'Tinta / fuerza de línea', fine:'Fina', standard:'Estándar', bold:'Fuerte', guides:'Guías', center:'Línea central', grid:'Cuadrícula', mirror:'Eje espejo', generate:'Crear stencil', generating:'Creando stencil…', preview:'VISTA LISTA PARA ESTUDIO', transparent:'PNG transparente', stencil:'PNG stencil', sheet:'Hoja de estudio', share:'Compartir / enviar', note:'El arte mostrado y descargado es un motivo aislado. La hoja añade guías de alineación.', error:'No se pudo generar el stencil.' },
  it: { title:'PRO TATTOO STUDIO', desc:'Stencil tattoo isolato e pronto per lo studio. Rimane solo il motivo: niente pelle, poster, foto o sfondo.', concept:'Concept tattoo', output:'Output', portrait:'Verticale 2:3', square:'Quadrato 1:1', landscape:'Orizzontale 3:2', ink:'Inchiostro / forza linea', fine:'Fine', standard:'Standard', bold:'Forte', guides:'Guide', center:'Linea centrale', grid:'Griglia', mirror:'Asse specchio', generate:'Crea stencil', generating:'Creazione stencil…', preview:'ANTEPRIMA PRONTA STUDIO', transparent:'PNG trasparente', stencil:'PNG stencil', sheet:'Scheda studio', share:'Condividi / invia', note:'Il motivo visualizzato e scaricato è isolato. La scheda aggiunge guide di allineamento.', error:'Generazione stencil non riuscita.' },
  pl: { title:'PRO TATTOO STUDIO', desc:'Izolowany stencil tatuażu gotowy do studia. Zostaje tylko wzór: bez skóry, plakatu, zdjęcia i tła.', concept:'Koncepcja tatuażu', output:'Wyjście', portrait:'Pion 2:3', square:'Kwadrat 1:1', landscape:'Poziom 3:2', ink:'Tusz / grubość linii', fine:'Delikatny', standard:'Standard', bold:'Mocny', guides:'Linie pomocnicze', center:'Oś środkowa', grid:'Siatka', mirror:'Oś lustra', generate:'Utwórz stencil', generating:'Tworzenie stencila…', preview:'PODGLĄD GOTOWY DO STUDIA', transparent:'PNG z przezroczystością', stencil:'PNG stencil', sheet:'Arkusz studia', share:'Udostępnij / wyślij', note:'Wyświetlany i pobierany wzór jest izolowaną grafiką tatuażu. Arkusz dodaje linie wyrównania.', error:'Nie udało się utworzyć stencila.' },
  uk: { title:'PRO TATTOO STUDIO', desc:'Ізольований трафарет тату, готовий для студії. Залишається лише мотив: без шкіри, постера, фото чи фону.', concept:'Концепція тату', output:'Вихід', portrait:'Вертикаль 2:3', square:'Квадрат 1:1', landscape:'Горизонталь 3:2', ink:'Чорнило / сила лінії', fine:'Тонка', standard:'Стандарт', bold:'Сильна', guides:'Напрямні', center:'Центральна лінія', grid:'Сітка', mirror:'Дзеркальна вісь', generate:'Створити трафарет', generating:'Створення трафарету…', preview:'ПЕРЕГЛЯД ГОТОВИЙ ДЛЯ СТУДІЇ', transparent:'PNG з прозорістю', stencil:'PNG трафарет', sheet:'Аркуш студії', share:'Поділитися / надіслати', note:'Відображений і завантажений мотив ізольований. Аркуш додає напрямні.', error:'Не вдалося створити трафарет.' },
  ro: { title:'PRO TATTOO STUDIO', desc:'Stencil tattoo izolat și pregătit pentru salon. Rămâne doar motivul: fără piele, poster, fotografie sau fundal.', concept:'Concept tatuaj', output:'Ieșire', portrait:'Portret 2:3', square:'Pătrat 1:1', landscape:'Peisaj 3:2', ink:'Cerneală / intensitatea liniei', fine:'Fin', standard:'Standard', bold:'Puternic', guides:'Linii ghid', center:'Linie centrală', grid:'Grilă', mirror:'Axă oglindă', generate:'Creează stencil', generating:'Se creează stencilul…', preview:'PREVIZUALIZARE GATA DE SALON', transparent:'PNG transparent', stencil:'PNG stencil', sheet:'Foaie salon', share:'Distribuie / trimite', note:'Motivul afișat și descărcat este izolat. Foaia de salon adaugă ghidaje.', error:'Generarea stencilului a eșuat.' },
  nl: { title:'PRO TATTOO STUDIO', desc:'Geïsoleerde, salonklare tattoo-stencil. Alleen het motief blijft: geen huid, poster, foto of achtergrond.', concept:'Tattoo-concept', output:'Uitvoer', portrait:'Portret 2:3', square:'Vierkant 1:1', landscape:'Landschap 3:2', ink:'Inkt / lijnsterkte', fine:'Fijn', standard:'Standaard', bold:'Sterk', guides:'Hulplijnen', center:'Middenlijn', grid:'Raster', mirror:'Spiegelas', generate:'Stencil maken', generating:'Stencil wordt gemaakt…', preview:'SALONKLARE VOORBEELDWEERGAVE', transparent:'Transparante PNG', stencil:'Stencil PNG', sheet:'Salonwerkblad', share:'Delen / verzenden', note:'De getoonde en gedownloade afbeelding is geïsoleerde tattoo-art. Het salonblad voegt uitlijnhulpen toe.', error:'Stencilgeneratie mislukt.' },
};

function t(language:string,key:string){ const lang=(language in UI ? language : 'en') as Lang; return UI[lang][key] || UI.en[key] || key; }
function downloadBlob(name:string,blob:Blob){ const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1500); }

async function isolateInkPng(url:string,transparent:boolean,threshold:number):Promise<Blob>{
  const response=await fetch(url);
  if(!response.ok) throw new Error('A stencil forrása nem tölthető be.');
  const blob=await response.blob();
  const bitmap=await createImageBitmap(blob);

  const src=document.createElement('canvas');
  src.width=bitmap.width; src.height=bitmap.height;
  const srcCtx=src.getContext('2d');
  if(!srcCtx) throw new Error('A képfeldolgozó nem indult.');
  srcCtx.drawImage(bitmap,0,0); bitmap.close();

  const w=src.width,h=src.height;
  const data=srcCtx.getImageData(0,0,w,h).data;
  const mask=new Uint8Array(w*h);

  // Only near-black neutral pixels are considered tattoo ink.
  // The central ellipse rejects most skin/shadow/background pixels from a mockup.
  const minX=Math.floor(w*0.08),maxX=Math.ceil(w*0.92);
  const minY=Math.floor(h*0.04),maxY=Math.ceil(h*0.96);
  const cx=w/2,cy=h/2;
  const rx=w*0.39,ry=h*0.48;

  for(let y=minY;y<maxY;y++) for(let x=minX;x<maxX;x++){
    const dx=(x-cx)/rx,dy=(y-cy)/ry;
    if(dx*dx+dy*dy>1) continue;
    const i=(y*w+x)*4;
    const r=data[i],g=data[i+1],b=data[i+2];
    const lum=0.2126*r+0.7152*g+0.0722*b;
    const chroma=Math.max(r,g,b)-Math.min(r,g,b);
    if(lum<threshold && chroma<38) mask[y*w+x]=1;
  }

  const seen=new Uint8Array(w*h);
  const kept=new Uint8Array(w*h);
  const qx=new Int32Array(w*h);
  const qy=new Int32Array(w*h);
  const neighbors=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];

  const minComponent=Math.max(18,Math.floor(w*h*0.000004));
  const maxComponent=Math.floor(w*h*0.055);
  const components:Array<{indices:number[];minX:number;minY:number;maxX:number;maxY:number;score:number}>=[];
  let allCount=0;

  for(let sy=minY;sy<maxY;sy++) for(let sx=minX;sx<maxX;sx++){
    const si=sy*w+sx;
    if(!mask[si]||seen[si]) continue;
    let head=0,tail=0;
    const indices:number[]=[];
    let cminX=w,cminY=h,cmaxX=0,cmaxY=0;
    qx[tail]=sx;qy[tail]=sy;tail++;seen[si]=1;

    while(head<tail){
      const x=qx[head],y=qy[head];head++;
      const idx=y*w+x;indices.push(idx);
      if(x<cminX)cminX=x;if(x>cmaxX)cmaxX=x;if(y<cminY)cminY=y;if(y>cmaxY)cmaxY=y;
      for(const [dx,dy] of neighbors){
        const nx=x+dx,ny=y+dy;
        if(nx<minX||nx>=maxX||ny<minY||ny>=maxY) continue;
        const ni=ny*w+nx;
        if(mask[ni]&&!seen[ni]){seen[ni]=1;qx[tail]=nx;qy[tail]=ny;tail++;}
      }
    }

    const size=indices.length;
    if(size<minComponent||size>maxComponent) continue;
    const bw=cmaxX-cminX+1,bh=cmaxY-cminY+1;
    const ccx=(cminX+cmaxX)/2,ccy=(cminY+cmaxY)/2;
    const distance=Math.sqrt(((ccx-cx)/(w*.42))**2+((ccy-cy)/(h*.52))**2);
    if(distance>1) continue;
    const compact=Math.min(1,(size/(bw*bh))*40);
    const score=size*(1.15-distance*.75+compact*.25);
    components.push({indices,minX:cminX,minY:cminY,maxX:cmaxX,maxY:cmaxY,score});
  }

  components.sort((a,b)=>b.score-a.score);
  // A tattoo motif can have separate wings, knots, eyes etc.; keep the strongest nearby ink components.
  const selected=components.slice(0,14);
  let minBX=w,minBY=h,maxBX=0,maxBY=0;
  for(const c of selected){
    for(const idx of c.indices) kept[idx]=1;
    allCount+=c.indices.length;
    if(c.minX<minBX)minBX=c.minX;if(c.minY<minBY)minBY=c.minY;
    if(c.maxX>maxBX)maxBX=c.maxX;if(c.maxY>maxBY)maxBY=c.maxY;
  }

  if(!allCount) throw new Error('Nem sikerült tisztán kiválasztani a tattoo motívumot. Használj fekete vonalmunka briefet.');

  // Tight crop around the isolated ink only. Outside pixels are true alpha=0 for transparent output.
  const pad=Math.max(12,Math.round(Math.min(w,h)*0.025));
  const bx0=Math.max(0,minBX-pad),by0=Math.max(0,minBY-pad);
  const bx1=Math.min(w,maxBX+pad+1),by1=Math.min(h,maxBY+pad+1);
  const outW=bx1-bx0,outH=by1-by0;

  const canvas=document.createElement('canvas');canvas.width=outW;canvas.height=outH;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('A stencil kimenet nem indult.');
  const out=ctx.createImageData(outW,outH);

  for(let y=0;y<outH;y++) for(let x=0;x<outW;x++){
    const si=(by0+y)*w+(bx0+x),di=(y*outW+x)*4,ink=kept[si]===1;
    const v=ink?0:255;
    out.data[di]=v;out.data[di+1]=v;out.data[di+2]=v;out.data[di+3]=transparent?(ink?255:0):255;
  }
  ctx.putImageData(out,0,0);

  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(
    b=>b?resolve(b):reject(new Error('Stencil PNG export hiba.')),'image/png'
  ));
}
async function guideSheet(blob:Blob,opts:{grid:boolean;center:boolean;mirror:boolean}):Promise<Blob>{
  const bitmap=await createImageBitmap(blob); const w=bitmap.width,h=bitmap.height;
  const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
  const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('A munkalap export nem indult.');
  ctx.clearRect(0,0,w,h); ctx.drawImage(bitmap,0,0); bitmap.close();
  ctx.save(); ctx.strokeStyle='rgba(201,164,92,.45)'; ctx.lineWidth=Math.max(1,Math.round(w/1000)); ctx.setLineDash([8,8]);
  if(opts.grid){ for(let i=1;i<4;i++){const x=w*i/4,y=h*i/4;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();} }
  if(opts.center){ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();}
  if(opts.mirror){ctx.beginPath();ctx.moveTo(w/2-3,0);ctx.lineTo(w/2-3,h);ctx.stroke();ctx.beginPath();ctx.moveTo(w/2+3,0);ctx.lineTo(w/2+3,h);ctx.stroke();}
  ctx.restore();
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Munkalap export hiba.')),'image/png'));
}

export default function TattooStudio({language='hu'}:{language?:string}){
  const [format,setFormat]=useState<'vertical'|'square'|'horizontal'>('vertical');
  const [inkLevel,setInkLevel]=useState(145);
  const [concept,setConcept]=useState('Kelta fonatos koszorú, benne nagy D betű jobbról balra, Odin hollói, csak fekete tus vonalmunka, önálló tattoo stencil, tiszta negatív tér, szalonba nyomtatható minta.');
  const [grid,setGrid]=useState(true); const [center,setCenter]=useState(true); const [mirror,setMirror]=useState(false);
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const [previewUrl,setPreviewUrl]=useState<string|null>(null);
  const [transparent,setTransparent]=useState<Blob|null>(null); const [stencil,setStencil]=useState<Blob|null>(null); const [sheet,setSheet]=useState<Blob|null>(null);

  const ratio=format==='vertical'?'2:3':format==='horizontal'?'3:2':'1:1';

  async function generate(){
    if(!concept.trim()||busy)return;
    setBusy(true); setError(''); setPreviewUrl(null); setTransparent(null); setStencil(null); setSheet(null);
    try{
      const prompt=[
        'PURE 2D TATTOO STENCIL SHEET — artwork only.',
        'Create exactly ONE standalone tattoo motif centered on a plain white background.',
        'This is NOT a photo and MUST NOT be shown on skin or on any body part.',
        'NO arm, leg, hand, shoulder, chest, torso, face, head, person, mannequin, skin or body.',
        'NO poster, no paper mockup, no frame, no room, no scenery, no branch, no props, no environment.',
        'NO 3D, NO photorealism, NO perspective, NO cinematic lighting, NO shadows, NO gradients, NO glossy rendering.',
        'Flat black ink linework with crisp contour hierarchy, controlled solid black areas, clean white negative space, connected tattooable shapes, traceable contours.',
        'The image must look like a professional tattoo transfer stencil printed on plain white, with the tattoo motif itself only.',
        'No text, captions, typography, logos or watermark unless an explicitly requested monogram is an integral part of the tattoo motif.',
        'Concept: '+concept.trim(),
      ].join(' ');
      const generated=await generateCreativeImage(prompt,ratio);
      const alpha=await isolateInkPng(generated.url,true,inkLevel);
      const st=await isolateInkPng(generated.url,false,inkLevel);
      const sh=await guideSheet(alpha,{grid,center,mirror});
      setTransparent(alpha); setStencil(st); setSheet(sh); setPreviewUrl(URL.createObjectURL(alpha));
    }catch(e){ setError(e instanceof Error?e.message:t(language,'error')); }
    finally{ setBusy(false); }
  }

  async function share(blob:Blob,name:string){
    try{
      const file=new File([blob],name,{type:'image/png'});
      if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
        await navigator.share({title:'Designly Tattoo Stencil',text:'Szalonra kész tetoválás stencil',files:[file]});
        return;
      }
      downloadBlob(name,blob);
    }catch(e){
      if(e instanceof DOMException && e.name==='AbortError') return;
      downloadBlob(name,blob);
    }
  }

  return <section className='space-y-5'>
    <div className='rounded-2xl border border-accent/25 bg-accent/5 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div><div className='text-xs font-semibold text-ink-100'>{t(language,'title')}</div><p className='mt-1 text-xs text-ink-400'>{t(language,'desc')}</p></div>
        <span className='rounded-full border border-emerald-500/30 px-3 py-1 text-[10px] text-emerald-300'>STENCIL MASTER</span>
      </div>
    </div>
    <div className='grid gap-4 lg:grid-cols-2'>
      <div className='space-y-4 rounded-2xl border border-line bg-canvas/50 p-4'>
        <label className='block text-xs text-ink-400'>{t(language,'concept')}
          <textarea rows={7} className='vp-input mt-1' value={concept} onChange={e=>setConcept(e.target.value)} placeholder='Pl. kelta fonat, holló, farkas, geometrikus szimbólum — csak a tattoo motívum.' />
        </label>
        <div className='grid gap-3 sm:grid-cols-2'>
          <label className='text-xs text-ink-400'>{t(language,'output')}
            <select className='vp-input mt-1' value={format} onChange={e=>setFormat(e.target.value as typeof format)}>
              <option value='vertical'>{t(language,'portrait')}</option><option value='square'>{t(language,'square')}</option><option value='horizontal'>{t(language,'landscape')}</option>
            </select>
          </label>
          <label className='text-xs text-ink-400'>{t(language,'ink')}
            <select className='vp-input mt-1' value={inkLevel} onChange={e=>setInkLevel(Number(e.target.value))}>
              <option value='110'>{t(language,'fine')}</option><option value='145'>{t(language,'standard')}</option><option value='175'>{t(language,'bold')}</option>
            </select>
          </label>
        </div>
        <div><div className='mb-2 text-xs text-ink-400'>{t(language,'guides')}</div><div className='flex flex-wrap gap-2'>
          <button type='button' onClick={()=>setGrid(v=>!v)} className={'rounded-full border px-3 py-1.5 text-xs '+(grid?'border-accent/70 bg-accent/15 text-accent':'border-line text-ink-300')}>{t(language,'grid')}</button>
          <button type='button' onClick={()=>setCenter(v=>!v)} className={'rounded-full border px-3 py-1.5 text-xs '+(center?'border-accent/70 bg-accent/15 text-accent':'border-line text-ink-300')}>{t(language,'center')}</button>
          <button type='button' onClick={()=>setMirror(v=>!v)} className={'rounded-full border px-3 py-1.5 text-xs '+(mirror?'border-accent/70 bg-accent/15 text-accent':'border-line text-ink-300')}>{t(language,'mirror')}</button>
        </div></div>
        <button type='button' onClick={generate} disabled={busy||!concept.trim()} className='vp-btn w-full'>
          {busy?<Sparkles className='h-4 w-4 animate-pulse'/>:<PenTool className='h-4 w-4'/>}
          {busy?t(language,'generating'):t(language,'generate')}
        </button>
        {error&&<p className='rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300'>{error}</p>}
      </div>
      <div className='rounded-2xl border border-line bg-black p-4'>
        <div className='mb-3 flex items-center justify-between text-xs text-ink-400'><span>{t(language,'preview')}</span><span>{previewUrl?'ISOLATED · STENCIL':'—'}</span></div>
        <div className='relative flex min-h-[520px] items-center justify-center overflow-hidden rounded-2xl border border-line' style={{backgroundImage:'linear-gradient(45deg,#171717 25%,transparent 25%),linear-gradient(-45deg,#171717 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#171717 75%),linear-gradient(-45deg,transparent 75%,#171717 75%)',backgroundSize:'28px 28px',backgroundPosition:'0 0,0 14px,14px -14px,-14px 0'}}>
          {previewUrl?<img src={previewUrl} alt='Isolated tattoo stencil' className='max-h-[620px] max-w-full object-contain'/>:<div className='text-center text-sm text-ink-500'><PenTool className='mx-auto mb-2 h-8 w-8'/></div>}
          {previewUrl && (
            <div className='pointer-events-none absolute inset-0'>
              <div className='absolute inset-4 border border-accent/30' />
              {center && <div className='absolute bottom-4 left-1/2 top-4 w-px bg-accent/30' />}
              {mirror && (
                <>
                  <div className='absolute bottom-4 left-[calc(50%-6px)] top-4 border-l border-dashed border-cyan-300/40' />
                  <div className='absolute bottom-4 left-[calc(50%+6px)] top-4 border-l border-dashed border-cyan-300/40' />
                </>
              )}
              {grid && (
                <div
                  className='absolute inset-4'
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, transparent 24.9%, rgba(201,164,92,.18) 25%, transparent 25.1%, transparent 49.9%, rgba(201,164,92,.18) 50%, transparent 50.1%, transparent 74.9%, rgba(201,164,92,.18) 75%, transparent 75.1%)',
                  }}
                />
              )}
            </div>
          )}
        </div>
        {transparent&&stencil&&<div className='mt-4 grid gap-2 sm:grid-cols-2'>
          <button type='button' className='vp-btn' onClick={()=>downloadBlob('designly-tattoo-transparent.png',transparent)}><Download className='h-4 w-4'/>{t(language,'transparent')}</button>
          <button type='button' className='vp-btn' onClick={()=>downloadBlob('designly-tattoo-stencil.png',stencil)}><Download className='h-4 w-4'/>{t(language,'stencil')}</button>
          <button type='button' className='vp-btn-ghost' onClick={()=>sheet&&downloadBlob('designly-tattoo-salon-sheet.png',sheet)}><Grid3X3 className='h-4 w-4'/>{t(language,'sheet')}</button>
          <button type='button' className='vp-btn-ghost' onClick={()=>share(stencil,'designly-tattoo-stencil.png')}><Share2 className='h-4 w-4'/>{t(language,'share')}</button>
        </div>}
        <p className='mt-3 text-[10px] text-ink-500'>{t(language,'note')}</p>
      </div>
    </div>
  </section>;
}
