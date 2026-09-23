const corsHeaders={ "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS" };
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST") return json({error:"Method not allowed"},405);
 let body:{prompt?:string;aspectRatio?:string};
 try{body=await req.json()}catch{return json({error:"Invalid JSON body"},400)}
 const prompt=(body.prompt??"").trim();
 if(prompt.length<3)return json({error:"A kép briefje legalább 3 karakter legyen."},400);
 if(prompt.length>5000)return json({error:"A brief legfeljebb 5000 karakter lehet."},400);
 const falKey=Deno.env.get("FAL_KEY");
 if(!falKey)return json({error:"FAL_KEY nincs beállítva a Supabase Edge Function környezetében."},500);
 try{
  const res=await fetch("https://fal.run/fal-ai/nano-banana-pro",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Key ${falKey}`},body:JSON.stringify({prompt,num_images:1,aspect_ratio:body.aspectRatio??"1:1",resolution:"1K",output_format:"png",safety_tolerance:"4",limit_generations:true})});
  const raw=await res.text();
  if(!res.ok){console.error("fal error",res.status,raw.slice(0,1000));return json({error:`Képgenerálás sikertelen (${res.status}).`},502)}
  const data=JSON.parse(raw) as {images?:{url?:string;width?:number;height?:number}[];description?:string};
  const image=data.images?.[0];
  if(!image?.url)return json({error:"A képgenerátor nem adott vissza képet."},502);
  return json({url:image.url,width:image.width??null,height:image.height??null,description:data.description??"",model:"fal-ai/nano-banana-pro"});
 }catch(error){console.error("designly-image failed",error);return json({error:error instanceof Error?error.message:"Ismeretlen képgenerálási hiba."},500)}
});