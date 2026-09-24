import { useEffect, useState } from "react";
import { Bird, ChevronDown, Send, Sparkles, X, ArrowRight } from "lucide-react";
import { authHeaders, SUPABASE_URL } from "../lib/supabase-client";
import { LANGUAGES, type LanguageCode } from "../lib/constants";

type Action = "landing"|"services"|"agents"|"templates"|"pricing"|"contact"|"create"|"extra"|"gamer"|"workflow";
type Message={role:"huginn"|"user";text:string;action?:Action};

/**
 * A HUGINN action-gombjai.
 *
 * A cimke KULCS, nem kesz szoveg: a gomb felirata a felulet nyelvet koveti,
 * a celpont viszont valtozatlan. Korabban a cimke volt az egyetlen forras, es
 * a HUGINN magyarul valaszolt akkor is, ha a felhasznalo angolul kerdezett.
 */
const ACTIONS:Record<Action,{hu:string;en:string;href:string}> = {
 landing:{hu:"Főoldal",en:"Home",href:"/"},
 services:{hu:"Szolgáltatások",en:"Services",href:"/#services"},
 agents:{hu:"Agentek",en:"Agents",href:"/#agents"},
 templates:{hu:"Sablonok",en:"Templates",href:"/#templates"},
 pricing:{hu:"Árak",en:"Pricing",href:"/#pricing"},
 contact:{hu:"Kapcsolat",en:"Contact",href:"/#contact"},
 create:{hu:"Generátor megnyitása",en:"Open the generator",href:"/app"},
 extra:{hu:"Extra Stúdió",en:"Extra Studio",href:"/app?tab=studio"},
 gamer:{hu:"Streamer & Gamer",en:"Streamer & Gamer",href:"/app?tab=gamer"},
 workflow:{hu:"Workflow",en:"Workflow",href:"/app"},
};

const TEXT: Record<string, { hu: string; en: string }> = {
  greeting: { hu: 'HUGINN online. VYRON CORE irányítja a DESIGNLY agentcsapatot. Kérdezz bátran.', en: 'HUGINN online. VYRON CORE runs the DESIGNLY agent team. Ask away.' },
  working: { hu: 'HUGINN / VYRON CORE dolgozik…', en: 'HUGINN / VYRON CORE is working…' },
  placeholder: { hu: 'Kérdezz HUGINN-tól…', en: 'Ask HUGINN…' },
  send: { hu: 'Küldés', en: 'Send' },
  close: { hu: 'Bezárás', en: 'Close' },
  error: { hu: 'HUGINN hiba', en: 'HUGINN error' },
  fallbackPrice: { hu: 'Az árakról a DESIGNLY árképzés szekciójában találsz információt.', en: 'Pricing is covered in the DESIGNLY pricing section.' },
  fallbackSave: { hu: 'A generált oldal alatt találod a Mentés, HTML letöltés és JSON export gombokat.', en: 'Below the generated page you will find Save, Download HTML and JSON export.' },
  fallbackEdit: { hu: 'A generált oldal alatt nyisd meg a Szerkesztőt, írd le a módosítást, majd válaszd az Alkalmaz gombot.', en: 'Below the generated page open the editor, describe the change, then choose Apply.' },
  fallbackGamer: { hu: 'A Streamer & Gamer Studio kezeli az overlayeket, alertokat, thumbnailokat, emote-okat, badge-eket és merch artworköt.', en: 'Streamer & Gamer Studio handles overlays, alerts, thumbnails, emotes, badges and merch artwork.' },
  fallbackBrand: { hu: 'A Brand Studio kezeli a logót, színpalettát, tipográfiát, brand voice-ot és a Brand Kitet.', en: 'Brand Studio handles the logo, palette, typography, brand voice and the Brand Kit.' },
  fallbackTemplate: { hu: 'A sablongalériát a DESIGNLY workspace Sablonok fülén találod.', en: 'The template gallery is on the Templates tab of the DESIGNLY workspace.' },
  fallbackSite: { hu: 'Írd le, milyen weboldalt építsünk, és a VYRON CORE elindítja a folyamatot.', en: 'Describe the website you want and VYRON CORE starts the process.' },
  fallbackDefault: { hu: 'HUGINN a DESIGNLY beépített guide-ja. Kérdezz a modulokról vagy mondd el, mit szeretnél létrehozni.', en: 'HUGINN is the built-in DESIGNLY guide. Ask about the modules or tell me what you want to create.' },
};

