import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Gift, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase, SUPABASE_URL, PUBLISHABLE_KEY } from '../lib/supabase-client';

type Role='owner'|'admin';
type Plan={id:string;name:string;credits_monthly:number;price_huf:number|null};

async function adminHeaders(){
  const {data}=await supabase.auth.getSession();
  const token=data.session?.access_token;
  if(!token) throw new Error('Jelentkezz be admin művelethez.');
  return {'Content-Type':'application/json',apikey:PUBLISHABLE_KEY,Authorization:'Bearer '+token};
}

export default function AdminPanel(){
  const [role,setRole]=useState<Role|null>(null);
  const [email,setEmail]=useState('');
  const [credits,setCredits]=useState('100');
  const [giftType,setGiftType]=useState<'full_unlock'|'plan'|'credits'>('full_unlock');
  const [planId,setPlanId]=useState('pro');
  const [plans,setPlans]=useState<Plan[]>([]);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');

  useEffect(()=>{void (async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setError('Nincs bejelentkezett felhasználó.');return;}
    const {data}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();
    const r=data?.role;
    if(r!=='owner'&&r!=='admin'){setError('Nincs adminisztrátori hozzáférésed.');return;}
    setRole(r);
    const p=await supabase.from('plans').select('id,name,credits_monthly,price_huf').order('price_huf',{ascending:true,nullsFirst:true});
    if(!p.error) setPlans((p.data??[]) as Plan[]);
  })()},[]);

  async function submit(e:FormEvent){
    e.preventDefault();
    if(busy||!email.trim()) return;
    setBusy(true);setError('');setNotice('');
    try{
      const headers=await adminHeaders();
      const body=
        giftType==='credits'
          ? {action:'grant_credits',email:email.trim(),credits:Number(credits)}
          : {action:'gift',email:email.trim(),giftType,planId:giftType==='plan'?planId:undefined};
      const res=await fetch(SUPABASE_URL+'/functions/v1/admin-gift',{method:'POST',headers,body:JSON.stringify(body)});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.message||data.error||'Az admin művelet sikertelen.');
      setNotice(data.message||'Művelet sikeresen végrehajtva.');
    }catch(err){setError(err instanceof Error?err.message:'Ismeretlen hiba.');}
    finally{setBusy(false);}
  }

  if(error && !role) return <div className="grid min-h-screen place-items-center bg-canvas px-6"><div className="max-w-md rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-red-200"><h1 className="font-display text-2xl text-ink-100">Admin hozzáférés</h1><p className="mt-3 text-sm">{error}</p><a className="vp-btn-ghost mt-5 inline-flex" href="/app"><ArrowLeft className="h-4 w-4"/> Vissza</a></div></div>;
  if(!role) return <div className="grid min-h-screen place-items-center bg-canvas text-ink-300">Admin panel betöltése…</div>;

  return <div className="min-h-screen bg-canvas px-6 py-10">
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div><div className="text-[10px] uppercase tracking-[.24em] text-accent">DESIGNLY CONTROL</div><h1 className="mt-1 flex items-center gap-2 font-display text-3xl text-ink-100"><ShieldCheck className="h-6 w-6 text-accent"/> Admin Menü</h1><p className="mt-2 text-sm text-ink-400">Szerepkör: <span className="text-ink-100">{role}</span></p></div>
        <a href="/app" className="vp-btn-ghost"><ArrowLeft className="h-4 w-4"/> Workspace</a>
      </div>

      <section className="vp-card p-6">
        <div className="mb-5 flex items-center gap-3"><Gift className="h-5 w-5 text-accent"/><div><h2 className="text-xl text-ink-100">Kredit / hozzáférés ajándékozás</h2><p className="text-xs text-ink-400">A meglévő admin-gift backend használatával.</p></div></div>
        <form onSubmit={submit} className="space-y-4">
          <input className="vp-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Felhasználó e-mail címe" required/>
          <div className="grid gap-3 md:grid-cols-3">
            <select className="vp-input" value={giftType} onChange={e=>setGiftType(e.target.value as typeof giftType)}>
              <option value="full_unlock">Teljes feloldás</option>
              <option value="plan">Terv / csomag</option>
              <option value="credits">Kredit jóváírás</option>
            </select>
            {giftType==='plan' ? <select className="vp-input" value={planId} onChange={e=>setPlanId(e.target.value)}>{plans.map(p=><option key={p.id} value={p.id}>{p.name} · {p.credits_monthly} kredit</option>)}</select> : <div/>}
            {giftType==='credits' ? <input className="vp-input" type="number" min="1" max="100000000" value={credits} onChange={e=>setCredits(e.target.value)} placeholder="Kredit"/> : <div/>}
          </div>
          <button className="vp-btn" disabled={busy||!email.trim()}>{busy?<Sparkles className="h-4 w-4 animate-pulse"/>:<Gift className="h-4 w-4"/>}{busy?'Feldolgozás…':'Művelet végrehajtása'}</button>
        </form>
        {notice&&<div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</div>}
        {error&&<div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      </section>
    </div>
  </div>;
}
