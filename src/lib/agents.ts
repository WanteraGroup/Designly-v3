export type AgentStatus = 'live' | 'planned';

export interface AgentEntry {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
  source: string;
  status: AgentStatus;
}

export const LIVE_AGENTS: AgentEntry[] = [
  { id:'core', name:'VYRON CORE', role:'A teljes DESIGNLY agent-hálózat főnöke: routing, feladatbontás, specialisták koordinálása', capabilities:['orchestration','routing','mission-plan','handoff'], source:'NEXORA / Designity', status:'live' },
  { id:'master', name:'DESIGNLY MASTER', role:'A kreatív és design döntések központi vezetője', capabilities:['creative-direction','design-brief','visual-system'], source:'Designity', status:'live' },
  { id:'huginn', name:'HUGINN', role:'Odin hollója: AI concierge, navigáció és felhasználói guide', capabilities:['navigation','help','onboarding','project-guidance'], source:'Designity', status:'live' },
  { id:'brand', name:'BRAND AGENT', role:'Márkaidentitás és vizuális rendszer', capabilities:['logo','palette','typography','brand-kit'], source:'Designity', status:'live' },
  { id:'web', name:'WEB AGENT', role:'Weboldal-struktúra és reszponzív hierarchia', capabilities:['website','landing','sections','responsive'], source:'Designity', status:'live' },
  { id:'content', name:'CONTENT AGENT', role:'Headline, CTA és marketing szöveg', capabilities:['headlines','copy','cta','content-structure'], source:'Designity / Nexora', status:'live' },
  { id:'reviewer', name:'REVIEWER', role:'Minőség-, kockázat- és elfogadási ellenőrzés', capabilities:['qa','validation','risk-review','acceptance'], source:'NEXORA / Designity', status:'live' },
  { id:'builder', name:'BUILDER', role:'Build-ready specifikáció és acceptance criteria', capabilities:['implementation-plan','acceptance-criteria','artifact-plan'], source:'NEXORA / Designity', status:'live' },
];

export const PLANNED_AGENTS: AgentEntry[] = [
  {id:'web-architect',name:'WEB ARCHITECT',role:'Teljes információs architektúra',capabilities:['site-architecture','multi-page','navigation','user-flow'],source:'Designity',status:'live'},
  {id:'ux-ui',name:'UX/UI AGENT',role:'Interakció, komponensek és hozzáférhetőség',capabilities:['ux','ui','components','interactions','accessibility'],source:'Designity',status:'live'},
  {id:'seo-content',name:'SEO CONTENT AGENT',role:'SEO és konverziós tartalom',capabilities:['seo','metadata','conversion'],source:'Designity',status:'live'},
  {id:'social',name:'SOCIAL AGENT',role:'Social kreatívok és platformváltozatok',capabilities:['social-post','social-story','platform-variants'],source:'Designity',status:'live'},
  {id:'marketing',name:'MARKETING AGENT',role:'Kampány és marketinganyagok',capabilities:['campaign','ads','funnel','social'],source:'Designity / Nexora',status:'live'},
  {id:'template',name:'TEMPLATE AGENT',role:'Sablonillesztés és metadata',capabilities:['template-matching','template-metadata'],source:'Designity',status:'live'},
  {id:'product',name:'PRODUCT FACTORY',role:'Termék- és MVP-tervezés',capabilities:['product-concept','feature-set','offer-package'],source:'Nexora / Trenova',status:'live'},
  {id:'video',name:'VIDEO CREATOR AGENT',role:'Rövid videó, hook, storyboard és UGC',capabilities:['video','reels','shorts','ugc','storyboard'],source:'Designity / Trenova',status:'live'},
  {id:'sales',name:'SALES AGENT',role:'Ajánlat, upsell és értékesítési üzenetek',capabilities:['offer','upsell','sales-copy','follow-up'],source:'Nexora',status:'live'},
  {id:'web-qa',name:'WEB QA',role:'Web QA, linkek, űrlapok és reszponzivitás',capabilities:['web-qa','links','forms','responsive'],source:'Designity',status:'live'},
];


export interface PublicAgentModule {
  id: string;
  name: string;
  role: string;
  specialistIds: string[];
}

