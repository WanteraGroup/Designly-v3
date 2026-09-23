import type { SiteDocument, SiteBlock, GalleryImage } from '../lib/site-schema';

export interface SiteRendererProps {
  document: SiteDocument;
  /** Renders inside the editor at a fixed width instead of full-bleed. */
  embedded?: boolean;
}

/**
 * A site document rendereloje.
 *
 * A modell BLOKKLISTAT ad vissza, nem markupot: minden elem, ami a lapra kerul,
 * itt szuletik, tehat a generalt szoveg mindig szoveges csomopont — soha nem
 * HTML. Egy ismeretlen blokktipus kimarad, nem talalgatunk helyette.
 */
export function SiteRenderer({ document: doc, embedded }: SiteRendererProps) {
  const { theme } = doc.site;
  const light = theme.mode === 'light';
  const accent = theme.palette[0] ?? '#c9a45c';
  const heading = { fontFamily: theme.heading_font };

  return (
    <div
      className={`designly-site ${embedded ? 'overflow-hidden rounded-xl border border-line' : ''}`}
      style={{
        background: light ? '#fdfbf7' : '#0a0a12',
        color: light ? '#141417' : '#f2efe8',
        fontFamily: theme.body_font,
      }}
    >
      <header
        className="flex items-center justify-between gap-4 px-6 py-4"
        style={{ borderBottom: `1px solid ${accent}33` }}
      >
        <span style={{ ...heading, fontWeight: 600, letterSpacing: '0.08em' }}>
          {doc.site.title}
        </span>
        <nav className="flex flex-wrap gap-5 text-sm opacity-70">
          {doc.site.nav.map((item) => (
            <span key={item.label}>{item.label}</span>
          ))}
        </nav>
      </header>

      {doc.blocks.map((block, i) => (
        <Block key={i} block={block} theme={theme} accent={accent} light={light} />
      ))}
    </div>
  );
}

