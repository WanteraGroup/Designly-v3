import { Sparkles, Users, LayoutTemplate, Wand2, Download, Check, Clock, Briefcase, Video, Languages, Gamepad2 } from 'lucide-react';
import { LANGUAGES } from '../lib/constants';
import { FULL_AGENT_TEAM, LIVE_AGENTS, PLANNED_AGENTS } from '../lib/agents';
import { CATEGORY_SPECS } from '../lib/brief';
import { TEMPLATE_TOTAL } from '../lib/templates';
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

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center">
        <span className="mb-7 inline-block rounded-full border border-line px-4 py-1.5 text-[11px] tracking-[0.28em] text-accent">
          DESIGNLY V3 — AZ AI KREATÍV OPERÁCIÓS RENDSZER
        </span>

        <h1 className="font-display text-4xl leading-[1.1] text-ink-100 sm:text-6xl">
          Írd le egy mondatban.
          <br />
          <span className="text-accent">Megkapod a kész oldalt.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-ink-300">
          Nem sablont kapsz, hanem kész weboldalt — szöveggel, színekkel, szerkezettel és
          exportálható fájllal együtt. Az agent-csapat a briefből tervet, alkotást és
          ellenőrzést készít.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a href="/app" className="vp-btn">
            <Sparkles className="h-4 w-4" />
            Weboldal készítése
          </a>
          <a href="#templates" className="vp-btn-ghost">
            <LayoutTemplate className="h-4 w-4" />
            Sablonok böngészése
          </a>
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
            { value: `${LIVE_AGENTS.length}/${FULL_AGENT_TEAM.length}`, label: 'Aktív agent' },
            { value: TEMPLATE_TOTAL.toLocaleString('hu-HU'), label: 'Sablon' },
            { value: `${featureCount}`, label: 'Kategória' },
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
            { icon: Sparkles, name: 'Website Builder', desc: 'AI weboldalak természetes nyelvű briefből, kész szöveggel.', live: true },
            { icon: LayoutTemplate, name: 'Sablon Galéria', desc: `${TEMPLATE_TOTAL.toLocaleString('hu-HU')} generált sablon, ${featureCount} kategóriában.`, live: true },
            { icon: Wand2, name: 'Design Editor', desc: 'Természetes nyelvű finomítás diff-alapon — a szerkezet megmarad.', live: true },
            { icon: Users, name: 'Agent Team', desc: `${LIVE_AGENTS.length} aktív specialista, és ${PLANNED_AGENTS.length} épülőben.`, live: true },
            { icon: Briefcase, name: 'Brand Kit', desc: 'Színek, tipográfia és hangnem, minden kreatívhoz köthető.', live: true },
            { icon: Video, name: 'Kampány Stúdió', desc: 'Poster, flyer, social és hirdetés egy közös kampányból.', live: true },
            { icon: Gamepad2, name: 'Streamer & Gamer Studio', desc: 'OBS overlay, alert, scene, thumbnail, emote, badge és merch.', live: true },
            { icon: Wand2, name: 'Extra Design Studio', desc: 'Névjegy, meghívó, flyer, poszter, Tattoo, Planner és CNC CAM egy helyen.', live: true },
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
            A Wantera projektcsalád tizenhét repójából összegyűjtött képességek. Az{' '}
            <span className="text-emerald-400">aktív</span> agent ma is fut a generálásban; az{' '}
            <span className="text-ink-200">épülő</span> a következő körök munkája — és ezt a
            felület ki is mondja, mert egy agent, ami nem fut, nem hazudik működést.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FULL_AGENT_TEAM.map((agent) => (
              <div
                key={agent.id}
                className={`rounded-xl border px-4 py-3.5 ${
                  agent.status === 'live'
                    ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
                    : 'border-line bg-panel/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold tracking-wider text-ink-100">
                    {agent.name}
                  </span>
                  {agent.status === 'live' ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                  )}
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-ink-300">{agent.role}</p>
                <p className="mt-1 font-mono text-[10px] text-ink-400">{agent.source}</p>
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
