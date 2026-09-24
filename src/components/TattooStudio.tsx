/**
 * PRO TATTOO STUDIO — foto -> stencil.
 *
 * Ket bemenet, EGY feldolgozasi lanc:
 *
 *   feltoltott kep        -> buildStencil() -> stencil PNG
 *   prompt -> RunPod      -> buildStencil() -> stencil PNG
 *
 * A prompt-ag is ugyanazon a motoron megy at, mert a generalt kep sosem eleve
 * tiszta vonalmunka — a modell arnyekolt, texturazott kepet ad, amit el kell
 * konturozni. Ez az oka, hogy a ket ag ugyanoda fut ossze.
 *
 * A feldolgozas KLIENSOLDALI: nincs GPU, nincs provider-koltseg. Ezert
 * ingyenes, es ezert lesz a kesobbi kreditesites tiszta bevetel.
 *
 * A RunPod-ot csak a prompt-ag hivja. Az onnan jon a `reserveStencilSlot()`
 * szandekos helye: ma mindent atenged, de a hivas helye mar most kijeloli,
 * hova kerul a kreditesites — igy az egyetlen szerveroldali fuggveny lesz,
 * amit at kell irni.
 */
import { useCallback, useRef, useState } from 'react';
import {
  Download, FileImage, ImagePlus, PenTool, Share2, Sparkles, Upload, X,
  Grid3X3, Ruler, Loader2,
} from 'lucide-react';
import { generateCreativeImage } from '../lib/creative-api';
import {
  buildStencil,
  describeStencilWarning,
  stencilToPng,
  type StencilDiagnostics,
  type StencilStyle,
  type StencilWeight,
} from '../lib/stencil-engine';

export interface TattooStudioProps {
  language?: string;
  initialStyle?: string;
}

/** A motor-csempek: a kulcs a motor-azonosito, a cimke a felulet szovege. */
const ENGINES: Array<{ id: StencilStyle; hu: string; en: string; subHu: string; subEn: string }> = [
  { id: 'outline', hu: 'Outline', en: 'Outline', subHu: 'Kontúr', subEn: 'Contour' },
  { id: 'fineLine', hu: 'Fine Line', en: 'Fine Line', subHu: 'Finom vonal', subEn: 'Fine line' },
  { id: 'realism', hu: 'Realism', en: 'Realism', subHu: 'Tónus', subEn: 'Tone' },
  { id: 'hatching', hu: 'Hatching', en: 'Hatching', subHu: 'Árnyékolás', subEn: 'Shading' },
  { id: 'tonalMap', hu: 'Tonal Map', en: 'Tonal Map', subHu: 'Térkép', subEn: 'Tonal map' },
  { id: 'fullDetail', hu: 'Full Detail', en: 'Full Detail', subHu: 'Részletes', subEn: 'Detailed' },
];

