/**
 * DESIGNLY — fotó → tattoo stencil motor.
 *
 * Tiszta kliensoldali feldolgozás: nincs AI-hívás, nincs GPU, nincs provider
 * költség. Ezért futtatható ingyen, végtelenszer — és ezért lesz később a
 * kreditesítés tiszta bevétel, nulla változó költség mellett.
 *
 * MIÉRT NEM THRESHOLD
 * -------------------
 * A korábbi `isolateInkPng` luminance-küszöböt használt: a VILÁGOS pixelt
 * tartotta meg, a sötétet kidobta. Ez két esetben esik szét:
 *
 *   1. Sötét hátterű kép (a DESIGNLY stencil-konceptek jellemzően ilyenek):
 *      a téma sötét, a háttér sötét — a küszöb mindent vagy semmit tart meg.
 *   2. Vékony részletek kis felbontáson (pl. 1366×832 embléma): a koponya
 *      és a szalag kontúrja 1-2 pixel, a küszöb lemorzsolja.
 *
 * A megoldás élkiemelés: nem azt keressük, ami VILÁGOS, hanem azt, ahol a
 * fényesség VÁLTOZIK. A kontúr ott van, ahol él van — a téma színétől és a
 * háttér polaritásától függetlenül.
 *
 * A LÁNC
 * ------
 *   medián 3×3 (zaj) → grayscale → Sobel (él) → Otsu (küszöb)
 *   → összefüggő-komponens szűrés (pöttyök) → dilate (vonalvastagság)
 *   → tintaszínezés → PNG
 */

export type StencilStyle = 'outline' | 'fineLine' | 'realism' | 'hatching' | 'tonalMap' | 'fullDetail';
export type StencilWeight = 'fine' | 'standard' | 'bold';

export interface StencilOptions {
  /** Melyik motor. A `hatching` új, a többiek a meglévő csempékhez. */
  style?: StencilStyle;
  /** Vonalvastagság. A `fine` 0 lépés dilate, a `bold` 2. */
  weight?: StencilWeight;
  /** Tinta színe, `#rrggbb`. A nyomtatás feketét vár, ezért az az alap. */
  lineColor?: string;
  /** 0..1 — a kimenet átlátszósága. */
  opacity?: number;
  /** Átlátszó háttér (true) vagy fehér (false). */
  transparent?: boolean;
  /** A küszöb erősségének hangolása, -0.35..+0.35. Az Otsu küszöböt tolja el. */
  thresholdBias?: number;
}

export interface StencilDiagnostics {
  /** A forrás szélessége/magassága. */
  sourceWidth: number;
  sourceHeight: number;
  /** A forrás medián fényessége 0..255. 118 alatt a motor invertál. */
  medianLuma: number;
  /** Invertálva dolgozott-e (sötét hátterű kép). */
  inverted: boolean;
  /** Az Otsu-val számolt érték a Sobel-erősségre. */
  otsuThreshold: number;
  /** A tintának ítélt pixelek aránya a teljes képen, 0..1. */
  inkRatio: number;
  /** Az összefüggő-komponens szűrés előtt/után megtartott foltok száma. */
  componentsBefore: number;
  componentsAfter: number;
  /** A kimenet szélessége/magassága. */
  width: number;
  height: number;
  /** Emberi nyelvű figyelmeztetés, ha a kimenet gyanúsan üres/teli. */
  warning?: 'empty' | 'sparse' | 'flooded' | 'low-contrast';
}

export interface StencilResult {
  canvas: HTMLCanvasElement;
  diagnostics: StencilDiagnostics;
}

/* ------------------------------------------------------------------ *
 * Alap műveletek
 * ------------------------------------------------------------------ */

/** Luminancia a Rec. 709 szerint — az emberi szem érzékenységét követi. */
function toGray(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
  }
  return gray;
}

