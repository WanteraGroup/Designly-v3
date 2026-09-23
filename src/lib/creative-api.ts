const SUPABASE_URL=(import.meta.env.VITE_SUPABASE_URL as string|undefined)?.trim()||'https://mxrgdcvmxzhocbdhtlhg.supabase.co';
const FUNCTIONS_URL=`${SUPABASE_URL}/functions/v1`;
const ANON_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined;
export async function generateCreativeImage(prompt:string,aspectRatio="1:1"){
 const res=await fetch(`${FUNCTIONS_URL}/designly-image`,{method:"POST",headers:{"Content-Type":"application/json",apikey:ANON_KEY},body:JSON.stringify({prompt,aspectRatio})});
 const body=(await res.json().catch(()=>({}))) as {url?:string;width?:number|null;height?:number|null;description?:string;model?:string;error?:string};
 if(!res.ok||!body.url)throw new Error(body.error??`A képgenerálás nem sikerült (${res.status}).`);
 return body;
}