function readLanguage(): LanguageCode {
  const requested = new URLSearchParams(window.location.search).get("lang");
  if (requested && LANGUAGES.some((l) => l.code === requested)) return requested as LanguageCode;
  const saved = window.localStorage.getItem("designly-language");
  return saved && LANGUAGES.some((l) => l.code === saved) ? saved as LanguageCode : "hu";
}

function fallback(message: string, t: (key: string) => string): { text: string; action?: Action } {
  const q = message.trim().toLowerCase();
  if (/ár|árak|csomag|kredit|price|pricing/.test(q)) return { text: t("fallbackPrice"), action: "pricing" };
  if (/ment|letölt|export|save|download/.test(q)) return { text: t("fallbackSave"), action: "create" };
  if (/szerkeszt|módosít|világos|sötét|edit|change|light|dark/.test(q)) return { text: t("fallbackEdit"), action: "create" };
  if (/stream|gamer|twitch|youtube|merch/.test(q)) return { text: t("fallbackGamer"), action: "gamer" };
  if (/brand|arculat|logó|logo/.test(q)) return { text: t("fallbackBrand"), action: "extra" };
  if (/sablon|template/.test(q)) return { text: t("fallbackTemplate"), action: "templates" };
  if (/weboldal|honlap|website|generál|build/.test(q)) return { text: t("fallbackSite"), action: "create" };
  return { text: t("fallbackDefault") };
}

/**
 * A `Home` route-on a query string valtozasat figyeljük.
 *
 * A `useLanguage` a `history.replaceState`-tel irja at az URL-t, ami NEM valt ki
 * `popstate` esemenyt — tehat a HUGINN a sajat allapotat nem frissulne. Ezert itt
 * kozvetlenul a `pushState`-et es a `popstate`-et is hallgatjuk, es a nyelvet
 * ujraolvassuk.
 */
function useHuginnLanguage(): LanguageCode {
  const [lang, setLang] = useState<LanguageCode>(readLanguage);
  useEffect(() => {
    const sync = () => setLang(readLanguage());
    const original = window.history.replaceState.bind(window.history);
    window.history.replaceState = ((data: unknown, title: string, url?: string | URL | null) => {
      original(data, title, url);
      sync();
    }) as typeof window.history.replaceState;
    window.addEventListener("popstate", sync);
    return () => {
      window.history.replaceState = original;
      window.removeEventListener("popstate", sync);
    };
  }, []);
  return lang;
}

