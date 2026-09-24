-- DESIGNLY V3 runtime security + credits
create table if not exists public.designly_rate_limits (
  key text primary key,
  window_started_at timestamptz not null default now(),
  hits integer not null default 0 check (hits >= 0)
);

revoke all on table public.designly_rate_limits from anon, authenticated;
grant all on table public.designly_rate_limits to service_role;

create or replace function public.consume_designly_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer default 60
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row designly_rate_limits%rowtype;
  v_now timestamptz := now();
begin
  if p_key is null or length(trim(p_key)) = 0 then
    raise exception 'Rate limit key is required';
  end if;
  if p_limit <= 0 or p_window_seconds <= 0 then
    raise exception 'Invalid rate limit configuration';
  end if;

  insert into designly_rate_limits(key, window_started_at, hits)
  values (left(p_key, 200), v_now, 0)
  on conflict (key) do nothing;

  select * into v_row
  from designly_rate_limits
  where key = left(p_key, 200)
  for update;

  if extract(epoch from (v_now - v_row.window_started_at)) >= p_window_seconds then
    update designly_rate_limits
    set window_started_at = v_now, hits = 1
    where key = left(p_key, 200);
    return true;
  end if;

  if v_row.hits >= p_limit then
    return false;
  end if;

  update designly_rate_limits
  set hits = hits + 1
  where key = left(p_key, 200);
  return true;
end;
$$;

revoke all on function public.consume_designly_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_designly_rate_limit(text, integer, integer) to service_role;

create or replace function public.refund_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text default ''
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile profiles%rowtype;
  v_new_balance integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000 then
    raise exception 'Invalid credit amount';
  end if;

  select * into v_profile
  from profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  v_new_balance := v_profile.credits + p_amount;
  update profiles
  set credits = v_new_balance, updated_at = now()
  where id = p_user_id;

  insert into credit_transactions(user_id, amount, type, description, balance_after)
  values (
    p_user_id,
    p_amount,
    'refund',
    left(coalesce(p_description, ''), 500),
    v_new_balance
  );

  return true;
end;
$$;

revoke all on function public.refund_credits(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.refund_credits(uuid, integer, text) to service_role;

create index if not exists idx_designly_rate_limits_window on public.designly_rate_limits(window_started_at);

create table if not exists public.designly_form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id text not null,
  site_title text not null default '',
  payload jsonb not null default '{}'::jsonb,
  source_url text not null default '',
  created_at timestamptz not null default now()
);
alter table public.designly_form_submissions enable row level security;
revoke all on table public.designly_form_submissions from anon, authenticated;
grant all on table public.designly_form_submissions to service_role;
create index if not exists idx_designly_form_submissions_form_id on public.designly_form_submissions(form_id);
create index if not exists idx_designly_form_submissions_created_at on public.designly_form_submissions(created_at desc);
