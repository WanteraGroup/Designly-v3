import { buildOrchestrationPlan } from "../_shared/orchestrator.ts";
import { consumeCredits, ensureProfile, refundCredits, requestUser } from "../_shared/auth.ts";
import { consumeRateLimit } from "../_shared/rate-limit.ts";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization, X-Client-Info, Apikey"};
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});}
function s(v:unknown,f="",m=1400){return typeof v==="string"&&v.trim()?v.trim().slice(0,m):f;}
function a(v:unknown,f:any[]=[],m=8){return Array.isArray(v)?v.slice(0,m):f;}
function fallback(brief:string,lang:string){const hu=lang.startsWith("hu");const dark=/(sötét|sotet|dark|black|noir|viking|kelta|celtic)/i.test(brief);const title=s(brief.replace(/^.*?[:\-]\s*/,""),"DESIGNLY",70);return {siteTitle:title,themeMode:dark?"dark":"light",palette:dark?["#07080c","#151820","#c9a45c","#f3eee3"]:["#f6f2eb","#fff","#1c2330","#9b6d2d"],headingFont:"Marcellus",bodyFont:"Inter",nav:[{label:hu?"Főoldal":"Home",href:"#top"},{label:hu?"Szolgáltatások":"Services",href:"#services"},{label:hu?"Kapcsolat":"Contact",href:"#contact"}],heroEyebrow:"DESIGNLY STUDIO",heroHeadline:title,heroSubheadline:hu?"Koherens, modern és működő digitális jelenlét.":"A coherent, modern digital presence.",heroCtaLabel:hu?"Kapcsolat":"Contact",heroCtaHref:"#contact",featuresHeading:hu?"Miért ez az irány?":"Why this direction?",features:[{title:"Hierarchia",text:"Erős vizuális sorrend és CTA."},{title:"Reszponzív",text:"Mobil, tablet és asztali nézet."},{title:"Márkaközpontú",text:"Következetes vizuális rendszer."}],aboutHeading:hu?"A projektről":"About",aboutBody:brief.slice(0,900),servicesHeading:hu?"Szolgáltatások":"Services",services:[{name:"Strategia",text:"Kreatív és funkcionális irány.",price:"—"},{name:"Design",text:"UI és vizuális rendszer.",price:"—"},{name:"Build",text:"Build-ready specifikáció és QA.",price:"—"}],pricingHeading:hu?"Csomagok":"Plans",pricingTiers:[{name:"START",price:"Egyedi",period:"",features:["Brief","Design","QA"]},{name:"PRO",price:"Egyedi",period:"",features:["Full structure","Content","QA"]}],galleryHeading:hu?"Inspiráció":"Inspiration",gallery:[{query:"premium modern business interior",caption:"Premium visual direction"},{query:"modern creative studio architecture",caption:"Editorial atmosphere"}],testimonialsHeading:hu?"Visszajelzés":"Testimonials",testimonials:[{quote:"Tiszta és következetes.",author:hu?"Ügyfél":"Client",role:"Project"}],faqHeading:"FAQ",faq:[{q:hu?"Módosítható?":"Can it be refined?",a:hu?"Igen.":"Yes."}],contactHeading:hu?"Kapcsolat":"Contact",contactBody:hu?"Kérj személyre szabott ajánlatot.":"Request a tailored proposal.",email:"",phone:"",address:"",ctaHeadline:hu?"Építsük fel.":"Let us build it.",ctaSubheadline:hu?"A következő lépés egy jóváhagyott brief.":"The next step is an approved brief.",ctaLabel:hu?"Indulás":"Start",ctaHref:"#contact",footerText:"DESIGNLY STUDIO",footerLinks:[{label:"Privacy",href:"#"}]};}
function doc(d:any,lang:string,brief:string){
  const x=(v:any,f:any[]=[],m=8)=>a(v,f,m);
  const wantsForm=Boolean(d.formEnabled)||/(foglal|booking|kapcsolat|contact|űrlap|urlap|ajánlatkérés|ajanlatkeres|jelentkez)/i.test(brief);
  const formFields=x(d.formFields,[
    {name:"name",label:lang.startsWith("hu")?"Név":"Name",type:"text",required:true},
    {name:"email",label:"E-mail",type:"email",required:true},
    {name:"message",label:lang.startsWith("hu")?"Üzenet":"Message",type:"textarea",required:true},
  ],8).map((v:any,i:number)=>({
    name:s(v?.name,"field_"+(i+1),80).replace(/[^a-zA-Z0-9_-]/g,"_"),
    label:s(v?.label,"Field",120),
    type:["text","email","tel","textarea","select"].includes(v?.type)?v.type:"text",
    required:v?.required!==false,
    ...(Array.isArray(v?.options)?{options:v.options.filter((q:any)=>typeof q==="string").slice(0,20).map((q:any)=>s(q,"",120))}:{}),
    ...(s(v?.placeholder,"",160)?{placeholder:s(v.placeholder,"",160)}:{})
  }));
  const blocks:any[]=[
    {type:"hero",eyebrow:s(d.heroEyebrow,"DESIGNLY",100),headline:s(d.heroHeadline,"Create.",300),subheadline:s(d.heroSubheadline,"",700),cta:{label:s(d.heroCtaLabel,"Contact",100),href:s(d.heroCtaHref,"#contact",160)}},
    {type:"features",heading:s(d.featuresHeading,"Features",140),items:x(d.features,[],6).map((v:any)=>({title:s(v?.title,"Feature",120),text:s(v?.text,"",800)}))},
    {type:"about",heading:s(d.aboutHeading,"About",140),body:s(d.aboutBody,"",1800)},
    {type:"services",heading:s(d.servicesHeading,"Services",140),items:x(d.services,[],6).map((v:any)=>({name:s(v?.name,"Service",120),text:s(v?.text,"",800),price:s(v?.price,"—",120)}))},
    {type:"pricing",heading:s(d.pricingHeading,"Pricing",140),tiers:x(d.pricingTiers,[],5).map((v:any)=>({name:s(v?.name,"Plan",120),price:s(v?.price,"—",120),period:s(v?.period,"",80),features:x(v?.features,[],8).map((q:any)=>s(q,"",300))}))},
    {type:"gallery",heading:s(d.galleryHeading,"Gallery",140),images:x(d.gallery,[],6).map((v:any)=>({query:s(v?.query,"modern design",180),caption:s(v?.caption,"",300)}))},
    {type:"testimonials",heading:s(d.testimonialsHeading,"Testimonials",140),items:x(d.testimonials,[],6).map((v:any)=>({quote:s(v?.quote,"",500),author:s(v?.author,"",120),role:s(v?.role,"",120)}))},
    {type:"faq",heading:s(d.faqHeading,"FAQ",140),items:x(d.faq,[],8).map((v:any)=>({q:s(v?.q,"",300),a:s(v?.a,"",800)}))},
    {type:"contact",heading:s(d.contactHeading,"Contact",140),body:s(d.contactBody,"",800),email:s(d.email,"",140),phone:s(d.phone,"",80),address:s(d.address,"",300)}
  ];
  if(wantsForm){
    blocks.push({
      type:"form",
      heading:s(d.formHeading,lang.startsWith("hu")?"Kapcsolat": "Contact",140),
      body:s(d.formBody,lang.startsWith("hu")?"Írj nekünk, és hamarosan jelentkezünk.":"Send us a message and we will get back to you soon.",600),
      fields:formFields,
      submitLabel:s(d.formSubmitLabel,lang.startsWith("hu")?"Üzenet küldése":"Send message",100),
      successMessage:s(d.formSuccessMessage,lang.startsWith("hu")?"Köszönjük, megkaptuk az üzeneted.":"Thank you. Your message has been received.",300),
      endpoint:"/functions/v1/designly-form-submit",
      formId:crypto.randomUUID()
    });
  }
  blocks.push(
    {type:"cta",headline:s(d.ctaHeadline,"Let us build it.",200),subheadline:s(d.ctaSubheadline,"",600),cta:{label:s(d.ctaLabel,"Start",100),href:s(d.ctaHref,"#contact",160)}},
    {type:"footer",text:s(d.footerText,"DESIGNLY STUDIO",180),links:x(d.footerLinks,[],8).map((v:any)=>({label:s(v?.label,"Link",80),href:s(v?.href,"#",160)}))}
  );
  return {
    site:{title:s(d.siteTitle,"DESIGNLY",120),language:lang,theme:{mode:d.themeMode==="light"?"light":"dark",palette:x(d.palette,["#c9a45c"],8).map((v:any)=>s(v,"#c9a45c",60)),heading_font:s(d.headingFont,"Marcellus",80),body_font:s(d.bodyFont,"Inter",80),background_image:/^https?:\/\//i.test(s(d.backgroundImage,"",4000))?s(d.backgroundImage,"",4000):""},nav:x(d.nav,[],8).map((v:any)=>({label:s(v?.label,"Link",80),href:s(v?.href,"#",160)}))},
    blocks
  };
}
const SPECIALIST_ROLES:Record<string,string>={
"brand":"Define palette, typography, visual identity and brand consistency decisions.",
"web":"Define page structure, sections, navigation and responsive hierarchy.",
"content":"Define headlines, CTA, content hierarchy and conversion copy.",
"reviewer":"Inspect the brief for risks, missing requirements and acceptance criteria.",
"builder":"Turn the brief into implementation-ready structure and build constraints.",
"web-architect":"Define information architecture, navigation and user flows.",
"ux-ui":"Define interaction patterns, components, accessibility and responsive UX.",
"seo-content":"Define SEO structure, metadata, headings and search intent alignment.",
"social":"Define social content variants, platform adaptations and visual hierarchy.",
"marketing":"Define campaign, ad and funnel messaging requirements.",
"template":"Recommend the most appropriate template structure and reusable patterns.",
"product":"Define product concept, MVP scope, feature priorities and offer structure.",
"video":"Define hooks, short-form video structure, storyboard and UGC direction.",
"sales":"Define offer framing, sales messaging and follow-up requirements.",
"web-qa":"Define link, form, responsive and acceptance test requirements."
};

async function runSpecialist(key:string,model:string,agent:string,brief:string,lang:string){
  const role=SPECIALIST_ROLES[agent]||"Analyze the brief from your specialist perspective and provide concrete production decisions.";
  const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({
    model,
    messages:[
      {role:"system",content:"You are a DESIGNLY specialist agent. Return JSON only. Never invent user facts. Be concise and production-oriented."},
      {role:"user",content:"AGENT: "+agent+"\nROLE: "+role+"\nLANGUAGE: "+lang+"\nBRIEF:\n"+brief+"\nReturn {deliverable:string,decisions:string[],risks:string[]}."}
    ],
    temperature:0.2,max_tokens:700,response_format:{type:"json_object"}
  })});
  if(!r.ok) throw new Error("Specialist "+agent+" HTTP "+r.status);
  const d=await r.json(); const raw=d.choices?.[0]?.message?.content;
  if(typeof raw!=="string"||!raw.trim()) throw new Error("Specialist "+agent+" returned no content");
  const parsed=JSON.parse(raw);
  return {agent,deliverable:String(parsed.deliverable||""),decisions:Array.isArray(parsed.decisions)?parsed.decisions.filter((x:any)=>typeof x==="string").slice(0,8):[],risks:Array.isArray(parsed.risks)?parsed.risks.filter((x:any)=>typeof x==="string").slice(0,6):[]};
}