/**
 * Medián szűrő 3×3.
 *
 * Ez a lépés a legfontosabb a kis felbontású forrásoknál: a bőrtextúra, a
 * JPEG-artefaktok és a szöveti zaj mind 1-2 pixelesek, tehát a Sobel-éllel
 * összemérhetők. A medián ezeket eltünteti, a valódi kontúrt viszont megtartja
 * — ellentétben az átlagoló szűrővel, ami mindent elmos.
 */
function median3x3(src: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(src.length);
  const window = new Float32Array(9);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          window[n++] = src[yy * w + xx];
        }
      }
      // Beszúró rendezés a kis ablakra — gyorsabb, mint a teljes sort.
      for (let i = 1; i < n; i++) {
        const key = window[i];
        let j = i - 1;
        while (j >= 0 && window[j] > key) {
          window[j + 1] = window[j];
          j--;
        }
        window[j + 1] = key;
      }
      out[y * w + x] = n % 2 ? window[(n - 1) >> 1] : (window[n / 2 - 1] + window[n / 2]) / 2;
    }
  }
  return out;
}

/** A kép medián fényessége — ebből dől el a polaritás. */
function medianLuma(gray: Float32Array): number {
  // 256 rekeszes hisztogram: pontos és olcsó, nem kell rendezni.
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) hist[Math.min(255, Math.max(0, gray[i] | 0))]++;
  const half = gray.length / 2;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= half) return v;
  }
  return 128;
}

/**
 * Sobel-élkiemelés.
 *
 * A visszaadott érték a gradiens nagysága. Ez az, ami a fotóból valódi
 * KONTÚRT csinál: nem a világosságot vágja, hanem a változást keresi, ezért a
 * sötét háttéren futó vékony világos vonal is teljes élként jön vissza.
 */
function sobel(gray: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const tl = gray[i - w - 1], t = gray[i - w], tr = gray[i - w + 1];
      const l = gray[i - 1], r = gray[i + 1];
      const bl = gray[i + w - 1], b = gray[i + w], br = gray[i + w + 1];

      const gx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const gy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      out[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  // A szélső 1 pixel keret él nélkül marad — a szomszédját másoljuk, hogy a
  // dilate ne húzzon hamis keretet a kép szélére.
  for (let x = 0; x < w; x++) {
    out[x] = out[w + x];
    out[(h - 1) * w + x] = out[(h - 2) * w + x];
  }
  for (let y = 0; y < h; y++) {
    out[y * w] = out[y * w + 1];
    out[y * w + w - 1] = out[y * w + w - 2];
  }
  return out;
}

/**
 * Otsu-küszöb a Sobel-erősség hisztogramjából.
 *
 * Fix 128 helyett a kép saját eloszlásából számol. Ez az, ami miatt ugyanaz a
 * beállítás működik egy világos portrén és egy sötét emblémán is.
 *
 * A gradiens nem 0..255, ezért előbb 0..255-re skálázunk a 99. percentilissel
 * (a maximum egyetlen kiugró él is lehet, azzal torzítana).
 *
 * A `scale` visszaadása azért kell, mert a maszkolás ugyanezt a skálát
 * használja — a küszöb és a pixelérték ugyanazon a tengelyen kell legyen.
 */
function otsuOnSobel(edges: Float32Array, bias = 0): { threshold: number; scale: number } {
  let max = 1;
  for (let i = 0; i < edges.length; i++) if (edges[i] > max) max = edges[i];

  // 99. percentilis a hisztogramból — a kiugró élek levágása.
  const raw = new Uint32Array(256);
  for (let i = 0; i < edges.length; i++) raw[Math.min(255, ((edges[i] / max) * 255) | 0)]++;
  let acc = 0;
  const cutoff = edges.length * 0.99;
  let p99 = 255;
  for (let v = 0; v < 256; v++) {
    acc += raw[v];
    if (acc >= cutoff) { p99 = Math.max(1, v); break; }
  }

  const scale = max / (p99 / 255);
  const hist = new Uint32Array(256);
  for (let i = 0; i < edges.length; i++) hist[Math.min(255, ((edges[i] / scale) * 255) | 0)]++;

  const total = edges.length;
  let sum = 0;
  for (let v = 0; v < 256; v++) sum += v * hist[v];

  let sumB = 0, wB = 0, best = 0, bestVar = -1;
  for (let v = 0; v < 256; v++) {
    wB += hist[v];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += v * hist[v];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > bestVar) { bestVar = between; best = v; }
  }

  // A bias az Otsu értéket tolja: negatív → több tinta, pozitív → kevesebb.
  const threshold = Math.min(254, Math.max(1, Math.round(best + bias * 255)));
  return { threshold, scale: Math.max(1e-6, scale) };
}

