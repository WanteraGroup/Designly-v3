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
  Languages,
  Library,
} from 'lucide-react';
import { buildSite, refineSite, type SiteDocument } from '../lib/api';
import { downloadSiteHtml, toStandaloneHtml } from '../lib/export-html';
import { collectImageQueries, resolveImages, applyImages } from '../lib/images';
import { DESIGN_STYLES, LANGUAGES, formatNumber, type LanguageCode } from '../lib/constants';
import { PUBLIC_AGENT_MODULES } from '../lib/agents';
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
import { createProject, hydrateProjects, listProjects, saveProject, saveProjectCloud, type StudioProject } from '../lib/project-store';
import AuthGate from '../components/AuthGate';

/** A pelda-briefek nyelv szerint. A brief nyelve az, amit a modell lat. */
const EXAMPLES: { hu: string; en: string }[] = [
  { hu: 'Egy sötét, prémium fodrászszalon weboldala árakkal és foglalási lehetőséggel', en: 'A dark, premium hair salon website with prices and booking' },
  { hu: 'Modern étterem oldal, étlappal és nyitvatartással', en: 'Modern restaurant site with a menu and opening hours' },
  { hu: 'Egy fitneszterem bemutatkozó oldala bérletárakkal', en: 'An introductory gym website with membership prices' },
];

/**
 * A workspace feluleti szovegei.
 *
 * A `hu` a referencia: minden kulcsnak itt KELL lennie. A `t()` a magyarra esik
 * vissza, tehat egy hianyzo kulcs sosem irja ki a kulcsnevet.
 */
const UI: Record<string, { hu: string; en: string }> = {
  'tab.generator': { hu: 'Generátor', en: 'Generator' },
  'tab.studio': { hu: 'Extra Stúdió', en: 'Extra Studio' },
  'tab.media': { hu: 'Video Studio', en: 'Video Studio' },
  'tab.gamer': { hu: 'Streamer & Gamer', en: 'Streamer & Gamer' },
  'saved.open': { hu: 'Mentett projektek', en: 'Saved projects' },
  'saved.fallbackName': { hu: 'Mentett projekt', en: 'Saved project' },
  'brief.label': { hu: 'Mit építsünk?', en: 'What should we build?' },
  'brief.placeholder': { hu: 'Például: Egy sötét, prémium fodrászszalon weboldala árakkal és foglalással.', en: 'For example: A dark, premium hair salon website with prices and booking.' },
  'brief.style': { hu: 'Stílus', en: 'Style' },
  'brief.building': { hu: 'Építés…', en: 'Building…' },
  'brief.newPage': { hu: 'Új oldal', en: 'New page' },
  'brief.buildPage': { hu: 'Oldal elkészítése', en: 'Build the page' },
  'brief.downloadHtml': { hu: 'HTML letöltése', en: 'Download HTML' },
  'progress.core': { hu: 'VYRON CORE felbontja a briefet, a DESIGNLY MASTER és a kiválasztott specialisták összeállítják az oldalt.', en: 'VYRON CORE breaks down the brief; DESIGNLY MASTER and the selected specialists assemble the page.' },
  'progress.images': { hu: 'Fotók keresése a galériákhoz…', en: 'Finding photos for the galleries…' },
  'fallback.warning': { hu: 'A VYRON CORE AI provider jelenleg nem adott választ. Ez egy előnézeti fallback vázlat; a generálás nem számít valódi AI-futtatásnak.', en: 'The VYRON CORE AI provider did not answer. This is a preview fallback draft; the run does not count as a real AI generation.' },
  'site.sections': { hu: 'szekció', en: 'sections' },
  'action.save': { hu: 'Mentés', en: 'Save' },
  'action.preview': { hu: 'Előnézet új lapon', en: 'Preview in new tab' },
  'action.json': { hu: 'JSON export', en: 'JSON export' },
  'action.edit': { hu: 'Szerkesztés', en: 'Edit' },
  'action.newProject': { hu: 'Új projekt', en: 'New project' },
  'action.saved': { hu: 'Elmentve', en: 'Saved' },
  'editor.close': { hu: 'Szerkesztő bezárása', en: 'Close editor' },
  'editor.open': { hu: 'Szerkesztő megnyitása', en: 'Open editor' },
  'editor.label': { hu: 'Változtass egy dolgot', en: 'Change one thing' },
  'editor.placeholder': { hu: 'Pl. legyen világosabb a színvilág', en: 'E.g. make the palette lighter' },
  'editor.applying': { hu: 'Módosítás…', en: 'Applying…' },
  'editor.apply': { hu: 'Alkalmaz', en: 'Apply' },
  'editor.note': { hu: 'A finomítás csak azt írja át, amit kértél — a szerkezet megmarad.', en: 'Refinement only rewrites what you asked for — the structure stays.' },
  'templates.hint': { hu: 'kategória — a sablon struktúra és hangnem, nem kész oldal.', en: 'category — a template is structure and tone, not a finished page.' },
  'templates.back': { hu: 'Vissza a főoldalra', en: 'Back to the landing page' },
  'team.title': { hu: 'DESIGNLY WORKSPACE', en: 'DESIGNLY WORKSPACE' },
  'team.boss': { hu: 'FŐNÖK:', en: 'LEAD:' },
  'team.aiRuntime': { hu: 'AI RUNTIME', en: 'AI RUNTIME' },
  'team.fallback': { hu: 'ELŐNÉZETI FALLBACK', en: 'PREVIEW FALLBACK' },
  'team.concierge': { hu: 'CONCIERGE', en: 'CONCIERGE' },
  'team.lead': { hu: 'VEZÉR', en: 'LEAD' },
  'team.executed': { hu: 'FUTOTT', en: 'RAN' },
  'team.selected': { hu: 'KIVÁLASZTVA', en: 'SELECTED' },
  'team.notRun': { hu: 'NEM FUTOTT', en: 'DID NOT RUN' },
  'team.available': { hu: 'ELÉRHETŐ', en: 'AVAILABLE' },
  'team.flow': { hu: 'VYRON CORE → DESIGNLY MASTER → specialisták a háttérben → eredmény', en: 'VYRON CORE → DESIGNLY MASTER → specialists in the background → result' },
  'lang.label': { hu: 'Nyelv', en: 'Language' },
};

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
  return <AuthGate><HomeWorkspace /></AuthGate>;
}

