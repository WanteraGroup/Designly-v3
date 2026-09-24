import { useMemo, useState } from 'react';
import { Download, Grid3X3, Plus, RotateCcw, Trash2, Sparkles, Search } from 'lucide-react';
import { studioT, disciplineT } from '../lib/studio-i18n';

type Discipline = 'architecture'|'structure'|'electrical'|'lighting'|'plumbing'|'hvac'|'fire'|'data'|'mechanical';

type ElementKind =
  | 'wall'|'door'|'window'|'stairs'|'room'|'slab'|'roof'
  | 'beam'|'column'|'foundation'
  | 'socket'|'switch'|'light'|'emergencyLight'|'panel'|'junction'|'meter'|'cableTray'|'sensor'|'outletFloor'
  | 'pipe'|'drain'|'valve'|'pump'|'tank'|'fixture'
  | 'duct'|'diffuser'|'grille'|'ahu'|'fan'|'thermostat'
  | 'sprinkler'|'firePanel'|'hydrant'|'extinguisher'|'smokeDetector'|'alarm'|'exitSign'
  | 'data'|'router'|'accessPoint'|'camera'|'intercom'
  | 'machine'|'compressor'|'boiler'|'heatExchanger';

type Element = { id:string; kind:ElementKind; x:number; y:number; w:number; h:number; label:string; };

const DISCIPLINES: Array<{id:Discipline; label:string; kinds:ElementKind[]}> = [
  {id:'architecture',label:'Építészet',kinds:['wall','door','window','stairs','room','slab','roof']},
  {id:'structure',label:'Szerkezet',kinds:['beam','column','foundation','slab','roof']},
  {id:'electrical',label:'Villamos hálózat',kinds:['panel','socket','switch','junction','meter','cableTray','sensor','outletFloor']},
  {id:'lighting',label:'Világítás',kinds:['light','switch','emergencyLight','sensor','exitSign']},
  {id:'plumbing',label:'Víz / lefolyó',kinds:['pipe','drain','valve','pump','tank','fixture']},
  {id:'hvac',label:'Gépészet / HVAC',kinds:['duct','diffuser','grille','ahu','fan','thermostat','pipe','valve']},
  {id:'fire',label:'Tűzvédelem',kinds:['sprinkler','firePanel','hydrant','extinguisher','smokeDetector','alarm','exitSign']},
  {id:'data',label:'Adat / hálózat',kinds:['data','router','accessPoint','camera','intercom','panel','cableTray']},
  {id:'mechanical',label:'Gépészeti berendezés',kinds:['machine','pump','tank','compressor','boiler','heatExchanger','fan','valve']},
];

const ALL_KINDS = Array.from(new Set(DISCIPLINES.flatMap(d=>d.kinds)));

const DEFAULT_ELEMENTS: Element[] = [
  {id:'wall-1',kind:'wall',x:100,y:90,w:620,h:10,label:'Külső fal'},
  {id:'wall-2',kind:'wall',x:100,y:90,w:10,h:360,label:'Külső fal'},
  {id:'wall-3',kind:'wall',x:100,y:440,w:620,h:10,label:'Külső fal'},
];

const LABELS: Record<ElementKind,string> = {
  wall:'Fal',door:'Ajtó',window:'Ablak',stairs:'Lépcső',room:'Helyiség',slab:'Födém / lemez',roof:'Tető',
  beam:'Gerenda',column:'Oszlop',foundation:'Alapozás',
  socket:'Dugalj',switch:'Kapcsoló',light:'Lámpatest',emergencyLight:'Vészvilágítás',panel:'Elosztó',
  junction:'Kötődoboz',meter:'Mérőóra',cableTray:'Kábeltálca',sensor:'Érzékelő',outletFloor:'Padlódoboz',
  pipe:'Cső',drain:'Lefolyó',valve:'Szelep',pump:'Szivattyú',tank:'Tartály',fixture:'Vízvételi pont',
  duct:'Légcsatorna',diffuser:'Légbefúvó',grille:'Rács / elszívó',ahu:'Légkezelő',fan:'Ventilátor',thermostat:'Termosztát',
  sprinkler:'Sprinkler',firePanel:'Tűzjelző központ',hydrant:'Fali tűzcsap',extinguisher:'Tűzoltó készülék',
  smokeDetector:'Füstérzékelő',alarm:'Hang-/fényjelző',exitSign:'Menekülési irányjelző',
  data:'Adatpont',router:'Router',accessPoint:'Wi‑Fi hozzáférési pont',camera:'Kamera',intercom:'Kaputelefon / intercom',
  machine:'Gép / berendezés',compressor:'Kompresszor',boiler:'Kazán',heatExchanger:'Hőcserélő'
};