async function generateQwenBackground(prompt:string):Promise<string>{
  const base="https://akhaliq-qwen-image-2-1-workflow.hf.space";
  const fn="text_to_image";
  const start=await fetch(base+"/gradio_api/call/"+fn,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({data:[prompt,28]}),
    signal:AbortSignal.timeout(90000)
  });
  if(!start.ok) throw new Error("Qwen Image start HTTP "+start.status);
  const started=await start.json();
  const eventId=typeof started?.event_id==="string"?started.event_id:"";
  if(!eventId) throw new Error("Qwen Image returned no event_id");
  const stream=await fetch(base+"/gradio_api/call/text_to_image/"+encodeURIComponent(eventId),{
    headers:{"Accept":"text/event-stream"},
    signal:AbortSignal.timeout(120000)
  });
  if(!stream.ok) throw new Error("Qwen Image stream HTTP "+stream.status);
  const raw=await stream.text();
  const lines=raw.split(/\r?\n/);
  let event="";
  for(const line of lines){
    if(line.startsWith("event:")){event=line.slice(6).trim();continue;}
    if(!line.startsWith("data:")) continue;
    const data=line.slice(5).trim();
    if(event==="error") throw new Error("Qwen Image generation failed");
    if(event!=="complete") continue;
    let parsed:any;
    try{parsed=JSON.parse(data);}catch{continue;}
    const output=Array.isArray(parsed)?parsed[0]:parsed;
    const fileUrl=typeof output?.url==="string"?output.url:(typeof output?.path==="string"?output.path:"");
    if(!fileUrl) continue;
    if(/^https?:\/\//i.test(fileUrl)) return fileUrl;
    if(fileUrl.startsWith("/")) return base+fileUrl;
  }
  throw new Error("Qwen Image returned no image");
}