function HomeWorkspace() {
  const [brief, setBrief] = useState('');
  const [language, setLanguage] = useState<LanguageCode>(() => {
    const requested = new URLSearchParams(window.location.search).get('lang');
    if (requested && LANGUAGES.some((item) => item.code === requested)) return requested as LanguageCode;
    const saved = window.localStorage.getItem('designly-language');
    return saved && LANGUAGES.some((item) => item.code === saved) ? saved as LanguageCode : 'hu';
  });

  /** A felulet nyelve: magyar referencia, angolra esik vissza minden mas. */
  const t = (key: string) => (language === 'hu' ? UI[key]?.hu : (UI[key]?.en ?? UI[key]?.hu)) ?? key;

  useEffect(() => {
    window.localStorage.setItem('designly-language', language);
    const url = new URL(window.location.href);
    url.searchParams.set('lang', language);
    window.history.replaceState({}, '', url.toString());
  }, [language]);

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
  const [plannedAgentIds, setPlannedAgentIds] = useState<string[]>([]);
  const [runtimeMode, setRuntimeMode] = useState<'ai' | 'fallback'>('fallback');
  const [editorOpen, setEditorOpen] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [savedProjects, setSavedProjects] = useState<StudioProject[]>(() => listProjects());
  const refineRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void hydrateProjects().then(setSavedProjects);
  }, []);

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
      setPlannedAgentIds(built.orchestration?.agents ?? []);
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
        <label className="flex items-center gap-2 text-xs text-ink-300">
          <Languages className="h-3.5 w-3.5 text-ink-500" aria-hidden="true" />
          <span className="sr-only">{t('lang.label')}</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
            aria-label={t('lang.label')}
            className="border-none bg-transparent text-ink-200 outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-canvas">
                {l.flag} · {l.name}
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
          <Save className="h-3.5 w-3.5" /> {t('saved.open')} ({savedProjects.length})
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
              <div className="mt-1 line-clamp-2 text-[11px] text-ink-400">{project.brief || t('saved.fallbackName')}</div>
            </button>
          ))}
        </div>
      )}

      <div className="relative mx-auto mb-8 flex max-w-3xl justify-center gap-2 px-6">
        {(['generator', 'studio', 'media', 'gamer', 'templates'] as const).map((tabId) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setTab(tabId)}
            className={`rounded-full border px-4 py-1.5 text-xs transition ${
              tab === tabId
                ? 'border-accent/70 bg-accent/15 text-accent'
                : 'border-line text-ink-300 hover:text-ink-100'
            }`}
          >
            {tabId === 'templates'
              ? <span className="inline-flex items-center gap-1.5"><Library className="h-3.5 w-3.5" />{formatNumber(TEMPLATE_TOTAL, language)}</span>
              : t(`tab.${tabId}`)}
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
          <CreativeStudio language={language} initialTool={new URLSearchParams(window.location.search).get('tool') ?? undefined} />
        </section>
      )}

      {tab === 'generator' && (
        <section className="relative mx-auto max-w-5xl px-6 pb-24">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="vp-card p-5">
                <label htmlFor="brief" className="mb-2 block text-xs text-ink-400">
                  {t('brief.label')}
                </label>
                <textarea
                  id="brief"
                  rows={4}
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void generate();
                  }}
                  placeholder={t('brief.placeholder')}
                  className="vp-input resize-none"
                />

                <div className="mt-5">
                  <span className="mb-2 block text-xs text-ink-400">{t('brief.style')}</span>
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
                    {busy ? t('brief.building') : site ? t('brief.newPage') : t('brief.buildPage')}
                  </button>
                  {site && (
                    <button
                      type="button"
                      onClick={() => downloadSiteHtml(site, brief)}
                      className="vp-btn-ghost"
                    >
                      <Download className="h-4 w-4" />
                      {t('brief.downloadHtml')}
                    </button>
                  )}
                  <span className="text-xs text-ink-400">Cmd / Ctrl + Enter</span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex.hu}
                      type="button"
                      onClick={() => setBrief(language === 'hu' ? ex.hu : ex.en)}
                      className="rounded-full border border-line px-3 py-1 text-xs text-ink-300 transition hover:border-accent/50 hover:text-ink-100"
                    >
                      {language === 'hu' ? ex.hu : ex.en}
                    </button>
                  ))}
                </div>
              </div>

              {busy && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 text-sm text-ink-300">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  {t('progress.core')}
                </div>
              )}

              {imagesLoading && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-2.5 text-xs text-ink-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                  {t('progress.images')}
                </div>
              )}

              {error && (
                <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              {site && (
                <div className="mt-8">
                  {runtimeMode === 'fallback' && (
                    <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                      {t('fallback.warning')}
                    </div>
                  )}
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-display text-lg text-ink-100">{site.site.title}</h2>
                    <span className="text-xs text-ink-400">{site.blocks.length} {t('site.sections')}</span>
                  </div>

                  <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-panel/80 p-3">
                    <button type="button" onClick={() => {
                      const existing = savedProjectId;
                      const project = existing
                        ? saveProject({ id: existing, name: site.site.title || 'DESIGNLY projekt', updatedAt: Date.now(), brief, site, assets: [] })
                        : (() => {
                            const created = createProject(site.site.title || 'DESIGNLY projekt', brief);
                            created.site = site;
                            return saveProject(created);
                          })();
                      setSavedProjectId(project.id);
                      setSavedProjects(listProjects());
                      void saveProjectCloud(project).catch((e) => {
                        setError(e instanceof Error ? e.message : 'A projekt felhőmentése nem sikerült.');
                      });
                      setSavedNotice(true);
                      window.setTimeout(() => setSavedNotice(false), 1800);
                    }} className="vp-btn">
                      <Save className="h-4 w-4" /> {t('action.save')}
                    </button>
                    <button type="button" onClick={() => {
                      try { openStandalonePreview(site); setError(null); }
                      catch (e) { setError(e instanceof Error ? e.message : String(e)); }
                    }} className="vp-btn-ghost">
                      <LayoutTemplate className="h-4 w-4" /> {t('action.preview')}
                    </button>
                    <button type="button" onClick={() => downloadSiteHtml(site, brief)} className="vp-btn-ghost">
                      <Download className="h-4 w-4" /> {t('brief.downloadHtml')}
                    </button>
                    <button type="button" onClick={() => {
                      const blob = new Blob([JSON.stringify(site, null, 2)], { type: 'application/json;charset=utf-8' });
                      const url = URL.createObjectURL(blob); const a = document.createElement('a');
                      a.href = url; a.download = (site.site.title || 'designly-site').toLowerCase().replace(/[^a-z0-9]+/gi, '-') + '.json'; a.click(); URL.revokeObjectURL(url);
                    }} className="vp-btn-ghost">
                      <FileJson className="h-4 w-4" /> {t('action.json')}
                    </button>
                    <button type="button" onClick={() => {
                      setEditorOpen(true);
                      window.setTimeout(() => refineRef.current?.focus(), 0);
                    }} className={editorOpen ? "vp-btn" : "vp-btn-ghost"}>
                      <Pencil className="h-4 w-4" /> {t('action.edit')}
                    </button>
                    <button type="button" onClick={() => {
                      setSite(null); setInstruction(''); setReply(null); setSavedProjectId(null); setSavedNotice(false); setEditorOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} className="vp-btn-ghost">
                      <RefreshCw className="h-4 w-4" /> {t('action.newProject')}
                    </button>
                    {savedNotice && <span className="ml-auto flex items-center gap-1 text-xs text-emerald-300"><Check className="h-3.5 w-3.5" /> {t('action.saved')}</span>}
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
                      {editorOpen ? t('editor.close') : t('editor.open')}
                    </button>

                    {editorOpen && (
                      <div className="mt-4">
                        <label htmlFor="refine" className="mb-2 block text-xs text-ink-400">
                          {t('editor.label')}
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
                            placeholder={t('editor.placeholder')}
                            className="vp-input flex-1"
                          />
                          <button
                            type="button"
                            onClick={refine}
                            disabled={refining || !instruction.trim()}
                            className="vp-btn"
                          >
                            {refining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                            {refining ? t('editor.applying') : t('editor.apply')}
                          </button>
                        </div>

                        {reply && (
                          <p className="mt-3 rounded-lg border border-line bg-panel px-4 py-3 text-sm text-ink-200">
                            {reply}
                          </p>
                        )}

                        <p className="mt-3 text-xs text-ink-400">
                          {t('editor.note')}
                        </p>
                      </div>
                    )}
                  </div></div>
              )}
            </div>

            <AgentTeam plannedAgentIds={plannedAgentIds} runtimeAgents={runtimeAgents} runtimeMode={runtimeMode} t={t} />
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
            {specFor(category).label} {t('templates.hint')}
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
              {t('templates.back')}
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
function AgentTeam({ plannedAgentIds, runtimeAgents, runtimeMode, t }: { plannedAgentIds: string[]; runtimeAgents: string[]; runtimeMode: 'ai' | 'fallback'; t: (key: string) => string }) {
  return (
    <aside className="vp-card h-fit p-5">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-4 w-4 text-accent" />
        <h2 className="font-display text-sm tracking-[0.14em] text-ink-100">{t('team.title')}</h2>
      </div>
      <div className="mb-4 rounded-lg border border-line bg-panel-hi/50 px-3 py-2 text-[10px] text-ink-300">
        <div className="flex items-center justify-between gap-2">
          <span>{t('team.boss')} <b className="text-ink-100">VYRON CORE</b></span>
          <span className={runtimeMode === 'ai' ? 'text-emerald-400' : 'text-amber-300'}>
            {runtimeMode === 'ai' ? t('team.aiRuntime') : t('team.fallback')}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {PUBLIC_AGENT_MODULES.map((module) => {
          const planned = module.specialistIds.some((id) => plannedAgentIds.includes(id));
          const executed = module.specialistIds.some((id) => runtimeAgents.includes(id));
          const special = module.id === 'core' || module.id === 'master' || module.id === 'huginn';
          return (
            <div key={module.id} className="rounded-xl border border-line bg-panel-hi/60 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold tracking-wider text-ink-100">{module.name}</span>
                {special ? (
                  <span className="text-[10px] text-cyan-300">{module.id === 'huginn' ? t('team.concierge') : t('team.lead')}</span>
                ) : executed ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400"><Check className="h-3 w-3" /> {t('team.executed')}</span>
                ) : planned ? (
                  <span className={runtimeMode === 'ai' ? 'flex items-center gap-1 text-[10px] text-cyan-300' : 'flex items-center gap-1 text-[10px] text-amber-300'}>
                    <Check className="h-3 w-3" /> {runtimeMode === 'ai' ? t('team.selected') : t('team.notRun')}
                  </span>
                ) : (
                  <span className="text-[10px] text-ink-500">{t('team.available')}</span>
                )}
              </div>
              <p className="mt-1 text-[11px] leading-snug text-ink-300">{module.role}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[10px] leading-relaxed text-ink-400">{t('team.flow')}</p>
    </aside>
  );
}
