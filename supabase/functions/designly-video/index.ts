const corsHeaders={ "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS" };
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 let body:{prompt?:string;duration?:number;aspectRatio?:string};
 try{body=await req.json()}catch{return json({error:"Invalid JSON body"},400)}
 const prompt=(body.prompt??"").trim();
 if(prompt.length<3)return json({error:"A videó koncepciója legalább 3 karakter legyen."},400);
 const duration=Math.min(15,Math.max(5,Number(body.duration)||10));
 const falKey=Deno.env.get("FAL_KEY");
 if(!falKey)return json({error:"FAL_KEY nincs beállítva a Supabase Edge Function környezetében."},500);
 try{
  const res=await fetch("https://fal.run/minimax/h3-max/text-to-video",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Key ${falKey}`},body:JSON.stringify({prompt,duration,resolution:"768P",aspect_ratio:body.aspectRatio??"16:9",prompt_expansion_mode:"balanced",enable_safety_checker:true})});
  const raw=await res.text();
  if(!res.ok)return json({error:`Videógenerálás sikertelen (${res.status}).`},502);
  const data=JSON.parse(raw) as {video?:{url?:string;file_name?:string;content_type?:string}};
  if(!data.video?.url)return json({error:"A videógenerátor nem adott vissza videót."},502);
  return json({url:data.video.url,fileName:data.video.file_name??"designly-video.mp4",contentType:data.video.content_type??"video/mp4",model:"minimax/h3-max/text-to-video"});
 }catch(error){return json({error:error instanceof Error?error.message:"Ismeretlen videógenerálási hiba."},500)}
});