/* ------------------------------------------------------------------ *
 * Összefüggő komponensek
 * ------------------------------------------------------------------ */

/**
 * Összefüggő-komponens szűrés.
 *
 * A Sobel-küszöb után sok 1-4 pixeles izolált folt marad (szemcse, JPEG-zaj,
 * textúra). Ezek a stencilen pöttyökként jelennek meg, és a szalonmunkán
 * használhatatlanná teszik a mintát. A képernyőképen látható, szétszórt apró
 * jelek pontosan ezek voltak.
 *
 * A küszöb NEM fix pixelszám, hanem a kép területének aránya: kis képen a fix
 * szám mindent kidobna, nagy képen semmit.
 */
function filterComponents(
  mask: Uint8Array,
  w: number,
  h: number,
  minRatio = 0.00008,
): { mask: Uint8Array; before: number; after: number } {
  const minArea = Math.max(6, Math.round(w * h * minRatio));
  const labels = new Int32Array(w * h).fill(-1);
  const out = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  const pixels: number[] = [];
  let current = 0;
  let before = 0;
  let after = 0;

  /** Iteratív bejárás — a rekurzió egy 1366×832 képen stack overflow lenne. */
  function flood(start: number, label: number): number {
    let top = 0;
    stack[top++] = start;
    labels[start] = label;
    pixels.length = 0;
    while (top > 0) {
      const p = stack[--top];
      pixels.push(p);
      const x = p % w;
      const y = (p / w) | 0;
      if (x > 0 && mask[p - 1] && labels[p - 1] < 0) { labels[p - 1] = label; stack[top++] = p - 1; }
      if (x < w - 1 && mask[p + 1] && labels[p + 1] < 0) { labels[p + 1] = label; stack[top++] = p + 1; }
      if (y > 0 && mask[p - w] && labels[p - w] < 0) { labels[p - w] = label; stack[top++] = p - w; }
      if (y < h - 1 && mask[p + w] && labels[p + w] < 0) { labels[p + w] = label; stack[top++] = p + w; }
    }
    return pixels.length;
  }

  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || labels[i] >= 0) continue;
    const area = flood(i, current++);
    before++;
    if (area >= minArea) {
      after++;
      for (const p of pixels) out[p] = 1;
    }
  }

  return { mask: out, before, after };
}

/* ------------------------------------------------------------------ *
 * Morfológia
 * ------------------------------------------------------------------ */

/** Tágítás — a vékony élből nyomtatható vastagságú vonal. */
function dilate(mask: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  if (radius <= 0) return mask;
  let src = mask;
  for (let step = 0; step < radius; step++) {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (src[i]) { out[i] = 1; continue; }
        if ((x > 0 && src[i - 1]) || (x < w - 1 && src[i + 1]) ||
            (y > 0 && src[i - w]) || (y < h - 1 && src[i + w])) out[i] = 1;
      }
    }
    src = out;
  }
  return src;
}

/* ------------------------------------------------------------------ *
 * Hatching
 * ------------------------------------------------------------------ */

/**
 * Párhuzamos vonalárnyékolás a luminanciából.
 *
 * Ez a „full realism” irány: a sötét részeket sűrűbb vonalakkal jelöli, a
 * világosakat üresen hagyja. A stencil-nyomtatás így tónust tud átvinni
 * anélkül, hogy tömör fekete foltok lennének — amiket a bőrre nem lehet
 * átvinni.
 */
