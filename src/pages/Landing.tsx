import { Sparkles, Users, LayoutTemplate, Wand2, Check, Briefcase, Video, Gamepad2, ArrowLeft, Loader2, Download, Save, FileJson, Pencil, RefreshCw, Languages } from 'lucide-react';
import { LANGUAGES, formatNumber } from '../lib/constants';
import { FULL_AGENT_TEAM, PUBLIC_AGENT_MODULES } from '../lib/agents';
import { CATEGORY_SPECS } from '../lib/brief';
import { TEMPLATE_TOTAL } from '../lib/templates';
import designlyHeroImage from '../assets/designly-hero';
import { templateCoverUrl } from '../lib/template-art';
import { useLanguage, dictionaryFor, translate } from '../lib/i18n';

/**
 * DESIGNLY V3 landing.
 * A felhasznalo a fo modulokat latja; a VYRON CORE a specialistakat a hatterben koordinalja.
 *
 * A navigacio KEY-ekkel dolgozik, nem magyar cimke-sztringekkel. Ez volt a
 * legnagyobb hiba: a menupont szovege volt az azonosito, tehat egy forditas
 * vagy egy atnevezes azonnal eltorte az anchor-linkeket.
 *
 * A `useLanguage` a `?lang=` query-parameterbol olvas, es a valtas URL-t ir at
 * (`history.replaceState`), nem navigal. Igy a nyelv valtas NEM tolja ujra a
 * lapot, es a `/` es a `/app` kozott is megmarad.
 */
const NAV = [
  { key: 'nav.services', href: '#services' },
  { key: 'nav.agents', href: '#agents' },
  { key: 'nav.templates', href: '#templates' },
  { key: 'nav.pricing', href: '#pricing' },
  { key: 'nav.contact', href: '#contact' },
];

const MODULES: { icon: typeof Sparkles; id: string; name: string; href: string; hu: string; en: string }[] = [
  { icon: Sparkles, id: 'create', name: 'CREATE', href: '/app', hu: 'Briefből induló alkotási folyamat és generálás.', en: 'A creation flow that starts from a brief, plus generation.' },
  { icon: Briefcase, id: 'brand', name: 'BRAND STUDIO', href: '/app?tab=studio', hu: 'Logó, színpaletta, tipográfia, brand voice és Brand Kit.', en: 'Logo, palette, typography, brand voice and Brand Kit.' },
  { icon: LayoutTemplate, id: 'web', name: 'WEB ARCHITECT', href: '/app?tab=studio', hu: 'Struktúra, UX/UI, reszponzivitás és információs architektúra.', en: 'Structure, UX/UI, responsiveness and information architecture.' },
  { icon: Users, id: 'content', name: 'CONTENT & GROWTH', href: '/app?tab=studio', hu: 'Tartalom, SEO, kampány és értékesítési kreatívok.', en: 'Content, SEO, campaign and sales creatives.' },
  { icon: Wand2, id: 'image', name: 'IMAGE STUDIO', href: '/app?tab=studio', hu: 'AI képgenerálás és vizuális kreatívok.', en: 'AI image generation and visual creatives.' },
  { icon: Video, id: 'media', name: 'MEDIA STUDIO', href: '/app?tab=media', hu: 'Video- és rövidformátumú gyártási terv, storyboard, UGC és AI keyframe.', en: 'Video and short-form production plan, storyboard, UGC and AI keyframe.' },
  { icon: Wand2, id: 'social', name: 'SOCIAL STUDIO', href: '/app?tab=studio', hu: 'Social post, story és platformváltozatok.', en: 'Social posts, stories and platform variants.' },
  { icon: LayoutTemplate, id: 'template', name: 'TEMPLATE STUDIO', href: '/app?tab=templates', hu: 'Sablonillesztés és variációk.', en: 'Template matching and variants.' },
  { icon: Wand2, id: 'extra', name: 'EXTRA DESIGN STUDIO', href: '/app?tab=studio', hu: 'Névjegy, meghívó, flyer, plakát, poszter, Tattoo, Planner és CNC.', en: 'Business card, invitation, flyer, poster, tattoo, planner and CNC.' },
  { icon: Gamepad2, id: 'gamer', name: 'STREAMER & GAMER STUDIO', href: '/app?tab=gamer', hu: 'Overlay, alert, scene, thumbnail, emote és badge.', en: 'Overlays, alerts, scenes, thumbnails, emotes and badges.' },
  { icon: Briefcase, id: 'merch', name: 'MERCH FACTORY', href: '/app?tab=gamer', hu: 'Póló, hoodie, bögre, sapka és sticker artwork.', en: 'T-shirt, hoodie, mug, cap and sticker artwork.' },
  { icon: Check, id: 'qa', name: 'QA AGENT', href: '/app?tab=studio', hu: 'Validáció, minőségellenőrzés és acceptance.', en: 'Validation, quality control and acceptance.' },
];

