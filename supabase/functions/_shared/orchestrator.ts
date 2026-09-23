import {DESIGNLY_AGENT_REGISTRY} from "./agent-registry.ts";
export type OrchestrationPlan={agents:string[];capabilities:string[];reasons:Record<string,string>};
const RULES:Array<{id:string;terms:RegExp[];reason:string}>=
[
{id:"product",terms:[/mvp/i,/termék/i,/webshop/i,/webáruház/i,/shop/i],reason:"termék- és commerce-tervezés"},
{id:"tiktok-shop",terms:[/tiktok\s*shop/i,/seller/i,/listing/i,/affiliate/i],reason:"social-commerce workflow"},
{id:"video",terms:[/videó/i,/video/i,/reels/i,/shorts/i,/ugc/i,/reklámfilm/i],reason:"videós kreatív"},
{id:"marketing",terms:[/marketing/i,/kampány/i,/hirdetés/i,/ads/i],reason:"kampány és marketing"},
{id:"social",terms:[/social/i,/instagram/i,/facebook/i,/tiktok/i,/poszt/i,/story/i],reason:"social kreatív"},
{id:"sales",terms:[/értékesítés/i,/eladás/i,/ajánlat/i,/upsell/i,/sales/i],reason:"értékesítési logika"},
{id:"voice",terms:[/hang/i,/beszéd/i,/telefon/i,/voice/i,/voiceover/i],reason:"hangalapú interakció"},
{id:"translator",terms:[/fordít/i,/tolmács/i,/többnyelv/i,/multilingual/i],reason:"fordítás és tolmácsolás"},
{id:"procurement",terms:[/beszerzés/i,/beszállító/i,/procurement/i,/b2b/i],reason:"B2B procurement"},
{id:"recruitment",terms:[/toborz/i,/recruit/i,/állás/i,/jelölt/i,/talent/i],reason:"recruitment workflow"},
{id:"web-architect",terms:[/weboldal/i,/website/i,/honlap/i,/webshop/i,/site/i],reason:"weboldal-architektúra"},
{id:"ux-ui",terms:[/weboldal/i,/website/i,/honlap/i,/ui/i,/ux/i,/interakció/i],reason:"UX/UI"},
{id:"seo-content",terms:[/weboldal/i,/website/i,/honlap/i,/seo/i,/google/i,/kereső/i],reason:"SEO"},
  {id:"template",terms:[/sablon/i,/template/i],reason:"sablonillesztés és variációs irány"},
  {id:"social-publisher",terms:[/közzététel/i,/publish/i,/publikál/i,/posztol/i],reason:"engedélyezett social publishing workflow"},
  {id:"web-qa",terms:[/teszt/i,/qa/i,/hibakeres/i,/ellenőrz/i],reason:"végső web QA és acceptance"},
  {id:"mira",terms:[/mira/i,/asszisztens/i,/emlékeztet/i,/reminder/i],reason:"személyi AI asszisztens réteg"},
];
export function buildOrchestrationPlan(brief:string,requestedOutputs:string[]=[]):OrchestrationPlan{
 const text=[brief,...requestedOutputs].join("\n");
 const ids=new Set<string>(["core","master","huginn","brand","web","content","reviewer","builder"]);
 const reasons:Record<string,string>={
  core:"VYRON CORE a hálózat főorchestrátora",
  master:"DESIGNLY MASTER a kreatív döntések vezetője",
  huginn:"HUGINN a felhasználói guide",
  brand:"vizuális konzisztencia",web:"webes struktúra",content:"tartalom és CTA",
  reviewer:"minőségellenőrzés",builder:"build-ready kimenet"
 };
 for(const r of RULES)if(r.terms.some(t=>t.test(text))){ids.add(r.id);reasons[r.id]=r.reason;}
 const agents=DESIGNLY_AGENT_REGISTRY.filter(a=>ids.has(a.id)).map(a=>a.id);
 const capabilities=[...new Set(DESIGNLY_AGENT_REGISTRY.filter(a=>ids.has(a.id)).flatMap(a=>a.capabilities))];
 return {agents,capabilities,reasons};
}