export default function HuginnAgent(){
 const lang = useHuginnLanguage();
 const t = (key: string) => (lang === "hu" ? TEXT[key]?.hu : (TEXT[key]?.en ?? TEXT[key]?.hu)) ?? key;
 const at = (action: Action) => (lang === "hu" ? ACTIONS[action].hu : ACTIONS[action].en);
 const [open,setOpen]=useState(false),[input,setInput]=useState(""),[busy,setBusy]=useState(false);
 const [messages,setMessages]=useState<Message[]>([{role:"huginn",text:TEXT.greeting.hu}]);

 // A nyitas-gomb szovege a HUGINN topic koveti; a korabbi verzio magyarul maradt.
 useEffect(() => {
   setMessages((current) =>
     current.length === 1 && current[0].role === "huginn" ? [{ role: "huginn", text: t("greeting") }] : current,
   );
 }, [lang]);

 async function send(message=input.trim()){
  if(!message||busy)return; setInput(""); setMessages(m=>[...m,{role:"user",text:message}]); setBusy(true);
  const url=SUPABASE_URL;
  try{
   const controller=new AbortController(); const timeout=window.setTimeout(()=>controller.abort(),9000);
   const r=await fetch(url+"/functions/v1/designly-huginn",{method:"POST",headers:await authHeaders(false),body:JSON.stringify({message,language:lang}),signal:controller.signal});
   window.clearTimeout(timeout);
   const d=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(d.message||d.error||t("error"));
   const action=typeof d.action==="string"&&d.action in ACTIONS?d.action as Action:undefined;
   setMessages(m=>[...m,{role:"huginn",text:String(d.reply||fallback(message,t).text),action}]);
  }catch{
   const fb=fallback(message,t); setMessages(m=>[...m,{role:"huginn",text:fb.text,action:fb.action}]);
  }finally{setBusy(false);}
 }
 return <div className={"fixed bottom-5 right-5 z-[80] "+(open?"w-[min(390px,calc(100vw-2rem))]":"w-auto")}>
  {open&&<section className="mb-3 overflow-hidden rounded-2xl border border-accent/30 bg-panel/95 shadow-2xl backdrop-blur">
   <div className="flex items-center gap-3 border-b border-line px-4 py-3"><span className="grid h-9 w-9 place-items-center rounded-full border border-accent/40 bg-accent/10"><Bird className="h-4 w-4 text-accent"/></span><div className="min-w-0 flex-1"><div className="text-xs font-semibold tracking-[.18em] text-ink-100">HUGINN</div><div className="text-[10px] text-ink-400">VYRON CORE</div></div><button type="button" onClick={()=>setOpen(false)} className="text-ink-400 hover:text-ink-100" aria-label={t("close")}><X className="h-4 w-4"/></button></div>
   <div className="max-h-80 space-y-2 overflow-auto p-3">{messages.map((m,i)=><div key={i} className={"max-w-[92%] rounded-xl border px-3 py-2 text-xs leading-5 "+(m.role==="user"?"ml-auto border-accent/20 bg-accent/10 text-ink-100":"border-line bg-panel-hi text-ink-200")}>{m.text}{m.role==="huginn"&&m.action&&<div className="mt-2"><a href={ACTIONS[m.action].href} className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 px-2.5 py-1.5 text-[10px] font-semibold text-accent hover:bg-accent/10">{at(m.action)}<ArrowRight className="h-3 w-3"/></a></div>}</div>)}{busy&&<div className="text-[10px] text-ink-400">{t("working")}</div>}</div>
   <form onSubmit={e=>{e.preventDefault();void send();}} className="flex gap-2 border-t border-line p-3"><input value={input} onChange={e=>setInput(e.target.value)} maxLength={500} placeholder={t("placeholder")} className="vp-input min-w-0 flex-1"/><button disabled={busy||!input.trim()} className="vp-btn px-3" aria-label={t("send")}><Send className="h-4 w-4"/></button></form>
  </section>}
  <button type="button" onClick={()=>setOpen(v=>!v)} className="ml-auto flex items-center gap-2 rounded-full border border-accent/40 bg-panel/95 px-4 py-2.5 text-xs text-ink-100 shadow-xl backdrop-blur"><span className="flex -space-x-2"><span className="grid h-7 w-7 place-items-center rounded-full border border-accent/30 bg-canvas"><Bird className="h-3.5 w-3.5 text-accent"/></span><span className="grid h-7 w-7 place-items-center rounded-full border border-accent/20 bg-panel-hi text-[9px] font-bold text-accent">V</span></span><span>{open?"HUGINN / VYRON":"HUGINN"}</span>{open?<ChevronDown className="h-3.5 w-3.5"/>:<Sparkles className="h-3.5 w-3.5 text-accent"/>}</button>
 </div>;
}