export default function Landing() {
  const [lang, setLang] = useLanguage();
  const t = (key: string, vars?: Record<string, string>) => translate(dictionaryFor(lang), key, vars);

  const featureCount = Object.keys(CATEGORY_SPECS).length;
  const categoryNames = Object.keys(CATEGORY_SPECS);
  const featured = [0, 24, 48, 72, 96, 120];

  /** A modul linkje: a nyelvet mindig tovabbviszi, hogy az `/app` is ugyanazon a nyelven nyisson. */
  const withLang = (href: string) => `${href}${href.includes('?') ? '&' : '?'}lang=${lang}`;

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
            {NAV.map((item) => (
              <a key={item.key} href={item.href} className="transition hover:text-ink-100">
                {t(item.key)}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-ink-300">
              <Languages className="h-3.5 w-3.5 text-ink-500" aria-hidden="true" />
              <span className="sr-only">{t('lang.label')}</span>
              <select
                className="border-none bg-transparent text-xs text-ink-200 outline-none"
                value={lang}
                aria-label={t('lang.label')}
                onChange={(e) => setLang(e.target.value as typeof lang)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-canvas">
                    {l.flag} · {l.name}
                  </option>
                ))}
              </select>
            </label>
            <a href={withLang('/app')} className="vp-btn text-xs">
              {t('cta.start')}
            </a>
          </div>
        </div>
      </header>

      <section
        className="relative mx-auto min-h-[720px] overflow-hidden border-b border-line bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(rgba(5,7,10,.12), rgba(5,7,10,.78)), url(${designlyHeroImage})` }}
        aria-label="DESIGNLY"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(0,0,0,.45)_100%)]" />
        <div className="relative mx-auto flex min-h-[720px] max-w-6xl flex-col items-center justify-end px-6 pb-16 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href={withLang('/app')} className="vp-btn">
              <Sparkles className="h-4 w-4" />
              {t('cta.buildSite')}
            </a>
            <a href={withLang('/app?tab=studio')} className="vp-btn-ghost">
              <Wand2 className="h-4 w-4" />
              {t('nav.extraStudio')}
            </a>
            <a href={withLang('/app?tab=gamer')} className="vp-btn-ghost">
              <Gamepad2 className="h-4 w-4" />
              {t('nav.streamerGamer')}
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
            { value: `${PUBLIC_AGENT_MODULES.length}`, label: t('stat.modules') },
            { value: formatNumber(TEMPLATE_TOTAL, lang), label: t('stat.templates') },
            { value: `${featureCount}`, label: t('stat.categories') },
            { value: `${LANGUAGES.length}`, label: t('stat.languages') },
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

      <section id="services" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-center font-display text-3xl text-ink-100">{t('services.heading')}</h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-sm text-ink-300">
          {t('services.lead')}
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <a key={m.id} href={withLang(m.href)} className="vp-card group block p-6 transition hover:border-accent/50">
              <div className="mb-4 flex items-center justify-between">
                <m.icon className="h-5 w-5 text-accent" />
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <Check className="h-3 w-3" /> {t('services.active')}
                </span>
              </div>
              <h3 className="font-display text-lg text-ink-100 group-hover:text-accent">{m.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                {lang === 'hu' ? m.hu : m.en}
              </p>
            </a>
          ))}
        </div>
      </section>

      <section id="agents" className="border-y border-line bg-panel/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="mb-3 text-center font-display text-3xl text-ink-100">{t('agents.heading')}</h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-sm leading-relaxed text-ink-300">
            {t('agents.lead')}
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
            {[t('flow.brief'), t('flow.experts'), t('flow.review'), t('flow.result')].map((step, i, arr) => (
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
        <h2 className="mb-3 text-center font-display text-3xl text-ink-100">{t('templates.heading')}</h2>
        <p className="mx-auto mb-10 max-w-2xl text-center text-sm leading-relaxed text-ink-300">
          {t('templates.lead', { count: `${formatNumber(TEMPLATE_TOTAL, lang)} / ${formatNumber(featureCount, lang)}` })}
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
          <a href={withLang('/app?tab=templates')} className="vp-btn-ghost">
            <LayoutTemplate className="h-4 w-4" />
            {t('cta.openGallery')}
          </a>
        </div>
      </section>

      <section id="pricing" className="border-y border-line bg-panel/40">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="mb-3 text-center font-display text-3xl text-ink-100">{t('pricing.heading')}</h2>
          <p className="mx-auto mb-10 max-w-xl text-center text-sm leading-relaxed text-ink-300">
            {t('pricing.lead')}
          </p>
          <div className="vp-card mx-auto max-w-lg p-7 text-center">
            <p className="font-display text-2xl text-accent">{t('pricing.free')}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">
              {t('pricing.freeBody')}
            </p>
            <a href={withLang('/app')} className="vp-btn mt-6">
              {t('cta.startNow')}
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="font-display text-3xl leading-snug text-ink-100 sm:text-5xl">
          {t('manifesto.title')}
          <br />
          <span className="text-accent">{t('manifesto.titleAccent')}</span>
        </p>
        <p className="mx-auto mt-7 max-w-3xl text-base leading-relaxed text-ink-300 sm:text-lg">
          {t('manifesto.body')}
        </p>
        <p className="mt-5 text-xs tracking-[0.2em] text-ink-400">— DESIGNLY AI</p>
        <a href={withLang('/app')} className="vp-btn mt-9">
          <Sparkles className="h-4 w-4" />
          {t('cta.buildYours')}
        </a>
      </section>

      <footer id="contact" className="border-t border-line bg-panel/40">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/hero-bg.svg" alt="" className="h-7 w-7 rounded-md" />
              <span className="font-display text-sm tracking-[0.2em] text-ink-100">
                DESIGNLY V3
              </span>
            </div>
            <nav className="flex flex-wrap gap-6 text-xs text-ink-400">
              {NAV.map((item) => (
                <a key={item.key} href={item.href} className="transition hover:text-ink-200">
                  {t(item.key)}
                </a>
              ))}
            </nav>
            <span className="text-[10px] tracking-[0.14em] text-ink-500">CREATE · DESIGN · BUILD</span>
          </div>
          <p className="mt-8 text-center text-[11px] text-ink-400">
            {t('footer.rights')}
          </p>
        </div>
      </footer>
    </div>
  );
}
