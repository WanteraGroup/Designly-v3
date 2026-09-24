const SUPABASE_URL=(import.meta.env.VITE_SUPABASE_URL as string|undefined)?.trim()||'https://mxrgdcvmxzhocbdhtlhg.supabase.co';
const FUNCTIONS_URL=`${SUPABASE_URL}/functions/v1`;
const ANON_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined;

export async function generateCreativeVideo(prompt:string,duration:number,aspectRatio="16:9"){
  const res=await fetch(`${FUNCTIONS_URL}/designly-video`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      ...(ANON_KEY?{Authorization:`Bearer ${ANON_KEY},`}:{}),
      ...(ANON_KEY?{apikey:ANON_KEY}:{})
    },
    body:JSON.stringify({prompt,duration,aspectRatio})
  });
  const body=(await res.json().catch(()=>({}))) as {url?:string;fileName?:string;contentType?:string;model?:string;error?:string};
  if(!res.ok||!body.url)throw new Error(body.error??`A videógenerálás nem sikerült (${res.status}).`);
  return body;
}