import { useState } from 'react';
import { Download, Image as ImageIcon, Link2, Sparkles, Upload, Wand2 } from 'lucide-react';
import { editCreativeImage, generateCreativeImage } from '../lib/creative-api';

type Props = { language?: string };

const PRESETS = {
  hu: [
    {
      id: 'monochrome',
      name: 'Fekete-fehér cinematic',
      prompt: 'Photorealistic close-up portrait of an adult woman, black-and-white editorial photography, extremely detailed natural skin texture, expressive eyes, dramatic hard side lighting, deep shadows, strong rim light, long braided hair, black patterned bandana, subtle nose ring and earrings, tasteful facial and neck tattoo details, confident street-fashion attitude, shallow depth of field, cinematic contrast, premium fashion campaign, realistic hair strands, realistic pores, 85mm portrait lens, sharp eyes, no text, no watermark.',
    },
    {
      id: 'celtic',
      name: 'Dark Celtic portrait',
      prompt: 'Photorealistic adult woman portrait with dark Celtic-inspired styling, intricate knotwork bandana and jewelry, long braids, subtle tattoo linework, dramatic black-and-white cinematic lighting, high contrast, realistic skin and hair, moody urban background, editorial fashion photography, sharp eyes, shallow depth of field, premium detail, no text, no watermark.',
    },
    {
      id: 'viking',
      name: 'Nordic / Viking',
      prompt: 'Photorealistic adult woman, Nordic dark fashion portrait, braided hair, black leather and engraved textile details, subtle Nordic ornamentation, dramatic monochrome lighting, cold cinematic atmosphere, realistic skin pores and hair strands, intense eyes, premium editorial photography, 85mm lens, shallow depth of field, no text, no watermark.',
    },
    {
      id: 'color',
      name: 'Dark luxury color',
      prompt: 'Photorealistic adult woman close-up, dark luxury fashion editorial, long braids, black-and-gold Celtic-inspired accessories, subtle tattoos and piercings, cinematic blue-black atmosphere, dramatic rim lighting, realistic skin texture, detailed eyes and hair, premium commercial photography, shallow depth of field, 85mm lens, no text, no watermark.',
    },
  ],
  en: [
    {
      id: 'monochrome',
      name: 'Black & white cinematic',
      prompt: 'Photorealistic close-up portrait of an adult woman, black-and-white editorial photography, extremely detailed natural skin texture, expressive eyes, dramatic hard side lighting, deep shadows, strong rim light, long braided hair, black patterned bandana, subtle nose ring and earrings, tasteful facial and neck tattoo details, confident street-fashion attitude, shallow depth of field, cinematic contrast, premium fashion campaign, realistic hair strands, realistic pores, 85mm portrait lens, sharp eyes, no text, no watermark.',
    },
    {
      id: 'celtic',
      name: 'Dark Celtic portrait',
      prompt: 'Photorealistic adult woman portrait with dark Celtic-inspired styling, intricate knotwork bandana and jewelry, long braids, subtle tattoo linework, dramatic black-and-white cinematic lighting, high contrast, realistic skin and hair, moody urban background, editorial fashion photography, sharp eyes, shallow depth of field, premium detail, no text, no watermark.',
    },
    {
      id: 'viking',
      name: 'Nordic / Viking',
      prompt: 'Photorealistic adult woman, Nordic dark fashion portrait, braided hair, black leather and engraved textile details, subtle Nordic ornamentation, dramatic monochrome lighting, cold cinematic atmosphere, realistic skin pores and hair strands, intense eyes, premium editorial photography, 85mm lens, shallow depth of field, no text, no watermark.',
    },
    {
      id: 'color',
      name: 'Dark luxury color',
      prompt: 'Photorealistic adult woman close-up, dark luxury fashion editorial, long braids, black-and-gold Celtic-inspired accessories, subtle tattoos and piercings, cinematic blue-black atmosphere, dramatic rim lighting, realistic skin texture, detailed eyes and hair, premium commercial photography, shallow depth of field, 85mm lens, no text, no watermark.',
    },
  ],
} as const;

