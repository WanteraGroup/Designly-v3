import { useMemo, useState } from 'react';
import { BadgeCheck, Bell, Box, Check, Copy, Download, Gamepad2, Image as ImageIcon, Layers3, MonitorPlay, Palette, Play, Radio, Shirt, Sparkles, Star, Tv, Video } from 'lucide-react';
import { generateCreativeImage } from '../lib/creative-api';
import type { LanguageCode } from '../lib/constants';

type AssetId='starting'|'brb'|'ending'|'gameplay'|'webcam'|'chat'|'event'|'goal'|'follow'|'sub'|'gift'|'raid'|'donation'|'sponsor'|'youtube-thumb'|'tiktok-cover'|'live-now'|'emote-pack'|'sub-badges'|'loyalty-badges'|'stinger'|'intermission'|'merch-shirt'|'merch-hoodie'|'merch-mug'|'merch-cap'|'merch-sticker';
/**
 * Egy asset.
 *
 * A `desc` KET nyelvu, mert a felhasznalo latja (kartyaszoveg) ES a modell is
 * (prompt-resz) — egy magyar leiras egy angol promptban rossz generalast ad.
 */
type Asset={id:AssetId;label:string;group:string;platform:string;size:string;desc:{hu:string;en:string};ratio:string};
const ASSETS:Asset[]=[
{id:'starting',label:'Starting Soon',group:'Scenes',platform:'OBS / Streamlabs',size:'1920×1080',desc:{hu:'Indulás előtti scene.',en:'Pre-show scene.'},ratio:'16:9'},
{id:'brb',label:'BRB Scene',group:'Scenes',platform:'OBS / Streamlabs',size:'1920×1080',desc:{hu:'Be Right Back scene.',en:'Be Right Back scene.'},ratio:'16:9'},
{id:'ending',label:'Ending Scene',group:'Scenes',platform:'OBS / Streamlabs',size:'1920×1080',desc:{hu:'Streamzáró scene.',en:'Stream ending scene.'},ratio:'16:9'},
{id:'gameplay',label:'Gameplay Overlay',group:'Overlays',platform:'OBS / Streamlabs',size:'1920×1080',desc:{hu:'Játékképernyő overlay.',en:'Gameplay overlay.'},ratio:'16:9'},
{id:'webcam',label:'Webcam Frame',group:'Overlays',platform:'OBS / Streamlabs',size:'1920×1080',desc:{hu:'Webcam keret.',en:'Webcam frame.'},ratio:'16:9'},
{id:'chat',label:'Chat Box',group:'Overlays',platform:'OBS / Streamlabs',size:'900×1600',desc:{hu:'Chat panel.',en:'Chat panel.'},ratio:'9:16'},
{id:'event',label:'Event List',group:'Widgets',platform:'Twitch / YouTube',size:'900×1200',desc:{hu:'Follow/sub/donation események.',en:'Follow, sub and donation events.'},ratio:'3:4'},
{id:'goal',label:'Goal Bar',group:'Widgets',platform:'Twitch / YouTube',size:'1200×250',desc:{hu:'Célkitűzés sáv.',en:'Goal progress bar.'},ratio:'16:9'},
{id:'follow',label:'New Follower Alert',group:'Alerts',platform:'Twitch / YouTube / Kick',size:'800×450',desc:{hu:'Új követő alert.',en:'New follower alert.'},ratio:'16:9'},
{id:'sub',label:'New Subscriber Alert',group:'Alerts',platform:'Twitch / YouTube',size:'800×450',desc:{hu:'Feliratkozó alert.',en:'New subscriber alert.'},ratio:'16:9'},
{id:'gift',label:'Gift Sub Alert',group:'Alerts',platform:'Twitch',size:'800×450',desc:{hu:'Gift sub alert.',en:'Gift sub alert.'},ratio:'16:9'},
{id:'raid',label:'Raid Alert',group:'Alerts',platform:'Twitch',size:'800×450',desc:{hu:'Raid alert.',en:'Raid alert.'},ratio:'16:9'},
{id:'donation',label:'Donation Alert',group:'Alerts',platform:'Twitch / YouTube / Kick',size:'800×450',desc:{hu:'Donation alert.',en:'Donation alert.'},ratio:'16:9'},
{id:'sponsor',label:'Sponsor Frame',group:'Branding',platform:'OBS / Streamlabs',size:'1920×1080',desc:{hu:'Szponzor megjelenítés.',en:'Sponsor placement.'},ratio:'16:9'},
{id:'youtube-thumb',label:'YouTube Thumbnail',group:'Social',platform:'YouTube',size:'1280×720',desc:{hu:'Gamer videó thumbnail.',en:'Gamer video thumbnail.'},ratio:'16:9'},
{id:'tiktok-cover',label:'TikTok Cover',group:'Social',platform:'TikTok',size:'1080×1920',desc:{hu:'Videóborító.',en:'Video cover.'},ratio:'9:16'},
{id:'live-now',label:'Go Live Announcement',group:'Social',platform:'All platforms',size:'1080×1080',desc:{hu:'LIVE NOW promo.',en:'LIVE NOW promo.'},ratio:'1:1'},
{id:'emote-pack',label:'Emote Pack',group:'Community',platform:'Twitch / YouTube',size:'112 / 56 / 28 px',desc:{hu:'Közösségi emote rendszer.',en:'Community emote set.'},ratio:'1:1'},
{id:'sub-badges',label:'Subscriber Badges',group:'Community',platform:'Twitch / YouTube',size:'18 / 36 / 72 px',desc:{hu:'Sub badge rendszer.',en:'Subscriber badge set.'},ratio:'1:1'},
{id:'loyalty-badges',label:'Loyalty Badges',group:'Community',platform:'Twitch',size:'18 / 36 / 72 px',desc:{hu:'Loyalty badge rendszer.',en:'Loyalty badge set.'},ratio:'1:1'},
{id:'stinger',label:'Stinger Transition',group:'Motion FX',platform:'OBS / Streamlabs',size:'1920×1080',desc:{hu:'Átmenet keyframe artwork.',en:'Stinger transition keyframe artwork.'},ratio:'16:9'},
{id:'intermission',label:'Intermission Scene',group:'Motion FX',platform:'OBS / Streamlabs',size:'1920×1080',desc:{hu:'Animálható intermission.',en:'Animatable intermission scene.'},ratio:'16:9'},
{id:'merch-shirt',label:'Gaming T-Shirt',group:'Merch',platform:'Shopify / POD',size:'4500×5400',desc:{hu:'Gyártható pólóminta.',en:'Production-ready t-shirt artwork.'},ratio:'3:4'},
{id:'merch-hoodie',label:'Gaming Hoodie',group:'Merch',platform:'Shopify / POD',size:'4500×5400',desc:{hu:'Kapucnis pulóver master artwork.',en:'Hoodie master artwork.'},ratio:'3:4'},
{id:'merch-mug',label:'Gaming Mug',group:'Merch',platform:'Shopify / POD',size:'2700×1120',desc:{hu:'Bögre wrap artwork.',en:'Mug wrap artwork.'},ratio:'16:9'},
{id:'merch-cap',label:'Gaming Cap',group:'Shopify / POD',size:'3000×3000',desc:{hu:'Sapka embléma.',en:'Cap emblem.'},ratio:'1:1'},
{id:'merch-sticker',label:'Sticker Pack',group:'Merch',platform:'Shopify / POD',size:'2000×2000',desc:{hu:'Matrica pack.',en:'Sticker pack.'},ratio:'1:1'}];
const RATIO=Object.fromEntries(ASSETS.map(a=>[a.id,a.ratio]));
const GROUP_ICON:Record<string,typeof Sparkles>={Scenes:MonitorPlay,Overlays:Layers3,Widgets:Box,Alerts:Bell,Branding:Palette,Social:ImageIcon,Community:Star,'Motion FX':Video,Merch:Shirt};
const GROUP_ORDER=['Scenes','Overlays','Widgets','Alerts','Branding','Social','Community','Motion FX'];

