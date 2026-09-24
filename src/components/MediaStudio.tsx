import { useState } from 'react';
import { Clapperboard, Copy, Download, Image as ImageIcon, Play, Sparkles } from 'lucide-react';
import { generateCreativeImage } from '../lib/creative-api';
import { generateVideo, type VideoGenerationStatus, type VideoProvider } from '../lib/video-api';

type Shot={scene:number;duration:string;visual:string;camera:string;voice:string;text:string};
function buildStoryboard(brief:string,style:string):Shot[]{
 const b=brief.trim()||'Prémium DESIGNLY kampány';
 return [
  {scene:1,duration:'0–3 mp',visual:b,camera:'Wide establishing shot',voice:'Erős nyitó hook',text:'FIGYELEM — '+b},
  {scene:2,duration:'3–7 mp',visual:'A termék / szolgáltatás fő előnye közelről',camera:'Slow push-in',voice:'Rövid probléma → megoldás',text:'Egyetlen világos előny.'},
  {scene:3,duration:'7–12 mp',visual:'A márka / alkotás használat közben',camera:'Dynamic tracking',voice:'Bizonyíték / eredmény',text:'Mutasd meg az eredményt.'},
  {scene:4,duration:'12–15 mp',visual:'Prémium zárókép és logóhely',camera:'Centered hero frame',voice:'CTA',text:'Készen állsz? Kezdjük el.'},
 ].map((shot)=>({...shot,visual:shot.visual+' · Style: '+style}));
}
function download(name:string,data:unknown){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u);}
export default function MediaStudio(){
 const [brief,setBrief]=useState('Prémium új termékbemutató rövid social videóhoz');
 const [style,setStyle]=useState('cinematic premium');
 const [storyboard,setStoryboard]=useState<Shot[]>([]);
 const [keyframe,setKeyframe]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [videoFile,setVideoFile]=useState<File|null>(null);
 const [videoProvider,setVideoProvider]=useState<VideoProvider>('wan');
 const [videoMode,setVideoMode]=useState<'t2v'|'i2v'>('t2v');
 const [videoDuration,setVideoDuration]=useState<5|10>(5);
 const [videoStatus,setVideoStatus]=useState<VideoGenerationStatus|null>(null);
 const [videoUrl,setVideoUrl]=useState<string|null>(null);
 const [videoBusy,setVideoBusy]=useState(false);
 const script=storyboard.map(s=>[s.duration,s.visual,s.camera,'VO: '+s.voice,'ON-SCREEN: '+s.text].join(' | ')).join('\n');
 function createPlan(){setError('');setStoryboard(buildStoryboard(brief,style));setKeyframe(null);}
 async function createKeyframe(){if(!brief.trim()||busy)return;setBusy(true);setError('');try{const r=await generateCreativeImage('Cinematic video keyframe for: '+brief+'. Style: '+style+'. Premium production design, clean composition, strong subject, suitable as a video storyboard frame.','16:9');setKeyframe(r.url);}catch(e){setError(e instanceof Error?e.message:'A keyframe generálása sikertelen.');}finally{setBusy(false);}}
 async function createVideo(){
  const canStart=(videoMode==='t2v'||!!videoFile||!!keyframe);
  if(!canStart||!brief.trim()||videoBusy)return;
  setVideoBusy(true);setError('');setVideoUrl(null);setVideoStatus(null);
  try{
   const status=await generateVideo({
    image:videoMode==='i2v'?(videoFile||undefined):undefined,
    imageUrl:videoMode==='i2v'&&!videoFile?(keyframe||undefined):undefined,
    prompt:brief.trim()+'. Motion direction: cinematic, natural movement, coherent subject and camera motion. Style: '+style,
    provider:videoProvider,
    mode:videoMode,
    duration:videoDuration
   },setVideoStatus);
   setVideoUrl(status.url||null);
  }catch(e){setError(e instanceof Error?e.message:'A videógenerálás sikertelen.');}
  finally{setVideoBusy(false);}
 }
 return <div className='mt-8 rounded-3xl border border-line bg-panel/70 p-5 shadow-2xl backdrop-blur-xl'>
  <div className='mb-5 flex items-start justify-between gap-4'><div><div className='text-[10px] uppercase tracking-[.2em] text-accent'>VIDEO STUDIO</div><h2 className='mt-1 flex items-center gap-2 font-display text-2xl text-ink-100'><Clapperboard className='h-6 w-6 text-accent'/>Video & Storyboard</h2><p className='mt-1 max-w-3xl text-sm text-ink-400'>Hook, shot list, UGC script, storyboard és AI keyframe — azonnal használható gyártási csomag.</p></div><span className='rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] text-emerald-300'>AKTÍV</span></div>
  <div className='grid gap-3 md:grid-cols-[1fr_220px]'><textarea className='vp-input min-h-28' value={brief} onChange={e=>setBrief(e.target.value)} placeholder='Mit szeretnél videóban bemutatni?'/><select className='vp-input h-fit' value={style} onChange={e=>setStyle(e.target.value)}>{['cinematic premium','gaming','luxury','minimal','ugc social','tech noir','celtic','corporate'].map(v=><option key={v}>{v}</option>)}</select></div>
  <div className='mt-3 flex flex-wrap gap-2'><button className='vp-btn' type='button' onClick={createPlan}><Sparkles className='h-4 w-4'/>Storyboard készítése</button><button className='vp-btn-ghost' type='button' disabled={busy||!brief.trim()} onClick={createKeyframe}>{busy?<Sparkles className='h-4 w-4 animate-pulse'/>:<ImageIcon className='h-4 w-4'/>}{busy?'Keyframe készül…':'AI keyframe'}</button></div>
  {storyboard.length>0&&<div className='mt-5 space-y-2'>{storyboard.map(s=><article key={s.scene} className='rounded-xl border border-line bg-panel px-4 py-3'><div className='flex flex-wrap items-center justify-between gap-2'><span className='text-xs font-semibold text-accent'>SHOT {s.scene} · {s.duration}</span><span className='text-[10px] text-ink-500'>{s.camera}</span></div><p className='mt-2 text-sm text-ink-100'>{s.visual}</p><p className='mt-1 text-xs text-ink-400'>VO: {s.voice} · {s.text}</p></article>)}</div>}
  {storyboard.length>0&&<button className='vp-btn-ghost mt-3' type='button' onClick={()=>download('designly-storyboard.json',{brief,style,storyboard,script})}><Download className='h-4 w-4'/>Storyboard export</button>}
  {keyframe&&<div className='mt-5 overflow-hidden rounded-2xl border border-accent/20 bg-black'><img src={keyframe} alt='AI video keyframe' draggable={false} className='w-full object-contain'/><div className='flex justify-end p-3'><a href={keyframe} target='_blank' rel='noreferrer' className='vp-btn-ghost'><Play className='h-4 w-4'/>Megnyitás</a></div></div>}
  <div className='mt-5 rounded-2xl border border-line bg-canvas/50 p-4'>
   <div className='text-xs font-semibold text-ink-100'>AI videógenerálás · RunPod</div>
   <p className='mt-1 text-xs text-ink-400'>Promptból közvetlenül videót készíthetsz, vagy referencia-képpel image-to-video módot használhatsz.</p>
   <div className='mt-3 grid gap-3 md:grid-cols-4'>
    <label className='text-[11px] text-ink-400'>Mód<select className='vp-input mt-1' value={videoMode} onChange={e=>{const m=e.target.value as 't2v'|'i2v';setVideoMode(m);setVideoUrl(null);setError('');}}><option value='t2v'>Prompt → Video (Wan 2.2)</option><option value='i2v'>Kép → Video (I2V)</option></select></label>
    <label className='text-[11px] text-ink-400'>Provider<select className='vp-input mt-1' value={videoProvider} onChange={e=>setVideoProvider(e.target.value as VideoProvider)}><option value='wan'>Wan 2.2</option><option value='kling' disabled={videoMode==='t2v'}>Kling v2.1 I2V Pro</option></select></label>
    <label className='text-[11px] text-ink-400'>Időtartam<select className='vp-input mt-1' value={videoDuration} onChange={e=>setVideoDuration(Number(e.target.value)===10?10:5)}><option value={5}>5 mp</option><option value={10}>10 mp</option></select></label>
    <div className='text-[11px] text-ink-400'>
     {videoMode==='t2v'?'Csak a fenti prompt szükséges.': 'Referencia-kép kötelező.'}
     {videoMode==='i2v'&&<input type='file' accept='image/png,image/jpeg,image/webp' className='vp-input mt-1' onChange={e=>{setVideoFile(e.target.files?.[0]||null);setVideoUrl(null);setError('');}}/>}
     {videoMode==='i2v'&&videoFile&&<LocalImage file={videoFile} alt='Videó referencia' className='mt-2 max-h-32 w-full rounded-xl object-contain'/>}
     {videoMode==='i2v'&&!videoFile&&keyframe&&<div className='mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-[11px] text-emerald-300'>AI keyframe lesz a referencia.</div>}
    </div>
   </div>
   <div className='mt-3 flex flex-wrap items-center gap-2'>
    <button type='button' className='vp-btn' disabled={videoBusy||!brief.trim()||(videoMode==='i2v'&&!videoFile&&!keyframe)} onClick={createVideo}><Play className='h-4 w-4'/>{videoBusy?'Videó készül…':videoMode==='t2v'?'PROMPT → VIDEO':'KÉP → VIDEO'}</button>
    {videoStatus&&<span className='text-xs text-ink-400'>{videoStatus.status==='COMPLETED'?'Kész':videoStatus.status==='FAILED'?'Sikertelen':'Feldolgozás alatt…'} · {videoStatus.provider||videoProvider} · {videoStatus.mode||videoMode}</span>}
   </div>
   {videoUrl&&<div className='mt-4 overflow-hidden rounded-2xl border border-accent/20 bg-black'><video src={videoUrl} controls playsInline className='w-full' /><div className='flex items-center justify-between gap-3 p-3'><span className='text-xs text-ink-400'>{videoStatus?.model||'RunPod video'}</span><a href={videoUrl} target='_blank' rel='noreferrer' className='vp-btn-ghost'><Download className='h-4 w-4'/>Videó megnyitása</a></div></div>}
  </div>
  {error&&<div className='mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'>{error}</div>}
  {storyboard.length>0&&<button type='button' onClick={()=>navigator.clipboard?.writeText(script)} className='mt-3 inline-flex items-center gap-2 text-xs text-ink-400 hover:text-ink-100'><Copy className='h-3.5 w-3.5'/>Shot list másolása</button>}
 </div>;
}