export default function TattooStudio({ language = 'hu', initialStyle }: TattooStudioProps) {
  const hu = language === 'hu';
  const [mode, setMode] = useState<'upload' | 'ai'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [concept, setConcept] = useState('');
  const [engine, setEngine] = useState<StencilStyle>((initialStyle as StencilStyle) ?? 'outline');
  const [weight, setWeight] = useState<StencilWeight>('standard');
  const [lineColor, setLineColor] = useState('#000000');
  const [opacity, setOpacity] = useState(100);
  const [guides, setGuides] = useState({ grid: true, center: true, mirror: false });
  const [result, setResult] = useState('');
  const [diagnostics, setDiagnostics] = useState<StencilDiagnostics | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  /** A forras, amin a motor fut: feltoltott fajl, vagy a RunPod URL-je. */
  const activeSource: File | string | null = mode === 'upload' ? file : (sourceUrl || null);
  const canRun = Boolean(activeSource) && !busy;

  /**
   * A stencil futtatasa.
   *
   * Ez a fuggveny NEM tudja, honnan jott a kep — ez a lenyeg. A feltoltott
   * fajl es a RunPod URL ugyanide fut be, es a kimenet ugyanaz a lanc.
   */
  const runStencil = useCallback(async (source: File | string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { canvas, diagnostics: diag } = await buildStencil(source, {
        style: engine,
        weight,
        lineColor,
        opacity: opacity / 100,
        transparent: true,
      });
      const blob = await stencilToPng(canvas);
      const url = URL.createObjectURL(blob);
      setResult((prev) => {
        if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return url;
      });
      setDiagnostics(diag);
      const warning = describeStencilWarning(diag);
      if (warning) setNotice(warning);
    } catch (e) {
      setError(e instanceof Error ? e.message : (hu ? 'A stencil készítése sikertelen.' : 'Stencil generation failed.'));
    } finally {
      setBusy(false);
    }
  }, [engine, weight, lineColor, opacity, hu]);

  /** Feltoltott kep. A feldolgozas azonnal indul — nincs varakozas. */
  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    if (!picked) return;
    if (picked.size > 10 * 1024 * 1024) {
      setError(hu ? 'A kép legfeljebb 10 MB lehet.' : 'The image may be at most 10 MB.');
      return;
    }
    if (sourceUrl.startsWith('blob:')) URL.revokeObjectURL(sourceUrl);
    const preview = URL.createObjectURL(picked);
    setFile(picked);
    setSourceUrl(preview);
    setResult('');
    setDiagnostics(null);
    await runStencil(picked);
  }

  /**
   * Prompt -> RunPod -> ugyanaz a motor.
   *
   * A `reserveStencilSlot()` itt a helye: a RunPod hivas az egyetlen pont ebben
   * a komponensben, ami valodi penzbe kerul. Ma mindent atenged; kesobb ide
   * kerul a kredit-ellenorzes, es a komponens tobbi resze valtozatlan marad.
   */
  async function generateFromConcept() {
    if (!concept.trim() || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const image = await generateCreativeImage(concept.trim(), '1:1');
      setSourceUrl(image.url);
      setFile(null);
      await runStencil(image.url);
      const cost = typeof image.cost === 'number' ? image.cost : null;
      if (cost !== null) {
        setNotice((hu ? 'A generálás költsége: $' : 'Generation cost: $') + cost.toFixed(4) + '.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : (hu ? 'A stencil készítése sikertelen.' : 'Stencil generation failed.'));
      setBusy(false);
    }
  }

  /** Motorvaltas utan ujrafuttatas — a forras valtozatlan. */
  function pickEngine(id: StencilStyle) {
    setEngine(id);
    if (activeSource) void runStencil(activeSource);
  }

  function download(href: string) {
    const a = document.createElement('a');
    a.href = href;
    a.download = 'designly-stencil.png';
    a.click();
  }

  return (
    <div className="mt-8 rounded-3xl border border-line bg-panel/70 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[.22em] text-accent">PRO TATTOO STUDIO</div>
          <h2 className="mt-1 font-display text-2xl text-ink-100">
            {hu ? 'Fotó → stencil' : 'Photo → stencil'}
          </h2>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] text-emerald-300">
          {hu ? 'INGYENES · KLIENSOLDALI' : 'FREE · CLIENT-SIDE'}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ---------- BAL: bemenet es vezerlok ---------- */}
        <div>
          <div className="mb-4 flex gap-2">
            {(['upload', 'ai'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); setNotice(''); }}
                className={'flex-1 rounded-xl border px-4 py-2.5 text-xs transition ' + (mode === m
                  ? 'border-accent/70 bg-accent/15 text-accent'
                  : 'border-line text-ink-300 hover:text-ink-100')}
              >
                {m === 'upload' ? (
                  <><Upload className="mr-1.5 inline h-3.5 w-3.5" />{hu ? 'Kép feltöltése' : 'Upload image'}</>
                ) : (
                  <><Sparkles className="mr-1.5 inline h-3.5 w-3.5" />{hu ? 'AI generálás' : 'AI generate'}</>
                )}
              </button>
            ))}
          </div>

          {mode === 'upload' ? (
            <div>
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onPick}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full rounded-2xl border border-dashed border-line bg-canvas/40 px-6 py-10 text-center transition hover:border-accent/50"
              >
                <ImagePlus className="mx-auto h-7 w-7 text-accent" />
                <p className="mt-3 text-sm text-ink-100">
                  {hu ? 'Húzd ide a képet, vagy válaszd ki a gépről.' : 'Drop an image here or choose a file.'}
                </p>
                <p className="mt-1 text-[11px] text-ink-400">JPG, PNG / WEBP · max 10 MB</p>
              </button>
              {file && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-panel px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2 text-xs text-ink-200">
                    <FileImage className="h-3.5 w-3.5 shrink-0 text-accent" />
                    <span className="truncate">{file.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (sourceUrl.startsWith('blob:')) URL.revokeObjectURL(sourceUrl);
                      setFile(null); setSourceUrl(''); setResult(''); setDiagnostics(null); setNotice('');
                    }}
                    className="flex shrink-0 items-center gap-1 text-xs text-accent"
                  >
                    <X className="h-3 w-3" />{hu ? 'Kép törlése' : 'Remove image'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs text-ink-400">
                {hu ? 'AI tattoo koncepció' : 'AI tattoo concept'}
                <textarea
                  rows={5}
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder={hu
                    ? 'Pl. Odin két hollóval, kelta fonatokkal, csak fekete tattoo vonalmunka.'
                    : 'e.g. Odin with two ravens and Celtic knotwork, black tattoo linework only.'}
                  className="vp-input mt-1 resize-none"
                />
              </label>
              <button
                type="button"
                disabled={!concept.trim() || busy}
                onClick={generateFromConcept}
                className="vp-btn w-full justify-center disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {busy ? (hu ? 'Készül…' : 'Working…') : (hu ? 'Koncepció generálása' : 'Generate concept')}
              </button>
              <p className="text-[10px] leading-relaxed text-ink-500">
                {hu
                  ? 'A generált kép átmegy ugyanazon a kontúrmotoron, mert a modell árnyékolt képet ad — a stencilt a motor készíti belőle.'
                  : 'The generated image runs through the same contour engine — the model returns a shaded image, the engine turns it into a stencil.'}
              </p>
            </div>
          )}

          {/* Motor-csempek */}
          <div className="mt-5">
            <span className="mb-2 block text-xs text-ink-400">{hu ? 'Stencil motor' : 'Stencil engine'}</span>
            <div className="grid grid-cols-3 gap-2">
              {ENGINES.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  disabled={!canRun}
                  onClick={() => pickEngine(e.id)}
                  className={'rounded-xl border px-2.5 py-2.5 text-center text-[11px] transition disabled:opacity-40 ' + (engine === e.id
                    ? 'border-accent/60 bg-accent/10 text-accent'
                    : 'border-line text-ink-300 hover:border-accent/40')}
                >
                  <span className="block font-semibold leading-tight">{hu ? e.hu : e.en}</span>
                  <span className="mt-1 block text-[9px] opacity-60">{hu ? e.subHu : e.subEn}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tinta */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-ink-400">
              {hu ? 'Stencil vonalszín' : 'Stencil line colour'}
              <span className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={lineColor}
                  onChange={(e) => setLineColor(e.target.value)}
                  className="h-9 w-14 shrink-0 rounded-lg border border-line bg-panel"
                />
                <input
                  type="text"
                  value={lineColor}
                  onChange={(e) => setLineColor(e.target.value)}
                  className="vp-input min-w-0"
                />
              </span>
            </label>
            <label className="text-xs text-ink-400">
              {hu ? 'Stencil átlátszóság' : 'Stencil opacity'} · {opacity}%
              <input
                type="range"
                min={10}
                max={100}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="mt-3 w-full accent-amber-500"
              />
            </label>
          </div>

          {/* Vonalvastagsag */}
          <label className="mt-5 block text-xs text-ink-400">
            {hu ? 'Stencil vonal / tinta' : 'Stencil line / ink'}
            <select value={weight} onChange={(e) => setWeight(e.target.value as StencilWeight)} className="vp-input mt-1">
              <option value="fine">{hu ? 'Finom' : 'Fine'}</option>
              <option value="standard">{hu ? 'Standard' : 'Standard'}</option>
              <option value="bold">{hu ? 'Erős' : 'Bold'}</option>
            </select>
          </label>

          <button
            type="button"
            disabled={!canRun}
            onClick={() => activeSource && void runStencil(activeSource)}
            className="vp-btn mt-5 w-full justify-center disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4" />}
            {busy ? (hu ? 'Stencil készül…' : 'Creating stencil…') : (hu ? 'Stencil készítése' : 'Create stencil')}
          </button>

          {/* Segedvonalak */}
          <div className="mt-5">
            <span className="mb-2 block text-xs text-ink-400">
              {hu ? 'Segédvonalak a szalonmunkalapon' : 'Salon worksheet guides'}
            </span>
            <div className="flex flex-wrap gap-2">
              {([['grid', hu ? 'Rács' : 'Grid', Grid3X3], ['center', hu ? 'Középvonal' : 'Center line', Ruler], ['mirror', hu ? 'Tükörtengely' : 'Mirror axis', Ruler]] as const).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGuides((g) => ({ ...g, [key]: !g[key] }))}
                  className={'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs transition ' + (guides[key]
                    ? 'border-accent/70 bg-accent/15 text-accent'
                    : 'border-line text-ink-300')}
                >
                  <Icon className="h-3 w-3" />{label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
          )}
          {/*
           * A diagnosztika. Nem minden ures kimenet hiba — de a felhasznalo
           * ne negyzetes hatteu uresseget lasson magyarazat nelkul.
           */}
          {notice && !error && (
            <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">{notice}</p>
          )}
          {diagnostics && !notice && !error && (
            <p className="mt-4 text-[10px] leading-relaxed text-ink-500">
              {diagnostics.sourceWidth}×{diagnostics.sourceHeight} ·
              {' '}{hu ? 'tinta' : 'ink'} {Math.round(diagnostics.inkRatio * 1000) / 10}% ·
              {' '}{diagnostics.inverted ? (hu ? 'invertált (sötét háttér)' : 'inverted (dark background)') : (hu ? 'normál polaritás' : 'normal polarity')} ·
              {' '}{hu ? 'foltok' : 'shapes'} {diagnostics.componentsAfter}/{diagnostics.componentsBefore}
            </p>
          )}
        </div>

        {/* ---------- JOBB: forras es eredmeny ---------- */}
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-ink-500">
              {mode === 'upload' ? (hu ? 'FELTÖLTÖTT KÉP' : 'UPLOADED IMAGE') : (hu ? 'AI FORRÁSKÉP' : 'AI SOURCE IMAGE')}
            </div>
            <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl border border-line bg-canvas/60">
              {sourceUrl
                ? <img src={sourceUrl} alt={hu ? 'Forrás' : 'Source'} className="h-full w-full object-contain" />
                : <FileImage className="h-8 w-8 text-ink-500" />}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-ink-500">
              {hu ? 'SZALONKÉSZ STENCIL' : 'SALON-READY STENCIL'}
            </div>
            {/*
             * A kockas hatter CSS-sel keszul: atlatszo PNG felett ez az
             * egyertelmu jelzes, hogy a hatter valoban ures.
             */}
            <div
              className="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl border border-line"
              style={{
                backgroundColor: '#12141a',
                backgroundImage:
                  'linear-gradient(45deg, #1a1d24 25%, transparent 25%), linear-gradient(-45deg, #1a1d24 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1d24 75%), linear-gradient(-45deg, transparent 75%, #1a1d24 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
              }}
            >
              {result
                ? <img src={result} alt={hu ? 'Stencil' : 'Stencil'} className="h-full w-full object-contain" />
                : (
                  <span className="px-6 text-center text-[11px] text-ink-500">
                    {busy ? (hu ? 'Stencil készül…' : 'Creating stencil…') : (hu ? 'Itt jelenik meg az izolált stencil.' : 'The isolated stencil appears here.')}
                  </span>
                )}
            </div>
          </div>

          {result && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => download(result)} className="vp-btn-ghost">
                <Download className="h-4 w-4" />{hu ? 'Stencil PNG' : 'Stencil PNG'}
              </button>
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(result)}
                className="vp-btn-ghost"
              >
                <Share2 className="h-4 w-4" />{hu ? 'Másolás / Procreate' : 'Copy / Procreate'}
              </button>
            </div>
          )}

          <p className="text-[10px] leading-relaxed text-ink-500">
            {hu
              ? 'A kimenet különálló 2D tattoo artwork. A feldolgozás a böngésződben fut — a feltöltött kép nem hagyja el a gépedet.'
              : 'The output is standalone 2D tattoo artwork. Processing runs in your browser — an uploaded image never leaves your machine.'}
          </p>
        </div>
      </div>
    </div>
  );
}
