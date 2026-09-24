import { useState } from 'react';
import {
  CalendarDays,
  Check,
  Mail,
  MapPin,
  Send,
  Loader2,
  ShoppingBag,
} from 'lucide-react';
import { FUNCTIONS_URL } from '../lib/supabase-client';
import type {
  BookingBlock,
  FormBlock,
  MapBlock,
  NewsletterBlock,
  ProductGridBlock,
  FormField,
} from '../lib/functional-blocks';

/*
 * A funkcionalis blokkok rendereloi.
 *
 * SZANDEKOSAN kulon fajlban vannak, es mind a kliens renderelot hasznaljak:
 * a statikus blokkoknal a modell szoveget ad, itt viszont a latogato adatot
 * KULD. Ezert ez a fajl az egyetlen hely, ahol a bekuldes tortenik, es az
 * egyetlen hely, amit a security review-nak el kell olvasnia.
 *
 * Ket szabaly, ami minden blokkra igaz:
 *   1. Az `endpoint`-ot SOHA nem irjuk ki nyers URL-kent. Ha rovid nev
 *      (pl. `designly-form-submit`), akkor a sajat functions URL-re oldjuk; ha
 *      mar abszolut sajat URL, akkor valtozatlan. Kulso cim nem juthat ide —
 *      a `parseSite` mar kiszurte.
 *   2. Minden urlap honeypot mezot (`_hp`) tartalmaz, ami emberi latogatonal
 *      ures marad. Ez a fogado oldalon is ellenorzott — itt csak azert van,
 *      hogy a bot kitoltse.
 */

/** A rovid vegpontnevet a sajat functions URL-re oldja. */
export function endpointUrl(endpoint: string): string {
  const v = String(endpoint ?? '').trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith('/')) return v;
  return `${FUNCTIONS_URL}/${v.replace(/^\/+/, '')}`;
}

/** A generalt oldal azonositoja a fogado vegpontnak — a cimbol, stabilan. */
export function siteKey(title: string): string {
  let h = 0x811c9dc5;
  const t = String(title ?? 'designly');
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `site_${h.toString(16)}`;
}

