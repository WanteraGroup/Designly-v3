export type AgentCapability={id:string;name:string;role:string;capabilities:string[];source:string};

export const DESIGNLY_AGENT_REGISTRY:AgentCapability[]=[
{id:"core",name:"VYRON CORE",role:"főorchestrátor; routing, feladatbontás, handoff",capabilities:["orchestration","routing","mission-plan","handoff"],source:"NEXORA / Designity"},
{id:"master",name:"DESIGNLY MASTER",role:"fő design director; kreatív irány és vizuális rendszer",capabilities:["creative-direction","design-brief","visual-system"],source:"Designity"},
{id:"huginn",name:"HUGINN",role:"Odin hollója; AI concierge és navigátor",capabilities:["navigation","help","onboarding","project-guidance"],source:"Designity"},
{id:"muninn",name:"MUNINN",role:"memória- és kontextusréteg",capabilities:["context-memory","knowledge-summary","handoff"],source:"Designity / Mira"},
{id:"brand",name:"BRAND AGENT",role:"márkaidentitás és Brand Kit",capabilities:["logo","palette","typography","brand-kit"],source:"Designity"},
{id:"web",name:"WEB AGENT",role:"weboldal struktúra és reszponzív hierarchia",capabilities:["website","landing","sections","responsive"],source:"Designity"},
{id:"web-architect",name:"WEB ARCHITECT",role:"információs architektúra és user-flow",capabilities:["site-architecture","multi-page","navigation","user-flow"],source:"Designity"},
{id:"ux-ui",name:"UX/UI AGENT",role:"interakció, komponensek, accessibility",capabilities:["ux","ui","components","interactions","accessibility"],source:"Designity"},
{id:"content",name:"CONTENT AGENT",role:"headline, CTA és marketing szöveg",capabilities:["headlines","copy","cta","content-structure"],source:"Designity / Nexora"},
{id:"seo-content",name:"SEO CONTENT AGENT",role:"SEO és konverziós tartalom",capabilities:["seo","metadata","conversion"],source:"Designity"},
{id:"marketing",name:"MARKETING AGENT",role:"kampány, ads és funnel",capabilities:["campaign","ads","funnel","social"],source:"Designity / Nexora"},
{id:"social",name:"SOCIAL AGENT",role:"social kreatívok",capabilities:["social-post","social-story","platform-variants"],source:"Designity"},
{id:"template",name:"TEMPLATE AGENT",role:"sablonillesztés",capabilities:["template-matching","template-metadata"],source:"Designity"},
{id:"product",name:"PRODUCT FACTORY",role:"termék- és MVP-tervezés",capabilities:["product-concept","feature-set","offer-package"],source:"Nexora / Trenova"},
{id:"tiktok-shop",name:"TIKTOK SHOP AGENT",role:"social-commerce",capabilities:["tiktok-shop","product-listing","shop-health"],source:"Trenova / Wantera"},
{id:"video",name:"VIDEO CREATOR AGENT",role:"rövid videó és UGC",capabilities:["video","reels","shorts","ugc","storyboard"],source:"Designity / Trenova"},
{id:"sales",name:"SALES AGENT",role:"értékesítési workflow",capabilities:["offer","upsell","sales-copy","follow-up"],source:"Nexora"},
{id:"voice",name:"VOICE AGENT",role:"hangvezérlés és beszéd",capabilities:["speech-to-text","text-to-speech","voice-ui"],source:"Mira / VEYRA"},
{id:"translator",name:"REALTIME TRANSLATOR",role:"fordítás és tolmácsolás",capabilities:["translation","interpreter","speech-translation"],source:"Mira-Mobile / VEYRA"},
{id:"mira",name:"MIRA",role:"személyi AI asszisztens",capabilities:["assistant","voice","reminders","mobile"],source:"Mira.AI / Mira-Mobile"},
{id:"procurement",name:"AVENTOR",role:"B2B procurement intelligence",capabilities:["procurement","supplier-list","b2b"],source:"AVENTOR"},
{id:"recruitment",name:"WANTERA",role:"talent/recruitment intelligence",capabilities:["recruitment","job-matching","talent","cv"],source:"WANTERA"},
{id:"social-publisher",name:"SOCIAL PUBLISHER",role:"engedélyezett social publishing",capabilities:["oauth","direct-post","approval","audit-log"],source:"Wantera Platform"},
{id:"reviewer",name:"REVIEWER",role:"minőség- és kockázati ellenőrzés",capabilities:["qa","validation","risk-review","acceptance"],source:"Nexora / Designity"},
{id:"builder",name:"BUILDER",role:"build-spec és acceptance criteria",capabilities:["implementation-plan","acceptance-criteria","artifact-plan"],source:"Nexora / Designity"},
{id:"web-qa",name:"WEB QA",role:"link, form és responsive QA",capabilities:["web-qa","links","forms","responsive"],source:"Designity"},
];

export function getAgent(id:string){return DESIGNLY_AGENT_REGISTRY.find(a=>a.id===id)||null;}
