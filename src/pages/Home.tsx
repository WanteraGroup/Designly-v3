import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Loader2,
  Wand2,
  Download,
  Save,
  FileJson,
  Pencil,
  RefreshCw,
  Users,
  Check,
  ArrowLeft,
  LayoutTemplate,
} from 'lucide-react';
import { buildSite, refineSite, type SiteDocument } from '../lib/api';
import { downloadSiteHtml, toStandaloneHtml } from '../lib/export-html';
import { collectImageQueries, resolveImages, applyImages } from '../lib/images';
import { DESIGN_STYLES, LANGUAGES } from '../lib/constants';
import { planAgents, PUBLIC_AGENT_MODULES, type AgentPlan } from '../lib/agents';
import { CATEGORY_SPECS, specFor, briefFromTemplate } from '../lib/brief';
import { getDesignlyTemplate, TEMPLATE_TOTAL } from '../lib/templates';
import { templateCoverUrl } from '../lib/template-art';
// NEVESITES import: a SitePreview.tsx `SiteRenderer`-t exportal, nem default-ot.
// Egy default import itt rollup-hibat ad ("default is not exported"), es a build
// 1-es koddal all le — ez volt a deploy hibaja.
import { SiteRenderer } from '../components/SitePreview';
import HuginnAgent from '../components/HuginnAgent';
import CreativeStudio from '../components/CreativeStudio';
import GamerStudio from '../components/GamerStudio';
import MediaStudio from '../components/MediaStudio';
import { createProject, listProjects, saveProject, type StudioProject } from '../lib/project-store';

const EXAMPLES = [
  'Egy sötét, prémium fodrászszalon weboldala árakkal és foglalási lehetőséggel',
  'Modern étterem oldal, étlappal és nyitvatartással',
  'Egy fitneszterem bemutatkozó oldala bérletárakkal',
];

