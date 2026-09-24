import { useState } from 'react';
import type { LanguageCode } from '../lib/types';

export const LANGUAGE_CODES = ['hu', 'en', 'de', 'fr', 'es', 'it', 'pl', 'uk', 'ro', 'nl'] as const;

/*
 * Az UI szovegei.
 *
 * A `hu` a referencia-nyelv: minden kulcsnak itt KELL lennie. A tobbi nyelv
 * reszleges lehet — ha egy kulcs hianyzik, a rendszer a magyarra esik vissza,
 * nem a kulcsnevet irja ki. Ez szandekos: egy felig leforditott felulet jobb,
 * mint egy `landing.nav.pricing` a menuben.
 *
 * Az `uk` kulcsai szandekosan hianyoznak meg — azt kulon korben potoljuk.
 */
export const TRANSLATIONS: Partial<Record<LanguageCode, Record<string, string>>> = {
  hu: {
    'nav.services': 'Szolgáltatások',
    'nav.agents': 'Agentek',
    'nav.templates': 'Sablonok',
    'nav.pricing': 'Árak',
    'nav.contact': 'Kapcsolat',
    'cta.start': 'Kezdj el',
    'cta.startNow': 'Kezdj el most',
    'cta.buildSite': 'Weboldal készítése',
    'cta.buildYours': 'Építsük meg a tiédet',
    'cta.openGallery': 'Galéria megnyitása',
    'nav.extraStudio': 'Extra Stúdió',
    'nav.streamerGamer': 'Streamer & Gamer',
    'stat.modules': 'Fő modul',
    'stat.templates': 'Sablon',
    'stat.categories': 'Kategória',
    'stat.languages': 'Nyelv',
    'services.heading': 'Mit kínálunk?',
    'services.lead': 'Website, Brand Kit, kampány és a klasszikus DESIGNLY extra műhelyek egy folyamatban.',
    'services.active': 'AKTÍV',
    'agents.heading': 'Agent csapat',
    'agents.lead': 'A felhasználó a DESIGNLY fő moduljait látja. A háttérben a VYRON CORE a briefhez illő specialistákat automatikusan választja ki és koordinálja.',
    'flow.brief': 'BRIEF',
    'flow.experts': 'szakértők',
    'flow.review': 'ellenőrzés',
    'flow.result': 'eredmény',
    'templates.heading': 'Sablonok',
    'templates.lead': 'sablon, {count} kategóriában. A sablon struktúra és hangnem, nem kész oldal — a generátor építi meg belőle a lapot.',
    'pricing.heading': 'Árak',
    'pricing.lead': 'A díjszabás a szerveren él, nem a kliensen — egy kliens, ami olyan számot tart, amivel a szerver nem egyezik, elszámolási hiba.',
    'pricing.free': 'Kezdés ingyen',
    'pricing.freeBody': 'A generátor azonnal kipróbálható. A működéshez szükséges provider- és rendszerbeállításokat a szerver kezeli; a kliens nem tartja a terhelési logikát.',
    'manifesto.title': 'A JÖVŐT NEM VÁRJUK.',
    'manifesto.titleAccent': 'MI ÉPÍTJÜK.',
    'manifesto.body': 'A DESIGNLY AI-nál hiszünk abban, hogy az emberi kreativitás és a mesterséges intelligencia együtt határtalan lehetőségeket teremt. Segítünk vállalkozásoknak, alkotóknak és csapatoknak, hogy ötleteikből valós eredmény szülessen.',
    'footer.rights': '© 2026 DESIGNLY AI. MINDEN JOG FENNTARTVA.',
    'lang.label': 'Nyelv',
  },
  en: {
    'nav.services': 'Services',
    'nav.agents': 'Agents',
    'nav.templates': 'Templates',
    'nav.pricing': 'Pricing',
    'nav.contact': 'Contact',
    'cta.start': 'Get started',
    'cta.startNow': 'Start now',
    'cta.buildSite': 'Build a website',
    'cta.buildYours': 'Let us build yours',
    'cta.openGallery': 'Open gallery',
    'nav.extraStudio': 'Extra Studio',
    'nav.streamerGamer': 'Streamer & Gamer',
    'stat.modules': 'Core modules',
    'stat.templates': 'Templates',
    'stat.categories': 'Categories',
    'stat.languages': 'Languages',
    'services.heading': 'What we offer',
    'services.lead': 'Website, Brand Kit, campaigns and the classic DESIGNLY extra workshops in one flow.',
    'services.active': 'ACTIVE',
    'agents.heading': 'Agent team',
    'agents.lead': 'The user sees the main DESIGNLY modules. In the background VYRON CORE automatically selects and coordinates the specialists that fit the brief.',
    'flow.brief': 'BRIEF',
    'flow.experts': 'experts',
    'flow.review': 'review',
    'flow.result': 'result',
    'templates.heading': 'Templates',
    'templates.lead': 'templates in {count} categories. A template is structure and tone, not a finished page — the generator builds the page from it.',
    'pricing.heading': 'Pricing',
    'pricing.lead': 'Pricing lives on the server, not on the client — a client holding a number the server disagrees with is a billing error.',
    'pricing.free': 'Start free',
    'pricing.freeBody': 'The generator works immediately. Provider and system configuration is handled by the server; the client never holds the billing logic.',
    'manifesto.title': 'WE DO NOT WAIT FOR THE FUTURE.',
    'manifesto.titleAccent': 'WE BUILD IT.',
    'manifesto.body': 'At DESIGNLY AI we believe human creativity and artificial intelligence together create limitless possibilities. We help businesses, creators and teams turn ideas into real results.',
    'footer.rights': '© 2026 DESIGNLY AI. ALL RIGHTS RESERVED.',
    'lang.label': 'Language',
  },
  de: {
    'nav.services': 'Leistungen',
    'nav.agents': 'Agenten',
    'nav.templates': 'Vorlagen',
    'nav.pricing': 'Preise',
    'nav.contact': 'Kontakt',
    'cta.start': 'Jetzt starten',
    'cta.startNow': 'Jetzt beginnen',
    'cta.buildSite': 'Website erstellen',
    'cta.buildYours': 'Lass uns deine bauen',
    'cta.openGallery': 'Galerie öffnen',
    'nav.extraStudio': 'Extra Studio',
    'nav.streamerGamer': 'Streamer & Gamer',
    'stat.modules': 'Kernmodule',
    'stat.templates': 'Vorlagen',
    'stat.categories': 'Kategorien',
    'stat.languages': 'Sprachen',
    'services.heading': 'Was wir bieten',
    'services.lead': 'Website, Brand Kit, Kampagnen und die klassischen DESIGNLY Extra-Werkstätten in einem Ablauf.',
    'services.active': 'AKTIV',
    'agents.heading': 'Agenten-Team',
    'agents.lead': 'Der Nutzer sieht die Hauptmodule von DESIGNLY. Im Hintergrund wählt VYRON CORE automatisch die passenden Spezialisten aus und koordiniert sie.',
    'flow.brief': 'BRIEFING',
    'flow.experts': 'Experten',
    'flow.review': 'Prüfung',
    'flow.result': 'Ergebnis',
    'templates.heading': 'Vorlagen',
    'templates.lead': 'Vorlagen in {count} Kategorien. Eine Vorlage ist Struktur und Tonalität, keine fertige Seite — der Generator baut die Seite daraus.',
    'pricing.heading': 'Preise',
    'pricing.lead': 'Die Preisgestaltung liegt auf dem Server, nicht im Client — ein Client mit einer abweichenden Zahl ist ein Abrechnungsfehler.',
    'pricing.free': 'Kostenlos starten',
    'pricing.freeBody': 'Der Generator ist sofort nutzbar. Provider- und Systemkonfiguration verwaltet der Server; der Client hält keine Abrechnungslogik.',
    'manifesto.title': 'AUF DIE ZUKUNFT WARTEN WIR NICHT.',
    'manifesto.titleAccent': 'WIR BAUEN SIE.',
    'manifesto.body': 'Bei DESIGNLY AI glauben wir, dass menschliche Kreativität und künstliche Intelligenz gemeinsam grenzenlose Möglichkeiten schaffen. Wir helfen Unternehmen, Kreativen und Teams, Ideen in echte Ergebnisse zu verwandeln.',
    'footer.rights': '© 2026 DESIGNLY AI. ALLE RECHTE VORBEHALTEN.',
    'lang.label': 'Sprache',
  },
};