async function ai(key:string,model:string,brief:string,lang:string,agents:string[]){const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model,messages:[{role:"system",content:"You are VYRON CORE, the boss of DESIGNLY. DESIGNLY MASTER is the design director. Coordinate the selected specialist agents. Return JSON only. Do not invent prices, contact data, testimonials or factual claims."},{role:"user",content:"BRIEF:\n"+brief+"\nLANGUAGE:\n"+lang+"\nACTIVE AGENTS:\n"+agents.join(", ")+"\nReturn keys: siteTitle,themeMode,palette,headingFont,bodyFont,backgroundImage,backgroundImagePrompt,nav,heroEyebrow,heroHeadline,heroSubheadline,heroCtaLabel,heroCtaHref,featuresHeading,features,aboutHeading,aboutBody,servicesHeading,services,pricingHeading,pricingTiers,galleryHeading,gallery,testimonialsHeading,testimonials,faqHeading,faq,contactHeading,contactBody,email,phone,address,formEnabled,formHeading,formBody,formFields,formSubmitLabel,formSuccessMessage,ctaHeadline,ctaSubheadline,ctaLabel,ctaHref,footerText,footerLinks. Only set formEnabled when the brief explicitly requests a contact/inquiry/booking form. For backgroundImage, return an empty string; DESIGNLY will generate the actual background image separately. For backgroundImagePrompt, return a concise English image-generation prompt for a premium full-page website background matching the brief, with no text, logos, UI, watermark or typography."}],temperature:0.25,max_tokens:5200,response_format:{type:"json_object"}})});if(!r.ok)throw new Error("Groq "+r.status);const d=await r.json();const raw=d.choices?.[0]?.message?.content;if(typeof raw!=="string"||!raw.trim())throw new Error("Groq returned no content");return JSON.parse(raw);}
Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders});if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);const user=await requestUser(req);if(!user)return json({error:"UNAUTHORIZED",message:"Jelentkezz be a generáláshoz."},401);if(!await consumeRateLimit(req,user.id,8,"agent"))return json({error:"RATE_LIMITED",message:"Túl sok generálás rövid idő alatt."},429);let charged=false;try{const b=await req.json().catch(()=>({}));const brief=typeof b.brief==="string"?b.brief.trim().slice(0,4000):"";const lang=typeof b.language==="string"?b.language.trim().slice(0,8):"hu";if(!brief)return json({error:"INVALID_REQUEST",message:"A brief kötelező."},400);const plan=buildOrchestrationPlan(brief,Array.isArray(b.requestedOutputs)?b.requestedOutputs:[]);const key=Deno.env.get("GROQ_API_KEY")||Deno.env.get("AI_API_KEY")||"";const model=Deno.env.get("DESIGNLY_GROQ_MODEL")||"openai/gpt-oss-120b";let payload:any;let mode:"ai"|"fallback"="fallback";let providerError:string|null=null;let specialistOutputs:any[]=[];if(key){await ensureProfile(user.id);charged=await consumeCredits(user.id,Number(Deno.env.get("DESIGNLY_AGENT_COST")||"10"),"designly-v3-agent");if(!charged)return json({error:"INSUFFICIENT_CREDITS",message:"Elfogytak a kreditek."},402);try{const specialistIds=plan.agents.filter((id:string)=>!["core","master","huginn"].includes(id)).slice(0,10);const settled=await Promise.allSettled(specialistIds.map((id:string)=>runSpecialist(key,model,id,brief,lang)));for(let i=0;i<settled.length;i++){const outcome=settled[i];if(outcome.status==="fulfilled"){specialistOutputs.push(outcome.value);}else{specialistOutputs.push({agent:specialistIds[i],deliverable:"",decisions:[],risks:[],failed:true,error:String(outcome.reason instanceof Error?outcome.reason.message:outcome.reason).slice(0,200)});}}const failedCount=specialistOutputs.filter((o:any)=>o.failed).length;if(failedCount)providerError=failedCount+" specialista nem tudott válaszolni.";const successful=specialistOutputs.filter((o:any)=>!o.failed);const specialistContext=JSON.stringify(successful).slice(0,12000);payload=await ai(key,model,brief+"\nSPECIALIST TEAM OUTPUTS:\n"+specialistContext,lang,pl