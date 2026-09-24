/**
 * A szalonmunkalap.
 *
 * A stencil onmagaban csak a kontur. A munkalap az, amit a tetovaló kinyomtat:
 * A4-re tervezett lap, amin a minta a pontos meretben all, korulotte
 * regisztracios jelekkel (REG), vagasjelekkel (CROP) es a szimmetriatengellyel
 * (AXIS). Ez az a lap, amit a termal stencil-nyomtato vagy a transfer paper
 * fogad.
 *
 * MIERT KULON FUGGVENY
 * --------------------
 * A munkalap NEM a stencil PNG modositasa: a stencil valtozatlan marad (az a
 * Procreate-be es a nyomtatoba megy), a munkalap egy KULON osszeallitas, ami a
 * stencilt beagyazza. Ha egyutt csinalnank, a letoltott stencil kepen
 * rajta maradnanak a segédvonalak — pont az, amit a tetovaló nem akar.
 *
 * A meret valodi: 300 DPI-nel 1 mm = 11.811 pixel. A munkalap A4
 * (210x297 mm), 10 mm margoval, hogy a legtobb nyomtato margoja beleferjen.
 *
 * A `widthMm` az EGYETLEN olyan parameter, amit a tetovalonak tudnia kell —
 * minden mas ebbol szarmazik.
 */

export interface WorksheetOptions {
  /** A stencil kepe — a beagyazando PNG. */
  stencilUrl: string;
  /** A forras kepe, ha a lapon osszehasonlitas is kell. */
  sourceUrl?: string;
  /** A tetovalas szelessege MILLIMETERBEN. Ezt adja meg a tetovaló. */
  widthMm: number;
  /** A tetovalas magassaga milliméterben. Ha 0, a keparanybol szamoljuk. */
  heightMm?: number;
  /** A cim a lap tetejen. */
  title?: string;
  /** A nyomtatott szoveg szine. */
  inkColor?: string;
  /** Segedvonalak. */
  grid?: boolean;
  center?: boolean;
  mirror?: boolean;
  /** 300 DPI — a nyomtatasi pontossag alapja. */
  dpi?: number;
}

export interface WorksheetResult {
  canvas: HTMLCanvasElement;
  /** A vegleges, nyomtatott minta merete mm-ben — a keret nelkul. */
  printedWidthMm: number;
  printedHeightMm: number;
  /** Kicsinyiteni kellett-e, hogy elferjen az A4-en. */
  resized: boolean;
}

const MM_PER_INCH = 25.4;

/** A4 pixelben, a megadott DPI-n. */
export function a4PixelSize(dpi = 300): { width: number; height: number } {
  return {
    width: Math.round((210 / MM_PER_INCH) * dpi),
    height: Math.round((297 / MM_PER_INCH) * dpi),
  };
}

function mmToPx(mm: number, dpi: number): number {
  return (mm / MM_PER_INCH) * dpi;
}

/**
 * A munkalap osszeallitasa.
 *
 * A visszaadott canvas A4 meretu, feher hatteru, es a stencilt a megadott
 * fizikai szelessegre skalazva tartalmazza. A meret a NYOMTATASNAL szamit:
 * ha a tetovaló 120 mm-t ad meg, akkor a papiron a minta 120 mm lesz,
 * fuggetlenul a stencil PNG pixelmeretetol.
 */
