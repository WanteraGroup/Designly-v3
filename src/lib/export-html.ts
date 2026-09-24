/**
 * A standalone HTML file built from a site document.
 *
 * No script, no external stylesheet, no fetch: everything is inlined, so the
 * file opens from disk, from an email attachment, or from a static host with
 * no build step. The input is the same allow-listed block list the preview
 * renders, so the export and the on-screen result cannot drift apart.
 *
 * A galeria KEpet es attribuciot is visz: a korabbi valtozat mindig helyorzot
 * irt, tehat a letoltott HTML-ben nem volt foto, mikozben a preview-ban igen.
 * Ez volt az egyik legzavarobb elteres a ket kimenet kozott.
 */

import type { SiteDocument, SiteBlock } from './site-schema';
import { SUPABASE_URL } from './supabase-client';

export function esc(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeHref(value: string, fallback = '#'): string {
  const href = String(value ?? '').trim();
  if (!href) return fallback;
  if (/^(#|\/|\.\/|\.\.\/)/.test(href)) return href;
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  return fallback;
}

function safeColor(value: string, fallback = '#c9a45c'): string {
  const color = String(value ?? '').trim();
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback;
}

function safeFont(value: string, fallback: string): string {
  const font = String(value ?? '').trim();
  return /^[A-Za-z0-9 _.,'\-]{1,80}$/.test(font) ? font : fallback;
}

function renderBlock(b: SiteBlock, docTitle = ''): string {
  switch (b.type) {
    case 'hero':
      return `<section class="hero">
  <p class="eyebrow">${esc(b.eyebrow)}</p>
  <h1>${esc(b.headline)}</h1>
  <p class="lead">${esc(b.subheadline)}</p>
  <a class="btn" href="${esc(safeHref(b.cta.href))}">${esc(b.cta.label)}</a>
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
      /*
       * Van kep: valodi foto, attribucioval. Nincs kep: helyorzo a
       * keresokifejezessel. Ugyanaz a ket eset, amit a preview is mutat —
       * a ket kimenet nem terhet el egymastol.
       */
      return `<section>
  <h2>${esc(b.heading)}</h2>
  <div class="grid">${b.images
    .map((i) => {
      const media = i.url
        ? `<img src="${esc(i.url)}" alt="${esc(i.alt ?? i.caption ?? '')}" loading="lazy" />`
        : `<div class="ph">${esc(i.query)}</div>`;
      const credit = i.author
        ? `<span class="credit">${
            i.source
              ? `<a href="${esc(safeHref(i.source))}" target="_blank" rel="noopener noreferrer">${esc(i.author)}</a>`
              : esc(i.author)
          }</span>`
        : '';
      return `<figure>${media}<figcaption><span>${esc(i.caption)}</span>${credit}</figcaption></figure>`;
    })
    .join('')}</div>
</section>`;

    case 'testimonials':
      return `<section>
  <h2>${esc(b.heading)}</h2>
  <div class="grid">${b.items
    .map(
      (i) =>
        `<blockquote><p>&ldquo;${esc(i.quote)}&rdquo;</p><footer>${esc(i.author)}${
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
  <ul class="plain">${[
    b.email ? `<li><a href="${esc(`mailto:${b.email}`)}">${esc(b.email)}</a></li>` : '',
    b.phone ? `<li><a href="${esc(`tel:${b.phone.replace(/[^+\\d]/g, '')}`}">${esc(b.phone)}</a></li>` : '',
    b.address ? `<li>${esc(b.address)}</li>` : '',
  ].join('')}</ul>
</section>`;

    case 'form':
      return `<section>
  <h2>${esc(b.heading)}</h2>
  <p>${esc(b.body)}</p>
  <form data-designly-form data-form-id="${esc(b.formId)}" data-site-title="${esc(docTitle)}" class="designly-form">
    <input type="text" name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true" />
    ${b.fields.map((field) => field.type === 'textarea'
      ? `<label><span>${esc(field.label)}${field.required ? ' *' : ''}</span><textarea name="${esc(field.name)}"${field.required ? ' required' : ''} placeholder="${esc(field.placeholder ?? '')}"></textarea></label>`
      : field.type === 'select'
        ? `<label><span>${esc(field.label)}${field.required ? ' *' : ''}</span><select name="${esc(field.name)}"${field.required ? ' required' : ''}><option value="">Válassz…</option>${(field.options ?? []).map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select></label>`
        : `<label><span>${esc(field.label)}${field.required ? ' *' : ''}</span><input type="${esc(field.type)}" name="${esc(field.name)}"${field.required ? ' required' : ''} placeholder="${esc(field.placeholder ?? '')}" /></label>`
    ).join('')}
    <button class="btn" type="submit">${esc(b.submitLabel)}</button>
    <p data-form-status class="form-status" aria-live="polite"></p>
  </form>
</section>`;

    case 'cta':
      return `<section class="hero">
  <h2>${esc(b.headline)}</h2>
  <p class="lead">${esc(b.subheadline)}</p>
  <a class="btn" href="${esc(safeHref(b.cta.href))}">${esc(b.cta.label)}</a>
</section>`;

    case 'footer':
      return `<footer>
  <p>${esc(b.text)}</p>
  <ul class="plain">${b.links.map((l) => `<li><a href="${esc(safeHref(l.href))}">${esc(l.label)}</a></li>`).join('')}</ul>
</footer>`;
  }
}

export function toStandaloneHtml(doc: SiteDocument): string {
  const { theme, title, nav, language } = doc.site;
  const light = theme.mode === 'light';
  const accent = safeColor(theme.palette[0] ?? '#c9a45c', '#c9a45c');
  const headingFont = safeFont(theme.heading_font, 'Marcellus');
  const bodyFont = safeFont(theme.body_font, 'Inter');
  const backgroundImage = typeof theme.background_image === 'string' && /^https?:\/\//i.test(theme.background_image) ? theme.background_image : '';
  const bg = light ? '#ffffff' : '#0a0a12';
  const fg = light ? '#14141c' : '#eef0f6';
  const FORM_ENDPOINT = SUPABASE_URL + '/functions/v1/designly-form-submit';

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
         font-family: ${bodyFont}, Inter, system-ui, sans-serif;
         ${backgroundImage ? `background-image: linear-gradient(${light ? 'rgba(255,255,255,.72)' : 'rgba(10,10,18,.55)'}, ${light ? 'rgba(255,255,255,.88)' : 'rgba(10,10,18,.78)'}), url("${esc(backgroundImage)}"); background-size: cover; background-position: center; background-attachment: fixed;` : ''} }
  h1, h2, h3 { font-family: ${headingFont}, Inter, sans-serif; font-weight: 600; line-height: 1.15; }
  a { color: inherit; }
  header.site { display: flex; align-items: center; justify-content: space-between;
                padding: 1rem 1.5rem; border-bottom: 1px solid color-mix(in srgb, var(--accent) 28%, transparent); }
  header.site nav { display: flex; gap: 1.25rem; font-size: .875rem; opacity: .7; }
  section, footer { padding: 4rem 1.5rem; max-width: 1100px; margin: 0 auto; }
  .hero { text-align: center; padding-top: 6rem; padding-bottom: 6rem; }
  .eyebrow { color: var(--accent); text-transform: uppercase; letter-spacing: .28em; font-size: .75rem; }
  h1 { font-size: clamp(2rem, 5vw, 3.25rem); }
  .lead { opacity: .7; max-width: 42rem; margin: 1rem auto 0; }
  .designly-form { max-width: 42rem; margin: 2rem auto 0; }
  .designly-form label { display: block; margin-top: 1rem; }
  .designly-form label span { display: block; margin-bottom: .4rem; font-size: .85rem; opacity: .8; }
  .designly-form input, .designly-form textarea, .designly-form select { width: 100%; border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent); border-radius: .75rem; padding: .75rem .85rem; background: transparent; color: inherit; font: inherit; }
  .designly-form textarea { min-height: 8rem; resize: vertical; }
  .designly-form select option { color: #14141c; }
  .designly-form .hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
  .form-status { min-height: 1.4rem; font-size: .85rem; margin-top: .75rem; }
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
  figure { margin: 0; overflow: hidden; border-radius: .5rem; }
  figure img { display: block; width: 100%; aspect-ratio: 4/3; object-fit: cover; }
  figcaption { display: flex; justify-content: space-between; gap: .75rem;
               font-size: .75rem; opacity: .6; margin-top: .5rem; padding: 0 .25rem; }
  .credit a { text-decoration: underline; text-underline-offset: 2px; }
  footer { border-top: 1px solid color-mix(in srgb, var(--accent) 22%, transparent); font-size: .8rem; opacity: .65; }
  @media (max-width: 640px) { section, footer { padding: 3rem 1.25rem; } }
</style>
</head>
<body>
<header class="site">
  <span style="font-weight:600; letter-spacing:.04em">${esc(title)}</span>
  <nav>${nav.map((n) => `<a href="${esc(safeHref(n.href))}">${esc(n.label)}</a>`).join('')}</nav>
</header>
${doc.blocks.map((block) => renderBlock(block, title)).join('\n')}
<script>
(() => {
  const endpoint = ${JSON.stringify(FORM_ENDPOINT)};
  document.querySelectorAll('[data-designly-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = form.querySelector('[data-form-status]');
      const button = form.querySelector('button');
      if (button) button.disabled = true;
      if (status) status.textContent = 'Küldés…';
      const data = Object.fromEntries(new FormData(form).entries());
      const website = String(data.website ?? '');
      delete data.website;
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formId: form.dataset.formId,
            siteTitle: form.dataset.siteTitle || document.title,
            data,
            website,
            sourceUrl: window.location.href
          })
        });
        if (!response.ok) throw new Error('submit');
        form.reset();
        if (status) status.textContent = 'Az üzenetet sikeresen elküldtük.';
      } catch {
        if (status) status.textContent = 'Az üzenetet nem sikerült elküldeni.';
      } finally {
        if (button) button.disabled = false;
      }
    });
  });
})();
</script>
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
