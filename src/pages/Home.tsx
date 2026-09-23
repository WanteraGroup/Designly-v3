import { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Wand2, Download } from 'lucide-react';
import { buildSite, refineSite, type SiteDocument } from '../lib/api';
import { downloadSiteHtml } from '../lib/export-html';
import { DESIGN_STYLES, LANGUAGES } from '../lib/constants';
import SitePreview from '../components/SitePreview';

const EXAMPLES = [
  'Egy sötét, prémium fodrászszalon weboldala árakkal és foglalási lehetőséggel',
  'Modern étterem oldal, étlappal és nyitvatartással',
  'Egy fitneszterem bemutatkozó oldala bérletárakkal',
];

export default function Home() {
  const [brief, setBrief] = useState('');
  const [language, setLanguage] = useState('hu');
  const [style, setStyle] = useState<string | null>(null);
  const [site, setSite] = useState<SiteDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [refining, setRefining] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refineRef = useRef<HTMLInputElement>(null);

  // After a generation the next useful action is a refinement, so the focus
  // goes there rather than back to the brief.
  useEffect(() => {
    if (site) refineRef.current?.focus();
  }, [site]);

  /** A valasztott stilus a brief vegen megy, nem kulon parameterkent: a modell
   *  egy szoveges briefet lat, es a stilust ugyanabban a mondatban kell
   *  ertelmeznie, mint a tobbi kereset. */
  function composedBrief(): string {
    const base = brief.trim();
    return style ? `${base} — stílus: ${style}` : base;
  }

  async function generate() {
    if (!brief.trim() || busy) return;
    setBusy(true);
    setError(null);
    setReply(null);

    try {
      setSite(await buildSite(composedBrief(), language));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
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
      setReply(result.reply);
      setInstruction('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefining(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-display text-sm font-semibold tracking-[0.22em] text-ink-100">
          DESIGNLY V3
        </span>
        <div className="flex items-center gap-4">
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
          <a href="#build" className="text-sm text-ink-300 transition hover:text-ink-100">
            Kezdés
          </a>
        </div>
      </header>

      <section className="relative mx-auto max-w-3xl px-6 pb-16 pt-10 text-center">
        <span className="mb-6 inline-block rounded-full border border-line px-4 py-1.5 text-[11px] tracking-[0.28em] text-accent">
          AI KREATÍV OPERÁCIÓS RENDSZER
        </span>
        <h1 className="font-display text-4xl leading-tight text-ink-100 sm:text-5xl">
          Írd le egy mondatban.
          <br />
          <span className="text-accent">Megkapod a kész oldalt.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[15px] text-ink-300">
          Nem sablont kapsz, hanem kész weboldalt — szöveggel, színekkel és szerkezettel együtt.
        </p>
      </section>

      <section id="build" className="relative mx-auto max-w-3xl px-6 pb-24">
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

          {/* A 24 design stilus a katalogusbol jon, nem kezzel irt lista. */}
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
            A csapat megtervezi a szerkezetet, megírja a szövegeket és összeállítja az oldalt.
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

            <SitePreview document={site} />

            <div className="mt-5">
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
                  {refining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {refining ? '…' : 'Alkalmaz'}
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
          </div>
        )}
      </section>
    </div>
  );
}