/** A studió felületi szövegei. A `desc` az asset-adatból jön, ez a UI-keret. */
const TEXT:Record<string,{hu:string;en:string}>={ 
  subtitle:{hu:'OBS, Streamlabs, Twitch, YouTube, TikTok Live, Kick, Discord, közösségi és merch kreatívok egyetlen műhelyben.',en:'OBS, Streamlabs, Twitch, YouTube, TikTok Live, Kick, Discord — social and merch creatives in one workshop.'},
  tabAssets:{hu:'Stream Assets',en:'Stream Assets'},tabMerch:{hu:'Merch Factory',en:'Merch Factory'},tabKit:{hu:'Creator Kit',en:'Creator Kit'},
  creatorPlaceholder:{hu:'Streamer / gamer neve',en:'Streamer / gamer name'},channelPlaceholder:{hu:'Twitch / YouTube / TikTok / Gamertag',en:'Twitch / YouTube / TikTok / gamertag'},
  activeAsset:{hu:'AKTÍV ASSET',en:'ACTIVE ASSET'},aiReady:{hu:'AI READY',en:'AI READY'},
  briefPlaceholder:{hu:'Pl. neon fekete-arany gamer HUD, saját logóval és dinamikus alert hangulattal.',en:'E.g. neon black-and-gold gamer HUD with your own logo and a dynamic alert mood.'},
  generating:{hu:'Generálás…',en:'Generating…'},generateAsset:{hu:'Asset generálása',en:'Generate asset'},
  openImage:{hu:'Kép megnyitása / mentése',en:'Open / save image'},manifest:{hu:'Asset manifest',en:'Asset manifest'},copy:{hu:'Másolás',en:'Copy'},
  merchLead:{hu:'T-shirt, hoodie, mug, cap és sticker pack master artwork.',en:'T-shirt, hoodie, mug, cap and sticker pack master artwork.'},
  merchBrief:{hu:'Merch kollekció brief',en:'Merch collection brief'},merchBusy:{hu:'Merch készül…',en:'Creating merch…'},merchMake:{hu:'Merch artwork készítése',en:'Create merch artwork'},
  kitDone:{hu:'Creator workflow kész',en:'Creator workflow ready'},
  kitFlow:{hu:'Creator profil → Brand → Stream Assets → Social → Merch → export.',en:'Creator profile → Brand → Stream assets → Social → Merch → export.'},
  errGenerate:{hu:'A kreatív generálása sikertelen.',en:'Creative generation failed.'},
};

