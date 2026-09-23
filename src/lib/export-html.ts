/**
 * A standalone HTML file built from a site document.
 *
 * No script, no external stylesheet, no fetch: everything is inlined, so the
 * file opens from disk, from an email attachment, or from a static host with
 * no build step. The input is the same allow-listed block list the preview
 * renders, so the export and the on-screen result cannot drift apart.
 */

import type { SiteDocument, SiteBlock } from './site-schema';

export function esc(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBlock(b: SiteBlock): string {
  switch (b.type) {
    case 'hero':
      return `<section class="hero">
  <p class="eyebrow">${esc(b.eyebrow)}</p>
  <h1>${esc(b.headline)}</h1>
  <p class="lead">${esc(b.subheadline)}</p>
  <a class="btn" href="${esc(b.cta.href)}">${esc(b.cta.label)}</a>
</section>`;

    case 'features':
      return `<section>
  <h2>${esc(b.heading)}</h2>
  <div class="grid">${b.items
    .map((i) => `<article><h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></article>`)
    .join('')}</div>
</section>`;

    case 'about':
      return `<section><h2>${esc(b.heading)}</h2><p>${esc(b.body)}</p></section>`;

    case 'services':
      return `<section>
  <h2>${esc(b.heading)}</h2>
  <ul class="rows">${b.items
    .map(
      (i) =>
        `<li><span><strong>${esc(i.name)}</strong><em>${esc(i.text)}</em></span><b>${esc(
          i.price,
        )}</b></li>`,
    )
    .join('')}</ul>
</section>`;

    case 'pricing':
      return `<section>
  <h2>${esc(b.heading)}</h2>
  <div class="grid">${b.tiers
    .map(
      (t) =>
        `<article><h3>${esc(t.name)}</h3><p class="price">${esc(t.price)}<span>${esc(
          t.period,
        )}</span></p><ul>${t.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></article>`,
    )
    .join('')}</div>
</section>`;

    case 'gallery':
      return `<section>
  <h2>${esc(b.heading)}</h2>
  <div class="grid">${b.images
    .map(
      (i) =>
        `<figure><div class="ph">${esc(i.query)}</div><figcaption>${esc(
          i.caption,
        )}</figcaption></figure>`,
    )
    .join('')}</div>
</section>`;

    case 'testimonials':
      return `<section>
  <h2>${esc(b.heading)}</h2>
  <div class="grid">${b.items
    .map(
      (i) =>
        `<blockquote><p>“${esc(i.quote)}”</p><footer>${esc(i.author)}${
          i.role ? ` — ${esc(i.role)}` : ''
        }</footer></blockquote>`,
    )
    .join('')}</div>
</section>`;

    case 'faq':
      return `<section>
  <h2>${esc(b.heading)}</h2>
  <dl>${b.items.map((i) => `<dt>${esc(i.q)}</dt><dd>${esc(i.a)}</dd>`).join('')}</dl>
</section>`;

    case 'contact':
      return `<section>
  <h2>${esc(b.heading)}</h2>
  <p>${esc(b.body)}</p>
  <ul class="plain">${[b.email, b.phone, b.address]
    .filter(Boolean)
    .map((v) => `<li>${esc(v)}</li>`)
    .join('')}</ul>
</section>`;

    case 'cta':
      return `<section class="hero">
  <h2>${esc(b.headline)}</h2>
  <p class="lead">${esc(b.subheadline)}</p>
  <a class="btn" href="${esc(b.cta.href)}">${esc(b.cta.label)}</a>
</section>`;

    case 'footer':
      return `<footer>
  <p>${esc(b.text)}</p>
  <ul class="plain">${b.links.map((l) => `<li>${esc(l.label)}</li>`).join('')}</ul>
</footer>`;
  }
}

export function toStandaloneHtml(doc: SiteDocument): string {
  const { theme, title, nav, language } = doc.site;
  const light = theme.mode === 'light';
  const accent = theme.palette[0] ?? '#7c5cff';
  const bg = light ? '#ffffff' : '#0a0a12';
  const fg = light ? '#14141c' : '#eef0f6';

  return `<!doctype html>
<html lang="${esc(language)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;600&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
  :root { --accent: ${accent}; --bg: ${bg}; --fg: ${fg}; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); line-height: 1.6;
         font-family: ${theme.body_font}, Inter, system-ui, sans-serif; }
  h1, h2, h3 { font-family: ${theme.heading_font}, Inter, sans-serif; font-weight: 600; line-height: 1.15; }
  a { color: inherit; }
  header.site { display: flex; align-items: center; justify-content: space-between;
                padding: 1rem 1.5rem; border-bottom: 1px solid color-mix(in srgb, var(--accent) 28%, transparent); }
  header.site nav { display: flex; gap: 1.25rem; font-size: .875rem; opacity: .7; }
  section, footer { padding: 4rem 1.5rem; max-width: 1100px; margin: 0 auto; }
  .hero { text-align: center; padding-top: 6rem; padding-bottom: 6rem; }
  .eyebrow { color: var(--accent); text-transform: uppercase; letter-spacing: .28em; font-size: .75rem; }
  h1 { font-size: clamp(2rem, 5vw, 3.25rem); }
  .lead { opacity: .7; max-width: 42rem; margin: 1rem auto 0; }
  .btn { display: inline-block; margin-top: 2rem; padding: .85rem 1.75rem; border-radius: .75rem;
         background: var(--accent); color: ${light ? '#fff' : '#0a0a12'}; text-decoration: none;
         font-weight: 600; font-size: .875rem; }
  .grid { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-top: 2.5rem; }
  .grid > * { border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent); border-radius: .875rem; padding: 1.5rem; }
  .price { color: var(--accent); font-size: 1.75rem; }
  .price span { font-size: .75rem; opacity: .6; margin-left: .25rem; }
  .rows { list-style: none; padding: 0; max-width: 40rem; margin: 2.5rem auto 0; }
  .rows li { display: flex; justify-content: space-between; gap: 1.5rem; padding: 1rem 0;
             border-bottom: 1px solid color-mix(in srgb, var(--accent) 18%, transparent); }
  .rows em { display: block; font-style: normal; font-size: .875rem; opacity: .6; }
  .rows b { color: var(--accent); font-size: .875rem; white-space: nowrap; }
  blockquote { margin: 0; }
  blockquote p { font-style: italic; opacity: .8; }
  blockquote footer { padding: 0; max-width: none; font-size: .75rem; opacity: .6; }
  dl { max-width: 40rem; margin: 2.5rem auto 0; }
  dt { margin-top: 1.25rem; font-weight: 500; }
  dd { margin: .35rem 0 0; opacity: .7; font-size: .9375rem; }
  .plain { list-style: none; padding: 0; font-size: .9375rem; }
  .ph { display: grid; place-items: center; aspect-ratio: 4/3; font-size: .75rem; opacity: .4;
        border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent); border-radius: .5rem; }
  figure { margin: 0; }
  figcaption { font-size: .75rem; opacity: .6; margin-top: .5rem; }
  footer { border-top: 1px solid color-mix(in srgb, var(--accent) 22%, transparent); font-size: .8rem; opacity: .65; }
  @media (max-width: 640px) { section, footer { padding: 3rem 1.25rem; } }
</style>
</head>
<body>
<header class="site">
  <span style="font-weight:600; letter-spacing:.04em">${esc(title)}</span>
  <nav>${nav.map((n) => `<a href="${esc(n.href)}">${esc(n.label)}</a>`).join('')}</nav>
</header>
${doc.blocks.map(renderBlock).join('\n')}
</body>
</html>`;
}

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'weboldal'
  );
}

/** Triggers a download of the standalone document. */
export function downloadSiteHtml(doc: SiteDocument, name: string): void {
  const blob = new Blob([toStandaloneHtml(doc)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug(doc.site.title || name)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
