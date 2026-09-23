import type { DesignlyTemplate } from '../types';

export interface CategorySpec {
  label: string;
  tone: string;
  sections: string;
}

/**
 * A kategoria-specifikacio: hangnem es szekciolista.
 *
 * Ez az, ami a briefet hasznalhatova teszi: a „weboldal egy etteremnek" es a
 * „weboldal egy fogaszatnak" kozott nem a szavak szama a kulonbseg, hanem hogy
 * az etteremnek etlap kell, a fogaszatnak pedig kezelesi lista.
 */
export const CATEGORY_SPECS: Record<string, CategorySpec> = {
  Business: { label: 'vállalkozás', tone: 'visszafogott, szakértői', sections: 'szolgáltatások, rólunk, kapcsolat' },
  Restaurant: { label: 'étterem', tone: 'éttermi, meleg, étvágygerjesztő', sections: 'étlap, nyitvatartás, asztalfoglalás' },
  'Real Estate': { label: 'ingatlan', tone: 'bizalmat keltő, tágas, professzionális', sections: 'kiemelt ingatlanok, szolgáltatások, kapcsolat' },
  Beauty: { label: 'szépségipar', tone: 'elegáns, prémium, letisztult', sections: 'szolgáltatások, árak, foglalás' },
  Fitness: { label: 'fitness', tone: 'energikus, erős, dinamikus', sections: 'bérletek, órarend, edzők' },
  Technology: { label: 'technológia', tone: 'modern, letisztult, tech', sections: 'funkciók, árazás, gyakori kérdések' },
  Events: { label: 'rendezvény', tone: 'figyelemfelkeltő, ünnepi', sections: 'program, helyszín, jegyinformációk' },
  Wedding: { label: 'esküvő', tone: 'romantikus, elegáns, klasszikus', sections: 'menetrend, helyszín, visszajelzés' },
  Personal: { label: 'személyes', tone: 'őszinte, karakteres', sections: 'rólam, munkák, kapcsolat' },
  'E-commerce': { label: 'webshop', tone: 'bizalomkeltő, vásárlásra ösztönző', sections: 'termékek, szállítás, garancia' },
  Marketing: { label: 'marketing', tone: 'magabiztos, eredményorientált', sections: 'szolgáltatások, eredmények, kapcsolat' },
  Corporate: { label: 'nagyvállalat', tone: 'visszafogott, szakértői', sections: 'szolgáltatások, referenciák, karrier' },
  Automotive: { label: 'autóipar', tone: 'erőteljes, prémium', sections: 'kínálat, szerviz, kapcsolat' },
  Hospitality: { label: 'vendéglátás', tone: 'meleg, hívogató', sections: 'szobák, szolgáltatások, foglalás' },
  Healthcare: { label: 'egészségügy', tone: 'nyugtató, tiszta, bizalomkeltő', sections: 'kezelések, orvosok, időpontkérés' },
  Education: { label: 'oktatás', tone: 'világos, segítőkész', sections: 'kurzusok, oktatók, jelentkezés' },
  Finance: { label: 'pénzügy', tone: 'szakértői, megbízható', sections: 'szolgáltatások, folyamat, kapcsolat' },
  Construction: { label: 'építőipar', tone: 'robusztus, megbízható', sections: 'szolgáltatások, munkák, ajánlatkérés' },
  Fashion: { label: 'divat', tone: 'stílusos, prémium', sections: 'kollekció, rólunk, kapcsolat' },
  Travel: { label: 'utazás', tone: 'inspiráló, meleg', sections: 'úti célok, csomagok, foglalás' },
  Creator: { label: 'tartalomgyártó', tone: 'személyes, karakteres', sections: 'tartalmak, együttműködés, kapcsolat' },
  Gaming: { label: 'gaming', tone: 'dramatikus, sötét, energikus', sections: 'játékok, közösség, hírek' },
  Nonprofit: { label: 'civil szervezet', tone: 'őszinte, elkötelezett', sections: 'küldetés, programok, támogatás' },
  Luxury: { label: 'luxus', tone: 'luxus, exkluzív, visszafogott', sections: 'válogatott kollekció, márkatörténet, kapcsolat' },
};

/**
 * Egy kategoria specifikacioja, vagy egy biztonsagos alapertelmezes.
 * Sosem ad vissza undefined-et: egy ismeretlen kategoria generikus briefet kap,
 * nem hibauzenetet.
 */
export function specFor(category: string): CategorySpec {
  return (
    CATEGORY_SPECS[category] ?? {
      label: 'vállalkozás',
      tone: 'professzionális, letisztult',
      sections: 'szolgáltatások, rólunk, kapcsolat',
    }
  );
}

/** Sablonbol kiindulo brief. A sablon struktura es hangnem, nem kesz oldal. */
export function briefFromTemplate(template: DesignlyTemplate, ownerName?: string): string {
  const spec = specFor(template.category);
  const who = ownerName ? `${ownerName} vállalkozásának` : 'egy vállalkozás';
  return `Készíts egy ${spec.label} jellegű, ${spec.tone} stílusú weboldalt ${who} számára, „${template.name}” néven. Legyenek rajta ezek a részek: ${spec.sections}.`;
}
