import { consumeCredits, ensureProfile, refundCredits, requestUser } from "../_shared/auth.ts";
import { consumeRateLimit } from "../_shared/rate-limit.ts";
import { corsHeadersFor } from "../_shared/cors.ts";

function json(data:unknown,status=200,req?:Request){return new Response(JSON.stringify(data),{status,headers:{...(req?corsHeadersFor(req):{}),"Content-Type":"application/json"}});}
Deno.serve(async(req:Request)=>{
if(req.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeadersFor(req)});
if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405,req);
const user=await requestUser(req);if(!user)return json({error:"UNAUTHORIZED",message:"Jelentkezz be a szerkesztő használatához."},401,req);if(!await consumeRateLimit(req,user.id,20,"refine"))return json({error:"RATE_LIMITED",message:"Túl sok szerkesztési kérés rövid idő alatt."},429,req);
try{
const b=await req.json().catch(()=>({}));const doc=b.document;const instruction=typeof b.instruction==="string"?b.instruction.trim().slice(0,1200):"";const language=typeof b.language==="string"?b.language.slice(0,8):"hu";
if(!doc||!instruction)return json({error:"INVALID_REQUEST",message:"Dokumentum és utasítás szükséges."},400,req);
const key=Deno.env.get("GROQ_API_KEY")||Deno.env.get("AI_API_KEY")||"";
if(!key){const l=instruction.toLowerCase();const edits:any[]=[];
// A világos/sötét ágak szigorúan kizáróak. A korábbi két önálló `if` mindkét ágra
// illeszkedett a magyar toldalékolt alakokra (pl. "világosabb" tartalmazza a
// "sötét" tövet is), ezért a második edit felülírta az elsőt.
const lightMatch=/\blight\b|\bv(?:ilágos|ilagos)(?:abb|abbak|ít|it|odik|odnak)?\b|\bfényes(?:ebb|ebbek)?\b/.test(l);
const darkMatch=/\bdark\b|\bs(?:ötét|otet)(?:ebb|ebbek|ít|it|edik|ednek)?\b/.test(l);
if(lightMatch&&!darkMatch)edits.push({path:"site.theme.mode",value:"light"});
else if(darkMatch&&!lightMatch)edits.push({path:"site.theme.mode",value:"dark"});
return json({success:true,reply:edits.length?"VYRON CORE: módosítás alkalmazva.":"VYRON CORE: nincs AI provider; változatlan dokumentum.",edits},200,req);}
await ensureProfile(user.id);const cost=Number(Deno.env.get("DESIGNLY_REFINE_COST")||"1");const charged=await consumeCredits(user.id,cost,"designly-v3-refine");if(!charged)return json({error:"INSUFFICIENT_CREDITS",message:"Elfogytak a kreditek."},402,req);const schema={type:"object",additionalProperties:false,properties:{reply:{type:"string"},edits:{type:"array",items:{type:"object",additionalProperties:false,properties:{path:{type:"string"},value:{type:"string"}},required:["path","value"]}}},required:["reply","edits"]};
const prompt="You are VYRON CORE leading the DESIGNLY refine team. Apply only requested changes to existing fields. Return JSON only. Language: "+language+"\nInstruction: "+instruction+"\nDocument: "+JSON.stringify(doc).slice(0,30000);
const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model:Deno.env.get("DESIGNLY_GROQ_MODEL")||"openai/gpt-oss-120b",messages:[{role:"system",content:"Return strict JSON only."},{role:"user",content:prompt}],temperature:0.15,max_tokens:1400,response_format:{type:"json_schema",json_schema:{name:"designly_v3_refine",strict:true,schema}}})});
if(!r.ok){try{await refundCredits(user.id,cost,"designly-v3-refine provider refund");}catch(refundError){console.error("refine refund failed",refundError);}return json({error:"REFINE_PROVIDER_ERROR",message:"A VYRON CORE finomító réteg nem tudott választ adni."},502,req);}
const d=await r.json();const raw=d.choices?.[0]?.message?.content;if(typeof raw!=="string")return json({error:"BAD_RESPONSE",message:"A finomító agent üres választ adott."},502,req);
const parsed=JSON.parse(raw);const edits=Array.isArray(parsed.edits)?parsed.edits.slice(0,20).filter((x:any)=>x&&typeof x.path==="string"&&typeof x.value==="string"):[];const safe=edits.filter((x:any)=>/^(site\.|blocks\.)/.test(x.path)&&!/(__proto__|constructor|prototype)/.test(x.path));
return json({success:true,reply:String(parsed.reply||"Módosítás elkészült."),edits:safe},200,req);
}catch(e){return json({error:"REFINE_RUNTIME_ERROR",message:"A VYRON CORE finomítása nem sikerült."},500,req);}});
