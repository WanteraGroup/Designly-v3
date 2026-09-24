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

/** A gyujtott urlapok egyetlen fogado vegpontja. */
const MAX_FIELDS = 24;
const MAX_VALUE = 2000;
/** Csak ezek a kulcsnevek juthatnak el az adatbazisba. */
const FIELD_NAME = /^[a-z0-9_]{1,40}$/;

function sanitizeFields(raw: unknown): { name: string; value: string }[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const entries = Object.entries(raw as Record<string, unknown>).slice(0, MAX_FIELDS);
  const out: { name: string; value: string }[] = [];
  for (const [k, v] of entries) {
    if (!FIELD_NAME.test(k)) continue;
    if (typeof v !== 'string') continue;
    const value = v.trim().slice(0, MAX_VALUE);
    if (!value) continue;
    out.push({ name: k, value });
  }
  return out;
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

  /*
   * A generalt oldal `siteId`-t es `formId`-t kuld; a `_hp` (honeypot) mezo
   * emberi latogatonal ures marad, botnal kitoltodik. Csendben 200-at adunk
   * vissza a botnak: a bot nem tudja meg, hogy kiszuri.
   */
  if (typeof body._hp === 'string' && body._hp.trim()) return json({ ok: true });

  const siteId = typeof body.siteId === 'string' ? body.siteId.slice(0, 80) : '';
  const formId = typeof body.formId === 'string' ? body.formId.slice(0, 80) : '';
  const fields = sanitizeFields(body.fields);
  if (!siteId || !fields.length) return json({ error: 'INVALID_REQUEST' }, 400);

  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) return json({ error: 'SERVER_NOT_CONFIGURED' }, 503);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  /*
   * A bekuldes NEM ker bejelentkezest: a generalt oldal latogatoja nem
   * DESIGNLY-felhasznalo. Ezert ez a vegpont `verify_jwt = true` mellett
   * is nyitott kell legyen — a Supabase tokens ellenorzes helyett a
   * fogado oldali vedelem: honeypot, mezo-szures, es a service-role kulcs
   * csak szerveroldalon.
   */
  const { error } = await admin.from('designly_form_submissions').insert({
    site_id: siteId,
    form_id: formId || null,
    fields,
    user_agent: (req.headers.get('user-agent') || '').slice(0, 300),
    ip: (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '')
      .split(',')[0].trim().slice(0, 60),
  });

  if (error) {
    console.error('designly-form-submit insert failed', error.message);
    return json({ error: 'STORAGE_FAILED', message: 'A beküldést nem sikerült elmenteni.' }, 502);
  }

  return json({ ok: true, message: 'Köszönjük, megkaptuk az üzenetedet.' });
});
