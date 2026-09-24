import { useState } from "react";
import { Bird, ChevronDown, Send, Sparkles, X, ArrowRight } from "lucide-react";
import { authHeaders, SUPABASE_URL } from "../lib/supabase-client";
type Action = "landing"|"services"|"agents"|"templates"|"pricing"|"contact"|"create"|"extra"|"gamer"|"workflow";
type Message={role:"huginn"|"user";text:string;action?:Action};
const ACTIONS:Record<Action,{label:string;href:string}>={
 landing:{label:"Főoldal",href:"/"},
 services:{label:"Szolgáltatások",href:"/#services"},
 agents:{label:"Agentek",href:"/#agents"},
 templates:{label:"Sablonok",href:"/#templates"},
 pricing:{label:"Árak",href:"/#pricing"},
 contact:{label:"Kapcsolat",href:"/#contact"},
 create:{label:"Generátor megnyitása",href:"/app"},
 extra:{label:"Extra Stúdió",href:"/app?tab=studio"},
 gamer:{label:"Streamer & Gamer",href:"/app?tab=gamer"},
 workflow:{label:"Workflow",href:"/app"},
};
function fallback(message:string):{text:string;action?:Action}{
 const q=message.trim().toLowerCase();
 if(/ár|árak|csomag|kredit|price|pricing/.test(q)) return {text:"Az árakról a DESIGNLY árképzés szekciójában találsz információt.",action:"pricing"};
 if(/ment|letölt|export/.test(q)) return {text:"A generált oldal alatt találod a Mentés, HTML letöltés és JSON export gombokat.",action:"create"};
 if(/szerkeszt|módosít|világos|sötét/.test(q)) return {text:"A generált oldal alatt nyisd meg a Szerkesztőt, írd le a módosítást, majd válaszd az Alkalmaz gombot.",action:"create"};
 if(/stream|gamer|twitch|youtube|merch/.test(q)) return {text:"A Streamer & Gamer Studio kezeli az overlayeket, alertokat, thumbnailokat, emote-okat, badge-eket és merch artworköt.",action:"gamer"};
 if(/brand|arculat|logó/.test(q)) return {text:"A Brand Studio kezeli a logót, színpalettát, tipográfiát, brand voice-ot és a Brand Kitet.",action:"extra"};
 if(/sablon|template/.test(q)) return {text:"A sablongalériát a DESIGNLY workspace Sablonok fülén találod.",action:"templates"};
 if(/weboldal|honlap|website|generál/.test(q)) return {text:"Írd le, milyen weboldalt építsünk, és a VYRON CORE elindítja a folyamatot.",action:"create"};
 return {text:"HUGINN a DESIGNLY beépített guide-ja. Kérdezz a modulokról vagy mondd el, mit szeretnél létrehozni."};
}
export default function HuginnAgent(){
 const [open,setOpen]=useState(false),[input,setInput]=useState(""),[busy,setBusy]=useState(false);
 const [messages,setMessages]=useState<Message[]>([{role:"huginn",text:"HUGINN online. VYRON CORE irányítja a DESIGNLY agentcsapatot. Kérdezz bátran."}]);
 async function send(message=input.trim()){
  if(!message||busy)return; setInput(""); setMessages(m=>[...m,{role:"user",text:message}]); setBusy(true);
  const url=SUPABASE_URL;
  try{
   const controller=new AbortController(); const timeout=window.setTimeout(()=>controller.abort(),9000);
   const r=await fetch(url+"/functions/v1/designly-huginn",{method:"POST",headers:await authHeaders(false),body:JSON.stringify({message,language:new URLSearchParams(window.location.search).get("lang")||"hu"}),signal:controller.signal});
   window.clearTimeout(timeout);
   const d=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(d.message||d.error||"HUGINN hiba");
   const action=typeof d.action==="string"&&d.action in ACTIONS?d.action as Action:undefined;
   setMessages(m=>[...m,{role:"huginn",text:String(d.reply||fallback(message).text),action}]);
  }catch{
   const fb=fallback(message); setMessages(m=>[...m,{role:"huginn",text:fb.text,action:fb.action}]);
  }finally{setBusy(false);}
 }
 return <div className={"fixed bottom-5 right-5 z-[80] "+(open?"w-[min(390px,calc(100vw-2rem))]":"w-auto")}>
  {open&&<section className="mb-3 overflow-hidden rounded-2xl border border-accent/30 bg-panel/95 shadow-2xl backdrop-blur">
   <div className="flex items-center gap-3 border-b border-line px-4 py-3"><span className="grid h-9 w-9 place-items-center rounded-full border border-accent/40 bg-accent/10"><Bird className="h-4 w-4 text-accent"/></span><div className="min-w-0 flex-1"><div className="text-xs font-semibold tracking-[.18em] text-ink-100">HUGINN</div><div className="text-[10px] text-ink-400">VYRON CORE</div></div><button type="button" onClick={()=>setOpen(false)} className="text-ink-400 hover:text-ink-100" aria-label="Bezárás"><X className="h-4 w-4"/></button></div>
   <div className="max-h-80 space-y-2 overflow-auto p-3">{messages.map((m,i)=><div key={i} className={"max-w-[92%] rounded-xl border px-3 py-2 text-xs leading-5 "+(m.role==="user"?"ml-auto border-accent/20 bg-accent/10 text-ink-100":"border-line bg-panel-hi text-ink-200")}>{m.text}{m.role==="huginn"&&m.action&&<div className="mt-2"><a href={ACTIONS[m.action].href} className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 px-2.5 py-1.5 text-[10px] font-semibold text-accent hover:bg-accent/10">{ACTIONS[m.action].label}<ArrowRight className="h-3 w-3"/></a></div>}</div>)}{busy&&<div className="text-[10px] text-ink-400">HUGINN / VYRON CORE dolgozik…</div>}</div>
   <form onSubmit={e=>{e.preventDefault();void send();}} className="flex gap-2 border-t border-line p-3"><input value={input} onChange={e=>setInput(e.target.value)} maxLength={500} placeholder="Kérdezz HUGINN-tól…" className="vp-input min-w-0 flex-1"/><button disabled={busy||!input.trim()} className="vp-btn px-3" aria-label="Küldés"><Send className="h-4 w-4"/></button></form>
  </section>}
  <button type="button" onClick={()=>setOpen(v=>!v)} className="ml-auto flex items-center gap-2 rounded-full border border-accent/40 bg-panel/95 px-4 py-2.5 text-xs text-ink-100 shadow-xl backdrop-blur"><span className="flex -space-x-2"><span className="grid h-7 w-7 place-items-center rounded-full border border-accent/30 bg-canvas"><Bird className="h-3.5 w-3.5 text-accent"/></span><span className="grid h-7 w-7 place-items-center rounded-full border border-accent/20 bg-panel-hi text-[9px] font-bold text-accent">V</span></span><span>{open?"HUGINN / VYRON":"HUGINN"}</span>{open?<ChevronDown className="h-3.5 w-3.5"/>:<Sparkles className="h-3.5 w-3.5 text-accent"/>}</button>
 </div>;
}