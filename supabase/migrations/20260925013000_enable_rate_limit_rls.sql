-- DESIGNLY V3: defense-in-depth for rate-limit storage.
-- The table is written only by the SECURITY DEFINER RPC / service_role.
-- Keep direct client access revoked; no anon/authenticated policy is required.
alter table public.designly_rate_limits enable row level security;

revoke all on table public.designly_rate_limits from anon, authenticated;
grant all on table public.designly_rate_limits to service_role;

revoke all on function public.consume_designly_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_designly_rate_limit(text, integer, integer)
  to service_role;