export const PUBLIC_AGENT_MODULES: PublicAgentModule[] = [
  { id:'core', name:'VYRON CORE', role:'Főorchestrátor és teljes agent-hálózat', specialistIds:['core'] },
  { id:'master', name:'DESIGNLY MASTER', role:'Kreatív és design döntések', specialistIds:['master'] },
  { id:'huginn', name:'HUGINN', role:'AI concierge, navigáció és felhasználói segítség', specialistIds:['huginn'] },
  { id:'brand-studio', name:'BRAND STUDIO', role:'Logó, színpaletta, tipográfia, brand voice és Brand Kit', specialistIds:['brand'] },
  { id:'web-architect', name:'WEB ARCHITECT', role:'Struktúra, UX/UI, reszponzivitás és információs architektúra', specialistIds:['web','web-architect','ux-ui'] },
  { id:'content-growth', name:'CONTENT & GROWTH', role:'Tartalom, SEO, kampány és értékesítési üzenetek', specialistIds:['content','seo-content','marketing','sales'] },
  { id:'image-studio', name:'IMAGE STUDIO', role:'AI képek, vizuális kreatívok és galériák', specialistIds:[] },
  { id:'media-studio', name:'VIDEO STUDIO', role:'Videó, rövidformátum, storyboard és UGC', specialistIds:['video','social'] },
  { id:'social-studio', name:'SOCIAL STUDIO', role:'Social post, story és platformváltozatok', specialistIds:['social'] },
  { id:'template-studio', name:'TEMPLATE STUDIO', role:'Sablonillesztés és variációk', specialistIds:['template'] },
  { id:'extra-design-studio', name:'EXTRA DESIGN STUDIO', role:'Névjegy, meghívó, flyer, plakát, tattoo, planner és CNC', specialistIds:[] },
  { id:'streamer-gamer', name:'STREAMER & GAMER STUDIO', role:'Overlay, alert, scene, emote, badge és creator kreatívok', specialistIds:['video','social'] },
  { id:'merch-factory', name:'MERCH FACTORY', role:'Póló, hoodie, bögre, sapka és sticker artwork', specialistIds:['product'] },
  { id:'qa', name:'QA AGENT', role:'Minőségbiztosítás, validáció és acceptance', specialistIds:['reviewer','web-qa','builder'] },
];

export const FULL_AGENT_TEAM: AgentEntry[] = [...LIVE_AGENTS, ...PLANNED_AGENTS];

export interface AgentPlan {
  agents: AgentEntry[];
  reasons: Record<string, string>;
}

const RULES: Array<{id:string;terms:RegExp[];reason:string}> = [
  {id:'product',terms:[/mvp/i,/termék/i,/webshop/i,/webáruház/i,/shop/i],reason:'termék- és commerce-tervezés'},
  {id:'video',terms:[/videó/i,/video/i,/reels/i,/shorts/i,/ugc/i,/reklámfilm/i],reason:'videós kreatív'},
  {id:'marketing',terms:[/marketing/i,/kampány/i,/hirdetés/i,/ads/i],reason:'kampány és marketing'},
  {id:'social',terms:[/social/i,/instagram/i,/facebook/i,/tiktok/i,/poszt/i,/story/i],reason:'social kreatív'},
  {id:'sales',terms:[/értékesítés/i,/eladás/i,/ajánlat/i,/upsell/i,/sales/i],reason:'értékesítés'},
  {id:'web-architect',terms:[/weboldal/i,/website/i,/honlap/i,/webshop/i,/site/i],reason:'web-architektúra'},
  {id:'ux-ui',terms:[/weboldal/i,/website/i,/honlap/i,/ui/i,/ux/i,/interakció/i],reason:'UX/UI'},
  {id:'seo-content',terms:[/weboldal/i,/website/i,/honlap/i,/seo/i,/google/i,/kereső/i],reason:'SEO'},
];

export function planAgents(brief: string): AgentPlan {
  const chosen = new Set<string>(['core','master','huginn','brand','web','content','reviewer','builder']);
  const reasons: Record<string,string> = {
    core:'VYRON CORE a csapat főnöke és az összes specialistát összefogó orchestrátor',
    master:'DESIGNLY MASTER vezeti a kreatív döntéseket',
    huginn:'HUGINN a felhasználói guide és AI concierge',
    brand:'vizuális rendszer és márkakonvenciók',
    web:'webes struktúra és hierarchia',
    content:'tartalom és CTA',
    reviewer:'minőség- és elfogadási ellenőrzés',
    builder:'build-ready kimenet',
  };

  for (const rule of RULES) {
    if (rule.terms.some((term) => term.test(brief))) {
      chosen.add(rule.id);
      reasons[rule.id] = rule.reason;
    }
  }

  return {
    agents: FULL_AGENT_TEAM.filter((agent) => chosen.has(agent.id)),
    reasons,
  };
}
