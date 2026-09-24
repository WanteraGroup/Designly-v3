import { FUNCTIONS_URL, authHeaders } from './supabase-client';

export type CreativeImageResult={
  url:string;
  width?:number|null;
  height?:number|null;
  aspectRatio?:string;
  /**
   * A Space jelenleg negyzetes vaszonon general, fuggetlenul a kert aranytol.
   * Ha false, a kepet a kliens oldalon kell a keretre vagni — a `width` /
   * `height` ilyenkor a KERT meretet adja, nem a kapott kepet.
   */
  providerAspectRatioSupported?:boolean;
  description?:string;
  model?:string;
  provider?:string;
  [key:string]:unknown;
};

export async function generateCreativeImage(prompt:string,aspectRatio="1:1"):Promise<CreativeImageResult>{
 const headers=await authHeaders();
 const res=await fetch(`${FUNCTIONS_URL}/designly-image`,{method:"POST",headers,body:JSON.stringify({prompt,aspectRatio})});
 const body=(await res.json().catch(()=>({}))) as Partial<CreativeImageResult>&{error?:string;message?:string};
 if(res.status===401)throw new Error('A képgeneráláshoz jelentkezz be.');
 if(res.status===402)throw new Error(body.message??'Elfogytak a kreditek.');
 if(!res.ok||typeof body.url!=="string"||!body.url.trim())throw new Error(body.message??body.error??`A képgenerálás nem sikerült (${res.status}).`);
 return {...body,url:body.url};
}