const ICONS: Record<ElementKind,string> = {
  wall:'▰',door:'▥',window:'□',stairs:'╱',room:'▱',slab:'▤',roof:'⌂',
  beam:'━',column:'●',foundation:'▰',
  socket:'⊙',switch:'◇',light:'✦',emergencyLight:'⚠',panel:'▤',junction:'⊞',meter:'◉',cableTray:'≡',sensor:'⌁',outletFloor:'⊡',
  pipe:'╱',drain:'⊗',valve:'◆',pump:'↻',tank:'▣',fixture:'♢',
  duct:'≡',diffuser:'✧',grille:'▦',ahu:'◫',fan:'✺',thermostat:'Θ',
  sprinkler:'✧',firePanel:'▣',hydrant:'◉',extinguisher:'▥',smokeDetector:'◌',alarm:'⚠',exitSign:'⇥',
  data:'◈',router:'⌁',accessPoint:'◒',camera:'◉',intercom:'▤',
  machine:'⚙',compressor:'◎',boiler:'▣',heatExchanger:'▤'
};

const PRESETS: Record<ElementKind,Partial<Element>> = {
  wall:{w:180,h:10},door:{w:90,h:10},window:{w:120,h:10},stairs:{w:140,h:120},room:{w:220,h:180},slab:{w:240,h:20},roof:{w:260,h:25},
  beam:{w:220,h:18},column:{w:24,h:24},foundation:{w:180,h:40},
  socket:{w:18,h:18},switch:{w:18,h:18},light:{w:26,h:26},emergencyLight:{w:24,h:18},panel:{w:40,h:30},
  junction:{w:24,h:24},meter:{w:28,h:28},cableTray:{w:180,h:18},sensor:{w:20,h:20},outletFloor:{w:26,h:26},
  pipe:{w:120,h:8},drain:{w:20,h:20},valve:{w:24,h:18},pump:{w:55,h:45},tank:{w:75,h:55},fixture:{w:36,h:28},
  duct:{w:150,h:20},diffuser:{w:34,h:24},grille:{w:42,h:24},ahu:{w:85,h:60},fan:{w:45,h:45},thermostat:{w:20,h:20},
  sprinkler:{w:20,h:20},firePanel:{w:45,h:35},hydrant:{w:30,h:30},extinguisher:{w:22,h:34},smokeDetector:{w:20,h:20},alarm:{w:22,h:22},exitSign:{w:34,h:18},
  data:{w:18,h:18},router:{w:44,h:28},accessPoint:{w:32,h:32},camera:{w:28,h:28},intercom:{w:34,h:34},
  machine:{w:100,h:80},compressor:{w:80,h:55},boiler:{w:75,h:65},heatExchanger:{w:85,h:55}
};

function exportText(project:{name:string;width:number;height:number;scale:number;discipline:Discipline;elements:Element[]}){
  return JSON.stringify({
    type:'DESIGNLY_ENGINEERING_PLAN',
    version:2,
    ...project,
    catalogElements:ALL_KINDS.length,
    exportedAt:new Date().toISOString()
  },null,2);
}

