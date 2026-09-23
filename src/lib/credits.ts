export type CreditAction='site'|'image'|'brand'|'social'|'video';
export const DEFAULT_COSTS:Record<CreditAction,number>={site:10,image:4,brand:8,social:3,video:12};
const KEY='designly-studio-credits-v4';
export function getCredits(){const n=Number(localStorage.getItem(KEY));return Number.isFinite(n)&&n>=0?n:100}
export function setCredits(n:number){localStorage.setItem(KEY,String(Math.max(0,Math.floor(n))))}
export function canSpend(action:CreditAction,costs=DEFAULT_COSTS){return getCredits()>=costs[action]}
export function spend(action:CreditAction,costs=DEFAULT_COSTS){const c=costs[action];if(!canSpend(action,costs))return false;setCredits(getCredits()-c);return true}
