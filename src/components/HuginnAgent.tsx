import { useState } from "react";
import { Bird, ChevronDown, Send, Sparkles, X } from "lucide-react";
type Message={role:"huginn"|"user";text:string};
export default function HuginnAgent(){
 const [open,setOpen]=useState(false); const [input,setInput]=useState(""); const [busy,setBusy]=useState(false);
 const [messages,setMessages]=useState<Message[]>([{role:"huginn",text:"HUGINN online. VYRON CORE irányítja a DESIGNLY agentcsapatot. Kérdezz bátran."}]);
 async function send(message=input.trim()){
  if(!message||busy)return; setInput(""); setMessages(m=>[...m,{role:"user",text:message}]); setBusy(true);
  try{const url=(import.meta.env.VITE_SUPABASE_URL as string|undefined)?.trim()||"https://mxrgdcvmxzhocbdhtlhg.supabase.co";
   const r=await fetch(url+"/functions/v1/designly-huginn",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message,language:"hu"})});
   const d=await r.json().catch(()=>({})); if(!r.ok)throw new Error(d.message||d.error||"HUGINN hiba");
   setMessages(m=>[...m,{role:"huginn",text:String(d.reply||"")}]);
  }catch(e){setMessages(m=>[...m,{role:"huginn",text:e instanceof Error?e.message:"HUGINN nem érhető el."}]);}
  finally{setBusy(false);}
 }
 return <div className={"fixed bottom-5 right-5 z-[80] "+(open?"w-[min(390px,calc(100vw-2rem))]":"w-auto")}>
  {open&&<section className="mb-3 overflow-hidden rounded-2xl border border-accent/30 bg-panel/95 shadow-2xl backdrop-blur">
   <div className="flex items-center gap-3 border-b border-line px-4 py-3"><span className="grid h-9 w-9 place-items-center rounded-full border border-accent/40 bg-accent/10"><Bird className="h-4 w-4 text-accent"/></span><div className="min-w-0 flex-1"><div className="text-xs font-semibold tracking-[.18em] text-ink-100">HUGINN</div><div className="text-[10px] text-ink-400">MUNINN · VYRON CORE</div></div><button type="button" onClick={()=>setOpen(false)} className="text-ink-400 hover:text-ink-100" aria-label="Bezárás"><X className="h-4 w-4"/></button></div>
   <div className="max-h-72 space-y-2 overflow-auto p-3">{messages.map((m,i)=><div key={i} className={"max-w-[88%] rounded-xl border px-3 py-2 text-xs leading-5 "+(m.role==="user"?"ml-auto border-accent/20 bg-accent/10 text-ink-100":"border-line bg-panel-hi text-ink-200")}>{m.text}</div>)}{busy&&<div className="text-[10px] text-ink-400">HUGINN / VYRON CORE dolgozik…</div>}</div>
   <form onSubmit={e=>{e.preventDefault();void send();}} className="flex gap-2 border-t border-line p-3"><input value={input} onChange={e=>setInput(e.target.value)} maxLength={500} placeholder="Kérdezz HUGINN-tól…" className="vp-input min-w-0 flex-1"/><button disabled={busy||!input.trim()} className="vp-btn px-3" aria-label="Küldés"><Send className="h-4 w-4"/></button></form>
  </section>}
  <button type="button" onClick={()=>setOpen(v=>!v)} className="ml-auto flex items-center gap-2 rounded-full border border-accent/40 bg-panel/95 px-4 py-2.5 text-xs text-ink-100 shadow-xl backdrop-blur"><span className="flex -space-x-2"><span className="grid h-7 w-7 place-items-center rounded-full border border-accent/30 bg-canvas"><Bird className="h-3.5 w-3.5 text-accent"/></span><span className="grid h-7 w-7 place-items-center rounded-full border border-accent/20 bg-panel-hi text-[9px] font-bold text-accent">V</span></span><span>{open?"HUGINN / VYRON":"HUGINN"}</span>{open?<ChevronDown className="h-3.5 w-3.5"/>:<Sparkles className="h-3.5 w-3.5 text-accent"/>}</button>
 </div>;
}