export default function EngineeringPlanner({ language='hu' }: { language?: string }){
  const [discipline,setDiscipline]=useState<Discipline>('architecture');
  const [catalogMode,setCatalogMode]=useState<'discipline'|'all'>('discipline');
  const [catalogSearch,setCatalogSearch]=useState('');
  const [project,setProject]=useState({name:'Új műszaki terv',width:12000,height:8000,scale:50});
  const [elements,setElements]=useState<Element[]>(DEFAULT_ELEMENTS);
  const [selected,setSelected]=useState<string|null>(null);
  const [prompt,setPrompt]=useState('');
  const [promptStatus,setPromptStatus]=useState('');
  const current=useMemo(()=>DISCIPLINES.find(d=>d.id===discipline)!,[discipline]);

  const catalogKinds=useMemo(()=>{
    const base=catalogMode==='all'?ALL_KINDS:current.kinds;
    const q=catalogSearch.trim().toLocaleLowerCase('hu-HU');
    return q?base.filter(kind=>LABELS[kind].toLocaleLowerCase('hu-HU').includes(q)):base;
  },[catalogMode,current.kinds,catalogSearch]);

  function add(kind:ElementKind){
    const id=kind+'-'+Date.now();
    const p=PRESETS[kind];
    setElements(v=>[...v,{id,kind,x:300+(v.length%4)*150,y:180+Math.floor(v.length/4)*110,w:p.w||40,h:p.h||40,label:LABELS[kind]}]);
    setSelected(id);
  }

  function update(id:string,patch:Partial<Element>){
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

  function generateFromPrompt(){
    const raw=prompt.trim();
    if(!raw){setPromptStatus('Írj le egy helyiséget, méreteket és szakágakat.');return;}
    const text=raw.toLowerCase();
    const dims=text.match(/(\d+(?:[.]\d+)?)\s*[x×]\s*(\d+(?:[.]\d+)?)/);
    const parsedWidth=dims?Number(dims[1]):project.width;
    const parsedHeight=dims?Number(dims[2]):project.height;
    const nextProject={...project,width:Math.max(100,Math.round(parsedWidth)),height:Math.max(100,Math.round(parsedHeight)),name:raw.slice(0,80)};
    const margin=700;
    const wallW=Math.max(1200,nextProject.width-2*margin);
    const wallH=Math.max(1200,nextProject.height-2*margin);
    const stamp=Date.now();
    const next:Element[]=[
      {id:'wall-top-'+stamp,kind:'wall',x:margin,y:margin,w:wallW,h:10,label:'Külső fal'},
      {id:'wall-left-'+stamp,kind:'wall',x:margin,y:margin,w:10,h:wallH,label:'Külső fal'},
      {id:'wall-bottom-'+stamp,kind:'wall',x:margin,y:margin+wallH,w:wallW,h:10,label:'Külső fal'},
      {id:'wall-right-'+stamp,kind:'wall',x:margin+wallW,y:margin,w:10,h:wallH,label:'Külső fal'},
    ];

    const addPromptKind=(kind:ElementKind,count:number)=>{
      for(let i=0;i<count;i++){
        const p=PRESETS[kind];
        const id=kind+'-'+stamp+'-'+i;
        const col=i%5,row=Math.floor(i/5);
        next.push({id,kind,x:1100+col*260,y:1300+row*190,w:p.w||40,h:p.h||40,label:LABELS[kind]});
      }
    };

    const count=(word:string,fallback=1)=>Math.min(12,Math.max(fallback,(text.match(new RegExp(word,'g'))||[]).length));

    addPromptKind('door',count('ajt',1));
    addPromptKind('window',count('ablak',2));

    const rules:Array<[RegExp,ElementKind,number]>=[
      [/dugalj|konnektor|aljzat/,'socket',6],
      [/padlódoboz|padlo/,'outletFloor',2],
      [/kapcsol/,'switch',4],
      [/lámpa|világítás|vilagitas|led/,'light',6],
      [/vészvilágítás|veszvilagitas/,'emergencyLight',3],
      [/elosztó|eloszto|biztosíték|kismegszakító/,'panel',1],
      [/kötődoboz|kötő/,'junction',3],
      [/mérőóra|villanyóra|mérő/,'meter',1],
      [/kábeltálca|kabeltálca|tálca/,'cableTray',2],
      [/érzékelő|erzekelo|szenzor/,'sensor',3],
      [/adat|internet|lan|ethernet/,'data',4],
      [/router/,'router',1],
      [/wifi|wi-fi|access point|hozzáférési pont/,'accessPoint',2],
      [/kamera|cctv/,'camera',2],
      [/kaputelefon|intercom/,'intercom',1],
      [/cső|cso|víz|viz|lefoly/,'pipe',4],
      [/szelep/,'valve',3],
      [/szivattyú|szivattyu/,'pump',2],
      [/tartály|tartaly/,'tank',1],
      [/mosdó|mosdo|wc|kagyló|kagylo/,'fixture',3],
      [/hvac|fűtés|futes|szellőzés|szellozes|légtechnika|legtechnika/,'duct',3],
      [/légbefúvó|legbefuvo/,'diffuser',3],
      [/rács|racs|elszívó|elszivo/,'grille',3],
      [/légkezelő|legkezelo/,'ahu',1],
      [/ventilátor|ventilator/,'fan',2],
      [/termosztát|termosztat/,'thermostat',2],
      [/sprinkler|tűzvédelem|tuzvedelem/,'sprinkler',4],
      [/tűzjelző központ|tuzjelzo kozpont/,'firePanel',1],
      [/tűzcsap|tuzcsap/,'hydrant',2],
      [/tűzoltó|tuzolto|oltókészülék|oltokeszulek/,'extinguisher',2],
      [/füstérzékelő|fusterzekelo/,'smokeDetector',4],
      [/riasztó|riaszto|hangjelző|hangjelzo/,'alarm',2],
      [/menekülési|menekulesi|kijárat|kijarat/,'exitSign',2],
      [/gerenda/,'beam',3],
      [/oszlop/,'column',4],
      [/alapozás|alapozas/,'foundation',2],
      [/lépcső|lepcso/,'stairs',1],
      [/helyiség|helyiseg|szoba/,'room',3],
      [/tető|teto/,'roof',1],
      [/födém|fodem/,'slab',1],
      [/kompresszor/,'compressor',1],
      [/kazán|kazan/,'boiler',1],
      [/hőcserélő|hocserelo/,'heatExchanger',1],
      [/gép|gepesz|gépsor|gepsor|berendezés|berendezes/,'machine',2],
    ];

    for(const [re,kind,n] of rules) if(re.test(text)) addPromptKind(kind,n);

    const firstDiscipline=
      DISCIPLINES.find(d=>d.id==='electrical'&&/villamos|elektromos|áram|aram/.test(text))
      ||DISCIPLINES.find(d=>d.id==='plumbing'&&/víz|viz|lefoly/.test(text))
      ||DISCIPLINES.find(d=>d.id==='hvac'&&/hvac|fűtés|futes|szell/.test(text))
      ||DISCIPLINES.find(d=>d.id==='fire'&&/tűz|tuz|sprinkler/.test(text))
      ||DISCIPLINES.find(d=>d.id==='data'&&/adat|internet|lan|ethernet|wifi|wi-fi/.test(text))
      ||DISCIPLINES.find(d=>d.id==='structure'&&/szerkezet|gerenda|oszlop/.test(text))
      ||DISCIPLINES.find(d=>d.id==='architecture'&&/épület|epulet|alaprajz|szoba|ház|haz/.test(text));

    if(firstDiscipline)setDiscipline(firstDiscipline.id);
    setCatalogMode('discipline');
    setCatalogSearch('');
    setProject(nextProject);
    setElements(next);
    setSelected(null);
    setPromptStatus('A prompt alapján elkészült a kiinduló műszaki terv. Az elemek szabadon szerkeszthetők és további katalóguselemek hozzáadhatók.');
  }

  const selectedElement=elements.find(e=>e.id===selected)||null;
  const svgWidth=900,svgHeight=560;

  return <section className='space-y-4'>
    <div className='rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div><div className='text-xs font-semibold text-ink-100'>{studioT(language,'engTitle')}</div><p className='mt-1 text-xs text-ink-400'>{studioT(language,'engDesc')}</p></div>
        <span className='rounded-full border border-cyan-500/30 px-3 py-1 text-[10px] text-cyan-300'>{studioT(language,'multi')} · {ALL_KINDS.length} elem</span>
      </div>
    </div>

    <div className='rounded-2xl border border-accent/30 bg-accent/5 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div><div className='text-xs font-semibold text-ink-100'>PROMPT → MŰSZAKI TERV</div><p className='mt-1 text-xs text-ink-400'>Írd le természetes nyelven a helyiséget, méreteket és szakágakat. A rendszer szerkeszthető tervvázat készít.</p></div>
        <Sparkles className='h-5 w-5 text-accent'/>
      </div>
      <div className='mt-3 grid gap-2 md:grid-cols-[1fr_auto]'>
        <textarea className='vp-input min-h-[92px]' value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder='Pl. 12000x8000 mm-es műhely, két ajtó, 6 ablak, villamos hálózat 8 dugaljjal, 4 kapcsolóval, LED világítással, elosztóval, víz/lefolyó, HVAC és tűzvédelem.'/>
        <button type='button' className='vp-btn self-stretch md:min-w-[190px]' onClick={generateFromPrompt}><Sparkles className='h-4 w-4'/>{studioT(language,'process')}</button>
      </div>
      {promptStatus&&<p className='mt-2 text-[11px] text-accent'>{promptStatus}</p>}
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
      {DISCIPLINES.map(d=><button key={d.id} type='button' onClick={()=>{setDiscipline(d.id);setCatalogMode('discipline');setCatalogSearch('');}} className={'rounded-full border px-3 py-1.5 text-[11px] '+(discipline===d.id&&catalogMode==='discipline'?'border-accent/70 bg-accent/15 text-accent':'border-line text-ink-300')}>{disciplineT(language,d.id)} <span className='opacity-50'>· {d.kinds.length}</span></button>)}
      <button type='button' onClick={()=>setCatalogMode('all')} className={'rounded-full border px-3 py-1.5 text-[11px] '+(catalogMode==='all'?'border-cyan-400/70 bg-cyan-400/10 text-cyan-300':'border-line text-ink-300')}>Összes elem · {ALL_KINDS.length}</button>
    </div>

    <div className='grid gap-4 lg:grid-cols-[280px_1fr_240px]'>
      <aside className='rounded-2xl border border-line bg-canvas/50 p-3'>
        <div className='mb-2 flex items-center justify-between gap-2'>
          <div className='text-[10px] uppercase tracking-[.18em] text-ink-500'>Elemkatalógus</div>
          <span className='text-[10px] text-ink-600'>{catalogKinds.length}/{catalogMode==='all'?ALL_KINDS.length:current.kinds.length}</span>
        </div>
        <div className='relative mb-2'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-600'/>
          <input className='vp-input pl-9' value={catalogSearch} onChange={e=>setCatalogSearch(e.target.value)} placeholder='Elem keresése…'/>
        </div>
        <div className='max-h-[600px] overflow-y-auto pr-1'>
          <div className='grid gap-1.5'>
            {catalogKinds.map(kind=><button key={kind} type='button' onClick={()=>add(kind)} className='flex w-full items-center gap-2 rounded-xl border border-line px-3 py-2 text-left text-xs text-ink-200 transition hover:border-accent/50 hover:bg-accent/5'>
              <Plus className='h-3.5 w-3.5 shrink-0 text-accent'/>
              <span className='w-5 text-center text-accent'>{ICONS[kind]}</span>
              <span className='min-w-0 truncate'>{LABELS[kind]}</span>
            </button>)}
          </div>
          {!catalogKinds.length&&<div className='px-2 py-8 text-center text-xs text-ink-500'>Nincs találat.</div>}
        </div>
      </aside>

      <div className='rounded-2xl border border-line bg-black p-3'>
        <div className='mb-2 flex items-center justify-between text-[10px] text-ink-500'>
          <span><Grid3X3 className='mr-1 inline h-3.5 w-3.5'/>{studioT(language,'view')} · {project.width} × {project.height} mm · M 1:{project.scale}</span>
          <span>{elements.length} {studioT(language,'elements')}</span>
        </div>
        <svg viewBox={'0 0 '+svgWidth+' '+svgHeight} className='h-auto w-full rounded-xl border border-line bg-[#090b0f]' role='img' aria-label='Engineering plan canvas'>
          <defs><pattern id='engineering-grid' width='20' height='20' patternUnits='userSpaceOnUse'><path d='M 20 0 L 0 0 0 20' fill='none' stroke='#242833' strokeWidth='1'/></pattern></defs>
          <rect width={svgWidth} height={svgHeight} fill='url(#engineering-grid)'/>
          <text x='450' y='24' fill='#c9a45c' fontSize='14' textAnchor='middle'>{project.name}</text>
          {elements.map(e=>{
            const active=e.id===selected;
            const isPoint=e.w<=45&&e.h<=45;
            return <g key={e.id} onClick={()=>setSelected(e.id)} cursor='pointer'>
              <rect x={e.x} y={e.y} width={e.w} height={e.h} rx={e.kind==='wall'||e.kind==='beam'?1:4} fill={active?'#c9a45c':isPoint?'#131922':'#1a202a'} stroke={active?'#f3eee3':'#66d9ef'} strokeWidth={active?3:1.5}/>
              <text x={e.x+e.w/2} y={e.y+e.h/2+4} fill={active?'#090b0f':'#d6d9de'} fontSize={isPoint?'8':'10'} textAnchor='middle'>{ICONS[e.kind]} {LABELS[e.kind]}</text>
            </g>;
          })}
        </svg>
      </div>

      <aside className='rounded-2xl border border-line bg-canvas/50 p-3'>
        <div className='mb-2 text-[10px] uppercase tracking-[.18em] text-ink-500'>{studioT(language,'props')}</div>
        {selectedElement?<div className='space-y-2'>
          <div className='rounded-xl border border-accent/20 bg-accent/5 p-3'><div className='text-xs font-semibold text-ink-100'>{ICONS[selectedElement.kind]} {LABELS[selectedElement.kind]}</div><div className='mt-1 text-[10px] text-ink-500'>Szakág: {DISCIPLINES.find(d=>d.kinds.includes(selectedElement.kind))?.label||'—'}</div></div>
          <input className='vp-input' value={selectedElement.label} onChange={e=>update(selectedElement.id,{label:e.target.value.slice(0,80)})}/>
          {(['x','y','w','h'] as const).map(k=><label key={k} className='block text-[10px] text-ink-500'>{k.toUpperCase()} <input className='vp-input mt-1' type='number' value={selectedElement[k]} onChange={e=>update(selectedElement.id,{[k]:Math.max(1,Number(e.target.value)||1)})}/></label>)}
          <button type='button' onClick={removeSelected} className='vp-btn-ghost w-full'><Trash2 className='h-4 w-4'/>{studioT(language,'delete')}</button>
        </div>:<p className='text-xs text-ink-500'>{studioT(language,'clickEdit')}</p>}
      </aside>
    </div>

    <div className='flex flex-wrap gap-2'>
      <button type='button' className='vp-btn' onClick={()=>download('designly-engineering-plan.json',exportText({...project,discipline,elements}),'application/json;charset=utf-8')}><Download className='h-4 w-4'/>{studioT(language,'json')}</button>
      <button type='button' className='vp-btn-ghost' onClick={reset}><RotateCcw className='h-4 w-4'/>{studioT(language,'reset')}</button>
    </div>
  </section>;
}

function download(name:string,data:string,type:string){
  const blob=new Blob([data],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
