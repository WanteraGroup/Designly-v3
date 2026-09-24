import { useMemo, useState } from 'react';
import { Download, Grid3X3, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { studioT, disciplineT } from '../lib/studio-i18n';

type Discipline = 'architecture'|'structure'|'electrical'|'lighting'|'plumbing'|'hvac'|'fire'|'data'|'mechanical';
type ElementKind = 'wall'|'door'|'window'|'beam'|'column'|'socket'|'switch'|'light'|'panel'|'pipe'|'drain'|'duct'|'sprinkler'|'data'|'machine';

type Element = { id:string; kind:ElementKind; x:number; y:number; w:number; h:number; label:string; };

const DISCIPLINES: Array<{id:Discipline; label:string; kinds:ElementKind[]}> = [
  {id:'architecture',label:'Építészet',kinds:['wall','door','window']},
  {id:'structure',label:'Szerkezet',kinds:['beam','column']},
  {id:'electrical',label:'Villamos hálózat',kinds:['panel','socket','switch']},
  {id:'lighting',label:'Világítás',kinds:['light','switch']},
  {id:'plumbing',label:'Víz / lefolyó',kinds:['pipe','drain']},
  {id:'hvac',label:'Gépészet / HVAC',kinds:['duct','pipe']},
  {id:'fire',label:'Tűzvédelem',kinds:['sprinkler','panel']},
  {id:'data',label:'Adat / hálózat',kinds:['data','panel']},
  {id:'mechanical',label:'Gépészeti berendezés',kinds:['machine','pipe']},
];

const DEFAULT_ELEMENTS: Element[] = [
  {id:'wall-1',kind:'wall',x:100,y:90,w:620,h:10,label:'Külső fal'},
  {id:'wall-2',kind:'wall',x:100,y:90,w:10,h:360,label:'Külső fal'},
  {id:'wall-3',kind:'wall',x:100,y:440,w:620,h:10,label:'Külső fal'},
];

const LABELS: Record<ElementKind,string> = {
  wall:'Fal',door:'Ajtó',window:'Ablak',beam:'Gerenda',column:'Oszlop',socket:'Dugalj',switch:'Kapcsoló',
  light:'Lámpatest',panel:'Elosztó',pipe:'Cső',drain:'Lefolyó',duct:'Légcsatorna',sprinkler:'Sprinkler',data:'Adatpont',machine:'Berendezés'
};

function iconFor(kind:ElementKind){ return ({wall:'▰',door:'▥',window:'□',beam:'━',column:'●',socket:'⊙',switch:'◇',light:'✦',panel:'▤',pipe:'╱',drain:'⊗',duct:'≡',sprinkler:'✧',data:'◈',machine:'⚙'} as Record<ElementKind,string>)[kind]; }

function exportText(project:{name:string;width:number;height:number;scale:number;discipline:Discipline;elements:Element[]}){
  return JSON.stringify({type:'DESIGNLY_ENGINEERING_PLAN',version:1,...project,exportedAt:new Date().toISOString()},null,2);
}

export default function EngineeringPlanner(){
  const [discipline,setDiscipline]=useState<Discipline>('architecture');
  const [project,setProject]=useState({name:'Új műszaki terv',width:12000,height:8000,scale:50});
  const [elements,setElements]=useState<Element[]>(DEFAULT_ELEMENTS);
  const [selected,setSelected]=useState<string|null>(null);
  const current=useMemo(()=>DISCIPLINES.find(d=>d.id===discipline)!,[discipline]);

  function add(kind:ElementKind){
    const id=kind+'-'+Date.now();
    const preset:Record<ElementKind,Partial<Element>>={
      wall:{w:180,h:10},door:{w:90,h:10},window:{w:120,h:10},beam:{w:220,h:18},column:{w:24,h:24},socket:{w:18,h:18},switch:{w:18,h:18},light:{w:26,h:26},panel:{w:40,h:30},pipe:{w:120,h:8},drain:{w:20,h:20},duct:{w:150,h:20},sprinkler:{w:20,h:20},data:{w:18,h:18},machine:{w:100,h:80}
    };
    const p=preset[kind];
    setElements(v=>[...v,{id,kind,x:300,y:220,w:p.w||40,h:p.h||40,label:LABELS[kind]}]);
    setSelected(id);
  }

  function update(id:string, patch:Partial<Element>){
    setElements(v=>v.map(e=>e.id===id?{...e,...patch}:e));
  }

  function removeSelected(){
    if(!selected)return;
    setElements(v=>v.filter(e=>e.id!==selected));
    setSelected(null);
  }

  function reset(){
    setElements(DEFAULT_ELEMENTS);
    setSelected(null);
  }

  const selectedElement=elements.find(e=>e.id===selected)||null;
  const svgWidth=900, svgHeight=560;

  return <section className='space-y-4'>
    <div className='rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div><div className='text-xs font-semibold text-ink-100'>{studioT(language,'engTitle')}</div><p className='mt-1 text-xs text-ink-400'>{studioT(language,'engDesc')}</p></div>
        <span className='rounded-full border border-cyan-500/30 px-3 py-1 text-[10px] text-cyan-300'>{studioT(language,'multi')}</span>
      </div>
    </div>

    <div className='grid gap-3 md:grid-cols-2'>
      <input className='vp-input' value={project.name} onChange={e=>setProject({...project,name:e.target.value.slice(0,120)})} placeholder={studioT(language,'planName')}/>
      <div className='grid grid-cols-3 gap-2'>
        <input aria-label={studioT(language,'width')+' mm'} type='number' min='100' className='vp-input' value={project.width} onChange={e=>setProject({...project,width:Math.max(100,Number(e.target.value)||100)})}/>
        <input aria-label={studioT(language,'height')+' mm'} type='number' min='100' className='vp-input' value={project.height} onChange={e=>setProject({...project,height:Math.max(100,Number(e.target.value)||100)})}/>
        <input aria-label={studioT(language,'scale')} type='number' min='1' className='vp-input' value={project.scale} onChange={e=>setProject({...project,scale:Math.max(1,Number(e.target.value)||1)})}/>
      </div>
    </div>

    <div className='flex flex-wrap gap-2'>
      {DISCIPLINES.map(d=><button key={d.id} type='button' onClick={()=>setDiscipline(d.id)} className={'rounded-full border px-3 py-1.5 text-[11px] '+(discipline===d.id?'border-accent/70 bg-accent/15 text-accent':'border-line text-ink-300')}>{d.label}</button>)}
    </div>

    <div className='grid gap-4 lg:grid-cols-[220px_1fr_220px]'>
      <aside className='rounded-2xl border border-line bg-canvas/50 p-3'>
        <div className='mb-2 text-[10px] uppercase tracking-[.18em] text-ink-500'{studioT(language,'catalog')}</div>
        <div className='space-y-1.5'>{current.kinds.map(kind=><button key={kind} type='button' onClick={()=>add(kind)} className='flex w-full items-center gap-2 rounded-xl border border-line px-3 py-2 text-left text-xs text-ink-200 hover:border-accent/50'><Plus className='h-3.5 w-3.5 text-accent'/><span>{iconFor(kind)}</span>{LABELS[kind]}</button>)}</div>
      </aside>

      <div className='rounded-2xl border border-line bg-black p-3'>
        <div className='mb-2 flex items-center justify-between text-[10px] text-ink-500'><span><Grid3X3 className='mr-1 inline h-3.5 w-3.5'/{studioT(language,'view')} · {project.width} × {project.height} mm · M 1:{project.scale}</span><span>{elements.length} elem</span></div>
        <svg viewBox={'0 0 '+svgWidth+' '+svgHeight} className='h-auto w-full rounded-xl border border-line bg-[#090b0f]'>
          <defs><pattern id='grid' width='20' height='20' patternUnits='userSpaceOnUse'><path d='M 20 0 L 0 0 0 20' fill='none' stroke='#242833' strokeWidth='1'/></pattern></defs>
          <rect width={svgWidth} height={svgHeight} fill='url(#grid)'/>
          <text x='450' y='24' fill='#c9a45c' fontSize='14' textAnchor='middle'>{project.name}</text>
          {elements.map(e=>{
            const active=e.id===selected;
            return <g key={e.id} onClick={()=>setSelected(e.id)} cursor='pointer'>
              <rect x={e.x} y={e.y} width={e.w} height={e.h} rx={e.kind==='wall'?1:6} fill={active?'#c9a45c':'#1a202a'} stroke={active?'#f3eee3':'#66d9ef'} strokeWidth={active?3:1.5}/>
              <text x={e.x+e.w/2} y={e.y+e.h/2+4} fill={active?'#090b0f':'#d6d9de'} fontSize='10' textAnchor='middle'>{iconFor(e.kind)} {LABELS[e.kind]}</text>
            </g>;
          })}
        </svg>
      </div>

      <aside className='rounded-2xl border border-line bg-canvas/50 p-3'>
        <div className='mb-2 text-[10px] uppercase tracking-[.18em] text-ink-500'{studioT(language,'props')}</div>
        {selectedElement?<div className='space-y-2'>
          <input className='vp-input' value={selectedElement.label} onChange={e=>update(selectedElement.id,{label:e.target.value.slice(0,80)})}/>
          {(['x','y','w','h'] as const).map(k=><label key={k} className='block text-[10px] text-ink-500'>{k.toUpperCase()} <input className='vp-input mt-1' type='number' value={selectedElement[k]} onChange={e=>update(selectedElement.id,{[k]:Math.max(1,Number(e.target.value)||1)})}/></label>)}
          <button type='button' onClick={removeSelected} className='vp-btn-ghost w-full'><Trash2 className='h-4 w-4'/{studioT(language,'delete')}</button>
        </div>:<p className='text-xs text-ink-500'{studioT(language,'clickEdit')}</p>}
      </aside>
    </div>

    <div className='flex flex-wrap gap-2'>
      <button type='button' className='vp-btn' onClick={()=>download('designly-engineering-plan.json',exportText({...project,discipline,elements}),'application/json;charset=utf-8')}><Download className='h-4 w-4'/{studioT(language,'json')}</button>
      <button type='button' className='vp-btn-ghost' onClick={reset}><RotateCcw className='h-4 w-4'/{studioT(language,'reset')}</button>
    </div>
  </section>;
}

function download(name:string,data:string,type:string){
  const blob=new Blob([data],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=name;
  a.click();
  URL.revokeObjectURL(url);
}
