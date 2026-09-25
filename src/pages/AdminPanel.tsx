import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Check, ChevronRight, CreditCard, Gift, History, Loader2, RefreshCw, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Users, X } from 'lucide-react';
import { supabase, SUPABASE_URL, PUBLISHABLE_KEY } from '../lib/supabase-client';

type Role='owner'|'admin';
type Plan={id:string;name:string;credits_monthly:number;price_monthly:number;project_limit:number;features:string[];is_public:boolean;sort_order:number};
type UserRow={id:string;email:string;full_name:string|null;role:string;plan_id:string;credits:number;unlimited_access:boolean;created_at:string;updated_at:string};
type Gift={id:string;email:string;target_user_id:string|null;gift_type:string;plan_id:string|null;previous_plan_id:string|null;previous_credits:number|null;status:string;granted_by:string|null;created_at:string;activated_at:string|null;revoked_at:string|null};
type Audit={id:string;actor_user_id:string|null;action:string;target_email:string|null;target_user_id:string|null;metadata:Record<string,unknown>;created_at:string};
type Job={id:string;user_id:string;type:string;status:string;provider:string;credits_cost:number;created_at:string;completed_at:string|null;error:string|null};
type Payment={id:string;user_id:string;amount:number;currency:string;type:string;status:string;provider:string;provider_payment_id:string|null;created_at:string};
type Setting={key:string;value:unknown;description:string;updated_at:string};
type Overview={profiles:UserRow[];plans:Plan[];gifts:Gift[];audit:Audit[];jobs:Job[];payments:Payment[];settings:Setting[]};

const TABS=[
  ['overview','Áttekintés',BarChart3],
  ['users','Felhasználók',Users],
  ['plans','Csomagok',CreditCard],
  ['gifts','Ajándékok',Gift],
  ['activity','Napló / AI',History],
  ['settings','Beállítások',Settings],
] as const;

async function adminHeaders(){
  const {data}=await supabase.auth.getSession();
  const token=data.session?.access_token;
  if(!token) throw new Error('Jelentkezz be admin művelethez.');
  return {'Content-Type':'application/json',apikey:PUBLISHABLE_KEY,Authorization:'Bearer '+token};
}

