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
 *
 * A FUNKCIONALIS blokkok (urlap, foglalas, termeklista, terkep, hirlevel) az
 * exportban is mukodnek: a lapba agyazott script a sajat fogado vegpontra kuld.
 * Ket dolog, amire figyelni kell:
 *   1. Az `endpoint`-ot ABSZOLUT URL-kent kell kiirni. Ha relativ maradna, a
 *      letoltott fajl a helyi gepre kuldene az adatot, ahol nincs fogado.
 *   2. Az export NEM tartalmaz kulso scriptet: a bekuldes inline `fetch`, tehat
 *      a fajl `file://`-bol is mukodik anelkul, hogy barmit betoltene.
 */

import type { SiteDocument, SiteBlock } from './site-schema';
import { FUNCTIONS_URL } from './supabase-client';

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

/*
 * A telefon-link a `tel:` semahoz kell, de a `+` es a szamjegyeken kivul minden
 * karakter eltavolitando.
 *
 * Ez a muvelet SZANDEKOSAN kulon fuggvenyben van. Az eredeti egy sorban,
 * beagyazott sablonliterálon belul volt, a mintaja pedig `[^+\\d]` — a dupla
 * backslash a forrasszovegben mar ket karakter, es az esbuild ott nem tudta
 * lezarni a regex literalt: a build a `}` karakternel halt el a contact
 * blokkban. Kulon fuggvenyben a minta egyszer, tisztan all: `[^+\d]`.
 */
function telHref(raw: string): string {
  const digits = String(raw ?? '').replace(/[^+\d]/g, '');
  return 'tel:' + digits;
}

/** Rohid vegpontnev -> abszolut URL. A `parseSite` mar kiszurte a kulso cimeket. */
function endpointUrl(endpoint: string): string {
  const v = String(endpoint ?? '').trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith('/')) return v;
  return `${FUNCTIONS_URL}/${v.replace(/^\/+/, '')}`;
}

/** Stabil, cimbol szarmazo azonosito — ugyanaz, mint a kliens rendereloben. */
function siteKey(title: string): string {
  let h = 0x811c9dc5;
  const t = String(title ?? 'designly');
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `site_${h.toString(16)}`;
}

function fieldHtml(
  f: { name: string; label: string; type: string; required: boolean; options?: string[]; placeholder?: string },
): string {
  const label = `${esc(f.label)}${f.required ? ' *' : ''}`;
  const req = f.required ? ' required' : '';
  const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';
  if (f.type === 'textarea') {
    return `<label>${label}<textarea name="${esc(f.name)}" rows="4"${req}${ph}></textarea></label>`;
  }
  if (f.type === 'select') {
    const opts = (f.options ?? []).map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
    return `<label>${label}<select name="${esc(f.name)}"${req}><option value="">Válassz…</option>${opts}</select></label>`;
  }
  const type = ['text', 'email', 'tel', 'date', 'time'].includes(f.type) ? f.type : 'text';
  return `<label>${label}<input type="${type}" name="${esc(f.name)}"${req}${ph} /></label>`;
}

function renderBlock(b: SiteBlock, siteTitle: string): string {
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

    case 'contact': {
      const mail = b.email ? 'mailto:' + b.email : '';
      const tel = b.phone ? telHref(b.phone) : '';
      const rows = [
        b.email ? `<li><a href="${esc(mail)}">${esc(b.email)}</a></li>` : '',
        b.phone ? `<li><a href="${esc(tel)}">${esc(b.phone)}</a></li>` : '',
        b.address ? `<li>${esc(b.address)}</li>` : '',
      ].join('');
      return `<section>
  <h2>${esc(b.heading)}</h2>
  <p>${esc(b.body)}</p>
  <ul class="plain">${rows}</ul>
</section>`;
    }

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

    /*
     * Az urlap az exportban is ugyanazt a JSON-t kuldja, amit a preview: a
     * `<form>` sajat `submit` kezelot kap, es a mezoket `FormData`-bol szedjuk.
     * Ezzel egy kodtomod van a ket kimenetre, es a fogado vegpont nem tudja
     * megkulonboztetni, hogy melyikbol jott a keres.
     */
    case 'form':
      return `<section id="form">
  <h2>${esc(b.heading)}</h2>
  ${b.body ? `<p class="lead">${esc(b.body)}</p>` : ''}
  <form class="dl-form" data-endpoint="${esc(endpointUrl(b.endpoint))}" data-site="${esc(siteKey(siteTitle))}" data-form-id="${esc(b.heading)}" data-success="${esc(b.successMessage)}">
    ${b.fields.map(fieldHtml).join('')}
    <input type="text" name="_hp" tabindex="-1" autocomplete="off" aria-hidden="true" class="dl-hp" />
    <button type="submit" class="btn">${esc(b.submitLabel)}</button>
    <p class="dl-status" aria-live="polite"></p>
  </form>
</section>`;

    case 'booking':
      return `<section id="booking">
  <h2>${esc(b.heading)}</h2>
  ${b.body ? `<p class="lead">${esc(b.body)}</p>` : ''}
  ${
    b.availability.length
      ? `<div class="dl-hours"><p><b>Nyitvatartás</b></p><ul>${b.availability
          .map((a) => `<li><span>${esc(a.day)}</span><span>${esc(a.from)}–${esc(a.to)}</span></li>`)
          .join('')}</ul></div>`
      : ''
  }
  <form class="dl-form" data-endpoint="${esc(endpointUrl(b.endpoint))}" data-site="${esc(siteKey(siteTitle))}" data-kind="booking" data-availability="${esc(JSON.stringify(b.availability))}" data-success="${esc(b.successMessage)}">
    <label>Szolgáltatás<select name="service" required>${b.services
      .map((s) => `<option value="${esc(s.name)}">${esc(s.name)}${s.duration !== '—' ? ` · ${esc(s.duration)}` : ''}${s.price !== '—' ? ` · ${esc(s.price)}` : ''}</option>`)
      .join('')}</select></label>
    <label>Dátum<input type="date" name="date" required /></label>
    <label>Időpont<input type="time" name="time" required /></label>
    <label>Név<input type="text" name="name" required /></label>
    <label>Email vagy telefon<input type="text" name="contact" required /></label>
    <input type="text" name="_hp" tabindex="-1" autocomplete="off" aria-hidden="true" class="dl-hp" />
    <button type="submit" class="btn">Foglalás elküldése</button>
    <p class="dl-status" aria-live="polite"></p>
  </form>
</section>`;

    case 'product-grid':
      return `<section id="products">
  <h2>${esc(b.heading)}</h2>
  ${b.body ? `<p class="lead">${esc(b.body)}</p>` : ''}
  <div class="grid">${b.products
    .map((p) => {
      const media = p.imageUrl
        ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.name)}" loading="lazy" />`
        : `<div class="ph">${esc(p.imageQuery)}</div>`;
      return `<article>${media}<h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><p class="price">${esc(p.price)}</p></article>`;
    })
    .join('')}</div>