function Field({ field, value, onChange }: { field: FormField; value: string; onChange: (v: string) => void }) {
  const common = 'mt-1 w-full rounded-lg border border-current/20 bg-transparent px-3 py-2 text-sm outline-none';
  if (field.type === 'textarea') {
    return (
      <label className="block text-xs opacity-80">
        {field.label}{field.required ? ' *' : ''}
        <textarea rows={4} required={field.required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={common} />
      </label>
    );
  }
  if (field.type === 'select') {
    return (
      <label className="block text-xs opacity-80">
        {field.label}{field.required ? ' *' : ''}
        <select required={field.required} value={value} onChange={(e) => onChange(e.target.value)} className={common}>
          <option value="">Válassz…</option>
          {(field.options ?? []).map((o, i) => <option key={`${o}-${i}`} value={o}>{o}</option>)}
        </select>
      </label>
    );
  }
  return (
    <label className="block text-xs opacity-80">
      {field.label}{field.required ? ' *' : ''}
      <input
        type={field.type}
        required={field.required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={common}
      />
    </label>
  );
}

/** Kozos bekuldes-kezelo: minden urlapos blokk ezt hasznalja. */
async function post(endpoint: string, payload: Record<string, unknown>): Promise<string> {
  const res = await fetch(endpointUrl(endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
  if (!res.ok) throw new Error(body.message || body.error || `A beküldés nem sikerült (${res.status}).`);
  return body.message || 'Köszönjük!';
}

export function FormBlockView({ block, siteTitle, accent }: { block: FormBlock; siteTitle: string; accent: string }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  return (
    <section id="form" className="px-6 py-16">
      <h2 className="mb-4 text-center text-2xl">{block.heading}</h2>
      {block.body && <p className="mx-auto mb-8 max-w-2xl text-center text-sm opacity-70">{block.body}</p>}
      {state === 'done' ? (
        <p className="mx-auto max-w-xl rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-500">
          <Check className="mr-1 inline h-4 w-4" />{message || block.successMessage}
        </p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (state === 'busy') return;
            setState('busy');
            try {
              const msg = await post(block.endpoint, { siteId: siteKey(siteTitle), formId: block.heading, fields: values, _hp: '' });
              setMessage(msg || block.successMessage);
              setState('done');
            } catch (err) {
              setMessage(err instanceof Error ? err.message : 'A beküldés nem sikerült.');
              setState('error');
            }
          }}
          className="mx-auto max-w-xl space-y-4"
        >
          {block.fields.map((f) => (
            <Field key={f.name} field={f} value={values[f.name] ?? ''} onChange={(v) => setValues((cur) => ({ ...cur, [f.name]: v }))} />
          ))}
          {/* Honeypot: ember nem latja, bot kitolti. */}
          <input type="text" name="_hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <button type="submit" disabled={state === 'busy'} className="w-full rounded-xl px-5 py-3 text-sm font-semibold text-white" style={{ background: accent }}>
            {state === 'busy' ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Send className="mr-2 inline h-4 w-4" />}
            {block.submitLabel}
          </button>
          {state === 'error' && <p className="text-center text-xs text-red-500">{message}</p>}
        </form>
      )}
    </section>
  );
}

export function BookingBlockView({ block, siteTitle, accent }: { block: BookingBlock; siteTitle: string; accent: string }) {
  const [service, setService] = useState(block.services[0]?.name ?? '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  return (
    <section id="booking" className="px-6 py-16">
      <h2 className="mb-4 text-center text-2xl">{block.heading}</h2>
      {block.body && <p className="mx-auto mb-8 max-w-2xl text-center text-sm opacity-70">{block.body}</p>}

      {block.availability.length > 0 && (
        <div className="mx-auto mb-8 max-w-2xl rounded-xl border border-current/15 p-4 text-xs opacity-75">
          <p className="mb-2 flex items-center gap-1.5 font-semibold"><CalendarDays className="h-3.5 w-3.5" /> Nyitvatartás</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {block.availability.map((a, i) => (
              <li key={`${a.day}-${i}`} className="flex justify-between gap-3">
                <span>{a.day}</span><span>{a.from}–{a.to}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {state === 'done' ? (
        <p className="mx-auto max-w-xl rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-500">
          <Check className="mr-1 inline h-4 w-4" />{message || block.successMessage}
        </p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (state === 'busy') return;
            setState('busy');
            try {
              const msg = await post(block.endpoint, {
                siteId: siteKey(siteTitle),
                service,
                date,
                time,
                name,
                contact,
                availability: block.availability,
                _hp: '',
              });
              setMessage(msg || block.successMessage);
              setState('done');
            } catch (err) {
              /*
               * A 409 (zarva / nyitvatartason kivul) NEM hiba a felhasznalonak:
               * az idopont egyszeruen nem jo. Ugyanabban a formaban jelezzuk, es
               * a form nyitva marad, hogy masikat valasszon.
               */
              setMessage(err instanceof Error ? err.message : 'A foglalás nem sikerült.');
              setState('error');
            }
          }}
          className="mx-auto max-w-xl space-y-4"
        >
          <label className="block text-xs opacity-80">
            Szolgáltatás
            <select value={service} onChange={(e) => setService(e.target.value)} className="mt-1 w-full rounded-lg border border-current/20 bg-transparent px-3 py-2 text-sm outline-none">
              {block.services.map((s, i) => (
                <option key={`${s.name}-${i}`} value={s.name}>{s.name}{s.duration !== '—' ? ` · ${s.duration}` : ''}{s.price !== '—' ? ` · ${s.price}` : ''}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs opacity-80">
              Dátum
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-current/20 bg-transparent px-3 py-2 text-sm outline-none" />
            </label>
            <label className="block text-xs opacity-80">
              Időpont
              <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full rounded-lg border border-current/20 bg-transparent px-3 py-2 text-sm outline-none" />
            </label>
          </div>
          <label className="block text-xs opacity-80">
            Név
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-current/20 bg-transparent px-3 py-2 text-sm outline-none" />
          </label>
          <label className="block text-xs opacity-80">
            Email vagy telefon
            <input type="text" required value={contact} onChange={(e) => setContact(e.target.value)} className="mt-1 w-full rounded-lg border border-current/20 bg-transparent px-3 py-2 text-sm outline-none" />
          </label>
          <input type="text" name="_hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <button type="submit" disabled={state === 'busy'} className="w-full rounded-xl px-5 py-3 text-sm font-semibold text-white" style={{ background: accent }}>
            {state === 'busy' ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 inline h-4 w-4" />}
            Foglalás elküldése
          </button>
          {state === 'error' && <p className="text-center text-xs text-red-500">{message}</p>}
        </form>
      )}
    </section>
  );
}

export function ProductGridBlockView({ block, accent }: { block: ProductGridBlock; accent: string }) {
  const [sent, setSent] = useState<Record<string, boolean>>({});
  return (
    <section id="products" className="px-6 py-16">
      <h2 className="mb-4 text-center text-2xl">{block.heading}</h2>
      {block.body && <p className="mx-auto mb-8 max-w-2xl text-center text-sm opacity-70">{block.body}</p>}
      <div className="grid gap-5 sm:grid-cols-3">
        {block.products.map((p, i) => (
          <article key={`${p.name}-${i}`} className="overflow-hidden rounded-xl border border-current/15">
            {p.imageUrl ? (
              <img src={p.imageUrl} alt={p.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="grid aspect-[4/3] place-items-center px-4 text-center text-[11px] opacity-40">{p.imageQuery}</div>
            )}
            <div className="p-4">
              <h3 className="text-base font-medium">{p.name}</h3>
              {p.description && <p className="mt-1 text-xs opacity-70">{p.description}</p>}
              <p className="mt-2 text-lg" style={{ color: accent }}>{p.price}</p>
              {block.mode === 'inquiry' && (
                <button
                  type="button"
                  disabled={sent[p.sku]}
                  onClick={async () => {
                    try {
                      await post(block.endpoint, { siteId: 'product-inquiry', formId: p.sku || p.name, fields: { product: p.name, sku: p.sku }, _hp: '' });
                      setSent((c) => ({ ...c, [p.sku]: true }));
                    } catch { /* a hiba nem blokkolja a tobbi termeket */ }
                  }}
                  className="mt-3 w-full rounded-lg border border-current/20 px-3 py-2 text-xs font-semibold"
                >
                  {sent[p.sku] ? 'Elküldve' : 'Érdeklődöm'}
                </button>
              )}
              {block.mode === 'cart' && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] opacity-60">
                  <ShoppingBag className="h-3.5 w-3.5" /> A kosár és a fizetés külön bekapcsolást igényel.
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MapBlockView({ block }: { block: MapBlock }) {
  const q = encodeURIComponent(block.address);
  return (
    <section id="map" className="px-6 py-16">
      <h2 className="mb-4 text-center text-2xl">{block.heading}</h2>
      {!block.address ? (
        <p className="text-center text-xs opacity-50">Ehhez a blokkhoz nincs megadott cím.</p>
      ) : block.mode === 'embed' ? (
        /*
         * Beagyazott terkep: a Google Maps embed `q=` parametere cimet fogad
         * el, nem kell kulcs hozza. Koordinatat SZANDEKOSAN nem hasznalunk —
         * a modell nem tud valos lat/lng-t, egy kitalalt par rosszabb lenne,
         * mint a cim, amit a latogato ellenorizhet.
         */
        <>
          <iframe
            title={block.heading}
            src={`https://www.google.com/maps?q=${q}&output=embed`}
            loading="lazy"
            className="mx-auto block h-[360px] w-full max-w-3xl rounded-xl border border-current/15"
          />
          <p className="mt-3 text-center text-xs opacity-60"><MapPin className="mr-1 inline h-3.5 w-3.5" />{block.address}</p>
        </>
      ) : (
        <p className="text-center">
          <a href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 opacity-80">
            <MapPin className="mr-1 inline h-4 w-4" />{block.address}
          </a>
        </p>
      )}
    </section>
  );
}

export function NewsletterBlockView({ block, siteTitle, accent }: { block: NewsletterBlock; siteTitle: string; accent: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  return (
    <section id="newsletter" className="px-6 py-16 text-center">
      <h2 className="mb-3 text-2xl">{block.heading}</h2>
      {block.body && <p className="mx-auto mb-6 max-w-xl text-sm opacity-70">{block.body}</p>}
      {state === 'done' ? (
        <p className="mx-auto max-w-xl rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          <Check className="mr-1 inline h-4 w-4" />{message || block.successMessage}
        </p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (state === 'busy') return;
            setState('busy');
            try {
              const msg = await post(block.endpoint, { siteId: siteKey(siteTitle), email, _hp: '' });
              setMessage(msg || block.successMessage);
              setState('done');
            } catch (err) {
              setMessage(err instanceof Error ? err.message : 'A feliratkozás nem sikerült.');
              setState('error');
            }
          }}
          className="mx-auto flex max-w-lg flex-wrap gap-3"
        >
          <label className="min-w-0 flex-1 text-left text-xs opacity-80">
            <span className="sr-only">Email</span>
            <span className="flex items-center gap-2 rounded-xl border border-current/20 px-3">
              <Mail className="h-4 w-4 opacity-50" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={block.placeholder}
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none"
              />
            </span>
          </label>
          <input type="text" name="_hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <button type="submit" disabled={state === 'busy'} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ background: accent }}>
            {state === 'busy' ? <Loader2 className="h-4 w-4 animate-spin" /> : block.submitLabel}
          </button>
          {state === 'error' && <p className="w-full text-center text-xs text-red-500">{message}</p>}
        </form>
      )}
    </section>
  );
}