export default function AdminPanel(){
  const [role,setRole]=useState<Role|null>(null);
  const [tab,setTab]=useState<(typeof TABS)[number][0]>('overview');
  const [data,setData]=useState<Overview|null>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [search,setSearch]=useState('');
  const [giftEmail,setGiftEmail]=useState('');
  const [giftType,setGiftType]=useState<'full_unlock'|'plan'>('full_unlock');
  const [giftPlan,setGiftPlan]=useState('pro');
  const [userPlan,setUserPlan]=useState<Record<string,string>>({});
  const [userCredits,setUserCredits]=useState<Record<string,string>>({});
  const [userUnlimited,setUserUnlimited]=useState<Record<string,boolean>>({});
  const [settingDraft,setSettingDraft]=useState<Record<string,string>>({});

  const load=useCallback(async()=>{
    setBusy(true);setError('');
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user) throw new Error('Nincs bejelentkezett felhasználó.');
      const profile=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();
      const r=profile.data?.role;
      if(r!=='owner'&&r!=='admin') throw new Error('Nincs adminisztrátori hozzáférésed.');
      setRole(r);
      const headers=await adminHeaders();
      const res=await fetch(SUPABASE_URL+'/functions/v1/admin-control',{method:'POST',headers,body:JSON.stringify({action:'overview'})});
      const json=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(json.error||'Az admin adatok betöltése sikertelen.');
      setData(json as Overview);
    }catch(e){setError(e instanceof Error?e.message:'Ismeretlen hiba.');}
    finally{setBusy(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  const call=useCallback(async(action:string,payload:Record<string,unknown>={})=>{
    setBusy(true);setError('');setNotice('');
    try{
      const headers=await adminHeaders();
      const res=await fetch(SUPABASE_URL+'/functions/v1/admin-control',{method:'POST',headers,body:JSON.stringify({action,...payload})});
      const json=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(json.error||'Admin művelet sikertelen.');
      setNotice(json.message||'Művelet sikeresen végrehajtva.');
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Ismeretlen hiba.');}
    finally{setBusy(false);}
  },[load]);

  const users=useMemo(()=>data?.profiles.filter(u=>{
    const q=search.trim().toLowerCase(); if(!q) return true;
    return u.email.toLowerCase().includes(q)||(u.full_name??'').toLowerCase().includes(q)||u.plan_id.toLowerCase().includes(q);
  })??[],[data,search]);

  const stats=useMemo(()=>{
    const p=data?.profiles??[];
    return {
      users:p.length,
      active:p.filter(u=>u.plan_id!=='free'||u.unlimited_access).length,
      credits:p.reduce((a,u)=>a+u.credits,0),
      admins:p.filter(u=>u.role==='admin'||u.role==='owner').length,
      jobs:(data?.jobs??[]).length,
      payments:(data?.payments??[]).length,
    };
  },[data]);

  async function submitGift(e:FormEvent){
    e.preventDefault();
    if(!giftEmail.trim())return;
    await call('gift',{email:giftEmail.trim(),giftType,planId:giftType==='plan'?giftPlan:undefined});
  }

  if(error && !role) return <div className='grid min-h-screen place-items-center bg-canvas px-6'><div className='max-w-md rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-red-200'><h1 className='font-display text-2xl text-ink-100'>Admin hozzáférés</h1><p className='mt-3 text-sm'>{error}</p><a className='vp-btn-ghost mt-5 inline-flex' href='/app'><ArrowLeft className='h-4 w-4'/> Vissza</a></div></div>;
  if(!role||!data) return <div className='grid min-h-screen place-items-center bg-canvas text-ink-300'><Loader2 className='mr-2 h-5 w-5 animate-spin'/> Admin panel betöltése…</div>;

  return <div className='min-h-screen bg-canvas px-4 py-6 sm:px-6 sm:py-10'>
    <div className='mx-auto max-w-7xl'>
      <header className='mb-6 flex flex-wrap items-center justify-between gap-4'>
        <div><div className='text-[10px] uppercase tracking-[.24em] text-accent'>DESIGNLY CONTROL</div><h1 className='mt-1 flex items-center gap-2 font-display text-3xl text-ink-100'><ShieldCheck className='h-6 w-6 text-accent'/> Admin Menü</h1><p className='mt-2 text-sm text-ink-400'>Szerepkör: <span className='text-ink-100'>{role}</span> · {stats.users} felhasználó</p></div>
        <div className='flex items-center gap-2'><button className='vp-btn-ghost' onClick={()=>void load()} disabled={busy}><RefreshCw className={'h-4 w-4 '+(busy?'animate-spin':'')}/> Frissítés</button><a href='/app' className='vp-btn-ghost'><ArrowLeft className='h-4 w-4'/> Workspace</a></div>
      </header>

      <div className='mb-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6'>
        {[['Felhasználók',stats.users],['Aktív csomagok',stats.active],['Összes kredit',stats.credits],['Adminok',stats.admins],['AI jobok',stats.jobs],['Fizetések',stats.payments]].map(([label,value])=><div key={String(label)} className='rounded-2xl border border-line bg-panel/70 p-4'><div className='text-[10px] uppercase tracking-wider text-ink-500'>{label}</div><div className='mt-1 text-2xl font-semibold text-ink-100'>{value}</div></div>)}
      </div>

      <nav className='mb-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6'>
        {TABS.map(([id,label,Icon])=><button key={id} type='button' onClick={()=>setTab(id)} className={'flex items-center gap-2 rounded-xl border px-4 py-3 text-xs '+(tab===id?'border-accent/70 bg-accent/10 text-accent':'border-line text-ink-300 hover:border-accent/30')}><Icon className='h-4 w-4'/>{label}</button>)}
      </nav>

      {notice&&<div className='mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300'><Check className='h-4 w-4'/>{notice}</div>}
      {error&&<div className='mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'><X className='h-4 w-4'/>{error}</div>}

      {tab==='overview'&&<div className='grid gap-5 lg:grid-cols-[1.3fr_.7fr]'>
        <section className='vp-card p-5'><div className='mb-4 flex items-center justify-between'><div><div className='text-[10px] uppercase tracking-widest text-accent'>SYSTEM SNAPSHOT</div><h2 className='mt-1 font-display text-2xl text-ink-100'>Rendszerállapot</h2></div><SlidersHorizontal className='h-5 w-5 text-accent'/></div>
          <div className='grid gap-3 sm:grid-cols-2'>{data.jobs.slice(0,8).map(j=><div key={j.id} className='rounded-xl border border-line bg-canvas/40 p-3'><div className='flex items-center justify-between gap-2'><span className='text-xs font-semibold text-ink-100'>{j.type}</span><span className='text-[10px] text-accent'>{j.status}</span></div><div className='mt-1 text-[10px] text-ink-500'>{j.provider} · {j.credits_cost} kredit</div>{j.error&&<div className='mt-2 text-[10px] text-red-300'>{j.error}</div>}</div>)}</div>
        </section>
        <section className='vp-card p-5'><div className='text-[10px] uppercase tracking-widest text-accent'>PLANS</div><h2 className='mt-1 font-display text-2xl text-ink-100'>Csomagok</h2><div className='mt-4 space-y-2'>{data.plans.map(p=><div key={p.id} className='flex items-center justify-between rounded-xl border border-line px-3 py-3'><div><div className='text-xs font-semibold'>{p.name}</div><div className='text-[10px] text-ink-500'>{p.price_monthly.toLocaleString('hu-HU')} Ft · {p.credits_monthly} kredit</div></div><ChevronRight className='h-4 w-4 text-ink-600'/></div>)}</div></section>
      </div>}

      {tab==='users'&&<section className='vp-card p-5'><div className='mb-4 flex flex-wrap items-center justify-between gap-3'><div><div className='text-[10px] uppercase tracking-widest text-accent'>USER MANAGEMENT</div><h2 className='mt-1 font-display text-2xl'>Felhasználók</h2></div><div className='relative w-full max-w-md'><Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600'/><input className='vp-input pl-9' value={search} onChange={e=>setSearch(e.target.value)} placeholder='Email, név vagy csomag…'/></div></div>
        <div className='overflow-x-auto'><table className='w-full min-w-[980px] text-left text-xs'><thead><tr className='border-b border-line text-ink-500'><th className='p-2'>Felhasználó</th><th className='p-2'>Szerep</th><th className='p-2'>Csomag</th><th className='p-2'>Kredit</th><th className='p-2'>Unlimited</th><th className='p-2'>Műveletek</th></tr></thead><tbody>{users.map(u=><tr key={u.id} className='border-b border-line/60 align-top'><td className='p-2'><div className='font-medium text-ink-100'>{u.full_name||'—'}</div><div className='text-ink-500'>{u.email}</div></td><td className='p-2'><span className='rounded-full border border-line px-2 py-1'>{u.role}</span></td><td className='p-2'><select className='vp-input !w-40' value={userPlan[u.id] || u.plan_id} onChange={e=>setUserPlan({...userPlan,[u.id]:e.target.value)}>{data.plans.map(p=><option key={p.id} value={p.id}>{p.id}</option>)}</select></td><td className='p-2'><input className='vp-input !w-28' type='number' min='0' max='10000000' value={userCredits[u.id] || String(u.credits)} onChange={e=>setUserCredits({...userCredits,[u.id]:e.target.value})}/></td><td className='p-2'><input type='checkbox' checked={userUnlimited[u.id] !== undefined ? userUnlimited[u.id] : u.unlimited_access} onChange={e=>setUserUnlimited({...userUnlimited,[u.id]:e.target.checked})}/></td><td className='p-2'><div className='flex flex-wrap gap-2'><button className='vp-btn-ghost' onClick={()=>void call('set_plan',{userId:u.id,planId:userPlan[u.id] || u.plan_id})}>Csomag</button><button className='vp-btn-ghost' onClick={()=>void call('set_credits',{userId:u.id,credits:Number(userCredits[u.id] || u.credits)})}>Kredit</button><button className='vp-btn-ghost' onClick={()=>void call('set_unlimited',{userId:u.id,enabled:userUnlimited[u.id] !== undefined ? userUnlimited[u.id] : u.unlimited_access})>Unlimited</button>{role==='owner'&&<button className='vp-btn-ghost' onClick={()=>void call('set_role',{userId:u.id,role:u.role==='admin'?'user':'admin'})}>{u.role==='admin'?'User':'Admin'}</button>}</div></td></tr>)}</tbody></table></div>
      </section>}

      {tab==='plans'&&<section className='vp-card p-5'><div className='mb-4'><div className='text-[10px] uppercase tracking-widest text-accent'>BILLING CONFIGURATION</div><h2 className='mt-1 font-display text-2xl'>Csomagok és limitek</h2><p className='mt-1 text-sm text-ink-400'>Az árak és kreditkeretek központilag módosíthatók. Csak owner módosíthat.</p></div>
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>{data.plans.map(p=><PlanCard key={p.id} plan={p} locked={role!=='owner'} onSave={payload=>void call('save_plan',payload)}/>)}</div>
      </section>}

      {tab==='gifts'&&<div className='grid gap-5 lg:grid-cols-[.8fr_1.2fr]'>
        <section className='vp-card p-5'><div className='mb-4 flex items-center gap-3'><Gift className='h-5 w-5 text-accent'/><div><h2 className='font-display text-2xl'>Hozzáférés ajándékozása</h2><p className='text-xs text-ink-400'>Biztonságos szerveroldali admin művelet.</p></div></div>
          <form onSubmit={submitGift} className='space-y-3'><input className='vp-input' type='email' required value={giftEmail} onChange={e=>setGiftEmail(e.target.value)} placeholder='Felhasználó e-mail címe'/><select className='vp-input' value={giftType} onChange={e=>setGiftType(e.target.value as typeof giftType)}><option value='full_unlock'>Teljes feloldás</option><option value='plan'>Csomag ajándékozása</option></select>{giftType==='plan'&&<select className='vp-input' value={giftPlan} onChange={e=>setGiftPlan(e.target.value)}>{data.plans.map(p=><option key={p.id} value={p.id}>{p.name} · {p.credits_monthly} kredit</option>)}</select>}<button className='vp-btn w-full' disabled={busy}><Gift className='h-4 w-4'/>{busy?'Feldolgozás…':'Ajándék kiosztása'}</button></form>
        </section>
        <section className='vp-card p-5'><div className='mb-3 flex items-center gap-3'><History className='h-5 w-5 text-accent'/><div><h2 className='font-display text-2xl'>Ajándékozási előzmények</h2><p className='text-xs text-ink-400'>Legutóbbi admin hozzáférés-módosítások.</p></div></div><div className='space-y-2'>{data.gifts.map(g=><div key={g.id} className='rounded-xl border border-line p-3'><div className='flex items-center justify-between gap-3'><span className='text-xs font-semibold'>{g.email}</span><span className='text-[10px] text-accent'>{g.status}</span></div><div className='mt-1 text-[10px] text-ink-500'>{g.gift_type} · {g.plan_id??'FULL UNLOCK'} · {new Date(g.created_at).toLocaleString('hu-HU')}</div></div>)}</div></section>
      </div>}

      {tab==='activity'&&<div className='grid gap-5 lg:grid-cols-2'>
        <section className='vp-card p-5'><div className='mb-3 flex items-center gap-3'><Sparkles className='h-5 w-5 text-accent'/><h2 className='font-display text-2xl'>AI jobok</h2></div>{data.jobs.map(j=><div key={j.id} className='border-b border-line py-3 last:border-0'><div className='flex items-center justify-between'><span className='text-xs font-medium'>{j.type}</span><span className='text-[10px] text-accent'>{j.status}</span></div><div className='text-[10px] text-ink-500'>{j.provider} · {j.credits_cost} kredit · {new Date(j.created_at).toLocaleString('hu-HU')}</div></div>)}</section>
        <section className='vp-card p-5'><div className='mb-3 flex items-center gap-3'><History className='h-5 w-5 text-accent'/><h2 className='font-display text-2xl'>Admin audit</h2></div>{data.audit.map(a=><div key={a.id} className='border-b border-line py-3 last:border-0'><div className='text-xs font-medium'>{a.action}</div><div className='mt-1 text-[10px] text-ink-500'>{a.target_email??'—'} · {new Date(a.created_at).toLocaleString('hu-HU')}</div></div>)}</section>
        <section className='vp-card p-5 lg:col-span-2'><div className='mb-3 flex items-center gap-3'><CreditCard className='h-5 w-5 text-accent'/><h2 className='font-display text-2xl'>Fizetési események</h2></div>{data.payments.map(p=><div key={p.id} className='border-b border-line py-3 last:border-0'><div className='flex items-center justify-between'><span className='text-xs'>{p.type} · {p.provider}</span><span className='text-xs text-accent'>{p.amount.toLocaleString('hu-HU')} {p.currency}</span></div><div className='text-[10px] text-ink-500'>{p.status} · {new Date(p.created_at).toLocaleString('hu-HU')}</div></div>)}</section>
      </div>}

      {tab==='settings'&&<section className='vp-card p-5'><div className='mb-4'><div className='text-[10px] uppercase tracking-widest text-accent'>SYSTEM SETTINGS</div><h2 className='mt-1 font-display text-2xl'>Rendszerbeállítások</h2><p className='mt-1 text-sm text-ink-400'>Bizalmas kulcsok itt nem jelennek meg és nem szerkeszthetők.</p></div>
        <div className='grid gap-3'>{data.settings.map(s=><div key={s.key} className='rounded-xl border border-line p-4'><div className='flex flex-wrap items-center justify-between gap-3'><div><div className='text-xs font-semibold text-ink-100'>{s.key}</div><div className='text-[10px] text-ink-500'>{s.description}</div></div>{role==='owner'&&<button className='vp-btn-ghost' onClick={()=>void call('save_setting',{key:s.key,value:settingDraft[s.key]??JSON.stringify(s.value),description:s.description})}>Mentés</button>}</div>{role==='owner'&&<input className='vp-input mt-3' value={settingDraft[s.key]??JSON.stringify(s.value)} onChange={e=>setSettingDraft({...settingDraft,[s.key]:e.target.value})}/>}<pre className='mt-3 overflow-auto rounded-lg bg-black/40 p-3 text-[10px] text-ink-500'>{JSON.stringify(s.value,null,2)}</pre></div>)}</div>
      </section>}
    </div>
  </div>;
}

function PlanCard({plan,locked,onSave}:{plan:Plan;locked:boolean;onSave:(payload:Record<string,unknown>)=>void}){
  const [price,setPrice]=useState(String(plan.price_monthly));
  const [credits,setCredits]=useState(String(plan.credits_monthly));
  const [limit,setLimit]=useState(String(plan.project_limit));
  const [isPublic,setIsPublic]=useState(plan.is_public);
  useEffect(()=>{setPrice(String(plan.price_monthly));setCredits(String(plan.credits_monthly));setLimit(String(plan.project_limit));setIsPublic(plan.is_public);},[plan]);
  return <div className='rounded-2xl border border-line bg-canvas/40 p-4'><div className='flex items-center justify-between'><div><div className='text-xs font-bold uppercase'>{plan.name}</div><div className='mt-1 text-[10px] text-ink-500'>{plan.id}</div></div>{plan.id==='owner'&&<span className='text-[9px] text-accent'>SYSTEM</span>}</div><div className='mt-4 grid gap-2'><label className='text-[10px] text-ink-500'>Havi ár (Ft)<input className='vp-input mt-1' type='number' min='0' value={price} onChange={e=>setPrice(e.target.value)} disabled={locked}/></label><label className='text-[10px] text-ink-500'>Havi kredit<input className='vp-input mt-1' type='number' min='0' value={credits} onChange={e=>setCredits(e.target.value)} disabled={locked}/></label><label className='text-[10px] text-ink-500'>Projekt limit<input className='vp-input mt-1' type='number' min='0' value={limit} onChange={e=>setLimit(e.target.value)} disabled={locked}/></label><label className='flex items-center gap-2 text-[10px] text-ink-400'><input type='checkbox' checked={isPublic} onChange={e=>setIsPublic(e.target.checked)} disabled={locked}/> Nyilvános csomag</label></div><button className='vp-btn mt-4 w-full' disabled={locked} onClick={()=>onSave({id:plan.id,price_monthly:Number(price),credits_monthly:Number(credits),project_limit:Number(limit),is_public:isPublic})}><Check className='h-4 w-4'/>Mentés</button></div>;
}
