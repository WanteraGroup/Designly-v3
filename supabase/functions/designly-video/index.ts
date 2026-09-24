const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders});
  if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
  return json({
    error:"VIDEO_PROVIDER_NOT_CONFIGURED",
    message:"A jelenlegi DESIGNLY V3-ben nincs fizetős videós provider bekötve. A Media Studio storyboard- és kreatívtervezési része használható; videógenerálás csak külön jóváhagyott providerrel aktiválható."
  },503);
});