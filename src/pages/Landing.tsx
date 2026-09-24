import { Sparkles, Users, LayoutTemplate, Wand2, Download, Check, Clock, Briefcase, Video, Languages, Gamepad2 } from 'lucide-react';
import { LANGUAGES } from '../lib/constants';
import { FULL_AGENT_TEAM, PUBLIC_AGENT_MODULES } from '../lib/agents';
import { CATEGORY_SPECS } from '../lib/brief';
import { TEMPLATE_TOTAL } from '../lib/templates';
import designlyHeroImage from '../assets/designly-hero';
import { templateCoverUrl } from '../lib/template-art';

/**
 * A nyito oldal.
 *
 * Nem a generalot teszi elore, hanem azt mutatja meg, mi a rendszer: huszonnegy
 * kategoria, huszonegy agent, szazharmincnyolcezer sablon, tiz nyelv. A generalo
 * egy kattintasra van, de elotte latni kell, mit kap a felhasznalo — kulonben
 * egy ures szovegdoboz az elso benyomas.
 */
export default function Landing() {
  const featureCount = Object.keys(CATEGORY_SPECS).length;
  const categoryNames = Object.keys(CATEGORY_SPECS);
  const featured = [0, 24, 48, 72, 96, 120];

  return (
    <div className="relative">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/75 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/hero-bg.svg" alt="" className="h-8 w-8 rounded-md" />
            <span className="font-display text-sm tracking-[0.22em] text-ink-100">
              DESIGNLY <span className="text-accent">V3</span>
            </span>
          </div>

          <nav className="hidden gap-7 text-sm text-ink-300 md:flex">
            {['Szolgáltatások', 'Agentek', 'Sablonok', 'Árak', 'Kapcsolat'].map((item) => (
              <a
                key={item}
                href={item === 'Agentek' ? '#agents' : item === 'Sablonok' ? '#templates' : '#'}
                className="transition hover:text-ink-100"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <select
              className="border-none bg-transparent text-xs text-ink-200 outline-none"
              defaultValue="hu"
              aria-label="Nyelv"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-canvas">
                  {l.flag}
                </option>
              ))}
            </select>
            <a href="/app" className="vp-btn text-xs">
              Kezdj el
            </a>
          </div>
        </div>
      </header>

      <section
        className="relative mx-auto min-h-[720px] overflow-hidden border-b border-line bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(rgba(5,7,10,.12), rgba(5,7,10,.78)), url(${designlyHeroImage})` }}
        aria-label="DESIGNLY fő vizuális"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(0,0,0,.45)_100%)]" />
        <div className="relative mx-auto flex min-h-[720px] max-w-6xl flex-col items-center justify-end px-6 pb-16 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="/app" className="vp-btn">
              <Sparkles className="h-4 w-4" />
              Weboldal készítése
            </a>
            <a href="/app?tab=studio" className="vp-btn-ghost">
              <Wand2 className="h-4 w-4" />
              Extra Stúdió
            </a>
            <a href="/app?tab=gamer" className="vp-btn-ghost">
              <Gamepad2 className="h-4 w-4" />
              Streamer & Gamer
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {featured.map((i) => (
            <img
              key={i}
              src={templateCoverUrl(i)}
              alt=""
              className="aspect-[4/3] w-full rounded-xl border border-line object-cover opacity-80 transition hover:opacity-100"
            />
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-panel/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 lg:grid-cols-4">
          {[
            { value: `${PUBLIC_AGENT_MODULES.length}`, label: 'Fő modul' },
            { value: TEMPLATE_TOTAL.toLocaleString('hu-HU'), label: 'Sablon' },
            { value: `${FULL_AGENT_TEAM.length - PUBLIC_AGENT_MODULES.length}`, label: 'Háttérspecialista' },
            { value: `${LANGUAGES.length}`, label: 'Nyelv' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-3xl text-accent">{s.value}</p>
              <p className="mt-1 text-xs tracking-[0.16em] text-ink-400">
                {s.label.toUpperCase()}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-center font-display text-3xl text-ink-100">Mit kínálunk?</h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-sm text-ink-300">
          Website, Brand Kit, kampány és a klasszikus DESIGNLY extra műhelyek egy folyamatban.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Sparkles, name: 'CREATE', desc: 'Briefből induló alkotási folyamat és generálás.' },
            { icon: Briefcase, name: 'BRAND STUDIO', desc: 'Logó, színpaletta, tipográfia, brand voice és Brand Kit.' },
            { icon: LayoutTemplate, name: 'WEB ARCHITECT', desc: 'Struktúra, UX/UI, reszponzivitás és információs architektúra.' },
            { icon: Users, name: 'CONTENT & GROWTH', desc: 'Tartalom, SEO, kampány és értékesítési kreatívok.' },
            { icon: Wand2, name: 'IMAGE STUDIO', desc: 'AI képgenerálás és vizuális kreatívok.' },
            { icon: Video, name: 'MEDIA STUDIO', desc: 'Videó, rövidformátum, storyboard és UGC.' },
            { icon: Wand2, name: 'SOCIAL STUDIO', desc: 'Social post, story és platformváltozatok.' },
            { icon: LayoutTemplate, name: 'TEMPLATE STUDIO', desc: 'Sablonillesztés és variációk.' },
            { icon: Wand2, name: 'EXTRA DESIGN STUDIO', desc: 'Névjegy, meghívó, flyer, plakát, poszter, Tattoo, Planner és CNC.' },
            { icon: Gamepad2, name: 'STREAMER & GAMER STUDIO', desc: 'Overlay, alert, scene, thumbnail, emote és badge.' },
            { icon: Briefcase, name: 'MERCH FACTORY', desc: 'Póló, hoodie, bögre, sapka és sticker artwork.' },
            { icon: Check, name: 'QA AGENT', desc: 'Validáció, minőségellenőrzés és acceptance.' },
          ].map((m) => (
            <div key={m.name} className="vp-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <m.icon className="h-5 w-5 text-accent" />
                {m.live ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <Check className="h-3 w-3" /> AKTÍV
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-ink-400">
                    <Clock className="h-3 w-3" /> HAMAROSAN
                  </span>
                )}
              </div>
              <h3 className="font-display text-lg text-ink-100">{m.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="agents" className="border-y border-line bg-panel/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="mb-3 text-center font-display text-3xl text-ink-100">Agent csapat</h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-sm leading-relaxed text-ink-300">
            A felhasználó a DESIGNLY fő moduljait látja. A háttérben a VYRON CORE a briefhez illő specialistákat automatikusan választja ki és koordinálja.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PUBLIC_AGENT_MODULES.map((module) => (
              <div key={module.id} className="rounded-xl border border-line bg-panel-hi/50 px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold tracking-wider text-ink-100">{module.name}</span>
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-ink-300">{module.role}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-3 text-xs text-ink-400">
            {['BRIEF', 'szakértők', 'ellenőrzés', 'eredmény'].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-3">
                <span className="rounded-full border border-line px-3 py-1 text-ink-200">
                  {step}
                </span>
                {i < arr.length - 1 && <span className="text-accent">→</span>}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="templates" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-center font-display text-3xl text-ink-100">Sablonok</h2>
        <p className="mx-auto mb-10 max-w-2xl text-center text-sm leading-relaxed text-ink-300">
          {TEMPLATE_TOTAL.toLocaleString('hu-HU')} sablon, {featureCount} kategóriában. A sablon
          struktúra és hangnem, nem kész oldal — a generátor építi meg belőle a lapot.
        </p>

        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 40, 88, 130].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-line bg-panel">
              <img src={templateCoverUrl(i)} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="px-4 py-3">
                <p className="text-xs text-ink-200">{categoryNames[i % featureCount]}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {categoryNames.slice(0, 14).map((c) => (
            <span key={c} className="rounded-full border border-line px-3 py-1 text-xs text-ink-300">
              {c}
            </span>
          ))}
        </div>

        <div className="text-center">
          <a href="/app" className="vp-btn-ghost">
            <LayoutTemplate className="h-4 w-4" />
            Galéria megnyitása
          </a>
        </div>
      </section>

      <section className="border-y border-line bg-panel/40">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="mb-3 text-center font-display text-3xl text-ink-100">Árak</h2>
          <p className="mx-auto mb-10 max-w-xl text-center text-sm leading-relaxed text-ink-300">
            A díjszabás a szerveren él, nem a kliensen — egy kliens, ami olyan számot tart,
            amivel a szerver nem egyezik, elszámolási hiba.
          </p>
          <div className="vp-card mx-auto max-w-lg p-7 text-center">
            <p className="font-display text-2xl text-accent">Kezdés ingyen</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">
              Regisztráció után a generátor azonnal használható. A terhelés a
              <span className="text-ink-100"> system_settings</span> sorban él, és a szerver
              olvassa minden hívásnál.
            </p>
            <a href="/app" className="vp-btn mt-6">
              Kezdj el most
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="overflow-hidden rounded-3xl border border-accent/20 bg-panel/40 shadow-2xl">
          <img src={designlyHeroImage} alt="DESIGNLY — A jövőt nem várjuk. Mi építjük." draggable={false} className="h-auto w-full object-cover" />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="font-display text-3xl leading-snug text-ink-100 sm:text-5xl">
          „A JÖVŐT NEM VÁRJUK.
          <br />
          <span className="text-accent">MI ÉPÍTJÜK.”</span>
        </p>
        <p className="mx-auto mt-7 max-w-3xl text-base leading-relaxed text-ink-300 sm:text-lg">
          A DESIGNLY AI-nál hiszünk abban, hogy az emberi kreativitás és a mesterséges intelligencia együtt határtalan lehetőségeket teremt.
          Segítünk vállalkozásoknak, alkotóknak és csapatoknak, hogy ötleteikből valós eredmény szülessen.
        </p>
        <p className="mt-5 text-xs tracking-[0.2em] text-ink-400">— DESIGNLY AI</p>
        <a href="/app" className="vp-btn mt-9">
          <Sparkles className="h-4 w-4" />
          Építsük meg a tiédet
        </a>
      </section>

      <footer className="border-t border-line bg-panel/40">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/hero-bg.svg" alt="" className="h-7 w-7 rounded-md" />
              <span className="font-display text-sm tracking-[0.2em] text-ink-100">
                DESIGNLY V3
              </span>
            </div>
            <nav className="flex flex-wrap gap-6 text-xs text-ink-400">
              {['Szolgáltatások', 'Agentek', 'Sablonok', 'Árak', 'Kapcsolat'].map((i) => (
                <a key={i} href="#" className="transition hover:text-ink-200">
                  {i}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-3 text-ink-400">
              <Languages className="h-4 w-4" />
              <Download className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-8 text-center text-[11px] text-ink-400">
            © 2026 DESIGNLY AI. MINDEN JOG FENNTARTVA.
          </p>
        </div>
      </footer>
    </div>
  );
}
