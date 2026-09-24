// A kepek feloldasa a galeriablokkokhoz.
//
// A generator `image_query`-je egy rovid angol kifejezes. Ez a modul bekuldi a
// `vey-images` funkciónak, es a visszakapott URL-eket beirja a dokumentumba —
// igy a renderelo mar valodi fotot rajzol, nem szoveges helyorzot.

import type { SiteDocument } from './site-schema';
import { FUNCTIONS_URL, authHeaders } from './supabase-client';

export interface ResolvedImage {
  query: string;
  url: string;
  thumb: string;
  alt: string;
  author: string;
  source: string;
}

/**
 * A dokumentumban levo osszes gallery-keresokifejezes, sorrendben.
 * Egy dokumentum egyszer megy at a funkción, nem galeriankent.
 */
export function collectImageQueries(doc: SiteDocument): string[] {
  const queries: string[] = [];
  for (const block of doc.blocks) {
    if (block.type === 'gallery') {
      for (const img of block.images) {
        if (img.query && !queries.includes(img.query)) queries.push(img.query);
      }
    }
  }
  return queries.slice(0, 12);
}

/**
 * Feloldja a keresokifejezeseket kepekre.
 *
 * Hiba eseten ures tombot ad vissza, nem dob: a generalas akkor is mukodik, ha a
 * kepkereso nem elerheto — a galeria ilyenkor a szoveges helyorzot mutatja.
 *
 * A hiba OKA viszont nem veszhet el: ha a funkcio 500-at ad (pl. hianyzik az
 * UNSPLASH_ACCESS_KEY secret), azt a konzolba irjuk. Enelkul a felhasznalo csak
 * annyit lat, hogy nincs kep, es nem tudja megkulonboztetni a „nincs talalat”
 * es a „nincs beallitva” esetet.
 */
export async function resolveImages(queries: string[]): Promise<ResolvedImage[]> {
  if (queries.length === 0) return [];

  let headers: Record<string, string>;
  try {
    headers = await authHeaders();
  } catch {
    // Kijelentkezve nincs kepfeloldas. A galeria helyorzot mutat, a
    // generalas ettol fuggetlenul hasznalhato marad.
    return [];
  }

  try {
    const res = await fetch(`${FUNCTIONS_URL}/vey-images`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ queries, perQuery: 3 }),
    });

    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as { error?: string } | null;
      console.warn('vey-images nem adott kepet:', res.status, detail?.error ?? '');
      return [];
    }

    const body = (await res.json()) as { images?: ResolvedImage[] };
    return Array.isArray(body.images) ? body.images : [];
  } catch (e) {
    console.warn('vey-images nem elerheto:', e instanceof Error ? e.message : e);
    return [];
  }
}

/**
 * Beirja a feloldott kepeket a dokumentum galeriablockjaiba.
 *
 * Egy kereses tobb talalatot ad, es egy galeria tobb kepe ugyanazt a kifejezest
 * is hasznalhatja — ezert kifejezesenkent egy kurzor megy vegig a talalatokon, es
 * a galeria elemei sorban kapjak oket. Ha elfogynak, a helyorzo marad.
 *
 * A `source` (a fotos Unsplash-profilja) is atkerul: az Unsplash API-eloiras
 * szerint a megjelenitett kephez a fotos neve ES a profiljara mutato link kell.
 * Enelkul a beagyazas nem felel meg a licencnek.
 */
export function applyImages(doc: SiteDocument, images: ResolvedImage[]): SiteDocument {
  if (images.length === 0) return doc;

  const byQuery = new Map<string, ResolvedImage[]>();
  for (const img of images) {
    const list = byQuery.get(img.query) ?? [];
    list.push(img);
    byQuery.set(img.query, list);
  }

  const cursor = new Map<string, number>();

  return {
    ...doc,
    blocks: doc.blocks.map((block) => {
      if (block.type !== 'gallery') return block;

      return {
        ...block,
        images: block.images.map((img) => {
          const pool = byQuery.get(img.query) ?? [];
          const index = cursor.get(img.query) ?? 0;
          const hit = pool[index];
          if (!hit) return img;
          cursor.set(img.query, index + 1);
          return {
            ...img,
            url: hit.url,
            alt: hit.alt,
            author: hit.author,
            source: hit.source,
          };
        }),
      };
    }),
  };
}
