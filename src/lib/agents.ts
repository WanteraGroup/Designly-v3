import type { DesignlyTemplate } from '../types';

/**
 * Az agent-registry: minden hasznalhato agent egy helyen.
 *
 * A Wantera projektcsalad 17 repojabol gyujtve — a `source` mezo mondja meg,
 * melyikbol. Nem minden agent fut ma: a registry a KEPESSEG-nyilvantartas, es a
 * `status` mondja meg, melyik van bekotve. Egy agent, ami a listan van, de
 * `planned`, nem hazudik mukodest — csak helyet jelol.
 */

export type AgentStatus = 'live' | 'planned';

export interface AgentEntry {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
  source: string;
  status: AgentStatus;
}

/**
 * A fo agensek, amelyek ma is futnak a generalasban.
 *
 * A `polish` es a `site` a `vey-generate` gateway-hivasban el; a `refine` a
 * `vey-refine` Edge Functionben. Ezek valodi kepessegek, nem tervek.
 */
export const LIVE_AGENTS: AgentEntry[] = [
  {
    id: 'huginn',
    name: 'HUGINN',
    role: 'Orchestrator — a brief ertelmezese, feladatbontas es specialistak kivalasztasa',
    capabilities: ['brief-parse', 'task-split', 'agent-routing', 'creative-direction'],
    source: 'Designity',
    status: 'live',
  },
  {
    id: 'brand',
    name: 'BRAND',
    role: 'Markaidentitas — szinek, tipografia, hangnem',
    capabilities: ['palette', 'typography', 'brand-kit', 'tone'],
    source: 'Designity',
    status: 'live',
  },
  {
    id: 'web',
    name: 'WEB',
    role: 'Weboldal — struktura, szekciok, reszponziv hierarchia',
    capabilities: ['site-structure', 'sections', 'responsive', 'landing'],
    source: 'Designity',
    status: 'live',
  },
  {
    id: 'content',
    name: 'CONTENT',
    role: 'Szoveg — headline, CTA, rovid marketing szoveg',
    capabilities: ['headlines', 'cta', 'copy', 'content-structure'],
    source: 'Designity',
    status: 'live',
  },
  {
    id: 'qa',
    name: 'QA',
    role: 'Ellenorzes — a kimenet szerkezete es a blokk-allow-list',
    capabilities: ['structure-check', 'allow-list', 'fallback'],
    source: 'Designity',
    status: 'live',
  },
];

/**
 * A teljes csalad agentjei. A `planned` bejegyzesek nem futnak ma — ezek a
 * kovetkezo korok munkaja, es a felulet `HAMAROSAN` jelolessel mutatja oket.
 */
export const PLANNED_AGENTS: AgentEntry[] = [
  { id: 'vyron', name: 'VYRON', role: 'Uzleti strategia es Business Builder', capabilities: ['business-plan','product-spec','mvp','pricing','validation'], source: 'nexora-ai', status: 'planned' },
  { id: 'web-architect', name: 'WEB ARCHITECT', role: 'Teljes weboldal informacios architektura', capabilities: ['site-architecture','multi-page','navigation','user-flow'], source: 'Designity', status: 'planned' },
  { id: 'ux-ui', name: 'UX/UI', role: 'Webes elmeny es komponensrendszer', capabilities: ['ux','ui','components','interactions','accessibility'], source: 'Designity', status: 'planned' },
  { id: 'seo-content', name: 'SEO CONTENT', role: 'Tartalom, SEO es konverzios szoveg', capabilities: ['seo','metadata','headings','conversion'], source: 'Designity', status: 'planned' },
  { id: 'social', name: 'SOCIAL', role: 'Social posztok es platform-specifikus hierarchia', capabilities: ['social-post','social-story','platform-variants'], source: 'Designity', status: 'planned' },
  { id: 'marketing', name: 'MARKETING', role: 'Kampany es marketinganyagok', capabilities: ['campaign','ads','funnel','social'], source: 'Designity/Nexora', status: 'planned' },
  { id: 'print', name: 'PRINT', role: 'Nyomdai anyagok — brosura, nevjegy, arlista', capabilities: ['print-layouts','brochure','business-card','pricelist'], source: 'Designity', status: 'planned' },
  { id: 'template', name: 'TEMPLATE', role: 'Sablonok cimkezese es briefhez illesztese', capabilities: ['template-matching','template-metadata'], source: 'Designity', status: 'planned' },
  { id: 'product', name: 'PRODUCT FACTORY', role: 'Eladhato termektervezo', capabilities: ['product-concept','feature-set','offer-package'], source: 'nexora-ai/Trenova', status: 'planned' },
  { id: 'tiktok-shop', name: 'TIKTOK SHOP', role: 'Social-commerce folyamat', capabilities: ['tiktok-shop','product-listing','creative','shop-health'], source: 'Trenova/Wantera', status: 'planned' },
  { id: 'video', name: 'VIDEO CREATOR', role: 'Rovid video es reklam kreativ', capabilities: ['video','reels','shorts','ugc','storyboard','hook'], source: 'Trenova', status: 'planned' },
  { id: 'sales', name: 'SALES', role: 'Ertekesitesi specialista', capabilities: ['offer','upsell','sales-copy','follow-up'], source: 'nexora-ai', status: 'planned' },
  { id: 'muninn', name: 'MUNINN', role: 'Memoria- es kontextusreteg', capabilities: ['context-memory','knowledge-summary','handoff'], source: 'Designity', status: 'planned' },
  { id: 'voice', name: 'VOICE', role: 'Hangvezerles es beszedfeldolgozas', capabilities: ['speech-to-text','text-to-speech','voice-ui'], source: 'Mira/VEYRA', status: 'planned' },
  { id: 'translator', name: 'TRANSLATOR', role: 'Tobbnyelvu fordit es tolmacsolas', capabilities: ['translation','interpreter','speech-translation'], source: 'Mira-Mobile/VEYRA', status: 'planned' },
  { id: 'mira', name: 'MIRA', role: 'Szemelyi AI asszisztens', capabilities: ['assistant','voice','reminders','mobile'], source: 'Mira.AI/Mira-Mobile', status: 'planned' },
  { id: 'procurement', name: 'AVENTOR', role: 'B2B beszerzesi intelligencia', capabilities: ['procurement','supplier-list','b2b'], source: 'AVENTOR', status: 'planned' },
  { id: 'recruitment', name: 'WANTERA', role: 'Talent es toborzas intelligencia', capabilities: ['recruitment','job-matching','talent','cv'], source: 'wantera-platform', status: 'planned' },
  { id: 'social-publisher', name: 'SOCIAL PUBLISHER', role: 'Engedelyezett social publishing workflow', capabilities: ['oauth','direct-post','approval','audit-log'], source: 'wantera-platform', status: 'planned' },
  { id: 'reviewer', name: 'REVIEWER', role: 'Minoseg es kockazat ellenorzes', capabilities: ['qa','validation','risk-review'], source: 'nexora-ai', status: 'planned' },
  { id: 'builder', name: 'BUILDER', role: 'Build-specifikacio es elfogadasi kriteriumok', capabilities: ['implementation-plan','acceptance-criteria'], source: 'nexora-ai', status: 'planned' },
];

