-- DESIGNLY V3 — a funkcionalis blokkok fogado tablai
--
-- A generalt oldalak `form`, `booking` es `newsletter` blokkjai ide kuldik az
-- adatot. Ezek a tablak NEM a bejelentkezett felhasznalo sajat adatai: a
-- latogato tolti ki oket, aki nem DESIGNLY-fiok. Ezert RLS-sel lezarjuk oket:
-- a `anon` es `authenticated` szerep sem olvasni, sem irni nem tudja —
-- kizarolag a service_role (a fogado Edge Functionok) nyul hozzajuk.
--
-- Ez szandekos: a bekuldes a funkciobol megy be, es a funkcio mar szurte a
-- mezoket (nev-forma, hossz, honeypot). Egy nyitott `insert` policy a bongeszobol
-- azt jelentené, hogy barmelyik latogato tetszoleges `site_id` ala irhat.

create table if not exists public.designly_form_submissions (
  id uuid primary key default gen_random_uuid(),
  site_id text not null,
  form_id text,
  fields jsonb not null default '[]'::jsonb,
  user_agent text,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists idx_designly_form_submissions_site
  on public.designly_form_submissions(site_id, created_at desc);

create table if not exists public.designly_bookings (
  -- A fogado funkcio determinisztikus azonositot ad (site + slot + kontakt),
  -- ezert a `unique` constraint a dupla kattintast is kezeli.
  id text primary key,
  site_id text not null,
  service text not null,
  slot_date text not null,
  slot_time text not null,
  name text not null,
  contact text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists idx_designly_bookings_site
  on public.designly_bookings(site_id, slot_date, slot_time);

create table if not exists public.designly_subscribers (
  -- A hirlevel-feliratkozas dupla opt-in: a `confirmed` csak a visszaigazolo
  -- link utan lesz true. Consent nelkul nem kuldunk levelet.
  id uuid primary key default gen_random_uuid(),
  site_id text not null,
  email text not null,
  confirmed boolean not null default false,
  confirm_token text,
  created_at timestamptz not null default now(),
  unique (site_id, email)
);

create index if not exists idx_designly_subscribers_site
  on public.designly_subscribers(site_id, created_at desc);

-- RLS be, es SEMMILYEN policy nem jon letre: a tablak a service_role-on kivul
-- erinthetetlenek. A `using (false)`-tal egyenertuek ez, de explicitebb.
alter table public.designly_form_submissions enable row level security;
alter table public.designly_bookings enable row level security;
alter table public.designly_subscribers enable row level security;

-- Ha korabban barmilyen policy kerult volna rajuk, az itt megszunik.
drop policy if exists designly_form_submissions_select on public.designly_form_submissions;
drop policy if exists designly_bookings_select on public.designly_bookings;
drop policy if exists designly_subscribers_select on public.designly_subscribers;

-- A DESIGNLY-felhasznalo a SAJAT generalt oldalanak beküldeseit lathassa.
-- Ez az egyetlen kivetel: a tulajdonos olvashatja a hozza tartozo sorokat,
-- de irni nem tud (a bekuldes a funkciobol megy be).
create policy designly_form_submissions_owner_select
  on public.designly_form_submissions for select
  to authenticated
  using (site_id in (
    select id::text from public.projects where user_id = (select auth.uid())
  ));

create policy designly_bookings_owner_select
  on public.designly_bookings for select
  to authenticated
  using (site_id in (
    select id::text from public.projects where user_id = (select auth.uid())
  ));

-- A tablak csak a service_role-nak adnak irast.
grant insert, update, delete on public.designly_form_submissions to service_role;
grant insert, update, delete on public.designly_bookings to service_role;
grant insert, update, delete on public.designly_subscribers to service_role;
