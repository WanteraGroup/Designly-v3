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
  {id:'muninn',name:'MUNINN',role:'Memória- és kontextusréteg',capabilities:['context-memory','knowledge-summary','handoff'],source:'Designity / Mira',status:'planned'},
  {id:'web-architect',name:'WEB ARCHITECT',role:'Teljes információs architektúra',capabilities:['site-architecture','multi-page','navigation','user-flow'],source:'Designity',status:'planned'},
  {id:'ux-ui',name:'UX/UI AGENT',role:'Interakció, komponensek és hozzáférhetőség',capabilities:['ux','ui','components','interactions','accessibility'],source:'Designity',status:'planned'},
  {id:'seo-content',name:'SEO CONTENT AGENT',role:'SEO és konverziós tartalom',capabilities:['seo','metadata','conversion'],source:'Designity',status:'planned'},
  {id:'social',name:'SOCIAL AGENT',role:'Social kreatívok és platformváltozatok',capabilities:['social-post','social-story','platform-variants'],source:'Designity',status:'planned'},
  {id:'marketing',name:'MARKETING AGENT',role:'Kampány és marketinganyagok',capabilities:['campaign','ads','funnel','social'],source:'Designity / Nexora',status:'planned'},
  {id:'template',name:'TEMPLATE AGENT',role:'Sablonillesztés és metadata',capabilities:['template-matching','template-metadata'],source:'Designity',status:'planned'},
  {id:'product',name:'PRODUCT FACTORY',role:'Termék- és MVP-tervezés',capabilities:['product-concept','feature-set','offer-package'],source:'Nexora / Trenova',status:'planned'},
  {id:'tiktok-shop',name:'TIKTOK SHOP AGENT',role:'Social-commerce workflow',capabilities:['tiktok-shop','product-listing','shop-health'],source:'Trenova / Wantera',status:'planned'},
  {id:'video',name:'VIDEO CREATOR AGENT',role:'Rövid videó, hook, storyboard és UGC',capabilities:['video','reels','shorts','ugc','storyboard'],source:'Designity / Trenova',status:'planned'},
  {id:'sales',name:'SALES AGENT',role:'Ajánlat, upsell és értékesítési üzenetek',capabilities:['offer','upsell','sales-copy','follow-up'],source:'Nexora',status:'planned'},
  {id:'voice',name:'VOICE AGENT',role:'Hangvezérlés és beszédfeldolgozás',capabilities:['speech-to-text','text-to-speech','voice-ui'],source:'Mira / VEYRA',status:'planned'},
  {id:'translator',name:'REALTIME TRANSLATOR',role:'Többnyelvű fordítás és tolmácsolás',capabilities:['translation','interpreter','speech-translation'],source:'Mira-Mobile / VEYRA',status:'planned'},
  {id:'mira',name:'MIRA',role:'Személyi AI asszisztens',capabilities:['assistant','voice','reminders','mobile'],source:'Mira.AI / Mira-Mobile',status:'planned'},
  {id:'procurement',name:'AVENTOR',role:'B2B procurement intelligence',capabilities:['procurement','supplier-list','b2b'],source:'AVENTOR',status:'planned'},
  {id:'recruitment',name:'WANTERA',role:'Talent és recruitment intelligence',capabilities:['recruitment','job-matching','talent','cv'],source:'WANTERA',status:'planned'},
  {id:'social-publisher',name:'SOCIAL PUBLISHER',role:'Engedélyezett social publishing workflow',capabilities:['oauth','direct-post','approval','audit-log'],source:'Wantera Platform',status:'planned'},
  {id:'web-qa',name:'WEB QA',role:'Web QA, linkek, űrlapok és reszponzivitás',capabilities:['web-qa','links','forms','responsive'],source:'Designity',status:'planned'},
];

export const FULL_AGENT_TEAM: AgentEntry[] = [...LIVE_AGENTS, ...PLANNED_AGENTS];

export interface AgentPlan {
  agents: AgentEntry[];
  reasons: Record<string, string>;
}

const RULES: Array<{id:string;terms:RegExp[];reason:string}> = [
  {id:'product',terms:[/mvp/i,/termék/i,/webshop/i,/webáruház/i,/shop/i],reason:'termék- és commerce-tervezés'},
  {id:'tiktok-shop',terms:[/tiktok\s*shop/i,/seller/i,/product listing/i,/affiliate/i],reason:'social-commerce workflow'},
  {id:'video',terms:[/videó/i,/video/i,/reels/i,/shorts/i,/ugc/i,/reklámfilm/i],reason:'videós kreatív'},
  {id:'marketing',terms:[/marketing/i,/kampány/i,/hirdetés/i,/ads/i],reason:'kampány és marketing'},
  {id:'social',terms:[/social/i,/instagram/i,/facebook/i,/tiktok/i,/poszt/i,/story/i],reason:'social kreatív'},
  {id:'sales',terms:[/értékesítés/i,/eladás/i,/ajánlat/i,/upsell/i,/sales/i],reason:'értékesítés'},
  {id:'voice',terms:[/hang/i,/beszéd/i,/telefon/i,/voice/i,/voiceover/i],reason:'hanginterakció'},
  {id:'translator',terms:[/fordít/i,/tolmács/i,/többnyelv/i,/multilingual/i],reason:'fordítás'},
  {id:'procurement',terms:[/beszerzés/i,/beszállító/i,/procurement/i,/b2b/i],reason:'B2B procurement'},
  {id:'recruitment',terms:[/toborz/i,/recruit/i,/állás/i,/jelölt/i,/talent/i],reason:'recruitment'},
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
