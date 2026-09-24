-- DESIGNLY V3 — security cleanup
-- Remove direct authenticated execution of privileged SECURITY DEFINER RPCs.
REVOKE EXECUTE ON FUNCTION public.deduct_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits(uuid, integer, text) TO service_role;

-- Move admin policy checks behind a non-public schema so they are not exposed as
-- PostgREST RPC endpoints while remaining usable by RLS policies.
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_admin_or_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('owner','admin')
  );
$function$;

REVOKE ALL ON FUNCTION private.is_admin_or_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin_or_owner() TO authenticated;

DO $$
DECLARE
  r record;
  new_qual text;
  new_check text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        coalesce(qual, '') LIKE '%is_admin_or_owner()%'
        OR coalesce(with_check, '') LIKE '%is_admin_or_owner()%'
      )
  LOOP
    new_qual := CASE
      WHEN r.qual IS NULL THEN NULL
      ELSE replace(r.qual, 'is_admin_or_owner()', 'private.is_admin_or_owner()')
    END;

    new_check := CASE
      WHEN r.with_check IS NULL THEN NULL
      ELSE replace(r.with_check, 'is_admin_or_owner()', 'private.is_admin_or_owner()')
    END;

    IF new_qual IS NOT NULL THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I USING (%s)',
        r.policyname, r.schemaname, r.tablename, new_qual
      );
    END IF;

    IF new_check IS NOT NULL THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
        r.policyname, r.schemaname, r.tablename, new_check
      );
    END IF;
  END LOOP;
END
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_owner() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_owner() TO service_role;

-- These lead-management tables are not part of the public V3 client surface.
-- Keep them service-role only; RLS stays enabled.
REVOKE ALL ON TABLE public.leads FROM anon, authenticated;
REVOKE ALL ON TABLE public.suppression_list FROM anon, authenticated;