</section>`;

    case 'map':
      return `<section id="map">
  <h2>${esc(b.heading)}</h2>
  ${
    b.address
      ? b.mode === 'embed'
        ? `<iframe title="${esc(b.heading)}" src="https://www.google.com/maps?q=${encodeURIComponent(b.address)}&output=embed" loading="lazy" class="dl-map"></iframe><p class="plain">${esc(b.address)}</p>`
        : `<p><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}" target="_blank" rel="noopener noreferrer">${esc(b.address)}</a></p>`
      : ''
  }
</section>`;

    case 'newsletter':
      return `<section id="newsletter">
  <h2>${esc(b.heading)}</h2>
  ${b.body ? `<p class="lead">${esc(b.body)}</p>` : ''}
  <form class="dl-form dl-inline" data-endpoint="${esc(endpointUrl(b.endpoint))}" data-site="${esc(siteKey(siteTitle))}" data-form-id="newsletter" data-success="${esc(b.successMessage)}">
    <label class="sr-only">Email<input type="email" name="email" required placeholder="${esc(b.placeholder)}" /></label>
    <input type="text" name="_hp" tabindex="-1" autocomplete="off" aria-hidden="true" class="dl-hp" />
    <button type="submit" class="btn">${esc(b.submitLabel)}</button>
    <p class="dl-status" aria-live="polite"></p>
  </form>