export default function PortraitStudio({ language = 'hu' }: Props) {
  const hu = language === 'hu';
  const presets = hu ? PRESETS.hu : PRESETS.en;
  const [mode, setMode] = useState<'prompt' | 'reference'>('prompt');
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [prompt, setPrompt] = useState<string>(presets[0].prompt);
  const [ratio, setRatio] = useState('1:1');
  const [resolution, setResolution] = useState<'1k' | '2k' | '4k'>('2k');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');

  const run = async () => {
    if (busy || !prompt.trim() || (mode === 'reference' && !file && !sourceUrl.trim())) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = mode === 'reference'
        ? await editCreativeImage({
            files: [file!],
            prompt: prompt.trim(),
            aspectRatio: ratio,
            resolution,
          })
        : await generateCreativeImage(prompt.trim(), ratio);
      setResult(response.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : (hu ? 'A portrégenerálás sikertelen.' : 'Portrait generation failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className='space-y-5'>
      <div className='rounded-2xl border border-accent/20 bg-accent/5 p-5'>
        <div className='flex items-center gap-2 text-[10px] uppercase tracking-[.2em] text-accent'>
          <Sparkles className='h-4 w-4' /> DESIGNLY PORTRAIT STUDIO
        </div>
        <h2 className='mt-2 font-display text-2xl text-ink-100'>
          {hu ? 'Fotórealisztikus karakter- és portrégenerálás' : 'Photorealistic character & portrait generation'}
        </h2>
        <p className='mt-2 max-w-3xl text-sm text-ink-400'>
          {hu
            ? 'A megadott stílus alapján cinematic, fashion, dark, Celtic vagy Nordic portrékat készíthetsz. Referenciaképpel a meglévő arc és kompozíció szerkesztése is használható.'
            : 'Create cinematic, fashion, dark, Celtic or Nordic portraits. With a reference image, you can also edit the existing subject and composition.'}
        </p>
      </div>

      <div className='grid gap-5 lg:grid-cols-[1fr_360px]'>
        <div className='space-y-4 rounded-2xl border border-line bg-canvas/50 p-4'>
          <div className='flex gap-2 rounded-xl border border-line bg-black/20 p-1'>
            <button type='button' onClick={() => setMode('prompt')} className={'flex-1 rounded-lg px-3 py-2 text-xs ' + (mode === 'prompt' ? 'bg-accent/15 text-accent' : 'text-ink-300')}>
              {hu ? 'Új portré' : 'New portrait'}
            </button>
            <button type='button' onClick={() => setMode('reference')} className={'flex-1 rounded-lg px-3 py-2 text-xs ' + (mode === 'reference' ? 'bg-accent/15 text-accent' : 'text-ink-300')}>
              {hu ? 'Referencia alapján' : 'From reference'}
            </button>
          </div>

          {mode === 'reference' && (
            <div className='space-y-3'>
              <label className='block rounded-xl border border-dashed border-accent/30 bg-black/20 p-4 text-center'>
                <Upload className='mx-auto h-5 w-5 text-accent' />
                <span className='mt-2 block text-xs text-ink-300'>
                  {file ? file.name : (hu ? 'Tölts fel egy referenciafotót' : 'Upload a reference photo')}
                </span>
                <input type='file' accept='image/png,image/jpeg,image/webp' className='sr-only' onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
              <label className='block'>
                <span className='mb-1 flex items-center gap-1 text-[10px] text-ink-400'><Link2 className='h-3.5 w-3.5'/>{hu ? 'Vagy kép-link' : 'Or image URL'}</span>
                <input className='vp-input' value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder='https://.../portrait.jpg' />
              </label>
            </div>
          )}

          <div className='grid gap-2 sm:grid-cols-2'>
            {presets.map(preset => (
              <button
                key={preset.id}
                type='button'
                onClick={() => setPrompt(preset.prompt)}
                className='rounded-xl border border-line bg-panel/50 p-3 text-left text-xs text-ink-300 hover:border-accent/50 hover:text-accent'
              >
                <div className='font-semibold text-ink-100'>{preset.name}</div>
                <div className='mt-1 line-clamp-2 text-[10px] text-ink-500'>{preset.prompt}</div>
              </button>
            ))}
          </div>

          <textarea
            rows={9}
            className='vp-input'
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={hu ? 'Írd le pontosan a portrét, hajviseletet, ruhát, fényt, hátteret és kamerát.' : 'Describe the portrait, hair, clothing, lighting, background and camera.'}
          />

          <div className='grid gap-3 sm:grid-cols-2'>
            <label className='text-xs text-ink-400'>
              {hu ? 'Képarány' : 'Aspect ratio'}
              <select className='vp-input mt-1' value={ratio} onChange={e => setRatio(e.target.value)}>
                <option>1:1</option>
                <option>4:3</option>
                <option>3:4</option>
                <option>16:9</option>
                <option>9:16</option>
              </select>
            </label>
            <label className='text-xs text-ink-400'>
              {hu ? 'Referencia felbontás' : 'Reference resolution'}
              <select className='vp-input mt-1' value={resolution} onChange={e => setResolution(e.target.value as '1k' | '2k' | '4k')}>
                <option value='1k'>1K</option>
                <option value='2k'>2K</option>
                <option value='4k'>4K</option>
              </select>
            </label>
          </div>

          <button type='button' onClick={run} disabled={busy || !prompt.trim() || (mode === 'reference' && !file && !sourceUrl.trim())} className='vp-btn w-full'>
            <Wand2 className='h-4 w-4' />
            {busy ? (hu ? 'Generálás…' : 'Generating…') : (hu ? 'PORTRÉ GENERÁLÁSA' : 'GENERATE PORTRAIT')}
          </button>
        </div>

        <div className='rounded-2xl border border-line bg-black/30 p-4'>
          <div className='mb-3 text-xs uppercase tracking-[.18em] text-ink-500'>
            {hu ? 'ELŐNÉZET' : 'PREVIEW'}
          </div>
          {result ? (
            <div className='overflow-hidden rounded-xl border border-accent/20'>
              <img src={result} alt='Designly portrait result' className='max-h-[720px] w-full object-contain' />
              <a href={result} target='_blank' rel='noreferrer' className='vp-btn-ghost mt-3 flex w-full justify-center'>
                <Download className='h-4 w-4' /> {hu ? 'Kép megnyitása / mentése' : 'Open / save image'}
              </a>
            </div>
          ) : (
            <div className='flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-line text-center text-xs text-ink-500'>
              <div>
                <ImageIcon className='mx-auto mb-3 h-8 w-8' />
                {hu ? 'A generált portré itt jelenik meg.' : 'The generated portrait will appear here.'}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className='rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'>{error}</div>}
    </section>
  );
}
