const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization, X-Client-Info, Apikey"};
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});}
Deno.serve(async(req:Request)=>{
if(req.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders});
if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
try{
const b=await req.json().catch(()=>({}));const doc=b.document;const instruction=typeof b.instruction==="string"?b.instruction.trim().slice(0,1200):"";const language=typeof b.language==="string"?b.language.slice(0,8):"hu";
if(!doc||!instruction)return json({error:"INVALID_REQUEST",message:"Dokumentum és utasítás szükséges."},400);
const key=Deno.env.get("GROQ_API_KEY")||Deno.env.get("AI_API_KEY")||"";
if(!key){const l=instruction.toLowerCase();const edits:any[]=[];if(/világos|vilagos|light|fényes/.test(l))edits.push({path:"site.theme.mode",value:"light"});if(/sötét|sotet|dark/.test(l))edits.push({path:"site.theme.mode",value:"dark"});return json({success:true,reply:edits.length?"VYRON CORE: módosítás alkalmazva.":"VYRON CORE: nincs AI provider; változatlan dokumentum.",edits});}
const schema={type:"object",additionalProperties:false,properties:{reply:{type:"string"},edits:{type:"array",items:{type:"object",additionalProperties:false,properties:{path:{type:"string"},value:{type:"string"}},required:["path","value"]}}},required:["reply","edits"]};
const prompt="You are VYRON CORE leading the DESIGNLY refine team. Apply only requested changes to existing fields. Return JSON only. Language: "+language+"\nInstruction: "+instruction+"\nDocument: "+JSON.stringify(doc).slice(0,30000);
const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model:Deno.env.get("DESIGNLY_GROQ_MODEL")||"openai/gpt-oss-120b",messages:[{role:"system",content:"Return strict JSON only."},{role:"user",content:prompt}],temperature:0.15,max_tokens:1400,response_format:{type:"json_schema",json_schema:{name:"designly_v3_refine",strict:true,schema}}})});
if(!r.ok)return json({error:"REFINE_PROVIDER_ERROR",message:"A VYRON CORE finomító réteg nem tudott választ adni."},502);
const d=await r.json();const raw=d.choices?.[0]?.message?.content;if(typeof raw!=="string")return json({error:"BAD_RESPONSE",message:"A finomító agent üres választ adott."},502);
const p=JSON.parse(raw);const edits=Array.isArray(p.edits)?p.edits.slice(0,20).filter((x:any)=>x&&typeof x.path==="string"&&typeof x.value==="string"):[];const safe=edits.filter((x:any)=>/^(site\.|blocks\.)/.test(x.path)&&!/(__proto__|constructor|prototype)/.test(x.path));
return json({success:true,reply:String(p.reply||"Módosítás elkészült."),edits:safe});
}catch(e){return json({error:"REFINE_RUNTIME_ERROR",message:"A VYRON CORE finomítása nem sikerült."},500);}});