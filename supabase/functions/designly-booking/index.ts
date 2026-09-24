import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const hash = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

/**
 * Foglalas-fogado.
 *
 * Ket dolgot tesz, es a masodik a fontos: a bekuldott idopontot a NYITVATARTAS
 * ellen ellenorzi. Egy egyszeru, csak-mento vegpont elfogadna egy hazugsagot
 * (vasarnap hajnali 3), es a felhasznalo egy ertelmezhetetlen foglalast latna.
 * Az idopontokat nem taroljuk kulon tablaban: a generalt oldal a sajat
 * nyitvatartasat kuldi, es ez a fuggveny azon ellenorzi.
 */
const DAY_ALIASES: Record<string, string[]> = {
  sunday: ['sunday', 'vasarnap', 'vasárnap', 'sun', 'v'],
  monday: ['monday', 'hetfo', 'hétfő', 'mon', 'h'],
  tuesday: ['tuesday', 'kedd', 'tue', 'k'],
  wednesday: ['wednesday', 'szerda', 'wed', 'sze'],
  thursday: ['thursday', 'csutortok', 'csütörtök', 'thu', 'cs'],
  friday: ['friday', 'pentek', 'péntek', 'fri', 'p'],
  saturday: ['saturday', 'szombat', 'sat', 'szo', 'sz'],
};

function dayKey(label: string): string | null {
  const l = label.trim().toLowerCase();
  for (const [key, aliases] of Object.entries(DAY_ALIASES)) {
    if (aliases.includes(l)) return key;
  }
  return null;
}

function minutes(value: string): number | null {
  const m = value.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'INVALID_JSON' }, 400);
  }

  if (typeof body._hp === 'string' && body._hp.trim()) return json({ ok: true });

  const siteId = typeof body.siteId === 'string' ? body.siteId.slice(0, 80) : '';
  const service = typeof body.service === 'string' ? body.service.trim().slice(0, 160) : '';
  const date = typeof body.date === 'string' ? body.date.trim().slice(0, 20) : '';
  const time = typeof body.time === 'string' ? body.time.trim().slice(0, 10) : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 160) : '';
  const contact = typeof body.contact === 'string' ? body.contact.trim().slice(0, 200) : '';
  const availability = Array.isArray(body.availability) ? body.availability : [];

  if (!siteId || !service || !date || !time || !name || !contact) {
    return json({ error: 'INVALID_REQUEST', message: 'A foglaláshoz név, elérhetőség, szolgáltatás és időpont szükséges.' }, 400);
  }

  /*
   * Az idopont ellenorzese a megadott nyitvatartas ellen. Ha a generalt oldal
   * nem kuld nyitvatartast, ezt a lepest kihagyjuk, es csak a formatumot
   * ellenorizzuk — egy hianyzo nyitvatartas nem ok a foglalas elutasitasara.
   */
  const want = minutes(time);
  const stamp = Date.parse(date);
  if (want === null || Number.isNaN(stamp)) {
    return json({ error: 'INVALID_DATETIME', message: 'Érvénytelen dátum vagy időpont.' }, 400);
  }

  if (availability.length > 0) {
    const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
      new Date(stamp).getUTCDay()
    ];
    const window = availability.find((a: any) => a && dayKey(String(a.day ?? '')) === weekday);
    if (!window) {
      return json({ error: 'CLOSED', message: 'Ezen a napon zárva tartunk. Válassz másik napot.' }, 409);
    }
    const from = minutes(String(window.from ?? ''));
    const to = minutes(String(window.to ?? ''));
    if (from === null || to === null || want < from || want > to) {
      return json({
        error: 'OUTSIDE_HOURS',
        message: `Ezen a napon ${window.from} és ${window.to} között tudunk fogadni.`,
      }, 409);
    }
  }

  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) return json({ error: 'SERVER_NOT_CONFIGURED' }, 503);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  /*
   * Kezzel epitett, determinisztikus azonosito a site + idopont parosra. Ez a
   * `insert`-et ismetelt bekuldes eseten ugyanarra a sorra irja, tehat a dupla
   * kattintas nem hoz letre ket foglalast. (A `designly_bookings` tablan ez a
   * mezo `unique`.)
   */
  const dedupe = `bk_${hash(`${siteId}|${date}|${time}|${contact.toLowerCase()}`).toString(16)}`;

  const { error } = await admin.from('designly_bookings').upsert(
    {
      id: dedupe,
      site_id: siteId,
      service,
      slot_date: date,
      slot_time: time,
      name,
      contact,
      status: 'pending',
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.error('designly-booking upsert failed', error.message);
    return json({ error: 'STORAGE_FAILED', message: 'A foglalást nem sikerült elmenteni.' }, 502);
  }

  return json({ ok: true, bookingId: dedupe, message: 'A foglalási kérésedet megkaptuk.' });
});