/**
 * Egy nyelv szotara, a magyarra visszaesve.
 *
 * Nem a kulcsnevet adja vissza hianyzo fordítás eseten, hanem a magyar
 * szoveget — igy a felulet sosem mutat `landing.nav.pricing`-et.
 */
export function dictionaryFor(lang: string): Record<string, string> {
  const code = LANGUAGE_CODES.includes(lang as LanguageCode) ? lang as LanguageCode : 'hu';
  return { ...TRANSLATIONS.hu, ...(TRANSLATIONS[code] ?? {}) };
}

/**
 * Szoveg keresese, `{placeholder}` helyettesitessel.
 *
 *   t('templates.lead', { count: '138 240' })
 */
export function translate(
  dict: Record<string, string>,
  key: string,
  vars?: Record<string, string>,
): string {
  const template = dict[key] ?? TRANSLATIONS.hu[key] ?? key;
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (acc, [name, value]) => acc.replaceAll('{' + name + '}', value),
    template,
  );
}

/**
 * A fordítás hook-ja.
 *
 * A nyelv a `?lang=` URL-parameterbol jon, es a valtas URL-t ir at (history
 * replace), hogy az ujratoltes is megtartsa. Ez azert jobb, mint egy React
 * context, mert a `Landing` es a `Home` KULON route-on el, es a `?lang=` a
 * kettejuk kozott is megmarad.
 */
export function useLanguage(): [LanguageCode, (next: LanguageCode) => void] {
  const [lang, setLang] = useState<LanguageCode>(() => {
    const requested = new URLSearchParams(window.location.search).get('lang');
    return LANGUAGE_CODES.includes(requested as LanguageCode) ? requested as LanguageCode : 'hu';
  });

  function change(next: LanguageCode) {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', next);
    window.history.replaceState({}, '', url.toString());
    setLang(next);
  }

  return [lang, change];
}