export async function buildWorksheet(options: WorksheetOptions): Promise<WorksheetResult> {
  const {
    stencilUrl,
    sourceUrl,
    widthMm,
    heightMm = 0,
    title = 'DESIGNLY TATTOO — STENCIL MASTER',
    inkColor = '#111111',
    grid = true,
    center = true,
    mirror = false,
    dpi = 300,
  } = options;

  const stencil = await loadImage(stencilUrl);
  let mmW = Math.max(5, widthMm);
  let mmH = heightMm > 0 ? Math.max(5, heightMm) : mmW * (stencil.height / stencil.width);

  const page = a4PixelSize(dpi);
  const marginPx = mmToPx(10, dpi);
  const contentW = page.width - marginPx * 2;
  const contentH = page.height - marginPx * 2 - mmToPx(30, dpi); // fejlec + lablec helye

  // Ha a kert meret nem fer el, ARANYOSAN kicsinyitjuk — nem vagjuk el.
  // A munkalap jelzi is, hogy ez megtortent.
  let resized = false;
  let pxW = mmToPx(mmW, dpi);
  let pxH = mmToPx(mmH, dpi);
  if (pxW > contentW || pxH > contentH) {
    const factor = Math.min(contentW / pxW, contentH / pxH);
    pxW *= factor;
    pxH *= factor;
    mmW *= factor;
    mmH *= factor;
    resized = true;
  }

  const canvas = document.createElement('canvas');
  canvas.width = page.width;
  canvas.height = page.height;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('A munkalap nem készíthető el ebben a böngészőben.');

  // Feher lap — a nyomtatas nem szereti az atlatszot.
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, canvas.width, canvas.height);

  c.strokeStyle = inkColor;
  c.fillStyle = inkColor;
  c.textBaseline = 'middle';

  // --- Fejlec ---
  const fejlecY = marginPx + mmToPx(4, dpi);
  c.font = `600 ${mmToPx(3.2, dpi).toFixed(1)}px Inter, system-ui, sans-serif`;
  c.fillText(title, marginPx, fejlecY);

  c.font = `${mmToPx(2.4, dpi).toFixed(1)}px Inter, system-ui, sans-serif`;
  const jobbCimke = 'REG · CROP · AXIS';
  c.fillText(jobbCimke, page.width - marginPx - c.measureText(jobbCimke).width, fejlecY);

  c.lineWidth = Math.max(1, mmToPx(0.25, dpi));
  c.beginPath();
  c.moveTo(marginPx, fejlecY + mmToPx(4, dpi));
  c.lineTo(page.width - marginPx, fejlecY + mmToPx(4, dpi));
  c.stroke();

  // --- A stencil kozepen ---
  const cx = page.width / 2;
  const cy = page.height / 2 + mmToPx(4, dpi);
  const x0 = cx - pxW / 2;
  const y0 = cy - pxH / 2;

  c.drawImage(stencil, x0, y0, pxW, pxH);

  // --- Segedvonalak ---
  if (grid) {
    c.save();
    c.globalAlpha = 0.25;
    c.lineWidth = Math.max(1, mmToPx(0.15, dpi));
    const step = mmToPx(10, dpi);
    c.beginPath();
    for (let gx = x0; gx <= x0 + pxW; gx += step) {
      c.moveTo(Math.round(gx) + 0.5, y0);
      c.lineTo(Math.round(gx) + 0.5, y0 + pxH);
    }
    for (let gy = y0; gy <= y0 + pxH; gy += step) {
      c.moveTo(x0, Math.round(gy) + 0.5);
      c.lineTo(x0 + pxW, Math.round(gy) + 0.5);
    }
    c.stroke();
    c.restore();
  }

  if (center) {
    c.save();
    c.setLineDash([mmToPx(2, dpi), mmToPx(2, dpi)]);
    c.globalAlpha = 0.55;
    c.lineWidth = Math.max(1, mmToPx(0.2, dpi));
    c.beginPath();
    c.moveTo(x0, cy);
    c.lineTo(x0 + pxW, cy);
    c.moveTo(cx, y0);
    c.lineTo(cx, y0 + pxH);
    c.stroke();
    c.restore();
  }

  if (mirror) {
    c.save();
    c.globalAlpha = 0.4;
    c.lineWidth = Math.max(1, mmToPx(0.2, dpi));
    c.beginPath();
    // A tukortengely 3 mm-rel a minta bal szelen kivul.
    const mx = x0 - mmToPx(3, dpi);
    c.moveTo(mx, y0);
    c.lineTo(mx, y0 + pxH);
    c.stroke();
    c.restore();
  }

  // --- Regisztracios jelek (REG) ---
  const regLen = mmToPx(4, dpi);
  const regGap = mmToPx(2, dpi);
  c.save();
  c.lineWidth = Math.max(1, mmToPx(0.25, dpi));
  c.font = `${mmToPx(1.8, dpi).toFixed(1)}px Inter, system-ui, sans-serif`;

  /** Egy kereszt es a felirata. */
  function drawReg(px: number, py: number, label: string, labelBelow: boolean) {
    c.beginPath();
    c.moveTo(px - regLen / 2, py);
    c.lineTo(px + regLen / 2, py);
    c.moveTo(px, py - regLen / 2);
    c.lineTo(px, py + regLen / 2);
    c.stroke();
    c.fillText(
      label,
      px - c.measureText(label).width / 2,
      labelBelow ? py + regLen / 2 + regGap : py - regLen / 2 - regGap,
    );
  }

  const topY = Math.max(marginPx + mmToPx(12, dpi), y0 - mmToPx(10, dpi));
  const botY = Math.min(page.height - marginPx - mmToPx(20, dpi), y0 + pxH + mmToPx(10, dpi));
  const leftX = Math.max(marginPx + mmToPx(6, dpi), x0 - mmToPx(12, dpi));
  const rightX = Math.min(page.width - marginPx - mmToPx(6, dpi), x0 + pxW + mmToPx(12, dpi));

  drawReg(cx, topY, 'REG', false);
  drawReg(cx, botY, 'REG BOTTOM', true);
  drawReg(leftX, cy, 'REG', false);
  drawReg(rightX, cy, 'REG', false);
  c.restore();

  // --- Vagasjelek (CROP) a lap negy sarkaban ---
  c.save();
  c.lineWidth = Math.max(1, mmToPx(0.2, dpi));
  const cropLen = mmToPx(5, dpi);
  const cropInset = mmToPx(6, dpi);
  const corners: Array<[number, number, number, number]> = [
    [cropInset, cropInset, 1, 1],
    [canvas.width - cropInset, cropInset, -1, 1],
    [cropInset, canvas.height - cropInset, 1, -1],
    [canvas.width - cropInset, canvas.height - cropInset, -1, -1],
  ];
  for (const [px, py, sx, sy] of corners) {
    c.beginPath();
    c.moveTo(px, py + sy * cropLen);
    c.lineTo(px, py);
    c.lineTo(px + sx * cropLen, py);
    c.stroke();
  }
  c.restore();

  // --- Also sav: a meret es a nyomtatasi informaciok ---
  c.save();
  c.font = `${mmToPx(2.2, dpi).toFixed(1)}px Inter, system-ui, sans-serif`;
  const meret = `${mmW.toFixed(1)} × ${mmH.toFixed(1)} MM`;
  c.fillText(meret, marginPx, canvas.height - marginPx - mmToPx(6, dpi));

  const info = `${dpi} DPI · PRINT 100% (NO SCALING)${resized ? ' · RESIZED TO FIT' : ''}`;
  c.fillText(
    info,
    page.width - marginPx - c.measureText(info).width,
    canvas.height - marginPx - mmToPx(6, dpi),
  );
  c.restore();

  // --- Opcionalis osszehasonlitas a lap aljan ---
  if (sourceUrl) {
    try {
      const source = await loadImage(sourceUrl);
      const thumbH = mmToPx(24, dpi);
      const thumbW = thumbH * (source.width / source.height);
      const ty = canvas.height - marginPx - mmToPx(34, dpi);
      c.drawImage(source, marginPx, ty, thumbW, thumbH);
      c.font = `${mmToPx(2, dpi).toFixed(1)}px Inter, system-ui, sans-serif`;
      c.fillText('FORRÁS', marginPx, ty + thumbH + mmToPx(3, dpi));
    } catch {
      // Ha a forras nem toltheto be, a lap igy is hasznalhato.
    }
  }

  return { canvas, printedWidthMm: mmW, printedHeightMm: mmH, resized };
}

/** A munkalap PNG-be irasa. */
export function worksheetToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('A munkalap PNG nem készíthető el.'));
    }, 'image/png');
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('A kép nem tölthető be: ' + url.slice(0, 80)));
    img.src = url;
  });
}