function openStandalonePreview(site: SiteDocument) {
  const html = toStandaloneHtml(site);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  if (!popup) {
    URL.revokeObjectURL(url);
    throw new Error('A böngésző blokkolta az új előnézeti ablakot.');
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function Home() {
  const [brief, setBrief] = useState('');
  const [language, setLanguage] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('lang');
    return requested && LANGUAGES.some((item) => item.code === requested) ? requested : 'hu';
  });
  const [style, setStyle] = useState<string | null>(null);
  const [category, setCategory] = useState('Business');
  const [tab, setTab] = useState<'generator' | 'studio' | 'media' | 'gamer' | 'templates'>(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    return requested === 'studio' || requested === 'media' || requested === 'gamer' || requested === 'templates' ? requested : 'generator';
  });
  const [site, setSite] = useState<SiteDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runtimeAgents, setRuntimeAgents] = useState<string[]>([]);
  const [runtimeMode, setRuntimeMode] = useState<'ai' | 'fallback'>('fallback');
  const [editorOpen, setEditorOpen] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [savedProjects, setSavedProjects] = useState<StudioProject[]>(() => listProjects());
  const refineRef = useRef<HTMLInputElement>(null);

  const plan = planAgents(brief);
  const categoryNames = Object.keys(CATEGORY_SPECS);

  /** A valasztott stilus a brief vegen megy: a modell egy szoveges briefet lat. */
  function composedBrief(): string {
    const base = brief.trim();
    return style ? `${base} — stílus: ${style}` : base;
  }

  /**
   * Brief -> kesz oldal, majd a galeriak keresesekey valodi fotokra oldva.
   *
   * A kepfeloldas SZANDEKOSAN a generalas UTAN fut, es kulon allapotban: a lap
   * azonnal megjelenik, a galeria addig a keresokifejezest mutatja, es akkor
   * cserelodik fotora, amikor a kereses visszaer. Igy egy lassu kepkereso nem
   * tartja vissza a teljes generalast.
   */
  async function generate() {
    if (!brief.trim() || busy) return;
    setBusy(true);
    setError(null);
    setReply(null);

    try {
      const built = await buildSite(composedBrief(), language);
      setSite(built.site);
      setRuntimeAgents(built.activeAgents);
      setSavedProjectId(null);
      setSavedNotice(false);
      setEditorOpen(true);
      setRuntimeMode(built.runtimeMode);
      setBusy(false);

      const queries = collectImageQueries(built.site);
      if (queries.length > 0) {
        setImagesLoading(true);
        const images = await resolveImages(queries);
        if (images.length > 0) {
          setSite((current) => (current ? applyImages(current, images) : current));
        }
        setImagesLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
      setImagesLoading(false);
    }
  }

  async function refine() {
    if (!site || !instruction.trim() || refining) return;
    setRefining(true);
    setError(null);
    setReply(null);

    try {
      const result = await refineSite(site, instruction.trim(), language);
      setSite(result.site);
      setSavedNotice(false);
      setReply(result.reply);
      setInstruction('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefining(false);
    }
  }

  /**
   * Generalas utan a kovetkezo hasznos lepes a finomitas, ezert oda megy a
   * fokusz — de csak akkor, ha epp nem fut generalas, kulonben elkapja a kurzort.
   */
  useEffect(() => {
    if (site && !busy) refineRef.current?.focus();
  }, [site, busy]);

  /** Sablonbol inditas: a brief kitolti, de a generalast a felhasznalo inditja. */
  function useTemplate(index: number) {
    const tpl = getDesignlyTemplate(index);
    setBrief(briefFromTemplate(tpl));
    setCategory(tpl.category);
    setTab('generator');
    setSite(null);
  }

  return (
    <div className="min-h-screen">
      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <a href="/" className="flex items-center gap-2 text-sm tracking-[0.22em] text-ink-100">
          <ArrowLeft className="h-4 w-4 text-ink-400" />
          <span className="font-display">
            DESIGNLY <span className="text-accent">V3</span>
          </span>
        </a>
        <label className="text-xs text-ink-300">
          <span className="sr-only">Nyelv</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="border-none bg-transparent text-ink-200 outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-canvas">
                {l.flag}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="mx-auto mb-4 flex max-w-6xl justify-end px-6">
        <button
          type="button"
          onClick={() => setSavedProjects(listProjects())}
          className="vp-btn-ghost text-xs"
        >
          <Save className="h-3.5 w-3.5" /> Mentett projektek ({savedProjects.length})
        </button>
      </div>
      {savedProjects.length > 0 && (
        <div className="mx-auto mb-6 grid max-w-6xl gap-2 px-6 sm:grid-cols-2 lg:grid-cols-3">
          {savedProjects.slice(0, 6).map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => {
                setBrief(project.brief);
                setSite(project.site);
                setSavedProjectId(project.id);
                setSavedNotice(false);
                setEditorOpen(!!project.site);
                setTab('generator');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="rounded-xl border border-line bg-panel/70 px-4 py-3 text-left transition hover:border-accent/50"
            >
              <div className="text-xs font-semibold text-ink-100">{project.name}</div>
              <div className="mt-1 line-clamp-2 text-[11px] text-ink-400">{project.brief || 'Mentett projekt'}</div>
            </button>
          ))}
        </div>
      )}

      <div className="relative mx-auto mb-8 flex max-w-3xl justify-center gap-2 px-6">
        {(['generator', 'studio', 'media', 'gamer', 'templates'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full border px-4 py-1.5 text-xs transition ${
              tab === t
                ? 'border-accent/70 bg-accent/15 text-accent'
                : 'border-line text-ink-300 hover:text-ink-100'
            }`}
          >
            {t === 'generator'
              ? 'Generátor'
              : t === 'studio'
                ? 'Extra Stúdió'
                : t === 'media'
                  ? 'Media Studio'
                  : t === 'gamer'
                    ? 'Streamer & Gamer'
                  : `Sablonok (${TEMPLATE_TOTAL.toLocaleString('hu-HU')})`}
          </button>
        ))}
      </div>

      <div className="mx-auto mb-8 flex max-w-6xl flex-wrap items-center justify-center gap-1.5 px-6 text-[10px] tracking-[0.12em] text-ink-500">
        {['CREATE','DESIGN','WEB','IMAGE','VIDEO','SOCIAL','STREAMER/GAMER','MERCH','EXTRA','TEMPLATES','PUBLISH'].map((step, i, arr) => (
          <span key={step} className="flex items-center gap-1.5">
            <span className={i === 0 ? "rounded-full border border-accent/50 bg-accent/10 px-2.5 py-1 text-accent" : "rounded-full border border-line px-2.5 py-1 text-ink-400"}>{step}</span>
            {i < arr.length - 1 && <span className="text-accent/50">→</span>}
          </span>
        ))}
      </div>

      {tab === 'media' && (
        <section className="relative mx-auto max-w-6xl px-6 pb-24">
          <MediaStudio />
        </section>
      )}

      {tab === 'gamer' && (
        <section className="relative mx-auto max-w-6xl px-6 pb-24">
          <GamerStudio />
        </section>
      )}

      {tab === 'studio' && (
        <section className="relative mx-auto max-w-6xl px-6 pb-24">
          <CreativeStudio />
        </section>
      )}

      {tab === 'generator' && (
        <section className="relative mx-auto max-w-5xl px-6 pb-24">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="vp-card p-5">
                <label htmlFor="brief" className="mb-2 block text-xs text-ink-400">
                  Mit építsünk?
                </label>
                <textarea
                  id="brief"
                  rows={4}
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void generate();
                  }}
                  placeholder="Például: Egy sötét, prémium fodrászszalon weboldala árakkal és foglalással."
                  className="vp-input resize-none"
                />

                <div className="mt-5">
                  <span className="mb-2 block text-xs text-ink-400">Stílus</span>
                  <div className="flex flex-wrap gap-2">
                    {DESIGN_STYLES.slice(0, 14).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStyle(style === s ? null : s)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          style === s
                            ? 'border-accent/70 bg-accent/15 text-accent'
                            : 'border-line text-ink-300 hover:border-accent/50 hover:text-ink-100'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={generate}
                    disabled={busy || !brief.trim()}
                    className="vp-btn"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {busy ? 'Építés…' : site ? 'Új oldal' : 'Oldal elkészítése'}
                  </button>
                  {site && (
                    <button
                      type="button"
                      onClick={() => downloadSiteHtml(site, brief)}
                      className="vp-btn-ghost"
                    >
                      <Download className="h-4 w-4" />
                      HTML letöltése
                    </button>
                  )}
                  <span className="text-xs text-ink-400">Cmd / Ctrl + Enter</span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setBrief(ex)}
                      className="rounded-full border border-line px-3 py-1 text-xs text-ink-300 transition hover:border-accent/50 hover:text-ink-100"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {busy && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 text-sm text-ink-300">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  VYRON CORE felbontja a briefet, a DESIGNLY MASTER és a kiválasztott specialisták összeállítják az oldalt.
                </div>
              )}

              {imagesLoading && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-2.5 text-xs text-ink-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                  Fotók keresése a galériákhoz…
                </div>
              )}

              {error && (
                <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              {site && (
                <div className="mt-8">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-display text-lg text-ink-100">{site.site.title}</h2>
                    <span className="text-xs text-ink-400">{site.blocks.length} szekció</span>
                  </div>

                  <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-panel/80 p-3">
                    <button type="button" onClick={() => {
                      const existing = savedProjectId;
                      if (existing) {
                        saveProject({ id: existing, name: site.site.title || 'DESIGNLY projekt', updatedAt: Date.now(), brief, site, assets: [] });
                      } else {
                        const created = createProject(site.site.title || 'DESIGNLY projekt', brief);
                        created.site = site;
                        saveProject(created);
                        setSavedProjectId(created.id);
                      }
                      setSavedProjects(listProjects());
                      setSavedNotice(true);
                      window.setTimeout(() => setSavedNotice(false), 1800);
                    }} className="vp-btn">
                      <Save className="h-4 w-4" /> Mentés
                    </button>
                    <button type="button" onClick={() => {
                      try { openStandalonePreview(site); setError(null); }
                      catch (e) { setError(e instanceof Error ? e.message : String(e)); }
                    }} className="vp-btn-ghost">
                      <LayoutTemplate className="h-4 w-4" /> Előnézet új lapon
                    </button>
                    <button type="button" onClick={() => downloadSiteHtml(site, brief)} className="vp-btn-ghost">
                      <Download className="h-4 w-4" /> HTML letöltés
                    </button>
                    <button type="button" onClick={() => {
                      const blob = new Blob([JSON.stringify(site, null, 2)], { type: 'application/json;charset=utf-8' });
                      const url = URL.createObjectURL(blob); const a = document.createElement('a');
                      a.href = url; a.download = (site.site.title || 'designly-site').toLowerCase().replace(/[^a-z0-9]+/gi, '-') + '.json'; a.click(); URL.revokeObjectURL(url);
                    }} className="vp-btn-ghost">
                      <FileJson className="h-4 w-4" /> JSON export
                    </button>
                    <button type="button" onClick={() => {
                      setEditorOpen(true);
                      window.setTimeout(() => refineRef.current?.focus(), 0);
                    }} className={editorOpen ? "vp-btn" : "vp-btn-ghost"}>
                      <Pencil className="h-4 w-4" /> Szerkesztés
                    </button>
                    <button type="button" onClick={() => {
                      setSite(null); setInstruction(''); setReply(null); setSavedProjectId(null); setSavedNotice(false); setEditorOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} className="vp-btn-ghost">
                      <RefreshCw className="h-4 w-4" /> Új projekt
                    </button>
                    {savedNotice && <span className="ml-auto flex items-center gap-1 text-xs text-emerald-300"><Check className="h-3.5 w-3.5" /> Elmentve</span>}
                  </div>

                  <SiteRenderer document={site} />

                  <div className="mt-5 rounded-2xl border border-line bg-panel/40 p-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEditorOpen((v) => !v);
                        window.setTimeout(() => {
                          if (!editorOpen) refineRef.current?.focus();
                        }, 0);
                      }}
                      className="flex items-center gap-2 text-xs text-ink-300 hover:text-ink-100"
                    >
                      <Pencil className="h-3.5 w-3.5 text-accent" />
                      {editorOpen ? 'Szerkesztő bezárása' : 'Szerkesztő megnyitása'}
                    </button>

                    {editorOpen && (
                      <div className="mt-4">
                        <label htmlFor="refine" className="mb-2 block text-xs text-ink-400">
                          Változtass egy dolgot
                        </label>
                        <div className="flex gap-3">
                          <input
                            id="refine"
                            ref={refineRef}
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void refine();
                            }}
                            placeholder="Pl. legyen világosabb a színvilág"
                            className="vp-input flex-1"
                          />
                          <button
                            type="button"
                            onClick={refine}
                            disabled={refining || !instruction.trim()}
                            className="vp-btn"
                          >
                            {refining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                            {refining ? 'Módosítás…' : 'Alkalmaz'}
                          </button>
                        </div>

                        {reply && (
                          <p className="mt-3 rounded-lg border border-line bg-panel px-4 py-3 text-sm text-ink-200">
                            {reply}
                          </p>
                        )}

                        <p className="mt-3 text-xs text-ink-400">
                          A finomítás csak azt írja át, amit kértél — a szerkezet megmarad.
                        </p>
                      </div>
                    )}
                  </div></div>
              )}
            </div>

            <AgentTeam plan={plan} runtimeAgents={runtimeAgents} runtimeMode={runtimeMode} />
          </div>
        </section>
      )}

      {tab === 'templates' && (
        <section className="relative mx-auto max-w-6xl px-6 pb-24">
          <div className="mb-6 flex flex-wrap gap-2">
            {categoryNames.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  category === c
                    ? 'border-accent/70 bg-accent/15 text-accent'
                    : 'border-line text-ink-300 hover:text-ink-100'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <p className="mb-5 text-xs text-ink-400">
            {specFor(category).label} kategória — a sablon struktúra és hangnem, nem kész oldal.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 12 }, (_, i) => {
              const index = categoryNames.indexOf(category) * 12 + i;
              const tpl = getDesignlyTemplate(index);
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => useTemplate(index)}
                  className="group overflow-hidden rounded-2xl border border-line bg-panel text-left transition hover:border-accent/50"
                >
                  <img
                    src={templateCoverUrl(index)}
                    alt=""
                    className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="px-4 py-3">
                    <h3 className="font-display text-sm text-ink-100">{tpl.name}</h3>
                    <p className="mt-1 text-[11px] text-ink-400">{tpl.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <a href="/" className="vp-btn-ghost">
              <LayoutTemplate className="h-4 w-4" />
              Vissza a főoldalra
            </a>
          </div>
        </section>
      )}
      <HuginnAgent />
    </div>
  );
}

/**
 * Az agent-panel: a brief alapjan kivalasztott specialistak.
 *
 * Ket allapot van, es a kulonbseg szamit: a `live` agent ma is fut a
 * generalasban, a `planned` pedig helyet jelol a kovetkezo koroknek. Egy
 * agent, ami a listan van, de nem fut, nem hazudik mukodest.
 */
function AgentTeam({ plan, runtimeAgents, runtimeMode }: { plan: AgentPlan; runtimeAgents: string[]; runtimeMode: 'ai' | 'fallback' }) {
  const selected = plan.agents.map((agent) => agent.id);
  const isInPlan = (moduleId: string) => {
    const module = PUBLIC_AGENT_MODULES.find((item) => item.id === moduleId);
    return !!module && (
      module.specialistIds.length === 0 ||
      module.specialistIds.some((id) => selected.includes(id))
    );
  };

  return (
    <aside className="vp-card h-fit p-5">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-4 w-4 text-accent" />
        <h2 className="font-display text-sm tracking-[0.14em] text-ink-100">DESIGNLY WORKSPACE</h2>
      </div>

      <div className="mb-4 rounded-lg border border-line bg-panel-hi/50 px-3 py-2 text-[10px] text-ink-300">
        <div className="flex items-center justify-between gap-2">
          <span>FŐNÖK: <b className="text-ink-100">VYRON CORE</b></span>
          <span className={runtimeMode === 'ai' ? 'text-emerald-400' : 'text-amber-300'}>
            {runtimeMode === 'ai' ? 'AI RUNTIME' : 'FALLBACK'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {PUBLIC_AGENT_MODULES.map((module) => {
          const plannedForBrief = isInPlan(module.id);
          const executed = module.specialistIds.some((id) => runtimeAgents.includes(id));
          const alwaysOn = ['core', 'master', 'huginn'].includes(module.id);

          return (
            <div
              key={module.id}
              className="rounded-xl border border-line bg-panel-hi/60 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold tracking-wider text-ink-100">
                  {module.name}
                </span>
                {executed || alwaysOn ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <Check className="h-3 w-3" /> {runtimeMode === 'ai' && executed ? 'FUTOTT' : 'BEKÖTVE'}
                  </span>
                ) : plannedForBrief ? (
                  <span className="flex items-center gap-1 text-[10px] text-cyan-300">
                    <Check className="h-3 w-3" /> AKTÍV
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-cyan-300">
                    <Check className="h-3 w-3" /> MODUL
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] leading-snug text-ink-300">{module.role}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-ink-400">
        VYRON CORE → DESIGNLY MASTER → specialisták a háttérben → eredmény
      </p>
    </aside>
  );
}
