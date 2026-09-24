const SUPABASE_URL=(import.meta.env.VITE_SUPABASE_URL as string|undefined)?.trim()||'https://mxrgdcvmxzhocbdhtlhg.supabase.co';
const FUNCTIONS_URL=`${SUPABASE_URL}/functions/v1`;
const ANON_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined;

export type CreativeImageResult={
  url:string;
  width?:number|null;
  height?:number|null;
  description?:string;
  model?:string;
  provider?:string;
  [key:string]:unknown;
};

export async function generateCreativeImage(prompt:string,aspectRatio="1:1"):Promise<CreativeImageResult>{
 const headers:Record<string,string>={"Content-Type":"application/json"};
 if(ANON_KEY)headers.apikey=ANON_KEY;
 if(ANON_KEY)headers.Authorization=`Bearer ${ANON_KEY}`;
 const res=await fetch(`${FUNCTIONS_URL}/designly-image`,{method:"POST",headers,body:JSON.stringify({prompt,aspectRatio})});
 const body=(await res.json().catch(()=>({}))) as Partial<CreativeImageResult>&{error?:string};
 if(!res.ok||typeof body.url!=="string"||!body.url.trim())throw new Error(body.error??`A képgenerálás nem sikerült (${res.status}).`);
 return {...body,url:body.url};
}