function Block({
  block,
  theme,
  accent,
  light,
}: {
  block: SiteBlock;
  theme: SiteDocument['site']['theme'];
  accent: string;
  light: boolean;
}) {
  const heading = { fontFamily: theme.heading_font };
  const btn = { background: accent, color: light ? '#ffffff' : '#0a0a12' };
  const cardBorder = { border: `1px solid ${accent}2e` };

  switch (block.type) {
    case 'hero':
      return (
        <section className="px-6 py-24 text-center">
          <p className="text-xs uppercase tracking-[0.28em]" style={{ color: accent }}>
            {block.eyebrow}
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl leading-tight" style={heading}>
            {block.headline}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base opacity-70">{block.subheadline}</p>
          <span className="mt-8 inline-block rounded-xl px-7 py-3 text-sm font-semibold" style={btn}>
            {block.cta.label}
          </span>
        </section>
      );

    case 'features':
      return (
        <section className="px-6 py-16">
          <h2 className="mb-10 text-center text-2xl" style={heading}>
            {block.heading}
          </h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {block.items.map((it) => (
              <div key={it.title} className="rounded-xl p-6" style={cardBorder}>
                <h3 className="text-lg" style={heading}>
                  {it.title}
                </h3>
                <p className="mt-2 text-sm opacity-70">{it.text}</p>
              </div>
            ))}
          </div>
        </section>
      );

    case 'about':
      return (
        <section className="px-6 py-16">
          <h2 className="mb-4 text-2xl" style={heading}>
            {block.heading}
          </h2>
          <p className="max-w-3xl leading-relaxed opacity-75">{block.body}</p>
        </section>
      );

    case 'services':
      return (
        <section className="px-6 py-16">
          <h2 className="mb-8 text-center text-2xl" style={heading}>
            {block.heading}
          </h2>
          <ul className="mx-auto max-w-2xl">
            {block.items.map((it) => (
              <li
                key={it.name}
                className="flex items-baseline justify-between gap-6 py-4"
                style={{ borderBottom: `1px solid ${accent}22` }}
              >
                <span>
                  <strong className="font-medium">{it.name}</strong>
                  <em className="mt-1 block text-sm not-italic opacity-60">{it.text}</em>
                </span>
                <span className="whitespace-nowrap text-sm" style={{ color: accent }}>
                  {it.price}
                </span>
              </li>
            ))}
          </ul>
        </section>
      );

    case 'pricing':
      return (
        <section className="px-6 py-16">
          <h2 className="mb-10 text-center text-2xl" style={heading}>
            {block.heading}
          </h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {block.tiers.map((t) => (
              <div key={t.name} className="rounded-xl p-6" style={cardBorder}>
                <h3 className="text-lg" style={heading}>
                  {t.name}
                </h3>
                <p className="mt-3 text-3xl" style={{ color: accent, ...heading }}>
                  {t.price}
                  {t.period ? <span className="ml-1 text-sm opacity-60">{t.period}</span> : null}
                </p>
                <ul className="mt-5 space-y-1.5 text-sm opacity-70">
                  {t.features.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      );

    case 'gallery':
      return (
        <section className="px-6 py-16">
          <h2 className="mb-8 text-center text-2xl" style={heading}>
            {block.heading}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {block.images.map((img: GalleryImage, i: number) => (
              <figure key={`${img.query}-${i}`} className="overflow-hidden rounded-xl" style={cardBorder}>
                {/*
                 * Van kep: valodi foto. Nincs kep: helyorzo a keresokifejezessel.
                 * A kettő kozott az a kulonbseg, hogy a `vey-images` funkcio
                 * elerheto-e — nem az, hogy a galeria hibas.
                 */}
                {img.url ? (
                  <img
                    src={img.url}
                    alt={img.alt ?? img.caption ?? ''}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="grid aspect-[4/3] place-items-center px-4 text-center text-xs opacity-40">
                    {img.query}
                  </div>
                )}

                {(img.caption || img.author) && (
                  <figcaption className="px-3 py-2 text-xs opacity-60">
                    {img.caption}
                    {img.author ? (
                      <span className="mt-0.5 block opacity-70">Fotó: {img.author}</span>
                    ) : null}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      );

    case 'testimonials':
      return (
        <section className="px-6 py-16">
          <h2 className="mb-10 text-center text-2xl" style={heading}>
            {block.heading}
          </h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {block.items.map((it) => (
              <blockquote key={it.author} className="rounded-xl p-6" style={cardBorder}>
                <p className="text-sm italic opacity-80">“{it.quote}”</p>
                <footer className="mt-3 text-xs opacity-60">
                  {it.author}
                  {it.role ? ` — ${it.role}` : ''}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      );

    case 'faq':
      return (
        <section className="px-6 py-16">
          <h2 className="mb-8 text-center text-2xl" style={heading}>
            {block.heading}
          </h2>
          <dl className="mx-auto max-w-2xl space-y-4">
            {block.items.map((it) => (
              <div key={it.q}>
                <dt className="font-medium">{it.q}</dt>
                <dd className="mt-1 text-sm opacity-70">{it.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      );

    case 'contact':
      return (
        <section className="px-6 py-16">
          <h2 className="mb-4 text-2xl" style={heading}>
            {block.heading}
          </h2>
          <p className="max-w-2xl text-sm opacity-70">{block.body}</p>
          <ul className="mt-5 space-y-1 text-sm">
            {block.email && <li>{block.email}</li>}
            {block.phone && <li>{block.phone}</li>}
            {block.address && <li>{block.address}</li>}
          </ul>
        </section>
      );

    case 'cta':
      return (
        <section className="px-6 py-20 text-center">
          <h2 className="text-3xl" style={heading}>
            {block.headline}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm opacity-70">{block.subheadline}</p>
          <span className="mt-8 inline-block rounded-xl px-7 py-3 text-sm font-semibold" style={btn}>
            {block.cta.label}
          </span>
        </section>
      );

    case 'footer':
      return (
        <footer
          className="px-6 py-10 text-xs opacity-60"
          style={{ borderTop: `1px solid ${accent}22` }}
        >
          <p>{block.text}</p>
          <ul className="mt-3 flex flex-wrap gap-4">
            {block.links.map((l) => (
              <li key={l.label}>{l.label}</li>
            ))}
          </ul>
        </footer>
      );

    default:
      return null;
  }
}