function hatchingMask(gray: Float32Array, w: number, h: number, spacing: number, angleDeg = 45): Uint8Array {
  const out = new Uint8Array(w * h);
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const luma = gray[i];
      // Sötétebb pixel → sűrűbb vonal. A 0.12 mélység a nyomtathatóság határa.
      const density = 1 - luma / 255;
      if (density < 0.12) continue;
      const period = spacing / Math.max(0.08, density);
      const phase = (x * dx + y * dy) % period;
      if (phase >= 0 && phase < 1.2) out[i] = 1;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Fő belépési pont
 * ------------------------------------------------------------------ */

const WEIGHT_RADIUS: Record<StencilWeight, number> = { fine: 0, standard: 1, bold: 2 };
const WEIGHT_MIN_RATIO: Record<StencilWeight, number> = { fine: 0.00004, standard: 0.00008, bold: 0.00012 };

/**
 * Fotóból (vagy AI-generált képből) stencil.
 *
 * A bemenet egy `HTMLImageElement`, egy `ImageBitmap`, egy `File` vagy egy URL.
 * A kimenet canvas, amit a hívó PNG-be írhat vagy megjeleníthet.
 *
 * A prompt-ág ugyanezt a függvényt hívja: a RunPod által generált kép is ezen
 * a láncon megy át, mert a generált kép sosem eleve tiszta vonalmunka.
 */
export async function buildStencil(
  source: HTMLImageElement | ImageBitmap | File | string,
  options: StencilOptions = {},
): Promise<StencilResult> {
  const {
    style = 'outline',
    weight = 'standard',
    lineColor = '#000000',
    opacity = 1,
    transparent = true,
    thresholdBias = 0,
  } = options;

  const bitmap = await loadBitmap(source);
  const w = bitmap.width;
  const h = bitmap.height;
  if (!w || !h) throw new Error('A forrás kép üres vagy nem olvasható.');

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const cctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!cctx) throw new Error('A képfeldolgozó nem indult el ebben a böngészőben.');
  cctx.drawImage(bitmap as CanvasImageSource, 0, 0);
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();

  const raw = cctx.getImageData(0, 0, w, h).data;

  // 1) Szürke + medián (zajszűrés a küszöb ELŐTT — ez a sorrend számít).
  const gray = toGray(raw, w, h);
  const denoised = w * h <= 4_000_000 ? median3x3(gray, w, h) : gray;

  // 2) Polaritás. Sötét hátterű képen a világos vonalakat keressük, ezért a
  //    jelet invertáljuk — a Sobel így is éleket ad, de a küszöb a helyes
  //    oldalon vág. A Pro Patria típusú emblémák pontosan ide esnek.
  const med = medianLuma(denoised);
  const inverted = med < 118;
  const working = new Float32Array(denoised.length);
  for (let i = 0; i < denoised.length; i++) working[i] = inverted ? 255 - denoised[i] : denoised[i];

  // 3) Élkiemelés.
  const edges = sobel(working, w, h);

  // 4) Adaptív küszöb. A `scale` ugyanaz, amivel a maszkolás normalizál.
  const { threshold, scale } = otsuOnSobel(edges, thresholdBias);

  let mask: Uint8Array<ArrayBufferLike> = new Uint8Array(w * h);
  for (let i = 0; i < edges.length; i++) {
    const normalized = Math.min(255, (edges[i] / scale) * 255) | 0;
    mask[i] = normalized >= threshold ? 1 : 0;
  }

  // 5) Hatching módban a mask helyett a luminanciából dolgozunk.
  if (style === 'hatching') {
    const spacing = weight === 'fine' ? 9 : weight === 'bold' ? 5 : 7;
    mask = hatchingMask(working, w, h, spacing);
  }

  // 6) Pöttyök kidobása.
  const filtered = filterComponents(mask, w, h, WEIGHT_MIN_RATIO[weight]);
  mask = filtered.mask;

  // 7) Vonalvastagság.
  let radius = WEIGHT_RADIUS[weight];
  if (style === 'fineLine') radius = 0;
  if (style === 'outline' || style === 'fullDetail') radius = Math.max(radius, 1);
  mask = dilate(mask, w, h, radius);

  // 8) Tintaszínezés.
  const ink = hexToRgb(lineColor);
  const out = cctx.createImageData(w, h);
  const buf = out.data;
  const alpha = Math.round(255 * Math.min(1, Math.max(0, opacity)));
  let inkCount = 0;

  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    if (mask[i]) {
      buf[p] = ink.r; buf[p + 1] = ink.g; buf[p + 2] = ink.b; buf[p + 3] = alpha;
      inkCount++;
    } else if (transparent) {
      buf[p] = 0; buf[p + 1] = 0; buf[p + 2] = 0; buf[p + 3] = 0;
    } else {
      buf[p] = 255; buf[p + 1] = 255; buf[p + 2] = 255; buf[p + 3] = 255;
    }
  }
  cctx.putImageData(out, 0, 0);

  // 9) Diagnosztika — a néma üres panel helyett.
  const inkRatio = inkCount / (w * h);
  const diagnostics: StencilDiagnostics = {
    sourceWidth: w,
    sourceHeight: h,
    medianLuma: med,
    inverted,
    otsuThreshold: threshold,
    inkRatio,
    componentsBefore: filtered.before,
    componentsAfter: filtered.after,
    width: w,
    height: h,
  };

  // A küszöbök szándékosan szélesek: a „sparse” még használható (vonalas
  // minta), a „flooded” viszont nyomtathatatlan tömör folt.
  if (inkCount === 0 || inkRatio < 0.0004) diagnostics.warning = 'empty';
  else if (inkRatio < 0.004) diagnostics.warning = 'sparse';
  else if (inkRatio > 0.55) diagnostics.warning = 'flooded';
  else if (filtered.after <= 1 && filtered.before > 8) diagnostics.warning = 'low-contrast';

  return { canvas, diagnostics };
}

