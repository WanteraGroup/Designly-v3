import { useMemo, useState } from 'react';
import { localizedCncExample, studioT } from '../lib/studio-i18n';
import { AlertTriangle, Download, Play, ShieldCheck } from 'lucide-react';

type Controller='GRBL'|'LinuxCNC'|'Mach3'|'Fanuc'|'Haas'|'Siemens';
type Operation={kind:'rectangle'|'pocket'|'circle'|'drill'; width:number;height:number;depth:number;diameter:number;cx:number;cy:number;label:string;};

function num(text:string,fallback:number){const m=text.replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):fallback;}
function parsePrompt(prompt:string,defaults:{width:number;height:number;depth:number;diameter:number}){
  const p=prompt.toLowerCase();
  const dims=prompt.match(/(\d+(?:[.,]\d+)?)\s*(?:x|×|\*)\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i);
  const width=dims?Number(dims[1].replace(',','.')):defaults.width;
  const height=dims?Number(dims[2].replace(',','.')):defaults.height;
  const depthMatch=p.match(/(?:mély(?:en|ség)?|depth|z\s*=?)\s*(-?\d+(?:[.,]\d+)?)/i);
  const depth=depthMatch?Math.abs(Number(depthMatch[1].replace(',','.'))):defaults.depth;
  const diameterMatch=p.match(/(?:átmér(?:ő|oje)|diam(?:eter)?|Ø)\s*(\d+(?:[.,]\d+)?)/i);
  const diameter=diameterMatch?Number(diameterMatch[1].replace(',','.')):defaults.diameter;
  let kind:'rectangle'|'pocket'|'circle'|'drill'='rectangle';
  if(/zseb|pocket|üreg|süllyeszt|marj.*terület/i.test(p)) kind='pocket';
  if(/furat|fúrj|drill|lyuk/i.test(p)) kind='drill';
  if(/kör|körlap|circle/i.test(p)) kind='circle';
  return {kind,width,height,depth,diameter,cx:width/2,cy:height/2};
}

function generateGcode(op:Operation, feed:number, plunge:number, spindle:number, controller:Controller, tool:number, safeZ:number){
  const d=Math.max(0.2,Math.abs(op.depth));
  const step=Math.max(0.2,d/2);
  const out=['%','( DESIGNLY PROMPT CAM )','( OPERATION: '+op.label+' )','( CONTROLLER: '+controller+' )','G21 G90 G17 G94','G0 Z'+safeZ.toFixed(3),'M3 S'+Math.round(spindle)];
  for(let z=-step;z>=-d-1e-6;z-=step){
    const zz=Math.max(z,-d).toFixed(3);
    out.push('(DEPTH '+zz+' MM)');
    if(op.kind==='drill'){
      out.push('G0 X'+op.cx.toFixed(3)+' Y'+op.cy.toFixed(3),'G1 Z'+zz+' F'+Math.round(plunge),'G0 Z'+safeZ.toFixed(3));
    } else if(op.kind==='circle'){
      const r=Math.max(op.diameter/2-tool/2,0.5);
      out.push('G0 X'+(op.cx+r).toFixed(3)+' Y'+op.cy.toFixed(3),'G1 Z'+zz+' F'+Math.round(plunge),'G2 X'+(op.cx-r).toFixed(3)+' Y'+op.cy.toFixed(3)+' I'+(-r).toFixed(3)+' J0 F'+Math.round(feed),'G2 X'+(op.cx+r).toFixed(3)+' Y'+op.cy.toFixed(3)+' I'+r.toFixed(3)+' J0 F'+Math.round(feed),'G0 Z'+safeZ.toFixed(3));
    } else if(op.kind==='pocket'){
      const inset=Math.max(tool/2+0.5,1);
      const x0=inset,y0=inset,x1=Math.max(x0+1,op.width-inset),y1=Math.max(y0+1,op.height-inset);
      for(let y=y0;y<=y1+1e-6;y+=Math.max(tool*0.8,1)) out.push('G0 X'+x0.toFixed(3)+' Y'+Math.min(y,y1).toFixed(3),'G1 Z'+zz+' F'+Math.round(plunge),'G1 X'+x1.toFixed(3)+' F'+Math.round(feed));
      out.push('G0 Z'+safeZ.toFixed(3));
    } else {
      out.push('G0 X0 Y0','G1 Z'+zz+' F'+Math.round(plunge),'G1 X'+op.width.toFixed(3)+' Y0 F'+Math.round(feed),'G1 X'+op.width.toFixed(3)+' Y'+op.height.toFixed(3),'G1 X0 Y'+op.height.toFixed(3),'G1 X0 Y0','G0 Z'+safeZ.toFixed(3));
    }
    if(z<=-d) break;
  }
  out.push('M5','G0 Z'+safeZ.toFixed(3),'M30','%');
  return out.join('\n');
}

