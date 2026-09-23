/**
 * Deterministic template artwork.
 *
 * The catalogue has 138,240 entries and no images. Rather than ship binaries,
 * each template draws its own cover from a recipe keyed off its index — the
 * same template always produces the same cover, and the browse grid needs no
 * asset at all.
 *
 * The palette comes from the template itself, so a cover is never a colour the
 * generated page will not use.
 */

import { getDesignlyTemplate } from './templates';

/** FNV-1a over the seed, so a cover is stable across sessions. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export interface TemplateArt {
  ink: string;
  accent: string;
  text: string;
  angle: number;
  motif: 0 | 1 | 2 | 3;
}

export function templateArt(index: number): TemplateArt {
  const tpl = getDesignlyTemplate(index);
  const h = hash(tpl.id + tpl.style);
  const p = tpl.palette;

  return {
    ink: p[0] ?? '#090909',
    accent: p[1] ?? '#c9a45c',
    text: p[2] ?? '#f4eee2',
    // A grid where every cover sits at the same angle reads as one template
    // repeated; the variation is what makes the catalogue look like a library.
    angle: (h >>> 12) % 46,
    motif: ((h >>> 20) % 4) as 0 | 1 | 2 | 3,
  };
}

/**
 * A cover as an inline SVG. Used as a `data:` URL, so it needs no file on disk
 * and no bucket round trip.
 */
export function templateCoverSvg(index: number): string {
  const tpl = getDesignlyTemplate(index);
  const art = templateArt(index);
  const initials = tpl.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const motifs = [
    `<g stroke="${art.accent}" stroke-width="1.2" fill="none" opacity="0.5">
       <circle cx="200" cy="150" r="62" /><circle cx="200" cy="150" r="44" /><circle cx="200" cy="150" r="26" />
     </g>`,
    `<g stroke="${art.accent}" stroke-width="1" fill="none" opacity="0.45">
       ${Array.from({ length: 7 }, (_, i) => `<path d="M${60 + i * 46} 40 L${100 + i * 46} 260" />`).join('')}
     </g>`,
    `<g stroke="${art.accent}" stroke-width="1.4" fill="none" opacity="0.5">
       <path d="M40 240 A180 180 0 0 1 220 60" /><path d="M60 260 A160 160 0 0 1 240 80" />
     </g>`,
    `<g stroke="${art.accent}" stroke-width="1" fill="none" opacity="0.4">
       <rect x="70" y="50" width="260" height="200" /><rect x="100" y="80" width="200" height="140" />
     </g>`,
  ][art.motif];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
    <rect width="400" height="300" fill="${art.ink}" />
    <g transform="rotate(${art.angle} 200 150)">${motifs}</g>
    <text x="200" y="158" text-anchor="middle" font-family="Marcellus, Georgia, serif" font-size="46" fill="${art.text}" opacity="0.92">${initials}</text>
    <text x="200" y="196" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="10" letter-spacing="2.4" fill="${art.accent}" opacity="0.85">${tpl.category.toUpperCase()}</text>
    <rect x="0.5" y="0.5" width="399" height="299" fill="none" stroke="${art.accent}" stroke-opacity="0.28" />
  </svg>`;
}

export function templateCoverUrl(index: number): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(templateCoverSvg(index))}`;
}