/* ------------------------------------------------------------------ *
 * Segédek
 * ------------------------------------------------------------------ */

async function loadBitmap(
  source: HTMLImageElement | ImageBitmap | File | string,
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof source === 'string') {
    const res = await fetch(source);
    if (!res.ok) throw new Error('A stencil forrása nem tölthető be (' + res.status + ').');
    return createImageBitmap(await res.blob());
  }
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) return source;
  if (typeof File !== 'undefined' && source instanceof File) return createImageBitmap(source);
  return source as HTMLImageElement;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6);
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0,
  };
}

/** A stencil PNG-be írása — letöltéshez vagy feltöltéshez. */
export function stencilToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('A stencil PNG nem készíthető el.'));
    }, 'image/png');
  });
}

/**
 * A diagnosztika emberi szövege.
 *
 * A hívó a saját nyelvén jeleníti meg; itt csak a kulcs és a tények vannak.
 */
export function describeStencilWarning(d: StencilDiagnostics): string {
  switch (d.warning) {
    case 'empty':
      return 'A forrásképen nem találtam összefüggő kontúrt. Próbálj nagyobb felbontású vagy kontrasztosabb képet.';
    case 'sparse':
      return 'Kevés kontúr jött ki. Próbáld a „Finom” helyett a „Standard” vagy „Erős” vonalat, vagy növeld a kontrasztot.';
    case 'flooded':
      return 'Túl sok tinta lett — a minta nyomtatásra tömör folt. Próbáld a „Finom” vonalat.';
    case 'low-contrast':
      return 'A kép alacsony kontrasztú, ezért sok apró folt esett ki. Erősebb megvilágítású fotó jobb eredményt ad.';
    default:
      return '';
  }
}