export default function CncPromptStudio(){
  const [prompt,setPrompt]=useState(() => localizedCncExample(language));
  const [parsed,setParsed]=useState<ReturnType<typeof parsePrompt>|null>(null);
  const [controller,setController]=useState<Controller>('GRBL');
  const [tool,setTool]=useState(6);
  const [feed,setFeed]=useState(700);
  const [plunge,setPlunge]=useState(250);
  const [spindle,setSpindle]=useState(12000);
  const [safeZ,setSafeZ]=useState(5);
  const [confirmed,setConfirmed]=useState(false);

  const op=useMemo<Operation|null>(()=>parsed?{...parsed,label:prompt.slice(0,100)}:null,[parsed,prompt]);
  const gcode=op?generateGcode(op,feed,plunge,spindle,controller,tool,safeZ):'';

  function build(){setParsed(parsePrompt(prompt,{width:80,height:50,depth:4,diameter:20}));setConfirmed(false);}

  return <section className='space-y-4'>
    <div className='rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4'>
      <div className='flex items-start gap-3'><AlertTriangle className='mt-0.5 h-5 w-5 text-amber-300'/><div><div className='text-xs font-semibold text-ink-100'>{studioT(language,'cncTitle')}</div><p className='mt-1 text-xs text-ink-400'>{studioT(language,'cncDesc')}</p></div></div>
    </div>
    <textarea rows={4} className='vp-input' value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder='Pl. Készíts 120x80 mm-es zsebet 3 mm mélyen, 6 mm-es szerszámmal.'/>
    <div className='grid gap-3 sm:grid-cols-3'>
      <label className='text-xs text-ink-400'>{studioT(language,'controller')}<select className='vp-input mt-1' value={controller} onChange={e=>setController(e.target.value as Controller)}>{['GRBL','LinuxCNC','Mach3','Fanuc','Haas','Siemens'].map(v=><option key={v}>{v}</option>)}</select></label>
      <label className='text-xs text-ink-400'>{studioT(language,'tool')}<select className='vp-input mt-1' value={tool} onChange={e=>setTool(Number(e.target.value))}>{[3,4,6,8,10,12].map(v=><option key={v} value={v}>{v} mm</option>)}</select></label>
      <label className='text-xs text-ink-400'>{studioT(language,'safeZ')}<input className='vp-input mt-1' type='number' min='1' value={safeZ} onChange={e=>setSafeZ(Math.max(1,Number(e.target.value)||1))}/></label>
      <label className='text-xs text-ink-400'>{studioT(language,'feed')}<input className='vp-input mt-1' type='number' min='1' value={feed} onChange={e=>setFeed(Math.max(1,Number(e.target.value)||1))}/></label>
      <label className='text-xs text-ink-400'>{studioT(language,'plunge')}<input className='vp-input mt-1' type='number' min='1' value={plunge} onChange={e=>setPlunge(Math.max(1,Number(e.target.value)||1))}/></label>
      <label className='text-xs text-ink-400'>{studioT(language,'spindle')}<input className='vp-input mt-1' type='number' min='1' value={spindle} onChange={e=>setSpindle(Math.max(1,Number(e.target.value)||1))}/></label>
    </div>
    <button type='button' className='vp-btn' onClick={build} disabled={!prompt.trim()}><Play className='h-4 w-4'/{studioT(language,'process')}</button>
    {parsed&&<div className='rounded-2xl border border-line bg-canvas/50 p-4'><div className='mb-2 text-xs font-semibold text-ink-100'{studioT(language,'interpreted')}</div><div className='grid grid-cols-2 gap-2 text-xs text-ink-300 sm:grid-cols-4'><div{studioT(language,'type')}: {parsed.kind}</div><div{studioT(language,'size')}: {parsed.width}×{parsed.height} mm</div><div{studioT(language,'maxDepth')}: {parsed.depth} mm</div><div{studioT(language,'diameter')}: {parsed.diameter} mm</div></div></div>}
    {gcode&&<pre className='max-h-96 overflow-auto rounded-2xl border border-line bg-black p-4 text-[11px] leading-5 text-ink-200'>{gcode}</pre>}
    {gcode&&<div className='flex flex-wrap items-center gap-2'>
      <button type='button' className='vp-btn' onClick={()=>download('designly-prompt-cnc.nc',gcode,'text/plain;charset=utf-8')}><Download className='h-4 w-4'/{studioT(language,'exportG')}</button>
      <button type='button' className='vp-btn-ghost' onClick={()=>setConfirmed(v=>!v)}><ShieldCheck className='h-4 w-4'/>{confirmed?'Ellenőrzés rögzítve':'Szimuláció / ellenőrzés elvégezve'}</button>
    </div>}
    {gcode&&<div className={'rounded-xl border p-3 text-xs '+(confirmed?'border-emerald-500/30 bg-emerald-500/10 text-emerald-200':'border-amber-500/30 bg-amber-500/10 text-amber-200')}>{confirmed?'A felhasználó jelezte, hogy ellenőrizte a pályát. Ettől a kód még nem tekintendő gépbiztosnak.':'NE indítsd gépen közvetlenül. Ellenőrizd a koordinátarendszert, nullpontot, szerszámot, munkadarabot, előtolást, fordulatot, Z-biztonságot és vezérlő-kompatibilitást.'}</div>}
  </section>;
}

function download(name:string,data:string,type:string){
  const blob=new Blob([data],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}