function saveJson(name:string,data:unknown){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u);}

/**
 * A streamer/gamer asset-ek generálása.
 *
 * A `desc` a modellhez angolul megy: egy magyar asset-leiras angol prompt
 * kozben rossz esetben a generalt kep tartalmat is elrontja.
 */
export default function GamerStudio({ language = 'hu' }: { language?: LanguageCode }){
 const hu = language === 'hu';
 const t = (key:string) => (hu ? TEXT[key]?.hu : (TEXT[key]?.en ?? TEXT[key]?.hu)) ?? key;
 const descOf = (a:Asset) => (hu ? a.desc.hu : a.desc.en);
 const [creator,setCreator]=useState(''); const [channel,setChannel]=useState(''); const [style,setStyle]=useState('gaming'); const [brief,setBrief]=useState(''); const [selected,setSelected]=useState<AssetId>('starting'); const [busy,setBusy]=useState(false); const [image,setImage]=useState<string|null>(null); const [error,setError]=useState(''); const [tab,setTab]=useState<'assets'|'merch'|'kit'>('assets');
 const asset=useMemo(()=>ASSETS.find(x=>x.id===selected)!,[selected]);
 async function make(){if(!brief.trim()||busy)return;setBusy(true);setError('');setImage(null);try{const prompt='Professional streamer/gamer asset. Creator: '+creator+'. Channel: '+channel+'. Asset: '+asset.label+' — '+asset.desc.en+'. Brief: '+brief+'. Style: '+style+'. Platform: '+asset.platform+'. Clean production-ready composition, strong gaming identity, readable typography, no platform trademark misuse.';const r=await generateCreativeImage(prompt,RATIO[selected]||'1:1');setImage(r.url);}catch(e){setError(e instanceof Error?e.message:t('errGenerate'))}finally{setBusy(false)}}
 return <div className='mt-8 rounded-3xl border border-line bg-panel/70 p-5 shadow-2xl backdrop-blur-xl'>
  <div className='mb-5 flex flex-wrap items-center justify-between gap-4'><div><div className='text-[10px] uppercase tracking-[.22em] text-accent'>CREATOR / STREAMER / GAMER</div><h2 className='mt-1 flex items-center gap-2 font-display text-2xl text-ink-100'><Gamepad2 className='h-6 w-6 text-accent'/>Streamer & Gamer Studio</h2><p className='mt-1 max-w-4xl text-sm text-ink-400'>{t('subtitle')}</p></div><div className='flex gap-2'>{(['assets','merch','kit'] as const).map(v=><button key={v} onClick={()=>setTab(v)} className={'rounded-full border px-3 py-1.5 text-xs '+(tab===v?'border-accent/70 bg-accent/10 text-accent':'border-line text-ink-300')}>{v==='assets'?t('tabAssets'):v==='merch'?t('tabMerch'):t('tabKit')}</button>)}</div></div>
  {tab!=='kit'&&<div className='mb-5 grid gap-3 md:grid-cols-3'><input className='vp-input' value={creator} onChange={e=>setCreator(e.target.value)} placeholder={t('creatorPlaceholder')}/><input className='vp-input' value={channel} onChange={e=>setChannel(e.target.value)} placeholder={t('channelPlaceholder')}/><select className='vp-input' value={style} onChange={e=>setStyle(e.target.value)}>{['gaming','streamer','esports','cyberpunk','tech_noir','nordic','celtic','minimal','premium','anime','retro'].map(v=><option key={v}>{v}</option>)}</select></div>}
  {tab==='assets'&&<div className='grid gap-5 lg:grid-cols-[300px_1fr]'>
   <aside className='max-h-[680px] overflow-auto rounded-2xl border border-line bg-canvas/70 p-3'>{GROUP_ORDER.map(group=><div key={group} className='mb-4'><div className='mb-2 flex items-center gap-2 px-2 text-[9px] uppercase tracking-[.18em] text-ink-500'>{(()=>{const I=GROUP_ICON[group]||Sparkles;return <I className='h-3.5 w-3.5 text-accent'/>})()}{group}</div>{ASSETS.filter(a=>a.group===group).map(a=><button key={a.id} onClick={()=>{setSelected(a.id);setImage(null)}} className={'mb-1 flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] '+(selected===a.id?'border-accent/50 bg-accent/10 text-accent':'border-transparent text-ink-300 hover:border-line hover:text-ink-100')}><span className='flex-1'>{a.label}</span><span className='text-[9px] text-ink-500'>{a.platform.split(' / ')[0]}</span></button>)}</div>)}</aside>
   <section><div className='rounded-2xl border border-line bg-panel p-5'><div className='flex flex-wrap items-start justify-between gap-3'><div><div className='text-[10px] uppercase tracking-[.18em] text-accent'>{t('activeAsset')}</div><h3 className='mt-1 text-xl text-ink-100'>{asset.label}</h3><p className='mt-1 text-sm text-ink-400'>{descOf(asset)} · {asset.size}</p></div><span className='rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] text-emerald-300'>{t('aiReady')}</span></div><textarea rows={5} className='vp-input mt-4' value={brief} onChange={e=>setBrief(e.target.value)} placeholder={t('briefPlaceholder')}/><button disabled={busy||!brief.trim()} onClick={make} className='vp-btn mt-3'>{busy?<Sparkles className='h-4 w-4 animate-pulse'/>:<Play className='h-4 w-4'/>}{busy?t('generating'):t('generateAsset')}</button>{image&&<div className='mt-5 overflow-hidden rounded-2xl border border-accent/20 bg-black'><img src={image} alt={asset.label} draggable={false} className='max-h-[620px] w-full object-contain'/><div className='flex flex-wrap gap-2 p-3'><a className='vp-btn-ghost' href={image} target='_blank' rel='noreferrer'><Download className='h-4 w-4'/>{t('openImage')}</a><button className='vp-btn-ghost' onClick={()=>saveJson('designly-'+asset.id+'.json',{asset,creator,channel,style,brief,image})}><Download className='h-4 w-4'/>{t('manifest')}</button><button className='vp-btn-ghost' onClick={()=>navigator.clipboard?.writeText(JSON.stringify({asset,creator,channel,style,brief,image}))}><Copy className='h-4 w-4'/>{t('copy')}</button></div></div>}</div></section>
  </div>}
  {tab==='merch'&&<section className='space-y-5'><div className='rounded-2xl border border-line bg-panel p-5'><div className='mb-4 flex items-center gap-3'><Shirt className='h-5 w-5 text-accent'/><div><h3 className='text-xl text-ink-100'>Merch Factory</h3><p className='text-sm text-ink-400'>{t('merchLead')}</p></div></div><div className='grid gap-3 md:grid-cols-2 lg:grid-cols-3'>{ASSETS.filter(a=>a.group==='Merch').map(a=><button key={a.id} onClick={()=>{setSelected(a.id);setBrief(descOf(a))}} className={'rounded-xl border p-4 text-left '+(selected===a.id?'border-accent/60 bg-accent/10':'border-line bg-canvas/40 hover:border-accent/30')}><div className='text-sm text-ink-100'>{a.label}</div><div className='mt-1 text-[11px] text-ink-400'>{a.platform} · {a.size}</div><div className='mt-2 text-xs text-ink-300'>{descOf(a)}</div></button>)}</div><div className='mt-5 grid gap-3 md:grid-cols-3'><input className='vp-input' value={creator} onChange={e=>setCreator(e.target.value)} placeholder={t('creatorPlaceholder')}/><input className='vp-input' value={channel} onChange={e=>setChannel(e.target.value)} placeholder={t('channelPlaceholder')}/><input className='vp-input' value={brief} onChange={e=>setBrief(e.target.value)} placeholder={t('merchBrief')}/></div><button disabled={busy||!brief.trim()} onClick={make} className='vp-btn mt-3'><Shirt className='h-4 w-4'/>{busy?t('merchBusy'):t('merchMake')}</button>{image&&<div className='mt-5 overflow-hidden rounded-2xl border border-line bg-black'><img src={image} alt='Merch artwork' draggable={false} className='max-h-[620px] w-full object-contain'/><div className='flex justify-end p-3'><a href={image} target='_blank' rel='noreferrer' className='vp-btn-ghost'><Download className='h-4 w-4'/>{t('openImage')}</a></div></div>}</div></section>}
  {tab==='kit'&&<section className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'><div className='rounded-2xl border border-line bg-panel p-5'><Radio className='h-5 w-5 text-accent'/><h3 className='mt-3 text-base text-ink-100'>Twitch</h3><p className='mt-2 text-xs leading-5 text-ink-400'>Alerts, overlays, emotes, badges, panels és stream branding.</p></div><div className='rounded-2xl border border-line bg-panel p-5'><Tv className='h-5 w-5 text-accent'/><h3 className='mt-3 text-base text-ink-100'>YouTube</h3><p className='mt-2 text-xs leading-5 text-ink-400'>Thumbnail, banner, LIVE NOW, member és channel graphics.</p></div><div className='rounded-2xl border border-line bg-panel p-5'><Video className='h-5 w-5 text-accent'/><h3 className='mt-3 text-base text-ink-100'>TikTok / Kick</h3><p className='mt-2 text-xs leading-5 text-ink-400'>Vertikális cover, live promo és rövidformátumú kreatív.</p></div><div className='rounded-2xl border border-line bg-panel p-5'><Shirt className='h-5 w-5 text-accent'/><h3 className='mt-3 text-base text-ink-100'>Merch</h3><p className='mt-2 text-xs leading-5 text-ink-400'>{t('merchLead')}</p></div><div className='md:col-span-2 lg:col-span-4 rounded-2xl border border-accent/20 bg-accent/5 p-5'><div className='flex items-center gap-2 text-sm text-accent'><Check className='h-4 w-4'/>{t('kitDone')}</div><p className='mt-2 text-sm text-ink-300'>{t('kitFlow')}</p></div></section>}
 </div>;
}