/** A teljes csalad egy listaban. */
export const FULL_AGENT_TEAM: AgentEntry[] = [...LIVE_AGENTS, ...PLANNED_AGENTS];

/**
 * A brief alapjan kivalasztja a relevans specialistakat.
 *
 * A szabalyok ugyanazok, amiket a Wantera orchestrator hasznalt — a
 * `design-master`, `content` es `brand` minden projektben benne van, mert
 * minden generalt oldalnak kell hierarchia, szoveg es vizualis rendszer.
 */
export interface AgentPlan {
  agents: AgentEntry[];
  reasons: Record<string, string>;
}

const RULES: Array<{ id: string; terms: RegExp[]; reason: string }> = [
  { id: 'vyron', terms: [/üzleti terv/i, /üzleti ötlet/i, /mvp/i, /indulótőke/i], reason: 'üzleti és MVP-specifikáció' },
  { id: 'print', terms: [/névjegy/i, /szórólap/i, /brochúra/i, /plakát/i, /árlista/i, /étlap/i], reason: 'nyomdai anyag' },
  { id: 'video', terms: [/videó/i, /reels/i, /shorts/i, /ugc/i, /reklámfilm/i], reason: 'videós kreatív' },
  { id: 'marketing', terms: [/kampány/i, /hirdetés/i, /marketing/i, /ads/i], reason: 'kampány és marketing' },
  { id: 'social', terms: [/social/i, /instagram/i, /facebook/i, /tiktok/i, /poszt/i], reason: 'social felület' },
  { id: 'product', terms: [/termék/i, /webshop/i, /webáruház/i, /shop/i], reason: 'termék és commerce' },
  { id: 'sales', terms: [/értékesítés/i, /eladás/i, /ajánlat/i, /upsell/i], reason: 'értékesítési folyamat' },
  { id: 'voice', terms: [/hang/i, /beszéd/i, /telefon/i, /voice/i], reason: 'hangalapú interakció' },
  { id: 'translator', terms: [/fordít/i, /tolmács/i, /többnyelv/i, /multilingual/i], reason: 'fordítás' },
  { id: 'recruitment', terms: [/toborz/i, /állás/i, /jelölt/i], reason: 'toborzás' },
  { id: 'procurement', terms: [/beszerzés/i, /beszállító/i, /b2b/i], reason: 'beszerzés' },
  { id: 'web-architect', terms: [/weboldal/i, /honlap/i, /website/i, /site/i], reason: 'teljes oldalarchitektúra' },
  { id: 'ux-ui', terms: [/weboldal/i, /honlap/i, /ui/i, /ux/i], reason: 'UX/UI rendszer' },
  { id: 'seo-content', terms: [/weboldal/i, /honlap/i, /seo/i, /google/i], reason: 'tartalom és SEO' },
];

export function planAgents(brief: string): AgentPlan {
  const chosen = new Set<string>(['huginn', 'brand', 'web', 'content', 'qa']);
  const reasons: Record<string, string> = {
    huginn: 'minden projekt orchestrációt igényel',
    brand: 'a vizuális rendszer konzisztenciája miatt',
    web: 'a lap szerkezete és hierarchiája miatt',
    content: 'a kész oldalnak szöveg és CTA kell',
    qa: 'a kimenet ellenőrzése miatt',
  };

  for (const rule of RULES) {
    if (rule.terms.some((t) => t.test(brief))) {
      chosen.add(rule.id);
      reasons[rule.id] = rule.reason;
    }
  }

  return {
    agents: FULL_AGENT_TEAM.filter((a) => chosen.has(a.id)),
    reasons,
  };
}
