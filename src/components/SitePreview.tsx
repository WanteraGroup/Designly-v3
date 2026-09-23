import type { SiteBlock, SiteDocument } from '../lib/site-schema';

const imageUrl = (query: string) =>
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=82';

export default function SitePreview({ document }: { document: SiteDocument }) {
  const { site, blocks } = document;
  const dark = site.theme.mode !== 'light';

  return (
    <div className={`overflow-hidden rounded-3xl border shadow-2xl ${dark ? 'border-white/10 bg-[#090a0f] text-white' : 'border-black/10 bg-white text-slate-900'}`}>
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-xs">
        <strong className="tracking-wide">{site.title}</strong>
        <nav className="hidden gap-4 sm:flex">
          {site.nav.slice(0, 5).map((n) => <span key={n.label} className="opacity-70">{n.label}</span>)}
        </nav>
      </div>
      <div>
        {blocks.map((block, i) => <Block key={`${block.type}-${i}`} block={block} dark={dark} />)}
      </div>
    </div>
  );
}

function Block({ block, dark }: { block: SiteBlock; dark: boolean }) {
  const muted = dark ? 'text-white/65' : 'text-slate-600';
  const surface = dark ? 'bg-white/[0.035]' : 'bg-slate-50';
  switch (block.type) {
    case 'hero':
      return <section className="relative overflow-hidden px-6 py-16 sm:px-10 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(124,92,255,.28),transparent_38%)]" />
        <div className="relative max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-[.25em] text-violet-400">{block.eyebrow}</span>
          <h1 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">{block.headline}</h1>
          <p className={`mt-5 max-w-2xl text-lg leading-8 ${muted}`}>{block.subheadline}</p>
          <button className="mt-7 rounded-full bg-violet-500 px-6 py-3 text-sm font-bold">{block.cta.label}</button>
        </div>
      </section>;
    case 'features':
      return <section className="px-6 py-12 sm:px-10"><h2 className="text-2xl font-bold">{block.heading}</h2><div className="mt-6 grid gap-3 sm:grid-cols-3">{block.items.slice(0,6).map((x,i)=><div key={i} className={`rounded-2xl p-5 ${surface}`}><h3 className="font-semibold">{x.title}</h3><p className={`mt-2 text-sm leading-6 ${muted}`}>{x.text}</p></div>)}</div></section>;
    case 'about':
      return <section className="px-6 py-12 sm:px-10"><h2 className="text-2xl font-bold">{block.heading}</h2><p className={`mt-4 max-w-3xl leading-8 ${muted}`}>{block.body}</p></section>;
    case 'services':
      return <section className="px-6 py-12 sm:px-10"><h2 className="text-2xl font-bold">{block.heading}</h2><div className="mt-6 grid gap-3 md:grid-cols-3">{block.items.map((x,i)=><div key={i} className={`rounded-2xl border p-5 ${dark?'border-white/10':'border-black/10'}`}><div className="flex justify-between gap-3"><h3 className="font-semibold">{x.name}</h3><span className="text-violet-400">{x.price}</span></div><p className={`mt-3 text-sm ${muted}`}>{x.text}</p></div>)}</div></section>;
    case 'pricing':
      return <section className="px-6 py-12 sm:px-10"><h2 className="text-2xl font-bold">{block.heading}</h2><div className="mt-6 grid gap-3 md:grid-cols-3">{block.tiers.map((x,i)=><div key={i} className={`rounded-2xl p-6 ${surface}`}><h3 className="font-semibold">{x.name}</h3><div className="mt-3 text-3xl font-black">{x.price}<span className={`text-sm font-normal ${muted}`}> {x.period}</span></div><ul className={`mt-5 space-y-2 text-sm ${muted}`}>{x.features.map((f,j)=><li key={j}>✓ {f}</li>)}</ul></div>)}</div></section>;
    case 'gallery':
      return <section className="px-6 py-12 sm:px-10"><h2 className="text-2xl font-bold">{block.heading}</h2><div className="mt-6 grid gap-3 sm:grid-cols-3">{block.images.slice(0,6).map((x,i)=><figure key={i} className="overflow-hidden rounded-2xl"><img src={imageUrl(x.query)} alt="" className="aspect-[4/3] w-full object-cover" /><figcaption className="p-3 text-sm">{x.caption}</figcaption></figure>)}</div></section>;
    case 'testimonials':
      return <section className="px-6 py-12 sm:px-10"><h2 className="text-2xl font-bold">{block.heading}</h2><div className="mt-6 grid gap-3 md:grid-cols-3">{block.items.map((x,i)=><blockquote key={i} className={`rounded-2xl p-5 ${surface}`}><p className="leading-7">“{x.quote}”</p><footer className={`mt-4 text-sm ${muted}`}>{x.author} · {x.role}</footer></blockquote>)}</div></section>;
    case 'faq':
      return <section className="px-6 py-12 sm:px-10"><h2 className="text-2xl font-bold">{block.heading}</h2><div className="mt-6 divide-y divide-white/10">{block.items.map((x,i)=><details key={i} className="py-4"><summary className="cursor-pointer font-semibold">{x.q}</summary><p className={`mt-3 text-sm leading-6 ${muted}`}>{x.a}</p></details>)}</div></section>;
    case 'contact':
      return <section className="px-6 py-12 sm:px-10"><h2 className="text-2xl font-bold">{block.heading}</h2><p className={`mt-3 ${muted}`}>{block.body}</p><div className="mt-6 grid gap-3 sm:grid-cols-3 text-sm"><div className={`rounded-xl p-4 ${surface}`}>{block.email}</div><div className={`rounded-xl p-4 ${surface}`}>{block.phone}</div><div className={`rounded-xl p-4 ${surface}`}>{block.address}</div></div></section>;
    case 'cta':
      return <section className="px-6 py-14 text-center sm:px-10"><h2 className="text-3xl font-black">{block.headline}</h2><p className={`mx-auto mt-3 max-w-2xl ${muted}`}>{block.subheadline}</p><button className="mt-6 rounded-full bg-violet-500 px-6 py-3 text-sm font-bold">{block.cta.label}</button></section>;
    case 'footer':
      return <footer className={`border-t px-6 py-8 text-sm ${dark?'border-white/10':'border-black/10'} `}><div className="flex flex-wrap justify-between gap-4"><span>{block.text}</span><span className="opacity-60">{block.links.map(x=>x.label).join(' · ')}</span></div></footer>;
  }
}
