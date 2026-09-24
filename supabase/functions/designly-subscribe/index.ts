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

/** Egyszeru email-forma. A valodi ellenorzes a dupla opt-in visszaigazolas. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function token(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
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
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 200) : '';
  if (!siteId || !EMAIL.test(email)) {
    return json({ error: 'INVALID_REQUEST', message: 'Adj meg egy érvényes email címet.' }, 400);
  }

  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) return json({ error: 'SERVER_NOT_CONFIGURED' }, 503);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  /*
   * Dupla opt-in: a feliratkozas onmagaban nem jelenti a hozzajarulast. A sor
   * `confirmed = false`-szal kerul be, es a visszaigazolo link utan lesz igaz.
   * Consent nelkul nem kuldunk levelet — ez a GDPR-elvaras, es egyben a
   * visszaeles elleni vedelem is (barmely email beirhato egy urlapba).
   */
  const confirmToken = token();
  const { error } = await admin.from('designly_subscribers').upsert(
    { site_id: siteId, email, confirmed: false, confirm_token: confirmToken },
    { onConflict: 'site_id,email', ignoreDuplicates: false },
  );

  if (error) {
    console.error('designly-subscribe upsert failed', error.message);
    return json({ error: 'STORAGE_FAILED', message: 'A feliratkozást nem sikerült elmenteni.' }, 502);
  }

  /*
   * A visszaigazolo levél kuldes egy kulon integracio (Resend / Postmark).
   * Amig az nincs beallitva, a sor `confirm_token`-je elmentve var, es a
   * valasz ezt meg is mondja — nem allitjuk, hogy elkuldtuk a levelet.
   */
  const mailerReady = !!Deno.env.get('DESIGNLY_MAIL_API_KEY');
  return json({
    ok: true,
    confirmationSent: mailerReady,
    message: mailerReady
      ? 'Köszönjük! Nézd meg a postafiókodat a visszaigazoláshoz.'
      : 'Köszönjük! A feliratkozást rögzítettük.',
  });
});