</section>`;

    default:
      return '';
  }
}

export function toStandaloneHtml(doc: SiteDocument): string {
  const { theme, title, nav, language } = doc.site;
  const light = theme.mode === 'light';
  const accent = safeColor(theme.palette[0] ?? '#c9a45c', '#c9a45c');
  const headingFont = safeFont(theme.heading_font, 'Marcellus');
  const bodyFont = safeFont(theme.body_font, 'Inter');
  const bg = light ? '#ffffff' : '#0a0a12';
  const fg = light ? '#14141c' : '#eef0f6';
  const hasForm = doc.blocks.some((b) =>
    b.type === 'form' || b.type === 'booking' || b.type === 'newsletter',
  );

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
         font-family: ${bodyFont}, Inter, system-ui, sans-serif; }
  h1, h2, h3 { font-family: ${headingFont}, Inter, sans-serif; font-weight: 600; line-height: 1.15; }
  a { color: inherit; }
  header.site { display: flex; align-items: center; justify-content: space-between;
                padding: 1rem 1.5rem; border-bottom: 1px solid color-mix(in srgb, var(--accent) 28%, transparent); }
  header.site nav { display: flex; gap: 1.25rem; font-size: .875rem; opacity: .7; }
  section, footer { padding: 4rem 1.5rem; max-width: 1100px; margin: 0 auto; }
  .hero { text-align: center; padding-top: 6rem; padding-bottom: 6rem; }
  .eyebrow { color: var(--accent); text-transform: uppercase; letter-spacing: .28em; font-size: .75rem; }
  h1 { font-size: clamp(2rem, 5vw, 3.25rem); }
  .lead { opacity: .7; max-width: 42rem; margin: 1rem auto 0; text-align: center; }
  .btn { display: inline-block; margin-top: 2rem; padding: .85rem 1.75rem; border-radius: .75rem;
         background: var(--accent); color: ${light ? '#fff' : '#0a0a12'}; text-decoration: none;
         font-weight: 600; font-size: .875rem; border: 0; cursor: pointer; }
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
  /* A funkcionalis blokkok urlap-stilusai. Ugyanaz a szerzodes, mint a preview. */
  .dl-form { max-width: 34rem; margin: 2rem auto 0; display: grid; gap: 1rem; }
  .dl-form.dl-inline { display: flex; flex-wrap: wrap; }
  .dl-form.dl-inline input[type=email] { flex: 1 1 16rem; }
  .dl-form label { display: block; font-size: .8125rem; opacity: .85; }
  .dl-form input, .dl-form select, .dl-form textarea {
    width: 100%; margin-top: .35rem; padding: .7rem .85rem; border-radius: .6rem; font: inherit; font-size: .9rem;
    background: color-mix(in srgb, var(--fg) 6%, transparent); color: var(--fg);
    border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent); }
  .dl-form .dl-hp { position: absolute; left: -9999px; width: 1px; height: 1px; }
  .dl-form .btn { margin-top: .35rem; width: 100%; }
  .dl-form .dl-status { margin: 0; font-size: .8125rem; min-height: 1.2em; }
  .dl-form .dl-status[data-state=ok] { color: #22c55e; }
  .dl-form .dl-status[data-state=err] { color: #ef4444; }
  .dl-hours { max-width: 34rem; margin: 2rem auto 0; padding: 1rem 1.25rem; border-radius: .75rem;
              border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent); font-size: .85rem; }
  .dl-hours ul { display: grid; gap: .25rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
                 list-style: none; padding: 0; margin: .5rem 0 0; }
  .dl-hours li { display: flex; justify-content: space-between; gap: 1rem; opacity: .8; }
  .dl-map { display: block; width: 100%; max-width: 44rem; height: 360px; margin: 2rem auto 0;
            border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent); border-radius: .75rem; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  @media (max-width: 640px) { section, footer { padding: 3rem 1.25rem; } }
</style>
</head>
<body>
<header class="site">
  <span style="font-weight:600; letter-spacing:.04em">${esc(title)}</span>
  <nav>${nav.map((n) => `<a href="${esc(safeHref(n.href))}">${esc(n.label)}</a>`).join('')}</nav>
</header>
${doc.blocks.map((b) => renderBlock(b, title)).join('\n')}
${hasForm ? FORM_SCRIPT : ''}
</body>
</html>`;
}

/**
 * A lapba agyazott bekuldes-kezelo.
 *
 * Azert inline es nem kulso fajl, mert a letoltott HTML-nek `file://`-bol is
 * mukodnie kell. A `_hp` honeypot mezot ember nem latja, bot kitolti — a
 * fogado vegpont ilyenkor csendben 200-at ad, hogy a bot ne tudja meg, hogy
 * kiszuri. A HTTP-hibat a felhasznalonak is jelezzuk (409 = zarva / nyitva-
 * tartason kivul), mert az nem rendszerhiba, hanem valaszthato masik idopont.
 */
const FORM_SCRIPT = `<script>
(function () {
  document.querySelectorAll('form.dl-form').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var status = form.querySelector('.dl-status');
      var button = form.querySelector('button[type=submit]');
      var hp = form.querySelector('input[name=_hp]');
      if (hp && hp.value) { if (status) { status.textContent = 'Köszönjük!'; status.dataset.state = 'ok'; } return; }

      var payload = { siteId: form.dataset.site, _hp: '' };
      if (form.dataset.kind === 'booking') {
        var fd = new FormData(form);
        payload.service = fd.get('service');
        payload.date = fd.get('date');
        payload.time = fd.get('time');
        payload.name = fd.get('name');
        payload.contact = fd.get('contact');
        try { payload.availability = JSON.parse(form.dataset.availability || '[]'); } catch (e) { payload.availability = []; }
      } else if (form.dataset.formId === 'newsletter') {
        payload.email = new FormData(form).get('email');
      } else {
        var fields = {};
        new FormData(form).forEach(function (value, key) {
          if (key === '_hp') return;
          if (typeof value === 'string' && value.trim()) fields[key] = value.trim();
        });
        payload.formId = form.dataset.formId;
        payload.fields = fields;
      }

      if (button) button.disabled = true;
      if (status) { status.textContent = 'Küldés…'; status.dataset.state = ''; }

      fetch(form.dataset.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (body) { return { ok: res.ok, status: res.status, body: body }; }); })
        .then(function (r) {
          if (!r.ok) throw new Error(r.body.message || r.body.error || ('Hiba (' + r.status + ')'));
          if (status) { status.textContent = r.body.message || form.dataset.success || 'Köszönjük!'; status.dataset.state = 'ok'; }
          form.reset();
        })
        .catch(function (err) {
          if (status) { status.textContent = err.message || 'A beküldés nem sikerült.'; status.dataset.state = 'err'; }
        })
        .finally(function () { if (button) button.disabled = false; });
    });
  });
})();
</script>`;

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
