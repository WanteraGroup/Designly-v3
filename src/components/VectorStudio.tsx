import { useMemo, useState } from 'react';
import { Download, FileImage, Image as ImageIcon, Layers3, Sparkles, Upload, Wand2 } from 'lucide-react';
import { generateVectorFromPrompt } from '../lib/vector-api';

type Props = { language?: string };
type Mode = 'prompt' | 'image';

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

async function imageToVector(file: File, monochrome: boolean): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 180;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('A képfeldolgozó canvas nem érhető el.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const data = ctx.getImageData(0, 0, width, height).data;
  const pixels = new Array<{r:number;g:number;b:number;a:number}>(width * height);
  const frequency = new Map<string, number>();

  for (let i = 0; i < pixels.length; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
    const p = { r, g, b, a };
    pixels[i] = p;
    if (a > 24) {
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = rgbToHex(Math.min(255, qr), Math.min(255, qg), Math.min(255, qb));
      frequency.set(key, (frequency.get(key) || 0) + 1);
    }
  }

  if (monochrome) {
    const paths: string[] = [];
    for (let y = 0; y < height; y++) {
      let x = 0;
      while (x < width) {
        const p = pixels[y * width + x];
        const lum = (p.r * 299 + p.g * 587 + p.b * 114) / 1000;
        if (p.a <= 24 || lum > 145) { x++; continue; }
        const start = x++;
        while (x < width) {
          const q = pixels[y * width + x];
          const qlum = (q.r * 299 + q.g * 587 + q.b * 114) / 1000;
          if (q.a <= 24 || qlum > 145) break;
          x++;
        }
        paths.push('M' + start + ' ' + y + 'h' + (x - start) + 'v1h-' + (x - start) + 'z');
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'" width="'+width+'" height="'+height+'"><title>Designly monochrome vector trace</title><path fill="#111" d="'+paths.join('')+'"/></svg>';
  }

  const palette = Array.from(frequency.entries())
    .sort((a,b) => b[1] - a[1])
    .slice(0, 12)
    .map(([hex]) => {
      const n = parseInt(hex.slice(1), 16);
      return { r:(n>>16)&255, g:(n>>8)&255, b:n&255, hex };
    });

  const pathsByColor = new Map<string, string[]>();
  for (const color of palette) pathsByColor.set(color.hex, []);

  const nearest = (p: {r:number;g:number;b:number;a:number}) => {
    if (p.a <= 24) return null;
    let best = palette[0], bestD = Infinity;
    for (const c of palette) {
      const d = (p.r-c.r)**2 + (p.g-c.g)**2 + (p.b-c.b)**2;
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  };

  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      const c = nearest(pixels[y * width + x]);
      if (!c) { x++; continue; }
      const start = x++;
      while (x < width) {
        const next = nearest(pixels[y * width + x]);
        if (!next || next.hex !== c.hex) break;
        x++;
      }
      pathsByColor.get(c.hex)!.push('M' + start + ' ' + y + 'h' + (x - start) + 'v1h-' + (x - start) + 'z');
    }
  }

  const body = Array.from(pathsByColor.entries())
    .filter(([,paths]) => paths.length)
    .map(([hex, paths]) => '<path fill="'+hex+'" d="'+paths.join('')+'"/>')
    .join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'" width="'+width+'" height="'+height+'"><title>Designly image vector trace</title>'+body+'</svg>';
}

const PRESETS = {
  hu: [
    ['Logo', 'Prémium fekete-arany monogram logó, geometrikus, tiszta vektorformák, elegáns negatív tér, SVG logó.'],
    ['Ikon', 'Modern futurisztikus ikon, erős sziluett, egyszerű geometria, jól olvasható 32 px méretben, SVG.'],
    ['Matrica', 'Prémium dark-luxury matrica grafika, vastag körvonal, tiszta formák, limitált színpaletta, SVG.'],
    ['Tetoválás', 'Fekete line-art tetoválásminta, tiszta kontúrok, negatív tér, stencil-kompatibilis, kizárólag vektoros formák.'],
  ],
  en: [
    ['Logo', 'Premium black-and-gold monogram logo, geometric, clean vector shapes, elegant negative space, SVG logo.'],
    ['Icon', 'Modern futuristic icon, strong silhouette, simple geometry, readable at 32 px, SVG.'],
    ['Sticker', 'Premium dark-luxury sticker graphic, bold outline, clean shapes, limited palette, SVG.'],
    ['Tattoo', 'Black line-art tattoo design, clean contours, negative space, stencil-ready, vector-only shapes.'],
  ],
} as const;

export default function VectorStudio({ language = 'hu' }: Props) {
  const hu = language === 'hu';
  const [mode, setMode] = useState<Mode>('prompt');
  const [prompt, setPrompt] = useState(hu ? PRESETS.hu[0][1] : PRESETS.en[0][1]);
  const [style, setStyle] = useState('logo');
  const [file, setFile] = useState<File | null>(null);
  const [traceMode, setTraceMode] = useState<'color'|'mono'>('color');
  const [svg, setSvg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const previewUrl = useMemo(() => svg ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) : '', [svg]);

  const runPrompt = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true); setError(''); setSvg('');
    try {
      const result = await generateVectorFromPrompt(prompt.trim(), style);
      setSvg(result.svg);
    } catch (e) {
      setError(e instanceof Error ? e.message : (hu ? 'A vektorgenerálás sikertelen.' : 'Vector generation failed.'));
    } finally { setBusy(false); }
  };

  const runImage = async () => {
    if (!file || busy) return;
    setBusy(true); setError(''); setSvg('');
    try { setSvg(await imageToVector(file, traceMode === 'mono')); }
    catch (e) { setError(e instanceof Error ? e.message : (hu ? 'A kép vektorizálása sikertelen.' : 'Image vectorization failed.')); }
    finally { setBusy(false); }
  };

  const downloadSvg = () => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'designly-vector.svg'; a.click();
    URL.revokeObjectURL(url);
  };

  const presets = hu ? PRESETS.hu : PRESETS.en;

  return (
    <section className='space-y-5'>
      <div className='rounded-2xl border border-accent/20 bg-accent/5 p-5'>
        <div className='flex items-center gap-2 text-[10px] uppercase tracking-[.2em] text-accent'><Layers3 className='h-4 w-4'/> DESIGNLY VECTOR STUDIO</div>
        <h2 className='mt-2 font-display text-2xl text-ink-100'>{hu ? 'Kép → Vector · Prompt → Vector · SVG export' : 'Image → Vector · Prompt → Vector · SVG export'}</h2>
        <p className='mt-2 text-sm text-ink-400'>{hu ? 'Képből automatikus SVG trace, vagy AI-val teljesen új vektorgrafika promptból. Az eredmény SVG-ként menthető és szerkeszthető vektorként használható.' : 'Automatically trace an image into SVG, or create new vector artwork from a prompt with AI. Export the result as editable SVG.'}</p>
      </div>

      <div className='flex gap-2 rounded-xl border border-line bg-black/20 p-1'>
        <button type='button' onClick={()=>setMode('prompt')} className={'flex-1 rounded-lg px-3 py-2 text-xs '+(mode==='prompt'?'bg-accent/15 text-accent':'text-ink-300')}><Sparkles className='mr-1 inline h-4 w-4'/>{hu ? 'Prompt → Vector' : 'Prompt → Vector'}</button>
        <button type='button' onClick={()=>setMode('image')} className={'flex-1 rounded-lg px-3 py-2 text-xs '+(mode==='image'?'bg-accent/15 text-accent':'text-ink-300')}><FileImage className='mr-1 inline h-4 w-4'/>{hu ? 'Kép → Vector' : 'Image → Vector'}</button>
      </div>

      {mode === 'prompt' ? (
        <div className='grid gap-5 lg:grid-cols-[1fr_420px]'>
          <div className='space-y-4 rounded-2xl border border-line bg-canvas/50 p-4'>
            <div className='grid gap-2 sm:grid-cols-2'>
              {presets.map(([name,value]) => <button key={name} type='button' onClick={()=>setPrompt(value)} className='rounded-xl border border-line p-3 text-left text-xs hover:border-accent/50'><div className='font-semibold text-ink-100'>{name}</div><div className='mt-1 text-[10px] text-ink-500'>{value}</div></button>)}
            </div>
            <label className='text-xs text-ink-400'>{hu ? 'Vektor stílus' : 'Vector style'}<select className='vp-input mt-1' value={style} onChange={e=>setStyle(e.target.value)}><option value='logo'>Logo</option><option value='icon'>Icon</option><option value='sticker'>Sticker</option><option value='line-art'>Line art</option><option value='emblem'>Emblem</option></select></label>
            <textarea rows={9} className='vp-input' value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder={hu ? 'Pl. fekete-arany kelta holló embléma, tiszta vektoros formákkal.' : 'E.g. black-and-gold Celtic raven emblem with clean vector shapes.'}/>
            <button type='button' onClick={runPrompt} disabled={busy || !prompt.trim()} className='vp-btn w-full'><Wand2 className='h-4 w-4'/>{busy ? (hu ? 'Vektor készül…' : 'Generating vector…') : (hu ? 'VEKTOR GENERÁLÁSA' : 'GENERATE VECTOR')}</button>
          </div>
          <Preview svg={svg} previewUrl={previewUrl} hu={hu} onDownload={downloadSvg}/>
        </div>
      ) : (
        <div className='grid gap-5 lg:grid-cols-[1fr_420px]'>
          <div className='space-y-4 rounded-2xl border border-line bg-canvas/50 p-4'>
            <label className='block rounded-xl border border-dashed border-accent/30 bg-black/20 p-6 text-center cursor-pointer'>
              <Upload className='mx-auto h-6 w-6 text-accent'/>
              <div className='mt-2 text-xs text-ink-300'>{file ? file.name : (hu ? 'Tölts fel PNG / JPG / WEBP képet' : 'Upload PNG / JPG / WEBP')}</div>
              <input type='file' accept='image/png,image/jpeg,image/webp' className='sr-only' onChange={e=>{setFile(e.target.files?.[0] || null);setSvg('');setError('')}}/>
            </label>
            <div className='grid gap-3 sm:grid-cols-2'>
              <label className='text-xs text-ink-400'>{hu ? 'Trace mód' : 'Trace mode'}<select className='vp-input mt-1' value={traceMode} onChange={e=>setTraceMode(e.target.value as 'color'|'mono')}><option value='color'>{hu ? 'Színes vektor' : 'Colour vector'}</option><option value='mono'>{hu ? 'Fekete sziluett / stencil' : 'Black silhouette / stencil'}</option></select></label>
              <div className='rounded-xl border border-line p-3 text-xs text-ink-500'>{hu ? 'A trace lokálisan fut a böngészőben; a forráskép nem kerül AI-hoz.' : 'Tracing runs locally in the browser; the source image is not sent to AI.'}</div>
            </div>
            <button type='button' onClick={runImage} disabled={busy || !file} className='vp-btn w-full'><FileImage className='h-4 w-4'/>{busy ? (hu ? 'Vektorizálás…' : 'Vectorizing…') : (hu ? 'KÉP VECTORIZÁLÁSA' : 'VECTORIZE IMAGE')}</button>
          </div>
          <Preview svg={svg} previewUrl={previewUrl} hu={hu} onDownload={downloadSvg}/>
        </div>
      )}

      {error && <div className='rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'>{error}</div>}
    </section>
  );
}

function Preview({ svg, previewUrl, hu, onDownload }: { svg:string; previewUrl:string; hu:boolean; onDownload:()=>void }) {
  return <div className='rounded-2xl border border-line bg-black/30 p-4'>
    <div className='mb-3 text-xs uppercase tracking-[.18em] text-ink-500'>{hu ? 'VEKTOR ELŐNÉZET' : 'VECTOR PREVIEW'}</div>
    {svg ? <><div className='checkerboard overflow-auto rounded-xl border border-accent/20 p-4' dangerouslySetInnerHTML={{__html:svg}}/><div className='mt-3 flex gap-2'><a href={previewUrl} target='_blank' rel='noreferrer' className='vp-btn-ghost flex-1 justify-center'><ImageIcon className='h-4 w-4'/>{hu?'Megnyitás':'Open'}</a><button type='button' onClick={onDownload} className='vp-btn flex-1'><Download className='h-4 w-4'/>{hu?'SVG mentése':'Save SVG'}</button></div></> : <div className='flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-line text-center text-xs text-ink-500'>{hu ? 'A vektor előnézete itt jelenik meg.' : 'Vector preview appears here.'}</div>}
  </div>;
}
